"""
garage_handler.py — Sends service requests to garages in ranked order.
                     Simulates garage accept/reject. Chains to next garage on rejection.
"""
import asyncio
import random

from models.models import ACTIVE_PIPELINES, SERVICE_DETAILS

GARAGE_ACCEPT_PROB = 0.70     # 70% chance garage accepts
GARAGE_RESPONSE_DELAY = 1.5   # seconds to simulate garage response time


def _simulate_garage_decision() -> bool:
    return random.random() < GARAGE_ACCEPT_PROB


async def try_garage_chain(vehicle, request, garages: list, index: int):
    from services.user_handler import notify_user

    if index >= len(garages):
        print(f"[GARAGE] All {len(garages)} garages rejected request {request.id}.")
        print(f"[GARAGE] No service available for {vehicle.owner_name} ({vehicle.id})")
        request.status = "ALL_REJECTED"
        ACTIVE_PIPELINES.discard(vehicle.id)
        return

    garage = garages[index]
    request.garages_tried.append(garage.id)
    svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})

    print(f"[GARAGE] Request {request.id} sent to garage #{index + 1}: {garage.name}")
    print(f"         Service : {svc.get('service')} | Cost: {svc.get('estimated_cost')}")
    print(f"         Issue   : {request.ml_result.prediction} | Confidence: {request.ml_result.confidence * 100:.1f}%")
    print(f"         Urgency : {request.urgency} | Timeout: {GARAGE_RESPONSE_DELAY}s (simulated)")

    await asyncio.sleep(GARAGE_RESPONSE_DELAY)

    accepted = _simulate_garage_decision()

    if accepted:
        print(f"[GARAGE] {garage.name} ACCEPTED request {request.id}")
        request.status = "GARAGE_ACCEPTED"
        await notify_user(vehicle, garage, request)
    else:
        print(f"[GARAGE] {garage.name} REJECTED request {request.id} — trying next garage")
        await try_garage_chain(vehicle, request, garages, index + 1)
