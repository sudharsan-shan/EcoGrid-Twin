"""
Unit tests for LSTM forecasting model and inference routines.
"""

from datetime import datetime
from backend.ai.lstm.model import SolarLoadForecaster
from backend.ai.lstm.predict import generate_forecast, get_forecaster

def test_forecaster_initialization():
    forecaster = SolarLoadForecaster(solar_capacity_kw=100.0, peak_load_kw=80.0)
    assert forecaster.solar_capacity_kw == 100.0
    assert forecaster.peak_load_kw == 80.0

def test_predict_24h_shape_and_keys():
    forecaster = SolarLoadForecaster(solar_capacity_kw=120.0, peak_load_kw=110.0)
    start_dt = datetime(2026, 8, 15, 0, 0)
    forecast = forecaster.predict_24h(start_dt)
    
    assert len(forecast) == 24
    for item in forecast:
        assert "step" in item
        assert "timestamp" in item
        assert "hour" in item
        assert "solar_p10" in item
        assert "solar_p50" in item
        assert "solar_p90" in item
        assert "load_p10" in item
        assert "load_p50" in item
        assert "load_p90" in item
        assert "net_demand_kw" in item

def test_quantile_ordering():
    forecaster = SolarLoadForecaster(solar_capacity_kw=120.0, peak_load_kw=110.0)
    start_dt = datetime(2026, 8, 15, 6, 0)
    forecast = forecaster.predict_24h(start_dt)

    for item in forecast:
        assert item["solar_p10"] <= item["solar_p50"] <= item["solar_p90"]
        assert item["load_p10"] <= item["load_p50"] <= item["load_p90"]

def test_night_solar_is_zero():
    forecaster = SolarLoadForecaster()
    start_dt = datetime(2026, 8, 15, 0, 0)  # midnight
    forecast = forecaster.predict_24h(start_dt)
    
    # Hour 0 to 4 should have zero solar
    for item in forecast[:5]:
        assert item["solar_p50"] == 0.0

def test_generate_forecast_helper():
    fc = generate_forecast()
    assert len(fc) == 24
    assert get_forecaster() is not None
