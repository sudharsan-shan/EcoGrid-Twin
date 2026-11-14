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
   - **PINN Surrogate & Validator**: Real trained neural surrogate (`models/pinn_model.keras`, 64-64-32 MLP with Swish activation) enforcing differential energy balance and boundary penalties on collocation points, plus analytical electrochemical consistency score $C = \max(0, 1 - 0.05R - 0.01P)$.
3. **Intelligence & Optimization Layer**:
   - **Stacked LSTM Point Forecaster with Calibrated Intervals**: 64-32 sequence-to-sequence deep neural network trained on a strict chronological 70/10/20 train/validation/test split. Constructs physical $P_{10}$ and $P_{90}$ bounds from validation empirical residual quantiles (~80% PICP coverage).
   - **Three Dispatch Policies**: `AUTO_AI` (cost & carbon multi-objective), `PEAK_SHAVING` (TNPDCL peak window avoidance), `MAX_RENEWABLE` (100% solar self-consumption), plus `ISLANDED`.
   - **24-Hour Lookahead Smart Dispatch**: PuLP mixed-integer linear programming (MILP) cost optimizer.
4. **Interactive 3D Smart Building Digital Twin**:
   - WebGL / Three.js cutaway visualization of the two-floor facility (30m x 16m) with roof toggle, room loads, solar panels, battery container, 11kV feeder pole, and dynamic power cable particle flows.
5. **Paper Benchmark & Independent Invariant Validation**:
   - Real-time recomputation of Tables 2–10 with pass/fail tolerance against paper values.
   - Independent verification suite (`validation/independent_checks.py`) checking Kirchhoff power balance, state boundaries, thermal safety limits, and pvlib clear-sky solar reference.
   - One-click CSV export of all 96-step telemetry data and PNG report generation.

---

## 🚀 Quick Start (Windows Setup)

### 1. Backend Setup
```powershell
# In project root:
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m backend.app
```
*Backend API starts at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 2. Frontend Dashboard Setup (Primary Vue 3 App)
```powershell
cd frontend
npm install
npm run dev
```
*Frontend dashboard opens at `http://localhost:5173`.*

### 3. Standalone React 3D Digital Twin Prototype (Optional)
The project also includes a standalone React 3D prototype in `digital-twin/` with its own isolated client-side simulator:
```powershell
cd digital-twin
npm install
npm run dev
```
*React 3D digital twin prototype runs on port `http://localhost:5174` alongside the primary Vue dashboard.*

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
