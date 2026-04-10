"""
SchedulingAgent — Sends service request to the best matching garage.
                   The real garage dashboard accepts/rejects via the UI.
                   Falls back to next garage if the first one's booking is cancelled.
"""
import asyncio

from models.models import ACTIVE_PIPELINES, SERVICE_DETAILS


class SchedulingAgent:
    async def try_garage_chain(self, vehicle, request, garages: list, index: int):
        from agents.feedback_agent import FeedbackAgent
        feedback_agent = FeedbackAgent()

        if index >= len(garages):
            print(f"[GARAGE] All {len(garages)} garages rejected request {request.id}.")
            print(f"[GARAGE] No service available for {vehicle.owner_name} ({vehicle.id})")
            request.status = "ALL_REJECTED"
            ACTIVE_PIPELINES.discard(vehicle.id)
            return

        garage = garages[index]
        request.garages_tried.append(garage.id)
        svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})

        print(f"[GARAGE] Sending request {request.id} to garage: {garage.name} ({garage.id})")
        print(f"         Service : {svc.get('service')} | Cost: {svc.get('estimated_cost')}")
        print(f"         Issue   : {request.ml_result.prediction} | Urgency: {request.urgency}")

        # Hand off to feedback_agent — garage accepts/declines via the dashboard UI
        # Pass the full garages list + current index so feedback_agent can chain to next on reject
        await feedback_agent.notify_user(vehicle, garage, request, garages, index)
