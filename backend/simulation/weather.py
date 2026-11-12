"""
Weather simulation model for microgrid environment.
Simulates solar irradiance (GHI), ambient temperature, and cloud cover variations.
"""

import math
import random
from datetime import datetime

class WeatherModel:
    def __init__(self):
        self.cloud_cover = 10.0  # %
        self.override_cloud_cover = None  # Scenario override
        self.override_irradiance = None

    def get_weather(self, dt: datetime) -> dict:
        """
        Compute weather metrics for datetime dt.
        :return: dict with irradiance (W/m^2), ambient_temp (°C), cloud_cover (%)
        """
        hour = dt.hour + dt.minute / 60.0

        # Solar Irradiance GHI curve (6:00 to 18:30)
        if 6.0 <= hour <= 18.5:
            # Solar peak at 12.25 hr (~12:15 PM)
            solar_elevation = math.sin(math.pi * (hour - 6.0) / 12.5)
            solar_elevation = max(0.0, solar_elevation)
            base_ghi = 950.0 * (solar_elevation ** 1.15)
        else:
            base_ghi = 0.0

        # Ambient temperature curve (coolest at 5am, warmest at 15:00)
        temp_cycle = math.sin(2.0 * math.pi * (hour - 9.0) / 24.0)
        ambient_temp = 25.0 + 7.5 * temp_cycle + (random.random() - 0.5) * 0.4

        # Cloud cover drifting
        if self.override_cloud_cover is not None:
            cloud_pct = self.override_cloud_cover
        else:
            # Slow random walk
            self.cloud_cover += (random.random() - 0.5) * 3.0
            self.cloud_cover = max(0.0, min(100.0, self.cloud_cover))
            cloud_pct = self.cloud_cover

        if self.override_irradiance is not None:
            irradiance = self.override_irradiance
        else:
            irradiance = max(0.0, base_ghi)

        return {
            "irradiance": round(irradiance, 2),
            "ambient_temp": round(ambient_temp, 2),
            "cloud_cover": round(cloud_pct, 1),
        }
