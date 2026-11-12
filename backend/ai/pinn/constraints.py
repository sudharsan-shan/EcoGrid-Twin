"""
Physical conservation laws and boundary constraints for Physics-Informed Neural Networks (PINN).
Enforces physical thermodynamics and electrochemical limits on battery state updates.
"""

import numpy as np

def physics_soc_residual(soc_prev: float, soc_next: float, power_kw: float, dt_hours: float, capacity_kwh: float, efficiency: float) -> float:
    """
    Computes energy balance residual:
    Residual = (SoC_next - SoC_prev) - Delta_SoC_physics
    """
    one_way_eff = efficiency ** 0.5
    if power_kw > 0:  # Discharging
        expected_delta = -(power_kw / one_way_eff * dt_hours / capacity_kwh) * 100.0
    else:  # Charging
        expected_delta = -(power_kw * one_way_eff * dt_hours / capacity_kwh) * 100.0

    actual_delta = soc_next - soc_prev
    return abs(actual_delta - expected_delta)

def boundary_penalty(soc: float, min_soc: float = 15.0, max_soc: float = 95.0) -> float:
    """Penalty for SoC boundary excursions."""
    penalty = 0.0
    if soc < min_soc:
        penalty += (min_soc - soc) ** 2
    if soc > max_soc:
        penalty += (soc - max_soc) ** 2
    return penalty
