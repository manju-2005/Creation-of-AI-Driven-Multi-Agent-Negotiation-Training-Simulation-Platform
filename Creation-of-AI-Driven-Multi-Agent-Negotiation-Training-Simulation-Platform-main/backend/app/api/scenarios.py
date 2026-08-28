from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter()

PREBUILT_SCENARIOS = [
    {
        "id": "vendor_pricing",
        "title": "Vendor Pricing Negotiation",
        "description": "Negotiation between an Enterprise Software/Hardware Vendor and a Corporate Purchasing Buyer over unit pricing, volume discounts, warranty months, and payment terms.",
        "roles": ["interviewer", "interviewee"],
        "default_interviewer": {
            "role": "interviewer",
            "name": "Agent A · Vendor",
            "personality": "Assertive",
            "strategies": ["Anchoring", "Hard Bargaining"],
            "target_price": 8000,
            "walk_away_price": 5500,
            "private_goals": {"goal_description": "Maximize Profit", "preferred_warranty": "12 months"},
            "private_constraints": ["Initial target ₹8,000 asking price, baseline minimum ₹5,500", "Net 30 payment minimum"]
        },
        "default_interviewee": {
            "role": "interviewee",
            "name": "Agent B · Buyer",
            "personality": "Analytical",
            "strategies": ["BATNA-driven", "Concession"],
            "target_price": 5000,
            "walk_away_price": 8000,
            "private_goals": {"goal_description": "Minimize Cost", "preferred_warranty": "24 months"},
            "private_constraints": ["Target offer ₹5,000 per unit, walk-away budget limit ₹8,000"]
        }
    },
    {
        "id": "job_offer",
        "title": "Job Offer Negotiation",
        "description": "Negotiation between a Tech Hiring Manager and a Senior Candidate over base salary, signing bonus, remote work days, and stock equity.",
        "roles": ["interviewer", "interviewee"],
        "default_interviewer": {
            "role": "interviewer",
            "name": "Tech Corp Hiring Manager",
            "personality": "Collaborative",
            "strategies": ["Good Cop", "Concession"],
            "target_price": 135000,
            "walk_away_price": 155000,
            "private_goals": {"team_headcount_budget": 160000, "signing_bonus_cap": 10000},
            "private_constraints": ["Max base salary $155,000 without VP approval"]
        },
        "default_interviewee": {
            "role": "interviewee",
            "name": "Senior AI Candidate",
            "personality": "Analytical",
            "strategies": ["Anchoring", "BATNA-driven"],
            "target_price": 160000,
            "walk_away_price": 140000,
            "private_goals": {"desired_remote_days": 3, "signing_bonus_target": 15000},
            "private_constraints": ["Cannot accept below $140,000 base salary"]
        }
    },
    {
        "id": "budget_allocation",
        "title": "Project Budget Allocation",
        "description": "Negotiation between a Corporate Finance Director and an R&D Lead over annual project funding, contingency reserve, and phase 1 release milestones.",
        "roles": ["interviewer", "interviewee"],
        "default_interviewer": {
            "role": "interviewer",
            "name": "Corporate Finance Director",
            "personality": "Analytical",
            "strategies": ["Walk-away", "Hard Bargaining"],
            "target_price": 250000,
            "walk_away_price": 320000,
            "private_goals": {"contingency_cap": "10%", "phase1_release": "40%"},
            "private_constraints": ["Total department R&D cap $320,000"]
        },
        "default_interviewee": {
            "role": "interviewee",
            "name": "R&D AI Project Lead",
            "personality": "Collaborative",
            "strategies": ["Anchoring", "Concession"],
            "target_price": 350000,
            "walk_away_price": 280000,
            "private_goals": {"desired_contingency": "15%", "staff_headcount": 3},
            "private_constraints": ["Minimum operational funding needed $280,000"]
        }
    }
]

@router.get("/scenarios", response_model=List[Dict[str, Any]])
async def get_scenarios():
    """Retrieve pre-built scenario templates and compatibility personas."""
    return PREBUILT_SCENARIOS
