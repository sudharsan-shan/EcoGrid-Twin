# Trained Machine Learning & Physics-Informed Model Artifacts

This directory contains the serialized weights, preprocessors, empirical calibration tables, and evaluation metrics for the AI and physics surrogate models in **EcoGrid-Twin**. All models use a fixed random seed (`42`) and are strictly reproducible.

---

## 📦 Model Artifacts & Generation Commands

### 1. Physics-Informed Neural Network (PINN) Battery Surrogate
* **`pinn_model.keras`**:
  * **Architecture**: Multi-Layer Perceptron (64-64-32 Swish) predicting $\Delta\text{SOC}$ and $\Delta T_{\text{pack}}$ from $(\text{SOC}_{\text{prev}}, P_{\text{kW}}, T_{\text{amb}}, \Delta t)$.
  * **Loss Function**: Data loss + Energy Conservation Residual Loss ($\lambda_{\text{phys}}=1.0$) + Boundary Penalty ($\lambda_{\text{bound}}=0.5$) evaluated on trajectory samples and domain collocation points.
  * **Seed**: `42`
  * **Training Dataset**: `dataset/battery_sim_trajectories.csv` (10,944 steps, 120 trajectories)
  * **Generation Command**:
    ```powershell
    python -m backend.ai.pinn.train
    ```
* **`pinn_metrics.json`**:
  * Real in-distribution and out-of-distribution (>40 kW extrapolation) test metrics comparing PINN vs Plain MLP ablation.

---

### 2. Stacked LSTM Solar & Load Point Forecaster
* **`lstm_model.keras`**:
  * **Architecture**: Stacked LSTM (64-32 units with BatchNormalization and Dropout) generating 24-step lookahead predictions for solar generation and building load.
  * **Data Split**: Chronological 70% Train (Jan 2025 – Apr 2026), 10% Validation (Apr 2026 – Jun 2026), 20% Test (Jun 2026 – Oct 2026). Zero test set leakage.
  * **Seed**: `42`
  * **Training Dataset**: `dataset/merged_dataset.csv`
  * **Generation Command**:
    ```powershell
    python -m backend.ai.lstm.train
    ```
* **`scaler.pkl`**:
  * Feature and target MinMax scaling parameters fit strictly on the training partition.
* **`training_metrics.json`**:
  * Training epochs, best validation loss, and test MAE/RMSE with relative artifact paths.

---

### 3. Empirical Residual Calibration & Baseline Evaluation
* **`interval_calibration.json`**:
  * Step-by-step empirical residual quantiles ($q_{10}, q_{50}, q_{90}$) computed on the held-out validation set to construct physical P10/P90 prediction intervals.
* **`evaluation_report.json`**:
  * Comparative benchmark report evaluating Persistence, Ridge Regression, and Stacked LSTM on held-out test windows, reporting MAE, RMSE, $R^2$, skill scores, and PICP interval coverage (~80%).
  * **Generation Command**:
    ```powershell
    python -m backend.ai.lstm.evaluate
    ```
