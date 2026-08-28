from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

class StructuredOffer(BaseModel):
    price: float = Field(..., description="Main numerical offer value (e.g. price, salary, budget amount)")
    quantity: Optional[int] = Field(default=1, description="Quantity / headcount / remote days if applicable")
    warranty_months: Optional[int] = Field(default=12, description="Secondary term e.g. warranty or bonus or contingency %")
    payment_terms: Optional[str] = Field(default="Net 30", description="Payment terms or equity vest or milestone details")

class SubmitTurnRequest(BaseModel):
    message: Optional[str] = Field(default="", description="Text message accompanying turn (for human turn)")
    offer: Optional[StructuredOffer] = Field(default=None, description="Structured offer payload")

class TurnResponse(BaseModel):
    id: str
    session_id: str
    round: int
    actor_type: str                  
    speaker: str                     
    message: str
    offer: StructuredOffer
    move: str                        
    confidence: float                
    reason: str                      
    rag_citations: List[str] = []    
    tool_calls: List[Dict[str, Any]] = [] 
    created_at: str
