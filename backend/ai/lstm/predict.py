"""
Inference runner for LSTM forecasting engine.
"""

from datetime import datetime
from typing import List, Dict, Any
from backend.ai.lstm.model import SolarLoadForecaster
from backend.config import Config

_forecaster_instance = None

def get_forecaster() -> SolarLoadForecaster:
    global _forecaster_instance
    if _forecaster_instance is None:
        _forecaster_instance = SolarLoadForecaster(
            solar_capacity_kw=Config.SOLAR_CAPACITY_KW,
            peak_load_kw=110.0
        )
    return _forecaster_instance

def generate_forecast(start_dt: datetime = None, solar_history: List[float] = None, load_history: List[float] = None) -> List[Dict[str, Any]]:
    forecaster = get_forecaster()
    dt = start_dt or datetime.now().replace(minute=0, second=0, microsecond=0)
    return forecaster.predict_24h(dt, solar_history, load_history)
