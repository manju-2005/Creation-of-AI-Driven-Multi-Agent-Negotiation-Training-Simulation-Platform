from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.models.session import CreateSessionRequest, SessionResponse
from app.models.turn import SubmitTurnRequest
from app.db.mongodb import db_manager
from app.engine.orchestrator import orchestrator
from app.api.scenarios import PREBUILT_SCENARIOS

router = APIRouter()

@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(payload: CreateSessionRequest):
    """
    Create a new negotiation session.
    Validates scenario-persona compatibility before writing to storage.
    """
    #Validating scenario exists
    valid_scenario_ids = [s["id"] for s in PREBUILT_SCENARIOS]
    if payload.scenario_id not in valid_scenario_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario_id '{payload.scenario_id}'. Must be one of: {valid_scenario_ids}"
        )

    # Validating persona roles
    if payload.interviewer_persona.role != "interviewer":
        raise HTTPException(status_code=400, detail="interviewer_persona must have role='interviewer'")
    if payload.interviewee_persona.role != "interviewee":
        raise HTTPException(status_code=400, detail="interviewee_persona must have role='interviewee'")

    # Creating Session Record
    session_doc = {
        "mode": payload.mode,
        "scenario_id": payload.scenario_id,
        "user_role": payload.user_role if payload.mode == "practice" else None,
        "interviewer_persona": payload.interviewer_persona.model_dump(),
        "interviewee_persona": payload.interviewee_persona.model_dump(),
        "max_rounds": payload.max_rounds or 10,
        "current_round": 0,
        "current_speaker": "interviewer",
        "status": "configured",
        "estimated_zopa": {
            "estimated_range": [payload.interviewee_persona.target_price, payload.interviewer_persona.target_price],
            "gap": abs(payload.interviewer_persona.target_price - payload.interviewee_persona.target_price),
            "has_overlap": payload.interviewee_persona.walk_away_price >= payload.interviewer_persona.walk_away_price,
            "convergence_percentage": 0.0,
            "agreement_probability": 0.5
        },
        "created_at": datetime.utcnow().isoformat()
    }

    session_id = await db_manager.insert_session(session_doc)
    session_doc["id"] = session_id

    return session_doc

@router.get("/sessions", response_model=List[Dict[str, Any]])
async def list_sessions():
    """List all past negotiation sessions."""
    sessions = await db_manager.list_sessions()
    return sessions

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Retrieve current session state by ID."""
    session = await db_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    session["id"] = str(session["_id"]) if "_id" in session else session_id
    return session

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a negotiation session by ID."""
    deleted = await db_manager.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"message": f"Session '{session_id}' deleted successfully."}

@router.post("/sessions/{session_id}/turns")
async def process_turn(session_id: str, payload: Optional[SubmitTurnRequest] = None):
    """
    Execute next negotiation turn.
    In Simulation mode: triggers AI vs AI turn.
    In Practice mode: accepts Human turn payload or triggers AI counterpart turn.
    """
    human_input = payload.model_dump() if payload else None
    try:
        turn_record, is_terminal = await orchestrator.process_turn(session_id=session_id, human_input=human_input)
        return {"turn": turn_record, "is_terminal": is_terminal}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Turn execution error: {str(e)}")

@router.get("/sessions/{session_id}/turns", response_model=List[Dict[str, Any]])
async def get_turns(session_id: str):
    """Retrieve full transcript history of turns for a session."""
    turns = await db_manager.get_turns(session_id)
    return turns

@router.get("/sessions/{session_id}/memory")
async def get_agent_memory(session_id: str, role: str = "interviewer"):
    """Retrieve agent memory records for a session (internal / debug use)."""
    memory = await db_manager.get_agent_memory(session_id, role)
    if not memory:
        return {"session_id": session_id, "agent_role": role, "message": "No memory records stored yet."}
    return memory

@router.get("/sessions/{session_id}/report")
async def get_report(session_id: str):
    """Retrieve outcome report for completed session."""
    report = await db_manager.get_report(session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Outcome report not available yet. Negotiation is still active.")
    return report
