"""
booking_service.py — Creates a confirmed booking after user acceptance.
                      Stores to in-memory DB and mirrors to Supabase (non-blocking).
"""
import uuid
from datetime import datetime
from typing import List

from models.models import DB, Booking, ACTIVE_PIPELINES, SERVICE_DETAILS


def _supabase_sync(booking) -> None:
    """Fire-and-forget Supabase sync — never raises."""
    try:
        from db.supabase_client import sync_booking
        sync_booking(booking)
    except Exception:
        pass


async def create_booking(vehicle, garage, request):
    """Create a booking as PENDING_GARAGE — visible to garage before user is notified."""
    svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})

    booking = Booking(
        id=str(uuid.uuid4())[:8].upper(),
        vehicle_id=vehicle.id,
        garage_id=garage.id,
        request_id=request.id,
        issue_type=request.ml_result.prediction,
        service=svc.get("service", "General Service"),
        estimated_cost=svc.get("estimated_cost", "TBD"),
        urgency=request.urgency,
        status="PENDING_GARAGE",
        created_at=datetime.now(),
    )
    DB["bookings"][booking.id] = booking
    request.booking_id = booking.id

    garage.available_slots = max(0, garage.available_slots - 1)

    _supabase_sync(booking)

    print(f"[BOOKING] 🔔 Booking {booking.id} sent to garage {garage.name}")
    print(f"          Vehicle  : {vehicle.id} — {vehicle.model} | {vehicle.owner_name}")
    print(f"          Service  : {booking.service} | Cost: {booking.estimated_cost}")

    return booking


def get_all_bookings() -> List[Booking]:
    return list(DB["bookings"].values())


def get_all_requests() -> List:
    return list(DB["service_requests"].values())


def create_booking_sync(vehicle, garage, request):
    """Synchronous version of create_booking — used by rebook endpoint."""
    svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})
    booking = Booking(
        id=str(uuid.uuid4())[:8].upper(),
        vehicle_id=vehicle.id,
        garage_id=garage.id,
        request_id=request.id,
        issue_type=request.ml_result.prediction,
        service=svc.get("service", "General Service"),
        estimated_cost=svc.get("estimated_cost", "TBD"),
        urgency=request.urgency,
        status="PENDING_GARAGE",
        created_at=datetime.now(),
    )
    DB["bookings"][booking.id] = booking
    garage.available_slots = max(0, garage.available_slots - 1)
    _supabase_sync(booking)
    return booking

