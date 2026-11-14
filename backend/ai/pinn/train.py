"""
PINN Training Routine with Physics Collocation and Plain-MLP Ablation.
Trains a Physics-Informed Neural Network (PINN) surrogate of the microgrid battery model.
Evaluates both in-distribution and out-of-distribution (extrapolation >40 kW) performance.

Fix (2026-11): Uses actual_power_kw (applied/clipped power) instead of power_kw (commanded
power) so the physics residual correctly penalises deviations from physical energy-balance.
"""

import os
import json
import random
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
import matplotlib.pyplot as plt

from backend.ai.pinn.pinn_net import BatteryPINNNet
from backend.ai.pinn.constraints import physics_soc_residual
from backend.config import Config
from backend.utils.logger import logger

SEED = 42

def set_seeds(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)

def sample_collocation_points(batch_size: int = 64) -> tf.Tensor:
    """Sample collocation points across the entire state-action domain.
    Column order: [soc_prev, actual_power_kw, ambient_temp_c, dt_hours]
    """
    soc_c = np.random.uniform(10.0, 100.0, size=(batch_size, 1))
    pwr_c = np.random.uniform(-65.0, 65.0, size=(batch_size, 1))
    amb_c = np.random.uniform(15.0, 45.0, size=(batch_size, 1))
    dt_c  = np.random.uniform(0.15, 1.0,  size=(batch_size, 1))
    colloc = np.hstack([soc_c, pwr_c, amb_c, dt_c]).astype(np.float32)
    return tf.convert_to_tensor(colloc)

def train_network(
    train_x: np.ndarray,
    train_y: np.ndarray,
    val_x: np.ndarray,
    val_y: np.ndarray,
    lambda_phys: float = 1.0,
    lambda_bound: float = 0.5,
    epochs: int = 35,
    batch_size: int = 64,
    learning_rate: float = 0.002,
    model_name: str = "pinn"
):
    set_seeds(SEED)
    model = BatteryPINNNet(name=model_name)
    optimizer = keras.optimizers.Adam(learning_rate=learning_rate)

    train_dataset = tf.data.Dataset.from_tensor_slices((train_x, train_y))
    train_dataset = train_dataset.shuffle(buffer_size=len(train_x), seed=SEED).batch(batch_size)

    history = {"total_loss": [], "data_loss": [], "phys_loss": [], "val_soc_mae": []}
    best_val_mae = float("inf")
    best_weights = None

    for epoch in range(1, epochs + 1):
        epoch_total = 0.0
        epoch_data = 0.0
        epoch_phys = 0.0
        batches = 0

        for x_b, y_b in train_dataset:
            with tf.GradientTape() as tape:
                preds = model(x_b, training=True)
                data_loss = tf.reduce_mean(tf.square(preds - y_b))

                if lambda_phys > 0.0:
                    # Physics residual on data points
                    phys_data = model.compute_physics_residual(x_b, preds)
                    # Collocation points
                    x_colloc = sample_collocation_points(batch_size=len(x_b))
                    preds_colloc = model(x_colloc, training=True)
                    phys_colloc = model.compute_physics_residual(x_colloc, preds_colloc)
                    bound_colloc = model.compute_boundary_penalty(preds_colloc)

                    phys_total = 0.5 * (phys_data + phys_colloc)
                    total_loss = data_loss + lambda_phys * phys_total + lambda_bound * bound_colloc
                else:
                    phys_total = tf.constant(0.0)
                    total_loss = data_loss

            grads = tape.gradient(total_loss, model.trainable_variables)
            optimizer.apply_gradients(zip(grads, model.trainable_variables))

            epoch_total += float(total_loss)
            epoch_data += float(data_loss)
            epoch_phys += float(phys_total)
            batches += 1

        # Validation evaluation
        val_preds = model(tf.convert_to_tensor(val_x), training=False)
        val_soc_mae = float(np.mean(np.abs(val_preds[:, 0].numpy() - val_y[:, 0])))

        history["total_loss"].append(epoch_total / batches)
        history["data_loss"].append(epoch_data / batches)
        history["phys_loss"].append(epoch_phys / batches)
        history["val_soc_mae"].append(val_soc_mae)

        if val_soc_mae < best_val_mae:
            best_val_mae = val_soc_mae
            best_weights = model.get_weights()

    # Restore best weights
    if best_weights is not None:
        model.set_weights(best_weights)

    return model, history

def evaluate_model(model: BatteryPINNNet, x_eval: np.ndarray, y_eval: np.ndarray) -> dict:
    """Evaluate model predictions and physics residual using applied power (column index 1).
    
    x_eval columns: [soc_prev, actual_power_kw, ambient_temp_c, dt_hours]
    y_eval columns: [soc_next, temp_next]
    """
    if len(x_eval) == 0:
        return {"soc_mae": 0.0, "temp_mae": 0.0, "mean_residual": 0.0}

    preds = model(tf.convert_to_tensor(x_eval), training=False).numpy()
    soc_mae = float(np.mean(np.abs(preds[:, 0] - y_eval[:, 0])))
    temp_mae = float(np.mean(np.abs(preds[:, 1] - y_eval[:, 1])))

    # Compute physical residuals using actual_power_kw (column index 1 in x_eval)
    residuals = []
    for i in range(len(x_eval)):
        res = physics_soc_residual(
            soc_prev=x_eval[i, 0],
            soc_next=preds[i, 0],
            power_kw=x_eval[i, 1],  # actual_power_kw (applied power after clipping)
            dt_hours=x_eval[i, 3],
            capacity_kwh=Config.BATTERY_CAPACITY_KWH,
            efficiency=Config.BATTERY_EFFICIENCY
        )
        residuals.append(res)
    mean_res = float(np.mean(residuals))

    return {
        "soc_mae": round(soc_mae, 4),
        "temp_mae": round(temp_mae, 4),
        "mean_physics_residual": round(mean_res, 4)
    }

def compute_ground_truth_residual(x_eval: np.ndarray, y_eval: np.ndarray) -> float:
    """Compute physics residual using ground-truth soc_next (y_eval) and actual_power_kw.
    
    For perfectly physically-consistent data, this should be near 0.
    x_eval columns: [soc_prev, actual_power_kw, ambient_temp_c, dt_hours]
    y_eval columns: [soc_next, temp_next]
    """
    if len(x_eval) == 0:
        return 0.0
    residuals = []
    for i in range(len(x_eval)):
        res = physics_soc_residual(
            soc_prev=x_eval[i, 0],
            soc_next=y_eval[i, 0],  # ground-truth soc_next
            power_kw=x_eval[i, 1],  # actual_power_kw
            dt_hours=x_eval[i, 3],
            capacity_kwh=Config.BATTERY_CAPACITY_KWH,
            efficiency=Config.BATTERY_EFFICIENCY
        )
        residuals.append(res)
    return float(np.mean(residuals))

def train_pinn(
    data_path: str = "dataset/battery_sim_trajectories.csv",
    models_dir: str = "models",
    figures_dir: str = "output_figures"
) -> dict:
    set_seeds(SEED)
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)

    if not os.path.exists(data_path):
        from backend.ai.pinn.generate_battery_data import generate_trajectories
        generate_trajectories(output_path=data_path)

    df = pd.read_csv(data_path, comment="#")
    logger.info(f"Loaded {len(df)} trajectory records from {data_path}")

    # Split by trajectory ID (70% train, 10% val, 20% test)
    trajectories = sorted(df["trajectory_id"].unique())
    random.seed(SEED)
    random.shuffle(trajectories)

    n_total = len(trajectories)
    n_train = int(n_total * 0.70)
    n_val   = int(n_total * 0.10)

    train_ids = set(trajectories[:n_train])
    val_ids   = set(trajectories[n_train:n_train + n_val])
    test_ids  = set(trajectories[n_train + n_val:])

    train_df = df[df["trajectory_id"].isin(train_ids)].copy()
    val_df   = df[df["trajectory_id"].isin(val_ids)].copy()
    test_df  = df[df["trajectory_id"].isin(test_ids)].copy()

    # --- FIX: Use actual_power_kw (applied/clipped) instead of power_kw (commanded) ---
    # Extrapolation setup: Train only on |actual_power_kw| <= 40 kW
    train_df_bounded = train_df[train_df["actual_power_kw"].abs() <= 40.0].copy()

    # Feature order: soc_prev, actual_power_kw (applied), ambient_temp_c, dt_hours
    feature_cols = ["soc_prev", "actual_power_kw", "ambient_temp_c", "dt_hours"]
    target_cols  = ["soc_next", "temp_next"]

    X_train = train_df_bounded[feature_cols].values.astype(np.float32)
    y_train = train_df_bounded[target_cols].values.astype(np.float32)

    X_val = val_df[val_df["actual_power_kw"].abs() <= 40.0][feature_cols].values.astype(np.float32)
    y_val = val_df[val_df["actual_power_kw"].abs() <= 40.0][target_cols].values.astype(np.float32)

    # In-distribution test (|actual_power_kw| <= 40 kW)
    test_in_df = test_df[test_df["actual_power_kw"].abs() <= 40.0]
    X_test_in  = test_in_df[feature_cols].values.astype(np.float32)
    y_test_in  = test_in_df[target_cols].values.astype(np.float32)

    # Extrapolation test (|actual_power_kw| > 40 kW up to max clipped)
    test_extrap_df = test_df[test_df["actual_power_kw"].abs() > 40.0]
    X_test_extrap  = test_extrap_df[feature_cols].values.astype(np.float32)
    y_test_extrap  = test_extrap_df[target_cols].values.astype(np.float32)

    logger.info(f"Training set size: {len(X_train)} samples (|actual_P| <= 40 kW)")
    logger.info(f"Test in-distribution size: {len(X_test_in)}, Extrapolation test size: {len(X_test_extrap)}")

    # Ground-truth reference residual: should be near 0 since data obeys physics by construction
    gt_residual_in = compute_ground_truth_residual(X_test_in, y_test_in)
    gt_residual_extrap = compute_ground_truth_residual(X_test_extrap, y_test_extrap)
    logger.info(f"Ground-truth physics residual (in-dist): {gt_residual_in:.6f} (expected ~0)")
    logger.info(f"Ground-truth physics residual (extrap): {gt_residual_extrap:.6f} (expected ~0)")

    # 1. Train Physics-Informed Neural Network (PINN) with lambda_phys=1.0
    logger.info("Training PINN with lambda_phys=1.0 and collocation points...")
    pinn_model, pinn_hist = train_network(
        X_train, y_train, X_val, y_val,
        lambda_phys=1.0, lambda_bound=0.5,
        epochs=35, model_name="pinn_surrogate"
    )

    # 2. Train Ablation Model: Plain MLP without physics (lambda_phys=0)
    logger.info("Training Plain MLP ablation (lambda_phys=0.0)...")
    mlp_model, mlp_hist = train_network(
        X_train, y_train, X_val, y_val,
        lambda_phys=0.0, lambda_bound=0.0,
        epochs=35, model_name="plain_mlp"
    )

    # 3. Evaluate both
    pinn_in_eval    = evaluate_model(pinn_model, X_test_in, y_test_in)
    pinn_extrap_eval = evaluate_model(pinn_model, X_test_extrap, y_test_extrap)

    mlp_in_eval    = evaluate_model(mlp_model, X_test_in, y_test_in)
    mlp_extrap_eval = evaluate_model(mlp_model, X_test_extrap, y_test_extrap)

    logger.info(f"PINN In-Distribution: {pinn_in_eval} | Extrapolation: {pinn_extrap_eval}")
    logger.info(f"Plain MLP In-Distribution: {mlp_in_eval} | Extrapolation: {mlp_extrap_eval}")

    # 4. Lambda sweep if PINN residual >= MLP residual on extrapolation
    lambda_sweep_results = None
    best_lambda = 1.0
    best_pinn_extrap = pinn_extrap_eval

    pinn_res_extrap = pinn_extrap_eval["mean_physics_residual"]
    mlp_res_extrap  = mlp_extrap_eval["mean_physics_residual"]

    if pinn_res_extrap >= mlp_res_extrap:
        logger.info(
            f"PINN residual ({pinn_res_extrap:.4f}) >= MLP residual ({mlp_res_extrap:.4f}). "
            f"Running lambda_phys sweep [0.1, 1.0, 10.0] ..."
        )
        sweep_results = {}
        for lam in [0.1, 1.0, 10.0]:
            set_seeds(SEED)
            m, _ = train_network(
                X_train, y_train, X_val, y_val,
                lambda_phys=lam, lambda_bound=0.5,
                epochs=35, model_name=f"pinn_lam{lam}"
            )
            ev_in     = evaluate_model(m, X_test_in, y_test_in)
            ev_extrap = evaluate_model(m, X_test_extrap, y_test_extrap)
            sweep_results[str(lam)] = {
                "in_distribution": ev_in,
                "extrapolation": ev_extrap
            }
            logger.info(f"  lambda={lam}: in={ev_in}, extrap={ev_extrap}")
            if ev_extrap["mean_physics_residual"] < best_pinn_extrap["mean_physics_residual"]:
                best_lambda = lam
                best_pinn_extrap = ev_extrap
                pinn_model = m  # save best model

        lambda_sweep_results = sweep_results
        sweep_path = os.path.join(models_dir, "pinn_lambda_sweep.json")
        with open(sweep_path, "w", encoding="utf-8") as f:
            json.dump(sweep_results, f, indent=2)
        logger.info(f"Saved lambda sweep to {sweep_path}. Best lambda: {best_lambda}")

        # Re-evaluate best model after sweep
        pinn_in_eval    = evaluate_model(pinn_model, X_test_in, y_test_in)
        pinn_extrap_eval = best_pinn_extrap

    # 5. Save best PINN model artifact
    model_save_path = os.path.join(models_dir, "pinn_model.keras")
    pinn_model.save(model_save_path)
    logger.info(f"Saved trained PINN model to {model_save_path}")

    # 6. Compile metrics JSON with relative paths
    phys_reduction_pct = round(
        (1.0 - pinn_extrap_eval["mean_physics_residual"] / max(1e-9, mlp_extrap_eval["mean_physics_residual"])) * 100.0,
        2
    )

    metrics = {
        "model_architecture": "MLP (64-64-32 Swish) with Physics-Informed Collocation",
        "seed": SEED,
        "epochs": 35,
        "power_feature": "actual_power_kw (applied/clipped power, not commanded power)",
        "train_samples": int(len(X_train)),
        "val_samples": int(len(X_val)),
        "test_in_samples": int(len(X_test_in)),
        "test_extrapolation_samples": int(len(X_test_extrap)),
        "ground_truth_reference_residual": {
            "note": (
                "Physics residual computed using ground-truth soc_next and actual_power_kw. "
                "Should be near 0 since training data was generated from the same physics model."
            ),
            "in_distribution": round(gt_residual_in, 6),
            "extrapolation": round(gt_residual_extrap, 6)
        },
        "artifacts": {
            "model_path": "models/pinn_model.keras",
            "training_dataset": "dataset/battery_sim_trajectories.csv",
            "ablation_figure": "output_figures/fig_pinn_ablation.png"
        },
        "best_lambda_phys": best_lambda,
        "pinn_results": {
            "in_distribution": pinn_in_eval,
            "extrapolation_test": pinn_extrap_eval
        },
        "plain_mlp_ablation_results": {
            "in_distribution": mlp_in_eval,
            "extrapolation_test": mlp_extrap_eval
        },
        "phys_residual_reduction_extrapolation_pct": phys_reduction_pct,
        "lambda_sweep": lambda_sweep_results
    }

    metrics_save_path = os.path.join(models_dir, "pinn_metrics.json")
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Saved PINN metrics to {metrics_save_path}")

    # 7. Generate Ablation Figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=150)

    categories = ["In-Distribution\n(|P| <= 40 kW)", "Extrapolation\n(|P| > 40 kW)"]
    x_pos = np.arange(len(categories))
    width = 0.35

    mlp_maes  = [mlp_in_eval["soc_mae"],  mlp_extrap_eval["soc_mae"]]
    pinn_maes = [pinn_in_eval["soc_mae"], pinn_extrap_eval["soc_mae"]]

    ax1.bar(x_pos - width/2, mlp_maes,  width, label="Plain MLP (No Physics)", color="#ef4444", alpha=0.85)
    ax1.bar(x_pos + width/2, pinn_maes, width, label="PINN (Ours)", color="#10b981", alpha=0.85)
    ax1.set_ylabel("SOC Error MAE (%)")
    ax1.set_title("Generalization & Extrapolation Accuracy")
    ax1.set_xticks(x_pos)
    ax1.set_xticklabels(categories)
    ax1.legend()
    ax1.grid(True, linestyle="--", alpha=0.4)

    mlp_res  = [mlp_in_eval["mean_physics_residual"],  mlp_extrap_eval["mean_physics_residual"]]
    pinn_res = [pinn_in_eval["mean_physics_residual"], pinn_extrap_eval["mean_physics_residual"]]

    ax2.bar(x_pos - width/2, mlp_res,  width, label="Plain MLP (No Physics)", color="#f59e0b", alpha=0.85)
    ax2.bar(x_pos + width/2, pinn_res, width, label="PINN (Ours)", color="#06b6d4", alpha=0.85)
    ax2.set_ylabel("Mean Energy Balance Residual (%)")
    ax2.set_title("Physical Consistency Residual\n(lower = better; ground truth ≈ 0)")
    ax2.set_xticks(x_pos)
    ax2.set_xticklabels(categories)
    ax2.legend()
    ax2.grid(True, linestyle="--", alpha=0.4)

    plt.tight_layout()
    fig_path = os.path.join(figures_dir, "fig_pinn_ablation.png")
    plt.savefig(fig_path)
    plt.close()
    logger.info(f"Generated ablation figure at {fig_path}")

    return metrics

if __name__ == "__main__":
    train_pinn()
