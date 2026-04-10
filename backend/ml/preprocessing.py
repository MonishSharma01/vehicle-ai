"""
preprocessing.py
Feature extraction and validation for vehicle telemetry data.
"""

FEATURE_COLS = ["engine_temp", "battery_voltage", "oil_life", "vibration", "mileage"]

# Feature range validation (normal operation)
FEATURE_RANGES = {
    "engine_temp": (60.0, 150.0),      # °C
    "battery_voltage": (9.0, 14.0),    # V
    "oil_life": (0.0, 100.0),          # %
    "vibration": (0.0, 10.0),          # 0-10 scale
    "mileage": (0, 500_000)             # km
}


def validate_features(telemetry_dict: dict) -> bool:
    """
    Validate that telemetry data contains all required features and they are within ranges.
    
    Args:
        telemetry_dict: Dictionary with keys from FEATURE_COLS
        
    Returns:
        True if valid, raises ValueError otherwise
    """
    for feature in FEATURE_COLS:
        if feature not in telemetry_dict:
            raise ValueError(f"Missing required feature: {feature}")
        
        value = telemetry_dict[feature]
        min_val, max_val = FEATURE_RANGES[feature]
        
        if not (min_val <= value <= max_val):
            raise ValueError(
                f"Feature '{feature}' out of range: {value} "
                f"(expected {min_val}-{max_val})"
            )
    
    return True


def extract_features(telemetry_dict: dict) -> list:
    """
    Extract features in the correct order for model prediction.
    
    Args:
        telemetry_dict: Dictionary with telemetry data
        
    Returns:
        List of features in order: [engine_temp, battery_voltage, oil_life, vibration, mileage]
    """
    validate_features(telemetry_dict)
    return [telemetry_dict[col] for col in FEATURE_COLS]
