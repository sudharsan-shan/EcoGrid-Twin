/**
 * store.ts - Master Zustand Simulation Store
 * Unifies all 7 blocks of the proposed EcoGrid-Twin architecture:
 * 1. Input Data & 2. Preprocessing (TelemetryPipeline & Ring Buffer)
 * 3. Digital Twin (96-Step Canonical Day Simulation & Building Rooms)
 * 4. Forecast + Battery Model (LSTM P10/P50/P90 Forecasts & PINN Battery State)
 * 5. Energy Optimization (Dispatch Modes: AUTO_AI, PEAK_SHAVING, MAX_RENEWABLE, ISLANDED)
 * 6. Output (Live KPIs, System State, Lookahead Schedule)
 * 7. System Evaluation (Intervention logs, Metrics, and Paper Comparisons)
 */

import { create } from 'zustand';
import { MicrogridConfig, PAPER_CONSTANTS } from './config';
import { simulateCanonicalDay, StepTelemetry, DaySimulationResult, BUILDING_ROOMS } from './model';
import { generateForecast, ForecastResult } from './forecast';
import { evaluatePinnBattery, PinnResult } from './pinn';
import { computeLookaheadSchedule, DispatchMode, DispatchPlan } from './dispatch';
import { TelemetryPipeline, TelemetrySample } from './stream';
import { GuardrailIntervention } from './guardrails';

export type ViewPreset = 'free' | 'top' | 'front';
export type ThemeMode = 'dark' | 'light';
export type SimScenario = 'normal' | 'heavy_cloud' | 'load_surge' | 'battery_failure';

export interface EcoGridStore {
  // Config & Modes
  config: MicrogridConfig;
  scenario: SimScenario;
  dispatchMode: DispatchMode;

  // Simulation Simulation Data (Canonical 96 steps)
  dayResult: DaySimulationResult;
  forecast: ForecastResult;
  pinn: PinnResult;
  dispatchPlan: DispatchPlan;
  interventions: GuardrailIntervention[];

  // Clock & Playback
  stepIndex: number;
  playing: boolean;
  speedMultiplier: 1 | 2 | 5 | 10;

  // Real-time Stream Buffer
  telemetryBuffer: TelemetrySample[];

  // 3D & UI Interaction State
  selectedId: string | null;
  hoveredId: string | null;
  roofOpen: boolean;
  viewPreset: ViewPreset;
  toastMessage: string | null;

  // Actions
  tick: () => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: 1 | 2 | 5 | 10) => void;
  scrubTo: (index: number) => void;
  setScenario: (scen: SimScenario) => void;
  setDispatchMode: (mode: DispatchMode) => void;
  updateConfig: (patch: Partial<MicrogridConfig>) => void;
  resetToPaperPreset: () => void;
  selectItem: (id: string | null) => void;
  setHoveredItem: (id: string | null) => void;
  toggleRoof: () => void;
  setViewPreset: (p: ViewPreset) => void;
  setToastMessage: (msg: string | null) => void;
}

const pipeline = new TelemetryPipeline(300);

function recomputeAll(
  cfg: MicrogridConfig,
  scen: SimScenario,
  mode: DispatchMode
) {
  const day = simulateCanonicalDay(cfg, scen, mode);
  const fc = generateForecast(day.steps);
  const pn = evaluatePinnBattery(day.steps, cfg);
  const dp = computeLookaheadSchedule(day.steps, mode, cfg);

  return {
    dayResult: day,
    forecast: fc,
    pinn: pn,
    dispatchPlan: dp,
  };
}

const initialConfig = { ...PAPER_CONSTANTS };
const initialScenario: SimScenario = 'normal';
const initialMode: DispatchMode = 'AUTO_AI';
const initialData = recomputeAll(initialConfig, initialScenario, initialMode);

// Populate initial ring buffer with the first 50 points
for (let i = 0; i < 50; i++) {
  const s = initialData.dayResult.steps[i];
  pipeline.pushSample(
    s.solarKw,
    s.loadKw,
    s.batteryKw,
    s.soc,
    s.batteryTempC,
    s.gridImportKw - s.gridExportKw,
    s.ghi,
    s.ambientTempC,
    s.time
  );
}

export const useEcoGridStore = create<EcoGridStore>((set, get) => ({
  config: initialConfig,
  scenario: initialScenario,
  dispatchMode: initialMode,

  dayResult: initialData.dayResult,
  forecast: initialData.forecast,
  pinn: initialData.pinn,
  dispatchPlan: initialData.dispatchPlan,
  interventions: [],

  stepIndex: 32, // Start at 08:00 AM for lively daytime initial view
  playing: true,
  speedMultiplier: 1,

  telemetryBuffer: pipeline.getBuffer(),

  selectedId: null,
  hoveredId: null,
  roofOpen: true,
  viewPreset: 'free',
  toastMessage: null,

  tick: () => {
    const { stepIndex, dayResult } = get();
    const nextIndex = (stepIndex + 1) % 96;
    const currentStep = dayResult.steps[nextIndex];

    pipeline.pushSample(
      currentStep.solarKw,
      currentStep.loadKw,
      currentStep.batteryKw,
      currentStep.soc,
      currentStep.batteryTempC,
      currentStep.gridImportKw - currentStep.gridExportKw,
      currentStep.ghi,
      currentStep.ambientTempC,
      currentStep.time
    );

    set({
      stepIndex: nextIndex,
      telemetryBuffer: pipeline.getBuffer(),
    });
  },

  setPlaying: (v) => set({ playing: v }),
  setSpeed: (v) => set({ speedMultiplier: v }),
  scrubTo: (index) => {
    const clamped = Math.max(0, Math.min(95, index));
    const s = get().dayResult.steps[clamped];
    pipeline.pushSample(
      s.solarKw,
      s.loadKw,
      s.batteryKw,
      s.soc,
      s.batteryTempC,
      s.gridImportKw - s.gridExportKw,
      s.ghi,
      s.ambientTempC,
      s.time
    );
    set({
      stepIndex: clamped,
      telemetryBuffer: pipeline.getBuffer(),
    });
  },

  setScenario: (scen) => {
    const { config, dispatchMode } = get();
    const computed = recomputeAll(config, scen, dispatchMode);
    set({
      scenario: scen,
      ...computed,
    });
  },

  setDispatchMode: (mode) => {
    const { config, scenario } = get();
    const computed = recomputeAll(config, scenario, mode);
    set({
      dispatchMode: mode,
      ...computed,
    });
  },

  updateConfig: (patch) => {
    const newConfig = { ...get().config, ...patch };
    const { scenario, dispatchMode } = get();
    const computed = recomputeAll(newConfig, scenario, dispatchMode);
    set({
      config: newConfig,
      ...computed,
    });
  },

  resetToPaperPreset: () => {
    const resetCfg = { ...PAPER_CONSTANTS };
    const computed = recomputeAll(resetCfg, 'normal', 'AUTO_AI');
    set({
      config: resetCfg,
      scenario: 'normal',
      dispatchMode: 'AUTO_AI',
      ...computed,
      toastMessage: 'Reset to Chennai Paper Presets (Tables 2-10)',
    });
  },

  selectItem: (id) => set({ selectedId: id }),
  setHoveredItem: (id) => set({ hoveredId: id }),
  toggleRoof: () => set((s) => ({ roofOpen: !s.roofOpen })),
  setViewPreset: (p) => set({ viewPreset: p }),
  setToastMessage: (msg) => set({ toastMessage: msg }),
}));
