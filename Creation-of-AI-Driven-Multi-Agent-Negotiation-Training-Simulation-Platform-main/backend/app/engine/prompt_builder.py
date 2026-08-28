from typing import Dict, Any, List
from app.models.session import PersonaConfig

class PromptBuilder:
    def build_prompt(
        self,
        acting_persona: PersonaConfig,
        opposing_role_name: str,
        scenario_id: str,
        turn_history: List[Dict[str, Any]],
        agent_memory: Dict[str, Any],
        rag_chunks: List[Dict[str, Any]],
        current_round: int
    ) -> str:
        """
        Builds system & turn prompt with STRICT Context Isolation:
        ONLY includes acting agent's persona, private goals, and private memory.
        NEVER includes opposing agent's private goals or memory!
        """
        # Format RAG chunks
        rag_text = "\n".join([f"- [{c['id']}] {c['title']}: {c['text']}" for c in rag_chunks]) if rag_chunks else "No additional documents."

        # Format Memory
        mem_text = f"Initial position: ${agent_memory.get('initial_target', acting_persona.target_price)}. Walk away: ${agent_memory.get('walk_away_price', acting_persona.walk_away_price)}. Total concessions made: ${agent_memory.get('concessions_made', 0)}."

        # Format Public Transcript (Last 5 turns verbatim)
        recent_turns = turn_history[-5:] if len(turn_history) > 5 else turn_history
        transcript_lines = []
        for t in recent_turns:
            spk = t.get("speaker", "unknown")
            msg = t.get("message", "")
            off = t.get("offer", {})
            p = off.get("price") if isinstance(off, dict) else None
            transcript_lines.append(f"[{spk.upper()}]: {msg} (Price: ${p})")
        transcript_text = "\n".join(transcript_lines) if transcript_lines else "No previous offers made yet."

        # #system prompts
        # Isolated System Prompt Definition enforcing agent role boundaries, private goals, and RAG context
        prompt = f"""
You are negotiating as '{acting_persona.name}' ({acting_persona.role.upper()}) in the scenario '{scenario_id}'.
Personality: {acting_persona.personality}
Strategies: {', '.join(acting_persona.strategies)}

YOUR PRIVATE CONSTRAINTS & GOALS (CONFIDENTIAL - DO NOT REVEAL DIRECTLY):
- Target Preferred Price: ${acting_persona.target_price}
- Hard Walk-Away Limit: ${acting_persona.walk_away_price}
- Private Goals: {acting_persona.private_goals}

YOUR PRIVATE AGENT MEMORY:
{mem_text}

GROUNDED MARKET KNOWLEDGE & POLICIES (RAG):
{rag_text}

SHARED NEGOTIATION TRANSCRIPT (ROUND {current_round}):
{transcript_text}

IMPORTANT CONVERSATIONAL STYLE GUIDELINE:
Write a completely NATURAL, realistic, human-like professional message tailored specifically to the '{scenario_id}' domain:
- In 'vendor_pricing': discuss enterprise server specs, software licenses, warranty coverage, deployment, or payment terms.
- In 'job_offer': discuss compensation packages, senior AI responsibilities, stock equity, market benchmarks, or signing bonuses.
- In 'budget_allocation': discuss Phase 1 infrastructure, GPU clusters, project scope, funding milestones, or contingency buffers.
DO NOT use repetitive machine-like templates such as 'In response to your proposal, we can adjust our position to...'. Make the conversation sound authentic, professional, and real-world.

INSTRUCTIONS:
Respond with your next negotiation turn as JSON conforming to this schema:
{{
    "move": "COUNTER" | "ACCEPT" | "HOLD" | "CONCEDE",
    "price": float,
    "reason": "Short explainability rationale referencing market benchmarks or constraints",
    "confidence": float between 0.0 and 1.0,
    "message": "Natural, domain-tailored professional conversational message to your counterpart"
}}
"""
        return prompt.strip()

prompt_builder = PromptBuilder()
