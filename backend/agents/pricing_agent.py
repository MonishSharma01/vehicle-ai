"""
PricingAgent — Compares garage pricing for a given service type.
Selects best-value garage considering urgency, rating, and distance.
"""

from typing import Any, Dict, List

# Urgency-based price multipliers
_URGENCY_MULT: Dict[str, float] = {
    "CRITICAL": 1.30,
    "HIGH":     1.15,
    "MEDIUM":   1.00,
    "LOW":      0.90,
}

# Base service cost in INR per issue type
_BASE_COST_INR: Dict[str, int] = {
    "battery_failure": 4000,
    "engine_overheat": 7500,
    "low_oil_life":    1500,
    "normal":          0,
}


class PricingAgent:

    def calculate_price(
        self, issue_type: str, urgency: str, garage=None
    ) -> Dict[str, Any]:
        """Return pricing breakdown for one garage + issue + urgency combination."""
        base       = _BASE_COST_INR.get(issue_type, 2000)
        multiplier = _URGENCY_MULT.get(urgency, 1.0)
        final      = round(base * multiplier)
        future     = round(base * 1.40)   # projected cost if service is deferred

        return {
            "issue_type":         issue_type,
            "urgency":            urgency,
            "base_cost_inr":      base,
            "urgency_multiplier": multiplier,
            "final_cost_inr":     final,
            "future_cost_inr":    future,
            "garage_id":          garage.id   if garage else None,
            "garage_name":        garage.name if garage else None,
        }

    def compare_garages(
        self, garages: list, issue_type: str, urgency: str
    ) -> List[Dict[str, Any]]:
        """Return all garages ranked by adjusted cost (cheapest first)."""
        results = []
        for garage in garages:
            pricing = self.calculate_price(issue_type, urgency, garage)
            # Higher-rated garages get a slight cost reduction in the comparison
            rating_discount = 1.0 - (garage.rating - 3.0) * 0.02
            adjusted = round(pricing["final_cost_inr"] * max(rating_discount, 0.80))
            results.append(
                {
                    **pricing,
                    "adjusted_cost_inr": adjusted,
                    "rating":            garage.rating,
                    "available_slots":   garage.available_slots,
                }
            )
        results.sort(key=lambda x: x["adjusted_cost_inr"])
        return results

    def get_best_garage(self, garages: list, issue_type: str, urgency: str) -> Dict[str, Any]:
        """Return the best-value garage with rating >= 3.5."""
        if not garages:
            return {}
        compared  = self.compare_garages(garages, issue_type, urgency)
        qualified = [g for g in compared if g["rating"] >= 3.5]
        return (qualified or compared)[0]

