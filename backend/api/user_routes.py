"""
user_routes.py — User auth endpoints (signup / login / profile).

Prefix: /auth/user
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional

from auth.auth_service import signup_user, login_user, get_user_by_id
from auth.session_middleware import get_current_user

router = APIRouter(prefix="/auth/user", tags=["User Auth"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class UserSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name")
    car_model: str = Field(..., min_length=2, max_length=100, description="Car model (e.g. Tata Nexon)")
    car_number_plate: str = Field(..., min_length=4, max_length=15, description="e.g. MH12AB1234")
    password: str = Field(..., min_length=6, description="Minimum 6 characters")
    phone: Optional[str] = Field("", description="Phone number (optional)")
    email: Optional[str] = Field("", description="Email address (optional)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Rahul Sharma",
                "car_model": "Tata Nexon",
                "car_number_plate": "MH12AB1234",
                "password": "secure123",
                "phone": "9876543210",
                "email": "rahul@example.com",
            }
        }


class UserLoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone number")
    password: str

    class Config:
        json_schema_extra = {
            "example": {"identifier": "rahul@example.com", "password": "secure123"}
        }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/signup", summary="Register a new user")
def user_signup(body: UserSignupRequest):
    """
    Register a new user with their vehicle info.
    Returns JWT token on success.
    """
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="At least one of email or phone is required.")

    result = signup_user(
        name=body.name,
        car_model=body.car_model,
        car_number_plate=body.car_number_plate,
        password=body.password,
        phone=body.phone or "",
        email=body.email or "",
    )
    if "error" in result:
        raise HTTPException(status_code=409, detail=result["error"])

    # Enrich with ML category
    try:
        from utils.car_model_mapper import get_ml_category
        result["ml_category"] = get_ml_category(body.car_model)
    except Exception:
        result["ml_category"] = "Unknown"

    return {
        "message": "Account created successfully",
        **result,
    }


@router.post("/login", summary="Login as a user")
def user_login(body: UserLoginRequest):
    """
    Authenticate a user. Returns JWT token valid for 7 days.
    """
    result = login_user(identifier=body.identifier, password=body.password)
    if "error" in result:
        raise HTTPException(status_code=401, detail=result["error"])
    return {
        "message": "Login successful",
        **result,
    }


@router.get("/me", summary="Get current user profile")
def user_me(current: dict = Depends(get_current_user)):
    """Protected — requires Bearer token."""
    user = get_user_by_id(current["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Add ML category for their car
    try:
        from utils.car_model_mapper import get_ml_category, get_telemetry_profile
        category = get_ml_category(user.get("car_model", ""))
        profile = get_telemetry_profile(user.get("car_model", ""))
        user["ml_category"] = category
        user["telemetry_profile"] = profile
    except Exception:
        pass
    
    return user


@router.get("/supported-cars", summary="List all supported Indian car models")
def list_cars():
    """Returns all Indian car models supported for ML category mapping."""
    try:
        from utils.car_model_mapper import list_supported_cars, get_category_stats
        return {
            "cars": list_supported_cars(),
            "category_stats": get_category_stats(),
            "total": len(list_supported_cars()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
