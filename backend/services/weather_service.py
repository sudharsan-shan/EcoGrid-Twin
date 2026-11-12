"""
Tamil Nadu Weather Forecast Service.
Integrates real-time solar irradiance (GHI), ambient temperature, and cloud cover forecast by latitude & longitude.
Labels all values explicitly with source='Weather Forecast (Open-Meteo / Solar Model)'.
"""

import math
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List
from backend.config import Config
from backend.utils.helper import get_now_ist, format_ist_iso
from backend.utils.logger import logger

class WeatherForecastService:
    def __init__(self):
        self.cached_forecast = None
        self.last_fetch_time = None
        self.cache_duration_minutes = 30

    def get_24h_forecast(self, latitude: float = None, longitude: float = None) -> Dict[str, Any]:
        """
        Fetch 24-hour weather & solar forecast for the specified Tamil Nadu coordinates.
        Uses Open-Meteo Solar API with robust physical model fallback.
        """
        lat = latitude if latitude is not None else Config.LATITUDE
        lon = longitude if longitude is not None else Config.LONGITUDE
        now_ist = get_now_ist()

        # Check cache
        if self.cached_forecast and self.last_fetch_time:
            if (now_ist - self.last_fetch_time).total_seconds() < self.cache_duration_minutes * 60:
                return self.cached_forecast

        # Attempt Open-Meteo API query
        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lon}"
                f"&hourly=temperature_2m,cloudcover,direct_normal_irradiance,global_tilted_irradiance,shortwave_radiation"
                f"&timezone=Asia%2FKolkata&forecast_days=2"
            )
            response = requests.get(url, timeout=3.0)
            if response.status_code == 200:
                data = response.json()
                hourly = data.get("hourly", {})
                times = hourly.get("time", [])
                temps = hourly.get("temperature_2m", [])
                clouds = hourly.get("cloudcover", [])
                rads = hourly.get("shortwave_radiation", [])

                # Find current hour index
                current_hour_str = now_ist.strftime("%Y-%m-%dT%H:00")
                start_idx = 0
                for i, t in enumerate(times):
                    if t >= current_hour_str:
                        start_idx = i
                        break

                forecast_steps = []
                for step in range(24):
                    idx = min(len(times) - 1, start_idx + step)
                    step_dt = now_ist + timedelta(hours=step)
                    ghi = rads[idx] if idx < len(rads) and rads[idx] is not None else 0.0
                    temp = temps[idx] if idx < len(temps) and temps[idx] is not None else 32.0
                    cloud = clouds[idx] if idx < len(clouds) and clouds[idx] is not None else 15.0

                    # Solar PV power estimation from forecast GHI
                    solar_p50 = round(max(0.0, Config.SOLAR_CAPACITY_KW * (ghi / 1000.0) * 0.88), 2)
                    solar_p10 = round(solar_p50 * 0.80, 2)
                    solar_p90 = round(min(Config.SOLAR_CAPACITY_KW, solar_p50 * 1.10), 2)

                    forecast_steps.append({
                        "step": step,
                        "timestamp": format_ist_iso(step_dt),
                        "hour": step_dt.strftime("%H:%M"),
                        "temperature_c": round(temp, 1),
                        "cloud_cover_pct": round(cloud, 1),
                        "irradiance_ghi_wm2": round(ghi, 1),
                        "solar_p10": solar_p10,
                        "solar_p50": solar_p50,
                        "solar_p90": solar_p90,
                        "data_provenance": "Weather Forecast (Open-Meteo)"
                    })

                result = {
                    "site_name": Config.SITE_NAME,
                    "city": Config.TAMILNADU_CITY,
                    "latitude": lat,
                    "longitude": lon,
                    "timezone": Config.TIMEZONE,
                    "source": "Weather Forecast (Open-Meteo Solar API)",
                    "generated_at": format_ist_iso(now_ist),
                    "forecast": forecast_steps
                }
                self.cached_forecast = result
                self.last_fetch_time = now_ist
                return result

        except Exception as e:
            logger.info(f"Open-Meteo online fetch failed ({e}). Using local Tamil Nadu physical solar model fallback.")

        # Physical Model Fallback for Tamil Nadu (Tropical Latitude 8°N - 13°N)
        forecast_steps = []
        for step in range(24):
            step_dt = now_ist + timedelta(hours=step)
            hour_float = step_dt.hour + step_dt.minute / 60.0

            if 6.0 <= hour_float <= 18.5:
                elevation = math.sin(math.pi * (hour_float - 6.0) / 12.5)
                base_ghi = 980.0 * (elevation ** 1.15)
                cloud = 12.0
                solar_p50 = round(Config.SOLAR_CAPACITY_KW * (base_ghi / 1000.0) * 0.90, 2)
            else:
                base_ghi = 0.0
                cloud = 10.0
                solar_p50 = 0.0

            temp = 28.0 + 8.0 * math.sin(2.0 * math.pi * (hour_float - 9.0) / 24.0)

            forecast_steps.append({
                "step": step,
                "timestamp": format_ist_iso(step_dt),
                "hour": step_dt.strftime("%H:%M"),
                "temperature_c": round(temp, 1),
                "cloud_cover_pct": round(cloud, 1),
                "irradiance_ghi_wm2": round(base_ghi, 1),
                "solar_p10": round(solar_p50 * 0.82, 2),
                "solar_p50": round(solar_p50, 2),
                "solar_p90": round(min(Config.SOLAR_CAPACITY_KW, solar_p50 * 1.08), 2),
                "data_provenance": "Weather Forecast (TN Solar Physical Model)"
            })

        result = {
            "site_name": Config.SITE_NAME,
            "city": Config.TAMILNADU_CITY,
            "latitude": lat,
            "longitude": lon,
            "timezone": Config.TIMEZONE,
            "source": "Weather Forecast (TN Physical Solar Model)",
            "generated_at": format_ist_iso(now_ist),
            "forecast": forecast_steps
        }
        self.cached_forecast = result
        self.last_fetch_time = now_ist
        return result

weather_service = WeatherForecastService()
