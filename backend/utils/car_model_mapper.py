"""
car_model_mapper.py — Maps Indian car model names to ML-compatible categories.

This is a pure preprocessing layer — does NOT modify ML model logic.
The ML model expects a vehicle category (SUV, Sedan, Hatchback, MPV, etc.)
And a telemetry profile adjusted for that category's typical sensor ranges.

Usage:
    from utils.car_model_mapper import get_ml_category, get_telemetry_profile

    category = get_ml_category("Tata Nexon")  # → "SUV"
    profile  = get_telemetry_profile("Tata Nexon")  # → adjusted sensor thresholds
"""

from typing import Dict, Optional, Tuple

# ── Indian Car → ML Category mapping ─────────────────────────────────────────
# Categories match what the ML model was trained on.
INDIAN_CAR_CATEGORIES: Dict[str, str] = {
    # ── Tata ─────────────────────────────────────────────────────────────
    "tata nexon":           "SUV",
    "tata harrier":         "SUV",
    "tata safari":          "SUV",
    "tata punch":           "Micro SUV",
    "tata tiago":           "Hatchback",
    "tata tigor":           "Sedan",
    "tata altroz":          "Hatchback",
    "tata hexa":            "MPV",
    "tata sumo":            "MPV",
    "tata indica":          "Hatchback",
    "tata nexon ev":        "SUV",
    "tata tiago ev":        "Hatchback",
    "tata tigor ev":        "Sedan",

    # ── Maruti Suzuki ─────────────────────────────────────────────────────
    "maruti swift":         "Hatchback",
    "maruti baleno":        "Hatchback",
    "maruti alto":          "Hatchback",
    "maruti alto k10":      "Hatchback",
    "maruti wagon r":       "Hatchback",
    "maruti celerio":       "Hatchback",
    "maruti s-presso":      "Micro SUV",
    "maruti vitara brezza": "SUV",
    "maruti brezza":        "SUV",
    "maruti grand vitara":  "SUV",
    "maruti ertiga":        "MPV",
    "maruti xl6":           "MPV",
    "maruti ciaz":          "Sedan",
    "maruti dzire":         "Sedan",
    "maruti ignis":         "Hatchback",
    "maruti eeco":          "MPV",
    "maruti jimny":         "SUV",
    "maruti fronx":         "SUV",
    "maruti invicto":       "MPV",

    # ── Hyundai ───────────────────────────────────────────────────────────
    "hyundai creta":        "SUV",
    "hyundai venue":        "SUV",
    "hyundai i20":          "Hatchback",
    "hyundai grand i10":    "Hatchback",
    "hyundai nios":         "Hatchback",
    "hyundai aura":         "Sedan",
    "hyundai verna":        "Sedan",
    "hyundai tucson":       "SUV",
    "hyundai alcazar":      "SUV",
    "hyundai kona":         "SUV",
    "hyundai exter":        "Micro SUV",
    "hyundai ioniq 5":      "SUV",

    # ── Kia ───────────────────────────────────────────────────────────────
    "kia seltos":           "SUV",
    "kia sonet":            "SUV",
    "kia carens":           "MPV",
    "kia carnival":         "MPV",
    "kia ev6":              "SUV",

    # ── Mahindra ──────────────────────────────────────────────────────────
    "mahindra xuv700":      "SUV",
    "mahindra xuv300":      "SUV",
    "mahindra xuv400":      "SUV",
    "mahindra scorpio":     "SUV",
    "mahindra scorpio n":   "SUV",
    "mahindra thar":        "SUV",
    "mahindra bolero":      "SUV",
    "mahindra be6e":        "SUV",
    "mahindra xe6e":        "SUV",

    # ── Honda ─────────────────────────────────────────────────────────────
    "honda city":           "Sedan",
    "honda amaze":          "Sedan",
    "honda elevate":        "SUV",
    "honda jazz":           "Hatchback",
    "honda wr-v":           "SUV",
    "honda cr-v":           "SUV",

    # ── Toyota ────────────────────────────────────────────────────────────
    "toyota innova":        "MPV",
    "toyota innova crysta": "MPV",
    "toyota innova hycross": "MPV",
    "toyota fortuner":      "SUV",
    "toyota glanza":        "Hatchback",
    "toyota urban cruiser": "SUV",
    "toyota hyryder":       "SUV",
    "toyota camry":         "Sedan",
    "toyota etios":         "Sedan",

    # ── Skoda ─────────────────────────────────────────────────────────────
    "skoda kushaq":         "SUV",
    "skoda slavia":         "Sedan",
    "skoda octavia":        "Sedan",
    "skoda superb":         "Sedan",
    "skoda kodiaq":         "SUV",

    # ── Volkswagen ────────────────────────────────────────────────────────
    "volkswagen taigun":    "SUV",
    "volkswagen virtus":    "Sedan",
    "volkswagen polo":      "Hatchback",
    "volkswagen vento":     "Sedan",

    # ── Renault ───────────────────────────────────────────────────────────
    "renault kwid":         "Hatchback",
    "renault triber":       "MPV",
    "renault kiger":        "SUV",
    "renault duster":       "SUV",

    # ── Nissan ────────────────────────────────────────────────────────────
    "nissan magnite":       "SUV",
    "nissan kicks":         "SUV",
    "nissan gt-r":          "Sports",

    # ── MG ────────────────────────────────────────────────────────────────
    "mg hector":            "SUV",
    "mg hector plus":       "SUV",
    "mg astor":             "SUV",
    "mg gloster":           "SUV",
    "mg comet ev":          "Hatchback",
    "mg zs ev":             "SUV",

    # ── Jeep ──────────────────────────────────────────────────────────────
    "jeep compass":         "SUV",
    "jeep meridian":        "SUV",
    "jeep wrangler":        "SUV",

    # ── Ford (legacy, still on road) ─────────────────────────────────────
    "ford ecosport":        "SUV",
    "ford endeavour":       "SUV",
    "ford figo":            "Hatchback",
    "ford aspire":          "Sedan",

    # ── International models common in India ─────────────────────────────
    "tesla model 3":        "Sedan",
    "tesla model s":        "Sedan",
    "tesla model x":        "SUV",
    "tesla model y":        "SUV",
    "honda city":           "Sedan",
    "ford mustang":         "Sports",
    "bmw 3 series":         "Sedan",
    "bmw 5 series":         "Sedan",
    "mercedes c class":     "Sedan",
    "mercedes e class":     "Sedan",
    "audi a4":              "Sedan",
    "audi q5":              "SUV",
}

# ── Category → telemetry profile adjustments ──────────────────────────────────
# These multipliers/offsets are applied to the raw telemetry before sending
# to the ML model, to account for different vehicle classes.
# The ML model is NOT modified — inputs are adjusted instead.
CATEGORY_TELEMETRY_PROFILE: Dict[str, Dict] = {
    "SUV": {
        "engine_temp_offset": 2.5,      # SUVs run slightly hotter
        "oil_life_factor": 0.92,         # SUVs burn oil slightly faster
        "vibration_baseline": 0.05,      # Higher vibration baseline
        "battery_voltage_min": 12.2,
        "description": "Sports Utility Vehicle",
    },
    "Sedan": {
        "engine_temp_offset": 0.0,
        "oil_life_factor": 1.0,
        "vibration_baseline": 0.02,
        "battery_voltage_min": 12.0,
        "description": "Sedan",
    },
    "Hatchback": {
        "engine_temp_offset": -1.0,     # Smaller engines run cooler
        "oil_life_factor": 1.05,         # Efficient oil usage
        "vibration_baseline": 0.03,
        "battery_voltage_min": 11.8,
        "description": "Hatchback",
    },
    "MPV": {
        "engine_temp_offset": 3.0,      # Larger capacity, runs hotter
        "oil_life_factor": 0.88,
        "vibration_baseline": 0.06,
        "battery_voltage_min": 12.2,
        "description": "Multi-Purpose Vehicle",
    },
    "Micro SUV": {
        "engine_temp_offset": 0.5,
        "oil_life_factor": 1.0,
        "vibration_baseline": 0.04,
        "battery_voltage_min": 11.9,
        "description": "Micro SUV",
    },
    "Sports": {
        "engine_temp_offset": 5.0,      # High-performance engines run hot
        "oil_life_factor": 0.80,
        "vibration_baseline": 0.08,
        "battery_voltage_min": 12.5,
        "description": "Sports Car",
    },
    "Unknown": {
        "engine_temp_offset": 0.0,
        "oil_life_factor": 1.0,
        "vibration_baseline": 0.02,
        "battery_voltage_min": 12.0,
        "description": "Unknown",
    },
}


def get_ml_category(car_model: str) -> str:
    """
    Map an Indian car model name to its ML category.
    Returns 'Unknown' if not found in the mapping table.
    """
    normalized = car_model.strip().lower()
    
    # Exact match
    if normalized in INDIAN_CAR_CATEGORIES:
        return INDIAN_CAR_CATEGORIES[normalized]
    
    # Partial match — find the best substring match
    for model_key, category in INDIAN_CAR_CATEGORIES.items():
        if model_key in normalized or normalized in model_key:
            return category
    
    # Keyword-based fallback
    if any(kw in normalized for kw in ["suv", "cruiser", "rover", "pajero", "fortuner"]):
        return "SUV"
    if any(kw in normalized for kw in ["hatch", "wago", "swift", "alto", "i10", "i20"]):
        return "Hatchback"
    if any(kw in normalized for kw in ["sedan", "city", "verna", "ciaz", "dzire"]):
        return "Sedan"
    if any(kw in normalized for kw in ["innova", "ertiga", "carens", "mpv", "van"]):
        return "MPV"
    
    return "Unknown"


def get_telemetry_profile(car_model: str) -> Dict:
    """Return telemetry adjustment profile for a given car model."""
    category = get_ml_category(car_model)
    return {
        "category": category,
        **CATEGORY_TELEMETRY_PROFILE.get(category, CATEGORY_TELEMETRY_PROFILE["Unknown"])
    }


def apply_telemetry_adjustments(raw_telemetry: Dict, car_model: str) -> Tuple[Dict, str]:
    """
    Apply category-based adjustments to raw telemetry before ML inference.
    
    Args:
        raw_telemetry: Raw sensor readings dict
        car_model: Indian car model name string
    
    Returns:
        (adjusted_telemetry, category) tuple
        
    NOTE: Does NOT modify ML model. Only adjusts input preprocessing.
    """
    profile = get_telemetry_profile(car_model)
    category = profile["category"]
    
    adjusted = raw_telemetry.copy()
    
    # Apply engine temperature offset
    if "engine_temp" in adjusted and adjusted["engine_temp"] is not None:
        adjusted["engine_temp"] = adjusted["engine_temp"] + profile["engine_temp_offset"]
    
    # Apply oil life factor 
    if "oil_life" in adjusted and adjusted["oil_life"] is not None:
        adjusted["oil_life"] = max(0.0, adjusted["oil_life"] * profile["oil_life_factor"])
    
    # Apply vibration baseline correction
    if "vibration" in adjusted and adjusted["vibration"] is not None:
        adjusted["vibration"] = max(0.0, adjusted["vibration"] - profile["vibration_baseline"])
    
    return adjusted, category


def list_supported_cars() -> list:
    """Return sorted list of all supported Indian car models."""
    return sorted(INDIAN_CAR_CATEGORIES.keys())


def get_category_stats() -> Dict:
    """Return count of cars per category."""
    stats: Dict[str, int] = {}
    for cat in INDIAN_CAR_CATEGORIES.values():
        stats[cat] = stats.get(cat, 0) + 1
    return stats


# ── CLI test ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    test_cars = [
        "Tata Nexon", "Maruti Swift", "Hyundai Creta",
        "Mahindra XUV700", "Toyota Innova", "Kia Seltos",
        "Honda City", "Unknown Model XYZ", "Tesla Model 3"
    ]
    print("\n🚗 Indian Car Model → ML Category Mapping\n" + "─" * 50)
    for car in test_cars:
        cat = get_ml_category(car)
        profile = get_telemetry_profile(car)
        print(f"  {car:<28} → {cat:<12} | eng_offset={profile['engine_temp_offset']:+.1f}°C")
    
    print(f"\n📊 Category distribution: {get_category_stats()}")
    print(f"📋 Total supported models: {len(INDIAN_CAR_CATEGORIES)}")
