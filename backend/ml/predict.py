"""
predict.py
Runtime prediction utilities for the ML pipeline.

This module provides low-level prediction functions that wrap the trained model.
For agent integration, use prediction_agent.py instead.
"""

import os
import numpy as np
import joblib
from typing import Dict, Any

MODEL_PATH = os.path.join(os.path.dirname(__file__), "vehicle_failure_model.pkl")
ENCODER_PATH = os.path.join(os.path.dirname(__file__), "label_encoder.pkl")

_model_cache = {}


def get_model():
    """Get cached model instance."""
    if "model" not in _model_cache:
        _model_cache["model"] = joblib.load(MODEL_PATH)
        _model_cache["encoder"] = joblib.load(ENCODER_PATH)
    return _model_cache["model"], _model_cache["encoder"]


def predict_proba(features: list) -> np.ndarray:
    """
    Get probability predictions for all classes.
    
    Args:
        features: [engine_temp, battery_voltage, oil_life, vibration, mileage]
    
    Returns:
        Array of probabilities for each class
    """
    model, _ = get_model()
    X = np.array(features).reshape(1, -1)
    return model.predict_proba(X)[0]


def predict_class(features: list) -> str:
    """
    Get predicted class label.
    
    Args:
        features: [engine_temp, battery_voltage, oil_life, vibration, mileage]
    
    Returns:
        Predicted failure type
    """
    model, encoder = get_model()
    X = np.array(features).reshape(1, -1)
    class_idx = model.predict(X)[0]
    return encoder.inverse_transform([class_idx])[0]
