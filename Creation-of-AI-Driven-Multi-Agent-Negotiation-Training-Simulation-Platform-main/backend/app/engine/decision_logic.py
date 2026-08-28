import random
from typing import Dict, Any, List, Optional
from app.models.session import PersonaConfig

class DecisionEngine:
    def determine_ai_move(
        self,
        persona: PersonaConfig,
        agent_memory: Dict[str, Any],
        turn_history: List[Dict[str, Any]],
        current_round: int,
        rag_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Custom negotiation reasoning engine with domain-tailored, natural human dialogue generation.
        Calculates move, counter-offer price, confidence, and realistic professional messages.
        Enforces:
        - For SELLER (Interviewer / Vendor): target_price > walk_away_price (Asking high, conceding down to baseline).
        - For BUYER (Interviewee / Buyer): target_price < walk_away_price (Offering low, conceding up to budget limit).
        """
        role = persona.role.lower()
        target = persona.target_price
        walk_away = persona.walk_away_price
        strategies = persona.strategies
        personality = persona.personality
        name = persona.name.lower()

        # Determine Scenario Category dynamically
        if "hiring" in name or "candidate" in name or "job" in name or (target >= 100000 and target <= 200000):
            scenario_type = "job_offer"
        elif "finance" in name or "r&d" in name or "budget" in name or target >= 200000:
            scenario_type = "budget_allocation"
        else:
            scenario_type = "vendor_pricing"

        # Check last counterpart offer
        last_counterpart_turn = None
        for t in reversed(turn_history):
            if t.get("speaker") != persona.role:
                last_counterpart_turn = t
                break

        last_counterpart_price = None
        if last_counterpart_turn:
            off = last_counterpart_turn.get("offer", {})
            if isinstance(off, dict):
                last_counterpart_price = off.get("price")

        # Helper for currency symbol
        symbol = "₹" if (target >= 1000 or walk_away >= 1000) and target < 50000 else ("$" if target >= 50000 else "₹")

        # 1. Round 0 / First Move -> Anchoring Strategy
        if not last_counterpart_price:
            anchor_price = target
            if target > walk_away:
                thought = f"Anchor high at initial target price ({symbol}{int(anchor_price):,}) to preserve negotiation margin."
                if scenario_type == "job_offer":
                    msg = f"Thank you for interviewing with us! We are thrilled to extend an initial offer with a base salary of {symbol}{int(anchor_price):,}."
                elif scenario_type == "budget_allocation":
                    msg = f"We have reviewed the project requirements. Our initial department allocation cap is set at {symbol}{int(anchor_price):,}."
                else:
                    msg = f"Thank you for considering our solution. Our initial asking price for the full server deployment is {symbol}{int(anchor_price):,}."
            else:
                thought = f"Anchor low at initial target budget ({symbol}{int(anchor_price):,}) to establish favorable baseline."
                if scenario_type == "job_offer":
                    msg = f"Thank you so much for the offer! Based on current market benchmarks for Senior AI roles, I am targeting a base salary of {symbol}{int(anchor_price):,}."
                elif scenario_type == "budget_allocation":
                    msg = f"Thank you for reviewing the proposal. Provisioning the required GPU infrastructure requires a baseline operational budget of {symbol}{int(anchor_price):,}."
                else:
                    msg = f"We appreciate the quote, but {symbol}{int(anchor_price):,} is a bit steep for our procurement budget. We were aiming for {symbol}{int(anchor_price):,}."

            return {
                "move": "COUNTER",
                "price": float(anchor_price),
                "reason": thought,
                "confidence": 0.90,
                "message": msg
            }

        # Evaluate counterpart offer acceptability
        is_acceptable = False
        if target > walk_away:
            # Seller: Accepts if counterpart offers at or above walk-away limit
            if last_counterpart_price >= walk_away:
                is_acceptable = True
        else:
            # Buyer: Accepts if counterpart asks at or below walk-away limit
            if last_counterpart_price <= walk_away:
                is_acceptable = True

        # Check if deal close is possible (within ZOPA)
        if is_acceptable and current_round >= 2:
            if scenario_type == "job_offer":
                msg = f"We are delighted to accept the salary terms of {symbol}{int(last_counterpart_price):,}. We look forward to working together!"
            elif scenario_type == "budget_allocation":
                msg = f"We accept the project funding allocation of {symbol}{int(last_counterpart_price):,}. We will finalize the operational milestones."
            else:
                msg = f"We are pleased to accept your proposed price of {symbol}{int(last_counterpart_price):,}. We have reached an agreement!"

            return {
                "move": "ACCEPT",
                "price": round(last_counterpart_price, 2),
                "reason": f"Counterpart offer ({symbol}{int(last_counterpart_price):,}) satisfies baseline constraints. Closing agreement.",
                "confidence": 0.95,
                "message": msg
            }

        # Check Walk-away limits
        if "Walk-away" in strategies:
            if target > walk_away and last_counterpart_price < walk_away * 0.95:
                return {
                    "move": "HOLD",
                    "price": round(walk_away, 2),
                    "reason": f"Counterpart offer ({symbol}{int(last_counterpart_price):,}) is below baseline minimum ({symbol}{int(walk_away):,}). Holding firm.",
                    "message": f"Regrettably, {symbol}{int(last_counterpart_price):,} is below our baseline minimum of {symbol}{int(walk_away):,}. We must hold firm."
                }
            elif target < walk_away and last_counterpart_price > walk_away * 1.05:
                return {
                    "move": "HOLD",
                    "price": round(walk_away, 2),
                    "reason": f"Counterpart offer ({symbol}{int(last_counterpart_price):,}) exceeds maximum budget limit ({symbol}{int(walk_away):,}). Holding firm.",
                    "message": f"Unfortunately, {symbol}{int(last_counterpart_price):,} exceeds our maximum budget ceiling of {symbol}{int(walk_away):,}."
                }

        # Calculate Concession Step towards midpoint
        midpoint = (last_counterpart_price + target) / 2.0
        decay_factor = max(0.2, 1.0 - (current_round * 0.12))
        my_last_price = agent_memory.get("last_offer", target)

        if target > walk_away:
            # Seller: Concede downwards from my_last_price towards walk_away / midpoint
            new_price = max(walk_away, my_last_price - (abs(my_last_price - midpoint) * 0.5 * decay_factor))
        else:
            # Buyer: Concede upwards from my_last_price towards walk_away / midpoint
            new_price = min(walk_away, my_last_price + (abs(midpoint - my_last_price) * 0.5 * decay_factor))

        new_price = round(new_price, -2) if new_price >= 1000 else round(new_price, 2)

        # Small gap check for final concession
        if abs(new_price - last_counterpart_price) / max(1.0, last_counterpart_price) < 0.05 and current_round >= 3:
            return {
                "move": "CONCEDE",
                "price": round(last_counterpart_price, 2),
                "reason": "Gap is minimal. Conceding to finalize terms.",
                "confidence": 0.92,
                "message": f"We appreciate your flexibility. To bridge the remaining gap and close the deal, we accept {symbol}{int(last_counterpart_price):,}."
            }

        # Dynamic, natural scenario dialogue templates
        if scenario_type == "job_offer":
            if role == "interviewer":
                templates = [
                    f"We value your technical expertise in AI systems. While {symbol}{int(last_counterpart_price):,} is above our initial band, we can increase our base salary offer to {symbol}{int(new_price):,}.",
                    f"I spoke with our HR committee regarding your expectations. We can adjust our compensation package upward to {symbol}{int(new_price):,}.",
                    f"We really want you on the team. To bring us closer to a deal, we can revise our base salary proposal to {symbol}{int(new_price):,}."
                ]
            else:
                templates = [
                    f"Thank you for revising the offer. Considering my experience scaling production AI models, I can adjust my expectation down to {symbol}{int(new_price):,}.",
                    f"I appreciate your flexibility on the salary band. To meet halfway, I can adjust my base salary target to {symbol}{int(new_price):,}.",
                    f"I am very keen on joining. If we can reach {symbol}{int(new_price):,} in base salary, I would be ready to sign."
                ]
        elif scenario_type == "budget_allocation":
            if role == "interviewer":
                templates = [
                    f"We understand the GPU compute requirements. If we optimize Phase 2 milestones, we can expand the Phase 1 allocation to {symbol}{int(new_price):,}.",
                    f"After reviewing the R&D budget breakdown, we can approve an increased operational allocation of {symbol}{int(new_price):,}.",
                    f"To ensure the infrastructure deliverables are met without compromising reserves, we can offer {symbol}{int(new_price):,}."
                ]
            else:
                templates = [
                    f"We appreciate your review of our compute needs. By trimming non-essential software licenses, we can lower our funding request to {symbol}{int(new_price):,}.",
                    f"Thank you for working with us on budget allocations. We can adjust our Phase 1 operational requirement to {symbol}{int(new_price):,}.",
                    f"To keep the project moving forward within departmental limits, we can streamline our Phase 1 budget to {symbol}{int(new_price):,}."
                ]
        else: # vendor_pricing
            if role == "interviewer":
                templates = [
                    f"We appreciate your business needs. To accommodate your procurement budget while maintaining 24/7 SLA support, we can offer {symbol}{int(new_price):,} per unit.",
                    f"In order to move forward with bulk deployment, we can adjust our unit price down to {symbol}{int(new_price):,} under Net 30 terms.",
                    f"We value this partnership. We can offer a volume discount bringing the price to {symbol}{int(new_price):,} per unit."
                ]
            else:
                templates = [
                    f"Thank you for the updated quote. To align with our quarterly purchasing approval threshold, we can increase our offer to {symbol}{int(new_price):,}.",
                    f"We appreciate the discount on SLA support. We are prepared to raise our budget allocation to {symbol}{int(new_price):,} per unit.",
                    f"If we finalize procurement this week, we can adjust our offer upward to {symbol}{int(new_price):,}."
                ]

        selected_msg = templates[(current_round + len(turn_history)) % len(templates)]

        return {
            "move": "COUNTER",
            "price": float(new_price),
            "reason": f"Strategic counter-offer moving towards agreement ({personality} stance).",
            "confidence": 0.88,
            "message": selected_msg
        }

decision_engine = DecisionEngine()
