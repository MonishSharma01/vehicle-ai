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
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Set

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models.models import DB, ACTIVE_PIPELINES, seed_vehicles, seed_garages, reset_db
from agents.tracking_agent import FORCE_ISSUE

# ── New feature routers ───────────────────────────────────────────────────────
try:
    from api.user_routes import router as user_router
    from api.garage_routes import router as garage_router
    from api.admin_routes import router as admin_router
    _NEW_ROUTERS_AVAILABLE = True
except ImportError as _e:
    print(f"[MAIN] New routers not loaded: {_e}")
    _NEW_ROUTERS_AVAILABLE = False


# ── WebSocket connection manager ─────────────────────────────────────────────
class ConnectionManager:
    """Manages WebSocket connections for real-time push to frontends."""

    def __init__(self):
        self._vehicle_conns: dict[str, Set[WebSocket]] = {}   # vehicle_id → set of sockets
        self._garage_conns:  dict[str, Set[WebSocket]] = {}   # garage_id  → set of sockets
        self._admin_conns:   Set[WebSocket] = set()           # admin panel sockets

    async def connect_vehicle(self, ws: WebSocket, vehicle_id: str) -> None:
        await ws.accept()
        self._vehicle_conns.setdefault(vehicle_id, set()).add(ws)

    async def connect_garage(self, ws: WebSocket, garage_id: str) -> None:
        await ws.accept()
        self._garage_conns.setdefault(garage_id, set()).add(ws)

    async def connect_admin(self, ws: WebSocket) -> None:
        await ws.accept()
        self._admin_conns.add(ws)

    def disconnect_vehicle(self, ws: WebSocket, vehicle_id: str) -> None:
        self._vehicle_conns.get(vehicle_id, set()).discard(ws)

    def disconnect_garage(self, ws: WebSocket, garage_id: str) -> None:
        self._garage_conns.get(garage_id, set()).discard(ws)

    def disconnect_admin(self, ws: WebSocket) -> None:
        self._admin_conns.discard(ws)

    async def push_to_vehicle(self, vehicle_id: str, payload: dict) -> None:
        dead = set()
        for ws in list(self._vehicle_conns.get(vehicle_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self._vehicle_conns.get(vehicle_id, set()).difference_update(dead)

    async def push_to_garage(self, garage_id: str, payload: dict) -> None:
        dead = set()
        for ws in list(self._garage_conns.get(garage_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self._garage_conns.get(garage_id, set()).difference_update(dead)

    async def broadcast_admin(self, payload: dict) -> None:
        dead = set()
        for ws in list(self._admin_conns):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self._admin_conns.difference_update(dead)


ws_manager = ConnectionManager()


# ── Lifespan: seed data + start background monitor ──────────────────────────
def _schedule_next_demo(delay: float = 8.0):
    """
    Always triggers on V001 so user-app (V001) and garage dashboard
    (G001 — closest to V001) stay live together on every cycle.
    Rotates through the 3 valid issue types for variety.
    """
    _DEMO_ISSUES = ["battery_failure", "engine_overheat", "low_oil_life"]

    async def _trigger():
        await asyncio.sleep(delay)
        from models.models import DB
        completed_v001 = [
            b for b in DB["bookings"].values()
            if b.vehicle_id == "V001" and b.status == "COMPLETED"
        ]
        issue = _DEMO_ISSUES[len(completed_v001) % len(_DEMO_ISSUES)]
        FORCE_ISSUE["V001"] = issue
        print(f"[DEMO] Auto-triggered '{issue}' on V001 (cycle #{len(completed_v001) + 1}).")

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
    # ── Seed vehicles & garages to Supabase (non-blocking) ──────────────
    try:
        from db.supabase_client import sync_vehicle, sync_garage
        for v in DB["vehicles"].values():
            sync_vehicle(v)
        for g in DB["garages"].values():
            sync_garage(g)
        print("[MAIN] Supabase seed queued.")
    except Exception as exc:
        print(f"[MAIN] Supabase seed skipped: {exc}")
    # ────────────────────────────────────────────────────────────────────
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
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include new feature routers ───────────────────────────────────────────────
if _NEW_ROUTERS_AVAILABLE:
    app.include_router(user_router)
    app.include_router(garage_router)
    app.include_router(admin_router)
    print("[MAIN] ✅ Auth + Admin routers registered.")


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "service": "vehicle-ai-backend", "version": "2.0.0"}


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
    booking = create_booking_sync(vehicle, garage, req)
    booking.status = "IN_PROGRESS"
    req.status     = "BOOKED"
    req.booking_id = booking.id
    ACTIVE_PIPELINES.discard(vehicle.id)
    print(f"[REBOOK] ✅ {vehicle.owner_name} reconsidered — booking {booking.id} IN_PROGRESS at {garage.name}")
    return {"message": "Rebooked successfully", "booking_id": booking.id}


# ── Feedback ──────────────────────────────────────────────────────────────────

class FeedbackPayload(BaseModel):
    rating:  int   = Field(..., ge=1, le=5, description="Star rating 1–5")
    comment: str   = Field("", max_length=500)


@app.post("/bookings/{booking_id}/feedback")
def submit_feedback(booking_id: str, body: FeedbackPayload):
    """Submit user feedback for a completed booking."""
    if booking_id not in DB["bookings"]:
        raise HTTPException(status_code=404, detail=f"Booking '{booking_id}' not found")
    booking = DB["bookings"][booking_id]
    # Allow feedback once booking is no longer PENDING_GARAGE
    if booking.status == "PENDING_GARAGE":
        raise HTTPException(status_code=400, detail="Booking not yet in progress")

    # Store in in-memory DB feedback store
    DB.setdefault("feedback", {})[booking_id] = {
        "booking_id": booking_id,
        "vehicle_id": booking.vehicle_id,
        "rating":     body.rating,
        "comment":    body.comment,
        "submitted_at": datetime.now().isoformat(),
    }

    # Persist to Supabase (non-blocking)
    try:
        from db.supabase_client import save_feedback, log_agent_action
        save_feedback(booking_id, booking.vehicle_id, body.rating, body.comment)
        log_agent_action("FeedbackAgent", "FEEDBACK_SUBMITTED", booking_id, {
            "rating": body.rating,
        })
    except Exception:
        pass

    print(f"[FEEDBACK] ⭐ {body.rating}/5 for booking {booking_id} — {body.comment!r}")
    return {"message": "Feedback recorded", "rating": body.rating}


@app.get("/bookings/{booking_id}/feedback")
def get_feedback(booking_id: str):
    """Retrieve feedback for a booking."""
    fb = DB.get("feedback", {}).get(booking_id)
    if not fb:
        return None
    return fb


# ── Insights ──────────────────────────────────────────────────────────────────

@app.get("/insights")
def get_insights():
    """Generate and return fleet analytics snapshot."""
    from agents.insights_agent import InsightsAgent
    agent = InsightsAgent()
    result = agent.generate_and_persist()
    return result


# ── Anomalies ─────────────────────────────────────────────────────────────────

@app.get("/anomalies")
def get_anomalies():
    """Detect and return current anomalies in the system."""
    from agents.anomaly_agent import AnomalyAgent
    agent = AnomalyAgent()
    return agent.check_and_log()


# ── Pricing ───────────────────────────────────────────────────────────────────

@app.get("/pricing/{issue_type}")
def get_pricing(issue_type: str, urgency: str = "MEDIUM"):
    """Return pricing comparison across all garages for a given issue and urgency."""
    from agents.pricing_agent import PricingAgent
    valid_issues = {"battery_failure", "engine_overheat", "low_oil_life", "normal"}
    valid_urgencies = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    if issue_type not in valid_issues:
        raise HTTPException(status_code=400, detail=f"issue_type must be one of {valid_issues}")
    if urgency not in valid_urgencies:
        raise HTTPException(status_code=400, detail=f"urgency must be one of {valid_urgencies}")
    agent   = PricingAgent()
    garages = list(DB["garages"].values())
    return {
        "issue_type":      issue_type,
        "urgency":         urgency,
        "garage_pricing":  agent.compare_garages(garages, issue_type, urgency),
        "best_garage":     agent.get_best_garage(garages, issue_type, urgency),
    }


# ── WebSocket: User app real-time feed ───────────────────────────────────────

@app.websocket("/ws/vehicle/{vehicle_id}")
async def vehicle_ws(websocket: WebSocket, vehicle_id: str):
    """
    Real-time feed for the user-app.  
    On connect, immediately sends current status.  
    Polls every 3 s and pushes updates.
    """
    if vehicle_id not in DB["vehicles"]:
        await websocket.close(code=1008)
        return

    await ws_manager.connect_vehicle(websocket, vehicle_id)
    try:
        while True:
            # Build current state inline (mirrors GET /user/{vehicle_id}/status)
            vehicle = DB["vehicles"][vehicle_id]
            vehicle_requests = sorted(
                [r for r in DB["service_requests"].values() if r.vehicle_id == vehicle_id],
                key=lambda r: r.created_at, reverse=True,
            )
            latest_req = vehicle_requests[0] if vehicle_requests else None

            vehicle_bookings = sorted(
                [b for b in DB["bookings"].values() if b.vehicle_id == vehicle_id],
                key=lambda b: b.created_at, reverse=True,
            )
            latest_booking = vehicle_bookings[0] if vehicle_bookings else None

            request_data = None
            if latest_req and latest_req.status not in ("COMPLETED",):
                offered_garage = None
                if latest_req.offered_garage_id and latest_req.offered_garage_id in DB["garages"]:
                    g = DB["garages"][latest_req.offered_garage_id]
                    offered_garage = {
                        "id": g.id, "name": g.name, "address": g.address,
                        "rating": g.rating, "phone": g.phone,
                    }
                request_data = {
                    "id":            latest_req.id,
                    "status":        latest_req.status,
                    "issue":         latest_req.ml_result.prediction,
                    "confidence":    round(latest_req.ml_result.confidence * 100, 1),
                    "urgency":       latest_req.urgency,
                    "offered_garage": offered_garage,
                }

            booking_data = None
            if latest_booking and latest_booking.status in ("IN_PROGRESS", "COMPLETED"):
                garage_name = DB["garages"][latest_booking.garage_id].name \
                    if latest_booking.garage_id in DB["garages"] else "Unknown"
                booking_data = {
                    "id":          latest_booking.id,
                    "status":      latest_booking.status,
                    "service":     latest_booking.service,
                    "cost_inr":    ISSUE_COST_INR.get(latest_booking.issue_type, 0),
                    "garage_name": garage_name,
                    "urgency":     latest_booking.urgency,
                }

            await websocket.send_json({
                "event":       "status_update",
                "vehicle_id":  vehicle_id,
                "in_pipeline": vehicle_id in ACTIVE_PIPELINES,
                "request":     request_data,
                "booking":     booking_data,
                "timestamp":   datetime.now().isoformat(),
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        ws_manager.disconnect_vehicle(websocket, vehicle_id)


# ── WebSocket: Garage dashboard real-time feed ────────────────────────────────

@app.websocket("/ws/garage/{garage_id}")
async def garage_ws(websocket: WebSocket, garage_id: str):
    """
    Real-time feed for the garage dashboard.  
    Pushes new pending bookings every 5 s.
    """
    if garage_id not in DB["garages"]:
        await websocket.close(code=1008)
        return

    await ws_manager.connect_garage(websocket, garage_id)
    try:
        while True:
            candidates = [
                b for b in DB["bookings"].values()
                if b.garage_id == garage_id and b.status in ("PENDING_GARAGE", "IN_PROGRESS")
            ]
            payload_bookings = []
            for b in sorted(candidates, key=lambda x: x.created_at, reverse=True):
                vehicle = DB["vehicles"].get(b.vehicle_id)
                payload_bookings.append({
                    "id":         b.id,
                    "vehicle_id": b.vehicle_id,
                    "owner_name": vehicle.owner_name if vehicle else "Unknown",
                    "model":      vehicle.model      if vehicle else "Unknown",
                    "issue":      b.issue_type,
                    "service":    b.service,
                    "cost_inr":   ISSUE_COST_INR.get(b.issue_type, 0),
                    "urgency":    b.urgency,
                    "status":     b.status,
                    "created_at": b.created_at.isoformat(),
                })
            await websocket.send_json({
                "event":    "bookings_update",
                "garage_id": garage_id,
                "bookings": payload_bookings,
                "timestamp": datetime.now().isoformat(),
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        ws_manager.disconnect_garage(websocket, garage_id)


# ── WebSocket: Admin panel real-time feed ────────────────────────────────────

@app.websocket("/ws/admin")
async def admin_ws(websocket: WebSocket):
    """Broadcasts fleet overview to the admin panel every 5 s."""
    await ws_manager.connect_admin(websocket)
    try:
        while True:
            bookings = list(DB["bookings"].values())
            await websocket.send_json({
                "event":            "fleet_update",
                "vehicles":         len(DB["vehicles"]),
                "garages":          len(DB["garages"]),
                "service_requests": len(DB["service_requests"]),
                "bookings":         len(bookings),
                "active_pipelines": list(ACTIVE_PIPELINES),
                "pending_garage":   sum(1 for b in bookings if b.status == "PENDING_GARAGE"),
                "in_progress":      sum(1 for b in bookings if b.status == "IN_PROGRESS"),
                "completed":        sum(1 for b in bookings if b.status == "COMPLETED"),
                "timestamp":        datetime.now().isoformat(),
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        ws_manager.disconnect_admin(websocket)


# ── Admin: AI Garage Routing visualisation ───────────────────────────────────
@app.get("/admin/garage-routing")
def admin_garage_routing():
    """
    For every active service request (not yet COMPLETED/CANCELLED) returns
    the AI-ranked garage list so the admin panel can visualise routing decisions.
    """
    from services.garage_ranker import rank_garages
    import math

    def _haversine(lat1, lon1, lat2, lon2):
        R = 6371.0
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlam = math.radians(lon2 - lon1)
        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
        return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a)), 1)

    active_statuses = {"PENDING", "PENDING_GARAGE", "AWAITING_USER", "BOOKED", "IN_PROGRESS"}
    results = []

    for req in DB["service_requests"].values():
        if req.status not in active_statuses:
            continue
        vehicle = DB["vehicles"].get(req.vehicle_id)
        if not vehicle:
            continue

        ranked = rank_garages(vehicle, req.ml_result.prediction)
        # Include ALL garages (even full) for display purposes
        all_garages = list(DB["garages"].values())
        from services.garage_ranker import _score
        all_scored = sorted(
            [(g, _score(g, vehicle, req.ml_result.prediction)) for g in all_garages],
            key=lambda x: x[1], reverse=True
        )

        # Find the current active booking for this request
        booking = None
        if req.booking_id and req.booking_id in DB["bookings"]:
            booking = DB["bookings"][req.booking_id]
        else:
            # fall back: find by request_id
            for b in DB["bookings"].values():
                if b.request_id == req.id:
                    booking = b
                    break

        garage_list = []
        for rank_idx, (g, score) in enumerate(all_scored, 1):
            tried   = g.id in req.garages_tried
            current = booking is not None and booking.garage_id == g.id
            dist_km = _haversine(vehicle.lat, vehicle.lon, g.lat, g.lon)
            garage_list.append({
                "rank":        rank_idx,
                "id":          g.id,
                "name":        g.name,
                "address":     g.address,
                "rating":      g.rating,
                "slots":       g.available_slots,
                "distance_km": dist_km,
                "score":       round(score, 3),
                "specializations": g.specializations,
                "tried":       tried,
                "current":     current,
                "rejected":    tried and not current and (
                    booking is None or booking.garage_id != g.id
                ),
            })

        results.append({
            "request_id":  req.id,
            "vehicle_id":  req.vehicle_id,
            "owner":       vehicle.owner_name,
            "model":       vehicle.model,
            "issue":       req.ml_result.prediction,
            "confidence":  round(req.ml_result.confidence * 100, 1),
            "urgency":     req.urgency,
            "status":      req.status,
            "booking_id":  booking.id if booking else None,
            "booking_status": booking.status if booking else None,
            "garages":     garage_list,
        })

    return results


# ── Demo bulk-seed: realistic organic vehicle histories ───────────────────────
@app.post("/admin/demo-seed")
def demo_seed():
    """
    10 Indian vehicle histories that look like organic real-world data:
    - Confidence 57-97% (3 below 70% → anomalies, 1 DECLINED → critical anomaly)
    - Timestamps burst Mon/Tue, then 3 urgent ones today (not evenly spaced)
    - Garage load: G001 busiest (3 jobs), G005 lightest (1 declined)
    - Issues: 4 battery, 3 engine, 3 oil  →  natural failure distribution
    - Mixed statuses: 5 resolved, 2 in-service, 1 awaiting user, 1 declined, 1 new
    Idempotent — skips already-present IDs.
    """
    from datetime import timedelta
    from models.models import Vehicle, ServiceRequest, MLResult, Booking

    # fmt: off
    # (vid, owner, phone, model, lat, lon,
    #  issue, garage_id, req_status, booking_status,
    #  confidence, urgency, hours_ago)
    SEED = [
        # ── Resolved cases (historical — spread over past 3 days) ──────────
        ("V101","Rahul Sharma",  "9811001001","Maruti Suzuki Swift",  28.5355,77.3910,
         "battery_failure","G001","COMPLETED","COMPLETED",   0.97,"High",    71),
        ("V102","Priya Patel",   "9822002002","Hyundai Creta",        28.4595,77.0266,
         "engine_overheat","G003","COMPLETED","COMPLETED",   0.84,"High",    53),
        ("V103","Amit Kumar",    "9833003003","Tata Nexon",           28.6304,77.2177,
         "low_oil_life",   "G001","COMPLETED","COMPLETED",   0.92,"Medium",  47),
        ("V104","Sunita Singh",  "9844004004","Mahindra XUV700",      28.5672,77.3219,
         "battery_failure","G004","COMPLETED","COMPLETED",   0.61,"High",    38),  # low conf → anomaly
        ("V105","Vikram Mehta",  "9855005005","Honda City",           28.7041,77.1025,
         "engine_overheat","G002","COMPLETED","COMPLETED",   0.88,"High",    29),
        # ── Currently in service (today) ───────────────────────────────────
        ("V106","Anjali Gupta",  "9866006006","Kia Seltos",           28.6139,77.2090,
         "battery_failure","G003","BOOKED",   "IN_PROGRESS", 0.73,"High",    17),
        ("V107","Rajesh Verma",  "9877007007","Maruti Suzuki Baleno", 28.6200,77.1800,
         "low_oil_life",   "G001","BOOKED",   "IN_PROGRESS", 0.57,"Medium",   8),  # low conf → anomaly
        # ── Unresolved / active flow (last few hours) ──────────────────────
        ("V108","Deepa Nair",    "9888008008","Hyundai i20",          28.5900,77.3100,
         "engine_overheat","G004","AWAITING_USER","PENDING_GARAGE",0.69,"Critical", 4),  # low conf → anomaly
        ("V109","Suresh Iyer",   "9899009009","Tata Tiago",           28.7400,77.1400,
         "battery_failure","G005","DECLINED", "CANCELLED",   0.91,"Critical",  3),  # declined → critical anomaly
        ("V110","Pooja Reddy",   "9800010010","MG Hector",            28.4800,77.0800,
         "low_oil_life",   "G002","PENDING",  "PENDING_GARAGE",0.78,"Low",     1),
    ]
    # fmt: on

    SERVICE_MAP = {
        "battery_failure": ("Battery Replacement",    "₹3,500–₹4,500"),
        "engine_overheat": ("Engine Cooling Service", "₹6,500–₹8,500"),
        "low_oil_life":    ("Full Oil Change",        "₹1,200–₹1,800"),
    }

    now = datetime.now()
    added = 0

    for (vid, owner, phone, model, lat, lon,
         issue, garage_id, req_status, booking_status,
         confidence, urgency, hours_ago) in SEED:

        if vid in DB["vehicles"]:
            continue

        DB["vehicles"][vid] = Vehicle(
            id=vid, owner_name=owner, owner_phone=phone,
            model=model, lat=lat, lon=lon, active=True,
        )

        req_id  = f"REQ-DEMO-{vid}"
        # Stagger minutes so timestamps don't look programmatic
        created = now - timedelta(hours=hours_ago, minutes=(ord(vid[-1]) * 7) % 47)

        # Realistic probability spread
        if confidence >= 0.75:
            probs = {issue: confidence, "normal": round(1 - confidence, 2)}
        else:
            alt = "low_oil_life" if issue != "low_oil_life" else "battery_failure"
            probs = {
                issue:   confidence,
                alt:     round((1 - confidence) * 0.65, 2),
                "normal":round((1 - confidence) * 0.35, 2),
            }

        DB["service_requests"][req_id] = ServiceRequest(
            id=req_id, vehicle_id=vid,
            ml_result=MLResult(prediction=issue, confidence=confidence, probabilities=probs),
            urgency=urgency, status=req_status,
            created_at=created,
            garages_tried=[garage_id], offered_garage_id=garage_id,
        )

        svc_name, svc_cost = SERVICE_MAP[issue]
        DB["bookings"][f"BK-DEMO-{vid}"] = Booking(
            id=f"BK-DEMO-{vid}", vehicle_id=vid,
            garage_id=garage_id, request_id=req_id,
            issue_type=issue, service=svc_name,
            estimated_cost=svc_cost, urgency=urgency,
            status=booking_status,
            created_at=created + timedelta(minutes=11 + (ord(vid[-1]) * 3) % 19),
        )
        added += 1

    # ── Error-timeline history for the "Errors Over Time" line chart ─────────
    # All timestamps anchored to yesterday midnight so they are always in the
    # 36-hour analytics window regardless of when the seed is called.
    _yesterday = datetime.combine(
        (datetime.now() - timedelta(days=1)).date(),
        datetime.min.time()
    )
    # (hour, minute, issue, vehicle_id)
    _TIMELINE = [
        (5,  14, "battery_failure",  "V101"), (5,  37, "engine_overheat",  "V102"),
        (6,  22, "low_oil_life",     "V103"),
        (7,  8,  "battery_failure",  "V104"), (7,  31, "engine_overheat",  "V105"),
        (7,  54, "low_oil_life",     "V101"),
        (8,  7,  "battery_failure",  "V102"), (8,  19, "engine_overheat",  "V103"),
        (8,  33, "low_oil_life",     "V104"), (8,  45, "battery_failure",  "V105"),
        (8,  58, "engine_overheat",  "V101"),
        (9,  12, "low_oil_life",     "V102"), (9,  28, "battery_failure",  "V103"),
        (9,  41, "engine_overheat",  "V104"), (9,  55, "low_oil_life",     "V105"),
        (10, 18, "battery_failure",  "V101"), (10, 44, "engine_overheat",  "V102"),
        (11, 9,  "low_oil_life",     "V103"), (11, 33, "battery_failure",  "V104"),
        (12, 15, "engine_overheat",  "V105"), (12, 47, "low_oil_life",     "V101"),
        (13, 11, "battery_failure",  "V102"), (13, 35, "engine_overheat",  "V103"),
        (13, 58, "low_oil_life",     "V104"),
        (14, 8,  "battery_failure",  "V105"), (14, 22, "engine_overheat",  "V101"),
        (14, 41, "low_oil_life",     "V102"), (14, 57, "battery_failure",  "V103"),
        (15, 6,  "engine_overheat",  "V104"), (15, 19, "low_oil_life",     "V105"),
        (15, 31, "battery_failure",  "V101"), (15, 44, "engine_overheat",  "V102"),
        (15, 58, "low_oil_life",     "V103"),
        (16, 12, "battery_failure",  "V104"), (16, 29, "engine_overheat",  "V105"),
        (16, 45, "low_oil_life",     "V101"), (16, 58, "battery_failure",  "V102"),
        (17, 14, "engine_overheat",  "V103"), (17, 39, "low_oil_life",     "V104"),
        (17, 55, "battery_failure",  "V105"),
        (18, 18, "engine_overheat",  "V101"), (18, 44, "low_oil_life",     "V102"),
        (18, 59, "battery_failure",  "V103"),
        (19, 33, "engine_overheat",  "V104"),
        (20, 11, "low_oil_life",     "V105"), (20, 48, "battery_failure",  "V101"),
        (21, 22, "engine_overheat",  "V102"),
        (22, 15, "low_oil_life",     "V103"),
    ]

    _CONF_CYCLE = [0.91, 0.87, 0.94, 0.82, 0.96, 0.78, 0.89, 0.93]
    tl_added = 0
    for tl_idx, (hour, minute, issue, vid) in enumerate(_TIMELINE):
        tl_id = f"ERR-TL-{tl_idx:03d}"
        if tl_id in DB["service_requests"]:
            continue
        conf = _CONF_CYCLE[tl_idx % len(_CONF_CYCLE)]
        DB["service_requests"][tl_id] = ServiceRequest(
            id=tl_id, vehicle_id=vid,
            ml_result=MLResult(
                prediction=issue, confidence=conf,
                probabilities={issue: conf, "normal": round(1 - conf, 2)},
            ),
            urgency="Medium", status="COMPLETED",
            created_at=_yesterday + timedelta(hours=hour, minutes=minute),
            garages_tried=[], offered_garage_id=None,
        )
        tl_added += 1

    completed_bk = [b for b in DB["bookings"].values() if b.status == "COMPLETED"]
    cost_map = {"battery_failure": 4000, "engine_overheat": 7500, "low_oil_life": 1500}
    return {
        "message": f"Demo seed complete. {added} vehicle histories + {tl_added} chart timeline entries injected.",
        "total_vehicles": len(DB["vehicles"]),
        "bookings": {
            "completed":   sum(1 for b in DB["bookings"].values() if b.status == "COMPLETED"),
            "in_progress": sum(1 for b in DB["bookings"].values() if b.status == "IN_PROGRESS"),
            "pending":     sum(1 for b in DB["bookings"].values() if b.status == "PENDING_GARAGE"),
            "cancelled":   sum(1 for b in DB["bookings"].values() if b.status == "CANCELLED"),
        },
        "total_revenue_inr": sum(cost_map.get(b.issue_type, 0) for b in completed_bk),
    }


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, app_dir=_BACKEND_DIR)

