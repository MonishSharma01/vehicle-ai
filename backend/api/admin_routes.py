"""
admin_routes.py — Admin analytics API endpoints.

Prefix: /admin
All endpoints are open access (hackathon scope).
In production, protect with get_current_admin dependency.
"""

from fastapi import APIRouter, HTTPException
from services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin", tags=["Admin Analytics"])


def _svc() -> AnalyticsService:
    """Factory — creates a fresh AnalyticsService per request."""
    return AnalyticsService()


# ── Analytics endpoints ───────────────────────────────────────────────────────

@router.get("/analytics/errors-over-time",
            summary="Error count grouped by hour (line chart)")
def errors_over_time():
    """
    Returns a time-series list for the 'Errors Over Time' line chart.
    
    Response format:
        [{"time": "14:00", "count": 3}, ...]
    """
    try:
        return _svc().errors_over_time()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/car-model-frequency",
            summary="Error count per car model (bar chart)")
def car_model_frequency():
    """
    Returns error counts per vehicle model for the bar chart.
    
    Response format:
        [{"car_model": "Tesla Model 3", "count": 5}, ...]
    """
    try:
        return _svc().car_model_frequency()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/error-distribution",
            summary="Issue type distribution (pie chart)")
def error_distribution():
    """
    Returns breakdown of issue types for the pie/doughnut chart.
    
    Response format:
        [{"issue_type": "battery_failure", "label": "Battery Failure",
          "count": 8, "color": "#f59e0b", "pct": 57.1}, ...]
    """
    try:
        return _svc().error_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/garage-performance",
            summary="Garage acceptance rate & stats (bar chart)")
def garage_performance():
    """
    Returns per-garage performance metrics for the horizontal bar chart.
    
    Response format:
        [{"garage_id": "G001", "garage_name": "AutoCare Downtown",
          "accepted": 10, "rejected": 2, "completed": 8,
          "acceptance_rate": 83.3, "rating": 4.8}, ...]
    """
    try:
        return _svc().garage_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/summary",
            summary="Full analytics snapshot for admin dashboard")
def analytics_summary():
    """Returns a combined summary of all analytics metrics."""
    try:
        svc = _svc()
        return {
            "summary": svc.summary_snapshot(),
            "errors_over_time": svc.errors_over_time(),
            "car_model_frequency": svc.car_model_frequency(),
            "error_distribution": svc.error_distribution(),
            "garage_performance": svc.garage_performance(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/car-mapper",
            summary="Indian car model categories reference")
def car_mapper_reference():
    """Returns the full Indian car → ML category mapping table."""
    try:
        from utils.car_model_mapper import INDIAN_CAR_CATEGORIES, get_category_stats
        return {
            "mapping": INDIAN_CAR_CATEGORIES,
            "category_stats": get_category_stats(),
            "total_models": len(INDIAN_CAR_CATEGORIES),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
