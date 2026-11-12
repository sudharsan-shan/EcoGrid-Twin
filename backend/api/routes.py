"""
API route definitions for EcoGrid-Twin (Tamil Nadu Real-Time Telemetry Edition).
Exposes endpoints for live readings, historical data, Tamil Nadu weather forecasts, settings, and WebSockets.
"""

from fastapi import APIRouter, Query
from backend.api import controllers
from backend.api.schemas import ControlRequest, ScenarioRequest, SpeedRequest, SettingsUpdateRequest, SourceSwitchRequest
from backend.utils.logger import logger

router = APIRouter()

# 1. Telemetry Endpoints
@router.get("/telemetry/current")
@router.get("/twin/state")
def get_current_telemetry():
    """Return latest real-time telemetry snapshot with data source provenance and IST timestamps."""
    return controllers.get_current_state()

@router.get("/telemetry/history")
@router.get("/twin/history")
def get_telemetry_history(limit: int = Query(60, ge=10, le=300)):
    """Return recent historical telemetry records for real-time charts."""
    return controllers.get_history(limit=limit)

@router.post("/telemetry/source")
def switch_telemetry_source(req: SourceSwitchRequest):
    """Switch active hardware adapter (SIMULATION | MODBUS_RTU | MODBUS_TCP | MQTT)."""
    return controllers.switch_source(req.source)

# 2. Weather & AI Forecast Endpoints
@router.get("/weather/forecast")
def get_weather_forecast(lat: float = None, lon: float = None):
    """Return 24-hour weather and solar irradiance forecast for Tamil Nadu coordinates."""
    return controllers.get_weather_forecast(lat, lon)

@router.get("/forecast")
def get_ai_forecast():
    """Return 24-hour AI predictive forecast with confidence bounds."""
    return controllers.get_forecast_data()

@router.get("/forecast/multiday")
def get_multiday_forecast(days: int = 7):
    """Return 7-day autoregressive LSTM predictions driven by NASA climate data."""
    return controllers.get_multiday_forecast(days)

# 3. Optimization & Scenarios
@router.post("/optimize")
def run_optimization():
    """Execute 24-hour lookahead smart dispatch optimization based on TNPDCL tariffs."""
    return controllers.run_optimization()

@router.post("/twin/control")
def apply_control(req: ControlRequest):
    """Update dispatch operating mode."""
    return controllers.apply_control(req.mode, req.manual_battery_kw or 0.0, req.is_islanded)

@router.post("/twin/speed")
def update_simulation_speed(req: SpeedRequest):
    """Change simulation tick speed or pause/resume."""
    return controllers.update_speed(req.speed, req.is_paused)

@router.post("/scenario/run")
def trigger_scenario(req: ScenarioRequest):
    """Inject a dynamic scenario for simulation/stress-testing."""
    return controllers.trigger_scenario(req.scenario_type, req.params)

@router.post("/scenario/reset")
def reset_scenario():
    """Clear active scenario anomalies."""
    return controllers.reset_scenario()

# 4. Analytics & Settings
@router.get("/analytics")
def get_analytics():
    """Return financial savings in ₹ INR, cumulative kWh energy yield, and carbon avoidance."""
    return controllers.get_analytics_data()

@router.get("/settings")
def get_settings():
    """Return site configuration, Tamil Nadu city, TNPDCL tariffs, and hardware settings."""
    return controllers.get_all_settings()

@router.put("/settings")
def update_settings(req: SettingsUpdateRequest):
    """Update site configuration, tariffs, and hardware settings in database."""
    return controllers.update_all_settings(req.model_dump(exclude_unset=True))

# Note: WebSocket endpoints (/ws/telemetry, /ws/live) are mounted directly on the root app
# in backend/app.py to avoid the /api prefix. See app.py for WebSocket handlers.
