"""
garage_routes.py — Garage auth endpoints (signup / login / profile).

Prefix: /auth/garage
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from auth.auth_service import signup_garage, login_garage, get_garage_by_id
from auth.session_middleware import get_current_garage

router = APIRouter(prefix="/auth/garage", tags=["Garage Auth"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class GarageSignupRequest(BaseModel):
    garage_name: str = Field(..., min_length=2, max_length=100)
    owner_name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., min_length=10, max_length=15)
    location: str = Field(..., min_length=5, max_length=200, description="Full address")
    specialization: str = Field(..., description="e.g. battery, engine, oil, general")
    password: str = Field(..., min_length=6)
    email: Optional[str] = Field("", description="Optional email")

    class Config:
        json_schema_extra = {
            "example": {
                "garage_name": "Sharma Auto Works",
                "owner_name": "Ramesh Sharma",
                "phone": "9876543210",
                "location": "123 MG Road, Pune, Maharashtra",
                "specialization": "battery,engine",
                "password": "garage123",
                "email": "sharma.auto@gmail.com",
            }
        }


class GarageLoginRequest(BaseModel):
    identifier: str = Field(..., description="Phone number or email")
    password: str

    class Config:
        json_schema_extra = {
            "example": {"identifier": "9876543210", "password": "garage123"}
        }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", summary="Register a new garage")
def garage_signup(body: GarageSignupRequest):
    """
    Register a garage. Auto-generates a unique Garage ID.
    Returns JWT token on success.
    """
    result = signup_garage(
        garage_name=body.garage_name,
        owner_name=body.owner_name,
        phone=body.phone,
        location=body.location,
        specialization=body.specialization,
        password=body.password,
        email=body.email or "",
    )
    if "error" in result:
        raise HTTPException(status_code=409, detail=result["error"])
    return {
        "message": "Garage registered successfully",
        **result,
    }


@router.post("/login", summary="Login as a garage")
def garage_login(body: GarageLoginRequest):
    """
    Authenticate a garage with phone/email + password.
    Returns JWT token valid for 7 days.
    """
    result = login_garage(identifier=body.identifier, password=body.password)
    if "error" in result:
        raise HTTPException(status_code=401, detail=result["error"])
    return {
        "message": "Login successful",
        **result,
    }


@router.get("/me", summary="Get current garage profile")
def garage_me(current: dict = Depends(get_current_garage)):
    """Protected — requires garage Bearer token."""
    garage = get_garage_by_id(current["sub"])
    if not garage:
        raise HTTPException(status_code=404, detail="Garage not found")
    return garage
