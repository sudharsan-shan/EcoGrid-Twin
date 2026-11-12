"""
MQTT Telemetry Adapter for IoT Energy Meters and Solar Gateways (e.g. Shelly 3EM, ESP32, Raspberry Pi).
STRICTLY READ-ONLY: Subscribes to topics only; never publishes commands.
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional
from backend.adapters.base_adapter import BaseAdapter
from backend.config import Config
from backend.utils.helper import get_now_ist, format_ist_iso, get_tnpdcl_tou_price
from backend.utils.logger import logger

class MqttAdapter(BaseAdapter):
    def __init__(self):
        super().__init__(name="MQTT Energy Gateway Adapter")
        self.client = None
        self.latest_payloads = {
            "meter": {},
            "solar": {},
            "battery": {}
        }
        self.last_msg_timestamp: Optional[datetime] = None

    def connect(self) -> bool:
        """Connect to MQTT broker and subscribe to telemetry topics."""
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client(client_id=f"EcoGridTwin_Monitor_{Config.SITE_NAME.replace(' ', '_')}")
            
            if Config.MQTT_USERNAME:
                self.client.username_pw_set(Config.MQTT_USERNAME, Config.MQTT_PASSWORD)

            def on_connect(client, userdata, flags, rc):
                if rc == 0:
                    logger.info(f"Connected to MQTT Broker at {Config.MQTT_BROKER}:{Config.MQTT_PORT}")
                    self.connection_status = "CONNECTED"
                    self.is_active = True
                    self.last_error = None
                    # Subscribe to topics
                    client.subscribe([(Config.MQTT_TOPIC_METER, 0), (Config.MQTT_TOPIC_INVERTER, 0), (Config.MQTT_TOPIC_BMS, 0)])
                else:
                    self.connection_status = "DISCONNECTED"
                    self.last_error = f"MQTT connection failed with code {rc}"
                    logger.warning(self.last_error)

            def on_message(client, userdata, msg):
                try:
                    payload = json.loads(msg.payload.decode())
                    topic = msg.topic
                    now = get_now_ist()
                    self.last_msg_timestamp = now
                    self.last_read_time = now

                    if topic == Config.MQTT_TOPIC_METER:
                        self.latest_payloads["meter"] = payload
                    elif topic == Config.MQTT_TOPIC_INVERTER:
                        self.latest_payloads["solar"] = payload
                    elif topic == Config.MQTT_TOPIC_BMS:
                        self.latest_payloads["battery"] = payload
                except Exception as ex:
                    logger.warning(f"Error parsing MQTT message on {msg.topic}: {ex}")

            self.client.on_connect = on_connect
            self.client.on_message = on_message

            logger.info(f"Connecting to MQTT Broker at {Config.MQTT_BROKER}:{Config.MQTT_PORT}...")
            self.client.connect_async(Config.MQTT_BROKER, Config.MQTT_PORT, 60)
            self.client.loop_start()
            return True

        except ImportError:
            self.last_error = "paho-mqtt library not installed. Install with 'pip install paho-mqtt'."
            self.connection_status = "ERROR"
            logger.warning(self.last_error)
            return False
        except Exception as e:
            self.last_error = f"MQTT connection exception: {str(e)}"
            self.connection_status = "DISCONNECTED"
            logger.warning(self.last_error)
            return False

    def disconnect(self):
        if self.client:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass
            self.client = None
        self.is_active = False
        self.connection_status = "DISCONNECTED"

    def read_telemetry(self) -> Optional[Dict[str, Any]]:
        """Synthesize current reading from subscribed MQTT topics."""
        now_ist = get_now_ist()
        
        # Check staleness: if no message received in last 30s
        if not self.last_msg_timestamp or (now_ist - self.last_msg_timestamp).total_seconds() > Config.DATA_STALENESS_SECONDS:
            self.connection_status = "DISCONNECTED"
            return None

        meter = self.latest_payloads.get("meter", {})
        solar = self.latest_payloads.get("solar", {})
        bms = self.latest_payloads.get("battery", {})

        solar_kw = float(solar.get("solar_kw", solar.get("pv_power_kw", 0.0)))
        load_kw = float(meter.get("load_kw", meter.get("total_load_kw", 0.0)))
        grid_import_kw = float(meter.get("grid_import_kw", meter.get("power_import_kw", max(0.0, load_kw - solar_kw))))
        grid_export_kw = float(meter.get("grid_export_kw", meter.get("power_export_kw", max(0.0, solar_kw - load_kw))))

        data_sources = {
            "solar": "Solar Inverter (MQTT)",
            "load": "Smart Meter (MQTT)",
            "grid": "Smart Meter (MQTT)",
            "battery": "Battery BMS (MQTT)" if Config.HAS_BATTERY else "Not Connected",
            "weather": "Weather Forecast (Open-Meteo)",
            "electrical": "Smart Meter (MQTT)"
        }

        return {
            "timestamp": format_ist_iso(now_ist),
            "sim_time": format_ist_iso(now_ist),
            "site_name": Config.SITE_NAME,
            "city": Config.TAMILNADU_CITY,
            "timezone": Config.TIMEZONE,
            "is_live": True,
            "device_status": "CONNECTED",
            "source_mode": "MQTT",
            "data_sources": data_sources,

            "solar_kw": round(solar_kw, 2),
            "load_kw": round(load_kw, 2),
            "battery_kw": round(float(bms.get("battery_kw", 0.0)), 2),
            "grid_import_kw": round(grid_import_kw, 2),
            "grid_export_kw": round(grid_export_kw, 2),

            "solar_energy_kwh": round(float(solar.get("solar_energy_kwh", 0.0)), 2),
            "grid_import_energy_kwh": round(float(meter.get("energy_import_kwh", 0.0)), 2),
            "grid_export_energy_kwh": round(float(meter.get("energy_export_kwh", 0.0)), 2),

            "voltage_v": round(float(meter.get("voltage_v", 240.0)), 1),
            "current_a": round(float(meter.get("current_a", 0.0)), 1),
            "frequency_hz": round(float(meter.get("frequency_hz", 50.0)), 2),
            "power_factor": round(float(meter.get("power_factor", 0.98)), 2),

            "has_battery": Config.HAS_BATTERY,
            "soc": bms.get("soc"),
            "battery_temp": bms.get("battery_temp"),
            "battery_health": bms.get("battery_health"),

            "irradiance": 0.0,
            "ambient_temp": 32.0,
            "cloud_cover": 10.0,

            "currency": "₹",
            "electricity_price": get_tnpdcl_tou_price(now_ist),
            "instant_cost_rate": round(grid_import_kw * get_tnpdcl_tou_price(now_ist), 2),
            "carbon_rate": round(grid_import_kw * Config.GRID_CARBON_INTENSITY, 2),
            "self_sufficiency_pct": round(min(100.0, max(0.0, ((load_kw - grid_import_kw) / max(1.0, load_kw)) * 100.0)), 1),
            "dispatch_mode": "AUTO_AI",
            "alarms": []
        }
