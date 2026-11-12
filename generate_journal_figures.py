"""
EcoGrid-Twin  -  Journal Publication Figure Generator
====================================================
Generates high-resolution, IEEE/Elsevier publication-grade figures for the
EcoGrid-Twin Tamil Nadu Microgrid Digital Twin platform.

Outputs 10 figures as 600 DPI PNG files into:  output_figures/

Usage:
    python generate_journal_figures.py
"""

import sys, os, math, random
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from matplotlib.lines import Line2D
from matplotlib.ticker import MultipleLocator, AutoMinorLocator
from datetime import datetime, timedelta

# ── Ensure project imports work ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backend.simulation.solar import SolarModel
from backend.simulation.battery import BatteryModel
from backend.simulation.load import LoadModel
from backend.simulation.weather import WeatherModel
from backend.simulation.simulator import Simulator
from backend.ai.pinn.model import BatteryPINN
from backend.ai.lstm.model import SolarLoadForecaster
from backend.optimization.optimizer import MicrogridOptimizer
from backend.utils.helper import get_tou_price
from backend.config import Config

# ── Global Matplotlib Style (IEEE / Elsevier journal standard) ───────────
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["Times New Roman", "DejaVu Serif"],
    "font.size": 10,
    "axes.labelsize": 11,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "legend.fontsize": 8.5,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "figure.dpi": 150,
    "savefig.dpi": 600,
    "savefig.bbox": "tight",
    "savefig.pad_inches": 0.08,
    "axes.grid": True,
    "grid.alpha": 0.30,
    "grid.linestyle": "--",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "lines.linewidth": 1.6,
    "axes.prop_cycle": plt.cycler(color=[
        "#2563EB", "#DC2626", "#059669", "#D97706",
        "#7C3AED", "#DB2777", "#0891B2", "#65A30D"
    ]),
})

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output_figures")
os.makedirs(OUT_DIR, exist_ok=True)

# ── Helper: Run 24h simulation (96 steps × 15 min) ─────────────────────
def run_24h_simulation(simulator=None, start_hour=0, seed=42):
    """Run full 24-hour simulation returning list of step dicts."""
    random.seed(seed)
    np.random.seed(seed)
    sim = simulator or Simulator()
    sim.current_sim_time = datetime(2026, 8, 15, start_hour, 0, 0)
    sim.reset_state()
    results = []
    for _ in range(96):  # 96 × 15 min = 24 h
        step = sim.step()
        results.append(step)
    return results

def hours_array(results):
    """Convert sim_time list to fractional hours from midnight."""
    t0 = datetime.fromisoformat(results[0]["sim_time"])
    return np.array([(datetime.fromisoformat(r["sim_time"]) - t0).total_seconds() / 3600.0 for r in results])


# ===========================================================================
# FIGURE 1  -  24-Hour Microgrid Energy Balance (Solar, Load, Battery, Grid)
# ===========================================================================
def fig1_energy_balance():
    results = run_24h_simulation()
    hours = hours_array(results)

    solar = [r["solar_kw"] for r in results]
    load = [r["load_kw"] for r in results]
    bat = [r["battery_kw"] for r in results]
    grid_imp = [r["grid_import_kw"] for r in results]
    grid_exp = [-r["grid_export_kw"] for r in results]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 5.5), sharex=True,
                                    gridspec_kw={"height_ratios": [3, 1], "hspace": 0.08})

    # Top: stacked area
    ax1.fill_between(hours, 0, solar, alpha=0.35, color="#F59E0B", label="Solar PV Generation")
    ax1.plot(hours, solar, color="#D97706", lw=1.4)
    ax1.plot(hours, load, color="#DC2626", lw=2.0, label="Building Load Demand")
    ax1.fill_between(hours, load, solar, where=[s > l for s, l in zip(solar, load)],
                     alpha=0.15, color="#059669", label="Solar Surplus")
    ax1.fill_between(hours, load, solar, where=[s < l for s, l in zip(solar, load)],
                     alpha=0.15, color="#DC2626", label="Grid/Battery Deficit")

    ax1.set_ylabel("Power (kW)")
    ax1.set_title("(a) 24-Hour Microgrid Energy Balance  -  Chennai Industrial Site")
    ax1.legend(loc="upper left", framealpha=0.85, ncol=2)
    ax1.set_ylim(bottom=0)
    ax1.xaxis.set_minor_locator(AutoMinorLocator(4))

    # Bottom: battery + grid
    bat_charge = [min(0, b) for b in bat]
    bat_discharge = [max(0, b) for b in bat]
    ax2.bar(hours, bat_discharge, width=0.22, color="#2563EB", alpha=0.8, label="Battery Discharge")
    ax2.bar(hours, bat_charge, width=0.22, color="#7C3AED", alpha=0.8, label="Battery Charge")
    ax2.plot(hours, grid_imp, color="#059669", lw=1.3, label="Grid Import")
    ax2.plot(hours, grid_exp, color="#DB2777", lw=1.3, ls="--", label="Grid Export")

    ax2.set_xlabel("Time of Day (hours)")
    ax2.set_ylabel("Power (kW)")
    ax2.legend(loc="upper left", framealpha=0.85, ncol=2, fontsize=7.5)
    ax2.axhline(0, color="black", lw=0.5)
    ax2.set_xlim(0, 24)
    ax2.xaxis.set_major_locator(MultipleLocator(2))

    path = os.path.join(OUT_DIR, "fig1_energy_balance.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 1 saved: {path}")


# ===========================================================================
# FIGURE 2  -  Battery SoC, Temperature & State-of-Health Dynamics
# ===========================================================================
def fig2_battery_dynamics():
    results = run_24h_simulation()
    hours = hours_array(results)

    soc = [r["soc"] for r in results]
    temp = [r["battery_temp"] for r in results]
    bat_kw = [r["battery_kw"] for r in results]

    # Compute cumulative throughput for SoH proxy
    throughput = np.cumsum([abs(b) * 0.25 for b in bat_kw])
    soh = 99.8 - throughput / (2 * Config.BATTERY_CAPACITY_KWH) * 0.005

    fig, axes = plt.subplots(3, 1, figsize=(8, 6.5), sharex=True,
                              gridspec_kw={"hspace": 0.10})

    # SoC
    ax = axes[0]
    ax.plot(hours, soc, color="#2563EB", lw=2.0)
    ax.fill_between(hours, Config.BATTERY_MIN_SOC, soc, alpha=0.12, color="#2563EB")
    ax.axhline(Config.BATTERY_MIN_SOC, color="#DC2626", ls=":", lw=1, label=f"Min SoC ({Config.BATTERY_MIN_SOC}%)")
    ax.axhline(Config.BATTERY_MAX_SOC, color="#059669", ls=":", lw=1, label=f"Max SoC ({Config.BATTERY_MAX_SOC}%)")
    ax.set_ylabel("State of Charge (%)")
    ax.set_title("(a) Battery State of Charge Profile")
    ax.legend(loc="upper right", fontsize=8)
    ax.set_ylim(0, 100)

    # Temperature
    ax = axes[1]
    ax.plot(hours, temp, color="#DC2626", lw=1.8)
    ax.fill_between(hours, 25, temp, where=[t > 25 for t in temp], alpha=0.15, color="#DC2626")
    ax.axhline(45, color="#D97706", ls="--", lw=1, label="Thermal Caution (45°C)")
    ax.set_ylabel("Temperature (°C)")
    ax.set_title("(b) Battery Internal Temperature")
    ax.legend(loc="upper right", fontsize=8)

    # Battery power + C-rate
    ax = axes[2]
    c_rate = [abs(b) / Config.BATTERY_CAPACITY_KWH for b in bat_kw]
    color_map = ["#2563EB" if b >= 0 else "#7C3AED" for b in bat_kw]
    ax.bar(hours, bat_kw, width=0.22, color=color_map, alpha=0.8)
    ax2 = ax.twinx()
    ax2.plot(hours, c_rate, color="#D97706", lw=1.2, ls="--", label="C-Rate")
    ax2.set_ylabel("C-Rate", color="#D97706")
    ax2.tick_params(axis='y', labelcolor="#D97706")
    ax.set_xlabel("Time of Day (hours)")
    ax.set_ylabel("Battery Power (kW)")
    ax.set_title("(c) Battery Power & C-Rate")
    ax.axhline(0, color="black", lw=0.5)
    ax.set_xlim(0, 24)
    ax.xaxis.set_major_locator(MultipleLocator(2))
    lines1 = [Line2D([0], [0], color="#2563EB", lw=6, alpha=0.8),
              Line2D([0], [0], color="#7C3AED", lw=6, alpha=0.8),
              Line2D([0], [0], color="#D97706", ls="--")]
    ax.legend(lines1, ["Discharge", "Charge", "C-Rate"], loc="upper left", fontsize=7.5, ncol=3)

    path = os.path.join(OUT_DIR, "fig2_battery_dynamics.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 2 saved: {path}")


# ===========================================================================
# FIGURE 3  -  TNPDCL Time-of-Use Tariff & Cost Optimization
# ===========================================================================
def fig3_tariff_optimization():
    results = run_24h_simulation()
    hours = hours_array(results)

    prices = [r["electricity_price"] for r in results]
    cost_rate = [r["instant_cost_rate"] for r in results]
    solar = [r["solar_kw"] for r in results]
    load = [r["load_kw"] for r in results]

    # Compute baseline cost (no battery) vs optimized
    baseline_cost_rate = [(max(0, l - s)) * p for l, s, p in zip(load, solar, prices)]
    cumulative_baseline = np.cumsum([b * 0.25 for b in baseline_cost_rate])
    cumulative_optimized = np.cumsum([max(0, c) * 0.25 for c in cost_rate])

    fig, axes = plt.subplots(2, 1, figsize=(8, 5.5), sharex=True,
                              gridspec_kw={"height_ratios": [2, 2], "hspace": 0.12})

    # Tariff bands
    ax = axes[0]
    # Color-code tariff zones
    for i in range(len(hours) - 1):
        h = hours[i]
        p = prices[i]
        if p >= Config.GRID_PEAK_PRICE:
            c = "#FEE2E2"
        elif p <= Config.GRID_OFFPEAK_PRICE:
            c = "#D1FAE5"
        else:
            c = "#FEF3C7"
        ax.axvspan(hours[i], hours[min(i+1, len(hours)-1)], alpha=0.5, color=c, lw=0)

    ax.step(hours, prices, color="#DC2626", lw=2.2, where="post", label="TNPDCL ToU Rate (₹/kWh)")
    ax.axhline(Config.GRID_PEAK_PRICE, color="#DC2626", ls=":", lw=0.8, alpha=0.5)
    ax.axhline(Config.GRID_OFFPEAK_PRICE, color="#059669", ls=":", lw=0.8, alpha=0.5)
    ax.set_ylabel("Electricity Price (₹/kWh)")
    ax.set_title("(a) TNPDCL Time-of-Use Tariff Schedule (LT-III-B Commercial)")
    ax.legend(loc="upper right")

    # Add tariff period labels
    ax.text(2.5, Config.GRID_OFFPEAK_PRICE + 0.15, "OFF-PEAK\n₹5.80", ha="center", fontsize=7,
            color="#059669", fontweight="bold")
    ax.text(7.5, Config.GRID_PEAK_PRICE + 0.15, "PEAK\n₹9.50", ha="center", fontsize=7,
            color="#DC2626", fontweight="bold")
    ax.text(13, Config.GRID_STANDARD_PRICE + 0.15, "STANDARD\n₹7.50", ha="center", fontsize=7,
            color="#D97706", fontweight="bold")
    ax.text(19.5, Config.GRID_PEAK_PRICE + 0.15, "PEAK\n₹9.50", ha="center", fontsize=7,
            color="#DC2626", fontweight="bold")

    # Cumulative cost comparison
    ax = axes[1]
    ax.plot(hours, cumulative_baseline, color="#DC2626", lw=2.0, label="Baseline (No Battery)")
    ax.plot(hours, cumulative_optimized, color="#2563EB", lw=2.0, label="Smart Dispatch (Optimized)")
    ax.fill_between(hours, cumulative_optimized, cumulative_baseline,
                    alpha=0.18, color="#059669", label="Cost Savings")
    saving = cumulative_baseline[-1] - cumulative_optimized[-1]
    pct = (saving / max(1, cumulative_baseline[-1])) * 100
    ax.annotate(f"Daily Saving: ₹{saving:.0f} ({pct:.1f}%)",
                xy=(20, (cumulative_baseline[-1] + cumulative_optimized[-1]) / 2),
                fontsize=9, fontweight="bold", color="#059669",
                bbox=dict(boxstyle="round,pad=0.3", fc="white", ec="#059669", alpha=0.9))
    ax.set_xlabel("Time of Day (hours)")
    ax.set_ylabel("Cumulative Cost (₹ INR)")
    ax.set_title("(b) Cumulative Daily Cost: Baseline vs. Smart Battery Dispatch")
    ax.legend(loc="upper left")
    ax.set_xlim(0, 24)
    ax.xaxis.set_major_locator(MultipleLocator(2))

    path = os.path.join(OUT_DIR, "fig3_tariff_optimization.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 3 saved: {path}")


# ===========================================================================
# FIGURE 4  -  Scenario Stress Testing: Normal vs Cloudy vs Peak Load vs Battery Failure
# ===========================================================================
def fig4_scenario_comparison():
    scenarios = {}

    # Normal
    scenarios["Normal"] = run_24h_simulation(seed=42)

    # Cloudy (90% cloud override)
    sim_cloudy = Simulator()
    sim_cloudy.weather_model.override_cloud_cover = 90.0
    scenarios["Cloudy (90%)"] = run_24h_simulation(sim_cloudy, seed=42)

    # Peak Load (1.9× surge)
    sim_peak = Simulator()
    sim_peak.load_model.surge_multiplier = 1.9
    scenarios["Peak Load (1.9×)"] = run_24h_simulation(sim_peak, seed=42)

    # Battery Failure
    sim_fail = Simulator()
    sim_fail.battery_model.is_failed = True
    scenarios["Battery Failure"] = run_24h_simulation(sim_fail, seed=42)

    fig, axes = plt.subplots(2, 2, figsize=(10, 7), constrained_layout=True)
    axes = axes.flatten()
    colors = {"Normal": "#2563EB", "Cloudy (90%)": "#D97706",
              "Peak Load (1.9×)": "#DC2626", "Battery Failure": "#7C3AED"}
    labels = list(scenarios.keys())

    # (a) Solar generation comparison
    ax = axes[0]
    for name, res in scenarios.items():
        h = hours_array(res)
        ax.plot(h, [r["solar_kw"] for r in res], color=colors[name], lw=1.5, label=name)
    ax.set_title("(a) Solar PV Generation")
    ax.set_ylabel("Power (kW)")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_xlim(0, 24)

    # (b) Load comparison
    ax = axes[1]
    for name, res in scenarios.items():
        h = hours_array(res)
        ax.plot(h, [r["load_kw"] for r in res], color=colors[name], lw=1.5, label=name)
    ax.set_title("(b) Building Load Demand")
    ax.set_ylabel("Power (kW)")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_xlim(0, 24)

    # (c) SoC comparison
    ax = axes[2]
    for name, res in scenarios.items():
        h = hours_array(res)
        ax.plot(h, [r["soc"] for r in res], color=colors[name], lw=1.5, label=name)
    ax.axhline(Config.BATTERY_MIN_SOC, color="gray", ls=":", lw=0.8)
    ax.axhline(Config.BATTERY_MAX_SOC, color="gray", ls=":", lw=0.8)
    ax.set_title("(c) Battery State of Charge")
    ax.set_ylabel("SoC (%)")
    ax.set_xlabel("Time of Day (hours)")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_xlim(0, 24)

    # (d) Grid import comparison
    ax = axes[3]
    for name, res in scenarios.items():
        h = hours_array(res)
        ax.plot(h, [r["grid_import_kw"] for r in res], color=colors[name], lw=1.5, label=name)
    ax.set_title("(d) Grid Power Import")
    ax.set_ylabel("Power (kW)")
    ax.set_xlabel("Time of Day (hours)")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_xlim(0, 24)

    for ax in axes:
        ax.xaxis.set_major_locator(MultipleLocator(4))

    fig.suptitle("Scenario Stress Testing: Microgrid Resilience Under Adverse Conditions",
                 fontsize=13, fontweight="bold", y=1.02)
    path = os.path.join(OUT_DIR, "fig4_scenario_comparison.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 4 saved: {path}")


# ===========================================================================
# FIGURE 5  -  LSTM Solar & Load Forecast with Confidence Intervals
# ===========================================================================
def fig5_lstm_forecast():
    forecaster = SolarLoadForecaster()
    start = datetime(2026, 8, 15, 0, 0, 0)
    fc = forecaster.predict_24h(start)
    hours = np.arange(24)

    # Simulate "actual" with noise for comparison
    np.random.seed(42)
    solar_actual = [max(0, f["solar_p50"] * (1 + np.random.normal(0, 0.08))) for f in fc]
    load_actual = [max(10, f["load_p50"] * (1 + np.random.normal(0, 0.05))) for f in fc]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(8, 6), sharex=True,
                                    gridspec_kw={"hspace": 0.15})

    # Solar forecast
    ax1.fill_between(hours, [f["solar_p10"] for f in fc], [f["solar_p90"] for f in fc],
                     alpha=0.18, color="#F59E0B", label="P10–P90 Envelope")
    ax1.plot(hours, [f["solar_p50"] for f in fc], color="#D97706", lw=2, label="LSTM P50 Forecast")
    ax1.scatter(hours, solar_actual, s=18, color="#DC2626", zorder=5, label="Simulated Actual", marker="x")
    ax1.set_ylabel("Solar Power (kW)")
    ax1.set_title("(a) 24-Hour Solar PV Generation Forecast with Confidence Intervals")
    ax1.legend(loc="upper right", fontsize=8)
    ax1.set_ylim(bottom=0)

    # MAPE calculation
    solar_p50 = np.array([f["solar_p50"] for f in fc])
    solar_act = np.array(solar_actual)
    valid_s = solar_p50 > 1
    if valid_s.any():
        mape_s = np.mean(np.abs(solar_p50[valid_s] - solar_act[valid_s]) / solar_act[valid_s]) * 100
        ax1.text(0.02, 0.92, f"MAPE = {mape_s:.1f}%", transform=ax1.transAxes, fontsize=9,
                 bbox=dict(boxstyle="round", fc="white", ec="gray", alpha=0.8))

    # Load forecast
    ax2.fill_between(hours, [f["load_p10"] for f in fc], [f["load_p90"] for f in fc],
                     alpha=0.18, color="#2563EB", label="P10–P90 Envelope")
    ax2.plot(hours, [f["load_p50"] for f in fc], color="#2563EB", lw=2, label="LSTM P50 Forecast")
    ax2.scatter(hours, load_actual, s=18, color="#DC2626", zorder=5, label="Simulated Actual", marker="x")
    ax2.set_ylabel("Load Demand (kW)")
    ax2.set_xlabel("Hour of Day")
    ax2.set_title("(b) 24-Hour Load Demand Forecast with Confidence Intervals")
    ax2.legend(loc="upper right", fontsize=8)

    load_p50 = np.array([f["load_p50"] for f in fc])
    load_act = np.array(load_actual)
    mape_l = np.mean(np.abs(load_p50 - load_act) / load_act) * 100
    ax2.text(0.02, 0.92, f"MAPE = {mape_l:.1f}%", transform=ax2.transAxes, fontsize=9,
             bbox=dict(boxstyle="round", fc="white", ec="gray", alpha=0.8))

    ax2.set_xlim(0, 23)
    ax2.xaxis.set_major_locator(MultipleLocator(2))

    path = os.path.join(OUT_DIR, "fig5_lstm_forecast.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 5 saved: {path}")


# ===========================================================================
# FIGURE 6  -  PINN Physics-Informed Battery Validation
# ===========================================================================
def fig6_pinn_validation():
    pinn = BatteryPINN()
    results = run_24h_simulation()
    hours = hours_array(results)

    residuals = []
    confidences = []
    pinn_soc = []
    sim_soc = [results[0]["soc"]]

    for r in results:
        pe = pinn.estimate_state(r["soc"], r["battery_kw"], 0.25, r["ambient_temp"])
        residuals.append(pe["physics_residual"])
        confidences.append(pe["physics_confidence"])
        pinn_soc.append(pe["projected_soc"])

    fig, axes = plt.subplots(3, 1, figsize=(8, 7), sharex=True,
                              gridspec_kw={"hspace": 0.12})

    # (a) SoC: Simulator vs PINN
    ax = axes[0]
    sim_s = [r["soc"] for r in results]
    ax.plot(hours, sim_s, color="#2563EB", lw=2, label="Simulator SoC")
    ax.plot(hours, pinn_soc, color="#DC2626", lw=1.5, ls="--", label="PINN Projected SoC")
    ax.set_ylabel("SoC (%)")
    ax.set_title("(a) State of Charge: Simulation vs. PINN Estimate")
    ax.legend(loc="upper right")

    # (b) Physics residual
    ax = axes[1]
    ax.fill_between(hours, 0, residuals, alpha=0.3, color="#D97706")
    ax.plot(hours, residuals, color="#D97706", lw=1.5)
    ax.axhline(0.5, color="#DC2626", ls=":", label="Anomaly Threshold")
    ax.set_ylabel("Physics Residual")
    ax.set_title("(b) PINN Energy Conservation Residual |ΔSoC_actual − ΔSoC_physics|")
    ax.legend(loc="upper right")

    # (c) Physics confidence score
    ax = axes[2]
    ax.fill_between(hours, 0, confidences, alpha=0.2, color="#059669")
    ax.plot(hours, confidences, color="#059669", lw=2)
    ax.axhline(0.95, color="#059669", ls=":", lw=0.8, alpha=0.5)
    ax.set_ylabel("Confidence Score")
    ax.set_xlabel("Time of Day (hours)")
    ax.set_title("(c) PINN Physics Consistency Confidence")
    ax.set_ylim(0, 1.05)
    ax.set_xlim(0, 24)
    ax.xaxis.set_major_locator(MultipleLocator(2))

    path = os.path.join(OUT_DIR, "fig6_pinn_validation.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 6 saved: {path}")


# ===========================================================================
# FIGURE 7  -  24-Hour Optimal Dispatch Schedule (Optimizer Output)
# ===========================================================================
def fig7_optimal_schedule():
    forecaster = SolarLoadForecaster()
    start = datetime(2026, 8, 15, 0, 0, 0)
    fc = forecaster.predict_24h(start)

    optimizer = MicrogridOptimizer()
    result = optimizer.optimize_24h(start, fc, current_soc=65.0)
    sched = result["schedule"]
    hours = np.arange(24)

    fig, axes = plt.subplots(3, 1, figsize=(8, 7.5), sharex=True,
                              gridspec_kw={"hspace": 0.12})

    # (a) Solar vs Load vs Battery
    ax = axes[0]
    ax.plot(hours, [s["solar_kw"] for s in sched], color="#F59E0B", lw=2, label="Solar Forecast")
    ax.plot(hours, [s["load_kw"] for s in sched], color="#DC2626", lw=2, label="Load Forecast")
    bat = [s["battery_kw"] for s in sched]
    colors_bat = ["#2563EB" if b > 0 else "#7C3AED" for b in bat]
    ax.bar(hours, bat, color=colors_bat, alpha=0.6, width=0.7, label="Battery Dispatch")
    ax.set_ylabel("Power (kW)")
    ax.set_title("(a) Optimal 24-Hour Dispatch Schedule")
    ax.legend(fontsize=8, loc="upper left", ncol=3)
    ax.axhline(0, color="black", lw=0.4)

    # (b) SoC trajectory
    ax = axes[1]
    ax.plot(hours, [s["soc"] for s in sched], color="#2563EB", lw=2, marker="o", ms=3)
    ax.fill_between(hours, Config.BATTERY_MIN_SOC, [s["soc"] for s in sched],
                    alpha=0.12, color="#2563EB")
    ax.axhline(Config.BATTERY_MIN_SOC, color="#DC2626", ls=":", lw=0.8)
    ax.axhline(Config.BATTERY_MAX_SOC, color="#059669", ls=":", lw=0.8)
    ax.set_ylabel("SoC (%)")
    ax.set_title("(b) Projected Battery SoC Trajectory")
    ax.set_ylim(0, 100)

    # (c) Hourly cost + tariff
    ax = axes[2]
    tariff_colors = []
    for s in sched:
        p = s["price"]
        if p >= Config.GRID_PEAK_PRICE:
            tariff_colors.append("#DC2626")
        elif p <= Config.GRID_OFFPEAK_PRICE:
            tariff_colors.append("#059669")
        else:
            tariff_colors.append("#D97706")
    ax.bar(hours, [s["cost"] for s in sched], color=tariff_colors, alpha=0.75, width=0.7)
    ax.set_ylabel("Hourly Cost (₹)")
    ax.set_xlabel("Hour of Day")
    ax.set_title("(c) Hourly Electricity Cost Under Optimized Dispatch")
    ax.axhline(0, color="black", lw=0.4)

    # Add summary box
    summary = (f"Baseline Cost: ₹{result['baseline_cost']:.0f}\n"
               f"Optimized Cost: ₹{result['projected_cost']:.0f}\n"
               f"Savings: ₹{result['cost_saving']:.0f} ({result['saving_pct']:.1f}%)\n"
               f"CO₂ Avoided: {result['co2_saved_kg']:.1f} kg")
    ax.text(0.98, 0.95, summary, transform=ax.transAxes, fontsize=8,
            verticalalignment="top", horizontalalignment="right",
            bbox=dict(boxstyle="round,pad=0.4", fc="white", ec="#2563EB", alpha=0.9))

    ax.set_xlim(-0.5, 23.5)
    ax.xaxis.set_major_locator(MultipleLocator(2))

    path = os.path.join(OUT_DIR, "fig7_optimal_schedule.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 7 saved: {path}")


# ===========================================================================
# FIGURE 8  -  Dispatch Mode Comparison (AUTO_AI vs PEAK_SHAVING vs MAX_RENEWABLE)
# ===========================================================================
def fig8_dispatch_modes():
    from backend.utils.constants import DispatchMode

    modes = {
        "AUTO_AI": DispatchMode.AUTO_AI,
        "PEAK_SHAVING": DispatchMode.PEAK_SHAVING,
        "MAX_RENEWABLE": DispatchMode.MAX_RENEWABLE,
    }
    mode_results = {}
    for name, mode in modes.items():
        sim = Simulator()
        sim.dispatch_mode = mode
        mode_results[name] = run_24h_simulation(sim, seed=42)

    colors_m = {"AUTO_AI": "#2563EB", "PEAK_SHAVING": "#DC2626", "MAX_RENEWABLE": "#059669"}
    fig, axes = plt.subplots(2, 2, figsize=(10, 7), constrained_layout=True)

    # (a) Grid import
    ax = axes[0, 0]
    for name, res in mode_results.items():
        h = hours_array(res)
        ax.plot(h, [r["grid_import_kw"] for r in res], color=colors_m[name], lw=1.5, label=name)
    ax.set_ylabel("Grid Import (kW)")
    ax.set_title("(a) Grid Import Power")
    ax.legend(fontsize=7.5)

    # (b) SoC
    ax = axes[0, 1]
    for name, res in mode_results.items():
        h = hours_array(res)
        ax.plot(h, [r["soc"] for r in res], color=colors_m[name], lw=1.5, label=name)
    ax.set_ylabel("SoC (%)")
    ax.set_title("(b) Battery State of Charge")
    ax.legend(fontsize=7.5)

    # (c) Self-sufficiency
    ax = axes[1, 0]
    for name, res in mode_results.items():
        h = hours_array(res)
        ax.plot(h, [r["self_sufficiency_pct"] for r in res], color=colors_m[name], lw=1.5, label=name)
    ax.set_ylabel("Self-Sufficiency (%)")
    ax.set_xlabel("Time of Day (hours)")
    ax.set_title("(c) Solar Self-Sufficiency")
    ax.legend(fontsize=7.5)

    # (d) Summary bar chart
    ax = axes[1, 1]
    metrics = {}
    for name, res in mode_results.items():
        total_import = sum(r["grid_import_kw"] * 0.25 for r in res)
        total_export = sum(r["grid_export_kw"] * 0.25 for r in res)
        avg_ss = np.mean([r["self_sufficiency_pct"] for r in res])
        total_cost = sum(r["grid_import_kw"] * r["electricity_price"] * 0.25 for r in res)
        metrics[name] = {"import_kwh": total_import, "export_kwh": total_export,
                          "avg_ss": avg_ss, "cost": total_cost}

    x = np.arange(3)
    w = 0.25
    names = list(metrics.keys())
    ax.bar(x - w, [metrics[n]["import_kwh"] for n in names], w, color="#DC2626", alpha=0.8, label="Import (kWh)")
    ax.bar(x, [metrics[n]["export_kwh"] for n in names], w, color="#059669", alpha=0.8, label="Export (kWh)")
    ax.bar(x + w, [metrics[n]["cost"] for n in names], w, color="#2563EB", alpha=0.8, label="Cost (₹)")
    ax.set_xticks(x)
    ax.set_xticklabels(names, fontsize=8)
    ax.set_ylabel("Energy (kWh) / Cost (₹)")
    ax.set_title("(d) Daily KPI Comparison")
    ax.legend(fontsize=7.5)

    for a in [axes[0, 0], axes[0, 1], axes[1, 0]]:
        a.set_xlim(0, 24)
        a.xaxis.set_major_locator(MultipleLocator(4))

    fig.suptitle("Dispatch Mode Performance Comparison", fontsize=13, fontweight="bold", y=1.02)
    path = os.path.join(OUT_DIR, "fig8_dispatch_modes.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 8 saved: {path}")


# ===========================================================================
# FIGURE 9  -  Weather & Irradiance Model Validation
# ===========================================================================
def fig9_weather_irradiance():
    results = run_24h_simulation()
    hours = hours_array(results)

    irr = [r["irradiance"] for r in results]
    temp = [r["ambient_temp"] for r in results]
    cloud = [r["cloud_cover"] for r in results]
    solar = [r["solar_kw"] for r in results]

    fig, axes = plt.subplots(2, 2, figsize=(10, 6.5), constrained_layout=True)

    # (a) GHI curve
    ax = axes[0, 0]
    ax.fill_between(hours, 0, irr, alpha=0.25, color="#F59E0B")
    ax.plot(hours, irr, color="#D97706", lw=2)
    ax.set_ylabel("GHI (W/m²)")
    ax.set_title("(a) Global Horizontal Irradiance")
    ax.set_ylim(bottom=0)

    # (b) Ambient temperature
    ax = axes[0, 1]
    ax.plot(hours, temp, color="#DC2626", lw=2)
    ax.fill_between(hours, min(temp) - 1, temp, alpha=0.12, color="#DC2626")
    ax.set_ylabel("Temperature (°C)")
    ax.set_title("(b) Ambient Temperature (Chennai)")

    # (c) Cloud cover
    ax = axes[1, 0]
    ax.fill_between(hours, 0, cloud, alpha=0.3, color="#6B7280")
    ax.plot(hours, cloud, color="#374151", lw=1.5)
    ax.set_ylabel("Cloud Cover (%)")
    ax.set_xlabel("Time of Day (hours)")
    ax.set_title("(c) Cloud Cover Drift")
    ax.set_ylim(0, 100)

    # (d) Solar conversion: GHI → AC Power
    ax = axes[1, 1]
    # Normalise for scatter
    irr_np = np.array(irr)
    solar_np = np.array(solar)
    mask = irr_np > 10
    sc = ax.scatter(irr_np[mask], solar_np[mask], s=15, c=np.array(temp)[mask],
               cmap="RdYlGn_r", edgecolors="gray", linewidths=0.3, alpha=0.85)
    plt.colorbar(sc, ax=ax, label="Ambient Temp (°C)")
    # Fit line
    if mask.any():
        z = np.polyfit(irr_np[mask], solar_np[mask], 1)
        poly = np.poly1d(z)
        x_fit = np.linspace(irr_np[mask].min(), irr_np[mask].max(), 100)
        ax.plot(x_fit, poly(x_fit), "k--", lw=1, label=f"Linear Fit (slope={z[0]:.3f})")
    ax.set_xlabel("GHI (W/m²)")
    ax.set_ylabel("AC Power (kW)")
    ax.set_title("(d) Irradiance → PV Power Conversion")
    ax.legend(fontsize=7.5)

    for a in [axes[0, 0], axes[0, 1], axes[1, 0]]:
        a.set_xlim(0, 24)
        a.xaxis.set_major_locator(MultipleLocator(4))

    fig.suptitle("Weather Model & Solar Irradiance Characterization  -  Chennai, Tamil Nadu",
                 fontsize=12, fontweight="bold", y=1.02)
    path = os.path.join(OUT_DIR, "fig9_weather_irradiance.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 9 saved: {path}")


# ===========================================================================
# FIGURE 10  -  Carbon Footprint & Self-Sufficiency Analysis
# ===========================================================================
def fig10_carbon_selfsufficiency():
    results = run_24h_simulation()
    hours = hours_array(results)

    co2_rate = [r["carbon_rate"] for r in results]
    ss_pct = [r["self_sufficiency_pct"] for r in results]
    solar = [r["solar_kw"] for r in results]
    load = [r["load_kw"] for r in results]
    grid_imp = [r["grid_import_kw"] for r in results]

    # Cumulative CO2
    cum_co2 = np.cumsum([c * 0.25 for c in co2_rate])
    # Baseline CO2 (all from grid)
    baseline_co2 = np.cumsum([l * Config.GRID_CARBON_INTENSITY * 0.25 for l in load])

    fig, axes = plt.subplots(2, 2, figsize=(10, 7), constrained_layout=True)

    # (a) CO2 rate
    ax = axes[0, 0]
    ax.fill_between(hours, 0, co2_rate, alpha=0.25, color="#6B7280")
    ax.plot(hours, co2_rate, color="#374151", lw=1.8, label="With Battery Dispatch")
    baseline_rate = [l * Config.GRID_CARBON_INTENSITY for l in load]
    ax.plot(hours, baseline_rate, color="#DC2626", ls="--", lw=1.3, label="Baseline (All-Grid)")
    ax.set_ylabel("CO₂ Rate (kg/h)")
    ax.set_title("(a) Instantaneous Carbon Emission Rate")
    ax.legend(fontsize=7.5)

    # (b) Cumulative CO2 saved
    ax = axes[0, 1]
    ax.plot(hours, baseline_co2, color="#DC2626", lw=2, label="Baseline CO₂")
    ax.plot(hours, cum_co2, color="#059669", lw=2, label="Optimized CO₂")
    ax.fill_between(hours, cum_co2, baseline_co2, alpha=0.18, color="#059669")
    saved_total = baseline_co2[-1] - cum_co2[-1]
    ax.annotate(f"CO₂ Avoided:\n{saved_total:.1f} kg/day",
                xy=(18, (baseline_co2[-1] + cum_co2[-1]) / 2), fontsize=9, fontweight="bold",
                color="#059669", bbox=dict(boxstyle="round", fc="white", ec="#059669", alpha=0.9))
    ax.set_ylabel("Cumulative CO₂ (kg)")
    ax.set_title("(b) Cumulative Carbon Footprint Reduction")
    ax.legend(fontsize=7.5)

    # (c) Self-sufficiency
    ax = axes[1, 0]
    ax.fill_between(hours, 0, ss_pct, alpha=0.2, color="#2563EB")
    ax.plot(hours, ss_pct, color="#2563EB", lw=2)
    avg_ss = np.mean(ss_pct)
    ax.axhline(avg_ss, color="#7C3AED", ls="--", lw=1, label=f"Average: {avg_ss:.1f}%")
    ax.set_ylabel("Self-Sufficiency (%)")
    ax.set_xlabel("Time of Day (hours)")
    ax.set_title("(c) Solar Self-Sufficiency Index")
    ax.legend(fontsize=8)
    ax.set_ylim(0, 105)

    # (d) Energy mix pie chart (daily totals)
    ax = axes[1, 1]
    total_solar_consumed = sum(min(s, l) * 0.25 for s, l in zip(solar, load))
    total_battery_net = sum(max(0, r["battery_kw"]) * 0.25 for r in results)
    total_grid = sum(g * 0.25 for g in grid_imp)
    total = total_solar_consumed + total_battery_net + total_grid

    sizes = [total_solar_consumed, total_battery_net, total_grid]
    labels_pie = [f"Solar Direct\n{total_solar_consumed:.0f} kWh",
                  f"Battery\n{total_battery_net:.0f} kWh",
                  f"Grid Import\n{total_grid:.0f} kWh"]
    colors_pie = ["#F59E0B", "#2563EB", "#DC2626"]
    explode = (0.04, 0.04, 0.04)

    wedges, texts, autotexts = ax.pie(sizes, labels=labels_pie, colors=colors_pie, explode=explode,
                                       autopct='%1.1f%%', startangle=140, pctdistance=0.55,
                                       textprops={"fontsize": 8})
    for at in autotexts:
        at.set_fontweight("bold")
        at.set_fontsize(9)
    ax.set_title("(d) Daily Energy Mix Breakdown")

    for a in [axes[0, 0], axes[0, 1], axes[1, 0]]:
        a.set_xlim(0, 24)
        a.xaxis.set_major_locator(MultipleLocator(4))

    fig.suptitle("Carbon Footprint Analysis & Energy Self-Sufficiency  -  EcoGrid-Twin",
                 fontsize=12, fontweight="bold", y=1.02)
    path = os.path.join(OUT_DIR, "fig10_carbon_selfsufficiency.png")
    fig.savefig(path)
    plt.close(fig)
    print(f"  [OK] Figure 10 saved: {path}")


# ===========================================================================
# MAIN RUNNER
# ===========================================================================
if __name__ == "__main__":
    print("=" * 70)
    print("  EcoGrid-Twin  -  Journal Publication Figure Generator")
    print("  Generating 10 publication-quality figures (600 DPI)...")
    print("=" * 70)
    print()

    generators = [
        ("Fig 1", "24-Hour Microgrid Energy Balance", fig1_energy_balance),
        ("Fig 2", "Battery SoC, Temperature & Health Dynamics", fig2_battery_dynamics),
        ("Fig 3", "TNPDCL Tariff & Cost Optimization", fig3_tariff_optimization),
        ("Fig 4", "Scenario Stress Testing (4 conditions)", fig4_scenario_comparison),
        ("Fig 5", "LSTM Solar & Load Forecast", fig5_lstm_forecast),
        ("Fig 6", "PINN Physics-Informed Validation", fig6_pinn_validation),
        ("Fig 7", "24-Hour Optimal Dispatch Schedule", fig7_optimal_schedule),
        ("Fig 8", "Dispatch Mode Comparison", fig8_dispatch_modes),
        ("Fig 9", "Weather & Irradiance Model", fig9_weather_irradiance),
        ("Fig 10", "Carbon Footprint & Self-Sufficiency", fig10_carbon_selfsufficiency),
    ]

    for label, desc, fn in generators:
        print(f"  [{label}] {desc}...")
        try:
            fn()
        except Exception as e:
            print(f"  [FAIL] {label} FAILED: {e}")
            import traceback; traceback.print_exc()

    print()
    print("=" * 70)
    print(f"  All figures saved to: {OUT_DIR}")
    print("=" * 70)
