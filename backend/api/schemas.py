"""
Pydantic schemas for API request and response data models (Tamil Nadu Edition).
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ControlRequest(BaseModel):
    mode: str = Field(..., description="AUTO_AI, PEAK_SHAVING, MAX_RENEWABLE, ISLANDED, MANUAL")
    manual_battery_kw: Optional[float] = Field(0.0, description="Battery power in manual mode (+ discharge, - charge)")
    is_islanded: Optional[bool] = Field(None, description="Toggle islanded microgrid state")

class ScenarioRequest(BaseModel):
    scenario_type: str = Field(..., description="CLOUDY_WEATHER, PEAK_LOAD, BATTERY_FAILURE, CUSTOM")
    params: Optional[Dict[str, Any]] = Field(default_factory=dict)

class SpeedRequest(BaseModel):
    speed: float = Field(1.0, ge=0.1, le=20.0, description="Simulation speed multiplier")
    is_paused: Optional[bool] = Field(None, description="Pause or resume simulation")

class SourceSwitchRequest(BaseModel):
    source: str = Field(..., description="SIMULATION, MODBUS_RTU, MODBUS_TCP, MQTT")

class SettingsUpdateRequest(BaseModel):
    site_name: Optional[str] = None
    tamilnadu_city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None

    tnpdcl_category: Optional[str] = None
    grid_standard_price: Optional[float] = None
    grid_peak_price: Optional[float] = None
    grid_offpeak_price: Optional[float] = None
    grid_feed_in_tariff: Optional[float] = None
    grid_fixed_charge: Optional[float] = None
    grid_demand_charge: Optional[float] = None
    grid_carbon_intensity: Optional[float] = None

    solar_capacity_kw: Optional[float] = None
    has_battery: Optional[bool] = None
    battery_capacity_kwh: Optional[float] = None
    battery_max_power_kw: Optional[float] = None

    telemetry_source: Optional[str] = None
    modbus_type: Optional[str] = None
    modbus_port: Optional[str] = None
    modbus_baudrate: Optional[int] = None
    modbus_slave_id: Optional[int] = None
    modbus_tcp_host: Optional[str] = None
    modbus_tcp_port: Optional[int] = None
    modbus_device_profile: Optional[str] = None

    mqtt_broker: Optional[str] = None
    mqtt_port: Optional[int] = None
    mqtt_topic_meter: Optional[str] = None
    mqtt_topic_inverter: Optional[str] = None
    mqtt_topic_bms: Optional[str] = None
