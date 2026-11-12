"""
Solar PV generation physical model for microgrid simulation.
Calculates photovoltaic power generation based on solar geometry, irradiance, cloud cover, and thermal derating.
"""

import math
from datetime import datetime
from backend.config import Config

class SolarModel:
    def __init__(self, capacity_kw: float = Config.SOLAR_CAPACITY_KW, inverter_efficiency: float = 0.96):
        self.capacity_kw = capacity_kw
        self.inverter_efficiency = inverter_efficiency
        self.temp_coeff = 0.004  # -0.4% per °C above 25°C
        self.derating_factor = 0.95  # Soiling, cabling, shading losses
        self.degradation_factor = 0.99  # Ageing factor

    def calculate_power(self, dt: datetime, irradiance: float, ambient_temp: float, cloud_cover: float = 0.0) -> float:
        """
        Calculate instantaneous solar power in kW.
        :param dt: Current datetime
        :param irradiance: Global Horizontal Irradiance (W/m^2)
        :param ambient_temp: Ambient temperature in °C
        :param cloud_cover: Cloud coverage percentage [0 - 100]
        :return: AC Power generation in kW
        """
        # If night time or zero irradiance
        if irradiance <= 5.0 or dt.hour < 5 or dt.hour > 19:
            return 0.0

        # Cloud attenuation effect
        cloud_factor = 1.0 - (0.80 * (cloud_cover / 100.0) ** 1.3)
        effective_irradiance = max(0.0, irradiance * cloud_factor)

        # Estimated cell temperature (NOCT model approximation)
        cell_temp = ambient_temp + (effective_irradiance / 800.0) * (45.0 - 20.0)

        # Thermal derating
        temp_loss = 1.0 - self.temp_coeff * max(0.0, cell_temp - 25.0)

        # Standard Test Condition is 1000 W/m^2
        irradiance_ratio = effective_irradiance / 1000.0

        # DC Power
        p_dc = self.capacity_kw * irradiance_ratio * temp_loss * self.derating_factor * self.degradation_factor

        # AC Power via Inverter
        p_ac = p_dc * self.inverter_efficiency
        return round(max(0.0, p_ac), 3)
