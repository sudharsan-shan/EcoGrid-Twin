"""
Constants and Enums for EcoGrid-Twin.
"""

from enum import Enum

class DispatchMode(str, Enum):
    AUTO_AI = "AUTO_AI"              # Smart AI/PINN optimization
    PEAK_SHAVING = "PEAK_SHAVING"    # Discharge during peak load / high tariff
    MAX_RENEWABLE = "MAX_RENEWABLE"  # Maximize solar self-consumption
    ISLANDED = "ISLANDED"            # Zero grid import/export (emergency microgrid)
    MANUAL = "MANUAL"                # Manual operator override

class BatteryAction(str, Enum):
    IDLE = "IDLE"
    CHARGING = "CHARGING"
    DISCHARGING = "DISCHARGING"

class GridAction(str, Enum):
    BALANCED = "BALANCED"
    IMPORTING = "IMPORTING"
    EXPORTING = "EXPORTING"
    DISCONNECTED = "DISCONNECTED"

class ScenarioType(str, Enum):
    NORMAL = "NORMAL"
    CLOUDY_WEATHER = "CLOUDY_WEATHER"
    PEAK_LOAD = "PEAK_LOAD"
    BATTERY_FAILURE = "BATTERY_FAILURE"
    CUSTOM = "CUSTOM"
