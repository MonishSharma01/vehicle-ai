"""
telemetry_monitor.py — Background loop that continuously checks vehicle telemetry
                        and calls the existing ML model. Does NOT modify ML logic.
"""
import asyncio
import random

from models.models import DB, ACTIVE_PIPELINES
from agents.prediction_agent import PredictionAgent

_agent = PredictionAgent()

MONITOR_INTERVAL = 5          # seconds between full sweeps
CONFIDENCE_THRESHOLD = 0.90   # minimum confidence to trigger pipeline

# Force-issue override: vehicle_id → issue_type
# Set via POST /simulate/force-issue/{vehicle_id}/{issue_type}
FORCE_ISSUE: dict = {}


def _generate_telemetry(vehicle) -> dict:
    forced = FORCE_ISSUE.get(vehicle.id)

    if forced == "battery_failure":
        # battery_voltage 9.0–9.6 → consistently >99% confidence
        return {
            "engine_temp":      random.uniform(88.0,  95.0),
            "battery_voltage":  random.uniform(9.0,   9.6),
            "oil_life":         random.uniform(55.0,  75.0),
            "vibration":        random.uniform(1.5,   2.5),
            "mileage":          random.randint(40000, 80000),
        }
    elif forced == "engine_overheat":
        # engine_temp 130–145, vibration 6.5–8.0 → consistently 100% confidence
        return {
            "engine_temp":      random.uniform(130.0, 145.0),
            "battery_voltage":  random.uniform(12.0,  13.0),
            "oil_life":         random.uniform(45.0,  65.0),
            "vibration":        random.uniform(6.5,   8.0),
            "mileage":          random.randint(80000, 150000),
        }
    elif forced == "low_oil_life":
        # oil_life 3–8 → consistently 100% confidence
        return {
            "engine_temp":      random.uniform(90.0,  100.0),
            "battery_voltage":  random.uniform(12.2,  13.2),
            "oil_life":         random.uniform(3.0,   8.0),
            "vibration":        random.uniform(3.5,   5.0),
            "mileage":          random.randint(60000, 120000),
        }
    else:  # normal / random
        return {
            "engine_temp":      random.uniform(78.0,  95.0),
            "battery_voltage":  random.uniform(12.2,  13.2),
            "oil_life":         random.uniform(60.0,  95.0),
            "vibration":        random.uniform(0.5,   2.5),
            "mileage":          random.randint(10000, 50000),
        }


async def monitor_loop():
    from services.issue_analyzer import analyze   # late import — avoids circular

    print("[MONITOR] Continuous monitoring started. Interval: every 5 seconds.")
    while True:
        vehicles = [v for v in DB["vehicles"].values() if v.active]
        print(f"[MONITOR] Checking {len(vehicles)} vehicle(s)")

        for vehicle in vehicles:
            if vehicle.id in ACTIVE_PIPELINES:
                print(f"[MONITOR] {vehicle.id} already in pipeline — skipping")
                continue

            telemetry = _generate_telemetry(vehicle)

            # ── Call ML model (BLACK BOX — do not modify) ──────────────────
            result = _agent.predict_failure(telemetry)
            # ───────────────────────────────────────────────────────────────

            prediction = result["prediction"]
            confidence = result["confidence"]

            print(f"[MONITOR] {vehicle.id} ({vehicle.model}): {prediction} @ {confidence * 100:.1f}%")

            if confidence >= CONFIDENCE_THRESHOLD and prediction != "normal":
                print(f"[ML] Issue detected — {vehicle.id}: '{prediction}' confidence={confidence * 100:.1f}%")
                ACTIVE_PIPELINES.add(vehicle.id)
                FORCE_ISSUE.pop(vehicle.id, None)   # auto-clear so it doesn't fire again
                asyncio.create_task(analyze(vehicle, telemetry, result))

        await asyncio.sleep(MONITOR_INTERVAL)
