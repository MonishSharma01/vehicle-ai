"""
AnomalyAgent — Scans in-memory DB for conflicting / abnormal pipeline behaviour.
Logs anomalies to console and Supabase agent_logs (fire-and-forget).
"""

from datetime import datetime
from typing import Any, Dict, List


class AnomalyAgent:

    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Scan current in-memory state for anomalous patterns."""
        from models.models import DB, ACTIVE_PIPELINES

        anomalies: List[Dict[str, Any]] = []
        requests  = list(DB["service_requests"].values())
        bookings  = list(DB["bookings"].values())

        for r in requests:
            # Critical issue but all garages rejected it
            if r.status == "ALL_REJECTED" and r.urgency == "CRITICAL":
                anomalies.append(self._anomaly(
                    "CRITICAL_ISSUE_UNSERVICED",
                    r.id, r.vehicle_id,
                    f"CRITICAL '{r.ml_result.prediction}' — all garages rejected.",
                ))

            # User declined critical booking
            if r.status == "USER_DECLINED" and r.urgency == "CRITICAL":
                anomalies.append(self._anomaly(
                    "CRITICAL_ISSUE_USER_DECLINED",
                    r.id, r.vehicle_id,
                    f"User declined '{r.ml_result.prediction}' (CRITICAL urgency).",
                ))

            # Borderline confidence (exactly at threshold)
            if 0.90 <= r.ml_result.confidence < 0.92 and r.ml_result.prediction != "normal":
                anomalies.append(self._anomaly(
                    "BORDERLINE_CONFIDENCE",
                    r.id, r.vehicle_id,
                    f"Confidence {r.ml_result.confidence * 100:.1f}% is barely above threshold.",
                    extra={"confidence": round(r.ml_result.confidence * 100, 1)},
                ))

            # High confidence but prediction is 'normal' — possible sensor glitch
            if r.ml_result.prediction == "normal" and r.ml_result.confidence > 0.99:
                anomalies.append(self._anomaly(
                    "SUSPICIOUS_HIGH_CONF_NORMAL",
                    r.id, r.vehicle_id,
                    "Normal prediction with >99% confidence while pipeline was triggered.",
                ))

        # Vehicle stuck in active pipeline for more than one booking cycle
        for vid in list(ACTIVE_PIPELINES):
            vehicle_bookings = [
                b for b in bookings
                if b.vehicle_id == vid and b.status not in ("COMPLETED", "CANCELLED")
            ]
            if len(vehicle_bookings) > 1:
                anomalies.append(self._anomaly(
                    "MULTIPLE_ACTIVE_BOOKINGS",
                    vid, vid,
                    f"Vehicle {vid} has {len(vehicle_bookings)} non-terminal bookings simultaneously.",
                ))

        return anomalies

    def check_and_log(self) -> List[Dict[str, Any]]:
        """Detect anomalies, print them, and fire non-blocking Supabase logs."""
        anomalies = self.detect_anomalies()
        try:
            from db.supabase_client import log_agent_action
            for a in anomalies:
                log_agent_action(
                    "AnomalyAgent",
                    a["type"],
                    a.get("request_id", ""),
                    a,
                )
        except Exception:
            pass
        for a in anomalies:
            print(f"[ANOMALY] ⚠  {a['type']} — {a['detail']}")
        return anomalies

    # ── internal ──────────────────────────────────────────────────────────

    @staticmethod
    def _anomaly(
        atype: str,
        request_id: str,
        vehicle_id: str,
        detail: str,
        extra: dict = None,
    ) -> Dict[str, Any]:
        base = {
            "type":       atype,
            "request_id": request_id,
            "vehicle_id": vehicle_id,
            "detail":     detail,
            "timestamp":  datetime.now().isoformat(),
        }
        if extra:
            base.update(extra)
        return base

