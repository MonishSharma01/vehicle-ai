"""
auth_service.py — JWT-based authentication for users and garages.

Strategy:
  - Passwords hashed with bcrypt (passlib)
  - JWTs signed with HS256 (python-jose)
  - Tokens stored in Supabase users/garages tables
  - In-memory fallback so system works without Supabase
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt

# ── Config ────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "vehicle-ai-super-secret-key-change-in-prod-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days — persistent login

# ── In-memory user/garage stores (fallback when Supabase unavailable) ─────────
_users_db: dict = {}    # email/phone → user record
_garages_db: dict = {}  # phone → garage record

# ── Demo vehicle assignment ───────────────────────────────────────────────────
_DEMO_VEHICLE_IDS = ["V001", "V002", "V003"]
_vehicle_counter = 0


def _assign_demo_vehicle() -> str:
    global _vehicle_counter
    vid = _DEMO_VEHICLE_IDS[_vehicle_counter % len(_DEMO_VEHICLE_IDS)]
    _vehicle_counter += 1
    return vid


# ── Password helpers ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


# ── JWT helpers ──────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── User auth ────────────────────────────────────────────────────────────────

def signup_user(name: str, car_model: str, car_number_plate: str,
                password: str, phone: str = "", email: str = "") -> dict:
    """Register a new user. Returns user record + JWT token."""
    key = (email or phone).strip().lower()
    if not key:
        return {"error": "Email or phone required"}
    if key in _users_db:
        return {"error": "User already exists"}

    user_id = str(uuid.uuid4())
    password_hash = hash_password(password)
    vehicle_id = _assign_demo_vehicle()

    user = {
        "id": user_id,
        "name": name,
        "car_model": car_model,
        "car_number_plate": car_number_plate.upper().strip(),
        "vehicle_id": vehicle_id,
        "phone": phone,
        "email": email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _users_db[key] = user

    # Persist to Supabase (fire-and-forget)
    _persist_user(user)

    token = create_access_token({"sub": user_id, "type": "user", "email": email, "phone": phone})
    return {"user": _safe_user(user), "token": token}


def login_user(identifier: str, password: str) -> dict:
    """Login with email or phone. Returns user record + JWT token."""
    key = identifier.strip().lower()
    
    # Try in-memory first
    user = _users_db.get(key)
    
    # Try Supabase if not in memory
    if not user:
        user = _fetch_user_from_supabase(key)
    
    if not user:
        return {"error": "User not found"}
    if not verify_password(password, user["password_hash"]):
        return {"error": "Invalid password"}

    token = create_access_token({
        "sub": user["id"], "type": "user",
        "email": user.get("email", ""), "phone": user.get("phone", "")
    })
    return {"user": _safe_user(user), "token": token}


def get_user_by_id(user_id: str) -> Optional[dict]:
    for u in _users_db.values():
        if u["id"] == user_id:
            return _safe_user(u)
    return None


# ── Garage auth ───────────────────────────────────────────────────────────────

def signup_garage(garage_name: str, owner_name: str, phone: str,
                  location: str, specialization: str, password: str,
                  email: str = "") -> dict:
    """Register a new garage. Returns garage record + JWT token."""
    key = phone.strip()
    if key in _garages_db:
        return {"error": "Garage already exists with this phone"}

    garage_id = "GA" + str(uuid.uuid4())[:8].upper()
    password_hash = hash_password(password)

    garage = {
        "id": garage_id,
        "garage_name": garage_name,
        "owner_name": owner_name,
        "phone": phone,
        "email": email,
        "location": location,
        "specialization": specialization,
        "rating": 0.0,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _garages_db[key] = garage

    _persist_garage(garage)

    token = create_access_token({"sub": garage_id, "type": "garage", "phone": phone})
    return {"garage": _safe_garage(garage), "token": token}


def login_garage(identifier: str, password: str) -> dict:
    """Login garage with phone or email."""
    key = identifier.strip()
    garage = _garages_db.get(key)
    
    if not garage:
        garage = _fetch_garage_from_supabase(key)

    if not garage:
        return {"error": "Garage not found"}
    if not verify_password(password, garage["password_hash"]):
        return {"error": "Invalid password"}

    token = create_access_token({
        "sub": garage["id"], "type": "garage", "phone": garage["phone"]
    })
    return {"garage": _safe_garage(garage), "token": token}


def get_garage_by_id(garage_id: str) -> Optional[dict]:
    for g in _garages_db.values():
        if g["id"] == garage_id:
            return _safe_garage(g)
    return None


# ── Safe serializers (strip password_hash) ───────────────────────────────────

def _safe_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != "password_hash"}


def _safe_garage(g: dict) -> dict:
    return {k: v for k, v in g.items() if k != "password_hash"}


# ── Supabase persistence helpers ──────────────────────────────────────────────

def _persist_user(user: dict) -> None:
    try:
        from db.supabase_client import get_client
        client = get_client()
        if client:
            client.table("users").upsert({
                "id": user["id"],
                "name": user["name"],
                "car_number_plate": user["car_number_plate"],
                "phone": user["phone"],
                "email": user["email"],
                "password_hash": user["password_hash"],
                "created_at": user["created_at"],
            }, on_conflict="id").execute()
    except Exception as e:
        print(f"[AUTH] Supabase user persist skipped: {e}")


def _persist_garage(garage: dict) -> None:
    try:
        from db.supabase_client import get_client
        client = get_client()
        if client:
            client.table("garages_auth").upsert({
                "id": garage["id"],
                "garage_name": garage["garage_name"],
                "owner_name": garage["owner_name"],
                "phone": garage["phone"],
                "email": garage.get("email", ""),
                "location": garage["location"],
                "specialization": garage["specialization"],
                "rating": garage["rating"],
                "password_hash": garage["password_hash"],
                "created_at": garage["created_at"],
            }, on_conflict="id").execute()
    except Exception as e:
        print(f"[AUTH] Supabase garage persist skipped: {e}")


def _fetch_user_from_supabase(identifier: str) -> Optional[dict]:
    try:
        from db.supabase_client import get_client
        client = get_client()
        if not client:
            return None
        # Try email first, then phone
        resp = client.table("users").select("*").eq("email", identifier).execute()
        if not resp.data:
            resp = client.table("users").select("*").eq("phone", identifier).execute()
        if resp.data:
            user = resp.data[0]
            key = (user.get("email") or user.get("phone", "")).lower()
            _users_db[key] = user  # cache locally
            return user
    except Exception:
        pass
    return None


def _fetch_garage_from_supabase(identifier: str) -> Optional[dict]:
    try:
        from db.supabase_client import get_client
        client = get_client()
        if not client:
            return None
        resp = client.table("garages_auth").select("*").eq("phone", identifier).execute()
        if not resp.data:
            resp = client.table("garages_auth").select("*").eq("email", identifier).execute()
        if resp.data:
            garage = resp.data[0]
            _garages_db[garage["phone"]] = garage
            return garage
    except Exception:
        pass
    return None
