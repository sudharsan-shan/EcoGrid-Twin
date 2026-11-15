"""
Extract and format verification metrics directly from models/pinn_metrics.json
and models/evaluation_report.json. Ensures zero manual typing of experimental results.
"""

import os
import json

def extract_metrics(
    pinn_metrics_path="models/pinn_metrics.json",
    eval_report_path="models/evaluation_report.json"
):
    summary = {}

    if os.path.exists(pinn_metrics_path):
        with open(pinn_metrics_path, "r", encoding="utf-8") as f:
            pinn = json.load(f)

        comp = pinn.get("full_data_comparison_100pct", {})
        anal = pinn.get("analytical_baseline", {})
        scaling = pinn.get("data_scarcity_scaling", [])

        summary["pinn"] = {
            "best_lambda": comp.get("best_lambda_phys"),
            "in_distribution": {
                "pinn_soc_mae": comp.get("pinn", {}).get("in_distribution", {}).get("soc_mae"),
                "pinn_temp_mae": comp.get("pinn", {}).get("in_distribution", {}).get("temp_mae"),
                "mlp_soc_mae": comp.get("plain_mlp", {}).get("in_distribution", {}).get("soc_mae"),
                "mlp_temp_mae": comp.get("plain_mlp", {}).get("in_distribution", {}).get("temp_mae"),
                "analytical_soc_mae": anal.get("in_distribution", {}).get("soc_mae"),
                "analytical_temp_mae": anal.get("in_distribution", {}).get("temp_mae"),
            },
            "extrapolation": {
                "pinn_soc_mae": comp.get("pinn", {}).get("extrapolation", {}).get("soc_mae"),
                "pinn_temp_mae": comp.get("pinn", {}).get("extrapolation", {}).get("temp_mae"),
                "mlp_soc_mae": comp.get("plain_mlp", {}).get("extrapolation", {}).get("soc_mae"),
                "mlp_temp_mae": comp.get("plain_mlp", {}).get("extrapolation", {}).get("temp_mae"),
                "analytical_soc_mae": anal.get("extrapolation", {}).get("soc_mae"),
                "analytical_temp_mae": anal.get("extrapolation", {}).get("temp_mae"),
            },
            "collocation": {
                "pinn_soc_residual": comp.get("pinn", {}).get("collocation", {}).get("collocation_energy_balance_residual"),
                "pinn_temp_residual": comp.get("pinn", {}).get("collocation", {}).get("collocation_thermal_residual"),
                "pinn_boundary_violations_pct": comp.get("pinn", {}).get("collocation", {}).get("collocation_boundary_violations_pct"),
                "mlp_soc_residual": comp.get("plain_mlp", {}).get("collocation", {}).get("collocation_energy_balance_residual"),
                "mlp_temp_residual": comp.get("plain_mlp", {}).get("collocation", {}).get("collocation_thermal_residual"),
                "mlp_boundary_violations_pct": comp.get("plain_mlp", {}).get("collocation", {}).get("collocation_boundary_violations_pct"),
            },
            "scaling_summary": [
                {
                    "fraction": s["fraction_label"],
                    "samples": s.get("sample_count_mean", s.get("sample_count")),
                    "pinn_in_soc_mae": s["pinn"]["in_distribution"].get("soc_mae_mean", s["pinn"]["in_distribution"].get("soc_mae")),
                    "pinn_in_soc_std": s["pinn"]["in_distribution"].get("soc_mae_std", 0.0),
                    "pinn_in_temp_mae": s["pinn"]["in_distribution"].get("temp_mae_mean", s["pinn"]["in_distribution"].get("temp_mae")),
                    "pinn_in_temp_std": s["pinn"]["in_distribution"].get("temp_mae_std", 0.0),
                    "mlp_in_soc_mae": s["plain_mlp"]["in_distribution"].get("soc_mae_mean", s["plain_mlp"]["in_distribution"].get("soc_mae")),
                    "mlp_in_soc_std": s["plain_mlp"]["in_distribution"].get("soc_mae_std", 0.0),
                    "mlp_in_temp_mae": s["plain_mlp"]["in_distribution"].get("temp_mae_mean", s["plain_mlp"]["in_distribution"].get("temp_mae")),
                    "mlp_in_temp_std": s["plain_mlp"]["in_distribution"].get("temp_mae_std", 0.0),
                    "pinn_colloc_res": s["pinn"]["collocation"].get("soc_residual_mean", s["pinn"]["collocation"].get("collocation_energy_balance_residual")),
                    "mlp_colloc_res": s["plain_mlp"]["collocation"].get("soc_residual_mean", s["plain_mlp"]["collocation"].get("collocation_energy_balance_residual"))
                }
                for s in scaling
            ]
        }

    if os.path.exists(eval_report_path):
        with open(eval_report_path, "r", encoding="utf-8") as f:
            eval_rep = json.load(f)

        summary["lstm"] = {
            "solar": {
                "lstm_rmse": eval_rep["solar_evaluation"]["lstm"]["rmse_kw"],
                "ridge_rmse": eval_rep["solar_evaluation"]["ridge_regression"]["rmse_kw"],
                "persistence_rmse": eval_rep["solar_evaluation"]["persistence"]["rmse_kw"],
                "picp": eval_rep["solar_evaluation"]["prediction_intervals"]["picp_observed_pct"],
                "skill_vs_persist": eval_rep["solar_evaluation"]["lstm_skill_vs_persistence"]
            },
            "load": {
                "lstm_rmse": eval_rep["load_evaluation"]["lstm"]["rmse_kw"],
                "ridge_rmse": eval_rep["load_evaluation"]["ridge_regression"]["rmse_kw"],
                "persistence_rmse": eval_rep["load_evaluation"]["persistence"]["rmse_kw"],
                "picp": eval_rep["load_evaluation"]["prediction_intervals"]["picp_observed_pct"],
                "skill_vs_persist": eval_rep["load_evaluation"]["lstm_skill_vs_persistence"]
            }
        }

    return summary

def print_markdown_table():
    summary = extract_metrics()
    p = summary.get("pinn", {})
    if not p:
        print("No PINN metrics found.")
        return

    print("\n### 🔬 PINN vs. Plain MLP vs. Analytical Reference (100% Data)")
    print("| Metric | Analytical Baseline | Plain MLP | PINN (Ours) |")
    print("| :--- | :---: | :---: | :---: |")
    in_d = p["in_distribution"]
    ex_d = p["extrapolation"]
    col  = p["collocation"]
    print(f"| **In-Dist SOC MAE** | {in_d['analytical_soc_mae']:.4f}% | {in_d['mlp_soc_mae']:.4f}% | **{in_d['pinn_soc_mae']:.4f}%** |")
    print(f"| **In-Dist Temp MAE** | {in_d['analytical_temp_mae']:.4f}°C | {in_d['mlp_temp_mae']:.4f}°C | **{in_d['pinn_temp_mae']:.4f}°C** |")
    print(f"| **Extrapolation SOC MAE** | {ex_d['analytical_soc_mae']:.4f}% | {ex_d['mlp_soc_mae']:.4f}% | **{ex_d['pinn_soc_mae']:.4f}%** |")
    print(f"| **Extrapolation Temp MAE** | {ex_d['analytical_temp_mae']:.4f}°C | {ex_d['mlp_temp_mae']:.4f}°C | **{ex_d['pinn_temp_mae']:.4f}°C** |")
    print(f"| **Collocation SOC Residual** | 0.0000% | {col['mlp_soc_residual']:.4f}% | **{col['pinn_soc_residual']:.4f}%** |")
    print(f"| **Collocation Temp Residual** | 0.0000°C | {col['mlp_temp_residual']:.4f}°C | **{col['pinn_temp_residual']:.4f}°C** |")
    print(f"| **Collocation Boundary Violations** | 0.0% | {col['mlp_boundary_violations_pct']:.2f}% | **{col['pinn_boundary_violations_pct']:.2f}%** |")

    print("\n### 📊 Data Scarcity Scaling Benchmark (5-Seed Average ± Std)")
    print("| Trajectory Fraction | Samples | Plain MLP SOC / Temp MAE | PINN SOC / Temp MAE | Collocation Residual (MLP vs PINN) |")
    print("| :---: | :---: | :---: | :---: | :---: |")
    for s in p.get("scaling_summary", []):
        mlp_str = f"{s['mlp_in_soc_mae']:.4f}±{s['mlp_in_soc_std']:.4f}% / {s['mlp_in_temp_mae']:.4f}±{s['mlp_in_temp_std']:.4f}°C"
        pinn_str = f"{s['pinn_in_soc_mae']:.4f}±{s['pinn_in_soc_std']:.4f}% / {s['pinn_in_temp_mae']:.4f}±{s['pinn_in_temp_std']:.4f}°C"
        print(f"| {s['fraction']} | {s['samples']} | {mlp_str} | {pinn_str} | {s['mlp_colloc_res']:.4f}% vs {s['pinn_colloc_res']:.4f}% |")

if __name__ == "__main__":
    print_markdown_table()
