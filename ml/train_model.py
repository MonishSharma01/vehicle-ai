"""
train_model.py
Trains a RandomForestClassifier on the synthetic vehicle telemetry dataset
and saves the model to saved_models/vehicle_failure_model.pkl
"""

import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib

DATA_PATH  = os.path.join(os.path.dirname(__file__), "data", "vehicle_telemetry.csv")
MODEL_DIR  = os.path.join(os.path.dirname(__file__), "saved_models")
MODEL_PATH = os.path.join(MODEL_DIR, "vehicle_failure_model.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

FEATURE_COLS = ["engine_temp", "battery_voltage", "oil_life", "vibration", "mileage"]
LABEL_COL    = "label"
RANDOM_SEED  = 42


def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}.\n"
            "Run generate_data.py first: python generate_data.py"
        )
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded {len(df)} rows from {DATA_PATH}")
    return df


def train(df):
    X = df[FEATURE_COLS].values
    y = df[LABEL_COL].values

    # Encode string labels → integers (needed for probability output)
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, random_state=RANDOM_SEED, stratify=y_enc
    )

    print(f"\nTraining on {len(X_train)} samples, testing on {len(X_test)} samples")
    print(f"Classes: {list(le.classes_)}")

    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=10,
        min_samples_split=5,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest Accuracy: {acc * 100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Feature importance
    importances = dict(zip(FEATURE_COLS, model.feature_importances_))
    print("Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: -x[1]):
        print(f"  {feat:<20} {imp:.4f}")

    return model, le


def save(model, le):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(le, ENCODER_PATH)
    print(f"\nModel saved   : {MODEL_PATH}")
    print(f"Encoder saved : {ENCODER_PATH}")


def main():
    df = load_data()
    model, le = train(df)
    save(model, le)
    print("\nTraining complete.")


if __name__ == "__main__":
    main()
