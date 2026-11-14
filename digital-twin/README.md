# EcoGrid Twin — Smart Building 3D Digital Twin

A high-performance, web-based 3D digital twin of a smart building with a real-time microgrid telemetry dashboard.

Built with **React 18**, **TypeScript**, **Three.js** via **@react-three/fiber** & **@react-three/drei**, **Zustand**, **Recharts**, and **Lucide React**.

---

## 🚀 Getting Started

### 1. Installation & Local Development
```bash
cd digital-twin
npm install
npm run dev
```
The application will launch at `http://localhost:5173/`.

### 2. Production Build
```bash
npm run build
npm run preview
```

---

## 📁 Folder Structure

```
digital-twin/src/
├── charts/                     # Recharts data visualizations
│   ├── BatterySocChart.tsx     # SoC curve with 15% and 95% operating limits
│   ├── CumulativeCostChart.tsx # Optimised dispatch vs baseline with savings
│   ├── EnergyBalanceChart.tsx  # 24-hr balance with moving "Now" vertical line
│   └── TariffBandsChart.tsx    # Tamil Nadu ToU hourly tariffs
├── components/                 # UI presentation layer
│   ├── BottomBar.tsx           # 64px footer with scenarios & alert chips
│   ├── KpiCards.tsx            # 2x3 telemetry cards with sparklines & deltas
│   ├── PhoneNotice.tsx         # Responsive mobile fallback notification
│   ├── RoomDetailCard.tsx      # Sub-zone inspector with appliance switches
│   ├── ToastAlert.tsx          # Non-intrusive floating alert toasts
│   └── TopBar.tsx              # 56px header with clock, scrubber & export
├── hooks/                      # Custom hooks & data abstraction
│   ├── useKeyboardShortcuts.ts # Space, Arrows, R, and Esc navigation
│   └── useTwinData.ts          # Safe telemetry bridge (isolated sensor shape)
├── scene/                      # Three.js 3D building model
│   ├── Appliances.tsx          # Low-poly stylized appliances
│   ├── Building.tsx            # 30m x 16m cutaway layout & floor labels
│   ├── Cable.tsx               # Directional power particles (kW scaling)
│   ├── FloatingControls.tsx    # Roof toggle, view presets & legend
│   ├── GridPole.tsx            # External 11kV EB feeder pole
│   ├── Room.tsx                # Hover glow, load pulse & selection focus
│   ├── SceneRoot.tsx           # OrbitControls with smooth fly-to & camera rig
│   ├── SceneSummary.tsx        # Screen reader accessibility alternative
│   ├── SolarPanels.tsx         # 120 kWp tilted rooftop array with dimming
│   └── UtilityEquipment.tsx    # Inverter, 250 kWh battery, EB smart meter
├── sim/                        # Microgrid physics simulation
│   └── simulator.ts            # Diurnal solar, load, ToU tariff & battery math
├── store/                      # Global state management
│   └── simStore.ts             # Zustand store (playback, camera, theme)
├── styles/                     # Design system & tokens
│   └── design-system.css       # Inter typography, WCAG AA tokens & themes
└── types/                      # TypeScript definitions
    └── index.ts                # Strict SensorReading & TwinData schemas
```

---

## 🔌 How to Plug in Real Data (MQTT or REST API)

All presentation, UI, charts, and 3D scenes consume data through the **`useTwinData()`** hook in [`src/hooks/useTwinData.ts`](src/hooks/useTwinData.ts).

To connect real hardware sensors, smart meters, or an MQTT/Kafka broker:

1. **Do not modify any components, 3D scenes, or charts.**
2. Simply replace the data extraction in `src/hooks/useTwinData.ts` to read from your MQTT client or REST endpoint.
3. Ensure every sensor reading returns the standardized shape:
   ```typescript
   export interface SensorReading {
     id: string;        // e.g. "sensor-main-inverter-kw"
     room: string;      // e.g. "Utility Room"
     type: string;      // e.g. "solar_power" | "battery_flow" | "active_load"
     value: number;     // live numerical reading
     unit: string;      // e.g. "kW", "kWh", "%", "°C"
     timestamp: number; // epoch ms
   }
   ```
4. Return the unified `TwinData` interface:
   ```typescript
   return {
     clock: { date, time, stepIndex, totalSteps, playing, speedMultiplier },
     solar,
     load,
     battery,
     grid,
     tariff,
     carbon,
     rooms,
     alerts,
     scenario,
   };
   ```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Toggle Simulation Play / Pause |
| <kbd>→</kbd> | Step Time Forward (+15 minutes) |
| <kbd>←</kbd> | Step Time Backward (-15 minutes) |
| <kbd>R</kbd> | Reset 3D Camera to Default Isometric View |
| <kbd>Esc</kbd> | Close Room Detail Panel / Return to Overview |
