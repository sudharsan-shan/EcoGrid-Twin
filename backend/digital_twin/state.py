"""
Digital Twin State dataclasses and telemetry schema representations.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List
from datetime import datetime

@dataclass
class TwinState:
    sim_time: str = ""
    solar_kw: float = 0.0
    load_kw: float = 0.0
    battery_kw: float = 0.0
    grid_import_kw: float = 0.0
    grid_export_kw: float = 0.0
    soc: float = 0.0
    battery_temp: float = 25.0
    battery_health: float = 100.0
    irradiance: float = 0.0
    ambient_temp: float = 25.0
    cloud_cover: float = 0.0
    electricity_price: float = 0.0
    instant_cost_rate: float = 0.0
    carbon_rate: float = 0.0
    dispatch_mode: str = "AUTO_AI"
    battery_status: str = "IDLE"
    grid_status: str = "CONNECTED"
    self_sufficiency_pct: float = 0.0
    cost_saved_today: float = 0.0
    co2_saved_kg: float = 0.0
    curtailed_load_kw: float = 0.0
    is_islanded: bool = False
    active_scenario: str = "NORMAL"
    physics_confidence: float = 0.98

    @property
    def battery_soc(self) -> float:
        return self.soc

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
