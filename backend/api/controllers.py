"""
Controllers — Business logic layer handling API requests (Tamil Nadu Edition).
Bridges HTTP/WebSocket requests to TelemetryCollector, DigitalTwin, Optimizer, WeatherService, and SQLite DB.
"""

from datetime import datetime
from typing import Dict, Any, List
from backend.adapters.collector import TelemetryCollector
from backend.services.weather_service import weather_service
from backend.digital_twin.twin import DigitalTwin
from backend.ai.lstm.predict import generate_forecast
from backend.optimization.optimizer import MicrogridOptimizer
from backend.scenario.cloudy_weather import CloudyWeatherScenario
from backend.scenario.peak_load import PeakLoadScenario
from backend.scenario.battery_failure import BatteryFailureScenario
from backend.scenario.custom_scenario import CustomScenario
from backend.database.database import SessionLocal
from backend.database import crud
from backend.config import Config
from backend.utils.logger import logger

def get_current_state() -> Dict[str, Any]:
    """Return latest real-time telemetry snapshot with data source badges and IST time."""
    collector = TelemetryCollector.get_instance()
    telemetry = collector.get_current()
    
    # Add decision support recommendations
    twin = DigitalTwin.get_instance()
    decisions = twin.decision_engine.evaluate(telemetry, twin.simulator.dispatch_mode)
    telemetry["decision_support"] = decisions
    return telemetry

def get_history(limit: int = 60) -> List[Dict[str, Any]]:
    """Return recent telemetry history for charts."""
    collector = TelemetryCollector.get_instance()
    return collector.get_history(limit=limit)

def get_weather_forecast(lat: float = None, lon: float = None) -> Dict[str, Any]:
    """Return 24-hour weather and solar irradiance forecast for Tamil Nadu site."""
    return weather_service.get_24h_forecast(lat, lon)

def get_forecast_data() -> Dict[str, Any]:
    """Return 24-hour AI predictive forecast with confidence bounds."""
    collector = TelemetryCollector.get_instance()
    telemetry = collector.get_current()
    now_dt = datetime.now()
    history = collector.get_history(20)

    recent_solar = [h.get("solar_kw", 0.0) for h in history] if history else []
    recent_load = [h.get("load_kw", 50.0) for h in history] if history else []

    forecast = generate_forecast(now_dt, recent_solar, recent_load)
    return {
        "site_name": Config.SITE_NAME,
        "city": Config.TAMILNADU_CITY,
        "generated_at": now_dt.isoformat(),
        "source": "AI Model / Neural Forecaster",
        "horizon_hours": len(forecast),
        "forecast": forecast
    }

def get_multiday_forecast(days: int = 7) -> Dict[str, Any]:
    """Return 7-day LSTM neural network predictions with NASA climate data."""
    import json
    import os
    json_path = os.path.join(Config.BASE_DIR, "frontend", "src", "config", "lstmMultiDayForecast.json")
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"status": "error", "message": "Multi-day LSTM forecast not found. Run generate_lstm_multiday.py"}

def run_optimization() -> Dict[str, Any]:
    """Run 24-hour smart dispatch optimization using TNPDCL tariffs."""
    collector = TelemetryCollector.get_instance()
    telemetry = collector.get_current()
    now_dt = datetime.now()
    forecast = generate_forecast(now_dt)
    current_soc = telemetry.get("soc", 65.0) or 65.0

    optimizer = MicrogridOptimizer(
        battery_capacity_kwh=Config.BATTERY_CAPACITY_KWH,
        max_power_kw=Config.BATTERY_MAX_POWER_KW,
        min_soc=Config.BATTERY_MIN_SOC,
        max_soc=Config.BATTERY_MAX_SOC,
        efficiency=Config.BATTERY_EFFICIENCY
    )
    result = optimizer.optimize_24h(now_dt, forecast, current_soc)
    result["currency"] = "₹"
    result["rate_structure"] = f"TNPDCL {Config.TNPDCL_CATEGORY} (Peak ₹{Config.GRID_PEAK_PRICE}/kWh, Std ₹{Config.GRID_STANDARD_PRICE}/kWh)"
    return result

def apply_control(mode_str: str, manual_battery_kw: float = 0.0, is_islanded: bool = None) -> Dict[str, Any]:
    """Update dispatch strategy."""
    twin = DigitalTwin.get_instance()
    from backend.utils.constants import DispatchMode
    try:
        mode = DispatchMode(mode_str.upper())
    except ValueError:
        mode = DispatchMode.AUTO_AI

    twin.set_dispatch_mode(mode, manual_battery_kw)
    if is_islanded is not None:
        twin.set_islanded(is_islanded)

    return {"status": "SUCCESS", "current_mode": mode.value, "state": get_current_state()}

def trigger_scenario(scenario_name: str, params: dict = None) -> Dict[str, Any]:
    """Inject scenario into simulation."""
    twin = DigitalTwin.get_instance()
    params = params or {}
    scen_upper = scenario_name.upper()

    if scen_upper == "CLOUDY_WEATHER":
        cloud_pct = float(params.get("cloud_cover", 90.0))
        result = CloudyWeatherScenario.apply(twin.simulator, cloud_pct)
    elif scen_upper == "PEAK_LOAD":
        surge = float(params.get("surge_multiplier", 1.9))
        result = PeakLoadScenario.apply(twin.simulator, surge)
    elif scen_upper == "BATTERY_FAILURE":
        result = BatteryFailureScenario.apply(twin.simulator)
    elif scen_upper == "CUSTOM":
        result = CustomScenario.apply(twin.simulator, params)
    else:
        result = CustomScenario.reset_all(twin.simulator)

    twin.active_scenario = scen_upper
    twin.tick()
    return {"status": "SCENARIO_APPLIED", "scenario": scen_upper, "details": result, "state": get_current_state()}

def reset_scenario() -> Dict[str, Any]:
    """Clear all scenario anomalies."""
    twin = DigitalTwin.get_instance()
    CustomScenario.reset_all(twin.simulator)
    twin.active_scenario = "NORMAL"
    twin.tick()
    return {"status": "SCENARIOS_CLEARED", "active_scenario": "NORMAL", "state": get_current_state()}

def update_speed(speed: float, is_paused: bool = None) -> Dict[str, Any]:
    twin = DigitalTwin.get_instance()
    twin.simulation_speed = max(0.1, min(20.0, speed))
    if is_paused is not None:
        twin.is_paused = is_paused
    return {"speed": twin.simulation_speed, "is_paused": twin.is_paused}

def switch_source(source_name: str) -> Dict[str, Any]:
    """Switch active hardware adapter."""
    collector = TelemetryCollector.get_instance()
    res = collector.set_source(source_name)
    # Also persist to database settings
    db = SessionLocal()
    crud.update_settings(db, {"telemetry_source": collector.active_source})
    db.close()
    return res

def get_analytics_data() -> Dict[str, Any]:
    """Compute analytics in ₹ INR and kWh."""
    collector = TelemetryCollector.get_instance()
    telemetry = collector.get_current()
    
    total_solar_kwh = telemetry.get("solar_energy_kwh", 1240.5)
    total_grid_import_kwh = telemetry.get("grid_import_energy_kwh", 3450.2)
    
    # Calculate savings in ₹ INR compared to grid import without solar
    estimated_savings_inr = round(total_solar_kwh * Config.GRID_STANDARD_PRICE, 2)
    co2_avoided_kg = round(total_solar_kwh * Config.GRID_CARBON_INTENSITY, 2)
    
    return {
        "site_name": Config.SITE_NAME,
        "city": Config.TAMILNADU_CITY,
        "currency": "₹",
        "total_solar_kwh": round(total_solar_kwh, 2),
        "total_grid_import_kwh": round(total_grid_import_kwh, 2),
        "total_load_kwh": round(total_solar_kwh + total_grid_import_kwh, 2),
        "co2_saved_kg": co2_avoided_kg,
        "cost_saved_inr": estimated_savings_inr,
        "self_sufficiency_pct": telemetry.get("self_sufficiency_pct", 75.0),
        "battery_soh": telemetry.get("battery_health", 99.8),
        "has_battery": Config.HAS_BATTERY,
        "tnpdcl_category": Config.TNPDCL_CATEGORY
    }

def get_all_settings() -> Dict[str, Any]:
    """Retrieve full configuration from database."""
    db = SessionLocal()
    rec = crud.get_settings(db)
    res = {
        "site_name": rec.site_name,
        "tamilnadu_city": rec.tamilnadu_city,
        "latitude": rec.latitude,
        "longitude": rec.longitude,
        "timezone": rec.timezone,
        "tnpdcl_category": rec.tnpdcl_category,
        "grid_standard_price": rec.grid_standard_price,
        "grid_peak_price": rec.grid_peak_price,
        "grid_offpeak_price": rec.grid_offpeak_price,
        "grid_feed_in_tariff": rec.grid_feed_in_tariff,
        "grid_fixed_charge": rec.grid_fixed_charge,
        "grid_demand_charge": rec.grid_demand_charge,
        "grid_carbon_intensity": rec.grid_carbon_intensity,
        "solar_capacity_kw": rec.solar_capacity_kw,
        "has_battery": rec.has_battery,
        "battery_capacity_kwh": rec.battery_capacity_kwh,
        "battery_max_power_kw": rec.battery_max_power_kw,
        "telemetry_source": rec.telemetry_source,
        "modbus_type": rec.modbus_type,
        "modbus_port": rec.modbus_port,
        "modbus_baudrate": rec.modbus_baudrate,
        "modbus_slave_id": rec.modbus_slave_id,
        "modbus_tcp_host": rec.modbus_tcp_host,
        "modbus_tcp_port": rec.modbus_tcp_port,
        "modbus_device_profile": rec.modbus_device_profile,
        "mqtt_broker": rec.mqtt_broker,
        "mqtt_port": rec.mqtt_port,
        "mqtt_topic_meter": rec.mqtt_topic_meter,
        "mqtt_topic_inverter": rec.mqtt_topic_inverter,
        "mqtt_topic_bms": rec.mqtt_topic_bms,
        "available_cities": list(Config.TN_CITIES.keys())
    }
    db.close()
    return res

def update_all_settings(data: dict) -> Dict[str, Any]:
    """Persist updated settings to database and update collector source."""
    # Check if city changed, update coordinates
    if "tamilnadu_city" in data and data["tamilnadu_city"] in Config.TN_CITIES:
        city_coords = Config.TN_CITIES[data["tamilnadu_city"]]
        data["latitude"] = city_coords["lat"]
        data["longitude"] = city_coords["lon"]

    db = SessionLocal()
    crud.update_settings(db, data)
    db.close()

    # If telemetry_source changed, switch adapter
    if "telemetry_source" in data:
        collector = TelemetryCollector.get_instance()
        collector.set_source(data["telemetry_source"])

    return get_all_settings()
