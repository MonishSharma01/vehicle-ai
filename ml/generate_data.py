"""
generate_data.py
Generates a synthetic vehicle telemetry dataset for training the failure prediction model.

Features:
  - engine_temp   : Engine temperature in °C
  - battery_voltage: Battery voltage in V
  - oil_life       : Remaining oil life in %
  - vibration      : Vibration level (0–10 scale)
  - mileage        : Vehicle mileage in km

Labels:
  - normal
  - battery_failure
  - engine_overheat
  - low_oil_life
"""

import numpy as np
import pandas as pd
import os

RANDOM_SEED = 42
NUM_SAMPLES = 2000
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "vehicle_telemetry.csv")

np.random.seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# Strict rule-based class boundaries — zero overlap on the defining feature
# ---------------------------------------------------------------------------
#
#  CLASS              DEFINING FEATURE (hard boundary)   SUPPORTING FEATURES
#  normal             engine_temp  75–100 °C             voltage 12.2–13.2 V
#                     voltage      12.2–13.2 V           oil 40–100 %
#                                                        vibration 0–2.5
#
#  battery_failure    voltage      9.0–11.4 V  (gap ≥0.8 V below normal min)
#                     engine_temp  75–105 °C
#                     oil          30–90 %
#                     vibration    0–3.5
#
#  engine_overheat    engine_temp  112–145 °C  (gap ≥12 °C above normal max)
#                     voltage      12.0–13.2 V
#                     oil          20–80 %
#                     vibration    5.0–9.5     (clearly elevated)
#
#  low_oil_life       oil_life     0–12 %      (gap ≥28 % below normal min)
#                     engine_temp  75–108 °C
#                     voltage      12.0–13.2 V
#                     vibration    2.5–6.0
# ---------------------------------------------------------------------------

def generate_normal(n):
    return pd.DataFrame({
        "engine_temp":      np.random.uniform(75.0, 100.0, n),
        "battery_voltage":  np.random.uniform(12.2, 13.2,  n),
        "oil_life":         np.random.uniform(40.0, 100.0, n),
        "vibration":        np.random.uniform(0.0,  2.5,   n),
        "mileage":          np.random.randint(0, 150_000,  n),
        "label":            "normal",
    })


def generate_battery_failure(n):
    """Defining signal: battery_voltage 9.0–11.4 V (well below normal 12.2 V floor)."""
    return pd.DataFrame({
        "engine_temp":      np.random.uniform(75.0, 105.0, n),
        "battery_voltage":  np.random.uniform(9.0,  11.4,  n),
        "oil_life":         np.random.uniform(30.0, 90.0,  n),
        "vibration":        np.random.uniform(0.0,  3.5,   n),
        "mileage":          np.random.randint(20_000, 200_000, n),
        "label":            "battery_failure",
    })


def generate_engine_overheat(n):
    """Defining signal: engine_temp 112–145 °C (well above normal 100 °C ceiling)."""
    return pd.DataFrame({
        "engine_temp":      np.random.uniform(112.0, 145.0, n),
        "battery_voltage":  np.random.uniform(12.0,  13.2,  n),
        "oil_life":         np.random.uniform(20.0,  80.0,  n),
        "vibration":        np.random.uniform(5.0,   9.5,   n),
        "mileage":          np.random.randint(10_000, 250_000, n),
        "label":            "engine_overheat",
    })


def generate_low_oil_life(n):
    """Defining signal: oil_life 0–12 % (well below normal 40 % floor)."""
    return pd.DataFrame({
        "engine_temp":      np.random.uniform(75.0, 108.0, n),
        "battery_voltage":  np.random.uniform(12.0,  13.2, n),
        "oil_life":         np.random.uniform(0.0,   12.0, n),
        "vibration":        np.random.uniform(2.5,   6.0,  n),
        "mileage":          np.random.randint(5_000, 300_000, n),
        "label":            "low_oil_life",
    })


def main():
    per_class = NUM_SAMPLES // 4

    frames = [
        generate_normal(per_class),
        generate_battery_failure(per_class),
        generate_engine_overheat(per_class),
        generate_low_oil_life(per_class),
    ]

    df = pd.concat(frames, ignore_index=True)
    df = df.sample(frac=1, random_state=RANDOM_SEED).reset_index(drop=True)  # shuffle

    # Round for cleaner presentation
    df["engine_temp"]      = df["engine_temp"].round(2)
    df["battery_voltage"]  = df["battery_voltage"].round(3)
    df["oil_life"]         = df["oil_life"].round(2)
    df["vibration"]        = df["vibration"].round(3)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"Dataset saved to: {OUTPUT_PATH}")
    print(f"Total rows  : {len(df)}")
    print(f"\nLabel distribution:")
    print(df["label"].value_counts())
    print(f"\nSample rows:")
    print(df.head(5).to_string(index=False))


if __name__ == "__main__":
    main()
