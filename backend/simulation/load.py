"""
Building and microgrid electrical load model.
Simulates commercial/industrial diurnal load curves, HVAC temperature sensitivity, and demand anomalies.
"""

import math
import random
from datetime import datetime

class LoadModel:
    def __init__(self, base_load_kw: float = 40.0, peak_load_kw: float = 110.0):
        self.base_load_kw = base_load_kw
        self.peak_load_kw = peak_load_kw
        self.surge_multiplier = 1.0
        self.critical_ratio = 0.65  # 65% is non-sheddable critical load

    def calculate_load(self, dt: datetime, ambient_temp: float = 25.0, noise_factor: float = 0.05) -> float:
        """
        Calculate total demand in kW at time dt.
        """
        hour = dt.hour + dt.minute / 60.0

        # Diurnal normalized curve [0.0 - 1.0]
        # Dual-peak office/commercial pattern (peak morning around 10:30, second peak 15:30)
        morning_peak = math.exp(-0.5 * ((hour - 10.5) / 2.5) ** 2)
        afternoon_peak = math.exp(-0.5 * ((hour - 15.5) / 3.0) ** 2)
        diurnal_factor = 0.25 + 0.75 * max(morning_peak, afternoon_peak)

        # Baseline demand
        raw_load = self.base_load_kw + (self.peak_load_kw - self.base_load_kw) * diurnal_factor

        # Temperature/HVAC thermal load response (cooling above 24°C, heating below 18°C)
        hvac_addon = 0.0
        if ambient_temp > 24.0:
            hvac_addon = (ambient_temp - 24.0) * 2.2  # 2.2 kW per °C cooling
        elif ambient_temp < 18.0:
            hvac_addon = (18.0 - ambient_temp) * 1.5  # 1.5 kW per °C heating

        # Add slight stochastic noise for realistic fluctuation
        noise = (random.random() - 0.5) * 2.0 * noise_factor * raw_load

        total = (raw_load + hvac_addon + noise) * self.surge_multiplier
        return round(max(5.0, total), 3)
