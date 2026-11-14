"""
Physics-Informed Neural Network (PINN) for Battery Degradation and State of Charge Dynamics.
Surrogate neural model predicting electrochemical battery state transitions with physical constraints.
"""

import os
from pathlib import Path
from typing import Dict, Any
import numpy as np

from backend.ai.pinn.constraints import physics_soc_residual, boundary_penalty
from backend.config import Config
from backend.utils.logger import logger

_PINN_MODEL_CACHE = None

def _get_pinn_model():
    global _PINN_MODEL_CACHE
    if _PINN_MODEL_CACHE is not None:
        return _PINN_MODEL_CACHE

    model_path = Path("models/pinn_model.keras")
    if not model_path.exists():
        # Check relative to backend/project root
        candidate = Path(__file__).resolve().parents[3] / "models" / "pinn_model.keras"
        if candidate.exists():
            model_path = candidate

    if model_path.exists():
        try:
            import tensorflow as tf
            from backend.ai.pinn.pinn_net import BatteryPINNNet
            # Load Keras model
            _PINN_MODEL_CACHE = tf.keras.models.load_model(
                str(model_path),
                custom_objects={"BatteryPINNNet": BatteryPINNNet},
                compile=False
            )
            logger.info(f"Loaded trained Battery PINN model from {model_path}")
        except Exception as e:
            logger.warning(f"Could not load trained PINN model from {model_path}: {e}. Using formula fallback.")
            _PINN_MODEL_CACHE = False
    else:
        _PINN_MODEL_CACHE = False

    return _PINN_MODEL_CACHE

class BatteryPINN:
    """
    PINN architecture integrating physical differential equations with neural parameter estimation.
    Uses trained neural surrogate when models/pinn_model.keras is available, falling back
    to analytical physical equations.
    """
    def __init__(self, capacity_kwh: float = Config.BATTERY_CAPACITY_KWH, efficiency: float = Config.BATTERY_EFFICIENCY):
        self.capacity_kwh = capacity_kwh
        self.efficiency = efficiency

    def estimate_state(self, current_soc: float, target_power_kw: float, dt_hours: float, ambient_temp: float) -> Dict[str, Any]:
        """
        Estimate next SoC, temperature, and physical consistency score.
        Signature is preserved for full backwards-compatibility.
        """
        model = _get_pinn_model()

        if model is not False and model is not None:
            try:
                import tensorflow as tf
                inputs = np.array([[current_soc, target_power_kw, ambient_temp, dt_hours]], dtype=np.float32)
                preds = model(tf.convert_to_tensor(inputs), training=False).numpy()[0]
                projected_soc = float(np.clip(preds[0], 15.0, 95.0))
                internal_temp_estimate = float(preds[1])
                method = "trained_pinn"
            except Exception as e:
                logger.warning(f"Error evaluating PINN model: {e}. Falling back to formula.")
                model = False

        if model is False or model is None:
            one_way_eff = self.efficiency ** 0.5
            if target_power_kw > 0:
                delta_soc = -(target_power_kw / one_way_eff * dt_hours / self.capacity_kwh) * 100.0
            else:
                delta_soc = -(target_power_kw * one_way_eff * dt_hours / self.capacity_kwh) * 100.0

            projected_soc = max(15.0, min(95.0, current_soc + delta_soc))
            internal_temp_estimate = ambient_temp + abs(target_power_kw) * 0.08
            method = "physics_formula"

        residual = physics_soc_residual(current_soc, projected_soc, target_power_kw, dt_hours, self.capacity_kwh, self.efficiency)
        penalty = boundary_penalty(projected_soc)
        physics_confidence = max(0.0, min(1.0, 1.0 - (residual * 0.05 + penalty * 0.01)))

        return {
            "projected_soc": round(projected_soc, 2),
            "physics_residual": round(residual, 4),
            "physics_confidence": round(physics_confidence, 3),
            "internal_temp_estimate": round(internal_temp_estimate, 1),
            "method": method
        }
