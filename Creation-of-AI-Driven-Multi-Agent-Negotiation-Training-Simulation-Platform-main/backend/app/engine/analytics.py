from typing import Dict, Any, List

class AnalyticsEngine:
    def compute_zopa(
        self,
        interviewer_walk_away: float,
        interviewee_walk_away: float,
        turn_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates Estimated ZOPA (Zone of Possible Agreement).
        ZOPA exists if Interviewer Walk Away <= Interviewee Walk Away (for budget/buy) or vice versa.
        Refined per turn with observed min/max offers.
        """
        interviewer_offers = [t["offer"]["price"] for t in turn_history if t.get("speaker") == "interviewer" and "offer" in t and "price" in t["offer"]]
        interviewee_offers = [t["offer"]["price"] for t in turn_history if t.get("speaker") == "interviewee" and "offer" in t and "price" in t["offer"]]

        lowest_interviewer_offer = min(interviewer_offers) if interviewer_offers else interviewer_walk_away
        highest_interviewee_offer = max(interviewee_offers) if interviewee_offers else interviewee_walk_away

        zopa_low = min(lowest_interviewer_offer, highest_interviewee_offer)
        zopa_high = max(lowest_interviewer_offer, highest_interviewee_offer)
        gap = abs(lowest_interviewer_offer - highest_interviewee_offer)

        has_overlap = lowest_interviewer_offer <= highest_interviewee_offer
        convergence_pct = round(max(0.0, min(100.0, 100 - (gap / (zopa_high + 1e-5) * 100))), 1)

        return {
            "estimated_range": [round(zopa_low, 2), round(zopa_high, 2)],
            "gap": round(gap, 2),
            "has_overlap": has_overlap,
            "convergence_percentage": convergence_pct,
            "agreement_probability": round(min(1.0, convergence_pct / 100.0 + (0.2 if has_overlap else 0.0)), 2)
        }

    def detect_deadlock(self, turn_history: List[Dict[str, Any]], threshold: float = 0.01) -> bool:
        """
        Deadlock Detection: Compares normalized offer movement across last 4 turns.
        If price movement is below threshold (1%), returns True.
        """
        if len(turn_history) < 4:
            return False

        recent_offers = [t["offer"]["price"] for t in turn_history[-4:] if "offer" in t and "price" in t["offer"]]
        if len(recent_offers) < 4:
            return False

        max_off = max(recent_offers)
        min_off = min(recent_offers)
        movement = (max_off - min_off) / (max_off + 1e-5)

        return movement < threshold

    def compute_agent_concession_rate(self, initial_target: float, last_offer: float) -> float:
        if initial_target == 0:
            return 0.0
        pct = (abs(last_offer - initial_target) / initial_target) * 100
        return round(pct, 2)

analytics_engine = AnalyticsEngine()
