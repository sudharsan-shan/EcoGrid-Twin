"""
EcoGrid-Twin: Multi-Day Neural LSTM Predictor
Executes true forward inference using models/lstm_model.keras across a 7-day horizon.
Interpolates hourly LSTM outputs into 15-minute intervals and exports directly
to frontend/src/config/lstmMultiDayForecast.json.
"""

import sys
import os
import json
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.config import Config
from backend.ai.lstm.predict import get_forecaster
from backend.utils.helper import get_tnpdcl_tou_price

def generate_multiday_lstm_predictions(num_days: int = 7, export_path: str = None):
    forecaster = get_forecaster()
    dataset_path = os.path.join(Config.DATASET_DIR, "merged_dataset.csv")
    
    df_hist = None
    if os.path.exists(dataset_path):
        df_hist = pd.read_csv(dataset_path)
        df_hist["timestamp"] = pd.to_datetime(df_hist["timestamp"])
        df_hist = df_hist.sort_values("timestamp")
        latest_ts = df_hist["timestamp"].iloc[-1].replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        latest_ts = datetime.now().replace(minute=0, second=0, microsecond=0)

    print("=" * 80)
    print("   GENERATING 7-DAY REAL LSTM NEURAL INFERENCE FOR ECOGRID-TWIN")
    print("=" * 80)
    print(f" Model Artifact : {os.path.join(Config.MODEL_DIR, 'lstm_model.keras')}")
    print(f" Base Start Date: {latest_ts.strftime('%Y-%m-%d %H:%M')}")
    print("-" * 80)

    multiday_data = {
        "generated_at": datetime.now().isoformat(),
        "base_date": latest_ts.strftime("%Y-%m-%d"),
        "source": "Trained Sequence-to-Sequence LSTM Neural Network (models/lstm_model.keras)",
        "days": {}
    }

    current_solar_hist = df_hist["solar_output_kw"].tail(24).tolist() if df_hist is not None else []
    current_load_hist = df_hist["load_kw"].tail(24).tolist() if df_hist is not None else []

    for day_idx in range(num_days):
        target_dt = latest_ts + timedelta(days=day_idx)
        date_str = target_dt.strftime("%Y-%m-%d")
        day_name = target_dt.strftime("%a, %b %d")

        # 1. Run actual Neural LSTM 24-hour inference
        preds = forecaster.predict_24h(target_dt, current_solar_hist, current_load_hist)

        # Update history for autoregressive roll forward
        current_solar_hist = [p["solar_p50"] for p in preds]
        current_load_hist = [p["load_p50"] for p in preds]

        # 2. Extract hourly predictions
        hourly_forecasts = []
        for p in preds:
            dt = datetime.fromisoformat(p["timestamp"])
            hourly_forecasts.append({
                "hour": dt.hour,
                "time": dt.strftime("%H:%M"),
                "timestamp": p["timestamp"],
                "solar_p10": p["solar_p10"],
                "solar_p50": p["solar_p50"],
                "solar_p90": p["solar_p90"],
                "load_p10": p["load_p10"],
                "load_p50": p["load_p50"],
                "load_p90": p["load_p90"],
                "net_demand_kw": p["net_demand_kw"],
                "temperature": p.get("temperature", 28.0),
                "cloud_cover": p.get("cloud_cover", 15.0),
                "irradiance": p.get("irradiance", 0.0)
            })

        # 3. Interpolate 24 hourly steps into 96 fifteen-minute simulation steps
        solar_p50_24 = np.array([p["solar_p50"] for p in preds])
        load_p50_24 = np.array([p["load_p50"] for p in preds])
        temp_24 = np.array([p.get("temperature", 28.0) for p in preds])
        irr_24 = np.array([p.get("irradiance", 0.0) for p in preds])
        cloud_24 = np.array([p.get("cloud_cover", 15.0) for p in preds])

        # Linear interpolation to 96 steps
        xp = np.linspace(0, 23, 24)
        x_96 = np.linspace(0, 23.75, 96)
        solar_96 = np.maximum(0.0, np.interp(x_96, xp, solar_p50_24))
        load_96 = np.maximum(10.0, np.interp(x_96, xp, load_p50_24))
        temp_96 = np.interp(x_96, xp, temp_24)
        irr_96 = np.maximum(0.0, np.interp(x_96, xp, irr_24))
        cloud_96 = np.interp(x_96, xp, cloud_24)

        # Enforce night solar zero boundary
        for s in range(96):
            h = s * 0.25
            if h < 5.75 or h > 18.25:
                solar_96[s] = 0.0
                irr_96[s] = 0.0

        steps_96 = []
        for s in range(96):
            h_int = int(s * 0.25)
            m_int = int((s % 4) * 15)
            step_time = f"{h_int:02d}:{m_int:02d}"
            step_dt = target_dt + timedelta(minutes=s * 15)
            tariff_price = get_tnpdcl_tou_price(step_dt)

            steps_96.append({
                "step": s,
                "time": step_time,
                "solar_kw": round(float(solar_96[s]), 2),
                "load_kw": round(float(load_96[s]), 2),
                "ambient_temp": round(float(temp_96[s]), 1),
                "irradiance": round(float(irr_96[s]), 1),
                "cloud_cover": round(float(cloud_96[s]), 1),
                "tariff_rate": tariff_price,
            })

        peak_load = round(float(np.max(load_p50_24)), 2)
        peak_solar = round(float(np.max(solar_p50_24)), 2)
        total_load_kwh = round(float(np.sum(load_96) * 0.25), 1)
        total_solar_kwh = round(float(np.sum(solar_96) * 0.25), 1)

        multiday_data["days"][str(day_idx)] = {
            "day_index": day_idx,
            "date": date_str,
            "day_label": day_name,
            "peak_load_kw": peak_load,
            "peak_solar_kw": peak_solar,
            "total_load_kwh": total_load_kwh,
            "total_solar_kwh": total_solar_kwh,
            "hourly_forecast": hourly_forecasts,
            "steps_96": steps_96
        }

        print(f"Day {day_idx} ({day_name}): LSTM Peak Load = {peak_load:5.1f} kW | Peak Solar = {peak_solar:5.1f} kW | Total Demand = {total_load_kwh:6.1f} kWh | Total Solar = {total_solar_kwh:5.1f} kWh")

    if export_path is None:
        export_path = os.path.join(BASE_DIR, "frontend", "src", "config", "lstmMultiDayForecast.json")

    os.makedirs(os.path.dirname(export_path), exist_ok=True)
    with open(export_path, "w", encoding="utf-8") as f:
        json.dump(multiday_data, f, indent=2)

    print(f"\n[SUCCESS] Exported 7-day true LSTM predictions to: {export_path}")
    return multiday_data

if __name__ == "__main__":
    generate_multiday_lstm_predictions()

