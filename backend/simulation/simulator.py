"""
Master simulation engine for EcoGrid-Twin.
Coordinates solar, battery, load, and weather models, executing time-stepped microgrid power balance calculations.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from backend.config import Config
from backend.simulation.solar import SolarModel
from backend.simulation.battery import BatteryModel
from backend.simulation.load import LoadModel
from backend.simulation.weather import WeatherModel
from backend.utils.constants import DispatchMode, BatteryAction, GridAction
from backend.utils.helper import get_tou_price

class Simulator:
    def __init__(
        self,
        solar_model: Optional[SolarModel] = None,
        battery_model: Optional[BatteryModel] = None,
        load_model: Optional[LoadModel] = None,
        weather_model: Optional[WeatherModel] = None,
    ):
        self.solar_model = solar_model or SolarModel()
        self.battery_model = battery_model or BatteryModel()
        self.load_model = load_model or LoadModel()
        self.weather_model = weather_model or WeatherModel()

        # Simulation clock
        self.current_sim_time = datetime.now().replace(minute=0, second=0, microsecond=0)
        self.dt_hours = Config.SIMULATION_STEP_HOURS  # e.g., 0.25h (15 min)

        # Active operating mode & manual override controls
        self.dispatch_mode = DispatchMode.AUTO_AI
        self.manual_battery_kw = 0.0  # Used only when dispatch_mode == MANUAL
        self.is_islanded = False

        # Running lifetime / session accumulators
        self.cumulative_cost_dollars = 0.0
        self.cumulative_solar_kwh = 0.0
        self.cumulative_load_kwh = 0.0
        self.cumulative_co2_saved_kg = 0.0
        self.total_steps = 0

    def step(self, requested_battery_kw: Optional[float] = None) -> Dict[str, Any]:
        """
        Advance the simulation clock by dt_hours and compute the complete microgrid power balance.
        """
        # Advance simulation time
        self.current_sim_time += timedelta(hours=self.dt_hours)
        dt = self.current_sim_time

        # 1. Weather state
        weather = self.weather_model.get_weather(dt)
        irradiance = weather["irradiance"]
        ambient_temp = weather["ambient_temp"]
        cloud_cover = weather["cloud_cover"]

        # 2. Solar generation
        solar_kw = self.solar_model.calculate_power(dt, irradiance, ambient_temp, cloud_cover)

        # 3. Electrical load
        load_kw = self.load_model.calculate_load(dt, ambient_temp)

        # 4. Pricing & Net demand
        tou_price = get_tou_price(dt)
        net_solar = solar_kw - load_kw  # Positive = surplus, Negative = deficit

        # 5. Dispatch Decision Logic based on Mode
        battery_target_kw = 0.0

        if self.dispatch_mode == DispatchMode.MANUAL:
            battery_target_kw = self.manual_battery_kw

        elif self.dispatch_mode == DispatchMode.ISLANDED or self.is_islanded:
            # Must strictly balance load using solar + battery, zero grid
            if net_solar >= 0:
                # Store surplus in battery
                battery_target_kw = -net_solar  # Charge
            else:
                # Discharge battery to cover entire deficit
                battery_target_kw = abs(net_solar)  # Discharge

        elif self.dispatch_mode == DispatchMode.MAX_RENEWABLE:
            if net_solar >= 0:
                battery_target_kw = -net_solar  # Absorb surplus
            else:
                battery_target_kw = abs(net_solar)  # Discharge to prevent grid import

        elif self.dispatch_mode == DispatchMode.PEAK_SHAVING:
            # During peak tariff hours, discharge aggressively to avoid expensive grid imports
            if tou_price >= Config.GRID_PEAK_PRICE:
                battery_target_kw = min(Config.BATTERY_MAX_POWER_KW, load_kw)
            elif net_solar > 0:
                battery_target_kw = -net_solar
            elif tou_price <= Config.GRID_OFFPEAK_PRICE and self.battery_model.soc < 80.0:
                # Pre-charge from grid during cheap night tariff
                battery_target_kw = -Config.BATTERY_MAX_POWER_KW * 0.7

        else: # AUTO_AI / Smart Optimization Default
            if requested_battery_kw is not None:
                battery_target_kw = requested_battery_kw
            else:
                # Heuristic AI policy
                if net_solar > 0:
                    battery_target_kw = -net_solar  # Charge with clean solar
                else:
                    if tou_price >= Config.GRID_PEAK_PRICE:
                        battery_target_kw = min(abs(net_solar), Config.BATTERY_MAX_POWER_KW)
                    elif tou_price <= Config.GRID_OFFPEAK_PRICE and self.battery_model.soc < 70.0:
                        battery_target_kw = -Config.BATTERY_MAX_POWER_KW * 0.5
                    else:
                        battery_target_kw = min(abs(net_solar) * 0.5, Config.BATTERY_MAX_POWER_KW)

        # 6. Step Battery Simulation
        actual_battery_kw = self.battery_model.step(battery_target_kw, self.dt_hours, ambient_temp)

        # 7. Grid Exchange Calculation
        # Balance equation: Solar + Battery(dis) + Grid(imp) = Load + Battery(chg) + Grid(exp)
        # Remaining balance after solar and battery:
        unmet_power = load_kw - solar_kw - actual_battery_kw

        grid_import_kw = 0.0
        grid_export_kw = 0.0

        if self.dispatch_mode == DispatchMode.ISLANDED or self.is_islanded:
            # Islanded mode - no grid interaction
            grid_import_kw = 0.0
            grid_export_kw = 0.0
            if unmet_power > 0.001:
                # Microgrid deficit (potential brownout/load curtailment)
                curtailed_load = unmet_power
            else:
                curtailed_load = 0.0
        else:
            curtailed_load = 0.0
            if unmet_power > 0.0:
                grid_import_kw = unmet_power
            else:
                grid_export_kw = abs(unmet_power)

        # 8. Financials & Carbon Impact
        step_cost = (
            grid_import_kw * tou_price * self.dt_hours
            - grid_export_kw * Config.GRID_FEED_IN_TARIFF * self.dt_hours
        )
        # Avoided cost compared to 100% grid supply
        baseline_cost = load_kw * tou_price * self.dt_hours
        cost_saved = max(0.0, baseline_cost - step_cost)

        carbon_produced_kg = grid_import_kw * Config.GRID_CARBON_INTENSITY * self.dt_hours
        carbon_avoided_kg = max(0.0, (load_kw * Config.GRID_CARBON_INTENSITY * self.dt_hours) - carbon_produced_kg)

        # Accumulators
        self.cumulative_cost_dollars += step_cost
        self.cumulative_solar_kwh += solar_kw * self.dt_hours
        self.cumulative_load_kwh += load_kw * self.dt_hours
        self.cumulative_co2_saved_kg += carbon_avoided_kg
        self.total_steps += 1

        # Action classifications
        if actual_battery_kw > 0.5:
            bat_status = BatteryAction.DISCHARGING
        elif actual_battery_kw < -0.5:
            bat_status = BatteryAction.CHARGING
        else:
            bat_status = BatteryAction.IDLE

        if grid_import_kw > 0.5:
            grid_status = GridAction.IMPORTING
        elif grid_export_kw > 0.5:
            grid_status = GridAction.EXPORTING
        elif self.is_islanded or self.dispatch_mode == DispatchMode.ISLANDED:
            grid_status = GridAction.DISCONNECTED
        else:
            grid_status = GridAction.BALANCED

        # Self sufficiency calculation
        total_demand = max(1.0, load_kw)
        self_consumption_pct = min(100.0, max(0.0, ((total_demand - grid_import_kw) / total_demand) * 100.0))

        return {
            "sim_time": dt.isoformat(),
            "solar_kw": round(solar_kw, 2),
            "load_kw": round(load_kw, 2),
            "battery_kw": round(actual_battery_kw, 2),
            "grid_import_kw": round(grid_import_kw, 2),
            "grid_export_kw": round(grid_export_kw, 2),
            "soc": round(self.battery_model.soc, 2),
            "battery_temp": round(self.battery_model.temperature, 1),
            "battery_health": round(self.battery_model.health, 2),
            "irradiance": round(irradiance, 1),
            "ambient_temp": round(ambient_temp, 1),
            "cloud_cover": round(cloud_cover, 1),
            "electricity_price": round(tou_price, 3),
            "instant_cost_rate": round((grid_import_kw * tou_price - grid_export_kw * Config.GRID_FEED_IN_TARIFF), 2),
            "carbon_rate": round(grid_import_kw * Config.GRID_CARBON_INTENSITY, 2),
            "dispatch_mode": self.dispatch_mode.value,
            "battery_status": bat_status.value,
            "grid_status": grid_status.value,
            "self_sufficiency_pct": round(self_consumption_pct, 1),
            "cost_saved_today": round(self.cumulative_cost_dollars, 2),
            "co2_saved_kg": round(self.cumulative_co2_saved_kg, 2),
            "curtailed_load_kw": round(curtailed_load, 2),
            "is_islanded": self.is_islanded,
        }

    def reset_state(self, initial_soc: float = Config.INITIAL_SOC, reset_overrides: bool = False):
        """Reset simulation state and accumulators."""
        self.battery_model.soc = initial_soc
        self.battery_model.temperature = 25.0
        if reset_overrides:
            self.battery_model.is_failed = False
            self.load_model.surge_multiplier = 1.0
            self.weather_model.override_cloud_cover = None
            self.weather_model.override_irradiance = None
        self.is_islanded = False
        self.cumulative_cost_dollars = 0.0
        self.cumulative_solar_kwh = 0.0
        self.cumulative_load_kwh = 0.0
        self.cumulative_co2_saved_kg = 0.0
