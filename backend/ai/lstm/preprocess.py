"""
Data preprocessing pipeline for LSTM solar and load forecasting.
Handles lag feature generation, normalization, calendar encoding, and sequence windowing.
"""

import os
import pickle
from typing import Tuple, List, Dict, Any, Optional
import numpy as np
import pandas as pd
from backend.config import Config
from backend.utils.logger import logger

FEATURE_COLUMNS = [
    "solar_output_kw",
    "load_kw",
    "temperature",
    "cloud_cover",
    "irradiance",
    "hour_sin",
    "hour_cos",
    "dow_sin",
    "dow_cos",
]

TARGET_COLUMNS = ["solar_output_kw", "load_kw"]

class DataPreprocessor:
    """Manages feature scaling, sequence generation, and inverse transformations."""
    def __init__(self):
        self.min_vals: Dict[str, float] = {}
        self.max_vals: Dict[str, float] = {}
        self.feature_cols = list(FEATURE_COLUMNS)
        self.target_cols = list(TARGET_COLUMNS)

    def fit(self, df: pd.DataFrame):
        for col in self.feature_cols:
            self.min_vals[col] = float(df[col].min())
            self.max_vals[col] = float(df[col].max())
            if self.max_vals[col] - self.min_vals[col] < 1e-6:
                self.max_vals[col] = self.min_vals[col] + 1.0

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        scaled = df.copy()
        for col in self.feature_cols:
            min_v = self.min_vals.get(col, 0.0)
            max_v = self.max_vals.get(col, 1.0)
            scaled[col] = (scaled[col] - min_v) / max(1e-5, max_v - min_v)
        return scaled

    def inverse_transform_targets(self, y_scaled: np.ndarray, horizon: int = 24) -> Tuple[np.ndarray, np.ndarray]:
        """
        Invert normalized targets back to original kW scale.
        y_scaled shape: (N, 48) where first 24 are solar, next 24 are load.
        """
        solar_min = self.min_vals.get("solar_output_kw", 0.0)
        solar_max = self.max_vals.get("solar_output_kw", 120.0)
        load_min = self.min_vals.get("load_kw", 0.0)
        load_max = self.max_vals.get("load_kw", 110.0)

        solar_pred = y_scaled[:, :horizon] * (solar_max - solar_min) + solar_min
        load_pred = y_scaled[:, horizon:] * (load_max - load_min) + load_min
        return np.maximum(0.0, solar_pred), np.maximum(0.0, load_pred)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb") as f:
            pickle.dump({
                "min_vals": self.min_vals,
                "max_vals": self.max_vals,
                "feature_cols": self.feature_cols,
                "target_cols": self.target_cols,
            }, f)

    @classmethod
    def load(cls, filepath: str) -> "DataPreprocessor":
        with open(filepath, "rb") as f:
            data = pickle.load(f)
        obj = cls()
        obj.min_vals = data["min_vals"]
        obj.max_vals = data["max_vals"]
        obj.feature_cols = data.get("feature_cols", FEATURE_COLUMNS)
        obj.target_cols = data.get("target_cols", TARGET_COLUMNS)
        return obj


def load_and_preprocess_dataset(csv_path: Optional[str] = None, freq: str = "1h") -> pd.DataFrame:
    """
    Loads raw 15-minute or hourly dataset, resamples, and computes cyclical calendar features.
    """
    if csv_path is None:
        csv_path = os.path.join(Config.DATASET_DIR, "merged_dataset.csv")

    df = pd.read_csv(csv_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").drop_duplicates(subset=["timestamp"])
    df = df.set_index("timestamp")

    # Resample to hourly mean for 24h forecasting stability
    if freq:
        df = df.resample(freq).mean().interpolate(method="linear")

    # Cyclical calendar features
    hours = df.index.hour + df.index.minute / 60.0
    df["hour_sin"] = np.sin(2 * np.pi * hours / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * hours / 24.0)

    dows = df.index.dayofweek
    df["dow_sin"] = np.sin(2 * np.pi * dows / 7.0)
    df["dow_cos"] = np.cos(2 * np.pi * dows / 7.0)

    # Ensure required columns exist
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    return df.reset_index()


def create_sequences(
    data: np.ndarray,
    target_data: np.ndarray,
    seq_length: int = 24,
    pred_horizon: int = 24
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Split time series into sliding windows of seq_length input steps and pred_horizon target steps.
    Returns:
        X: shape (num_samples, seq_length, num_features)
        y: shape (num_samples, pred_horizon * num_targets)
    """
    X, y = [], []
    num_samples = len(data) - seq_length - pred_horizon + 1
    for i in range(num_samples):
        X.append(data[i : i + seq_length])
        # Flatten target into (pred_horizon * 2) -> 24 solar + 24 load
        y_solar = target_data[i + seq_length : i + seq_length + pred_horizon, 0]
        y_load = target_data[i + seq_length : i + seq_length + pred_horizon, 1]
        y.append(np.concatenate([y_solar, y_load]))
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def normalize_series(series: np.ndarray, min_val: float, max_val: float) -> np.ndarray:
    """MinMax scaling to [0, 1]."""
    denom = max(1e-5, max_val - min_val)
    return (series - min_val) / denom


def denormalize_series(norm_series: np.ndarray, min_val: float, max_val: float) -> np.ndarray:
    """Inverse MinMax scaling."""
    return norm_series * (max_val - min_val) + min_val
