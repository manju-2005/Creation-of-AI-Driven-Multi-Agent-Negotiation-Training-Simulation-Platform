from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class AgentScorecard(BaseModel):
    initial_target: float
    walk_away_price: float
    final_price_achieved: float
    total_concessions_made: float
    concession_rate_pct: float
    score: float 

class OutcomeReportResponse(BaseModel):
    id: str
    session_id: str
    status: str # agreement, impasse, timeout
    final_terms: Dict[str, Any]
    scorecard: Dict[str, AgentScorecard]
    narrative_summary: str
    grounding_score: float
    is_partial: bool = False
    created_at: str
