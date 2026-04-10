"""
garage_rejection_handler.py — Notifies a garage that the user declined their service offer.
                               Restores the garage slot for future bookings.
"""
import asyncio


async def notify_garage_of_rejection(vehicle, garage, request):
    print(f"[REJECT] Notifying {garage.name} that user declined")
    print(f"         Request : {request.id} | Issue: {request.ml_result.prediction}")
    print(f"         Message : '{vehicle.owner_name}' declined your service offer")
    print(f"[REJECT] Slot restored for {garage.name} (slots: {garage.available_slots} → {garage.available_slots + 1})")

    garage.available_slots += 1     # release the slot back
    await asyncio.sleep(0)          # yield to event loop
