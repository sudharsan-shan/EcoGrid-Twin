"""
Model training routine for LSTM forecaster using historical time series dataset.
Trains a sequence-to-sequence neural architecture on merged microgrid datasets,
using a strict chronological 70/10/20 train/validation/test split.
Evaluates test MAE/RMSE, and serializes model artifacts to the models/ directory.
"""

import os
import json
import random
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from pathlib import Path

# Suppress excessive TensorFlow logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, callbacks

from backend.config import Config
from backend.ai.lstm.preprocess import (
    DataPreprocessor,
    load_and_preprocess_dataset,
    create_sequences,
    FEATURE_COLUMNS,
    TARGET_COLUMNS,
)
from backend.utils.logger import logger

SEED = 42

def set_seeds(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)

def build_lstm_model(input_shape: tuple, output_dim: int = 48) -> keras.Model:
    """
    Builds a stacked LSTM point forecaster with dropout regularization.
    input_shape: (seq_length, num_features), e.g. (24, 9)
    output_dim: 48 (24 steps solar + 24 steps load)
    """
    inputs = keras.Input(shape=input_shape, name="historical_inputs")
    
    x = layers.LSTM(64, return_sequences=True, dropout=0.1, recurrent_dropout=0.0, name="lstm_layer_1")(inputs)
    x = layers.BatchNormalization()(x)
    x = layers.LSTM(32, return_sequences=False, dropout=0.1, name="lstm_layer_2")(x)
    
    x = layers.Dense(64, activation="relu", name="dense_features")(x)
    x = layers.Dropout(0.1)(x)
    outputs = layers.Dense(output_dim, activation="linear", name="forecast_outputs")(x)
    
    model = keras.Model(inputs=inputs, outputs=outputs, name="SolarLoad_LSTM_Forecaster")
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss="huber",
        metrics=["mae", "mse"]
    )
    return model

def train_lstm_forecaster(
    dataset_path: Optional[str] = None,
    epochs: int = 25,
    batch_size: int = 64,
    seq_length: int = 24,
    pred_horizon: int = 24,
    models_dir: str = "models"
) -> Dict[str, Any]:
    """
    Train and calibrate LSTM forecaster using chronological 70/10/20 train/val/test split.
    """
    set_seeds(SEED)

    if dataset_path is None:
        dataset_path = os.path.join(Config.DATASET_DIR, "merged_dataset.csv")

    logger.info(f"Initiating LSTM training sequence using dataset: {dataset_path}")
    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Training dataset not found at {dataset_path}")

    # 1. Load and resample dataset
    df = load_and_preprocess_dataset(dataset_path, freq="1h")
    total_len = len(df)
    logger.info(f"Loaded {total_len} hourly records after calendar transformation.")

    # 2. Strict Chronological 70% Train, 10% Validation, 20% Test Split
    train_end = int(total_len * 0.70)
    val_end   = int(total_len * 0.80)

    train_df = df.iloc[:train_end].copy()
    val_df   = df.iloc[train_end:val_end].copy()
    test_df  = df.iloc[val_end:].copy()

    logger.info(f"Chronological split: Train={len(train_df)} ({train_df['timestamp'].iloc[0]} to {train_df['timestamp'].iloc[-1]}), "
                f"Val={len(val_df)} ({val_df['timestamp'].iloc[0]} to {val_df['timestamp'].iloc[-1]}), "
                f"Test={len(test_df)} ({test_df['timestamp'].iloc[0]} to {test_df['timestamp'].iloc[-1]})")

    # 3. Fit preprocessor strictly on training data ONLY
    preprocessor = DataPreprocessor()
    preprocessor.fit(train_df)

    train_scaled = preprocessor.transform(train_df)
    val_scaled   = preprocessor.transform(val_df)
    test_scaled  = preprocessor.transform(test_df)

    X_train_raw = train_scaled[FEATURE_COLUMNS].to_numpy()
    y_train_raw = train_scaled[TARGET_COLUMNS].to_numpy()
    X_val_raw   = val_scaled[FEATURE_COLUMNS].to_numpy()
    y_val_raw   = val_scaled[TARGET_COLUMNS].to_numpy()
    X_test_raw  = test_scaled[FEATURE_COLUMNS].to_numpy()
    y_test_raw  = test_scaled[TARGET_COLUMNS].to_numpy()

    X_train, y_train = create_sequences(X_train_raw, y_train_raw, seq_length=seq_length, pred_horizon=pred_horizon)
    X_val, y_val     = create_sequences(X_val_raw, y_val_raw, seq_length=seq_length, pred_horizon=pred_horizon)
    X_test, y_test   = create_sequences(X_test_raw, y_test_raw, seq_length=seq_length, pred_horizon=pred_horizon)

    logger.info(f"Tensors: Train={X_train.shape}, Val={X_val.shape}, Test={X_test.shape}")

    # 4. Build Model
    model = build_lstm_model(input_shape=(seq_length, len(FEATURE_COLUMNS)), output_dim=pred_horizon * 2)

    # 5. Callbacks: monitor validation loss only
    early_stopping = callbacks.EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=1
    )
    lr_scheduler = callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=2,
        min_lr=1e-5,
        verbose=1
    )

    # 6. Fit Model on Train, validate strictly on Val (NOT Test)
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=epochs,
        batch_size=batch_size,
        callbacks=[early_stopping, lr_scheduler],
        verbose=1
    )

    # 7. Evaluate on Test Set ONCE after best weights restored
    y_test_pred_scaled = model.predict(X_test, batch_size=batch_size)
    solar_true, load_true = preprocessor.inverse_transform_targets(y_test, horizon=pred_horizon)
    solar_pred, load_pred = preprocessor.inverse_transform_targets(y_test_pred_scaled, horizon=pred_horizon)

    # Calculate real test metrics
    solar_mae = float(np.mean(np.abs(solar_pred - solar_true)))
    solar_rmse = float(np.sqrt(np.mean((solar_pred - solar_true) ** 2)))
    load_mae = float(np.mean(np.abs(load_pred - load_true)))
    load_rmse = float(np.sqrt(np.mean((load_pred - load_true) ** 2)))

    # Save model artifacts using relative paths
    os.makedirs(models_dir, exist_ok=True)
    model_save_path = os.path.join(models_dir, "lstm_model.keras")
    scaler_save_path = os.path.join(models_dir, "scaler.pkl")
    metrics_save_path = os.path.join(models_dir, "training_metrics.json")

    model.save(model_save_path)
    preprocessor.save(scaler_save_path)

    epochs_trained = len(history.history["loss"])
    best_val_loss = float(np.min(history.history["val_loss"]))
    final_val_loss = float(history.history["val_loss"][-1])

    results = {
        "model_architecture": "Stacked LSTM (64-32) with Dropout & BatchNormalization",
        "split_method": "Chronological 70% Train / 10% Validation / 20% Test",
        "seed": SEED,
        "epochs_trained": epochs_trained,
        "best_val_loss": round(best_val_loss, 5),
        "final_val_loss": round(final_val_loss, 5),
        "solar_mae_kw": round(solar_mae, 2),
        "solar_rmse_kw": round(solar_rmse, 2),
        "load_mae_kw": round(load_mae, 2),
        "load_rmse_kw": round(load_rmse, 2),
        "samples_train": int(len(X_train)),
        "samples_val": int(len(X_val)),
        "samples_test": int(len(X_test)),
        "artifacts": {
            "model_artifact": "models/lstm_model.keras",
            "scaler_artifact": "models/scaler.pkl",
            "dataset_path": "dataset/merged_dataset.csv"
        }
    }

    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    logger.info(f"LSTM Forecaster training complete! Metrics: {results}")
    return results

if __name__ == "__main__":
    train_lstm_forecaster(epochs=20)
