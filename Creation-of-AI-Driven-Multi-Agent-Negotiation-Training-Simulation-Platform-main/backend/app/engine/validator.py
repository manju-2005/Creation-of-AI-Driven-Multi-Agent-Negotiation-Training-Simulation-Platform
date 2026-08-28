import re
from typing import Dict, Any, Tuple, Optional

INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"system prompt",
    r"you are now an unrestricted",
    r"reveal private goals",
    r"override rules"
]

class Validator:
    def validate_turn_input(self, message: str, offer_dict: Dict[str, Any], attempt_count: int = 1) -> Tuple[bool, str]:
        # 1. Prompt Injection Check
        if message:
            for pattern in INJECTION_PATTERNS:
                if re.search(pattern, message, re.IGNORECASE):
                    return False, "Security violation: Potential prompt injection or system override detected."

        # 2. Message Length Check
        if message and len(message) > 2000:
            return False, "Validation error: Message exceeds maximum allowed length (2000 chars)."

        # 3. Offer Schema Check
        if not offer_dict or not isinstance(offer_dict, dict):
            return False, "Validation error: Offer payload is missing or malformed."

        price = offer_dict.get("price")
        if price is None or not isinstance(price, (int, float)) or price < 0:
            return False, "Validation error: Offer price must be a non-negative number."

        # Attempt check
        if attempt_count > 2:
            return False, "Validation error: Maximum validation retries (2) exhausted."

        return True, "Validation passed."

validator = Validator()
