from fastapi import APIRouter
from typing import List, Dict, Any
from app.tools.tool_registry import tool_registry

router = APIRouter()

@router.get("/tools", response_model=List[Dict[str, Any]])
async def get_tools():
    """Retrieve schema definitions of the 6 available negotiation tools."""
    return tool_registry.tools_schema
