"""
Unit tests for Physics-Informed Neural Network (PINN) and conservation constraints.
"""

from backend.ai.pinn.model import BatteryPINN
from backend.ai.pinn.constraints import physics_soc_residual, boundary_penalty

def test_boundary_penalty_nominal():
    assert boundary_penalty(50.0) == 0.0
    assert boundary_penalty(15.0) == 0.0
    assert boundary_penalty(95.0) == 0.0

def test_boundary_penalty_excursions():
    # Below 15
    assert boundary_penalty(10.0) == 25.0
    # Above 95
    assert boundary_penalty(100.0) == 25.0

def test_physics_soc_residual():
    # When transition perfectly matches physics
    capacity = 100.0
    eff = 1.0
    dt = 1.0
    power = 20.0  # discharge 20 kW for 1 hour from 100 kWh = -20%
    res = physics_soc_residual(soc_prev=80.0, soc_next=60.0, power_kw=power, dt_hours=dt, capacity_kwh=capacity, efficiency=eff)
    assert round(res, 4) == 0.0

def test_battery_pinn_estimate_discharge():
    pinn = BatteryPINN(capacity_kwh=100.0, efficiency=0.95)
    result = pinn.estimate_state(current_soc=70.0, target_power_kw=25.0, dt_hours=0.5, ambient_temp=30.0)
    
    assert "projected_soc" in result
    assert result["projected_soc"] < 70.0
    assert 0.0 <= result["physics_confidence"] <= 1.0
    assert result["internal_temp_estimate"] >= 30.0

def test_battery_pinn_estimate_charge():
    pinn = BatteryPINN(capacity_kwh=100.0, efficiency=0.95)
    result = pinn.estimate_state(current_soc=40.0, target_power_kw=-20.0, dt_hours=0.5, ambient_temp=28.0)
    
    assert "projected_soc" in result
    assert result["projected_soc"] > 40.0
    assert 0.0 <= result["physics_confidence"] <= 1.0
