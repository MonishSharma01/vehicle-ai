"""
user_handler.py — Notifies user when a garage accepts. Simulates user accept/decline.
                   Routes to booking_service or garage_rejection_handler accordingly.
"""
import asyncio
import random

from models.models import ACTIVE_PIPELINES, SERVICE_DETAILS

USER_ACCEPT_PROB = 0.80      # 80% chance user accepts
USER_RESPONSE_DELAY = 2.0    # seconds to simulate user response time


def _simulate_user_decision() -> bool:
    return random.random() < USER_ACCEPT_PROB


async def notify_user(vehicle, garage, request):
    from services.booking_service import create_booking
    from services.garage_rejection_handler import notify_garage_of_rejection

    svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})

    print(f"[USER] Notification sent to {vehicle.owner_name} ({vehicle.owner_phone})")
    print(f"       Issue    : {request.ml_result.prediction} — {request.ml_result.confidence * 100:.1f}% confident")
    print(f"       Garage   : {garage.name} | ⭐ {garage.rating} | 📍 {garage.address}")
    print(f"       Service  : {svc.get('service')} | 💰 {svc.get('estimated_cost')} | ⏱ {svc.get('duration')}")

    await asyncio.sleep(USER_RESPONSE_DELAY)

    accepted = _simulate_user_decision()

    if accepted:
        print(f"[USER] {vehicle.owner_name} ACCEPTED booking from {garage.name}")
        request.status = "USER_ACCEPTED"
        await create_booking(vehicle, garage, request)
    else:
        print(f"[USER] {vehicle.owner_name} DECLINED the offer from {garage.name}")
        request.status = "USER_DECLINED"
        await notify_garage_of_rejection(vehicle, garage, request)
        ACTIVE_PIPELINES.discard(vehicle.id)
