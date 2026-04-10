"""
FeedbackAgent — Two-stage decision gate:
  Stage 1: Garage receives the booking (PENDING_GARAGE) and must accept via the dashboard.
  Stage 2: User is notified (AWAITING_USER) and must accept/decline in the app.
  Only after both parties accept does the booking become CONFIRMED.
"""
import asyncio

from models.models import ACTIVE_PIPELINES, SERVICE_DETAILS

GARAGE_DECISION_TIMEOUT = 7200.0   # 2 hours — never times out during demo
USER_DECISION_TIMEOUT   = 7200.0   # 2 hours — never times out during demo


class FeedbackAgent:
    async def notify_user(self, vehicle, garage, request, garages: list = None, garage_index: int = 0):
        from services.booking_service import create_booking
        from agents.priority_agent import PriorityAgent
        from agents.scheduling_agent import SchedulingAgent
        from models.models import (
            PENDING_GARAGE_DECISIONS, GARAGE_DECISIONS,
            PENDING_USER_DECISIONS, USER_DECISIONS, DB,
        )

        priority_agent = PriorityAgent()
        svc = SERVICE_DETAILS.get(request.ml_result.prediction, {})

        # ── Stage 1: Create booking as PENDING_GARAGE so garage dashboard shows it ──
        request.offered_garage_id = garage.id
        request.status = "PENDING_GARAGE"
        booking = await create_booking(vehicle, garage, request)

        print(f"[GARAGE] ⏳ Waiting for {garage.name} to accept booking {booking.id}...")

        garage_event = asyncio.Event()
        PENDING_GARAGE_DECISIONS[booking.id] = garage_event

        try:
            await asyncio.wait_for(garage_event.wait(), timeout=GARAGE_DECISION_TIMEOUT)
            garage_accepted = GARAGE_DECISIONS.get(booking.id, False)
        except asyncio.TimeoutError:
            print(f"[GARAGE] No response from {garage.name} — auto-declining (timeout {GARAGE_DECISION_TIMEOUT}s)")
            garage_accepted = False
        finally:
            PENDING_GARAGE_DECISIONS.pop(booking.id, None)
            GARAGE_DECISIONS.pop(booking.id, None)

        if not garage_accepted:
            print(f"[GARAGE] ❌ {garage.name} REJECTED booking {booking.id} — trying next garage")
            request.garages_tried.append(garage.id)
            if garages and garage_index + 1 < len(garages):
                scheduling_agent = SchedulingAgent()
                await scheduling_agent.try_garage_chain(vehicle, request, garages, garage_index + 1)
            else:
                request.status = "ALL_REJECTED"
                ACTIVE_PIPELINES.discard(vehicle.id)
                import models.models as _m; _m.PENDING_DEMO_RESTART = True
                print("[DEMO] ALL_REJECTED — demo restart flagged.")
            return

        print(f"[GARAGE] ✅ {garage.name} ACCEPTED booking {booking.id}")

        # ── Stage 2: Notify user — set AWAITING_USER so user-app shows diagnosis ──
        booking.status = "AWAITING_USER"
        request.status = "AWAITING_USER"

        print(f"[USER] ⏳ Awaiting decision from {vehicle.owner_name} ({vehicle.owner_phone})")
        print(f"       Issue  : {request.ml_result.prediction} — {request.ml_result.confidence * 100:.1f}%")
        print(f"       Garage : {garage.name} | ⭐ {garage.rating} | {svc.get('service')} | {svc.get('estimated_cost')}")

        user_event = asyncio.Event()
        PENDING_USER_DECISIONS[request.id] = user_event

        try:
            await asyncio.wait_for(user_event.wait(), timeout=USER_DECISION_TIMEOUT)
            user_accepted = USER_DECISIONS.get(request.id, False)
        except asyncio.TimeoutError:
            print(f"[USER] No response from {vehicle.owner_name} — auto-declining (timeout {USER_DECISION_TIMEOUT}s)")
            user_accepted = False
        finally:
            PENDING_USER_DECISIONS.pop(request.id, None)
            USER_DECISIONS.pop(request.id, None)

        if user_accepted:
            print(f"[USER] ✅ {vehicle.owner_name} ACCEPTED — booking confirmed & IN_PROGRESS")
            booking.status = "IN_PROGRESS"
            request.status = "BOOKED"
            print(f"[BOOKING] ✅ Booking {booking.id} is now IN_PROGRESS at {garage.name}")
            print(f"          Service: {booking.service} | Cost: {booking.estimated_cost} | Urgency: {booking.urgency}")
            ACTIVE_PIPELINES.discard(vehicle.id)
        else:
            print(f"[USER] ❌ {vehicle.owner_name} DECLINED the offer from {garage.name}")
            booking.status = "CANCELLED"
            request.status = "USER_DECLINED"
            await priority_agent.notify_garage_of_rejection(vehicle, garage, request)
            ACTIVE_PIPELINES.discard(vehicle.id)
            import models.models as _m; _m.PENDING_DEMO_RESTART = True
            print("[DEMO] USER_DECLINED — demo restart flagged.")
