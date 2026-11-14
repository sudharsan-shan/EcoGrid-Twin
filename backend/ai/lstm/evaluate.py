"""
Comprehensive LSTM Forecaster Evaluation against Baselines and Interval Calibration.
Evaluates Persistence, Ridge Regression, and Stacked LSTM on held-out test windows.
Computes empirical residual quantiles on validation data for calibrated P10/P90 prediction intervals.
"""

import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import tensorflow as tf

from backend.config import Config
from backend.ai.lstm.preprocess import (
    DataPreprocessor,
    load_and_preprocess_dataset,
    create_sequences,
    FEATURE_COLUMNS,
    TARGET_COLUMNS
)
from backend.utils.logger import logger

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    sum_true = float(np.sum(y_true))
    wape = float(np.sum(np.abs(y_true - y_pred)) / max(1e-5, sum_true)) * 100.0

    return {
        "mae_kw": round(mae, 3),
        "rmse_kw": round(rmse, 3),
        "r2_score": round(r2, 4),
        "wape_pct": round(wape, 2)
    }

def run_evaluation(
    dataset_path: str = "dataset/merged_dataset.csv",
    models_dir: str = "models",
    figures_dir: str = "output_figures",
    seq_length: int = 24,
    pred_horizon: int = 24
) -> dict:
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)

    logger.info("Loading dataset for independent baseline evaluation...")
    df = load_and_preprocess_dataset(dataset_path, freq="1h")
    total_len = len(df)

    train_end = int(total_len * 0.70)
    val_end   = int(total_len * 0.80)

    train_df = df.iloc[:train_end].copy()
    val_df   = df.iloc[train_end:val_end].copy()
    test_df  = df.iloc[val_end:].copy()

    scaler_path = os.path.join(models_dir, "scaler.pkl")
    preprocessor = DataPreprocessor.load(scaler_path)

    train_scaled = preprocessor.transform(train_df)
    val_scaled   = preprocessor.transform(val_df)
    test_scaled  = preprocessor.transform(test_df)

    X_train_raw = train_scaled[FEATURE_COLUMNS].to_numpy()
    y_train_raw = train_scaled[TARGET_COLUMNS].to_numpy()
    X_val_raw   = val_scaled[FEATURE_COLUMNS].to_numpy()
    y_val_raw   = val_scaled[TARGET_COLUMNS].to_numpy()
    X_test_raw  = test_scaled[FEATURE_COLUMNS].to_numpy()
    y_test_raw  = test_scaled[TARGET_COLUMNS].to_numpy()

    X_train, y_train = create_sequences(X_train_raw, y_train_raw, seq_length, pred_horizon)
    X_val, y_val     = create_sequences(X_val_raw, y_val_raw, seq_length, pred_horizon)
    X_test, y_test   = create_sequences(X_test_raw, y_test_raw, seq_length, pred_horizon)

    solar_true_test, load_true_test = preprocessor.inverse_transform_targets(y_test, horizon=pred_horizon)
    solar_true_val, load_true_val   = preprocessor.inverse_transform_targets(y_val, horizon=pred_horizon)

    # -------------------------------------------------------------
    # 1. Baseline 1: Persistence (Repeat last 24h observed)
    # -------------------------------------------------------------
    # In X_test[:, -24:, :], feature 0 is solar_output_kw, feature 1 is load_kw
    solar_pers_scaled = X_test[:, :, 0]
    load_pers_scaled  = X_test[:, :, 1]
    y_pers_scaled = np.hstack([solar_pers_scaled, load_pers_scaled])
    solar_pred_pers, load_pred_pers = preprocessor.inverse_transform_targets(y_pers_scaled, horizon=pred_horizon)

    solar_pers_metrics = compute_metrics(solar_true_test, solar_pred_pers)
    load_pers_metrics  = compute_metrics(load_true_test, load_pred_pers)

    # -------------------------------------------------------------
    # 2. Baseline 2: Ridge Regression on flattened input window
    # -------------------------------------------------------------
    X_train_flat = X_train.reshape((len(X_train), -1))
    X_test_flat  = X_test.reshape((len(X_test), -1))
    X_val_flat   = X_val.reshape((len(X_val), -1))

    ridge = Ridge(alpha=10.0, random_state=42)
    ridge.fit(X_train_flat, y_train)
    y_ridge_pred_scaled = ridge.predict(X_test_flat)
    solar_pred_ridge, load_pred_ridge = preprocessor.inverse_transform_targets(y_ridge_pred_scaled, horizon=pred_horizon)

    solar_ridge_metrics = compute_metrics(solar_true_test, solar_pred_ridge)
    load_ridge_metrics  = compute_metrics(load_true_test, load_pred_ridge)

    # -------------------------------------------------------------
    # 3. Model: Stacked LSTM Forecaster
    # -------------------------------------------------------------
    model_path = os.path.join(models_dir, "lstm_model.keras")
    lstm_model = tf.keras.models.load_model(model_path, compile=False)

    y_val_pred_scaled  = lstm_model.predict(X_val, batch_size=64, verbose=0)
    y_test_pred_scaled = lstm_model.predict(X_test, batch_size=64, verbose=0)

    solar_pred_val, load_pred_val   = preprocessor.inverse_transform_targets(y_val_pred_scaled, horizon=pred_horizon)
    solar_pred_test, load_pred_test = preprocessor.inverse_transform_targets(y_test_pred_scaled, horizon=pred_horizon)

    solar_lstm_metrics = compute_metrics(solar_true_test, solar_pred_test)
    load_lstm_metrics  = compute_metrics(load_true_test, load_pred_test)

    # Daytime-only solar metrics (where true solar > 1.0 kW)
    day_mask = solar_true_test > 1.0
    solar_day_lstm = compute_metrics(solar_true_test[day_mask], solar_pred_test[day_mask])
    solar_day_pers = compute_metrics(solar_true_test[day_mask], solar_pred_pers[day_mask])
    solar_day_ridge = compute_metrics(solar_true_test[day_mask], solar_pred_ridge[day_mask])

    # Skill score vs persistence: 1 - (RMSE_model / RMSE_persistence)
    solar_skill = round(1.0 - (solar_lstm_metrics["rmse_kw"] / max(1e-5, solar_pers_metrics["rmse_kw"])), 4)
    load_skill  = round(1.0 - (load_lstm_metrics["rmse_kw"] / max(1e-5, load_pers_metrics["rmse_kw"])), 4)

    # -------------------------------------------------------------
    # 4. Calibration: Residual Quantiles on Validation Set
    # -------------------------------------------------------------
    # residuals = y_true - y_pred
    solar_res_val = solar_true_val - solar_pred_val
    load_res_val  = load_true_val - load_pred_val

    step_quantiles_solar = {}
    step_quantiles_load = {}

    for step in range(pred_horizon):
        s_res = solar_res_val[:, step]
        l_res = load_res_val[:, step]
        step_quantiles_solar[str(step + 1)] = {
            "q10": round(float(np.percentile(s_res, 10)), 3),
            "q50": round(float(np.percentile(s_res, 50)), 3),
            "q90": round(float(np.percentile(s_res, 90)), 3)
        }
        step_quantiles_load[str(step + 1)] = {
            "q10": round(float(np.percentile(l_res, 10)), 3),
            "q50": round(float(np.percentile(l_res, 50)), 3),
            "q90": round(float(np.percentile(l_res, 90)), 3)
        }

    calibration_data = {
        "description": "Empirical validation residual quantiles for P10/P90 prediction intervals",
        "method": "Validation Residual Distribution Quantiles (P10, P50, P90)",
        "pred_horizon_hours": pred_horizon,
        "solar_residuals_by_step": step_quantiles_solar,
        "load_residuals_by_step": step_quantiles_load,
        "overall_solar": {
            "q10": round(float(np.percentile(solar_res_val, 10)), 3),
            "q90": round(float(np.percentile(solar_res_val, 90)), 3)
        },
        "overall_load": {
            "q10": round(float(np.percentile(load_res_val, 10)), 3),
            "q90": round(float(np.percentile(load_res_val, 90)), 3)
        }
    }

    cal_path = os.path.join(models_dir, "interval_calibration.json")
    with open(cal_path, "w", encoding="utf-8") as f:
        json.dump(calibration_data, f, indent=2)
    logger.info(f"Saved residual interval calibration to {cal_path}")

    # -------------------------------------------------------------
    # 5. Evaluate Prediction Interval Coverage (PICP & MPIW) on Test Set
    # -------------------------------------------------------------
    q10_s = np.array([step_quantiles_solar[str(h + 1)]["q10"] for h in range(pred_horizon)])
    q90_s = np.array([step_quantiles_solar[str(h + 1)]["q90"] for h in range(pred_horizon)])
    q10_l = np.array([step_quantiles_load[str(h + 1)]["q10"] for h in range(pred_horizon)])
    q90_l = np.array([step_quantiles_load[str(h + 1)]["q90"] for h in range(pred_horizon)])

    solar_p10_test = np.maximum(0.0, solar_pred_test + q10_s)
    solar_p90_test = np.maximum(0.0, solar_pred_test + q90_s)
    load_p10_test  = np.maximum(0.0, load_pred_test + q10_l)
    load_p90_test  = np.maximum(0.0, load_pred_test + q90_l)

    # Coverage: fraction where true value lies in [P10, P90]
    solar_picp = float(np.mean((solar_true_test >= solar_p10_test) & (solar_true_test <= solar_p90_test))) * 100.0
    load_picp  = float(np.mean((load_true_test >= load_p10_test) & (load_true_test <= load_p90_test))) * 100.0

    solar_mpiw = float(np.mean(solar_p90_test - solar_p10_test))
    load_mpiw  = float(np.mean(load_p90_test - load_p10_test))

    # Error by forecast hour
    hourly_errors = []
    for h in range(pred_horizon):
        hourly_errors.append({
            "hour": h + 1,
            "solar_rmse": round(float(np.sqrt(mean_squared_error(solar_true_test[:, h], solar_pred_test[:, h]))), 3),
            "solar_mae": round(float(mean_absolute_error(solar_true_test[:, h], solar_pred_test[:, h])), 3),
            "load_rmse": round(float(np.sqrt(mean_squared_error(load_true_test[:, h], load_pred_test[:, h]))), 3),
            "load_mae": round(float(mean_absolute_error(load_true_test[:, h], load_pred_test[:, h])), 3)
        })

    # Compile Evaluation Report
    report = {
        "evaluation_name": "LSTM Forecaster vs Persistence and Ridge Baselines",
        "dataset": "dataset/merged_dataset.csv",
        "split": "Chronological 70% Train / 10% Validation / 20% Test (Zero test leakage)",
        "models_compared": ["Persistence", "Ridge Regression", "Stacked LSTM (Ours)"],
        "solar_evaluation": {
            "persistence": solar_pers_metrics,
            "ridge_regression": solar_ridge_metrics,
            "lstm": solar_lstm_metrics,
            "lstm_skill_vs_persistence": solar_skill,
            "daytime_only_lstm": solar_day_lstm,
            "prediction_intervals": {
                "picp_target_pct": 80.0,
                "picp_observed_pct": round(solar_picp, 2),
                "mpiw_kw": round(solar_mpiw, 2)
            }
        },
        "load_evaluation": {
            "persistence": load_pers_metrics,
            "ridge_regression": load_ridge_metrics,
            "lstm": load_lstm_metrics,
            "lstm_skill_vs_persistence": load_skill,
            "prediction_intervals": {
                "picp_target_pct": 80.0,
                "picp_observed_pct": round(load_picp, 2),
                "mpiw_kw": round(load_mpiw, 2)
            }
        },
        "error_by_lookahead_hour": hourly_errors
    }

    report_path = os.path.join(models_dir, "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    logger.info(f"Saved comprehensive evaluation report to {report_path}")

    # -------------------------------------------------------------
    # 6. Generate Baseline Comparison Figure
    # -------------------------------------------------------------
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5), dpi=150)

    # Subplot 1: Model Comparison (RMSE)
    x = np.arange(2)
    w = 0.25
    pers_rmse = [solar_pers_metrics["rmse_kw"], load_pers_metrics["rmse_kw"]]
    ridge_rmse = [solar_ridge_metrics["rmse_kw"], load_ridge_metrics["rmse_kw"]]
    lstm_rmse = [solar_lstm_metrics["rmse_kw"], load_lstm_metrics["rmse_kw"]]

    axes[0].bar(x - w, pers_rmse, w, label="Persistence", color="#6b7280", alpha=0.85)
    axes[0].bar(x, ridge_rmse, w, label="Ridge Regression", color="#f59e0b", alpha=0.85)
    axes[0].bar(x + w, lstm_rmse, w, label="Stacked LSTM (Ours)", color="#10b981", alpha=0.9)
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(["Solar PV (kW)", "Building Load (kW)"])
    axes[0].set_ylabel("Test RMSE (kW)")
    axes[0].set_title("RMSE Comparison vs Baselines")
    axes[0].legend()
    axes[0].grid(True, linestyle="--", alpha=0.4)

    # Subplot 2: Hourly Lookahead Error Growth
    hours = [h["hour"] for h in hourly_errors]
    solar_h_rmse = [h["solar_rmse"] for h in hourly_errors]
    load_h_rmse = [h["load_rmse"] for h in hourly_errors]

    axes[1].plot(hours, solar_h_rmse, marker="o", color="#10b981", label="Solar RMSE")
    axes[1].plot(hours, load_h_rmse, marker="s", color="#a855f7", label="Load RMSE")
    axes[1].set_xlabel("Forecast Horizon Step (Hours ahead)")
    axes[1].set_ylabel("RMSE (kW)")
    axes[1].set_title("Error Growth across 24h Horizon")
    axes[1].legend()
    axes[1].grid(True, linestyle="--", alpha=0.4)

    # Subplot 3: Sample Calibrated Interval Forecast (Solar sample)
    sample_idx = 100
    sample_true = solar_true_test[sample_idx]
    sample_p50 = solar_pred_test[sample_idx]
    sample_p10 = solar_p10_test[sample_idx]
    sample_p90 = solar_p90_test[sample_idx]

    axes[2].plot(hours, sample_true, "k-", linewidth=2, label="Actual Ground Truth")
    axes[2].plot(hours, sample_p50, color="#10b981", linestyle="--", label="LSTM P50")
    axes[2].fill_between(hours, sample_p10, sample_p90, color="#10b981", alpha=0.25, label=f"P10-P90 (PICP={solar_picp:.1f}%)")
    axes[2].set_xlabel("Forecast Step (Hour)")
    axes[2].set_ylabel("Power (kW)")
    axes[2].set_title("Calibrated Residual Interval (Test Sample)")
    axes[2].legend()
    axes[2].grid(True, linestyle="--", alpha=0.4)

    plt.tight_layout()
    fig_path = os.path.join(figures_dir, "fig_lstm_baselines.png")
    plt.savefig(fig_path)
    plt.close()
    logger.info(f"Saved baseline comparison figure to {fig_path}")

    return report

if __name__ == "__main__":
    run_evaluation()

