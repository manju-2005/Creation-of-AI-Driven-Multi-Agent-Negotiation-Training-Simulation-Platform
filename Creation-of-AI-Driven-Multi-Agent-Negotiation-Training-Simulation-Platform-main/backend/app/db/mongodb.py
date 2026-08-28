import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from bson import ObjectId
from app.config import settings

logger = logging.getLogger(__name__)

# Helper to serialize MongoDB documents to clean JSON/Pydantic-safe dictionaries
def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    if not doc:
        return doc
    d = dict(doc)
    if "_id" in d:
        d["_id"] = str(d["_id"])
        d["id"] = str(d["_id"])
    elif "id" in d and "_id" not in d:
        d["_id"] = str(d["id"])
        d["id"] = str(d["id"])
    else:
        d["_id"] = str(ObjectId())
        d["id"] = d["_id"]

    # Convert all datetime and ObjectId objects to string
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat() + ("Z" if not v.tzinfo else "")
        elif isinstance(v, ObjectId):
            d[k] = str(v)

    if "created_at" not in d or not d["created_at"]:
        d["created_at"] = datetime.utcnow().isoformat() + "Z"
    elif isinstance(d["created_at"], str) and not d["created_at"].endswith("Z") and "+" not in d["created_at"]:
        d["created_at"] = d["created_at"] + "Z"

    if "updated_at" in d and isinstance(d["updated_at"], str) and not d["updated_at"].endswith("Z") and "+" not in d["updated_at"]:
        d["updated_at"] = d["updated_at"] + "Z"

    return d

# InMemoryFallback Store if MongoDB is unavailable
class InMemoryStore:
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.turns: Dict[str, List[Dict[str, Any]]] = {}
        self.agent_memory: Dict[str, Dict[str, Any]] = {}
        self.reports: Dict[str, Dict[str, Any]] = {}
        self.monitoring: List[Dict[str, Any]] = []

    def clean_doc(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        return serialize_doc(doc)

    async def insert_session(self, session_data: Dict[str, Any]) -> str:
        doc = self.clean_doc(session_data)
        sid = doc["_id"]
        self.sessions[sid] = doc
        self.turns[sid] = []
        return sid

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return serialize_doc(self.sessions.get(session_id))

    async def update_session(self, session_id: str, update_data: Dict[str, Any]):
        if session_id in self.sessions:
            self.sessions[session_id].update(update_data)
            self.sessions[session_id]["updated_at"] = datetime.utcnow().isoformat() + "Z"

    async def insert_turn(self, turn_data: Dict[str, Any]) -> str:
        doc = self.clean_doc(turn_data)
        sid = str(doc.get("session_id"))
        if sid not in self.turns:
            self.turns[sid] = []
        self.turns[sid].append(doc)
        return doc["_id"]

    async def get_turns(self, session_id: str) -> List[Dict[str, Any]]:
        return [serialize_doc(t) for t in self.turns.get(session_id, [])]

    async def save_agent_memory(self, session_id: str, agent_role: str, memory_data: Dict[str, Any]):
        key = f"{session_id}:{agent_role}"
        self.agent_memory[key] = memory_data

    async def get_agent_memory(self, session_id: str, agent_role: str) -> Optional[Dict[str, Any]]:
        return self.agent_memory.get(f"{session_id}:{agent_role}")

    async def save_report(self, report_data: Dict[str, Any]) -> str:
        doc = self.clean_doc(report_data)
        sid = str(doc.get("session_id"))
        self.reports[sid] = doc
        return doc["_id"]

    async def get_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        return serialize_doc(self.reports.get(session_id))

    async def list_sessions(self) -> List[Dict[str, Any]]:
        sessions_list = list(self.sessions.values())
        sessions_list.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return [serialize_doc(s) for s in sessions_list]

    async def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            self.turns.pop(session_id, None)
            self.reports.pop(session_id, None)
            return True
        return False

    async def log_monitoring(self, event_data: Dict[str, Any]):
        self.monitoring.append(self.clean_doc(event_data))

db_fallback = InMemoryStore()

class DatabaseManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.use_fallback = False

    async def connect(self):
        mongodb_url = (settings.MONGODB_URL or "").strip()
        if not mongodb_url:
            self.use_fallback = True
            logger.info("MongoDB URL not configured. Using In-Memory Database Store.")
            return

        try:
            import socket
            import urllib.parse

            # Fast check if local MongoDB instance is reachable before attempting client connection
            is_local = "localhost" in mongodb_url or "127.0.0.1" in mongodb_url
            if is_local:
                port = 27017
                try:
                    parsed = urllib.parse.urlparse(mongodb_url)
                    if parsed.port:
                        port = parsed.port
                except Exception:
                    pass

                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.2)
                res = sock.connect_ex(("127.0.0.1", port))
                sock.close()
                if res != 0:
                    self.use_fallback = True
                    logger.info("MongoDB local server not running on port %d. Initialized In-Memory Database Store.", port)
                    return

            from motor.motor_asyncio import AsyncIOMotorClient
            self.client = AsyncIOMotorClient(mongodb_url, serverSelectionTimeoutMS=5000)
            # Test connection
            await self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.use_fallback = False
            logger.info("Connected to MongoDB successfully.")
        except Exception:
            self.use_fallback = True
            logger.info("MongoDB not accessible. Initialized In-Memory Database Store.")

    async def list_sessions(self) -> List[Dict[str, Any]]:
        if self.use_fallback:
            return await db_fallback.list_sessions()
        try:
            cursor = self.db.sessions.find().sort("created_at", -1)
            sessions = await cursor.to_list(length=100)
            return [serialize_doc(s) for s in sessions]
        except Exception:
            return await db_fallback.list_sessions()

    async def delete_session(self, session_id: str) -> bool:
        if self.use_fallback:
            return await db_fallback.delete_session(session_id)
        try:
            res = await self.db.sessions.delete_one({"_id": ObjectId(session_id)})
            await self.db.turns.delete_many({"session_id": session_id})
            await self.db.reports.delete_one({"session_id": session_id})
            return res.deleted_count > 0
        except Exception:
            return await db_fallback.delete_session(session_id)

    async def insert_session(self, session_data: Dict[str, Any]) -> str:
        if self.use_fallback:
            return await db_fallback.insert_session(session_data)
        try:
            doc = serialize_doc(session_data)
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"]) if isinstance(doc["_id"], str) and len(doc["_id"]) == 24 else doc["_id"]
            res = await self.db.sessions.insert_one(doc)
            return str(res.inserted_id)
        except Exception:
            return await db_fallback.insert_session(session_data)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.use_fallback:
            return await db_fallback.get_session(session_id)
        try:
            query = {"_id": ObjectId(session_id)} if len(session_id) == 24 else {"_id": session_id}
            doc = await self.db.sessions.find_one(query)
            if doc:
                return serialize_doc(doc)
            return await db_fallback.get_session(session_id)
        except Exception:
            return await db_fallback.get_session(session_id)

    async def update_session(self, session_id: str, update_data: Dict[str, Any]):
        now_str = datetime.utcnow().isoformat() + "Z"
        update_dict = dict(update_data)
        update_dict["updated_at"] = now_str
        if self.use_fallback:
            await db_fallback.update_session(session_id, update_dict)
            return
        try:
            query = {"_id": ObjectId(session_id)} if len(session_id) == 24 else {"_id": session_id}
            await self.db.sessions.update_one(
                query,
                {"$set": update_dict}
            )
        except Exception:
            await db_fallback.update_session(session_id, update_dict)

    async def insert_turn(self, turn_data: Dict[str, Any]) -> str:
        if self.use_fallback:
            return await db_fallback.insert_turn(turn_data)
        try:
            doc = serialize_doc(turn_data)
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"]) if isinstance(doc["_id"], str) and len(doc["_id"]) == 24 else doc["_id"]
            res = await self.db.turns.insert_one(doc)
            return str(res.inserted_id)
        except Exception:
            return await db_fallback.insert_turn(turn_data)

    async def get_turns(self, session_id: str) -> List[Dict[str, Any]]:
        if self.use_fallback:
            return await db_fallback.get_turns(session_id)
        try:
            cursor = self.db.turns.find({"session_id": session_id}).sort("round", 1)
            turns = await cursor.to_list(length=100)
            return [serialize_doc(t) for t in turns]
        except Exception:
            return await db_fallback.get_turns(session_id)

    async def save_agent_memory(self, session_id: str, agent_role: str, memory_data: Dict[str, Any]):
        if self.use_fallback:
            await db_fallback.save_agent_memory(session_id, agent_role, memory_data)
            return
        try:
            await self.db.agent_memory.update_one(
                {"session_id": session_id, "agent_role": agent_role},
                {"$set": memory_data},
                upsert=True
            )
        except Exception:
            await db_fallback.save_agent_memory(session_id, agent_role, memory_data)

    async def get_agent_memory(self, session_id: str, agent_role: str) -> Optional[Dict[str, Any]]:
        if self.use_fallback:
            return await db_fallback.get_agent_memory(session_id, agent_role)
        try:
            doc = await self.db.agent_memory.find_one({"session_id": session_id, "agent_role": agent_role})
            if doc:
                return serialize_doc(doc)
            return await db_fallback.get_agent_memory(session_id, agent_role)
        except Exception:
            return await db_fallback.get_agent_memory(session_id, agent_role)

    async def save_report(self, report_data: Dict[str, Any]) -> str:
        if self.use_fallback:
            return await db_fallback.save_report(report_data)
        try:
            doc = serialize_doc(report_data)
            if "_id" in doc:
                doc["_id"] = ObjectId(doc["_id"]) if isinstance(doc["_id"], str) and len(doc["_id"]) == 24 else doc["_id"]
            res = await self.db.reports.insert_one(doc)
            return str(res.inserted_id)
        except Exception:
            return await db_fallback.save_report(report_data)

    async def get_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        if self.use_fallback:
            return await db_fallback.get_report(session_id)
        try:
            doc = await self.db.reports.find_one({"session_id": session_id})
            if doc:
                return serialize_doc(doc)
            return await db_fallback.get_report(session_id)
        except Exception:
            return await db_fallback.get_report(session_id)

    async def log_monitoring(self, event_data: Dict[str, Any]):
        if self.use_fallback:
            await db_fallback.log_monitoring(event_data)
            return
        try:
            await self.db.monitoring.insert_one(event_data)
        except Exception:
            await db_fallback.log_monitoring(event_data)

db_manager = DatabaseManager()
