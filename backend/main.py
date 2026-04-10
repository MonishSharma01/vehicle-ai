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
from datetime import datetime
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.models import DB, ACTIVE_PIPELINES, seed_vehicles, seed_garages, reset_db
from agents.tracking_agent import FORCE_ISSUE


# ── Lifespan: seed data + start background monitor ──────────────────────────
def _schedule_next_demo(delay: float = 8.0):
    """Schedule the next demo cycle after `delay` seconds."""
    async def _trigger():
        await asyncio.sleep(delay)
        # Rotate through vehicles so each cycle uses a different one
        vehicles = ["V001", "V002", "V003"]
        issues   = ["battery_failure", "engine_overheating", "brake_wear"]
        from models.models import DB
        # Pick the vehicle whose last booking is COMPLETED (or default V001)
        vehicle_id = "V001"
        issue = "battery_failure"
        completed = [
            b for b in DB["bookings"].values() if b.status == "COMPLETED"
        ]
        if completed:
            last = max(completed, key=lambda b: b.created_at)
            idx = vehicles.index(last.vehicle_id) if last.vehicle_id in vehicles else -1
            vehicle_id = vehicles[(idx + 1) % len(vehicles)]
            issue = issues[(idx + 1) % len(issues)]
        FORCE_ISSUE[vehicle_id] = issue
        print(f"[DEMO] Auto-triggered {issue} on {vehicle_id} for demo.")
    asyncio.create_task(_trigger())

async def _auto_demo():
    """Auto-trigger battery_failure on V001 after 5s on every startup for demo."""
    await asyncio.sleep(5)
    FORCE_ISSUE["V001"] = "battery_failure"
    print("[DEMO] Auto-triggered battery_failure on V001 for demo.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_vehicles()
    seed_garages()
    print("[MAIN] Seeded vehicles and garages.")
    from agents.master_agent import MasterAgent
    task = asyncio.create_task(MasterAgent().start())
    demo_task = asyncio.create_task(_auto_demo())
    yield
    task.cancel()
    demo_task.cancel()
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


# ── Garage-specific dashboard endpoints ──────────────────────────────────────
# Rough INR cost per issue type (used for revenue calculation in stats)
ISSUE_COST_INR = {
    "battery_failure": 4000,
    "engine_overheat": 7500,
    "low_oil_life":    1500,
    "normal":          0,
}


@app.get("/garages/{garage_id}/stats")
def get_garage_stats(garage_id: str):
    if garage_id not in DB["garages"]:
        raise HTTPException(status_code=404, detail=f"Garage '{garage_id}' not found")
    garage = DB["garages"][garage_id]
    today = datetime.now().date()
    garage_bookings = [b for b in DB["bookings"].values() if b.garage_id == garage_id]
    todays = [b for b in garage_bookings if b.created_at.date() == today]
    completed = [b for b in garage_bookings if b.status == "COMPLETED"]
    revenue = sum(ISSUE_COST_INR.get(b.issue_type, 0) for b in completed)
    return {
        "todays_bookings": len(todays),
        "completed": len(completed),
        "revenue": revenue,
        "rating": garage.rating,
    }


@app.get("/garages/{garage_id}/bookings")
def get_garage_bookings(garage_id: str):
    if garage_id not in DB["garages"]:
        raise HTTPException(status_code=404, detail=f"Garage '{garage_id}' not found")
    garage_bookings = [b for b in DB["bookings"].values() if b.garage_id == garage_id]
    return [
        {
            "id": b.id,
            "vehicle_id": b.vehicle_id,
            "owner": DB["vehicles"][b.vehicle_id].owner_name if b.vehicle_id in DB["vehicles"] else "Unknown",
            "model": DB["vehicles"][b.vehicle_id].model if b.vehicle_id in DB["vehicles"] else "Unknown",
            "garage_id": b.garage_id,
            "issue": b.issue_type,
            "service": b.service,
            "cost": b.estimated_cost,
            "cost_inr": ISSUE_COST_INR.get(b.issue_type, 0),
            "urgency": b.urgency,
            "status": b.status,
            "created_at": b.created_at.isoformat(),
        }
        for b in garage_bookings
    ]


@app.get("/garages/{garage_id}/pending")
def get_pending_booking(garage_id: str):
    """Most recent actionable booking for this garage — PENDING_GARAGE (accept?) or CONFIRMED (start?)."""
    if garage_id not in DB["garages"]:
        raise HTTPException(status_code=404, detail=f"Garage '{garage_id}' not found")
    # Only show PENDING_GARAGE bookings — once user accepts it becomes IN_PROGRESS automatically
    candidates = [
        b for b in DB["bookings"].values()
        if b.garage_id == garage_id and b.status == "PENDING_GARAGE"
    ]
    if not candidates:
        return None
    latest = max(candidates, key=lambda b: b.created_at)
    vehicle = DB["vehicles"].get(latest.vehicle_id)
    action_label = "NEW BOOKING"
    return {
        "id": latest.id,
        "vehicle_id": latest.vehicle_id,
        "owner_name": vehicle.owner_name if vehicle else "Unknown",
        "model": vehicle.model if vehicle else "Unknown",
        "issue": latest.issue_type,
        "service": latest.service,
        "cost_inr": ISSUE_COST_INR.get(latest.issue_type, 0),
        "urgency": latest.urgency,
        "created_at": latest.created_at.isoformat(),
        "action_label": action_label,
        "booking_status": latest.status,
    }


@app.post("/bookings/{booking_id}/start")
def start_booking(booking_id: str):
    if booking_id not in DB["bookings"]:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")
    booking = DB["bookings"][booking_id]
    if booking.status == "PENDING_GARAGE":
        # Garage is accepting — fire the pipeline gate so user gets notified
        from models.models import PENDING_GARAGE_DECISIONS, GARAGE_DECISIONS
        GARAGE_DECISIONS[booking_id] = True
        if booking_id in PENDING_GARAGE_DECISIONS:
            PENDING_GARAGE_DECISIONS[booking_id].set()
        return {"message": f"Booking {booking_id} accepted by garage — notifying user"}
    else:
        booking.status = "IN_PROGRESS"
        return {"message": f"Booking {booking_id} marked as IN_PROGRESS"}


@app.post("/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str):
    if booking_id not in DB["bookings"]:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")
    DB["bookings"][booking_id].status = "COMPLETED"
    # Auto-restart demo pipeline 5s after completion
    _schedule_next_demo(delay=5.0)
    print("[DEMO] Booking completed — next demo cycle in 5s.")
    return {"message": f"Booking {booking_id} marked as COMPLETED"}


@app.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: str):
    if booking_id not in DB["bookings"]:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")
    booking = DB["bookings"][booking_id]
    if booking.garage_id in DB["garages"]:
        DB["garages"][booking.garage_id].available_slots += 1
    booking.status = "CANCELLED"
    # Fire the garage decision gate so feedback_agent immediately chains to next garage
    from models.models import PENDING_GARAGE_DECISIONS, GARAGE_DECISIONS
    GARAGE_DECISIONS[booking_id] = False
    if booking_id in PENDING_GARAGE_DECISIONS:
        PENDING_GARAGE_DECISIONS[booking_id].set()
    return {"message": f"Booking {booking_id} cancelled"}


# ── User-app endpoints ────────────────────────────────────────────────────────

@app.get("/user/{vehicle_id}/status")
def get_user_status(vehicle_id: str):
    """Full current state for a vehicle — polled by the user-app every 3 s."""
    if vehicle_id not in DB["vehicles"]:
        raise HTTPException(status_code=404, detail=f"Vehicle '{vehicle_id}' not found")

    vehicle = DB["vehicles"][vehicle_id]

    # Latest service request for this vehicle
    vehicle_requests = sorted(
        [r for r in DB["service_requests"].values() if r.vehicle_id == vehicle_id],
        key=lambda r: r.created_at,
        reverse=True,
    )
    latest_req = vehicle_requests[0] if vehicle_requests else None

    # Latest booking for this vehicle
    vehicle_bookings = sorted(
        [b for b in DB["bookings"].values() if b.vehicle_id == vehicle_id],
        key=lambda b: b.created_at,
        reverse=True,
    )
    latest_booking = vehicle_bookings[0] if vehicle_bookings else None

    # Build request payload
    request_data = None
    if latest_req:
        offered_garage = None
        if latest_req.offered_garage_id and latest_req.offered_garage_id in DB["garages"]:
            g = DB["garages"][latest_req.offered_garage_id]
            offered_garage = {
                "id": g.id,
                "name": g.name,
                "address": g.address,
                "rating": g.rating,
                "cost_inr": ISSUE_COST_INR.get(latest_req.ml_result.prediction, 0),
            }
        request_data = {
            "id": latest_req.id,
            "status": latest_req.status,
            "issue": latest_req.ml_result.prediction,
            "confidence": round(latest_req.ml_result.confidence * 100, 1),
            "urgency": latest_req.urgency,
            "offered_garage": offered_garage,
        }

    # Build booking payload — only expose to user when they're relevant
    booking_data = None
    if latest_booking and latest_booking.status in ("CONFIRMED", "IN_PROGRESS", "COMPLETED"):
        garage_name = "Unknown"
        if latest_booking.garage_id in DB["garages"]:
            garage_name = DB["garages"][latest_booking.garage_id].name
        booking_data = {
            "id": latest_booking.id,
            "status": latest_booking.status,
            "service": latest_booking.service,
            "cost_inr": ISSUE_COST_INR.get(latest_booking.issue_type, 0),
            "garage_name": garage_name,
            "urgency": latest_booking.urgency,
        }

    return {
        "vehicle": {
            "id": vehicle.id,
            "owner": vehicle.owner_name,
            "model": vehicle.model,
            "phone": vehicle.owner_phone,
        },
        "in_pipeline": vehicle_id in ACTIVE_PIPELINES,
        "request": request_data,
        "booking": booking_data,
    }


@app.post("/requests/{request_id}/user-accept")
def user_accept_request(request_id: str):
    """Called by user-app when user taps Accept Service."""
    from models.models import PENDING_USER_DECISIONS, USER_DECISIONS
    if request_id not in DB["service_requests"]:
        raise HTTPException(status_code=404, detail=f"Request '{request_id}' not found")
    req = DB["service_requests"][request_id]
    if req.status != "AWAITING_USER":
        raise HTTPException(status_code=400, detail=f"Request not awaiting decision (status: {req.status})")
    USER_DECISIONS[request_id] = True
    if request_id in PENDING_USER_DECISIONS:
        PENDING_USER_DECISIONS[request_id].set()
    return {"message": "Accepted — booking will be confirmed shortly"}


@app.post("/requests/{request_id}/user-decline")
def user_decline_request(request_id: str):
    """Called by user-app when user taps Reject."""
    from models.models import PENDING_USER_DECISIONS, USER_DECISIONS
    if request_id not in DB["service_requests"]:
        raise HTTPException(status_code=404, detail=f"Request '{request_id}' not found")
    req = DB["service_requests"][request_id]
    if req.status != "AWAITING_USER":
        raise HTTPException(status_code=400, detail=f"Request not awaiting decision (status: {req.status})")
    USER_DECISIONS[request_id] = False
    if request_id in PENDING_USER_DECISIONS:
        PENDING_USER_DECISIONS[request_id].set()
    return {"message": "Declined"}


@app.post("/requests/{request_id}/rebook")
def rebook_request(request_id: str):
    """Rebook after user declined — directly creates an IN_PROGRESS booking with same garage."""
    from services.booking_service import create_booking_sync
    if request_id not in DB["service_requests"]:
        raise HTTPException(status_code=404, detail=f"Request '{request_id}' not found")
    req = DB["service_requests"][request_id]
    if req.status not in ("USER_DECLINED",):
        raise HTTPException(status_code=400, detail=f"Can only rebook a declined request (status: {req.status})")
    garage_id = req.offered_garage_id
    if not garage_id or garage_id not in DB["garages"]:
        raise HTTPException(status_code=400, detail="No garage associated with this request")
    vehicle = DB["vehicles"].get(req.vehicle_id)
    garage  = DB["garages"][garage_id]
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    from models.models import SERVICE_DETAILS, ACTIVE_PIPELINES
    svc = SERVICE_DETAILS.get(req.ml_result.prediction, {})
    booking = create_booking_sync(vehicle, garage, req)
    booking.status = "IN_PROGRESS"
    req.status     = "BOOKED"
    req.booking_id = booking.id
    ACTIVE_PIPELINES.discard(vehicle.id)
    print(f"[REBOOK] ✅ {vehicle.owner_name} reconsidered — booking {booking.id} IN_PROGRESS at {garage.name}")
    return {"message": "Rebooked successfully", "booking_id": booking.id}


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=_BACKEND_DIR)

