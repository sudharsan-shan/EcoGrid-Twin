# Results Traceability Matrix

This audit matrix establishes the 100% reproducible connection between every table, metric, and figure in the academic manuscript ([`docs/JOURNAL_MANUSCRIPT_RESULTS.md`](JOURNAL_MANUSCRIPT_RESULTS.md)) and the underlying scripts, datasets, and generated artifacts.

---

## 📋 Manuscript Figures Traceability

| Manuscript Figure | Title / Metric Scope | Generator Script | Execution Command | Output Artifact | Underlying Ground Truth / Data Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Figure 1** | 24-Hour Microgrid Energy Balance | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig1_energy_balance.png` | Physics Simulator (`Simulator.step()`, seed=42) |
| **Figure 2** | Battery SoC, Temperature & Health Dynamics | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig2_battery_dynamics.png` | `backend/simulation/battery.py` (Thevenin 2-RC model) |
| **Figure 3** | TNPDCL Tariff Arbitrage & Cost Optimization | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig3_tariff_optimization.png` | `dataset/tariff.csv` & `Simulator.step()` |
| **Figure 4** | Resilience Under Multi-Scenario Stress | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig4_scenario_comparison.png` | `backend/simulation/simulator.py` (4 scenarios) |
| **Figure 5** | Stacked LSTM Forecaster with Calibrated Intervals | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig5_lstm_forecast.png` | `models/lstm_model.keras` & `models/interval_calibration.json` |
| **Figure 6** | PINN Physics Consistency & State Estimation | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig6_pinn_validation.png` | `models/pinn_model.keras` (`BatteryPINN.estimate_state()`) |
| **Figure 7** | 24-Hour Lookahead Smart Dispatch Schedule | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig7_optimal_schedule.png` | `backend/optimization/optimizer.py` (PuLP MILP solver) |
| **Figure 8** | Comparative Benchmarking Across Dispatch Modes | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig8_dispatch_modes.png` | `backend/simulation/simulator.py` (AUTO_AI, PEAK, RENEWABLE) |
| **Figure 9** | Weather Dynamics & Photovoltaic Conversion | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig9_weather_irradiance.png` | `dataset/weather.csv` & `SolarModel.calculate_power()` |
| **Figure 10** | Decarbonization & Energy Self-Sufficiency | `generate_journal_figures.py` | `python generate_journal_figures.py` | `output_figures/fig10_carbon_selfsufficiency.png` | CEA Grid emission baseline ($0.72\text{ kg CO}_2/\text{kWh}$) |
| **Figure S1** | PINN vs Plain MLP Ablation (Extrapolation) | `backend/ai/pinn/train.py` | `python -m backend.ai.pinn.train` | `output_figures/fig_pinn_ablation.png` | `models/pinn_metrics.json` |
| **Figure S2** | LSTM Baseline Benchmarking & Error Degradation | `backend/ai/lstm/evaluate.py` | `python -m backend.ai.lstm.evaluate` | `output_figures/fig_lstm_baselines.png` | `models/evaluation_report.json` |

---

## 📊 Manuscript Tables Traceability

| Manuscript Table | Description | Generating / Extracting Script | Exact Command | Primary Data Files & JSON Artifacts |
| :--- | :--- | :--- | :--- | :--- |
| **Table 1** | System Setup & Physical Parameters | Documentation Specification | Read `backend/config.py` | `backend/config.py`, `dataset/DATA_README.md` |
| **Table 2** | Multi-Scenario Stress Testing Performance | `extract_metrics.py` | `python extract_metrics.py` | `Simulator.step()` across 4 scenario conditions |
| **Table 3** | Dispatch Policy Comparison | `extract_metrics.py` | `python extract_metrics.py` | `Simulator.step()` across 3 dispatch modes |
| **Table 4** (Table 6) | Forecaster Test Performance vs Baselines | `backend/ai/lstm/evaluate.py` | `python -m backend.ai.lstm.evaluate` | `models/evaluation_report.json` (Zero test leakage split) |
| **Table 5** (Table 7) | PINN Model Performance & Extrapolation Ablation | `backend/ai/pinn/train.py` | `python -m backend.ai.pinn.train` | `models/pinn_metrics.json` (In-distribution vs Extrapolation) |
| **Independent Invariants** | Physics Conservation & Clear-Sky Benchmarks | `validation/independent_checks.py` | `python validation/independent_checks.py` | `validation/independent_results.json` (7 of 7 passing) |

---

## 🔍 Dataset Reconciliations

* **Row Counts**: The full dataset spans **63,072 intervals** (January 1, 2025 to October 19, 2026; 657 calendar days at 15-minute resolution).
* **Train / Val / Test Chronological Partition**:
  * **Train**: 11,037 hourly steps (70%): 2025-01-01 to 2026-04-05
  * **Validation**: 1,577 hourly steps (10%): 2026-04-05 to 2026-06-10
  * **Test**: 3,154 hourly steps (20%): 2026-06-10 to 2026-10-19
* **Zero Leakage**: Scaler fit strictly on training data; early stopping evaluated strictly on validation data; test set evaluated strictly once.

