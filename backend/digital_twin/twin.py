"""
Digital Twin Core Engine.
Maintains the live virtual replica of the physical microgrid, ring buffer of telemetry history, anomaly monitoring, and mode control.
"""

from collections import deque
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.simulation.simulator import Simulator
from backend.digital_twin.state import TwinState
from backend.ai.pinn.model import BatteryPINN
from backend.optimization.decision_engine import DecisionEngine
from backend.utils.constants import DispatchMode, ScenarioType
from backend.utils.logger import logger

class DigitalTwin:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = DigitalTwin()
        return cls._instance

    def __init__(self):
        self.simulator = Simulator()
        self.pinn = BatteryPINN()
        self.decision_engine = DecisionEngine()
        self.history: deque = deque(maxlen=300)
        self.current_state: Optional[TwinState] = None
        self.active_scenario: str = ScenarioType.NORMAL.value
        self.simulation_speed: float = 1.0  # Multiplier
        self.is_paused: bool = False

        # Prime initial history with simulated warmup
        self._warmup_history(steps=24)

    def _warmup_history(self, steps: int = 24):
        """Pre-populate history buffer with realistic warmup steps so charts load with rich data."""
        for _ in range(steps):
            raw = self.simulator.step()
            state = TwinState(**raw, active_scenario=self.active_scenario)
            self.history.append(state.to_dict())
            self.current_state = state

    def tick(self) -> Dict[str, Any]:
        """
        Advance twin simulation by one time step, validate with PINN physics, and update state.
        """
        if self.is_paused:
            return self.get_state()

        raw = self.simulator.step()

        # Validate with PINN
        pinn_eval = self.pinn.estimate_state(
            current_soc=raw["soc"],
            target_power_kw=raw["battery_kw"],
            dt_hours=self.simulator.dt_hours,
            ambient_temp=raw["ambient_temp"]
        )

        state = TwinState(
            **raw,
            active_scenario=self.active_scenario,
            physics_confidence=pinn_eval["physics_confidence"]
        )
        self.current_state = state
        self.history.append(state.to_dict())
        return state.to_dict()

    def get_state(self) -> Dict[str, Any]:
        if self.current_state is None:
            self.tick()
        state_dict = self.current_state.to_dict()
        decisions = self.decision_engine.evaluate(state_dict, self.simulator.dispatch_mode)
        state_dict["decision_support"] = decisions
        return state_dict

    def get_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        return list(self.history)[-limit:]

    def set_dispatch_mode(self, mode: DispatchMode, manual_battery_kw: float = 0.0):
        self.simulator.dispatch_mode = mode
        if mode == DispatchMode.MANUAL:
            self.simulator.manual_battery_kw = manual_battery_kw
        logger.info(f"Digital Twin dispatch mode updated to: {mode.value}")

    def set_islanded(self, is_islanded: bool):
        self.simulator.is_islanded = is_islanded
        logger.info(f"Digital Twin islanded status set to: {is_islanded}")
