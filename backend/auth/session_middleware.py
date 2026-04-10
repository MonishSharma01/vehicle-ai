"""
session_middleware.py — FastAPI dependencies for JWT-protected routes.

Usage:
    from auth.session_middleware import get_current_user, get_current_garage

    @app.get("/protected")
    def protected(user = Depends(get_current_user)):
        return {"id": user["sub"]}
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.auth_service import decode_token, get_user_by_id, get_garage_by_id

bearer_scheme = HTTPBearer(auto_error=False)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


def _extract_payload(credentials: HTTPAuthorizationCredentials) -> dict:
    if not credentials:
        raise _CREDENTIALS_EXCEPTION
    payload = decode_token(credentials.credentials)
    if not payload:
        raise _CREDENTIALS_EXCEPTION
    return payload


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency — validates JWT and returns current user payload."""
    payload = _extract_payload(credentials)
    if payload.get("type") != "user":
        raise HTTPException(status_code=403, detail="User token required")
    return payload


def get_current_garage(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency — validates JWT and returns current garage payload."""
    payload = _extract_payload(credentials)
    if payload.get("type") != "garage":
        raise HTTPException(status_code=403, detail="Garage token required")
    return payload


def get_current_principal(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    """FastAPI dependency — accepts any valid token (user or garage)."""
    return _extract_payload(credentials)


def optional_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """Returns user payload or None — for endpoints that work with or without auth."""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if payload and payload.get("type") == "user":
        return payload
    return None
