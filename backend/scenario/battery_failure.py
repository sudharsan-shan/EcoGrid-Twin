"""
Battery Storage Outage / Tripping Scenario.
Simulates emergency battery inverter trip or cell failure (0 kW available).
"""

from backend.simulation.simulator import Simulator

class BatteryFailureScenario:
    @staticmethod
    def apply(simulator: Simulator):
        simulator.battery_model.is_failed = True
        return {
            "scenario": "BATTERY_FAILURE",
            "applied": True,
            "description": "BESS emergency disconnection triggered. Battery unavailable."
        }

    @staticmethod
    def remove(simulator: Simulator):
        simulator.battery_model.is_failed = False
        return {"scenario": "BATTERY_FAILURE", "applied": False}
