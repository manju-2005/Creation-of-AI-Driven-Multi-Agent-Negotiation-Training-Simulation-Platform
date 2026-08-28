import asyncio
import sys
sys.path.insert(0, '.')

from app.db.mongodb import db_manager
from app.engine.orchestrator import orchestrator

async def main():
    await db_manager.connect()
    print("Database connected successfully!")

    session_doc = {
        "mode": "simulation",
        "scenario_id": "vendor_pricing",
        "interviewer_persona": {
            "role": "interviewer",
            "name": "Agent A · Vendor",
            "personality": "Assertive",
            "target_price": 8000,
            "walk_away_price": 5500,
            "private_goals": {"goal_description": "Maximize Profit"},
            "private_constraints": ["Initial asking price ₹8,000, baseline minimum ₹5,500"]
        },
        "interviewee_persona": {
            "role": "interviewee",
            "name": "Agent B · Buyer",
            "personality": "Analytical",
            "target_price": 5000,
            "walk_away_price": 8000,
            "private_goals": {"goal_description": "Minimize Cost"},
            "private_constraints": ["Target offer ₹5,000, max budget limit ₹8,000"]
        },
        "max_rounds": 10,
        "current_round": 0,
        "current_speaker": "interviewer",
        "status": "configured"
    }

    sid = await db_manager.insert_session(session_doc)
    print("Created Session ID:", sid)

    turn1, terminal1 = await orchestrator.process_turn(sid)
    print("Turn 1:", turn1["speaker"], turn1["message"].encode('ascii', 'ignore').decode(), turn1["offer"])

    turn2, terminal2 = await orchestrator.process_turn(sid)
    print("Turn 2:", turn2["speaker"], turn2["message"].encode('ascii', 'ignore').decode(), turn2["offer"])

    turns = await db_manager.get_turns(sid)
    print("Total Turns Recorded:", len(turns))
    print("Test finished cleanly with ZERO errors!")

if __name__ == "__main__":
    asyncio.run(main())
