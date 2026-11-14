import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import os

# Table data aligned with EcoGrid-Twin project & user image structure
data = [
    ["Programming language", "Python 3.13 (backend simulation, AI engines, API)\n& TypeScript / React (digital twin frontend)"],
    ["Development environment", "VS Code, FastAPI backend, React + TypeScript + Three.js frontend\non a Vite dev server"],
    ["Dataset", "Synthetic campus microgrid dataset for 6 facilities\n(case study: IFET College of Engineering / Tamil Nadu Site)"],
    ["Dataset size", "8,760 hourly intervals (35,040 × 15-min dispatch intervals)\nacross 6 facilities = 52,560 facility-hour records"],
    ["Input data", "Simulated facility occupancy and electrical load, ERA5-Land & Open-Meteo\nhourly weather, 120 kWp rooftop solar model, 250 kWh / 60 kW BESS model"],
    ["Meta-Twin / AI model", "Physics-Informed Neural Network (PINN) for battery health validation\n+ Stacked LSTM Forecaster (calibrated prediction intervals) + Tariff Dispatch Optimizer"],
    ["Train / test split", "First 351 days train, final 14 days test (chronological), seed 42"],
    ["Evaluation metrics", "MAE, RMSE, MAPE (Solar: 6.78%, Load: 3.71%), R² (>0.95),\nPhysics Residual Confidence (99.7%)"],
    ["Scenarios simulated", "Baseline, heatwave (+3.5 °C HVAC surge), solar transient dip,\nexamination/load surge, Meta-Twin-guided optimal dispatch"]
]

headers = ["COMPONENT", "PROPOSED SETUP"]

fig, ax = plt.subplots(figsize=(11, 6.2), dpi=300)
ax.axis("off")

table = ax.table(
    cellText=data,
    colLabels=headers,
    colWidths=[0.30, 0.70],
    loc="center",
    cellLoc="left"
)

table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1.0, 2.05)

# Styling
header_color = "#145970"
alt_row_color = "#EAF1F5"
white_row_color = "#F8FAFC"
border_color = "#CBD5E1"

for (row, col), cell in table.get_celld().items():
    cell.set_edgecolor(border_color)
    cell.set_linewidth(1.0)
    
    if row == 0:
        cell.set_facecolor(header_color)
        cell.get_text().set_color("#FFFFFF")
        cell.get_text().set_weight("bold")
        cell.get_text().set_fontsize(11)
        cell.set_height(0.08)
    else:
        bg = alt_row_color if row % 2 == 0 else white_row_color
        cell.set_facecolor(bg)
        if col == 0:
            cell.get_text().set_weight("bold")
            cell.get_text().set_color("#0F172A")
        else:
            cell.get_text().set_color("#1E293B")
        cell.set_height(0.095)

plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.02)

out_path = "proposed_setup_table.png"
plt.savefig(out_path, dpi=300, bbox_inches="tight", pad_inches=0.1)
print(f"Table saved to: {out_path}")
