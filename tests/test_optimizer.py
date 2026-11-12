"""
Unit tests for MicrogridOptimizer and RollingHorizonMPC.
"""

from datetime import datetime
from backend.optimization.optimizer import MicrogridOptimizer
from backend.optimization.mpc_optimizer import RollingHorizonMPC
from backend.ai.lstm.predict import generate_forecast

def test_microgrid_optimizer_schedule():
    optimizer = MicrogridOptimizer()
    forecast = generate_forecast()
    start_dt = datetime(2026, 8, 15, 0, 0)
    result = optimizer.optimize_24h(start_dt, forecast, current_soc=60.0)

    assert result["horizon_hours"] == 24
    assert len(result["schedule"]) == 24
    assert "cost_saving" in result
    assert "projected_cost" in result
    assert "co2_saved_kg" in result
    assert result["projected_cost"] >= 0.0

def test_rolling_horizon_mpc_solve():
    mpc = RollingHorizonMPC(horizon_n=6)
    pv = [0.0, 10.0, 40.0, 60.0, 50.0, 20.0]
    wind = [5.0, 5.0, 5.0, 5.0, 5.0, 5.0]
    load = [30.0, 35.0, 45.0, 50.0, 55.0, 40.0]
    prices = [6.0, 6.0, 9.5, 9.5, 9.5, 6.0]

    net_power, metrics = mpc.solve_step(
        current_actual_soc_pct=50.0,
        pv_forecast=pv,
        wind_forecast=wind,
        load_forecast=load,
        grid_prices=prices,
        dt_hours=1.0
    )

    assert metrics["optimal"] is True
    assert "planned_charge_0" in metrics
    assert "planned_discharge_0" in metrics
    assert "projected_soc_next" in metrics
