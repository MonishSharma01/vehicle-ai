"""
prediction_agent.py
Prediction Agent for vehicle failure prediction.

Uses a pre-trained RandomForestClassifier to predict vehicle failures
based on telemetry data. Designed to be lightweight and callable
as a function within the Master Agent pipeline.

Features:
  - engine_temp: Engine temperature in °C
  - battery_voltage: Battery voltage in V
  - oil_life: Remaining oil life in %
  - vibration: Vibration level (0–10 scale)
  - mileage: Vehicle mileage in km

Predicted classes:
  - normal
  - battery_failure
  - engine_overheat
  - low_oil_life
"""

import os
import sys
import numpy as np
import joblib
from typing import Dict, Any, Optional

# Add backend/ml to path to import preprocessing
backend_ml_path = os.path.join(os.path.dirname(__file__), "..", "ml")
sys.path.insert(0, backend_ml_path)
from preprocessing import extract_features

# Model paths
ML_DIR = os.path.join(os.path.dirname(__file__), "..", "ml")
MODEL_PATH = os.path.join(ML_DIR, "vehicle_failure_model.pkl")
ENCODER_PATH = os.path.join(ML_DIR, "label_encoder.pkl")

# Global model cache
_model = None
_label_encoder = None


def _load_model():
    """Load model and label encoder (lazy load on first call)."""
    global _model, _label_encoder
    
    if _model is not None:
        return _model, _label_encoder
    
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found at {MODEL_PATH}. "
            "Please ensure vehicle_failure_model.pkl is in backend/ml/"
        )
    
    if not os.path.exists(ENCODER_PATH):
        raise FileNotFoundError(
            f"Label encoder not found at {ENCODER_PATH}. "
            "Please ensure label_encoder.pkl is in backend/ml/"
        )
    
    _model = joblib.load(MODEL_PATH)
    _label_encoder = joblib.load(ENCODER_PATH)
    
    return _model, _label_encoder


class PredictionAgent:
    """Prediction Agent for vehicle failure forecasting."""
    
    def __init__(self):
        """Initialize the prediction agent, loading the model on first use."""
        self.model = None
        self.label_encoder = None
        self._initialized = False
    
    def _ensure_loaded(self):
        """Ensure model is loaded."""
        if not self._initialized:
            self.model, self.label_encoder = _load_model()
            self._initialized = True
    
    def predict_failure(self, telemetry_dict: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict vehicle failure type from telemetry data.
        
        This is the main prediction interface for the Master Agent pipeline.
        
        Args:
            telemetry_dict: Dictionary with vehicle telemetry
                {
                    "engine_temp": float,       # °C
                    "battery_voltage": float,   # V
                    "oil_life": float,          # %
                    "vibration": float,         # 0-10
                    "mileage": int              # km
                }
        
        Returns:
            Dict with predicted failure information:
                {
                    "prediction": str,          # Predicted class label
                    "confidence": float,        # Confidence (0.0-1.0)
                    "probabilities": {          # All class probabilities
                        "normal": float,
                        "battery_failure": float,
                        "engine_overheat": float,
                        "low_oil_life": float
                    }
                }
        
        Raises:
            ValueError: If telemetry data is invalid or missing required features
            FileNotFoundError: If model files are not found
        
        Examples:
            >>> agent = PredictionAgent()
            >>> result = agent.predict_failure({
            ...     "engine_temp": 125.0,
            ...     "battery_voltage": 12.5,
            ...     "oil_life": 50.0,
            ...     "vibration": 6.5,
            ...     "mileage": 120000
            ... })
            >>> print(result)
            {
                'prediction': 'engine_overheat',
                'confidence': 0.85,
                'probabilities': {...}
            }
        """
        self._ensure_loaded()
        
        # Extract and validate features
        features = extract_features(telemetry_dict)
        X = np.array(features).reshape(1, -1)
        
        # Get prediction and probabilities
        class_idx = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]
        
        # Decode label
        predicted_label = self.label_encoder.inverse_transform([class_idx])[0]
        confidence = float(round(probabilities[class_idx], 4))
        
        # Build probability dictionary
        prob_dict = {
            label: float(round(prob, 4))
            for label, prob in zip(self.label_encoder.classes_, probabilities)
        }
        
        return {
            "prediction": predicted_label,
            "confidence": confidence,
            "probabilities": prob_dict
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the loaded model.
        
        Returns:
            Dict with model metadata
        """
        self._ensure_loaded()
        
        return {
            "model_type": "RandomForestClassifier",
            "classes": list(self.label_encoder.classes_),
            "n_estimators": self.model.n_estimators,
            "max_depth": self.model.max_depth,
            "model_path": MODEL_PATH,
            "encoder_path": ENCODER_PATH
        }


# ============================================================================
# Convenience functions for direct usage
# ============================================================================

def predict_failure(telemetry_dict: Dict[str, float]) -> Dict[str, Any]:
    """
    Convenience function to predict vehicle failure.
    
    Usage:
        result = predict_failure({
            "engine_temp": 95.0,
            "battery_voltage": 12.5,
            "oil_life": 75.0,
            "vibration": 1.5,
            "mileage": 45000
        })
    """
    agent = PredictionAgent()
    return agent.predict_failure(telemetry_dict)


def get_model_info() -> Dict[str, Any]:
    """Get model information."""
    agent = PredictionAgent()
    return agent.get_model_info()


if __name__ == "__main__":
    # Test the agent
    agent = PredictionAgent()
    
    print("=" * 70)
    print(f"{'PREDICTION AGENT TEST':^70}")
    print("=" * 70)
    
    test_cases = [
        {
            "name": "Normal vehicle",
            "data": {
                "engine_temp": 88.0,
                "battery_voltage": 12.5,
                "oil_life": 75.0,
                "vibration": 1.5,
                "mileage": 45_000
            }
        },
        {
            "name": "Engine overheat",
            "data": {
                "engine_temp": 125.0,
                "battery_voltage": 12.3,
                "oil_life": 50.0,
                "vibration": 6.5,
                "mileage": 120_000
            }
        },
        {
            "name": "Battery failure",
            "data": {
                "engine_temp": 91.0,
                "battery_voltage": 10.5,
                "oil_life": 60.0,
                "vibration": 2.0,
                "mileage": 80_000
            }
        },
        {
            "name": "Low oil life",
            "data": {
                "engine_temp": 93.0,
                "battery_voltage": 12.4,
                "oil_life": 8.0,
                "vibration": 4.0,
                "mileage": 95_000
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n[{test_case['name']}]")
        result = agent.predict_failure(test_case["data"])
        print(f"  Prediction: {result['prediction'].upper()}")
        print(f"  Confidence: {result['confidence'] * 100:.1f}%")
        print(f"  Probabilities:")
        for failure_type, prob in result["probabilities"].items():
            print(f"    - {failure_type:<20} {prob * 100:>6.1f}%")
    
    print("\n" + "=" * 70)
    
    # Model info
    info = agent.get_model_info()
    print("\nModel Information:")
    for key, value in info.items():
        print(f"  {key}: {value}")
