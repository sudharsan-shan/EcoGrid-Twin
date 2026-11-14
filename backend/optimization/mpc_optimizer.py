import pulp
from typing import List, Dict, Any, Tuple
from backend.config import Config

class RollingHorizonMPC:
    """
    Rolling-Horizon Model Predictive Control (MPC) Battery Dispatch Optimizer
    using PuLP (Linear Programming).
    
    Strict causality: Solves LP over lookahead horizon N (default 6 hours) using
    forecasted generation/demand, but returns only the decision for step 0.
    """
    def __init__(
        self,
        horizon_n: int = 6,
        capacity_kwh: float = Config.BATTERY_CAPACITY_KWH,
        max_c_rate: float = 0.5,
        min_soc: float = Config.BATTERY_MIN_SOC / 100.0,
        max_soc: float = Config.BATTERY_MAX_SOC / 100.0,
        efficiency: float = Config.BATTERY_EFFICIENCY,
        weight_unmet: float = 1000.0,
        weight_curtail: float = 100.0,
    ):
        self.horizon_n = horizon_n
        self.capacity_kwh = capacity_kwh
        self.max_power_kw = max_c_rate * capacity_kwh
        self.min_soc = min_soc
        self.max_soc = max_soc
        self.eta_charge = efficiency ** 0.5
        self.eta_discharge = efficiency ** 0.5
        self.weight_unmet = weight_unmet
        self.weight_curtail = weight_curtail

    def solve_step(
        self,
        current_actual_soc_pct: float,
        pv_forecast: List[float],
        wind_forecast: List[float],
        load_forecast: List[float],
        grid_prices: List[float],
        dt_hours: float = 1.0
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Solve single-step MPC over horizon N and return (first_hour_power_kw, metrics).
        Positive power = discharge (power delivered to load/grid).
        Negative power = charge (power absorbed into battery).
        """
        N = min(self.horizon_n, len(pv_forecast), len(load_forecast))
        current_soc = current_actual_soc_pct / 100.0

        prob = pulp.LpProblem("RollingHorizonMPC", pulp.LpMinimize)

        # Decision Variables
        charge = [pulp.LpVariable(f"charge_{i}", 0.0, self.max_power_kw) for i in range(N)]
        discharge = [pulp.LpVariable(f"discharge_{i}", 0.0, self.max_power_kw) for i in range(N)]
        unmet = [pulp.LpVariable(f"unmet_{i}", 0.0) for i in range(N)]
        curtail = [pulp.LpVariable(f"curtail_{i}", 0.0) for i in range(N)]
        grid_draw = [pulp.LpVariable(f"grid_draw_{i}", 0.0) for i in range(N)]
        soc = [pulp.LpVariable(f"soc_{i}", self.min_soc, self.max_soc) for i in range(N + 1)]

        # Objective Function
        obj_terms = []
        for i in range(N):
            p_price = grid_prices[i] if i < len(grid_prices) else 5.0
            obj_terms.append(self.weight_unmet * unmet[i])
            obj_terms.append(self.weight_curtail * curtail[i])
            obj_terms.append(p_price * grid_draw[i])
        prob += pulp.lpSum(obj_terms)

        # Constraints
        prob += (soc[0] == current_soc, "InitialSOCConstraint")

        for i in range(N):
            pv_f = pv_forecast[i] if i < len(pv_forecast) else 0.0
            wind_f = wind_forecast[i] if (wind_forecast and i < len(wind_forecast)) else 0.0
            load_f = load_forecast[i] if i < len(load_forecast) else 0.0

            # Power balance per step:
            # pv + wind + discharge - charge - curtail + grid_draw - unmet == load
            prob += (
                pv_f + wind_f + discharge[i] - charge[i] - curtail[i] + grid_draw[i] - unmet[i] == load_f,
                f"PowerBalance_{i}"
            )

            # SoC state transition:
            # soc[i+1] == soc[i] + (eta_c * charge[i] - discharge[i] / eta_d) * dt / capacity
            delta_soc = (self.eta_charge * charge[i] - discharge[i] / self.eta_discharge) * (dt_hours / self.capacity_kwh)
            prob += (
                soc[i + 1] == soc[i] + delta_soc,
                f"SoCTransition_{i}"
            )

        solver = pulp.PULP_CBC_CMD(msg=False)
        status = prob.solve(solver)

        status_str = pulp.LpStatus[status]
        if status_str != "Optimal":
            # Fallback if solver fails: idle
            return 0.0, {"status": status_str, "optimal": False}

        # First hour decision
        exec_charge = pulp.value(charge[0]) or 0.0
        exec_discharge = pulp.value(discharge[0]) or 0.0
        # Positive = discharge, negative = charge
        net_battery_power = exec_discharge - exec_charge

        metrics = {
            "status": status_str,
            "optimal": True,
            "planned_charge_0": exec_charge,
            "planned_discharge_0": exec_discharge,
            "planned_unmet_0": pulp.value(unmet[0]) or 0.0,
            "planned_curtail_0": pulp.value(curtail[0]) or 0.0,
            "planned_grid_draw_0": pulp.value(grid_draw[0]) or 0.0,
            "projected_soc_next": pulp.value(soc[1]) * 100.0 if pulp.value(soc[1]) is not None else current_actual_soc_pct,
        }

        return net_battery_power, metrics
