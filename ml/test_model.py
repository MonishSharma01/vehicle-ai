"""
test_model.py
Loads the saved vehicle_failure_model.pkl and runs predictions on:
  1. A batch of hand-crafted telemetry samples (one per expected class)
  2. An interactive single-vehicle prediction demo

Usage:
    python test_model.py
"""

import os
import numpy as np
import joblib

MODEL_PATH   = os.path.join(os.path.dirname(__file__), "saved_models", "vehicle_failure_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "saved_models", "label_encoder.pkl")

FEATURE_COLS = ["engine_temp", "battery_voltage", "oil_life", "vibration", "mileage"]


def load_model():
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}.\n"
            "Run train_model.py first: python train_model.py"
        )
    model = joblib.load(MODEL_PATH)
    le    = joblib.load(ENCODER_PATH)
    print(f"Model loaded from: {MODEL_PATH}\n")
    return model, le


def predict(model, le, features: list) -> dict:
    """
    Run a single prediction.

    Args:
        features: [engine_temp, battery_voltage, oil_life, vibration, mileage]

    Returns:
        dict with predicted_issue and probability (0–1)
    """
    x = np.array(features).reshape(1, -1)
    class_idx    = model.predict(x)[0]
    probabilities = model.predict_proba(x)[0]
    confidence   = round(float(probabilities[class_idx]), 4)
    label        = le.inverse_transform([class_idx])[0]

    return {
        "predicted_issue": label,
        "probability":     confidence,
        "all_probs":       {cls: float(round(prob, 4)) for cls, prob in zip(le.classes_, probabilities)},
    }


def batch_test(model, le):
    """Test with one representative sample per expected class."""
    test_cases = [
        # Description                 engine_temp  battery_voltage  oil_life  vibration  mileage
        ("Normal vehicle",            88.0,         12.5,            75.0,     1.5,       45_000),
        ("Battery failure",           91.0,         10.5,            60.0,     2.0,       80_000),
        ("Engine overheat",          125.0,         12.3,            50.0,     6.5,       120_000),
        ("Low oil life",              93.0,         12.4,             8.0,     4.0,       95_000),
    ]

    print("=" * 70)
    print(f"{'BATCH PREDICTION TEST':^70}")
    print("=" * 70)

    for desc, *features in test_cases:
        result = predict(model, le, features)
        print(f"\n[{desc}]")
        print(f"  Input  : engine_temp={features[0]}°C | voltage={features[1]}V | "
              f"oil={features[2]}% | vib={features[3]} | mileage={features[4]:,}km")
        print(f"  Result : {result['predicted_issue'].upper()}  (confidence: {result['probability']*100:.1f}%)")
        print(f"  Probs  : {result['all_probs']}")

    print("\n" + "=" * 70)


def interactive_demo(model, le):
    """Prompt the user to enter telemetry values and get a live prediction."""
    print("\nINTERACTIVE DEMO — Enter vehicle telemetry:")
    print("(Press Ctrl+C to exit)\n")

    defaults = [91.0, 12.5, 55.0, 2.0, 60_000]
    labels   = [
        ("Engine temperature (°C)",  "e.g. 90"),
        ("Battery voltage (V)",       "e.g. 12.5"),
        ("Oil life (%)",              "e.g. 55"),
        ("Vibration level (0–10)",    "e.g. 2"),
        ("Mileage (km)",              "e.g. 60000"),
    ]

    values = []
    for i, ((name, hint), default) in enumerate(zip(labels, defaults)):
        raw = input(f"  {name} [{hint}, default={default}]: ").strip()
        values.append(float(raw) if raw else default)

    result = predict(model, le, values)
    print(f"\n  PREDICTION : {result['predicted_issue'].upper()}")
    print(f"  CONFIDENCE : {result['probability'] * 100:.1f}%")
    print(f"  ALL PROBS  : {result['all_probs']}")


def main():
    model, le = load_model()
    batch_test(model, le)

    try:
        interactive_demo(model, le)
    except (KeyboardInterrupt, EOFError):
        print("\nInteractive demo skipped.")


if __name__ == "__main__":
    main()
