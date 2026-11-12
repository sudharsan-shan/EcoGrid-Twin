"""
Extreme Peak Load / Heatwave Demand Spike Scenario.
Simulates severe demand surge (1.8x - 2.5x normal building load).
"""

from backend.simulation.simulator import Simulator

class PeakLoadScenario:
    @staticmethod
    def apply(simulator: Simulator, surge_multiplier: float = 1.9):
        simulator.load_model.surge_multiplier = surge_multiplier
        return {
            "scenario": "PEAK_LOAD",
            "applied": True,
            "surge_multiplier": surge_multiplier,
            "description": f"Demand surge of {surge_multiplier}x applied to facility load."
        }

    @staticmethod
    def remove(simulator: Simulator):
        simulator.load_model.surge_multiplier = 1.0
        return {"scenario": "PEAK_LOAD", "applied": False}
