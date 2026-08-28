import logging
from datetime import datetime
from typing import Dict, Any, Tuple
from app.db.mongodb import db_manager
from app.models.session import PersonaConfig
from app.models.turn import StructuredOffer
from app.engine.prompt_builder import prompt_builder
from app.engine.memory_manager import memory_manager
from app.engine.validator import validator
from app.engine.llm_abstraction import llm_interface
from app.engine.analytics import analytics_engine
from app.rag.rag_pipeline import rag_pipeline
from app.tools.tool_registry import tool_registry
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class Orchestrator:
    async def process_turn(self, session_id: str, human_input: Dict[str, Any] = None) -> Tuple[Dict[str, Any], bool]:
        """
        Orchestrates a single turn (either AI or Human).
        Returns (turn_record, is_terminal_state)
        """
        session = await db_manager.get_session(session_id)
        if not session:
            raise ValueError(f"Session '{session_id}' not found.")

        if session.get("status") in ["agreement", "impasse", "timeout", "error"]:
            return {"error": f"Session is already terminated with status '{session.get('status')}'"}, True

        mode = session.get("mode", "simulation")
        scenario_id = session.get("scenario_id")
        current_round = session.get("current_round", 0)
        max_rounds = session.get("max_rounds", 10)
        speaker = session.get("current_speaker", "interviewer")
        user_role = session.get("user_role", "interviewee")

        interviewer_persona = PersonaConfig(**session["interviewer_persona"])
        interviewee_persona = PersonaConfig(**session["interviewee_persona"])
        acting_persona = interviewer_persona if speaker == "interviewer" else interviewee_persona
        opposing_persona = interviewee_persona if speaker == "interviewer" else interviewer_persona

        turn_history = await db_manager.get_turns(session_id)

        # 1. Determine Actor Type
        is_human = (mode == "practice" and speaker == user_role)
        actor_type = "human" if is_human else "ai"

        # 2. RAG Retrieval for turn context
        rag_chunks = rag_pipeline.retrieve_context(
            scenario_id=scenario_id,
            query=f"{acting_persona.personality} offer strategy round {current_round}"
        )

        # 3. Retrieve / Initialize Memory
        agent_mem = await memory_manager.get_or_create_memory(
            session_id=session_id,
            agent_role=speaker,
            initial_target=acting_persona.target_price,
            walk_away_price=acting_persona.walk_away_price
        )

        turn_payload = None
        tool_calls_logged = []

        if is_human and human_input:
            # Human Turn (Practice Mode)
            msg = human_input.get("message", "")
            off_dict = human_input.get("offer", {})
            valid, err_msg = validator.validate_turn_input(msg, off_dict)
            if not valid:
                raise ValueError(err_msg)

            price_val = float(off_dict.get("price", acting_persona.target_price))
            turn_payload = {
                "move": off_dict.get("move", "COUNTER"),
                "price": price_val,
                "reason": "Human participant submitted turn.",
                "confidence": 1.0,
                "message": msg or f"I propose ${price_val:,}."
            }

        else:
            # AI Turn
            # Optional Tool Execution (e.g. Price calculator / budget validator)
            tool_res = tool_registry.price_calculator(price=acting_persona.target_price, quantity=1)
            tool_calls_logged.append({"tool": "price_calculator", "result": tool_res})

            prompt = prompt_builder.build_prompt(
                acting_persona=acting_persona,
                opposing_role_name=opposing_persona.role,
                scenario_id=scenario_id,
                turn_history=turn_history,
                agent_memory=agent_mem,
                rag_chunks=rag_chunks,
                current_round=current_round
            )

            turn_payload = await llm_interface.generate_turn_decision(
                prompt=prompt,
                acting_persona=acting_persona,
                agent_memory=agent_mem,
                turn_history=turn_history,
                current_round=current_round,
                rag_chunks=rag_chunks
            )

        # Grounding Score Calculation
        grounding = rag_pipeline.calculate_grounding_score(turn_payload.get("reason", ""), rag_chunks)

        # Format Structured Offer
        offer_obj = StructuredOffer(
            price=turn_payload["price"],
            quantity=1,
            warranty_months=12,
            payment_terms="Net 30"
        )

        # 4. Save Turn to Database
        turn_doc = {
            "session_id": session_id,
            "round": current_round + 1,
            "actor_type": actor_type,
            "speaker": speaker,
            "message": turn_payload["message"],
            "offer": offer_obj.model_dump(),
            "move": turn_payload["move"],
            "confidence": turn_payload.get("confidence", 0.85),
            "reason": turn_payload.get("reason", "Strategic counter-offer."),
            "rag_citations": [c["id"] for c in rag_chunks] if rag_chunks else [],
            "tool_calls": tool_calls_logged,
            "created_at": datetime.utcnow().isoformat()
        }

        turn_id = await db_manager.insert_turn(turn_doc)
        turn_doc["_id"] = turn_id

        # 5. Update Agent Memory
        await memory_manager.update_memory(
            session_id=session_id,
            agent_role=speaker,
            own_offer_price=turn_payload["price"],
            counterpart_offer_price=None
        )

        # Update updated turn history
        updated_history = turn_history + [turn_doc]

        # 6. Compute Analytics & State Machine Checks
        zopa_info = analytics_engine.compute_zopa(
            interviewer_walk_away=interviewer_persona.walk_away_price,
            interviewee_walk_away=interviewee_persona.walk_away_price,
            turn_history=updated_history
        )

        is_deadlock = analytics_engine.detect_deadlock(updated_history)
        move_type = turn_payload["move"].upper()

        next_status = "negotiating"
        terminal = False

        if move_type == "ACCEPT" or move_type == "CONCEDE":
            next_status = "agreement"
            terminal = True
        elif is_deadlock:
            next_status = "impasse"
            terminal = True
        elif (current_round + 1) >= max_rounds:
            next_status = "timeout"
            terminal = True

        next_speaker = "interviewee" if speaker == "interviewer" else "interviewer"

        await db_manager.update_session(session_id, {
            "current_round": current_round + 1,
            "current_speaker": next_speaker,
            "status": next_status,
            "estimated_zopa": zopa_info
        })

        # 7. Generate Outcome Report if terminal
        if terminal:
            scenario_id = session.get("scenario_id", "vendor_pricing")
            await self._generate_and_save_report(session_id, scenario_id, next_status, updated_history, interviewer_persona, interviewee_persona, grounding)

        # Log Observability Monitoring Event
        await db_manager.log_monitoring({
            "session_id": session_id,
            "round": current_round + 1,
            "speaker": speaker,
            "actor_type": actor_type,
            "move": move_type,
            "grounding_score": grounding,
            "timestamp": datetime.utcnow().isoformat()
        })

        return turn_doc, terminal

    async def _generate_and_save_report(self, session_id: str, scenario_id: str, status: str, history: List[Dict[str, Any]], interviewer: PersonaConfig, interviewee: PersonaConfig, grounding: float):
        last_turn = history[-1] if history else {}
        final_price = last_turn.get("offer", {}).get("price", 0.0)

        interviewer_concession = analytics_engine.compute_agent_concession_rate(interviewer.target_price, final_price)
        interviewee_concession = analytics_engine.compute_agent_concession_rate(interviewee.target_price, final_price)

        scorecard = {
            "interviewer": {
                "initial_target": interviewer.target_price,
                "walk_away_price": interviewer.walk_away_price,
                "final_price_achieved": final_price,
                "total_concessions_made": abs(interviewer.target_price - final_price),
                "concession_rate_pct": interviewer_concession,
                "score": round(max(0, 100 - interviewer_concession * 2), 1)
            },
            "interviewee": {
                "initial_target": interviewee.target_price,
                "walk_away_price": interviewee.walk_away_price,
                "final_price_achieved": final_price,
                "total_concessions_made": abs(interviewee.target_price - final_price),
                "concession_rate_pct": interviewee_concession,
                "score": round(max(0, 100 - interviewee_concession * 2), 1)
            }
        }

        symbol = "₹" if final_price >= 1000 or interviewer.target_price >= 1000 else "$"
        narrative = f"Negotiation concluded with status '{status.upper()}' after {len(history)} rounds. Final agreed price term: {symbol}{final_price:,.2f}."

        report_doc = {
            "session_id": session_id,
            "scenario_id": scenario_id,
            "status": status,
            "final_terms": {"price": final_price, "rounds": len(history)},
            "scorecard": scorecard,
            "narrative_summary": narrative,
            "grounding_score": grounding,
            "is_partial": False,
            "created_at": datetime.utcnow().isoformat()
        }

        await db_manager.save_report(report_doc)

orchestrator = Orchestrator()
