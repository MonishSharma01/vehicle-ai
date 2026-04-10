"""
DecisionAgent — Analyzes detected issue, creates ServiceRequest, calls RiskAgent
                 for urgency + garage ranking, then hands off to SchedulingAgent.
"""
import uuid
from datetime import datetime

from models.models import DB, MLResult, ServiceRequest, ACTIVE_PIPELINES


class DecisionAgent:
    async def analyze(self, vehicle, telemetry: dict, raw_result: dict):
        from agents.risk_agent import RiskAgent
        from agents.scheduling_agent import SchedulingAgent

        risk_agent = RiskAgent()
        scheduling_agent = SchedulingAgent()

        ml_result = MLResult(
            prediction=raw_result["prediction"],
            confidence=raw_result["confidence"],
            probabilities=raw_result["probabilities"],
        )

        urgency = risk_agent.assess_risk(ml_result.confidence, ml_result.prediction)

        request = ServiceRequest(
            id=str(uuid.uuid4())[:8].upper(),
            vehicle_id=vehicle.id,
            ml_result=ml_result,
            urgency=urgency,
            status="PENDING",
            created_at=datetime.now(),
        )
        DB["service_requests"][request.id] = request

        print(f"[ANALYZER] Request {request.id} created")
        print(f"           Issue: {ml_result.prediction} | Confidence: {ml_result.confidence * 100:.1f}% | Urgency: {urgency}")

        garages = risk_agent.rank_garages(vehicle, ml_result.prediction)

        if not garages:
            print(f"[ANALYZER] No available garages for request {request.id}")
            request.status = "NO_SERVICE"
            ACTIVE_PIPELINES.discard(vehicle.id)
            return

        await scheduling_agent.try_garage_chain(vehicle, request, garages, index=0)
