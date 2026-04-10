"""
TrackingAgent — Background monitoring loop.
Generates telemetry every 5s, calls ML prediction agent (black box), triggers pipeline.
"""
import asyncio
import random

from models.models import DB, ACTIVE_PIPELINES
from agents.prediction_agent import PredictionAgent

MONITOR_INTERVAL = 5
CONFIDENCE_THRESHOLD = 0.90
FORCE_ISSUE: dict = {}   # set via POST /simulate/force-issue/{vehicle_id}/{issue_type}

_prediction_agent = PredictionAgent()


class TrackingAgent:
    def _generate_telemetry(self, vehicle) -> dict:
        forced = FORCE_ISSUE.get(vehicle.id)
        if forced == "battery_failure":
            return {"engine_temp": random.uniform(88.0, 95.0), "battery_voltage": random.uniform(9.0, 9.6),
                    "oil_life": random.uniform(55.0, 75.0), "vibration": random.uniform(1.5, 2.5),
                    "mileage": random.randint(40000, 80000)}
        elif forced == "engine_overheat":
            return {"engine_temp": random.uniform(130.0, 145.0), "battery_voltage": random.uniform(12.0, 13.0),
                    "oil_life": random.uniform(45.0, 65.0), "vibration": random.uniform(6.5, 8.0),
                    "mileage": random.randint(80000, 150000)}
        elif forced == "low_oil_life":
            return {"engine_temp": random.uniform(90.0, 100.0), "battery_voltage": random.uniform(12.2, 13.2),
                    "oil_life": random.uniform(3.0, 8.0), "vibration": random.uniform(3.5, 5.0),
                    "mileage": random.randint(60000, 120000)}
        else:
            return {"engine_temp": random.uniform(78.0, 95.0), "battery_voltage": random.uniform(12.2, 13.2),
                    "oil_life": random.uniform(60.0, 95.0), "vibration": random.uniform(0.5, 2.5),
                    "mileage": random.randint(10000, 50000)}

    async def monitor_loop(self):
        from agents.decision_agent import DecisionAgent
        import models.models as _m
        decision_agent = DecisionAgent()

        print("[MONITOR] Continuous monitoring started. Interval: every 5 seconds.")
        while True:
            # ── Check if any agent flagged a demo restart ──────────────────
            if _m.PENDING_DEMO_RESTART:
                _m.PENDING_DEMO_RESTART = False
                await asyncio.sleep(5)
                from main import _schedule_next_demo
                _schedule_next_demo(delay=0.1)
                print("[DEMO] Consumed PENDING_DEMO_RESTART — next cycle triggered.")

            vehicles = [v for v in DB["vehicles"].values() if v.active]
            print(f"[MONITOR] Checking {len(vehicles)} vehicle(s)")

            for vehicle in vehicles:
                if vehicle.id in ACTIVE_PIPELINES:
                    print(f"[MONITOR] {vehicle.id} already in pipeline — skipping")
                    continue

                telemetry = self._generate_telemetry(vehicle)

                # ── Call ML model (BLACK BOX — do not modify) ──────────────
                result = _prediction_agent.predict_failure(telemetry)
                # ───────────────────────────────────────────────────────────

                prediction = result["prediction"]
                confidence = result["confidence"]
                print(f"[MONITOR] {vehicle.id} ({vehicle.model}): {prediction} @ {confidence * 100:.1f}%")

                if confidence >= CONFIDENCE_THRESHOLD and prediction != "normal":
                    print(f"[ML] Issue detected — {vehicle.id}: '{prediction}' confidence={confidence * 100:.1f}%")
                    ACTIVE_PIPELINES.add(vehicle.id)
                    FORCE_ISSUE.pop(vehicle.id, None)
                    asyncio.create_task(decision_agent.analyze(vehicle, telemetry, result))

            await asyncio.sleep(MONITOR_INTERVAL)
