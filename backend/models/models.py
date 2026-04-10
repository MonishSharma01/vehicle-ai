"""
models.py — Data models and in-memory database.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional


class Urgency(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


SERVICE_DETAILS: Dict[str, Dict] = {
    "battery_failure": {
        "service": "Battery Replacement",
        "estimated_cost": "$150-200",
        "duration": "30 minutes",
        "specialization": "battery",
    },
    "engine_overheat": {
        "service": "Engine Cooling Service",
        "estimated_cost": "$200-300",
        "duration": "45 minutes",
        "specialization": "engine",
    },
    "low_oil_life": {
        "service": "Oil Change",
        "estimated_cost": "$50-80",
        "duration": "20 minutes",
        "specialization": "oil",
    },
    "normal": {
        "service": "Routine Check",
        "estimated_cost": "$0",
        "duration": "10 minutes",
        "specialization": "general",
    },
}


@dataclass
class Vehicle:
    id: str
    owner_name: str
    owner_phone: str
    model: str
    lat: float
    lon: float
    active: bool = True


@dataclass
class Garage:
    id: str
    name: str
    address: str
    phone: str
    lat: float
    lon: float
    rating: float
    specializations: List[str]
    available_slots: int


@dataclass
class MLResult:
    prediction: str
    confidence: float
    probabilities: Dict[str, float]


@dataclass
class ServiceRequest:
    id: str
    vehicle_id: str
    ml_result: MLResult
    urgency: str
    status: str
    created_at: datetime
    garages_tried: List[str] = field(default_factory=list)
    offered_garage_id: Optional[str] = None
    booking_id: Optional[str] = None


@dataclass
class Booking:
    id: str
    vehicle_id: str
    garage_id: str
    request_id: str
    issue_type: str
    service: str
    estimated_cost: str
    urgency: str
    status: str
    created_at: datetime


# ── In-memory database ──────────────────────────────────────────────────────
DB: Dict[str, Any] = {
    "vehicles":         {},
    "garages":          {},
    "service_requests": {},
    "bookings":         {},
    "feedback":         {},
}

# Vehicles currently being processed — prevents duplicate pipelines
ACTIVE_PIPELINES: set = set()

# Garage decision gate: booking_id → asyncio.Event (set when garage accepts)
PENDING_GARAGE_DECISIONS: Dict = {}
# True = accepted, False = declined
GARAGE_DECISIONS: Dict[str, bool] = {}

# User decision gate: request_id → asyncio.Event (set when user responds)
PENDING_USER_DECISIONS: Dict = {}
# True = accepted, False = declined
USER_DECISIONS: Dict[str, bool] = {}

# Demo restart flag — set by agents, consumed by main.py's monitor loop
PENDING_DEMO_RESTART: bool = False


# ── Seed data ────────────────────────────────────────────────────────────────
def seed_vehicles():
    vehicles = [
        Vehicle("V001", "Alice Johnson", "555-1001", "Tesla Model 3",  28.6139, 77.2090),
        Vehicle("V002", "Bob Smith",     "555-1002", "Honda City",     28.6200, 77.2200),
        Vehicle("V003", "Carol Lee",     "555-1003", "Ford Mustang",   28.6000, 77.1900),
    ]
    for v in vehicles:
        DB["vehicles"][v.id] = v


def seed_garages():
    garages = [
        Garage("G001", "AutoCare Downtown",  "123 Main St",     "555-5001", 28.6140, 77.2095, 4.8, ["battery", "engine", "oil"],    5),
        Garage("G002", "QuickFix Motors",    "45 Ring Road",    "555-5002", 28.6300, 77.2300, 4.3, ["battery", "oil"],              3),
        Garage("G003", "SpeedGarage Pro",    "7 Industrial Rd", "555-5003", 28.5900, 77.1800, 4.6, ["engine", "general"],           4),
        Garage("G004", "CityMech Service",   "88 North Ave",    "555-5004", 28.6500, 77.2400, 3.9, ["oil", "general"],              2),
        Garage("G005", "PrimeAuto Workshop", "21 South Blvd",   "555-5005", 28.5800, 77.2100, 4.1, ["battery", "general"],          6),
    ]
    for g in garages:
        DB["garages"][g.id] = g


def reset_db():
    for key in DB:
        DB[key].clear()
    ACTIVE_PIPELINES.clear()
    seed_vehicles()
    seed_garages()
