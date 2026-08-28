from typing import Dict, Any, List
from app.db.vector_db import vector_store

class ToolRegistry:
    def __init__(self):
        self.tools_schema = [
            {
                "name": "price_calculator",
                "description": "Computes volume discount, total contract value, and per-unit cost.",
                "parameters": {
                    "price": "float",
                    "quantity": "int",
                    "discount_rate": "float"
                }
            },
            {
                "name": "policy_retriever",
                "description": "Looks up scenario negotiation policy rules and approval limits.",
                "parameters": {
                    "scenario_id": "str",
                    "policy_type": "str"
                }
            },
            {
                "name": "currency_converter",
                "description": "Converts offer amounts between USD, EUR, GBP, and INR.",
                "parameters": {
                    "amount": "float",
                    "from_curr": "str",
                    "to_curr": "str"
                }
            },
            {
                "name": "product_database",
                "description": "Looks up product, job role, or project specs for scenario.",
                "parameters": {
                    "scenario_id": "str"
                }
            },
            {
                "name": "budget_validator",
                "description": "Validates proposed offer against budget limit.",
                "parameters": {
                    "offer_price": "float",
                    "max_budget": "float"
                }
            },
            {
                "name": "market_price_search",
                "description": "Retrieves market benchmarks and comparable statistics.",
                "parameters": {
                    "scenario_id": "str",
                    "query": "str"
                }
            }
        ]

    def get_tools_list() -> List[Dict[str, Any]]:
        pass # Helper method signature

    def price_calculator(self, price: float, quantity: int = 1, discount_rate: float = 0.0) -> Dict[str, Any]:
        total_before_discount = price * quantity
        discount_amount = total_before_discount * discount_rate
        final_total = total_before_discount - discount_amount
        return {
            "unit_price": price,
            "quantity": quantity,
            "subtotal": total_before_discount,
            "discount_applied": discount_amount,
            "final_total": final_total
        }

    def policy_retriever(self, scenario_id: str, policy_type: str = "general") -> Dict[str, Any]:
        policies = {
            "vendor_pricing": "Max allowed discount without executive approval is 15%. Payment terms Net 30 default.",
            "job_offer": "Base salary caps require VP approval if exceeding 15% above median benchmark ($150,000).",
            "budget_allocation": "Contingency buffer capped at 15% of total budget. Phase 1 release min 40%."
        }
        return {
            "scenario_id": scenario_id,
            "policy": policies.get(scenario_id, "Standard corporate policy applies.")
        }

    def currency_converter(self, amount: float, from_curr: str = "USD", to_curr: str = "USD") -> Dict[str, Any]:
        rates = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "INR": 83.5}
        from_rate = rates.get(from_curr.upper(), 1.0)
        to_rate = rates.get(to_curr.upper(), 1.0)
        converted = (amount / from_rate) * to_rate
        return {
            "original_amount": amount,
            "from_currency": from_curr,
            "to_currency": to_curr,
            "converted_amount": round(converted, 2)
        }

    def product_database(self, scenario_id: str) -> Dict[str, Any]:
        specs = {
            "vendor_pricing": {"item": "Enterprise AI Server Rack", "spec": "64 Cores, 256GB RAM, 10TB NVMe", "standard_price": 1500},
            "job_offer": {"role": "Senior AI Systems Engineer", "level": "L5 / Staff", "location": "Hybrid"},
            "budget_allocation": {"project": "Autonomous Agent Infrastructure", "duration": "12 Months", "standard_budget": 300000}
        }
        return specs.get(scenario_id, {"info": "Standard specs apply"})

    def budget_validator(self, offer_price: float, max_budget: float) -> Dict[str, Any]:
        within_budget = offer_price <= max_budget
        variance = offer_price - max_budget
        return {
            "offer_price": offer_price,
            "max_budget": max_budget,
            "within_budget": within_budget,
            "variance": variance
        }

    def market_price_search(self, scenario_id: str, query: str = "benchmark") -> Dict[str, Any]:
        results = vector_store.search(scenario_id=scenario_id, query=query, top_k=2)
        return {
            "query": query,
            "benchmarks": [r["text"] for r in results]
        }

    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        if hasattr(self, tool_name):
            method = getattr(self, tool_name)
            try:
                return method(**args)
            except Exception as e:
                return {"error": f"Tool execution failed: {str(e)}"}
        return {"error": f"Tool '{tool_name}' not found."}

tool_registry = ToolRegistry()
