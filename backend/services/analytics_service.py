"""
analytics_service.py — Full analytics business logic for the admin dashboard.

Queries the in-memory DB (always primary) to generate chart-ready JSON.
Also writes analytics records to Supabase for historical persistence.
"""

from collections import defaultdict
from datetime import datetime, timezone
from typing import List, Dict, Any


class AnalyticsService:
    """Generates analytics data consumed by the /admin/analytics/* endpoints."""

    def __init__(self):
        # Deferred import to avoid circular deps at module load
        from models.models import DB, ACTIVE_PIPELINES
        self._db = DB
        self._active = ACTIVE_PIPELINES

    # ── 1. Errors over time ───────────────────────────────────────────────────

    def errors_over_time(self) -> List[Dict]:
        """
        Returns a time-series of detected issues grouped by hour-of-day.
        Looks back 36 h so yesterday's full working day is always visible.
        Chart: Line chart — X = "HH:00", Y = count (24 fixed points, zeros filled)
        """
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(hours=36)

        buckets: Dict[str, int] = defaultdict(int)
        for req in self._db.get("service_requests", {}).values():
            if req.ml_result.prediction != "normal" and req.created_at >= cutoff:
                hour_key = req.created_at.strftime("%H:00")
                buckets[hour_key] += 1

        # Always return all 24 hours so the chart is never a single dot
        return [{"time": f"{h:02d}:00", "count": buckets.get(f"{h:02d}:00", 0)} for h in range(24)]

    # ── 2. Car model error frequency ──────────────────────────────────────────

    def car_model_frequency(self) -> List[Dict]:
        """
        Returns how many errors each car model has had.
        Chart: Bar chart — X=car model, Y=error count
        """
        counts: Dict[str, int] = defaultdict(int)
        for req in self._db.get("service_requests", {}).values():
            if req.ml_result.prediction != "normal":
                vehicle = self._db["vehicles"].get(req.vehicle_id)
                model = vehicle.model if vehicle else "Unknown"
                counts[model] += 1

        # Also count from analytics in-memory store
        for record in self._db.get("analytics", {}).values():
            model = record.get("car_model", "Unknown")
            counts[model] += 1

        sorted_data = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [{"car_model": k, "count": v} for k, v in sorted_data[:15]]

    # ── 3. Error type distribution ────────────────────────────────────────────

    def error_distribution(self) -> List[Dict]:
        """
        Returns breakdown of issue types (battery / engine / oil / normal).
        Chart: Pie/Doughnut chart
        """
        counts: Dict[str, int] = defaultdict(int)
        for req in self._db.get("service_requests", {}).values():
            issue = req.ml_result.prediction
            counts[issue] += 1

        COLORS = {
            "battery_failure": "#f59e0b",
            "engine_overheat": "#ef4444",
            "low_oil_life": "#3b82f6",
            "normal": "#10b981",
        }
        LABELS = {
            "battery_failure": "Battery Failure",
            "engine_overheat": "Engine Overheat",
            "low_oil_life": "Low Oil Life",
            "normal": "Normal",
        }

        return [
            {
                "issue_type": k,
                "label": LABELS.get(k, k.replace("_", " ").title()),
                "count": v,
                "color": COLORS.get(k, "#6b7280"),
                "pct": round(v / max(sum(counts.values()), 1) * 100, 1),
            }
            for k, v in counts.items()
        ]

    # ── 4. Garage performance / acceptance rate ───────────────────────────────

    def garage_performance(self) -> List[Dict]:
        """
        Returns per-garage stats: accepted, rejected, completed, avg response time.
        Chart: Horizontal bar chart
        """
        stats: Dict[str, Dict] = {}

        for garage in self._db.get("garages", {}).values():
            stats[garage.id] = {
                "garage_id": garage.id,
                "garage_name": garage.name,
                "accepted": 0,
                "rejected": 0,
                "completed": 0,
                "total": 0,
                "acceptance_rate": 0.0,
                "rating": garage.rating,
            }

        for booking in self._db.get("bookings", {}).values():
            gid = booking.garage_id
            if gid not in stats:
                continue
            stats[gid]["total"] += 1
            if booking.status in ("IN_PROGRESS", "CONFIRMED", "COMPLETED"):
                stats[gid]["accepted"] += 1
            elif booking.status == "CANCELLED":
                stats[gid]["rejected"] += 1
            if booking.status == "COMPLETED":
                stats[gid]["completed"] += 1

        for s in stats.values():
            total = s["accepted"] + s["rejected"]
            s["acceptance_rate"] = round(s["accepted"] / max(total, 1) * 100, 1)

        return sorted(stats.values(), key=lambda x: x["acceptance_rate"], reverse=True)

    # ── Summary snapshot (for admin WebSocket) ────────────────────────────────

    def summary_snapshot(self) -> Dict[str, Any]:
        requests = self._db.get("service_requests", {})
        bookings = self._db.get("bookings", {})
        total_issues = sum(1 for r in requests.values() if r.ml_result.prediction != "normal")
        return {
            "total_vehicles": len(self._db.get("vehicles", {})),
            "total_garages": len(self._db.get("garages", {})),
            "total_service_requests": len(requests),
            "total_bookings": len(bookings),
            "active_pipelines": len(self._active),
            "total_issues_detected": total_issues,
            "completed_bookings": sum(1 for b in bookings.values() if b.status == "COMPLETED"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── Persist analytics record (called from ML pipeline hook) ──────────────

    def record_detection(self, car_model: str, issue_type: str,
                         garage_id: str, confidence: float) -> None:
        """
        Store one detection event in the analytics in-memory store + Supabase.
        Called after every ML detection.
        """
        import uuid
        record_id = str(uuid.uuid4())
        record = {
            "id": record_id,
            "car_model": car_model,
            "issue_type": issue_type,
            "garage_id": garage_id,
            "confidence": round(confidence, 4),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._db.setdefault("analytics", {})[record_id] = record

        # Persist to Supabase (fire-and-forget)
        try:
            from db.supabase_client import get_client, _fire, _async_insert
            _fire(_async_insert("analytics", record))
        except Exception:
            pass
