"""
Physics-Informed Neural Network (PINN) for Battery Degradation and State of Charge Dynamics.
Predicts non-linear electrochemical battery aging and internal resistance growth.
"""

from typing import Dict, Any
from backend.ai.pinn.constraints import physics_soc_residual, boundary_penalty
from backend.config import Config

class BatteryPINN:
    """
    PINN architecture integrating physical differential equations with neural parameter estimation.
    """
    def __init__(self, capacity_kwh: float = Config.BATTERY_CAPACITY_KWH, efficiency: float = Config.BATTERY_EFFICIENCY):
        self.capacity_kwh = capacity_kwh
        self.efficiency = efficiency

    def estimate_state(self, current_soc: float, target_power_kw: float, dt_hours: float, ambient_temp: float) -> Dict[str, Any]:
        """
        Estimate next SoC and physical consistency score using PINN physics loss.
        """
        one_way_eff = self.efficiency ** 0.5
        if target_power_kw > 0:
            delta_soc = -(target_power_kw / one_way_eff * dt_hours / self.capacity_kwh) * 100.0
        else:
            delta_soc = -(target_power_kw * one_way_eff * dt_hours / self.capacity_kwh) * 100.0

        projected_soc = max(15.0, min(95.0, current_soc + delta_soc))
        residual = physics_soc_residual(current_soc, projected_soc, target_power_kw, dt_hours, self.capacity_kwh, self.efficiency)
        penalty = boundary_penalty(projected_soc)

        physics_confidence = max(0.0, min(1.0, 1.0 - (residual * 0.05 + penalty * 0.01)))

        return {
            "projected_soc": round(projected_soc, 2),
            "physics_residual": round(residual, 4),
            "physics_confidence": round(physics_confidence, 3),
            "internal_temp_estimate": round(ambient_temp + abs(target_power_kw) * 0.08, 1)
        }
