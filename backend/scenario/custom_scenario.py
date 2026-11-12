"""
Customizable Scenario Engine.
Allows injection of custom load surge, cloud cover, battery failure, or grid islanding.
"""

from typing import Dict, Any
from backend.simulation.simulator import Simulator

class CustomScenario:
    @staticmethod
    def apply(simulator: Simulator, params: Dict[str, Any]):
        if "cloud_cover" in params:
            simulator.weather_model.override_cloud_cover = float(params["cloud_cover"])
        if "surge_multiplier" in params:
            simulator.load_model.surge_multiplier = float(params["surge_multiplier"])
        if "battery_failed" in params:
            simulator.battery_model.is_failed = bool(params["battery_failed"])
        if "is_islanded" in params:
            simulator.is_islanded = bool(params["is_islanded"])

        return {
            "scenario": "CUSTOM",
            "applied": True,
            "params": params
        }

    @staticmethod
    def reset_all(simulator: Simulator):
        simulator.weather_model.override_cloud_cover = None
        simulator.weather_model.override_irradiance = None
        simulator.load_model.surge_multiplier = 1.0
        simulator.battery_model.is_failed = False
        simulator.is_islanded = False
        return {"scenario": "NORMAL", "applied": False}
