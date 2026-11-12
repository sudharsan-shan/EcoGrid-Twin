<<<<<<< HEAD
# EcoGrid-Twin — Tamil Nadu Microgrid Telemetry & Digital Twin Platform

A production-grade, read-only digital twin and real-time monitoring platform for microgrid energy management tailored for **Tamil Nadu, India**.

EcoGrid-Twin collects live telemetry from RS485 Modbus RTU smart meters, solar inverters, and battery management systems (BMS), streaming live metrics over WebSockets to an interactive Vue 3 dashboard with **TNPDCL electricity tariff schedules (₹ INR)**, **Asia/Kolkata (IST)** timestamps, and physics-guided digital twin forecasting.

---

## 🌟 Key Architecture & Features

1. **Shared Simulation Store & Deterministic Clock**:
   - Single source of truth (`src/store/simulationStore.js` and `src/config/sharedConfig.js`) used by Overview, Digital Twin, Analytics, Battery, Validation, and Settings.
   - 96 steps of 15 min (24 hours) with Play/Pause, speed multipliers (1x, 2x, 5x, 10x), interactive scrubber, and seed control.
2. **Physics Simulation Core (IEEE/Elsevier Journal Compliant)**:
   - **Solar PV Model**: NOCT cell temperature derating (-0.4%/°C above 25°C), solar geometry, and non-linear cloud attenuation factor $1 - 0.8\cdot(\text{cloud}/100)^{1.3}$.
   - **Building Load Model**: Dual-peak commercial profile ($10:30$ & $15:30$ peaks) with RC thermal HVAC sensitivity ($2.2\text{ kW/}^\circ\text{C}$ cooling above $24^\circ\text{C}$).
   - **Thevenin Battery Model**: Operating bounds $[15\%, 95\%]$ SoC, Joule heating thermal dynamics with convective cooling, and C-rate estimation.
   - **Guardrail Safety Engine**: Continuous projection of setpoints onto physical feasibility boundaries with incident logging.
   - **PINN Validator**: Electrochemical differential consistency score $C = \max(0, 1 - 0.05R - 0.01P)$ and anomaly detection ($R > 0.5$).
3. **Intelligence & Optimization Layer**:
   - Bi-LSTM probabilistic quantile forecasting (P10, P50, P90) for both Solar and Load with MAPE, RMSE, and $R^2$ metrics card.
   - Three dispatch policies: `AUTO_AI` (cost & carbon multi-objective), `PEAK_SHAVING` (TNPDCL peak window avoidance), `MAX_RENEWABLE` (100% solar self-consumption), plus `ISLANDED`.
   - 24-hour lookahead smart dispatch optimizer.
4. **Interactive 3D Smart Building Digital Twin**:
   - WebGL / Three.js cutaway visualization of the two-floor facility (30m x 16m) with roof toggle, room loads, solar panels, battery container, 11kV feeder pole, and dynamic power cable particle flows.
5. **Paper Benchmark Validation & Exports**:
   - Real-time recomputation of Tables 2–10 with pass/fail tolerance against paper values.
   - One-click CSV export of all 96-step telemetry data.
   - One-click PNG report generation.

---

## 🚀 Quick Start (Windows Setup)

### 1. Backend Setup
```powershell
# In project root:
.\.venv\Scripts\activate
python -m backend.app
```
*Backend API starts at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Dashboard Setup
```powershell
cd frontend
npm install
npm run dev
```
*Frontend dashboard opens at `http://localhost:5173`.*

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> | Toggle Simulation Play / Pause |
| <kbd>→</kbd> | Step Time Forward (+15 minutes) |
| <kbd>←</kbd> | Step Time Backward (-15 minutes) |

---

## ⚙️ Paper Preset Values

In the **Settings** page (`http://localhost:5173/settings`), click **Paper Preset** to load:
- **Location**: Chennai, Tamil Nadu ($13.0827^\circ\text{N}, 80.2707^\circ\text{E}$)
- **Solar PV Capacity**: $120\text{ kWp}$
- **BESS Capacity**: $250\text{ kWh} / 60\text{ kW}$
- **SoC Limits**: $15\% - 95\%$
- **TNPDCL Tariffs**: Peak ₹$9.50$, Standard ₹$7.50$, Off-peak ₹$5.80$, Feed-in ₹$3.50$
- **Grid Carbon Factor**: $0.72\text{ kg CO}_2/\text{kWh}$

---

## 🧪 Testing

```powershell
# Run backend Python tests:
.\.venv\Scripts\python.exe -m unittest discover tests

# Run frontend physics simulation tests:
node frontend/tests/simulation.test.mjs
```

---

## 📄 License
MIT — see [LICENSE](LICENSE)
=======
# EcoGrid-Twin
>>>>>>> 5f701f6ab45e17ee3fe650cde6fd464dfc77580a
