"""
supabase_client.py — Supabase persistence layer.

Strategy:
  - In-memory DB is ALWAYS primary (system works without Supabase).
  - All writes to Supabase are fire-and-forget async tasks.
  - Failures are logged at DEBUG level — never crash the pipeline.

Credentials are read from environment variables first; fall back to
hard-coded defaults so the system works out-of-the-box for demos.

Environment variables (optional but recommended for production):
  SUPABASE_URL
  SUPABASE_ANON_KEY
"""

import os
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://bxxmpuqwsubggmdciefe.supabase.co",
)
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4eG1wdXF3c3ViZ2dtZGNpZWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MTYwMTYsImV4cCI6MjA5MTM5MjAxNn0"
    ".khGkRxoriVeXWUuBkHKmjQsUdZaOO51gmVT9wbPPi-c",
)

_client = None
_available: Optional[bool] = None   # None = not yet probed


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_client():
    """Lazy-init Supabase client. Returns None if unavailable."""
    global _client, _available
    if _available is False:
        return None
    if _client is not None:
        return _client
    try:
        from supabase import create_client  # type: ignore
        _client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        _available = True
        logger.info("[SUPABASE] Connected successfully.")
        return _client
    except ImportError:
        _available = False
        logger.warning("[SUPABASE] supabase-py not installed — running in-memory only.")
        return None
    except Exception as exc:
        _available = False
        logger.warning("[SUPABASE] Connection failed (%s) — running in-memory only.", exc)
        return None


# ── Low-level helpers ────────────────────────────────────────────────────────

def _sync_upsert(table: str, data: dict, on_conflict: str = "id") -> None:
    client = get_client()
    if client is None:
        return
    try:
        client.table(table).upsert(data, on_conflict=on_conflict).execute()
    except Exception as exc:
        logger.debug("[SUPABASE] upsert %s failed: %s", table, exc)


def _sync_insert(table: str, data: dict) -> None:
    client = get_client()
    if client is None:
        return
    try:
        client.table(table).insert(data).execute()
    except Exception as exc:
        logger.debug("[SUPABASE] insert %s failed: %s", table, exc)


async def _async_upsert(table: str, data: dict, on_conflict: str = "id") -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _sync_upsert, table, data, on_conflict)


async def _async_insert(table: str, data: dict) -> None:
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _sync_insert, table, data)


def _fire(coro) -> None:
    """Schedule a coroutine as a background task — fire and forget."""
    try:
        asyncio.get_event_loop().create_task(coro)
    except RuntimeError:
        pass  # no running loop (e.g. during tests)


# ── Public sync functions (called from agents / services) ────────────────────

def sync_vehicle(vehicle) -> None:
    """Upsert a Vehicle into Supabase (non-blocking)."""
    data = {
        "id":          vehicle.id,
        "owner_name":  vehicle.owner_name,
        "owner_phone": vehicle.owner_phone,
        "model":       vehicle.model,
        "lat":         vehicle.lat,
        "lon":         vehicle.lon,
        "active":      vehicle.active,
        "updated_at":  _now_iso(),
    }
    _fire(_async_upsert("vehicles", data))


def sync_garage(garage) -> None:
    """Upsert a Garage into Supabase (non-blocking)."""
    data = {
        "id":               garage.id,
        "name":             garage.name,
        "address":          garage.address,
        "phone":            garage.phone,
        "lat":              garage.lat,
        "lon":              garage.lon,
        "rating":           garage.rating,
        "specializations":  garage.specializations,
        "available_slots":  garage.available_slots,
        "updated_at":       _now_iso(),
    }
    _fire(_async_upsert("garages", data))


def log_telemetry(vehicle_id: str, telemetry: dict, prediction: str, confidence: float) -> None:
    """Append a telemetry reading to Supabase (non-blocking)."""
    data = {
        "vehicle_id":       vehicle_id,
        "engine_temp":      telemetry.get("engine_temp"),
        "battery_voltage":  telemetry.get("battery_voltage"),
        "oil_life":         telemetry.get("oil_life"),
        "vibration":        telemetry.get("vibration"),
        "mileage":          telemetry.get("mileage"),
        "predicted_issue":  prediction,
        "confidence":       round(confidence, 4),
        "recorded_at":      _now_iso(),
    }
    _fire(_async_insert("telemetry_logs", data))


def sync_service_request(request) -> None:
    """Upsert an issue/service request to Supabase (non-blocking)."""
    data = {
        "id":            request.id,
        "vehicle_id":    request.vehicle_id,
        "prediction":    request.ml_result.prediction,
        "confidence":    round(request.ml_result.confidence, 4),
        "probabilities": request.ml_result.probabilities,
        "urgency":       request.urgency,
        "status":        request.status,
        "garages_tried": request.garages_tried,
        "created_at":    request.created_at.isoformat(),
        "updated_at":    _now_iso(),
    }
    _fire(_async_upsert("issues", data))


def sync_booking(booking) -> None:
    """Upsert a Booking to Supabase (non-blocking)."""
    data = {
        "id":             booking.id,
        "vehicle_id":     booking.vehicle_id,
        "garage_id":      booking.garage_id,
        "request_id":     booking.request_id,
        "issue_type":     booking.issue_type,
        "service":        booking.service,
        "estimated_cost": booking.estimated_cost,
        "urgency":        booking.urgency,
        "status":         booking.status,
        "created_at":     booking.created_at.isoformat(),
        "updated_at":     _now_iso(),
    }
    _fire(_async_upsert("bookings", data))


def log_agent_action(agent_name: str, action: str, entity_id: str, details: dict = None) -> None:
    """Insert an agent audit log entry to Supabase (non-blocking)."""
    data = {
        "agent_name":  agent_name,
        "action":      action,
        "entity_id":   entity_id,
        "details":     details or {},
        "timestamp":   _now_iso(),
    }
    _fire(_async_insert("agent_logs", data))


def save_feedback(booking_id: str, vehicle_id: str, rating: int, comment: str = "") -> None:
    """Insert user feedback to Supabase (non-blocking)."""
    data = {
        "booking_id":    booking_id,
        "vehicle_id":    vehicle_id,
        "rating":        rating,
        "comment":       comment,
        "submitted_at":  _now_iso(),
    }
    _fire(_async_insert("feedback", data))


def save_insight(insight_type: str, payload: dict) -> None:
    """Insert an insights record to Supabase (non-blocking)."""
    data = {
        "insight_type": insight_type,
        "data":         payload,
        "generated_at": _now_iso(),
    }
    _fire(_async_insert("insights", data))
