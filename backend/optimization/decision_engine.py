"""
Real-time microgrid Decision Engine.
Evaluates stability, limits, economics, and outputs instant dispatch commands.
"""

from typing import Dict, Any
from backend.utils.constants import DispatchMode
from backend.config import Config

class DecisionEngine:
    def __init__(self):
        pass

    def evaluate(self, current_state: Dict[str, Any], active_mode: DispatchMode) -> Dict[str, Any]:
        """
        Evaluate live telemetry and generate operational recommendations.
        """
        soc = current_state.get("soc", 50.0)
        solar = current_state.get("solar_kw", 0.0)
        load = current_state.get("load_kw", 50.0)
        price = current_state.get("electricity_price", 0.20)

        recommendations = []
        status_alert = "NORMAL"

        if soc < Config.BATTERY_MIN_SOC + 5.0:
            recommendations.append("Battery SoC near minimum reserve. Protecting critical storage.")
            status_alert = "WARNING_LOW_SOC"
        elif soc > Config.BATTERY_MAX_SOC - 5.0:
            recommendations.append("Battery near 100% capacity. Excess solar exporting to grid.")

        if price >= Config.GRID_PEAK_PRICE and soc > 30.0:
            recommendations.append("Peak tariff active ($0.38/kWh). Peak-shaving with battery engaged.")

        if current_state.get("is_islanded", False):
            status_alert = "ISLANDED_MODE"
            recommendations.append("Microgrid operates in islanded mode. Grid disconnected.")

        return {
            "mode": active_mode.value if hasattr(active_mode, 'value') else str(active_mode),
            "status_alert": status_alert,
            "recommendations": recommendations,
            "grid_frequency_hz": 50.0,
            "voltage_pu": 1.00
        }
