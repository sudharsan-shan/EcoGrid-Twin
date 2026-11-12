"""
Periodic 24-hour dispatch schedule orchestrator.
"""

from datetime import datetime
from typing import Dict, Any
from backend.optimization.optimizer import MicrogridOptimizer
from backend.ai.lstm.predict import generate_forecast

class DispatchScheduler:
    def __init__(self):
        self.optimizer = MicrogridOptimizer()

    def run_schedule(self, start_dt: datetime, current_soc: float) -> Dict[str, Any]:
        forecast = generate_forecast(start_dt)
        return self.optimizer.optimize_24h(start_dt, forecast, current_soc)
