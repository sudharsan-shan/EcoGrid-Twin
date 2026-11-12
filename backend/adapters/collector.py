"""
Master Telemetry Collector Service.
Orchestrates active data adapters (Mock, Modbus, MQTT), manages data staleness (<30s = LIVE, >30s = DISCONNECTED),
persists time-series records to SQLite, and broadcasts real-time telemetry over WebSockets.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Set, Optional
from collections import deque
from fastapi import WebSocket
from backend.adapters.base_adapter import BaseAdapter
from backend.adapters.mock_adapter import MockAdapter
from backend.adapters.modbus_adapter import ModbusAdapter
from backend.adapters.mqtt_adapter import MqttAdapter
from backend.database.database import SessionLocal
from backend.database import crud
from backend.config import Config
from backend.utils.helper import get_now_ist, format_ist_iso
from backend.utils.logger import logger

active_telemetry_websockets: Set[WebSocket] = set()

class TelemetryCollector:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TelemetryCollector()
        return cls._instance

    def __init__(self):
        self.active_source: str = Config.TELEMETRY_SOURCE
        self.adapters: Dict[str, BaseAdapter] = {
            "SIMULATION": MockAdapter(),
            "MODBUS_RTU": ModbusAdapter(),
            "MODBUS_TCP": ModbusAdapter(),
            "MQTT": MqttAdapter()
        }
        self.current_adapter: BaseAdapter = self.adapters.get(self.active_source, self.adapters["SIMULATION"])
        self.current_adapter.connect()

        self.latest_telemetry: Optional[Dict[str, Any]] = None
        self.history_buffer: deque = deque(maxlen=300)
        self.last_successful_time: Optional[datetime] = None
        self.is_running: bool = False

        # Prime initial buffer with warmup readings
        self._warmup()

    def _warmup(self):
        """Warm up history buffer so charts are immediately populated."""
        mock = self.adapters["SIMULATION"]
        for _ in range(30):
            t = mock.read_telemetry()
            if t:
                self.latest_telemetry = t
                self.history_buffer.append(t)
                self.last_successful_time = get_now_ist()

    def set_source(self, source_name: str) -> Dict[str, Any]:
        """Switch active data adapter at runtime."""
        src_upper = source_name.upper()
        if src_upper not in self.adapters:
            src_upper = "SIMULATION"

        if src_upper != self.active_source:
            logger.info(f"Switching telemetry source from {self.active_source} to {src_upper}")
            self.current_adapter.disconnect()
            self.active_source = src_upper
            Config.TELEMETRY_SOURCE = src_upper
            self.current_adapter = self.adapters[src_upper]
            self.current_adapter.connect()

        return {
            "status": "SOURCE_UPDATED",
            "active_source": self.active_source,
            "adapter_status": self.current_adapter.get_status()
        }

    async def collect_step(self) -> Dict[str, Any]:
        """Poll active adapter, check staleness, log to DB, and return formatted reading."""
        now_ist = get_now_ist()
        reading = self.current_adapter.read_telemetry()

        if reading:
            self.latest_telemetry = reading
            self.last_successful_time = now_ist
            self.latest_telemetry["is_live"] = True
            self.latest_telemetry["device_status"] = "CONNECTED"
            self.history_buffer.append(reading)

            # Persist to database periodically
            try:
                db = SessionLocal()
                crud.log_telemetry(db, {
                    "timestamp": now_ist,
                    "sim_time": now_ist,
                    "solar_kw": reading["solar_kw"],
                    "load_kw": reading["load_kw"],
                    "battery_kw": reading["battery_kw"],
                    "grid_import_kw": reading["grid_import_kw"],
                    "grid_export_kw": reading["grid_export_kw"],
                    "solar_energy_kwh": reading.get("solar_energy_kwh", 0.0),
                    "grid_import_energy_kwh": reading.get("grid_import_energy_kwh", 0.0),
                    "grid_export_energy_kwh": reading.get("grid_export_energy_kwh", 0.0),
                    "voltage_v": reading.get("voltage_v", 240.0),
                    "current_a": reading.get("current_a", 0.0),
                    "frequency_hz": reading.get("frequency_hz", 50.0),
                    "power_factor": reading.get("power_factor", 0.98),
                    "has_battery": reading.get("has_battery", True),
                    "soc": reading.get("soc", 50.0) or 50.0,
                    "battery_temp": reading.get("battery_temp", 28.0) or 28.0,
                    "battery_health": reading.get("battery_health", 99.8) or 99.8,
                    "irradiance": reading.get("irradiance", 0.0),
                    "ambient_temp": reading.get("ambient_temp", 32.0),
                    "cloud_cover": reading.get("cloud_cover", 10.0),
                    "electricity_price": reading.get("electricity_price", 7.50),
                    "instant_cost_rate": reading.get("instant_cost_rate", 0.0),
                    "carbon_rate": reading.get("carbon_rate", 0.0),
                    "dispatch_mode": reading.get("dispatch_mode", "AUTO_AI"),
                    "source_mode": self.active_source,
                    "data_sources_json": json.dumps(reading.get("data_sources", {})),
                    "is_live": True,
                    "device_status": "CONNECTED"
                })
                db.close()
            except Exception as ex:
                logger.error(f"Error persisting telemetry point: {ex}")

        else:
            # Check staleness: If no fresh packet in last 30s
            is_stale = (
                self.last_successful_time is None
                or (now_ist - self.last_successful_time).total_seconds() > Config.DATA_STALENESS_SECONDS
            )

            if self.latest_telemetry:
                self.latest_telemetry["is_live"] = not is_stale
                self.latest_telemetry["device_status"] = "DISCONNECTED" if is_stale else "STALE"
                self.latest_telemetry["timestamp"] = format_ist_iso(now_ist)
            else:
                # Synthesize fallback disconnected state
                self.latest_telemetry = {
                    "timestamp": format_ist_iso(now_ist),
                    "sim_time": format_ist_iso(now_ist),
                    "site_name": Config.SITE_NAME,
                    "city": Config.TAMILNADU_CITY,
                    "timezone": Config.TIMEZONE,
                    "is_live": False,
                    "device_status": "DISCONNECTED",
                    "source_mode": self.active_source,
                    "data_sources": {
                        "solar": "Disconnected",
                        "load": "Disconnected",
                        "grid": "Disconnected",
                        "battery": "Disconnected",
                        "weather": "Weather Forecast (Open-Meteo)",
                        "electrical": "Disconnected"
                    },
                    "solar_kw": 0.0,
                    "load_kw": 0.0,
                    "battery_kw": 0.0,
                    "grid_import_kw": 0.0,
                    "grid_export_kw": 0.0,
                    "solar_energy_kwh": 0.0,
                    "grid_import_energy_kwh": 0.0,
                    "grid_export_energy_kwh": 0.0,
                    "voltage_v": 0.0,
                    "current_a": 0.0,
                    "frequency_hz": 0.0,
                    "power_factor": 0.0,
                    "has_battery": Config.HAS_BATTERY,
                    "soc": None,
                    "battery_temp": None,
                    "battery_health": None,
                    "irradiance": 0.0,
                    "ambient_temp": 32.0,
                    "cloud_cover": 10.0,
                    "currency": "₹",
                    "electricity_price": 7.50,
                    "instant_cost_rate": 0.0,
                    "carbon_rate": 0.0,
                    "self_sufficiency_pct": 0.0,
                    "dispatch_mode": "AUTO_AI",
                    "alarms": [f"Device disconnected from {self.active_source}"]
                }

        return self.latest_telemetry

    def get_current(self) -> Dict[str, Any]:
        """Return the most recent telemetry snapshot."""
        if not self.latest_telemetry:
            mock = self.adapters["SIMULATION"]
            self.latest_telemetry = mock.read_telemetry()
        return self.latest_telemetry

    def get_history(self, limit: int = 60) -> List[Dict[str, Any]]:
        """Return rolling history buffer for charts."""
        return list(self.history_buffer)[-limit:]

async def broadcast_telemetry(data: dict):
    """Broadcast live telemetry JSON to all connected WebSockets."""
    disconnected = set()
    for ws in list(active_telemetry_websockets):
        try:
            await ws.send_json(data)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        active_telemetry_websockets.discard(ws)

async def telemetry_collection_loop():
    """Background task continuously collecting telemetry and streaming over WebSockets."""
    collector = TelemetryCollector.get_instance()
    collector.is_running = True
    logger.info("Started EcoGrid-Twin Tamil Nadu real-time telemetry collector loop.")

    while collector.is_running:
        try:
            telemetry = await collector.collect_step()
            if active_telemetry_websockets:
                await broadcast_telemetry(telemetry)
            await asyncio.sleep(Config.COLLECTION_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in telemetry collector loop: {e}")
            await asyncio.sleep(1.0)
