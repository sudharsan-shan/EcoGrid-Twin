"""
Cloudy Weather / Sudden Storm Scenario.
Simulates heavy cloud coverage (85-95%) and severe drop in solar generation.
"""

from backend.simulation.simulator import Simulator

class CloudyWeatherScenario:
    @staticmethod
    def apply(simulator: Simulator, cloud_cover: float = 90.0):
        simulator.weather_model.override_cloud_cover = cloud_cover
        return {
            "scenario": "CLOUDY_WEATHER",
            "applied": True,
            "cloud_cover": cloud_cover,
            "description": f"Severe storm front applied with {cloud_cover}% cloud occlusion."
        }

    @staticmethod
    def remove(simulator: Simulator):
        simulator.weather_model.override_cloud_cover = None
        return {"scenario": "CLOUDY_WEATHER", "applied": False}
