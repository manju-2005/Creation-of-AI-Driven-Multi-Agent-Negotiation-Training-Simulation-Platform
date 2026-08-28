from typing import List, Dict, Any
import math

# Knowledge base pre-populated with scenario policy & market benchmarks
KNOWLEDGE_BASE = [
    # Vendor Pricing Scenario Chunks
    {
        "id": "doc_vp_01",
        "scenario_id": "vendor_pricing",
        "title": "IT Hardware Market Pricing Benchmark 2026",
        "text": "Standard market rate for high-performance enterprise server units ranges from $1,200 to $1,800 per unit depending on volume. Orders over 100 units typically receive a 10-15% discount.",
        "tags": ["pricing", "hardware", "volume_discount"]
    },
    {
        "id": "doc_vp_02",
        "scenario_id": "vendor_pricing",
        "title": "Vendor Warranty & SLA Guidelines",
        "text": "Standard extended warranty adds 8-12% to contract cost per year. 24-month warranties are standard industry baseline, while 36-month warranties carry premium support guarantees.",
        "tags": ["warranty", "sla", "terms"]
    },
    {
        "id": "doc_vp_03",
        "scenario_id": "vendor_pricing",
        "title": "Enterprise Payment Term Policy",
        "text": "Net 30 payment terms are preferred for enterprise software/hardware procurement. Net 60 terms require executive CFO signoff or a 2% early settlement clause.",
        "tags": ["payment_terms", "policy"]
    },

    # Job Offer Scenario Chunks
    {
        "id": "doc_jo_01",
        "scenario_id": "job_offer",
        "title": "Tech Lead Compensation Benchmark 2026",
        "text": "Base salary for Senior Tech Lead roles in tech hubs ranges from $120,000 to $160,000. Median base salary is $140,000 with target signing bonus of $10,000-$15,000.",
        "tags": ["salary", "compensation", "job_offer"]
    },
    {
        "id": "doc_jo_02",
        "scenario_id": "job_offer",
        "title": "Remote Work & Flexibility Policy",
        "text": "Standard hybrid policy allows 2-3 remote days per week. Fully remote roles (>3 days/week) may adjust base salary by up to 5% depending on location tier.",
        "tags": ["remote_days", "policy", "perks"]
    },
    {
        "id": "doc_jo_03",
        "scenario_id": "job_offer",
        "title": "Equity & Stock Grant Standards",
        "text": "Senior roles typically include 5,000 to 15,000 stock options over a 4-year vesting schedule with a 1-year cliff.",
        "tags": ["equity", "stock_options"]
    },

    # Budget Allocation Scenario Chunks
    {
        "id": "doc_ba_01",
        "scenario_id": "budget_allocation",
        "title": "R&D Project Budget Allocation Guidelines",
        "text": "Annual department budget cap is $500,000. Core R&D projects typically ask for $200,000 to $350,000. Contingency funds are capped at 15% of total project budget.",
        "tags": ["budget", "finance", "cap"]
    },
    {
        "id": "doc_ba_02",
        "scenario_id": "budget_allocation",
        "title": "Headcount Cost Allocation Policy",
        "text": "Dedicated full-time engineering headcount is evaluated at $80,000 per headcount unit per year. Contractors are evaluated at $50,000 per phase.",
        "tags": ["headcount", "staffing"]
    },
    {
        "id": "doc_ba_03",
        "scenario_id": "budget_allocation",
        "title": "Phase 1 Milestone Funding Release",
        "text": "Phase 1 initial funding release requires a minimum 40% allocation reserved for Phase 2 integration and testing deliverables.",
        "tags": ["phase1_allocation", "milestones"]
    }
]

class VectorStore:
    def __init__(self):
        self.documents = KNOWLEDGE_BASE

    def _compute_tf_idf_similarity(self, query: str, doc_text: str) -> float:
        query_words = set(query.lower().split())
        doc_words = doc_text.lower().split()
        if not query_words or not doc_words:
            return 0.0
        matches = sum(1 for w in doc_words if w in query_words)
        return matches / (math.sqrt(len(query_words)) * math.sqrt(len(set(doc_words))) + 1e-5)

    def search(self, scenario_id: str, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        # Filter documents by scenario
        scenario_docs = [d for d in self.documents if d["scenario_id"] == scenario_id]
        if not scenario_docs:
            scenario_docs = self.documents

        scored_docs = []
        for doc in scenario_docs:
            score = self._compute_tf_idf_similarity(query, doc["title"] + " " + doc["text"] + " " + " ".join(doc["tags"]))
            scored_docs.append((score, doc))

        # Sort descending by score
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        results = [d for _, d in scored_docs[:top_k]]
        return results

vector_store = VectorStore()
