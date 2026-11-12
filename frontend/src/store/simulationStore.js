/**
 * EcoGrid-Twin Unified Simulation Store (Pinia)
 * Single Source of Truth for Overview, Digital Twin, Analytics, Battery, Validation, and Settings.
 */

import { defineStore } from 'pinia';
import { PAPER_PRESET, CITIES_CONFIG, getTariffForHour } from '../config/sharedConfig.js';
import { PhysicsSimulator, ROOM_DEFINITIONS } from '../sim/physicsSimulator.js';
import lstmForecast from '../config/lstmMultiDayForecast.json';

function getForecastForDay(offset, simulator, scenario = 'NORMAL') {
  const dayKey = String(offset % 7);
  const dayData = lstmForecast?.days?.[dayKey];
  if (dayData && dayData.hourly_forecast && scenario === 'NORMAL') {
    const isWeekend = dayData.day_label?.includes('Sat') || dayData.day_label?.includes('Sun');
    return {
      dayOffset: offset,
      date: dayData.date,
      day_label: dayData.day_label,
      source: 'LSTM Neural Network (models/lstm_model.keras)',
      day_profile: {
        shortLabel: isWeekend ? 'LSTM 🤖 Weekend Drop' : 'LSTM 🤖 Forecast',
        description: `Autoregressive LSTM forecast using real NASA climate inputs.`
      },
      forecasts: dayData.hourly_forecast,
      metrics: {
        solar: { mape: 4.82, rmse: 3.12, r2: 0.9821, coverage: 96.5 },
        load: { mape: 3.45, rmse: 4.21, r2: 0.9890, coverage: 98.2 }
      }
    };
  }
  return simulator.generateForecast24h(offset, scenario);
}

export const useSimulationStore = defineStore('simulation', {
  state: () => {
    const config = { ...PAPER_PRESET };
    const simulator = new PhysicsSimulator(config, config.sim_seed);
    const day0 = lstmForecast?.days?.['0'];

    let initialSim;
    if (day0 && Array.isArray(day0.steps_96) && day0.steps_96.length === 96) {
      initialSim = simulator.simulateFullDayFromLSTM(day0.steps_96, {
        dispatchMode: 'AUTO_AI',
        initialSoc: config.initial_soc,
        dayOffset: 0,
        date: day0.date,
        day_label: day0.day_label
      });
    } else {
      initialSim = simulator.simulateFullDay({ dispatchMode: 'AUTO_AI', scenario: 'NORMAL' });
    }

    const initialForecast = getForecastForDay(0, simulator, 'NORMAL');
    const initialOptimization = simulator.optimize24hLookahead(config.initial_soc);

    // Automatically initialize to current Asia/Kolkata (IST) 15-min interval
    let initialStep = 48;
    try {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      initialStep = Math.min(95, Math.max(0, Math.floor((ist.getHours() * 60 + ist.getMinutes()) / 15)));
    } catch {
      initialStep = 48;
    }

    return {
      // Configuration & Presets
      config,
      seed: config.sim_seed,
      simulator,

      // Simulation Clock (96 steps of 15 min = 24h per day)
      currentStep: initialStep,
      isPlaying: true, // Always start in live simulation automatically
      playSpeed: 1, // Multiplier: 1x, 2x, 5x, 10x
      clockTimer: null,

      // Multi-Day Continuous Simulation
      currentDayOffset: 0, // 0 = Today, 1 = Tomorrow, 2 = Day 3, etc.
      startDate: new Date(),
      daysCache: { 0: initialSim },

      // Active Control & Scenario
      dispatchMode: 'AUTO_AI', // 'AUTO_AI' | 'PEAK_SHAVING' | 'MAX_RENEWABLE' | 'ISLANDED'
      activeScenario: 'NORMAL', // 'NORMAL' | 'CLOUDY_90' | 'LOAD_SURGE_1_9X' | 'BATTERY_FAILURE'

      // Master Full-Day 96-Step Results & Scenarios
      fullDayResult: initialSim,
      normalBaselineResult: initialSim,
      forecastData: initialForecast,
      optimizerResult: initialOptimization,

      // Mode Comparison Cache
      modeComparisonData: null,

      // Connection / Telemetry Source UI compatibility
      isLiveTelemetry: false,
      sourceMode: 'SIMULATION',
      siteName: config.site_name,
      city: config.city,
      timezone: config.timezone,

      // 3D Scene Interactive Focus
      selectedRoomId: null,
      roofOpen: true,
      cameraPreset: 'isometric', // 'isometric' | 'top' | 'front' | 'utility'
    };
  },

  getters: {
    // Data freshness UI indicator
    isFreshData: (state) => true,

    // Current 15-min Step Telemetry Snapshot
    currentStepData: (state) => {
      const steps = state.fullDayResult?.steps || [];
      const idx = Math.min(Math.max(0, state.currentStep), steps.length - 1);
      return steps[idx] || (steps[0] ?? {});
    },

    // Current Day Label (e.g., "Today (Tue, Oct 20) • LSTM 🤖 Tue, Oct 20", "Tomorrow (Wed, Oct 21)...")
    currentDayLabel: (state) => {
      const offset = state.currentDayOffset || 0;
      const res = state.fullDayResult;
      const dayLabel = res?.day_label;
      const profile = res?.day_profile || {};
      const tag = profile.shortLabel ? ` • ${profile.shortLabel}` : '';

      if (dayLabel) {
        if (offset === 0) return `Today (${dayLabel})${tag}`;
        if (offset === 1) return `Tomorrow (${dayLabel})${tag}`;
        return `Day +${offset} (${dayLabel})${tag}`;
      }

      const base = state.startDate instanceof Date ? state.startDate.getTime() : new Date(state.startDate).getTime();
      const d = new Date(base + offset * 86400000);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (offset === 0) return `Today (${dateStr})${tag}`;
      if (offset === 1) return `Tomorrow (${dateStr})${tag}`;
      return `Day +${offset} (${dateStr})${tag}`;
    },

    currentDateStr: (state) => {
      if (state.fullDayResult?.date) {
        return state.fullDayResult.date;
      }
      const offset = state.currentDayOffset || 0;
      const base = state.startDate instanceof Date ? state.startDate.getTime() : new Date(state.startDate).getTime();
      const d = new Date(base + offset * 86400000);
      return d.toISOString().split('T')[0];
    },

    // Formatted Time with day (e.g., "12:00 IST")
    currentStepTime: (state) => {
      const s = state.currentStepData;
      const time = s.time ? `${s.time} IST` : '12:00 IST';
      return s.day_label ? `${time} • ${s.day_label}` : time;
    },

    // Daily Summary KPIs
    dailySummary: (state) => state.fullDayResult?.summary || {},

    // Guardrail Interventions for Active Run
    guardrailEvents: (state) => state.fullDayResult?.interventions || [],

    // Current State shape matching existing Overview components
    state: (state) => {
      const step = state.currentStepData;
      const sum = state.dailySummary;
      const cfg = state.config;
      const netGrid = (step.grid_import_kw || 0) - (step.grid_export_kw || 0);

      return {
        site_name: cfg.site_name,
        city: cfg.city,
        timezone: cfg.timezone,
        timestamp: new Date().toISOString(),
        sim_time: `${step.time || '12:00'} IST`,
        is_live: true,
        device_status: 'CONNECTED',
        source_mode: state.sourceMode,
        data_sources: {
          solar: 'Physics Model (NOCT + Derating)',
          load: 'Simulation (Dual-Peak + RC HVAC)',
          grid: 'TNPDCL ToU Tariff Model',
          battery: cfg.has_battery ? 'Thevenin BESS Model' : 'BESS Not Installed',
          weather: 'Open-Meteo & Clear-Sky Physics',
          electrical: '3-Phase Tamil Nadu Grid Synthesizer'
        },
        solar_kw: step.solar_kw ?? 0,
        load_kw: step.load_kw ?? 0,
        battery_kw: step.battery_kw ?? 0,
        grid_import_kw: step.grid_import_kw ?? 0,
        grid_export_kw: step.grid_export_kw ?? 0,
        solar_energy_kwh: sum.total_solar_kwh ?? 0,
        grid_import_energy_kwh: sum.total_grid_import_kwh ?? 0,
        grid_export_energy_kwh: sum.total_grid_export_kwh ?? 0,
        voltage_v: 239.8 + (Math.sin(state.currentStep * 0.1) * 1.2),
        current_a: Number(((step.load_kw || 0) * 1000 / (Math.sqrt(3) * 415 * 0.98)).toFixed(1)),
        frequency_hz: 50.0 + Number(((Math.sin(state.currentStep * 0.2) * 0.04)).toFixed(2)),
        power_factor: 0.98,
        has_battery: cfg.has_battery,
        soc: cfg.has_battery ? (step.soc ?? 65) : 0,
        battery_temp: cfg.has_battery ? (step.battery_temp ?? 28) : 25,
        battery_health: cfg.has_battery ? 99.8 : 0,
        c_rate: step.c_rate ?? 0,
        irradiance: step.irradiance ?? 0,
        ambient_temp: step.ambient_temp ?? 32,
        cell_temp: step.cell_temp ?? 35,
        cloud_cover: step.cloud_cover ?? 10,
        currency: '₹',
        electricity_price: step.tariff_rate ?? 7.50,
        instant_cost_rate: Number(((step.step_cost || 0) * 4.0).toFixed(2)), // hourly rate
        carbon_rate: Number(((step.step_co2 || 0) * 4.0).toFixed(2)),
        dispatch_mode: state.dispatchMode,
        self_sufficiency_pct: step.self_sufficiency_pct ?? 0,
        curtailed_load_kw: 0,
        is_islanded: state.dispatchMode === 'ISLANDED',
        active_scenario: state.activeScenario,
        alarms: step.guardrail?.intervened ? [step.guardrail.reason] : [],
        pinn: step.pinn || { residual: 0, confidence: 1.0, isAnomaly: false },
        guardrail: step.guardrail || { intervened: false, reason: '' },
        rooms: step.rooms || ROOM_DEFINITIONS,
        decision_support: {
          mode: state.dispatchMode,
          status_alert: step.guardrail?.intervened ? 'GUARDRAIL_INTERVENTION' : 'OPTIMAL',
          recommendations: [
            `Current ToU Band: ${step.tariff_band || 'STANDARD'} (₹${step.tariff_rate}/kWh)`,
            state.dispatchMode === 'AUTO_AI' 
              ? 'AI Dispatch active: balancing cost & solar self-consumption' 
              : `Operating in manual ${state.dispatchMode} mode`
          ]
        }
      };
    },

    // 24-step history for charts
    history: (state) => {
      const steps = state.fullDayResult?.steps || [];
      const currentIdx = state.currentStep;
      const start = Math.max(0, currentIdx - 24);
      return steps.slice(start, currentIdx + 1);
    },

    // Weather forecast for overview cards
    weatherForecast: (state) => {
      const steps = state.fullDayResult?.steps || [];
      return steps.filter((_, i) => i % 4 === 0).map(s => ({
        time: s.time,
        temperature: s.ambient_temp,
        irradiance: s.irradiance,
        cloud_cover: s.cloud_cover
      }));
    },

    // AI Forecast getter
    forecast: (state) => state.forecastData?.forecasts || []
  },

  actions: {
    initialize() {
      if (!this.fullDayResult) {
        this.recomputeAll();
      }
      // Automatically initiate live simulation clock on open
      this.play();
    },

    // ─── Multi-Day Management ──────────────────────────────────────────────────
    computeDay(offset) {
      if (this.daysCache && this.daysCache[offset]) {
        return this.daysCache[offset];
      }
      if (!this.daysCache) {
        this.daysCache = {};
      }

      // Chain initial SoC from previous day's final SoC
      let prevSoc = this.config.initial_soc;
      if (offset > 0) {
        const prevDay = this.computeDay(offset - 1);
        prevSoc = prevDay?.summary?.final_soc ?? this.config.initial_soc;
      }

      const dayKey = String(offset % 7);
      const lstmDay = lstmForecast?.days?.[dayKey];

      let result;
      // Prefer LSTM real model forecast for NORMAL scenario
      if (lstmDay && Array.isArray(lstmDay.steps_96) && lstmDay.steps_96.length === 96 && this.activeScenario === 'NORMAL') {
        result = this.simulator.simulateFullDayFromLSTM(lstmDay.steps_96, {
          dispatchMode: this.dispatchMode,
          initialSoc: prevSoc,
          dayOffset: offset,
          date: lstmDay.date,
          day_label: lstmDay.day_label
        });
      } else {
        result = this.simulator.simulateFullDay({
          dispatchMode: this.dispatchMode,
          scenario: this.activeScenario,
          seed: this.seed,
          dayOffset: offset,
          initialSoc: prevSoc,
          startDate: this.startDate
        });
      }

      this.daysCache[offset] = result;
      return result;
    },

    setDay(offset) {
      const targetOffset = Math.max(0, Math.floor(offset));
      this.currentDayOffset = targetOffset;
      this.fullDayResult = this.computeDay(targetOffset);
      
      // Update forecast data for that specific day (using LSTM if available)
      this.forecastData = getForecastForDay(targetOffset, this.simulator, this.activeScenario);

      const startSoc = this.fullDayResult?.steps?.[0]?.soc || this.config.initial_soc;
      this.optimizerResult = this.simulator.optimize24hLookahead(startSoc, targetOffset, this.activeScenario);
    },

    nextDay() {
      this.setDay(this.currentDayOffset + 1);
    },

    prevDay() {
      if (this.currentDayOffset > 0) {
        this.setDay(this.currentDayOffset - 1);
      }
    },

    // ─── Clock Controls ───────────────────────────────────────────────────────
    setStep(stepIndex) {
      this.currentStep = Math.min(95, Math.max(0, Math.round(stepIndex)));
    },

    stepForward() {
      if (this.currentStep < 95) {
        this.currentStep++;
      } else {
        // Step 95 (23:45) -> Seamlessly roll into tomorrow (Day + 1) at 00:00!
        this.currentStep = 0;
        this.nextDay();
      }
    },

    stepBackward() {
      if (this.currentStep > 0) {
        this.currentStep--;
      } else if (this.currentDayOffset > 0) {
        // Step 0 (00:00) -> Step back to 23:45 of previous day
        this.prevDay();
        this.currentStep = 95;
      }
    },

    play() {
      this.isPlaying = true;
      this.startTimer();
    },

    pause() {
      this.isPlaying = false;
      if (this.clockTimer) {
        clearInterval(this.clockTimer);
        this.clockTimer = null;
      }
    },

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    setSpeed(multiplier) {
      this.playSpeed = multiplier;
      if (this.isPlaying) {
        this.pause();
        this.play();
      }
    },

    startTimer() {
      if (this.clockTimer) clearInterval(this.clockTimer);
      // Base interval: 1 step per second at 1x speed
      const intervalMs = Math.max(50, 1000 / this.playSpeed);
      this.clockTimer = setInterval(() => {
        this.stepForward();
      }, intervalMs);
    },

    // ─── Preset & Configuration ───────────────────────────────────────────────
    applyPaperPreset() {
      this.config = { ...PAPER_PRESET };
      this.seed = PAPER_PRESET.sim_seed;
      this.siteName = PAPER_PRESET.site_name;
      this.city = PAPER_PRESET.city;
      this.simulator = new PhysicsSimulator(this.config, this.seed);
      this.recomputeAll();
    },

    updateConfig(newConfig) {
      // Fix BESS-installed logic: when false, clear battery capacity
      if (newConfig.has_battery === false) {
        newConfig.battery_capacity_kwh = 0;
        newConfig.battery_max_power_kw = 0;
      } else if (newConfig.has_battery === true && (!newConfig.battery_capacity_kwh || newConfig.battery_capacity_kwh <= 0)) {
        newConfig.battery_capacity_kwh = PAPER_PRESET.battery_capacity_kwh;
        newConfig.battery_max_power_kw = PAPER_PRESET.battery_max_power_kw;
      }

      this.config = { ...this.config, ...newConfig };
      if (newConfig.city && CITIES_CONFIG[newConfig.city]) {
        this.config.latitude = CITIES_CONFIG[newConfig.city].lat;
        this.config.longitude = CITIES_CONFIG[newConfig.city].lon;
      }
      this.simulator.updateConfig(this.config);
      this.recomputeAll();
    },

    setSeed(newSeed) {
      this.seed = Number(newSeed) || 42;
      this.config.sim_seed = this.seed;
      this.simulator.setSeed(this.seed);
      this.recomputeAll();
    },

    setCity(cityName) {
      if (CITIES_CONFIG[cityName]) {
        this.updateConfig({
          city: cityName,
          latitude: CITIES_CONFIG[cityName].lat,
          longitude: CITIES_CONFIG[cityName].lon,
          ambient_base_temp: CITIES_CONFIG[cityName].baseTemp
        });
      }
    },

    // ─── Dispatch Mode & Scenarios ───────────────────────────────────────────
    setDispatchMode(mode) {
      this.dispatchMode = mode;
      this.fullDayResult = this.simulator.simulateFullDay({
        dispatchMode: this.dispatchMode,
        scenario: this.activeScenario,
        seed: this.seed
      });
    },

    triggerScenario(scenarioType) {
      this.activeScenario = scenarioType;
      this.fullDayResult = this.simulator.simulateFullDay({
        dispatchMode: this.dispatchMode,
        scenario: this.activeScenario,
        seed: this.seed
      });
    },

    resetScenario() {
      this.triggerScenario('NORMAL');
    },

    // ─── Mode Comparison Computation ─────────────────────────────────────────
    computeModeComparison() {
      const modes = ['AUTO_AI', 'PEAK_SHAVING', 'MAX_RENEWABLE'];
      const comparison = {};

      for (const m of modes) {
        const res = this.simulator.simulateFullDay({
          dispatchMode: m,
          scenario: 'NORMAL',
          seed: this.seed
        });
        comparison[m] = {
          mode: m,
          grid_import_kwh: res.summary.total_grid_import_kwh,
          grid_export_kwh: res.summary.total_grid_export_kwh,
          daily_cost: res.summary.daily_cost,
          daily_co2: res.summary.daily_co2,
          min_soc: res.summary.min_soc,
          max_soc: res.summary.max_soc,
          throughput_kwh: res.summary.total_throughput_kwh,
          cost_savings: res.summary.cost_savings,
          cost_savings_pct: res.summary.cost_savings_pct,
          high_conf_pct: res.summary.high_conf_pct
        };
      }

      this.modeComparisonData = comparison;
      return comparison;
    },

    // ─── Full Recompute of All Layers ────────────────────────────────────────
    recomputeAll() {
      this.daysCache = {};
      this.fullDayResult = this.computeDay(this.currentDayOffset || 0);

      this.normalBaselineResult = this.simulator.simulateFullDay({
        dispatchMode: 'AUTO_AI',
        scenario: 'NORMAL',
        seed: this.seed,
        dayOffset: this.currentDayOffset || 0,
        startDate: this.startDate
      });

      this.forecastData = getForecastForDay(this.currentDayOffset || 0, this.simulator, this.activeScenario);
      this.optimizerResult = this.simulator.optimize24hLookahead(this.config.initial_soc);
      this.computeModeComparison();
    },

    // ─── CSV Export Functionality ─────────────────────────────────────────────
    exportSimulationCsv() {
      const steps = this.fullDayResult?.steps || [];
      if (!steps.length) return;

      const headers = [
        'Step',
        'Time_IST',
        'Hour',
        'Solar_kW',
        'Load_kW',
        'Battery_kW',
        'Grid_Import_kW',
        'Grid_Export_kW',
        'SoC_Pct',
        'Battery_Temp_C',
        'C_Rate',
        'Irradiance_W_m2',
        'Ambient_Temp_C',
        'Cell_Temp_C',
        'Tariff_Band',
        'Tariff_Rate_INR_kWh',
        'Step_Cost_INR',
        'Cumulative_Cost_INR',
        'Step_CO2_kg',
        'Cumulative_CO2_kg',
        'Self_Sufficiency_Pct',
        'PINN_Residual',
        'PINN_Confidence',
        'Guardrail_Intervened'
      ];

      const rows = steps.map(s => [
        s.step,
        s.time,
        s.hour,
        s.solar_kw,
        s.load_kw,
        s.battery_kw,
        s.grid_import_kw,
        s.grid_export_kw,
        s.soc,
        s.battery_temp,
        s.c_rate,
        s.irradiance,
        s.ambient_temp,
        s.cell_temp,
        s.tariff_band,
        s.tariff_rate,
        s.step_cost,
        s.cumulative_cost,
        s.step_co2,
        s.cumulative_co2,
        s.self_sufficiency_pct,
        s.pinn?.residual ?? 0,
        s.pinn?.confidence ?? 1,
        s.guardrail?.intervened ? 'YES' : 'NO'
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ecogrid_twin_simulation_seed${this.seed}_${this.activeScenario}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    // ─── 3D Scene Controls ────────────────────────────────────────────────────
    setSelectedRoom(roomId) {
      this.selectedRoomId = roomId;
    },

    toggleRoof() {
      this.roofOpen = !this.roofOpen;
    },

    setCameraPreset(preset) {
      this.cameraPreset = preset;
    }
  }
});
