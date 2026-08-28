from typing import Dict, Any, Optional
from app.db.mongodb import db_manager

class MemoryManager:
    async def get_or_create_memory(self, session_id: str, agent_role: str, initial_target: float, walk_away_price: float) -> Dict[str, Any]:
        mem = await db_manager.get_agent_memory(session_id, agent_role)
        if not mem:
            mem = {
                "session_id": session_id,
                "agent_role": agent_role,
                "initial_target": initial_target,
                "walk_away_price": walk_away_price,
                "last_offer": initial_target,
                "concessions_made": 0.0,
                "offers_history": [initial_target],
                "counterpart_offers": []
            }
            await db_manager.save_agent_memory(session_id, agent_role, mem)
        return mem

    async def update_memory(
        self,
        session_id: str,
        agent_role: str,
        own_offer_price: float,
        counterpart_offer_price: Optional[float] = None
    ):
        mem = await db_manager.get_agent_memory(session_id, agent_role)
        if not mem:
            return

        last_offer = mem.get("last_offer", own_offer_price)
        concession = abs(own_offer_price - last_offer)
        
        mem["last_offer"] = own_offer_price
        mem["concessions_made"] += concession
        mem["offers_history"].append(own_offer_price)
        if counterpart_offer_price is not None:
            mem["counterpart_offers"].append(counterpart_offer_price)

        await db_manager.save_agent_memory(session_id, agent_role, mem)

memory_manager = MemoryManager()
