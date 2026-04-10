"""
priority_agent.py  —  Agent 3: Maintenance Priority Agent

Accepts the output of the Failure Prediction Agent (Agent 2) and returns:
  - risk_score  : float 0–100
  - priority    : "HIGH" | "MEDIUM" | "LOW" | "NONE"
  - action      : human-readable recommended action
  - urgency_hours: suggested response window in hours

No ML is used here — pure rule-based logic with severity weights and thresholds.

Usage:
    from backend.agents.priority_agent import PriorityAgent

    result = PriorityAgent.evaluate(
        predicted_issue="engine_overheat",
        probability=0.91,
        telemetry={
            "engine_temp": 128.0,
            "battery_voltage": 12.3,
            "oil_life": 45.0,
            "vibration": 7.2,
            "mileage": 120_000,
        }
    )
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Base severity weight per issue type (0–10 scale)
SEVERITY_WEIGHTS: Dict[str, float] = {
    "engine_overheat": 9.5,
    "battery_failure": 8.0,
    "low_oil_life":    6.0,
    "normal":          0.0,
}

# Telemetry amplifiers: if a sensor reading crosses a threshold, the risk
# score is multiplied by the given factor (stacks additively above 1.0).
# Format: (feature, comparison, threshold, amplifier_delta)
AMPLIFIERS = [
    ("engine_temp",      ">",  120.0, 0.15),   # engine critically hot
    ("engine_temp",      ">",  110.0, 0.08),   # engine moderately hot
    ("battery_voltage",  "<",  10.5,  0.12),   # critically low voltage
    ("battery_voltage",  "<",  11.5,  0.06),   # low voltage
    ("oil_life",         "<",    5.0, 0.12),   # near-zero oil
    ("oil_life",         "<",   10.0, 0.06),   # very low oil
    ("vibration",        ">",    7.0, 0.10),   # severe vibration
    ("vibration",        ">",    5.0, 0.05),   # elevated vibration
    ("mileage",          ">",  200_000, 0.08), # high-mileage vehicle
    ("mileage",          ">",  150_000, 0.04),
]

# Priority thresholds (risk_score out of 100)
PRIORITY_THRESHOLDS = {
    "HIGH":   70,
    "MEDIUM": 40,
    "LOW":    10,
    # below LOW → NONE (true normal)
}

# Recommended actions per priority × issue
ACTIONS: Dict[str, Dict[str, str]] = {
    "HIGH": {
        "engine_overheat": "Stop vehicle immediately. Tow to garage for emergency engine inspection.",
        "battery_failure": "Do not start vehicle. Schedule emergency battery replacement today.",
        "low_oil_life":    "Stop driving. Add emergency oil and book immediate service.",
        "normal":          "Routine check recommended despite normal readings.",
    },
    "MEDIUM": {
        "engine_overheat": "Reduce driving load. Book engine cooling system service within 24 hours.",
        "battery_failure": "Limit short trips. Book battery test and replacement within 48 hours.",
        "low_oil_life":    "Avoid long trips. Schedule oil change within 48 hours.",
        "normal":          "Monitor vehicle. Schedule next routine service soon.",
    },
    "LOW": {
        "engine_overheat": "Monitor engine temperature. Book a general inspection this week.",
        "battery_failure": "Monitor battery health. Book a diagnostic check this week.",
        "low_oil_life":    "Oil change due soon. Book within the week.",
        "normal":          "Vehicle is healthy. Standard maintenance schedule applies.",
    },
    "NONE": {
        "normal":          "No action required. Vehicle is operating normally.",
        "engine_overheat": "No immediate action. Continue monitoring.",
        "battery_failure": "No immediate action. Continue monitoring.",
        "low_oil_life":    "No immediate action. Continue monitoring.",
    },
}

# Suggested response windows (hours) per priority
URGENCY_HOURS: Dict[str, int] = {
    "HIGH":   2,
    "MEDIUM": 24,
    "LOW":    168,   # 1 week
    "NONE":   0,
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _apply_amplifiers(telemetry: Dict[str, float]) -> float:
    """Return total amplifier delta based on live telemetry readings."""
    total_delta = 0.0
    for feature, op, threshold, delta in AMPLIFIERS:
        value = telemetry.get(feature)
        if value is None:
            continue
        if op == ">" and value > threshold:
            total_delta += delta
        elif op == "<" and value < threshold:
            total_delta += delta
    return total_delta


# ---------------------------------------------------------------------------
# Main agent
# ---------------------------------------------------------------------------

@dataclass
class PriorityResult:
    predicted_issue: str
    probability:     float
    risk_score:      float          # 0–100
    priority:        str            # HIGH | MEDIUM | LOW | NONE
    action:          str
    urgency_hours:   int


class PriorityAgent:
    """
    Priority calculation agent + garage rejection notifier.
    Call PriorityAgent.evaluate(...) for risk scoring.
    Call await PriorityAgent().notify_garage_of_rejection(...) in the booking pipeline.
    """

    async def notify_garage_of_rejection(self, vehicle, garage, request):
        import asyncio
        print(f"[REJECT] Notifying {garage.name} that user declined")
        print(f"         Request : {request.id} | Issue: {request.ml_result.prediction}")
        print(f"         Message : '{vehicle.owner_name}' declined your service offer")
        print(f"[REJECT] Slot restored for {garage.name} (slots: {garage.available_slots} → {garage.available_slots + 1})")
        garage.available_slots += 1
        await asyncio.sleep(0)

    @staticmethod
    def evaluate(
        predicted_issue: str,
        probability: float,
        telemetry: Dict[str, float] | None = None,
    ) -> PriorityResult:
        """
        Calculate maintenance priority from ML output + live telemetry.

        Args:
            predicted_issue : label returned by the ML model
            probability     : confidence score (0.0 – 1.0)
            telemetry       : dict of live sensor readings (optional but recommended)

        Returns:
            PriorityResult dataclass
        """
        if telemetry is None:
            telemetry = {}

        issue = predicted_issue.lower().strip()

        # 1. Base risk = severity_weight × probability → scale to 0–100
        severity = SEVERITY_WEIGHTS.get(issue, 0.0)
        base_risk = (severity / 10.0) * probability * 100.0

        # 2. Telemetry amplification
        amp_delta = _apply_amplifiers(telemetry)
        amplified_risk = base_risk * (1.0 + amp_delta)

        # 3. Clamp to [0, 100]
        risk_score = round(min(max(amplified_risk, 0.0), 100.0), 2)

        # 4. Assign priority
        if risk_score >= PRIORITY_THRESHOLDS["HIGH"]:
            priority = "HIGH"
        elif risk_score >= PRIORITY_THRESHOLDS["MEDIUM"]:
            priority = "MEDIUM"
        elif risk_score >= PRIORITY_THRESHOLDS["LOW"]:
            priority = "LOW"
        else:
            priority = "NONE"

        # 5. Resolve action
        action = ACTIONS.get(priority, {}).get(issue, "Monitor vehicle and contact a mechanic.")
        urgency = URGENCY_HOURS[priority]

        return PriorityResult(
            predicted_issue=issue,
            probability=round(probability, 4),
            risk_score=risk_score,
            priority=priority,
            action=action,
            urgency_hours=urgency,
        )


# ---------------------------------------------------------------------------
# Quick smoke-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    test_cases = [
        ("normal",          0.99, {"engine_temp": 88,  "battery_voltage": 12.5, "oil_life": 75, "vibration": 1.5, "mileage": 45_000}),
        ("battery_failure", 0.95, {"engine_temp": 91,  "battery_voltage": 10.2, "oil_life": 60, "vibration": 2.0, "mileage": 80_000}),
        ("engine_overheat", 0.91, {"engine_temp": 128, "battery_voltage": 12.3, "oil_life": 45, "vibration": 7.2, "mileage": 120_000}),
        ("low_oil_life",    0.87, {"engine_temp": 93,  "battery_voltage": 12.4, "oil_life": 5,  "vibration": 4.0, "mileage": 95_000}),
        ("battery_failure", 0.52, {"engine_temp": 89,  "battery_voltage": 11.3, "oil_life": 55, "vibration": 1.8, "mileage": 60_000}),
    ]

    print(f"\n{'='*72}")
    print(f"{'PRIORITY AGENT — SMOKE TEST':^72}")
    print(f"{'='*72}")

    for issue, prob, telem in test_cases:
        r = PriorityAgent.evaluate(issue, prob, telem)
        print(f"\n  Issue      : {r.predicted_issue}  (prob={r.probability})")
        print(f"  Risk Score : {r.risk_score}/100")
        print(f"  Priority   : {r.priority}  (respond within {r.urgency_hours}h)")
        print(f"  Action     : {r.action}")

    print(f"\n{'='*72}\n")
