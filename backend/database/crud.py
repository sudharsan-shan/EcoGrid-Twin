"""
CRUD operations for EcoGrid-Twin database entities and settings persistence.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.database.models import TelemetryLog, OptimizationLog, ScenarioEvent, SettingsRecord
from backend.config import Config

def get_settings(db: Session) -> SettingsRecord:
    """Retrieve or initialize singleton settings record."""
    settings = db.query(SettingsRecord).filter(SettingsRecord.id == 1).first()
    if not settings:
        settings = SettingsRecord(
            id=1,
            site_name=Config.SITE_NAME,
            tamilnadu_city=Config.TAMILNADU_CITY,
            latitude=Config.LATITUDE,
            longitude=Config.LONGITUDE,
            timezone=Config.TIMEZONE,
            tnpdcl_category=Config.TNPDCL_CATEGORY,
            grid_standard_price=Config.GRID_STANDARD_PRICE,
            grid_peak_price=Config.GRID_PEAK_PRICE,
            grid_offpeak_price=Config.GRID_OFFPEAK_PRICE,
            grid_feed_in_tariff=Config.GRID_FEED_IN_TARIFF,
            grid_fixed_charge=Config.GRID_FIXED_CHARGE,
            grid_demand_charge=Config.GRID_DEMAND_CHARGE,
            grid_carbon_intensity=Config.GRID_CARBON_INTENSITY,
            solar_capacity_kw=Config.SOLAR_CAPACITY_KW,
            has_battery=Config.HAS_BATTERY,
            battery_capacity_kwh=Config.BATTERY_CAPACITY_KWH,
            battery_max_power_kw=Config.BATTERY_MAX_POWER_KW,
            telemetry_source=Config.TELEMETRY_SOURCE,
            modbus_type=Config.MODBUS_TYPE,
            modbus_port=Config.MODBUS_PORT,
            modbus_baudrate=Config.MODBUS_BAUDRATE,
            modbus_slave_id=Config.MODBUS_SLAVE_ID,
            modbus_tcp_host=Config.MODBUS_TCP_HOST,
            modbus_tcp_port=Config.MODBUS_TCP_PORT,
            modbus_device_profile=Config.MODBUS_DEVICE_PROFILE,
            mqtt_broker=Config.MQTT_BROKER,
            mqtt_port=Config.MQTT_PORT,
            mqtt_topic_meter=Config.MQTT_TOPIC_METER,
            mqtt_topic_inverter=Config.MQTT_TOPIC_INVERTER,
            mqtt_topic_bms=Config.MQTT_TOPIC_BMS,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_settings(db: Session, update_data: Dict[str, Any]) -> SettingsRecord:
    """Update settings in database and synchronize to Config."""
    settings = get_settings(db)
    for key, value in update_data.items():
        if hasattr(settings, key) and value is not None:
            setattr(settings, key, value)
            if hasattr(Config, key.upper()):
                setattr(Config, key.upper(), value)
    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)
    return settings

def log_telemetry(db: Session, data: dict) -> TelemetryLog:
    """Write timestamped telemetry record to database."""
    record = TelemetryLog(**data)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def get_recent_telemetry(db: Session, limit: int = 100) -> List[TelemetryLog]:
    """Get last N telemetry records ordered chronologically."""
    return db.query(TelemetryLog).order_by(TelemetryLog.id.desc()).limit(limit).all()[::-1]

def get_telemetry_range(db: Session, start_time: datetime, end_time: datetime) -> List[TelemetryLog]:
    return (
        db.query(TelemetryLog)
        .filter(TelemetryLog.timestamp >= start_time, TelemetryLog.timestamp <= end_time)
        .order_by(TelemetryLog.timestamp.asc())
        .all()
    )

def log_optimization(db: Session, mode: str, horizon: int, cost: float, saving: float, co2: float, schedule: str) -> OptimizationLog:
    record = OptimizationLog(
        mode=mode,
        horizon_hours=horizon,
        total_cost_projected=cost,
        cost_saving_projected=saving,
        co2_saved_kg=co2,
        schedule_json=schedule
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def log_scenario_event(db: Session, scenario_type: str, params_json: str, active: bool = True, notes: str = None) -> ScenarioEvent:
    record = ScenarioEvent(
        scenario_type=scenario_type,
        params_json=params_json,
        active=active,
        notes=notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
