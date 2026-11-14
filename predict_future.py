"""
EcoGrid-Twin: Future Demand & Energy Needs Forecaster
Executes multi-step future demand, solar generation, and net grid need predictions
using the trained LSTM neural network and TNPDCL tariff schedules.
"""

import sys
import os
import argparse
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Reconfigure stdout for utf-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.config import Config
from backend.ai.lstm.predict import get_forecaster
from backend.utils.helper import get_tnpdcl_tou_price

def predict_future_needs(start_dt: datetime = None, hours: int = 24, export_csv: str = "future_needs_prediction.csv"):
    """
    Predict future building electrical load, solar generation, and net power deficit
    driven by NASA POWER meteorological climate observations (interpolated to 15-min intervals)
    and trained stacked LSTM weights with empirical residual-calibrated prediction intervals.
    """
    # 1. Load recent history from dataset to prime LSTM memory
    dataset_path = os.path.join(Config.DATASET_DIR, "merged_dataset.csv")
    df_hist = None
    recent_solar, recent_load = [], []
    if os.path.exists(dataset_path):
        df_hist = pd.read_csv(dataset_path)
        df_hist["timestamp"] = pd.to_datetime(df_hist["timestamp"])
        df_hist = df_hist.sort_values("timestamp")
        recent_solar = df_hist["solar_output_kw"].tail(24).tolist()
        recent_load = df_hist["load_kw"].tail(24).tolist()

    if start_dt is None:
        if df_hist is not None and not df_hist.empty:
            start_dt = df_hist["timestamp"].iloc[-1].replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        else:
            start_dt = datetime.now().replace(minute=0, second=0, microsecond=0)

    print("=" * 80)
    print("   ECOGRID-TWIN: FUTURE DEMAND & ENERGY NEEDS FORECASTER (LSTM + NASA CLIMATE)")
    print("=" * 80)
    print(f" Target Start Time : {start_dt.strftime('%Y-%m-%d %H:%M')} (Asia/Kolkata)")
    print(f" Forecast Horizon  : {hours} hours ahead")
    print(f" Climate Source    : NASA POWER (MERRA-2 & CERES Chennai Coordinates)")
    print(f" Tariff Schedule   : TNPDCL LT-III-B Commercial (INR)")
    print("-" * 80)

    forecaster = get_forecaster()

    # 2. Iterate in 24-hour chunks if horizon > 24
    all_predictions = []
    current_start = start_dt
    remaining_hours = hours

    while remaining_hours > 0:
        chunk_hours = min(24, remaining_hours)
        preds = forecaster.predict_24h(current_start, recent_solar, recent_load)
        
        for item in preds[:chunk_hours]:
            dt = datetime.fromisoformat(item["timestamp"])
            tariff_rate = get_tnpdcl_tou_price(dt)
            if tariff_rate >= Config.GRID_PEAK_PRICE:
                tariff_band = "PEAK (+25%)"
            elif tariff_rate <= Config.GRID_OFFPEAK_PRICE:
                tariff_band = "OFF_PEAK (-5%)"
            else:
                tariff_band = "STANDARD"

            load_kw = item["load_p50"]
            solar_kw = item["solar_p50"]
            net_need_kw = max(0.0, load_kw - solar_kw)  # Energy building must pull from grid/battery
            surplus_kw = max(0.0, solar_kw - load_kw)   # Excess solar that can be stored or exported

            # Hourly cost estimation
            cost_inr = net_need_kw * tariff_rate
            co2_kg = net_need_kw * Config.GRID_CARBON_INTENSITY

            all_predictions.append({
                "timestamp": dt.strftime("%Y-%m-%d %H:%M"),
                "hour": dt.strftime("%H:%M"),
                "tariff_band": tariff_band,
                "tariff_rate_inr": tariff_rate,
                "nasa_temp_c": item.get("temperature", 28.0),
                "nasa_irradiance_wm2": item.get("irradiance", 0.0),
                "nasa_cloud_pct": item.get("cloud_cover", 15.0),
                "building_demand_kw": round(load_kw, 2),
                "demand_min_kw (P10)": round(item["load_p10"], 2),
                "demand_max_kw (P90)": round(item["load_p90"], 2),
                "solar_gen_kw": round(solar_kw, 2),
                "net_energy_need_kw": round(net_need_kw, 2),
                "surplus_solar_kw": round(surplus_kw, 2),
                "hourly_cost_inr": round(cost_inr, 2),
                "hourly_co2_kg": round(co2_kg, 2)
            })

            recent_solar.append(solar_kw)
            recent_load.append(load_kw)

        remaining_hours -= chunk_hours
        current_start += timedelta(hours=chunk_hours)

    df_out = pd.DataFrame(all_predictions)

    # 3. Print Summary Analysis
    total_demand_kwh = df_out["building_demand_kw"].sum()
    total_solar_kwh = df_out["solar_gen_kw"].sum()
    total_net_need_kwh = df_out["net_energy_need_kw"].sum()
    total_cost_inr = df_out["hourly_cost_inr"].sum()
    total_co2_kg = df_out["hourly_co2_kg"].sum()
    peak_demand_row = df_out.loc[df_out["building_demand_kw"].idxmax()]

    print(f"\n📊 PREDICTED TOTALS FOR NEXT {hours} HOURS:")
    print(f"  • Total Building Energy Needed : {total_demand_kwh:,.1f} kWh")
    print(f"  • Total Solar Generation       : {total_solar_kwh:,.1f} kWh ({total_solar_kwh / total_demand_kwh * 100:.1f}% Solar Coverage)")
    print(f"  • Net Grid Deficit to Supply   : {total_net_need_kwh:,.1f} kWh")
    print(f"  • Peak Demand Hour             : {peak_demand_row['hour']} ({peak_demand_row['building_demand_kw']} kW during {peak_demand_row['tariff_band']})")
    print(f"  • Projected Electricity Bill   : INR {total_cost_inr:,.2f}")
    print(f"  • Projected Grid Carbon        : {total_co2_kg:,.1f} kg CO2")

    print("\n📋 HOURLY ENERGY NEEDS PREDICTION PREVIEW:")
    preview_cols = ["timestamp", "tariff_band", "nasa_temp_c", "nasa_irradiance_wm2", "building_demand_kw", "solar_gen_kw", "net_energy_need_kw", "hourly_cost_inr"]
    print(df_out[preview_cols].head(12).to_string(index=False))

    # 4. Save to CSV
    csv_path = os.path.join(BASE_DIR, export_csv)
    df_out.to_csv(csv_path, index=False)
    print(f"\n✅ Complete detailed predictions saved to: {csv_path}\n")
    return df_out

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict future microgrid energy demand & needs using LSTM.")
    parser.add_argument("--date", type=str, default=None, help="Start date in YYYY-MM-DD or YYYY-MM-DD HH:MM format (default: now)")
    parser.add_argument("--hours", type=int, default=24, help="Number of hours ahead to forecast (default: 24)")
    parser.add_argument("--output", type=str, default="future_needs_prediction.csv", help="Output CSV path")

    args = parser.parse_args()

    start_time = None
    if args.date:
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d"):
            try:
                start_time = datetime.strptime(args.date, fmt)
                break
            except ValueError:
                pass

    predict_future_needs(start_dt=start_time, hours=args.hours, export_csv=args.output)
