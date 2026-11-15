"""
Physics-Informed Neural Network (PINN) for Battery Degradation and State of Charge Dynamics.
Surrogate neural model predicting electrochemical battery state transitions with physical constraints.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np

from backend.ai.pinn.constraints import physics_soc_residual, boundary_penalty
from backend.config import Config
from backend.utils.logger import logger

_PINN_MODEL_CACHE = None

def _get_pinn_model():
    global _PINN_MODEL_CACHE
    if _PINN_MODEL_CACHE is not None:
        return _PINN_MODEL_CACHE

    weights_path = Path("models/pinn_model.weights.h5")
    model_path = Path("models/pinn_model.keras")

    if not weights_path.exists():
        candidate = Path(__file__).resolve().parents[3] / "models" / "pinn_model.weights.h5"
        if candidate.exists():
            weights_path = candidate

    if not model_path.exists():
        candidate = Path(__file__).resolve().parents[3] / "models" / "pinn_model.keras"
        if candidate.exists():
            model_path = candidate

    try:
        from backend.ai.pinn.pinn_net import create_pinn_model
        model = create_pinn_model()
        if weights_path.exists():
            model.load_weights(str(weights_path))
            _PINN_MODEL_CACHE = model
            logger.info(f"Loaded trained Battery PINN weights from {weights_path}")
            return _PINN_MODEL_CACHE
        elif model_path.exists():
            import tensorflow as tf
            from backend.ai.pinn.pinn_net import BatteryPINNNet
            loaded = tf.keras.models.load_model(
                str(model_path),
                custom_objects={"BatteryPINNNet": BatteryPINNNet},
                compile=False
            )
            if len(loaded.weights) > 0:
                _PINN_MODEL_CACHE = loaded
                logger.info(f"Loaded trained Battery PINN model from {model_path}")
                return _PINN_MODEL_CACHE
    except Exception as e:
        logger.warning(f"Could not load PINN model: {e}. Falling back to formula.")

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

    def estimate_state(
        self,
        current_soc: float,
        target_power_kw: float,
        dt_hours: float,
        ambient_temp: float,
        current_temp: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Estimate next SoC, temperature, and physical consistency score.
        Signature is preserved for full backwards-compatibility.

        Parameters
        ----------
        current_soc : float
            Current battery state of charge in percent [0–100].
        target_power_kw : float
            The APPLIED (actual/clipped) power in kW — i.e. the power the battery
            physically handled after SOC and power-limit clipping, NOT the commanded
            (requested) power. When calling from the dispatcher, pass the value returned
            by battery.step() as `actual_power_kw`, not the raw dispatch command.
            Positive = discharge, negative = charge.
        dt_hours : float
            Time step duration in hours.
        ambient_temp : float
            Ambient temperature in degrees Celsius.
        current_temp : Optional[float]
            Current battery cell temperature in °C. If omitted, defaults to ambient_temp.
        """
        model = _get_pinn_model()
        cell_temp = current_temp if current_temp is not None else ambient_temp

        if model is not False and model is not None:
            try:
                import tensorflow as tf
                # 5 features: [soc_prev, temp_prev, actual_power_kw, ambient_temp_c, dt_hours]
                inputs = np.array([[current_soc, cell_temp, target_power_kw, ambient_temp, dt_hours]], dtype=np.float32)
                preds = model(tf.convert_to_tensor(inputs), training=False).numpy()[0]
                delta_soc = float(preds[0] - current_soc)
                if self.capacity_kwh != Config.BATTERY_CAPACITY_KWH:
                    delta_soc *= (Config.BATTERY_CAPACITY_KWH / max(1.0, self.capacity_kwh))
                projected_soc = float(np.clip(current_soc + delta_soc, 15.0, 95.0))
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
            c_rate = abs(target_power_kw) / max(1.0, self.capacity_kwh)
            heating = c_rate * 3.5
            cooling = 0.15 * (cell_temp - ambient_temp)
            internal_temp_estimate = cell_temp + (heating - cooling) * (dt_hours * 4.0)
            internal_temp_estimate = max(10.0, min(65.0, internal_temp_estimate))
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
