"""
main.py — FastAPI entry point. Starts continuous monitoring and exposes REST endpoints.

Run from D:\vehicle-ai\backend:
    python -m uvicorn main:app --reload --port 8000

Or from anywhere:
    python backend/main.py
"""
import sys
import os

# Ensure backend/ is always on sys.path regardless of CWD
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import asyncio
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.models import DB, ACTIVE_PIPELINES, seed_vehicles, seed_garages, reset_db
from services.telemetry_monitor import monitor_loop, FORCE_ISSUE


# ── Lifespan: seed data + start background monitor ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_vehicles()
    seed_garages()
    print("[MAIN] Seeded vehicles and garages.")
    task = asyncio.create_task(monitor_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("[MAIN] Monitor loop stopped.")


app = FastAPI(
    title="Vehicle AI — Continuous Monitoring & Garage Booking",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "vehicle-ai-backend"}


# ── Status summary ───────────────────────────────────────────────────────────
@app.get("/status")
def status():
    return {
        "vehicles":         len(DB["vehicles"]),
        "garages":          len(DB["garages"]),
        "service_requests": len(DB["service_requests"]),
        "bookings":         len(DB["bookings"]),
        "active_pipelines": list(ACTIVE_PIPELINES),
    }


# ── Vehicles ─────────────────────────────────────────────────────────────────
@app.get("/vehicles")
def list_vehicles():
    return [
        {
            "id": v.id,
            "owner": v.owner_name,
            "phone": v.owner_phone,
            "model": v.model,
            "active": v.active,
            "in_pipeline": v.id in ACTIVE_PIPELINES,
        }
        for v in DB["vehicles"].values()
    ]


# ── Garages ──────────────────────────────────────────────────────────────────
@app.get("/garages")
def list_garages():
    return [
        {
            "id": g.id,
            "name": g.name,
            "address": g.address,
            "phone": g.phone,
            "rating": g.rating,
            "specializations": g.specializations,
            "available_slots": g.available_slots,
        }
        for g in DB["garages"].values()
    ]


# ── Service Requests ─────────────────────────────────────────────────────────
@app.get("/requests")
def list_requests():
    return [
        {
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "issue": r.ml_result.prediction,
            "confidence": round(r.ml_result.confidence * 100, 1),
            "urgency": r.urgency,
            "status": r.status,
            "garages_tried": r.garages_tried,
            "created_at": r.created_at.isoformat(),
        }
        for r in DB["service_requests"].values()
    ]


# ── Bookings ─────────────────────────────────────────────────────────────────
@app.get("/bookings")
def list_bookings():
    return [
        {
            "id": b.id,
            "vehicle_id": b.vehicle_id,
            "garage_id": b.garage_id,
            "garage_name": DB["garages"].get(b.garage_id, {}).name if b.garage_id in DB["garages"] else "unknown",
            "issue": b.issue_type,
            "service": b.service,
            "cost": b.estimated_cost,
            "urgency": b.urgency,
            "status": b.status,
            "created_at": b.created_at.isoformat(),
        }
        for b in DB["bookings"].values()
    ]


# ── Simulate: force an issue on a specific vehicle ───────────────────────────
VALID_ISSUES = {"battery_failure", "engine_overheat", "low_oil_life", "normal"}

@app.post("/simulate/force-issue/{vehicle_id}/{issue_type}")
def force_issue(vehicle_id: str, issue_type: str):
    if vehicle_id not in DB["vehicles"]:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")
    if issue_type not in VALID_ISSUES:
        raise HTTPException(status_code=400, detail=f"issue_type must be one of {VALID_ISSUES}")
    FORCE_ISSUE[vehicle_id] = issue_type
    return {"message": f"Next telemetry for {vehicle_id} will simulate '{issue_type}'"}


@app.delete("/simulate/force-issue/{vehicle_id}")
def clear_force_issue(vehicle_id: str):
    FORCE_ISSUE.pop(vehicle_id, None)
    return {"message": f"Force issue cleared for {vehicle_id}"}


# ── Reset ─────────────────────────────────────────────────────────────────────
@app.post("/simulate/reset")
def reset():
    FORCE_ISSUE.clear()
    reset_db()
    return {"message": "In-memory DB reset. Vehicles and garages re-seeded."}


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=_BACKEND_DIR)

