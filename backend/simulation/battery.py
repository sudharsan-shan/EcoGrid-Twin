"""
Battery Energy Storage System (BESS) simulation model.
Models state of charge (SoC), power limits, round-trip efficiency, thermal dynamics, and state of health (SoH).
"""

from backend.config import Config

class BatteryModel:
    def __init__(
        self,
        capacity_kwh: float = Config.BATTERY_CAPACITY_KWH,
        max_power_kw: float = Config.BATTERY_MAX_POWER_KW,
        efficiency: float = Config.BATTERY_EFFICIENCY,
        initial_soc: float = Config.INITIAL_SOC,
        min_soc: float = Config.BATTERY_MIN_SOC,
        max_soc: float = Config.BATTERY_MAX_SOC,
    ):
        self.capacity_kwh = capacity_kwh
        self.max_power_kw = max_power_kw
        self.efficiency = efficiency
        self.one_way_eff = efficiency ** 0.5  # Square root for charge/discharge symmetry
        self.soc = initial_soc  # Percentage [0 - 100]
        self.min_soc = min_soc
        self.max_soc = max_soc
        self.temperature = 25.0  # °C
        self.health = 99.8  # SoH %
        self.total_throughput_kwh = 0.0
        self.is_failed = False  # Failure flag for scenario testing

    def get_max_discharge_kw(self, dt_hours: float) -> float:
        """Calculate max allowable discharge power (kW) without violating min SoC."""
        if self.is_failed:
            return 0.0
        available_energy_kwh = (self.soc - self.min_soc) / 100.0 * self.capacity_kwh
        if available_energy_kwh <= 0.0:
            return 0.0
        max_from_energy = (available_energy_kwh * self.one_way_eff) / dt_hours
        return min(self.max_power_kw, max_from_energy)

    def get_max_charge_kw(self, dt_hours: float) -> float:
        """Calculate max allowable charge power (kW) without violating max SoC."""
        if self.is_failed:
            return 0.0
        headroom_energy_kwh = (self.max_soc - self.soc) / 100.0 * self.capacity_kwh
        if headroom_energy_kwh <= 0.0:
            return 0.0
        max_from_energy = headroom_energy_kwh / (self.one_way_eff * dt_hours)
        return min(self.max_power_kw, max_from_energy)

    def step(self, requested_power_kw: float, dt_hours: float, ambient_temp: float = 25.0) -> float:
        """
        Execute one simulation time step for the battery.
        :param requested_power_kw: >0 for discharge (exporting to microgrid), <0 for charge (absorbing power)
        :param dt_hours: Time delta in hours (e.g. 0.25 for 15 min)
        :param ambient_temp: Ambient environment temp
        :return: Actual delivered power in kW (+ discharge, - charge)
        """
        if self.is_failed:
            # Cool down to ambient
            self.temperature += (ambient_temp - self.temperature) * 0.1
            return 0.0

        actual_power_kw = 0.0

        if requested_power_kw > 0.0:
            # Discharging
            max_dis = self.get_max_discharge_kw(dt_hours)
            actual_power_kw = min(requested_power_kw, max_dis)
            energy_removed_kwh = (actual_power_kw / self.one_way_eff) * dt_hours
            delta_soc = (energy_removed_kwh / self.capacity_kwh) * 100.0
            self.soc = max(self.min_soc, self.soc - delta_soc)
            self.total_throughput_kwh += actual_power_kw * dt_hours

        elif requested_power_kw < 0.0:
            # Charging
            requested_charge = abs(requested_power_kw)
            max_chg = self.get_max_charge_kw(dt_hours)
            charge_power = min(requested_charge, max_chg)
            actual_power_kw = -charge_power
            energy_stored_kwh = (charge_power * self.one_way_eff) * dt_hours
            delta_soc = (energy_stored_kwh / self.capacity_kwh) * 100.0
            self.soc = min(self.max_soc, self.soc + delta_soc)
            self.total_throughput_kwh += charge_power * dt_hours

        # Thermal dynamics (Joule heating + cooling toward ambient)
        current_c_rate = abs(actual_power_kw) / max(1.0, self.capacity_kwh)
        heating = current_c_rate * 3.5
        cooling = 0.15 * (self.temperature - ambient_temp)
        self.temperature += (heating - cooling) * (dt_hours * 4.0)
        self.temperature = max(10.0, min(65.0, self.temperature))

        # Degradation estimation (approx 0.001% per full equivalent cycle)
        cycle_equiv = (abs(actual_power_kw) * dt_hours) / (2.0 * self.capacity_kwh)
        self.health = max(60.0, self.health - cycle_equiv * 0.005)

        return round(actual_power_kw, 3)
