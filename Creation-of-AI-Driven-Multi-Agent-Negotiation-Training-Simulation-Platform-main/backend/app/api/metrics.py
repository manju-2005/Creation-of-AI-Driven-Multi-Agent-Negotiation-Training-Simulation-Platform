from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.db.mongodb import db_manager
from app.engine.analytics import analytics_engine

router = APIRouter()

@router.get("/sessions/{session_id}/metrics", response_model=Dict[str, Any])
async def get_session_metrics(session_id: str):
    """
    Retrieve live dashboard metrics: stance indicators, concession rate per agent,
    Estimated ZOPA convergence, agreement probability, RAG count, and tool calls count.
    """
    session = await db_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    turns = await db_manager.get_turns(session_id)
    interviewer = session["interviewer_persona"]
    interviewee = session["interviewee_persona"]

    # Calculating latest prices
    interviewer_offers = [t["offer"]["price"] for t in turns if t.get("speaker") == "interviewer"]
    interviewee_offers = [t["offer"]["price"] for t in turns if t.get("speaker") == "interviewee"]

    latest_int_price = interviewer_offers[-1] if interviewer_offers else interviewer["target_price"]
    latest_ive_price = interviewee_offers[-1] if interviewee_offers else interviewee["target_price"]

    int_concession = analytics_engine.compute_agent_concession_rate(interviewer["target_price"], latest_int_price)
    ive_concession = analytics_engine.compute_agent_concession_rate(interviewee["target_price"], latest_ive_price)

    zopa_info = analytics_engine.compute_zopa(
        interviewer_walk_away=interviewer["walk_away_price"],
        interviewee_walk_away=interviewee["walk_away_price"],
        turn_history=turns
    )

    rag_citations_total = sum(len(t.get("rag_citations", [])) for t in turns)
    tool_calls_total = sum(len(t.get("tool_calls", [])) for t in turns)

    return {
        "session_id": session_id,
        "round_count": session.get("current_round", 0),
        "max_rounds": session.get("max_rounds", 10),
        "status": session.get("status", "configured"),
        "interviewer_metrics": {
            "name": interviewer["name"],
            "personality": interviewer["personality"],
            "initial_target": interviewer["target_price"],
            "latest_offer": latest_int_price,
            "concession_rate_pct": int_concession
        },
        "interviewee_metrics": {
            "name": interviewee["name"],
            "personality": interviewee["personality"],
            "initial_target": interviewee["target_price"],
            "latest_offer": latest_ive_price,
            "concession_rate_pct": ive_concession
        },
        "estimated_zopa": zopa_info,
        "rag_citations_total": rag_citations_total,
        "tool_calls_total": tool_calls_total
    }
