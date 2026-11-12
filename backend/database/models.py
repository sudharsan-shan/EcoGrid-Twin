"""
SQLAlchemy database models for EcoGrid-Twin telemetry, logs, and Tamil Nadu site settings.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Text, Boolean
from backend.database.database import Base

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sim_time = Column(DateTime, index=True)
    
    # Power variables (kW)
    solar_kw = Column(Float, default=0.0)
    load_kw = Column(Float, default=0.0)
    battery_kw = Column(Float, default=0.0)  # Positive = discharging, negative = charging
    grid_import_kw = Column(Float, default=0.0)
    grid_export_kw = Column(Float, default=0.0)
    
    # Cumulative Energy (kWh)
    solar_energy_kwh = Column(Float, default=0.0)
    grid_import_energy_kwh = Column(Float, default=0.0)
    grid_export_energy_kwh = Column(Float, default=0.0)

    # 3-Phase Electrical Parameters
    voltage_v = Column(Float, default=240.0)
    current_a = Column(Float, default=0.0)
    frequency_hz = Column(Float, default=50.0)
    power_factor = Column(Float, default=0.98)

    # Battery state (Only if BMS connected)
    has_battery = Column(Boolean, default=True)
    soc = Column(Float, default=50.0)  # %
    battery_temp = Column(Float, default=28.0)  # °C
    battery_health = Column(Float, default=99.8)  # %
    
    # Weather conditions (Weather Forecast / Sensor)
    irradiance = Column(Float, default=0.0)  # W/m^2
    ambient_temp = Column(Float, default=32.0)  # °C (Tamil Nadu ambient)
    cloud_cover = Column(Float, default=10.0)  # %
    
    # Financial & Carbon metrics (in ₹ INR)
    electricity_price = Column(Float, default=7.50)  # ₹/kWh
    instant_cost_rate = Column(Float, default=0.0)  # ₹/hr
    carbon_rate = Column(Float, default=0.0)  # kg CO2/hr
    dispatch_mode = Column(String(50), default="AUTO_AI")

    # Data Source & Provenance
    source_mode = Column(String(50), default="SIMULATION") # SIMULATION | MODBUS_RTU | MODBUS_TCP | MQTT
    data_sources_json = Column(Text, nullable=True) # Per-field source breakdown
    is_live = Column(Boolean, default=True)
    device_status = Column(String(50), default="CONNECTED") # CONNECTED | DISCONNECTED | STALE
    alarms_json = Column(Text, nullable=True)


class SettingsRecord(Base):
    __tablename__ = "settings_records"

    id = Column(Integer, primary_key=True, default=1)
    site_name = Column(String(100), default="Chennai Industrial Microgrid")
    tamilnadu_city = Column(String(50), default="Chennai")
    latitude = Column(Float, default=13.0827)
    longitude = Column(Float, default=80.2707)
    timezone = Column(String(50), default="Asia/Kolkata")

    # TNPDCL Consumer Category & Tariffs
    tnpdcl_category = Column(String(50), default="LT-III-B Commercial")
    grid_standard_price = Column(Float, default=7.50)
    grid_peak_price = Column(Float, default=9.50)
    grid_offpeak_price = Column(Float, default=5.80)
    grid_feed_in_tariff = Column(Float, default=3.50)
    grid_fixed_charge = Column(Float, default=120.00)
    grid_demand_charge = Column(Float, default=0.00)
    grid_carbon_intensity = Column(Float, default=0.72)

    # Capacities
    solar_capacity_kw = Column(Float, default=120.0)
    has_battery = Column(Boolean, default=True)
    battery_capacity_kwh = Column(Float, default=250.0)
    battery_max_power_kw = Column(Float, default=60.0)

    # Active Hardware Source
    telemetry_source = Column(String(50), default="SIMULATION") # SIMULATION | MODBUS_RTU | MODBUS_TCP | MQTT
    modbus_type = Column(String(20), default="RTU")
    modbus_port = Column(String(50), default="COM3")
    modbus_baudrate = Column(Integer, default=9600)
    modbus_slave_id = Column(Integer, default=1)
    modbus_tcp_host = Column(String(100), default="192.168.1.100")
    modbus_tcp_port = Column(Integer, default=502)
    modbus_device_profile = Column(String(100), default="schneider_em6400ng")

    mqtt_broker = Column(String(100), default="127.0.0.1")
    mqtt_port = Column(Integer, default=1883)
    mqtt_username = Column(String(100), default="")
    mqtt_topic_meter = Column(String(100), default="ecogrid/meter/telemetry")
    mqtt_topic_inverter = Column(String(100), default="ecogrid/solar/inverter")
    mqtt_topic_bms = Column(String(100), default="ecogrid/battery/bms")

    updated_at = Column(DateTime, default=datetime.utcnow)


class OptimizationLog(Base):
    __tablename__ = "optimization_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    mode = Column(String(50))
    horizon_hours = Column(Integer, default=24)
    total_cost_projected = Column(Float, default=0.0)  # ₹
    cost_saving_projected = Column(Float, default=0.0) # ₹
    co2_saved_kg = Column(Float, default=0.0)
    schedule_json = Column(Text)


class ScenarioEvent(Base):
    __tablename__ = "scenario_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    scenario_type = Column(String(50))
    params_json = Column(Text)
    active = Column(Boolean, default=True)
    notes = Column(String(255), nullable=True)
