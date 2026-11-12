import { create } from 'zustand';
import type { SimState, Scenario } from '../types';
import { computeStep, resetCloud, STEPS_PER_DAY } from '../sim/simulator';

export type ViewPreset = 'free' | 'top' | 'front';
export type ThemeMode = 'dark' | 'light';

interface SimStore {
  state: SimState;
  selectedId: string | null;
  hoveredId: string | null;

  // Presentation & 3D state
  theme: ThemeMode;
  viewPreset: ViewPreset;
  roofOpen: boolean;
  cameraResetKey: number;
  toastMessage: string | null;

  // Actions
  tick: () => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: 1 | 10 | 60) => void;
  scrubTo: (stepIndex: number) => void;
  setScenario: (s: Scenario) => void;
  selectItem: (id: string | null) => void;
  setHoveredItem: (id: string | null) => void;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  setViewPreset: (p: ViewPreset) => void;
  toggleRoof: () => void;
  resetCamera: () => void;
  setToastMessage: (msg: string | null) => void;
  reset: () => void;
}

const DAY_NOISE = Math.random();

function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem('ecogrid_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // fallback
  }
  return 'dark';
}

function makeInitial(scenario: Scenario = 'normal'): SimState {
  resetCloud(scenario);
  const initial = computeStep(0, 0.55, [], scenario, DAY_NOISE);
  initial.playing = true;
  initial.speedMultiplier = 1;
  return initial;
}

export const useSimStore = create<SimStore>((set, get) => ({
  state: makeInitial('normal'),
  selectedId: null,
  hoveredId: null,

  theme: getStoredTheme(),
  viewPreset: 'free',
  roofOpen: true,
  cameraResetKey: 0,
  toastMessage: null,

  tick() {
    const { state } = get();
    if (!state.playing) return;
    const nextStep = (state.stepIndex + 1) % STEPS_PER_DAY;
    const next = computeStep(
      nextStep,
      state.battery.soc,
      state.history,
      state.scenario,
      DAY_NOISE,
    );
    next.playing = true;
    next.speedMultiplier = state.speedMultiplier;
    set({ state: next });
  },

  setPlaying(v) {
    set((s) => ({ state: { ...s.state, playing: v } }));
  },

  setSpeed(v) {
    set((s) => ({ state: { ...s.state, speedMultiplier: v } }));
  },

  scrubTo(stepIndex) {
    const { state } = get();
    resetCloud(state.scenario);
    let soc = 0.55;
    let history = [] as typeof state.history;
    let sim = state;
    for (let i = 0; i <= stepIndex; i++) {
      sim = computeStep(i, soc, history, state.scenario, DAY_NOISE);
      soc = sim.battery.soc;
      history = sim.history;
    }
    sim.playing = false;
    sim.speedMultiplier = state.speedMultiplier;
    set({ state: sim });
  },

  setScenario(s) {
    resetCloud(s);
    const next = makeInitial(s);
    next.playing = false;
    set({
      state: next,
      toastMessage: `Switched to ${s.replace('_', ' ')} scenario`,
    });
  },

  selectItem(id) {
    set({ selectedId: id });
  },

  setHoveredItem(id) {
    set({ hoveredId: id });
  },

  setTheme(t) {
    try {
      localStorage.setItem('ecogrid_theme', t);
      document.documentElement.setAttribute('data-theme', t);
    } catch {
      // fallback
    }
    set({ theme: t });
  },

  toggleTheme() {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setViewPreset(p) {
    set({ viewPreset: p });
  },

  toggleRoof() {
    set((s) => ({ roofOpen: !s.roofOpen }));
  },

  resetCamera() {
    set((s) => ({
      cameraResetKey: s.cameraResetKey + 1,
      viewPreset: 'free',
      selectedId: null,
    }));
  },

  setToastMessage(msg) {
    set({ toastMessage: msg });
  },

  reset() {
    const { state } = get();
    const next = makeInitial(state.scenario);
    next.speedMultiplier = state.speedMultiplier;
    set({ state: next, selectedId: null });
  },
}));
