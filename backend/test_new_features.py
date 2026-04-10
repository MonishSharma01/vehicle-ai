"""
test_new_features.py — Quick smoke test for all new backend modules.
Run: python test_new_features.py  (from backend/ directory)
"""
import sys
sys.path.insert(0, '.')

errors = []

def check(label, cond, detail=""):
    if cond:
        print(f"  [PASS] {label}")
    else:
        print(f"  [FAIL] {label}: {detail}")
        errors.append(label)

# ── 1. Auth service ──────────────────────────────────────────────────────────
print("\n--- 1. auth_service ---")
try:
    from auth.auth_service import signup_user, login_user, hash_password, verify_password, signup_garage, login_garage

    h = hash_password("test123")
    check("hash_password returns non-empty hash", len(h) > 10)
    check("verify_password correct", verify_password("test123", h))
    check("verify_password wrong", not verify_password("wrong", h))

    r = signup_user("Rahul Sharma", "Tata Nexon", "MH12AB1234", "test123", phone="9876543210")
    check("user signup returns token", "token" in r)
    check("user signup returns user", "user" in r)

    r2 = login_user("9876543210", "test123")
    check("user login returns token", "token" in r2)

    r3 = login_user("9876543210", "wrongpass")
    check("user login fails with wrong password", "error" in r3)

    g = signup_garage("Sharma Auto", "Ramesh", "9111111111", "Pune", "battery,engine", "gpass123")
    check("garage signup returns token", "token" in g)
    check("garage signup has auto-generated ID", g.get("garage", {}).get("id", "").startswith("GA"))

    g2 = login_garage("9111111111", "gpass123")
    check("garage login returns token", "token" in g2)

except Exception as e:
    print(f"  [ERROR] auth_service failed: {e}")
    import traceback; traceback.print_exc()
    errors.append("auth_service")

# ── 2. Session middleware ────────────────────────────────────────────────────
print("\n--- 2. session_middleware ---")
try:
    from auth.session_middleware import get_current_user, get_current_garage, get_current_principal
    check("session_middleware imports OK", True)
except Exception as e:
    print(f"  [ERROR] session_middleware: {e}")
    errors.append("session_middleware")

# ── 3. Car model mapper ──────────────────────────────────────────────────────
print("\n--- 3. car_model_mapper ---")
try:
    from utils.car_model_mapper import (
        get_ml_category, get_telemetry_profile,
        apply_telemetry_adjustments, list_supported_cars, get_category_stats
    )
    pairs = [
        ("Tata Nexon", "SUV"),
        ("Maruti Swift", "Hatchback"),
        ("Honda City", "Sedan"),
        ("Toyota Innova", "MPV"),
        ("Hyundai Creta", "SUV"),
        ("Kia Seltos", "SUV"),
        ("Mahindra XUV700", "SUV"),
    ]
    for car, expected in pairs:
        got = get_ml_category(car)
        check(f"  {car} -> {expected}", got == expected, f"got: {got}")

    cars = list_supported_cars()
    check("list_supported_cars >= 50 models", len(cars) >= 50, f"got {len(cars)}")

    stats = get_category_stats()
    check("at least 4 categories", len(stats) >= 4)

    adjusted, cat = apply_telemetry_adjustments(
        {"engine_temp": 90.0, "oil_life": 80.0, "vibration": 0.5},
        "Tata Nexon"
    )
    check("apply_telemetry_adjustments returns dict", isinstance(adjusted, dict))
    check("engine_temp adjusted for SUV", adjusted["engine_temp"] > 90.0)

    profile = get_telemetry_profile("Tata Nexon")
    check("telemetry_profile has category", "category" in profile)

except Exception as e:
    print(f"  [ERROR] car_model_mapper: {e}")
    import traceback; traceback.print_exc()
    errors.append("car_model_mapper")

# ── 4. Analytics service ─────────────────────────────────────────────────────
print("\n--- 4. analytics_service ---")
try:
    from services.analytics_service import AnalyticsService

    svc = AnalyticsService()
    snap = svc.summary_snapshot()
    check("snapshot has total_vehicles", "total_vehicles" in snap)
    check("snapshot has generated_at", "generated_at" in snap)

    dist = svc.error_distribution()
    check("error_distribution returns list", isinstance(dist, list))

    freq = svc.car_model_frequency()
    check("car_model_frequency returns list", isinstance(freq, list))

    perf = svc.garage_performance()
    check("garage_performance returns list", isinstance(perf, list))

    eot = svc.errors_over_time()
    check("errors_over_time returns list", isinstance(eot, list))

except Exception as e:
    print(f"  [ERROR] analytics_service: {e}")
    import traceback; traceback.print_exc()
    errors.append("analytics_service")

# ── 5. API route imports ─────────────────────────────────────────────────────
print("\n--- 5. API route imports ---")
try:
    from api.user_routes import router as ur
    check("user_routes router imports OK", ur is not None)
except Exception as e:
    print(f"  [ERROR] user_routes: {e}")
    errors.append("user_routes")

try:
    from api.garage_routes import router as gr
    check("garage_routes router imports OK", gr is not None)
except Exception as e:
    print(f"  [ERROR] garage_routes: {e}")
    errors.append("garage_routes")

try:
    from api.admin_routes import router as ar
    check("admin_routes router imports OK", ar is not None)
except Exception as e:
    print(f"  [ERROR] admin_routes: {e}")
    errors.append("admin_routes")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 50)
if errors:
    print(f"FAILED: {len(errors)} module(s): {errors}")
    sys.exit(1)
else:
    print("ALL TESTS PASSED!")
