"""
Central configuration for EcoGrid-Twin backend (Tamil Nadu, India Edition).
Defines site location, TNPDCL tariffs in ₹ INR, timezone Asia/Kolkata, and hardware telemetry parameters.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(PROJECT_ROOT / ".env")

class Config:
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # Storage paths
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'ecogrid.db'}")
    MODEL_DIR: str = os.getenv("MODEL_DIR", str(PROJECT_ROOT / "models"))
    DATASET_DIR: str = os.getenv("DATASET_DIR", str(PROJECT_ROOT / "dataset"))
    CONFIG_DIR: str = os.getenv("CONFIG_DIR", str(PROJECT_ROOT / "config"))

    # Geographic & Tamil Nadu Site Info
    SITE_NAME: str = os.getenv("SITE_NAME", "Chennai Industrial Microgrid")
    TAMILNADU_CITY: str = os.getenv("TAMILNADU_CITY", "Chennai")
    LATITUDE: float = float(os.getenv("LATITUDE", 13.0827))
    LONGITUDE: float = float(os.getenv("LONGITUDE", 80.2707))
    TIMEZONE: str = os.getenv("TIMEZONE", "Asia/Kolkata")

    # Major Tamil Nadu City Coordinates Lookup
    TN_CITIES = {
        "Chennai": {"lat": 13.0827, "lon": 80.2707},
        "Coimbatore": {"lat": 11.0168, "lon": 76.9558},
        "Madurai": {"lat": 9.9252, "lon": 78.1198},
        "Tiruchirappalli": {"lat": 10.7905, "lon": 78.7047},
        "Salem": {"lat": 11.6643, "lon": 78.1460},
        "Tirunelveli": {"lat": 8.7139, "lon": 77.7567},
        "Erode": {"lat": 11.3410, "lon": 77.7172},
        "Vellore": {"lat": 12.9165, "lon": 79.1325},
        "Thanjavur": {"lat": 10.7870, "lon": 79.1378},
        "Tuticorin": {"lat": 8.7642, "lon": 78.1348},
    }

    # Microgrid physical specifications
    SOLAR_CAPACITY_KW: float = float(os.getenv("SOLAR_CAPACITY_KW", 120.0))
    HAS_BATTERY: bool = os.getenv("HAS_BATTERY", "True").lower() in ("true", "1", "yes")
    BATTERY_CAPACITY_KWH: float = float(os.getenv("BATTERY_CAPACITY_KWH", 250.0))
    BATTERY_MAX_POWER_KW: float = float(os.getenv("BATTERY_MAX_POWER_KW", 60.0))
    BATTERY_EFFICIENCY: float = float(os.getenv("BATTERY_EFFICIENCY", 0.94))
    BATTERY_MIN_SOC: float = float(os.getenv("BATTERY_MIN_SOC", 15.0))
    BATTERY_MAX_SOC: float = float(os.getenv("BATTERY_MAX_SOC", 95.0))
    INITIAL_SOC: float = float(os.getenv("INITIAL_SOC", 65.0))

    # TNPDCL Consumer Category & Tariff Structure (All in ₹ INR)
    # Default category: LT-III-B Commercial
    TNPDCL_CATEGORY: str = os.getenv("TNPDCL_CATEGORY", "LT-III-B Commercial")
    GRID_STANDARD_PRICE: float = float(os.getenv("GRID_STANDARD_PRICE", 7.50)) # ₹/kWh (05:00 - 06:00, 09:00 - 18:00, 21:00 - 22:00)
    GRID_PEAK_PRICE: float = float(os.getenv("GRID_PEAK_PRICE", 9.50))       # ₹/kWh (06:00 - 09:00 & 18:00 - 21:00)
    GRID_OFFPEAK_PRICE: float = float(os.getenv("GRID_OFFPEAK_PRICE", 5.80)) # ₹/kWh (22:00 - 05:00)
    GRID_FEED_IN_TARIFF: float = float(os.getenv("GRID_FEED_IN_TARIFF", 3.50)) # Solar Net-metering export compensation ₹/kWh
    GRID_FIXED_CHARGE: float = float(os.getenv("GRID_FIXED_CHARGE", 120.00))   # ₹/month
    GRID_DEMAND_CHARGE: float = float(os.getenv("GRID_DEMAND_CHARGE", 0.00))   # ₹/kVA/month
    GRID_CARBON_INTENSITY: float = float(os.getenv("GRID_CARBON_INTENSITY", 0.72)) # kg CO2 / kWh (Indian CEA national baseline)

    # Telemetry Source Mode: SIMULATION | MODBUS_RTU | MODBUS_TCP | MQTT
    TELEMETRY_SOURCE: str = os.getenv("TELEMETRY_SOURCE", "SIMULATION")

    # RS485 Modbus RTU / TCP Settings (Read-Only)
    MODBUS_TYPE: str = os.getenv("MODBUS_TYPE", "RTU")
    MODBUS_PORT: str = os.getenv("MODBUS_PORT", "COM3")
    MODBUS_BAUDRATE: int = int(os.getenv("MODBUS_BAUDRATE", 9600))
    MODBUS_PARITY: str = os.getenv("MODBUS_PARITY", "N")
    MODBUS_STOPBITS: int = int(os.getenv("MODBUS_STOPBITS", 1))
    MODBUS_BYTESIZE: int = int(os.getenv("MODBUS_BYTESIZE", 8))
    MODBUS_SLAVE_ID: int = int(os.getenv("MODBUS_SLAVE_ID", 1))
    MODBUS_TCP_HOST: str = os.getenv("MODBUS_TCP_HOST", "192.168.1.100")
    MODBUS_TCP_PORT: int = int(os.getenv("MODBUS_TCP_PORT", 502))
    MODBUS_DEVICE_PROFILE: str = os.getenv("MODBUS_DEVICE_PROFILE", "schneider_em6400ng")

    # MQTT Settings (Read-Only Subscriber)
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "127.0.0.1")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", 1883))
    MQTT_USERNAME: str = os.getenv("MQTT_USERNAME", "")
    MQTT_PASSWORD: str = os.getenv("MQTT_PASSWORD", "")
    MQTT_TOPIC_METER: str = os.getenv("MQTT_TOPIC_METER", "ecogrid/meter/telemetry")
    MQTT_TOPIC_INVERTER: str = os.getenv("MQTT_TOPIC_INVERTER", "ecogrid/solar/inverter")
    MQTT_TOPIC_BMS: str = os.getenv("MQTT_TOPIC_BMS", "ecogrid/battery/bms")

    # Timing & Data Staleness Limit
    DATA_STALENESS_SECONDS: float = 30.0 # Data older than 30s is marked DISCONNECTED/STALE
    COLLECTION_INTERVAL_SECONDS: float = 1.0 # Polling rate
    SIMULATION_STEP_HOURS: float = 0.25 # 15 minutes simulation step
