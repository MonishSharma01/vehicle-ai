"""
garage_ranker.py — Scores and ranks garages by distance, rating, specialization, availability.
"""
import math
from typing import List

from models.models import DB, Garage, Vehicle, SERVICE_DETAILS


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _score(garage: Garage, vehicle: Vehicle, issue_type: str) -> float:
    dist_km = _haversine(vehicle.lat, vehicle.lon, garage.lat, garage.lon)
    dist_score = max(0.0, 1.0 - dist_km / 50.0)            # 0-1, within 50 km
    rating_score = garage.rating / 5.0                       # 0-1
    spec = SERVICE_DETAILS.get(issue_type, {}).get("specialization", "general")
    spec_score = 1.0 if spec in garage.specializations else 0.4
    avail_score = min(garage.available_slots / 5.0, 1.0)     # 0-1, cap at 5 slots

    return (dist_score * 0.40) + (rating_score * 0.30) + (spec_score * 0.20) + (avail_score * 0.10)


def rank_garages(vehicle: Vehicle, issue_type: str) -> List[Garage]:
    available = [g for g in DB["garages"].values() if g.available_slots > 0]
    if not available:
        print("[ANALYZER] No garages with available slots.")
        return []

    scored = [(g, _score(g, vehicle, issue_type)) for g in available]
    scored.sort(key=lambda x: x[1], reverse=True)

    print(f"[ANALYZER] Garage ranking for '{issue_type}':")
    for i, (g, s) in enumerate(scored, 1):
        dist = _haversine(vehicle.lat, vehicle.lon, g.lat, g.lon)
        print(f"           #{i} {g.name:<22} score={s:.2f}  dist={dist:.1f}km  rating={g.rating}⭐  slots={g.available_slots}")

    return [g for g, _ in scored]
