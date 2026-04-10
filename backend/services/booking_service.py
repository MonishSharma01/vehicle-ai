"""
booking_service.py — Creates a confirmed booking after user acceptance.
                      Stores to in-memory DB and prints confirmation for both parties.
"""
import uuid
from datetime import datetime
from typing import List

from models.models import DB, Booking, ACTIVE_PIPELINES, SERVICE_DETAILS


async def create_booking(vehicle, garage, request):
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
        status="CONFIRMED",
        created_at=datetime.now(),
    )
    DB["bookings"][booking.id] = booking
    request.status = "BOOKED"

    garage.available_slots = max(0, garage.available_slots - 1)

    print(f"[BOOKING] ✅ Booking {booking.id} CONFIRMED")
    print(f"          Vehicle  : {vehicle.id} — {vehicle.model} | {vehicle.owner_name} | {vehicle.owner_phone}")
    print(f"          Garage   : {garage.name} | {garage.address} | {garage.phone}")
    print(f"          Service  : {booking.service}")
    print(f"          Cost     : {booking.estimated_cost}")
    print(f"          Urgency  : {booking.urgency}")
    print(f"          Time     : {booking.created_at.strftime('%Y-%m-%d %H:%M:%S')}")

    ACTIVE_PIPELINES.discard(vehicle.id)


def get_all_bookings() -> List[Booking]:
    return list(DB["bookings"].values())


def get_all_requests() -> List:
    return list(DB["service_requests"].values())

