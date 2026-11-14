"""
Stacked LSTM Point Forecaster with Empirical Residual-Calibrated Prediction Intervals.
Provides point predictions (P50) alongside calibrated empirical residual bounds (P10, P90),
with automatic fallback to calibrated physics-based equations.
"""

import os
import json
import math
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

from backend.config import Config
from backend.utils.logger import logger

_nasa_climate_cache = None
_interval_calibration_cache = None

def get_nasa_climate_data():
    """Load and cache NASA POWER climate observations from merged dataset."""
    global _nasa_climate_cache
    if _nasa_climate_cache is None:
        path = os.path.join(Config.DATASET_DIR, "merged_dataset.csv")
        if os.path.exists(path):
            try:
                import pandas as pd
                df = pd.read_csv(path)
                df["timestamp"] = pd.to_datetime(df["timestamp"])
                df = df.set_index("timestamp").sort_index()
                _nasa_climate_cache = df.resample("1h").mean().interpolate(method="time")
            except Exception as e:
                logger.warning(f"Could not load climate records: {e}")
                _nasa_climate_cache = None
    return _nasa_climate_cache

def get_interval_calibration():
    """Load empirical residual calibration quantiles from models/interval_calibration.json."""
    global _interval_calibration_cache
    if _interval_calibration_cache is None:
        path = os.path.join(Config.MODEL_DIR, "interval_calibration.json")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    _interval_calibration_cache = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load interval calibration: {e}")
                _interval_calibration_cache = None
    return _interval_calibration_cache

class SolarLoadForecaster:
    """
    Forecasting model for microgrid solar generation and load demand.
    Stacked LSTM point forecaster with empirical residual-calibrated prediction intervals.
    """
    def __init__(self, solar_capacity_kw: float = 120.0, peak_load_kw: float = 110.0):
        self.solar_capacity_kw = solar_capacity_kw
        self.peak_load_kw = peak_load_kw
        self.model = None
        self.preprocessor = None
        self._load_artifacts()

    def _load_artifacts(self):
        """Attempts to load trained Keras LSTM model and preprocessor scaler."""
        model_path = os.path.join(Config.MODEL_DIR, "lstm_model.keras")
        scaler_path = os.path.join(Config.MODEL_DIR, "scaler.pkl")

        if os.path.exists(model_path) and os.path.exists(scaler_path):
            try:
                import tensorflow as tf
                from backend.ai.lstm.preprocess import DataPreprocessor
                self.model = tf.keras.models.load_model(model_path, compile=False)
                self.preprocessor = DataPreprocessor.load(scaler_path)
                logger.info(f"Loaded trained LSTM model from {model_path}")
            except Exception as e:
                logger.warning(f"Could not load trained neural LSTM model ({e}); using calibrated physics baseline.")
                self.model = None

    def predict_24h(
        self,
        start_dt: datetime,
        recent_solar_history: List[float] = None,
        recent_load_history: List[float] = None,
        climate_df: Optional[Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate 24-hour predictive forecast starting from start_dt.
        """
        if self.model is not None and self.preprocessor is not None:
            try:
                return self._predict_neural(start_dt, recent_solar_history, recent_load_history, climate_df)
            except Exception as e:
                logger.debug(f"Neural inference fallback triggered: {e}")

        return self._predict_physics_calibrated(start_dt, recent_solar_history, recent_load_history)

    def _predict_neural(
        self,
        start_dt: datetime,
        recent_solar_history: List[float] = None,
        recent_load_history: List[float] = None,
        climate_df: Optional[Any] = None
    ) -> List[Dict[str, Any]]:
        """Neural sequence forward-pass with calibrated empirical residual prediction intervals."""
        seq_len = 24
        solar_vals = list(recent_solar_history or [])
        load_vals = list(recent_load_history or [])

        nasa_df = climate_df if climate_df is not None else get_nasa_climate_data()

        rows = []
        for i in range(seq_len):
            hist_dt = (start_dt - timedelta(hours=seq_len - i)).replace(minute=0, second=0, microsecond=0)
            h = hist_dt.hour + hist_dt.minute / 60.0
            dow = hist_dt.weekday()

            s_val = solar_vals[i] if i < len(solar_vals) else None
            l_val = load_vals[i] if i < len(load_vals) else None
            temp_val, cloud_val, irr_val = None, None, None

            if nasa_df is not None:
                if hist_dt in nasa_df.index:
                    r = nasa_df.loc[hist_dt]
                    if s_val is None and "solar_output_kw" in r:
                        s_val = float(r["solar_output_kw"])
                    if l_val is None and "load_kw" in r:
                        l_val = float(r["load_kw"])
                    temp_val = float(r.get("temperature", 28.0))
                    cloud_val = float(r.get("cloud_cover", 15.0))
                    irr_val = float(r.get("irradiance", 0.0))
                else:
                    same_mo_hr = nasa_df[(nasa_df.index.month == hist_dt.month) & (nasa_df.index.hour == hist_dt.hour)]
                    if not same_mo_hr.empty:
                        if s_val is None and "solar_output_kw" in same_mo_hr:
                            s_val = float(same_mo_hr["solar_output_kw"].iloc[-1])
                        if l_val is None and "load_kw" in same_mo_hr:
                            l_val = float(same_mo_hr["load_kw"].iloc[-1])
                        temp_val = float(same_mo_hr["temperature"].iloc[-1])
                        cloud_val = float(same_mo_hr["cloud_cover"].iloc[-1])
                        irr_val = float(same_mo_hr["irradiance"].iloc[-1])

            if s_val is None:
                s_val = 0.0
            if l_val is None:
                l_val = 65.0
            if temp_val is None:
                temp_val = 28.0 + 4.0 * math.sin(math.pi * (h - 9) / 12)
            if cloud_val is None:
                cloud_val = 15.0
            if irr_val is None:
                irr_val = max(0.0, 850.0 * math.sin(math.pi * (h - 6) / 12)) if 6 <= h <= 18 else 0.0

            rows.append({
                "solar_output_kw": float(s_val),
                "load_kw": float(l_val),
                "temperature": float(temp_val),
                "cloud_cover": float(cloud_val),
                "irradiance": float(irr_val),
                "hour_sin": math.sin(2 * math.pi * h / 24.0),
                "hour_cos": math.cos(2 * math.pi * h / 24.0),
                "dow_sin": math.sin(2 * math.pi * dow / 7.0),
                "dow_cos": math.cos(2 * math.pi * dow / 7.0),
            })

        import pandas as pd
        df_in = pd.DataFrame(rows)
        scaled_df = self.preprocessor.transform(df_in)
        X = np.expand_dims(scaled_df[self.preprocessor.feature_cols].to_numpy(dtype=np.float32), axis=0)

        y_scaled = self.model.predict(X, verbose=0)
        solar_preds, load_preds = self.preprocessor.inverse_transform_targets(y_scaled, horizon=24)
        solar_vec = solar_preds[0]
        load_vec = load_preds[0]

        # Load empirical residual calibration quantiles
        cal = get_interval_calibration()
        use_calibration = cal is not None and "solar_residuals_by_step" in cal

        forecasts = []
        for step in range(24):
            future_dt = start_dt + timedelta(hours=step)
            hour = future_dt.hour + future_dt.minute / 60.0

            # Query future weather
            future_temp, future_cloud, future_irr = None, None, None
            if nasa_df is not None:
                if future_dt in nasa_df.index:
                    r_fut = nasa_df.loc[future_dt]
                    future_temp = float(r_fut.get("temperature", 28.0))
                    future_cloud = float(r_fut.get("cloud_cover", 15.0))
                    future_irr = float(r_fut.get("irradiance", 0.0))
                else:
                    match_fut = nasa_df[(nasa_df.index.month == future_dt.month) & (nasa_df.index.hour == future_dt.hour)]
                    if not match_fut.empty:
                        future_temp = float(match_fut["temperature"].iloc[-1])
                        future_cloud = float(match_fut["cloud_cover"].iloc[-1])
                        future_irr = float(match_fut["irradiance"].iloc[-1])

            if future_temp is None:
                future_temp = 28.0 + 4.0 * math.sin(math.pi * (hour - 9) / 12)
            if future_cloud is None:
                future_cloud = 15.0
            if future_irr is None:
                future_irr = max(0.0, 850.0 * math.sin(math.pi * (hour - 6) / 12)) if 6 <= hour <= 18 else 0.0

            step_key = str(step + 1)
            # Calibrated residual interval lookup
            if use_calibration and step_key in cal["solar_residuals_by_step"]:
                q10_s = cal["solar_residuals_by_step"][step_key]["q10"]
                q90_s = cal["solar_residuals_by_step"][step_key]["q90"]
                q10_l = cal["load_residuals_by_step"][step_key]["q10"]
                q90_l = cal["load_residuals_by_step"][step_key]["q90"]
                interval_status = "calibrated"
            else:
                q10_s, q90_s = None, None
                q10_l, q90_l = None, None
                interval_status = "uncalibrated"

            # Night zero boundary enforcement for solar
            if hour < 6.0 or hour > 18.5:
                solar_p50 = 0.0
                solar_p10 = 0.0
                solar_p90 = 0.0
            else:
                base_val = float(solar_vec[step])
                solar_p50 = min(self.solar_capacity_kw, max(0.0, base_val))
                if interval_status == "calibrated":
                    solar_p10 = max(0.0, solar_p50 + q10_s)
                    solar_p90 = min(self.solar_capacity_kw, solar_p50 + q90_s)
                else:
                    solar_p10 = max(0.0, solar_p50 * 0.78)
                    solar_p90 = min(self.solar_capacity_kw, solar_p50 * 1.08)

            load_p50 = max(10.0, min(self.peak_load_kw * 1.25, float(load_vec[step])))
            if interval_status == "calibrated":
                load_p10 = max(5.0, load_p50 + q10_l)
                load_p90 = min(self.peak_load_kw * 1.35, load_p50 + q90_l)
            else:
                load_p10 = load_p50 * 0.92
                load_p90 = load_p50 * 1.10

            forecasts.append({
                "step": step,
                "timestamp": future_dt.isoformat(),
                "hour": future_dt.strftime("%H:%M"),
                "temperature": round(future_temp, 1),
                "cloud_cover": round(future_cloud, 1),
                "irradiance": round(future_irr, 1),
                "solar_p10": round(solar_p10, 2),
                "solar_p50": round(solar_p50, 2),
                "solar_p90": round(solar_p90, 2),
                "load_p10": round(load_p10, 2),
                "load_p50": round(load_p50, 2),
                "load_p90": round(load_p90, 2),
                "net_demand_kw": round(load_p50 - solar_p50, 2),
                "intervals": interval_status
            })

        return forecasts

    def _predict_physics_calibrated(
        self,
        start_dt: datetime,
        recent_solar_history: List[float] = None,
        recent_load_history: List[float] = None
    ) -> List[Dict[str, Any]]:
        """Analytical fallback formulation with calibrated empirical quantiles."""
        cal = get_interval_calibration()
        use_calibration = cal is not None and "solar_residuals_by_step" in cal

        forecasts = []
        for step in range(24):
            future_dt = start_dt + timedelta(hours=step)
            hour = future_dt.hour + future_dt.minute / 60.0
            step_key = str(step + 1)

            if use_calibration and step_key in cal["solar_residuals_by_step"]:
                q10_s = cal["solar_residuals_by_step"][step_key]["q10"]
                q90_s = cal["solar_residuals_by_step"][step_key]["q90"]
                q10_l = cal["load_residuals_by_step"][step_key]["q10"]
                q90_l = cal["load_residuals_by_step"][step_key]["q90"]
                interval_status = "calibrated"
            else:
                q10_s, q90_s = None, None
                q10_l, q90_l = None, None
                interval_status = "uncalibrated"

            if 6.0 <= hour <= 18.5:
                elevation = math.sin(math.pi * (hour - 6.0) / 12.5)
                base_solar = self.solar_capacity_kw * (elevation ** 1.2) * 0.92
                solar_p50 = max(0.0, base_solar)
                if interval_status == "calibrated":
                    solar_p10 = max(0.0, solar_p50 + q10_s)
                    solar_p90 = min(self.solar_capacity_kw, solar_p50 + q90_s)
                else:
                    solar_p10 = max(0.0, solar_p50 * 0.78)
                    solar_p90 = min(self.solar_capacity_kw, solar_p50 * 1.08)
            else:
                solar_p50 = 0.0
                solar_p10 = 0.0
                solar_p90 = 0.0

            m_peak = math.exp(-0.5 * ((hour - 10.5) / 2.5) ** 2)
            a_peak = math.exp(-0.5 * ((hour - 15.5) / 3.0) ** 2)
            diurnal = 0.30 + 0.70 * max(m_peak, a_peak)
            load_p50 = 40.0 + (self.peak_load_kw - 40.0) * diurnal
            if interval_status == "calibrated":
                load_p10 = max(5.0, load_p50 + q10_l)
                load_p90 = min(self.peak_load_kw * 1.35, load_p50 + q90_l)
            else:
                load_p10 = load_p50 * 0.92
                load_p90 = load_p50 * 1.10

            forecasts.append({
                "step": step,
                "timestamp": future_dt.isoformat(),
                "hour": future_dt.strftime("%H:%M"),
                "solar_p10": round(solar_p10, 2),
                "solar_p50": round(solar_p50, 2),
                "solar_p90": round(solar_p90, 2),
                "load_p10": round(load_p10, 2),
                "load_p50": round(load_p50, 2),
                "load_p90": round(load_p90, 2),
                "net_demand_kw": round(load_p50 - solar_p50, 2),
                "intervals": interval_status
            })

        return forecasts
