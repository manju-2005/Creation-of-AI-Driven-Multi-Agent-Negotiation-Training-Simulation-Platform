from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class PersonaConfig(BaseModel):
    role: str                       
    name: str                       
    personality: str = "Analytical" 
    strategies: List[str] = ["Anchoring", "Concession"] 
    target_price: float
    walk_away_price: float
    private_goals: Dict[str, Any] = {}
    private_constraints: List[str] = []

class CreateSessionRequest(BaseModel):
    mode: str = Field(..., description="'simulation' or 'practice'")
    scenario_id: str = Field(..., description="'vendor_pricing', 'job_offer', 'budget_allocation'")
    user_role: Optional[str] = Field(default="interviewee", description="In practice mode, the role the user plays")
    interviewer_persona: PersonaConfig
    interviewee_persona: PersonaConfig
    max_rounds: Optional[int] = 10

class SessionResponse(BaseModel):
    id: str
    mode: str
    scenario_id: str
    user_role: Optional[str] = None
    interviewer_persona: PersonaConfig
    interviewee_persona: PersonaConfig
    max_rounds: int
    current_round: int = 0
    current_speaker: str = "interviewer"
    status: str = "configured"  
    estimated_zopa: Dict[str, Any] = {}
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
