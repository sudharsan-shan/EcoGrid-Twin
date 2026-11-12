"""
Mock Telemetry Adapter for EcoGrid-Twin (Tamil Nadu Site Physics).
Generates realistic, physically-grounded microgrid readings for testing without hardware.
"""

import math
import random
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from backend.adapters.base_adapter import BaseAdapter
from backend.config import Config
from backend.utils.helper import get_now_ist, format_ist_iso, get_tnpdcl_tou_price
from backend.simulation.solar import SolarModel
from backend.simulation.battery import BatteryModel
from backend.simulation.load import LoadModel
from backend.simulation.weather import WeatherModel

class MockAdapter(BaseAdapter):
    def __init__(self):
        super().__init__(name="Mock Simulation Adapter (Tamil Nadu)")
        self.solar_model = SolarModel(capacity_kw=Config.SOLAR_CAPACITY_KW)
        self.battery_model = BatteryModel(
            capacity_kwh=Config.BATTERY_CAPACITY_KWH,
            max_power_kw=Config.BATTERY_MAX_POWER_KW,
            initial_soc=Config.INITIAL_SOC
        )
        self.load_model = LoadModel(base_load_kw=45.0, peak_load_kw=115.0)
        self.weather_model = WeatherModel()

        # Cumulative energy accumulators (kWh)
        self.cumulative_solar_kwh = 1240.50
        self.cumulative_grid_import_kwh = 3450.20
        self.cumulative_grid_export_kwh = 810.40
        self.dt_hours = 1.0 / 3600.0 # 1 second per tick

    def connect(self) -> bool:
        self.is_active = True
        self.connection_status = "CONNECTED"
        self.last_error = None
        return True

    def disconnect(self):
        self.is_active = False
        self.connection_status = "DISCONNECTED"

    def read_telemetry(self) -> Optional[Dict[str, Any]]:
        now_ist = get_now_ist()
        self.last_read_time = now_ist

        # 1. Weather conditions in Tamil Nadu
        weather = self.weather_model.get_weather(now_ist)
        irradiance = weather["irradiance"]
        ambient_temp = max(26.0, weather["ambient_temp"] + 3.0) # Tamil Nadu tropical heat adjustment
        cloud_cover = weather["cloud_cover"]

        # 2. Solar Generation (kW)
        solar_kw = self.solar_model.calculate_power(now_ist, irradiance, ambient_temp, cloud_cover)

        # 3. Facility Load Demand (kW)
        load_kw = self.load_model.calculate_load(now_ist, ambient_temp)

        # 4. Battery Storage (if configured)
        actual_battery_kw = 0.0
        if Config.HAS_BATTERY:
            net_solar = solar_kw - load_kw
            tou_price = get_tnpdcl_tou_price(now_ist)

            # Auto Dispatch policy
            if net_solar > 0:
                target_bat = -net_solar # Charge with solar
            elif tou_price >= Config.GRID_PEAK_PRICE and self.battery_model.soc > 25.0:
                target_bat = min(abs(net_solar), Config.BATTERY_MAX_POWER_KW) # Discharge at peak
            else:
                target_bat = min(abs(net_solar) * 0.4, Config.BATTERY_MAX_POWER_KW)

            actual_battery_kw = self.battery_model.step(target_bat, 0.25, ambient_temp)

        # 5. Grid Exchange
        unmet = load_kw - solar_kw - actual_battery_kw
        grid_import_kw = max(0.0, unmet)
        grid_export_kw = max(0.0, -unmet)

        # 6. Electrical 3-Phase Parameters (Tamil Nadu Grid Standard 240V L-N / 415V L-L, 50Hz)
        voltage_v = round(238.0 + (random.random() - 0.5) * 4.0, 1)
        freq_hz = round(49.98 + (random.random() - 0.5) * 0.08, 2)
        power_factor = round(0.97 + (random.random() - 0.5) * 0.02, 2)
        total_active_power = max(1.0, load_kw)
        current_a = round((total_active_power * 1000.0) / (3.0 * voltage_v * power_factor), 1)

        # 7. Energy Integration
        self.cumulative_solar_kwh += (solar_kw * self.dt_hours)
        self.cumulative_grid_import_kwh += (grid_import_kw * self.dt_hours)
        self.cumulative_grid_export_kwh += (grid_export_kw * self.dt_hours)

        # 8. Financials in ₹ INR
        price_per_kwh = get_tnpdcl_tou_price(now_ist)
        cost_rate_inr_hr = (grid_import_kw * price_per_kwh) - (grid_export_kw * Config.GRID_FEED_IN_TARIFF)
        carbon_rate = grid_import_kw * Config.GRID_CARBON_INTENSITY

        # Self sufficiency
        self_suff_pct = round(min(100.0, max(0.0, ((load_kw - grid_import_kw) / max(1.0, load_kw)) * 100.0)), 1)

        # Data sources provenance tags
        data_sources = {
            "solar": "Simulation (Tamil Nadu PV Model)",
            "load": "Simulation (Facility Load Profile)",
            "grid": "Simulation (TN Grid Model)",
            "battery": "Simulation (BESS Model)" if Config.HAS_BATTERY else "Not Connected",
            "weather": "Simulation (TN Weather Engine)",
            "electrical": "Simulation (3-Phase Synthesizer)"
        }

        return {
            "timestamp": format_ist_iso(now_ist),
            "sim_time": format_ist_iso(now_ist),
            "site_name": Config.SITE_NAME,
            "city": Config.TAMILNADU_CITY,
            "timezone": Config.TIMEZONE,
            "is_live": True,
            "device_status": "CONNECTED",
            "source_mode": "SIMULATION",
            "data_sources": data_sources,

            # Power metrics (kW)
            "solar_kw": round(solar_kw, 2),
            "load_kw": round(load_kw, 2),
            "battery_kw": round(actual_battery_kw, 2),
            "grid_import_kw": round(grid_import_kw, 2),
            "grid_export_kw": round(grid_export_kw, 2),

            # Cumulative Energy (kWh)
            "solar_energy_kwh": round(self.cumulative_solar_kwh, 2),
            "grid_import_energy_kwh": round(self.cumulative_grid_import_kwh, 2),
            "grid_export_energy_kwh": round(self.cumulative_grid_export_kwh, 2),

            # 3-Phase Electrical Parameters
            "voltage_v": voltage_v,
            "current_a": current_a,
            "frequency_hz": freq_hz,
            "power_factor": power_factor,

            # Battery (BMS)
            "has_battery": Config.HAS_BATTERY,
            "soc": round(self.battery_model.soc, 1) if Config.HAS_BATTERY else None,
            "battery_temp": round(self.battery_model.temperature, 1) if Config.HAS_BATTERY else None,
            "battery_health": round(self.battery_model.health, 1) if Config.HAS_BATTERY else None,

            # Weather (Tamil Nadu)
            "irradiance": round(irradiance, 1),
            "ambient_temp": round(ambient_temp, 1),
            "cloud_cover": round(cloud_cover, 1),

            # Financial & Tariffs (in ₹ INR)
            "currency": "₹",
            "electricity_price": round(price_per_kwh, 2),
            "instant_cost_rate": round(cost_rate_inr_hr, 2),
            "carbon_rate": round(carbon_rate, 2),
            "self_sufficiency_pct": self_suff_pct,
            "dispatch_mode": "AUTO_AI",
            "alarms": []
        }
