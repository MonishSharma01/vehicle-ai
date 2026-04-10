"""
issue_analyzer.py — Classifies issue urgency, ranks garages, starts garage assignment chain.
"""
import uuid
from datetime import datetime

from models.models import DB, MLResult, ServiceRequest, Urgency, ACTIVE_PIPELINES


def _classify_urgency(confidence: float, prediction: str) -> str:
    if prediction == "engine_overheat":
        return Urgency.CRITICAL if confidence >= 0.95 else Urgency.HIGH
    elif prediction == "battery_failure":
        return Urgency.HIGH if confidence >= 0.95 else Urgency.MEDIUM
    elif prediction == "low_oil_life":
        return Urgency.MEDIUM
    return Urgency.LOW


async def analyze(vehicle, telemetry: dict, raw_result: dict):
    from services.garage_ranker import rank_garages
    from services.garage_handler import try_garage_chain

    ml_result = MLResult(
        prediction=raw_result["prediction"],
        confidence=raw_result["confidence"],
        probabilities=raw_result["probabilities"],
    )

    urgency = _classify_urgency(ml_result.confidence, ml_result.prediction)

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

    garages = rank_garages(vehicle, ml_result.prediction)

    if not garages:
        print(f"[ANALYZER] No available garages for request {request.id}")
        request.status = "NO_SERVICE"
        ACTIVE_PIPELINES.discard(vehicle.id)
        return

    await try_garage_chain(vehicle, request, garages, index=0)
