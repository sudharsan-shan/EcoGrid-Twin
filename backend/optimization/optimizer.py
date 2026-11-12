"""
Smart Energy Dispatch Optimizer for microgrid economic and carbon optimization.
Formulates and solves the 24-hour lookahead dispatch problem to minimize grid power costs and maximize solar self-consumption.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.config import Config
from backend.utils.helper import get_tou_price

class MicrogridOptimizer:
    def __init__(
        self,
        battery_capacity_kwh: float = Config.BATTERY_CAPACITY_KWH,
        max_power_kw: float = Config.BATTERY_MAX_POWER_KW,
        min_soc: float = Config.BATTERY_MIN_SOC,
        max_soc: float = Config.BATTERY_MAX_SOC,
        efficiency: float = Config.BATTERY_EFFICIENCY,
    ):
        self.battery_capacity_kwh = battery_capacity_kwh
        self.max_power_kw = max_power_kw
        self.min_soc = min_soc
        self.max_soc = max_soc
        self.efficiency = efficiency
        self.one_way_eff = efficiency ** 0.5

    def optimize_24h(self, start_dt: datetime, forecast_data: List[Dict[str, Any]], current_soc: float) -> Dict[str, Any]:
        """
        Solve 24-hour lookahead smart dispatch schedule.
        """
        schedule = []
        sim_soc = current_soc
        dt_hours = 1.0  # Hourly steps for 24h schedule

        total_baseline_cost = 0.0
        total_optimized_cost = 0.0
        total_co2_kg = 0.0
        baseline_co2_kg = 0.0

        for step, fc in enumerate(forecast_data[:24]):
            step_dt = start_dt + timedelta(hours=step)
            price = get_tou_price(step_dt)
            solar_kw = fc["solar_p50"]
            load_kw = fc["load_p50"]
            net_solar = solar_kw - load_kw

            # Baseline scenario (no battery dispatch, pure solar + grid fallback)
            if net_solar >= 0:
                base_import = 0.0
                base_export = net_solar
            else:
                base_import = abs(net_solar)
                base_export = 0.0
            base_cost = base_import * price * dt_hours - base_export * Config.GRID_FEED_IN_TARIFF * dt_hours
            total_baseline_cost += base_cost
            baseline_co2_kg += base_import * Config.GRID_CARBON_INTENSITY * dt_hours

            # Optimized Smart Dispatch Policy:
            # 1. High tariff window (Peak hours): discharge battery to shave load
            # 2. Surplus solar: charge battery to store clean energy
            # 3. Off-peak night tariff: charge battery from grid if SoC < 70% to prepare for morning peak
            # 4. Standard tariff: support load if battery has headroom
            bat_action_kw = 0.0

            if net_solar > 0:
                # Store solar surplus in battery first
                headroom_kwh = (self.max_soc - sim_soc) / 100.0 * self.battery_capacity_kwh
                max_chg_kw = min(self.max_power_kw, headroom_kwh / (self.one_way_eff * dt_hours))
                bat_action_kw = -min(net_solar, max_chg_kw)  # Negative is charge
            else:
                deficit_kw = abs(net_solar)
                available_kwh = (sim_soc - self.min_soc) / 100.0 * self.battery_capacity_kwh
                max_dis_kw = min(self.max_power_kw, (available_kwh * self.one_way_eff) / dt_hours)

                if price >= Config.GRID_PEAK_PRICE:
                    # Peak pricing: discharge heavily
                    bat_action_kw = min(deficit_kw, max_dis_kw)
                elif price <= Config.GRID_OFFPEAK_PRICE and sim_soc < 70.0:
                    # Cheap night charging
                    headroom_kwh = (self.max_soc - sim_soc) / 100.0 * self.battery_capacity_kwh
                    bat_action_kw = -min(self.max_power_kw * 0.6, headroom_kwh / (self.one_way_eff * dt_hours))
                else:
                    # Standard hours: moderate discharge
                    bat_action_kw = min(deficit_kw * 0.6, max_dis_kw)

            # Update simulated SoC
            if bat_action_kw > 0:
                # Discharging
                removed_kwh = (bat_action_kw / self.one_way_eff) * dt_hours
                sim_soc = max(self.min_soc, sim_soc - (removed_kwh / self.battery_capacity_kwh) * 100.0)
            elif bat_action_kw < 0:
                # Charging
                added_kwh = (abs(bat_action_kw) * self.one_way_eff) * dt_hours
                sim_soc = min(self.max_soc, sim_soc + (added_kwh / self.battery_capacity_kwh) * 100.0)

            # Grid calculation
            unmet = load_kw - solar_kw - bat_action_kw
            grid_imp = max(0.0, unmet)
            grid_exp = max(0.0, -unmet)

            opt_cost = grid_imp * price * dt_hours - grid_exp * Config.GRID_FEED_IN_TARIFF * dt_hours
            total_optimized_cost += opt_cost
            total_co2_kg += grid_imp * Config.GRID_CARBON_INTENSITY * dt_hours

            schedule.append({
                "step": step,
                "hour": step_dt.strftime("%H:%M"),
                "price": price,
                "solar_kw": round(solar_kw, 2),
                "load_kw": round(load_kw, 2),
                "battery_kw": round(bat_action_kw, 2),
                "soc": round(sim_soc, 1),
                "grid_import_kw": round(grid_imp, 2),
                "grid_export_kw": round(grid_exp, 2),
                "cost": round(opt_cost, 2),
            })

        cost_saving = max(0.0, total_baseline_cost - total_optimized_cost)
        co2_saved = max(0.0, baseline_co2_kg - total_co2_kg)

        return {
            "horizon_hours": 24,
            "projected_cost": round(total_optimized_cost, 2),
            "baseline_cost": round(total_baseline_cost, 2),
            "cost_saving": round(cost_saving, 2),
            "saving_pct": round((cost_saving / max(0.01, total_baseline_cost)) * 100.0, 1),
            "co2_saved_kg": round(co2_saved, 2),
            "schedule": schedule,
        }
