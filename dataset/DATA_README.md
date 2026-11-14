# EcoGrid-Twin Dataset Provenance & Catalog

This document establishes the single source of truth for all datasets used in **EcoGrid-Twin**.
It clearly distinguishes **real observational data** from **physics-simulated** and **synthetic data**,
ensuring scientific integrity and defensibility for academic review.

---

## 📍 Geographic & Operational Context
* **Case Study Location**: Chennai, Tamil Nadu, India ($13.0827^\circ\text{N}, 80.2707^\circ\text{E}$)
* **Nominal Microgrid Rating**: $120\text{ kWp}$ Solar PV, $250\text{ kWh} / 60\text{ kW}$ Li-ion BESS
* **Native Simulation Resolution**: 15-minute intervals (96 intervals per 24-hour cycle)
* **Date Range**: January 1, 2025 to October 19, 2026 (657 calendar days; 63,072 intervals)

---

## 📊 Dataset Catalog & Provenance Table

| Filename | Rows | Columns | Time Resolution | Date Range | Nature (Real / Synthetic) | Primary Source / Generator | Licence |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `climate_data.csv` | 63,072 | 7 | 15 min | 2025-01-01 to 2026-10-19 | **Real Weather** (interpolated) | **NASA POWER** API (hourly T2M, ALLSKY_SFC_SW_DWN, RH2M, WS10M for Chennai coordinates, linearly interpolated to 15-min) | Public Domain (NASA Open Data) |
| `weather.csv` | 63,072 | 7 | 15 min | 2025-01-01 to 2026-10-19 | **Real Weather** (interpolated) | **NASA POWER** API (temperature, cloud cover, irradiance, humidity) | Public Domain (NASA Open Data) |
| `tariff.csv` | 63,072 | 2 | 15 min | 2025-01-01 to 2026-10-19 | **Real Tariff** | **TNPDCL** (Tamil Nadu Power Distribution Corporation) Commercial Tariff Schedule: Peak ₹9.50, Standard ₹7.50, Off-peak ₹5.80 | Public Regulatory Tariff Order |
| `building_solar.csv` | 63,072 | 5 | 15 min | 2025-01-01 to 2026-10-19 | **Physics-Simulated** | NOCT cell temperature derating & non-linear cloud attenuation model driven by NASA GHI | MIT (Project Generated) |
| `solar_generation.csv` | 63,072 | 5 | 15 min | 2025-01-01 to 2026-10-19 | **Physics-Simulated** | PV power output calculated for 120 kWp array from NASA solar irradiance | MIT (Project Generated) |
| `battery_sim_trajectories.csv` | 10,944 | 10 | 15 min / multi-step | Synthetic (120 cycles) | **Physics-Simulated** | `backend.ai.pinn.generate_battery_data.py` (Thevenin battery model, Joule heating, random multi-day cycling, seed=42) | MIT (Project Generated) |
| `building_data.csv` | 63,072 | 21 | 15 min | 2025-01-01 to 2026-10-19 | **Synthetic** | Campus occupancy schedule & thermal HVAC response. `TODO(owner): confirm source` | MIT |
| `building_energy.csv` | 63,072 | 7 | 15 min | 2025-01-01 to 2026-10-19 | **Synthetic** | Sub-system breakdown (total load, HVAC, lighting, plug loads). `TODO(owner): confirm source` | MIT |
| `building_load_usage.csv` | 63,072 | 10 | 15 min | 2025-01-01 to 2026-10-19 | **Synthetic** | Multi-zone occupancy and thermal usage logs. `TODO(owner): confirm source` | MIT |
| `merged_dataset.csv` | 63,072 | 6 | 15 min | 2025-01-01 to 2026-10-19 | **Composite (Real + Synthetic)** | Merged NASA climate + simulated PV + campus load. Used for LSTM forecaster training. | Mixed (NASA + Project MIT) |
| `forecast.csv` | 12,480 | 3 | 15 min | 2026-06-12 to 2026-10-19 | **Simulated** | Historical reference forecast baseline for comparison. `TODO(owner): confirm source` | MIT |
| `building_equipment.csv` | 7 | 4 | Metadata | Fixed | **Engineering Spec** | 7 campus microgrid equipment ratings (chiller, VRF, lighting, etc.) | MIT |
| `building_info.csv` | 1 | 20 | Metadata | Fixed | **Engineering Spec** | Facility building specifications (2 floors, 480 m², Chennai location) | MIT |
| `building_zones.csv` | 4 | 5 | Metadata | Fixed | **Engineering Spec** | Zone dimensions, areas, and maximum occupancies | MIT |

---

## 🔬 Clarification of Provenance for Examiners

1. **Why 15-Minute Data from NASA POWER?**
   NASA POWER provides hourly meteorological data. To evaluate microgrid dispatch on standard 15-minute intervals, hourly observations (solar irradiance, ambient temperature, relative humidity, and wind speed) were linearly interpolated to 15-minute timesteps.
2. **How Building Loads Were Modeled:**
   The electrical load profiles represent an academic institutional campus building adhering to commercial weekday/weekend operating hours, dual-peak occupancy ($10:30$ and $15:30$), and thermal HVAC sensitivity ($2.2\text{ kW/}^\circ\text{C}$ cooling above $24^\circ\text{C}$).
3. **Battery Trajectory Data:**
   `dataset/battery_sim_trajectories.csv` was explicitly generated via simulation using the project's Thevenin battery model to train the **Physics-Informed Neural Network (PINN) surrogate**.

