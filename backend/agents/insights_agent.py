"""
InsightsAgent — Computes fleet analytics and failure trends from in-memory DB.
Persists results to Supabase asynchronously (fire-and-forget).
"""

from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List

# Cost map used for revenue calculation (INR)
_COST_MAP: Dict[str, int] = {
    "battery_failure": 4000,
    "engine_overheat": 7500,
    "low_oil_life":    1500,
    "normal":          0,
}


class InsightsAgent:

    # ── Core analytics ─────────────────────────────────────────────────────

    def generate_insights(self) -> Dict[str, Any]:
        """Compute analytics snapshot from in-memory DB."""
        from models.models import DB

        bookings = list(DB["bookings"].values())
        requests = list(DB["service_requests"].values())

        # Failure type distribution
        failure_dist = dict(Counter(b.issue_type for b in bookings))

        # Booking status distribution
        status_dist = dict(Counter(b.status for b in bookings))

        # Estimated revenue from COMPLETED bookings
        total_revenue_inr = sum(
            _COST_MAP.get(b.issue_type, 0)
            for b in bookings
            if b.status == "COMPLETED"
        )

        # Average ML confidence per issue type
        conf_by_issue: Dict[str, List[float]] = defaultdict(list)
        for r in requests:
            conf_by_issue[r.ml_result.prediction].append(r.ml_result.confidence)
        avg_confidence = {
            k: round(sum(v) / len(v) * 100, 1)
            for k, v in conf_by_issue.items()
        }

        # Most active vehicle (most bookings)
        vehicle_counts = Counter(b.vehicle_id for b in bookings)
        most_active_vehicle = vehicle_counts.most_common(1)[0][0] if vehicle_counts else None

        # Per-garage performance
        garage_perf: Dict[str, Dict] = defaultdict(
            lambda: {"bookings": 0, "completed": 0, "revenue_inr": 0}
        )
        for b in bookings:
            garage_perf[b.garage_id]["bookings"] += 1
            if b.status == "COMPLETED":
                garage_perf[b.garage_id]["completed"] += 1
                garage_perf[b.garage_id]["revenue_inr"] += _COST_MAP.get(b.issue_type, 0)

        # Urgency distribution
        urgency_dist = dict(Counter(r.urgency for r in requests))

        # Pipeline success rate
        total_req = len(requests)
        booked = sum(1 for r in requests if r.status in ("BOOKED", "COMPLETED"))
        success_rate = round(booked / total_req * 100, 1) if total_req > 0 else 0.0

        return {
            "failure_distribution":          failure_dist,
            "booking_status_distribution":   status_dist,
            "total_estimated_revenue_inr":   total_revenue_inr,
            "avg_confidence_by_issue":       avg_confidence,
            "most_active_vehicle":           most_active_vehicle,
            "garage_performance":            dict(garage_perf),
            "urgency_distribution":          urgency_dist,
            "pipeline_success_rate_pct":     success_rate,
            "total_bookings":                len(bookings),
            "total_requests":                total_req,
            "generated_at":                  datetime.now().isoformat(),
        }

    def generate_and_persist(self) -> Dict[str, Any]:
        """Generate insights and schedule a non-blocking Supabase write."""
        insights = self.generate_insights()
        try:
            from db.supabase_client import save_insight
            save_insight("fleet_summary", insights)
        except Exception:
            pass
        return insights

