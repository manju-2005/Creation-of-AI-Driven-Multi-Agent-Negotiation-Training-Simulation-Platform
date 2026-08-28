import asyncio
import json
import logging
import re
import time
from typing import Dict, Any, List
from app.config import settings
from app.models.session import PersonaConfig
from app.tools.tool_registry import tool_registry

logger = logging.getLogger(__name__)

# #rate limiting
# Errors that indicate Gemini is out of quota / rate-limited (free tier RPM/RPD caps).
# On these we throttle proactively and fall back to Groq instead of failing the turn.
_QUOTA_ERROR_MARKERS = ("429", "RESOURCE_EXHAUSTED", "quota", "rate limit")


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(marker.lower() in text for marker in _QUOTA_ERROR_MARKERS)


class _GeminiRateLimiter:
    """
    Simple client-side throttle so we don't hammer Gemini's free-tier RPM cap
    (e.g. 5 requests/minute). Ensures a minimum spacing between calls.
    """
    def __init__(self):
        self._lock = asyncio.Lock()
        self._last_call_ts = 0.0

    async def wait_turn(self):
        async with self._lock:
            min_interval = settings.GEMINI_MIN_INTERVAL_SECONDS
            now = time.monotonic()
            elapsed = now - self._last_call_ts
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            self._last_call_ts = time.monotonic()


class LLMAbstractionLayer:
    def __init__(self):
        # #tool calling
        # Register standard tool functions from tool_registry for Gemini Tool Calling
        self.tools = [
            tool_registry.price_calculator,
            tool_registry.policy_retriever,
            tool_registry.currency_converter,
            tool_registry.product_database,
            tool_registry.budget_validator,
            tool_registry.market_price_search,
        ]
        self._gemini_rate_limiter = _GeminiRateLimiter()

    def _format_decision(self, parsed: Dict[str, Any], acting_persona: PersonaConfig,
                          reason_default: str, executed_tools: List[Dict[str, Any]],
                          provider: str) -> Dict[str, Any]:
        # Format price safely
        try:
            price_val = float(parsed.get("price", acting_persona.target_price))
        except (ValueError, TypeError):
            price_val = float(acting_persona.target_price)

        # Format confidence safely
        conf_val = parsed.get("confidence", 0.90)
        if isinstance(conf_val, str):
            conf_val = 0.95 if "high" in conf_val.lower() else (0.75 if "medium" in conf_val.lower() else 0.5)
        try:
            conf_val = float(conf_val)
        except (ValueError, TypeError):
            conf_val = 0.90

        move_raw = str(parsed.get("move", "COUNTER")).upper()
        if "ACCEPT" in move_raw or "AGREE" in move_raw:
            move_str = "ACCEPT"
        elif "REJECT" in move_raw or "WALK" in move_raw:
            move_str = "REJECT"
        else:
            move_str = "COUNTER"

        return {
            "move": move_str,
            "price": price_val,
            "reason": str(parsed.get("reason", reason_default)),
            "confidence": conf_val,
            "message": str(parsed.get("message", f"I propose ₹{price_val:,.2f}.")),
            "tool_calls": executed_tools,
            "provider": provider,
        }

    @staticmethod
    def _extract_json(raw_text: str) -> Dict[str, Any]:
        raw_text = raw_text or ""
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(raw_text)

    async def generate_turn_decision(
        self,
        prompt: str,
        acting_persona: PersonaConfig,
        agent_memory: Dict[str, Any],
        turn_history: List[Dict[str, Any]],
        current_round: int,
        rag_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates the negotiation decision using Gemini as the primary LLM.
        If Gemini is rate-limited / quota-exhausted (or otherwise fails), it
        automatically falls back to Groq (free tier) as a secondary agent so
        the negotiation simulation keeps running uninterrupted.
        """
        gemini_key = settings.get_effective_gemini_key()
        gemini_error: Exception = None

        if gemini_key:
            try:
                return await self._generate_with_gemini(prompt, acting_persona, gemini_key)
            except Exception as e:
                gemini_error = e
                if _is_quota_error(e):
                    logger.warning(f"Gemini quota/rate-limit hit, falling back to Groq: {e}")
                else:
                    logger.error(f"Gemini API execution failed, falling back to Groq: {e}")
        else:
            logger.warning("GEMINI_API_KEY is not configured; attempting Groq fallback directly.")

        # #secondary agent fallback
        groq_key = settings.get_effective_groq_key()
        if groq_key:
            try:
                return await self._generate_with_groq(prompt, acting_persona, groq_key)
            except Exception as groq_e:
                logger.error(f"Groq fallback also failed: {groq_e}")
                raise RuntimeError(
                    f"Both Gemini and Groq LLM calls failed. Gemini: {gemini_error}. Groq: {groq_e}"
                )

        # No fallback available - surface the original error (or missing-key error).
        if gemini_error is not None:
            raise RuntimeError(f"Gemini LLM Call Error: {str(gemini_error)}")
        raise ValueError(
            "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured! "
            "Please set at least one in your .env file to enable LLM calling."
        )

    async def _generate_with_gemini(self, prompt: str, acting_persona: PersonaConfig, gemini_key: str) -> Dict[str, Any]:
        # Throttle so we stay under the free-tier RPM cap
        await self._gemini_rate_limiter.wait_turn()

        # 1. Try Google GenAI SDK first if installed and functional
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)
            response = await client.aio.models.generate_content(
                model=settings.DEFAULT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.7,
                )
            )
            parsed = self._extract_json(response.text or "")
            return self._format_decision(parsed, acting_persona, "Gemini LLM decision", [], provider="gemini")
        except (ImportError, ModuleNotFoundError, AttributeError) as imp_err:
            logger.info(f"Google GenAI SDK import unavailable ({imp_err}). Using direct Gemini REST API.")
            return await self._generate_with_gemini_rest(prompt, acting_persona, gemini_key)
        except Exception as sdk_err:
            logger.warning(f"Google GenAI SDK call error ({sdk_err}). Retrying via direct Gemini REST API.")
            return await self._generate_with_gemini_rest(prompt, acting_persona, gemini_key)

    async def _generate_with_gemini_rest(self, prompt: str, acting_persona: PersonaConfig, gemini_key: str) -> Dict[str, Any]:
        import httpx

        model_name = settings.DEFAULT_MODEL or "gemini-2.5-flash"
        if "/" in model_name:
            model_name = model_name.split("/")[-1]

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.7,
                "responseMimeType": "application/json"
            }
        }

        last_error = None
        for attempt in range(4):
            try:
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code in (429, 503):
                        wait_sec = (attempt + 1) * 4
                        logger.warning(f"Gemini API rate limit/busy (status {resp.status_code}), waiting {wait_sec}s before retry {attempt + 1}/4...")
                        await asyncio.sleep(wait_sec)
                        continue
                    resp.raise_for_status()
                    data = resp.json()

                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = self._extract_json(raw_text)
                return self._format_decision(parsed, acting_persona, "Gemini REST LLM decision", [], provider="gemini")
            except httpx.HTTPStatusError as http_err:
                last_error = http_err
                if http_err.response.status_code in (429, 503) and attempt < 3:
                    await asyncio.sleep((attempt + 1) * 4)
                    continue
                raise
            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                last_error = net_err
                if attempt < 3:
                    await asyncio.sleep(2)
                    continue
                raise
            except Exception as e:
                last_error = e
                if attempt < 3:
                    await asyncio.sleep(2)
                    continue
                raise

        if last_error:
            raise last_error

    async def _generate_with_groq(self, prompt: str, acting_persona: PersonaConfig, groq_key: str) -> Dict[str, Any]:
        import httpx

        # Groq exposes an OpenAI-compatible chat completions endpoint.
        # No native tool-calling here (kept simple as a fallback path) - the
        # prompt already instructs the model to reply with the same JSON schema
        # Gemini uses, so downstream parsing stays identical.
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        raw_text = data["choices"][0]["message"]["content"]
        parsed = self._extract_json(raw_text)

        return self._format_decision(parsed, acting_persona, "Groq LLM fallback decision", [], provider="groq")

llm_interface = LLMAbstractionLayer()