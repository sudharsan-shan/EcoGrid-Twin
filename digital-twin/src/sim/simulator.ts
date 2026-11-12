/**
 * simulator.ts  –  All simulation logic isolated here.
 * Replace this module with real MQTT / REST data without touching any UI code.
 *
 * Time model: 96 steps × 15 min = 1 simulated day (00:00 – 23:45)
 */

import type {
  SimState,
  SolarState,
  BatteryState,
  GridState,
  CarbonState,
  RoomLoad,
  ApplianceState,
  ApplianceType,
  HistoryPoint,
  Scenario,
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const STEPS_PER_DAY = 96;
const STEP_HOURS = 0.25; // 15 min

const BATTERY_CAPACITY_KWH = 250;
const BATTERY_MAX_KW = 60;
const BATTERY_EFF = 0.94; // round-trip (√0.94 per direction)
const BATTERY_MIN_SOC = 0.15;
const BATTERY_MAX_SOC = 0.95;
const PANEL_KWP = 120;
const GRID_EMISSION_FACTOR = 0.72; // kg CO₂ / kWh

// Tamil Nadu ToU tariff bands
const TARIFF = (hour: number) => {
  if ((hour >= 6 && hour < 9) || (hour >= 18 && hour < 21)) return { band: 'peak' as const, rate: 9.50 };
  if (hour >= 22 || hour < 6) return { band: 'offpeak' as const, rate: 5.80 };
  return { band: 'standard' as const, rate: 7.50 };
};

// ─── Room / appliance definitions ────────────────────────────────────────────
export interface RoomDef {
  id: string;
  label: string;
  basekW: number;
  appliances: { id: string; name: string; type: ApplianceType; nominalKw: number; schedule: [number, number][] }[];
}

export const ROOM_DEFS: RoomDef[] = [
  {
    id: 'utility',
    label: 'Utility Room',
    basekW: 2,
    appliances: [],
  },
  {
    id: 'room1',
    label: 'Room 1',
    basekW: 1.5,
    appliances: [
      { id: 'r1-ac', name: 'AC', type: 'ac', nominalKw: 2.0, schedule: [[8, 22]] },
      { id: 'r1-lights', name: 'Lights', type: 'lights', nominalKw: 0.3, schedule: [[7, 23]] },
    ],
  },
  {
    id: 'room2',
    label: 'Room 2',
    basekW: 1.5,
    appliances: [
      { id: 'r2-ac', name: 'AC', type: 'ac', nominalKw: 2.0, schedule: [[9, 21]] },
      { id: 'r2-lights', name: 'Lights', type: 'lights', nominalKw: 0.3, schedule: [[7, 23]] },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    basekW: 3,
    appliances: [
      { id: 'kt-fridge', name: 'Fridge', type: 'fridge', nominalKw: 0.25, schedule: [[0, 24]] },
      { id: 'kt-oven', name: 'Oven', type: 'oven', nominalKw: 4.5, schedule: [[7, 9], [12, 14], [18, 20]] },
    ],
  },
  {
    id: 'mainhall',
    label: 'Main Hall',
    basekW: 8,
    appliances: [
      { id: 'mh-hvac', name: 'HVAC', type: 'hvac', nominalKw: 15, schedule: [[8, 20]] },
      { id: 'mh-lights', name: 'Lighting', type: 'lights', nominalKw: 2.5, schedule: [[8, 22]] },
      { id: 'mh-ev', name: 'EV Charger', type: 'ev_charger', nominalKw: 22, schedule: [[10, 16]] },
    ],
  },
  {
    id: 'office',
    label: 'Office',
    basekW: 4,
    appliances: [
      { id: 'of-pc', name: 'PCs', type: 'pc', nominalKw: 3.5, schedule: [[9, 18]] },
      { id: 'of-printer', name: 'Printers', type: 'printer', nominalKw: 0.8, schedule: [[9, 18]] },
      { id: 'of-ac', name: 'AC', type: 'ac', nominalKw: 4.0, schedule: [[9, 19]] },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function solarBell(hour: number): number {
  // bell curve, zero outside 6-18, peak ~1.0 at noon
  if (hour < 6 || hour > 18) return 0;
  const t = (hour - 12) / 6; // -1 at 6:00, 0 at noon, 1 at 18:00
  return Math.exp(-4 * t * t);
}

function buildingLoadProfile(hour: number): number {
  // overnight base ~55 kW, business hours peak ~134 kW
  const night = 55;
  const day = 134;
  if (hour < 6) return night;
  if (hour < 9) return night + (day - night) * ((hour - 6) / 3);
  if (hour < 18) return day;
  if (hour < 22) return night + (day - night) * ((22 - hour) / 4);
  return night;
}

// ─── Cloud-cover random walk ──────────────────────────────────────────────────
let _cloud = 20; // persist across steps within a scenario session

function stepCloud(scenario: Scenario): number {
  if (scenario === 'heavy_cloud') {
    _cloud = Math.min(100, _cloud + (seededRandom(_cloud * 7.3) - 0.3) * 15);
    _cloud = Math.max(60, _cloud);
  } else {
    _cloud += (seededRandom(_cloud * 3.7) - 0.5) * 8;
    _cloud = Math.max(0, Math.min(40, _cloud));
  }
  return _cloud;
}

export function resetCloud(scenario: Scenario) {
  _cloud = scenario === 'heavy_cloud' ? 75 : 20;
}

// ─── Main step function ───────────────────────────────────────────────────────
export function computeStep(
  stepIndex: number,
  prevBatterySoc: number,
  prevHistory: HistoryPoint[],
  scenario: Scenario,
  dayNoise: number, // 0-1 seed per day
): SimState {
  const hour = (stepIndex * 15) / 60; // 0.0 - 23.75
  const timeMs = hour * 3600 * 1000;

  // ── Solar ────────────────────────────────────────────────────────────────
  const cloud = stepCloud(scenario);
  const cloudFactor = 1 - cloud / 100;
  const tempDerating = 1 - Math.max(0, (35 - 25)) * 0.004; // fixed 35°C panel temp
  const irradiance = solarBell(hour) * 1000 * cloudFactor;
  let solarKw = (irradiance / 1000) * PANEL_KWP * tempDerating * 0.88; // 88 % system eff
  if (scenario === 'heavy_cloud') solarKw *= 0.25;

  // ── Building load ────────────────────────────────────────────────────────
  const loadMultiplier = scenario === 'load_surge' ? 1.9 : 1.0;
  const baseLoad = buildingLoadProfile(hour) * loadMultiplier;
  const noise = (seededRandom(stepIndex * 17.3 + dayNoise * 100) - 0.5) * 4;
  const totalLoad = Math.max(20, baseLoad + noise);

  // ── Appliance states ──────────────────────────────────────────────────────
  const rooms: any[] = ROOM_DEFS.map(def => {
    const appliances: ApplianceState[] = def.appliances.map(app => {
      const on = app.schedule.some(([s, e]) => hour >= s && hour < e);
      const jitter = 1 + (seededRandom(stepIndex + app.id.charCodeAt(0)) - 0.5) * 0.1;
      const kw = on ? app.nominalKw * jitter * loadMultiplier : 0;
      const energyKwh = prevHistory
        .filter(h => h.stepIndex < stepIndex)
        .reduce((acc, _h) => acc + kw * STEP_HOURS, 0); // simplified
      return { id: app.id, roomId: def.id, name: app.name, type: app.type, kw, on, energyTodayKwh: energyKwh };
    });
    const roomKw = def.basekW * loadMultiplier + appliances.reduce((s, a) => s + a.kw, 0);
    return { roomId: def.id, kw: roomKw, appliances };
  });

  // ── Battery dispatch ──────────────────────────────────────────────────────
  const { band, rate } = TARIFF(hour);
  let batteryKw = 0;
  let newSoc = prevBatterySoc;

  if (scenario !== 'battery_failure') {
    const surplus = solarKw - totalLoad;
    const offpeak = band === 'offpeak';
    const peak = band === 'peak';

    if (surplus > 0 && newSoc < BATTERY_MAX_SOC) {
      // Charge from solar surplus
      const maxCharge = Math.min(BATTERY_MAX_KW, surplus);
      const socRoom = (BATTERY_MAX_SOC - newSoc) * BATTERY_CAPACITY_KWH;
      const chargeable = Math.min(maxCharge, socRoom / (STEP_HOURS * Math.sqrt(BATTERY_EFF)));
      batteryKw = chargeable;
      newSoc += (batteryKw * STEP_HOURS * Math.sqrt(BATTERY_EFF)) / BATTERY_CAPACITY_KWH;
    } else if (offpeak && newSoc < BATTERY_MAX_SOC) {
      // Charge from grid in off-peak
      const maxCharge = Math.min(BATTERY_MAX_KW, 30);
      const socRoom = (BATTERY_MAX_SOC - newSoc) * BATTERY_CAPACITY_KWH;
      batteryKw = Math.min(maxCharge, socRoom / (STEP_HOURS * Math.sqrt(BATTERY_EFF)));
      newSoc += (batteryKw * STEP_HOURS * Math.sqrt(BATTERY_EFF)) / BATTERY_CAPACITY_KWH;
    } else if (peak && newSoc > BATTERY_MIN_SOC) {
      // Discharge in peak
      const deficit = Math.max(0, totalLoad - solarKw);
      const maxDischarge = Math.min(BATTERY_MAX_KW, deficit);
      const socAvail = (newSoc - BATTERY_MIN_SOC) * BATTERY_CAPACITY_KWH;
      batteryKw = -Math.min(maxDischarge, socAvail / (STEP_HOURS / Math.sqrt(BATTERY_EFF)));
      newSoc += (batteryKw * STEP_HOURS / Math.sqrt(BATTERY_EFF)) / BATTERY_CAPACITY_KWH;
    }
    newSoc = Math.max(BATTERY_MIN_SOC, Math.min(BATTERY_MAX_SOC, newSoc));
  }

  // ── Grid ─────────────────────────────────────────────────────────────────
  const gridKw = totalLoad - solarKw - (-batteryKw); // positive = import
  const prevImport = prevHistory.reduce((s, h) => s + Math.max(0, h.grid) * STEP_HOURS, 0);
  const prevExport = prevHistory.reduce((s, h) => s + Math.max(0, -h.grid) * STEP_HOURS, 0);
  const importThisStep = Math.max(0, gridKw) * STEP_HOURS;
  const exportThisStep = Math.max(0, -gridKw) * STEP_HOURS;
  const cumulativeImport = prevImport + importThisStep;
  const cumulativeExport = prevExport + exportThisStep;

  // Cost (import only)
  const prevCost = prevHistory.reduce((s, h) => s + Math.max(0, h.grid) * STEP_HOURS * h.tariffRate, 0);
  const costToday = prevCost + importThisStep * rate;

  // ── Carbon ───────────────────────────────────────────────────────────────
  const co2Emitted = cumulativeImport * GRID_EMISSION_FACTOR;
  const baselineLoad = prevHistory.reduce((s, h) => s + h.load * STEP_HOURS, 0) + totalLoad * STEP_HOURS;
  const baselineCo2 = baselineLoad * GRID_EMISSION_FACTOR;
  const co2Avoided = baselineCo2 - co2Emitted;

  // ── Battery temperature ───────────────────────────────────────────────────
  const cRate = Math.abs(batteryKw) / BATTERY_CAPACITY_KWH;
  const ambientC = 30 + solarBell(hour) * 8;
  const battTempC = scenario === 'battery_failure' ? 52 : ambientC + cRate * 25 + Math.abs(batteryKw) * 0.05;

  // ── Build state ───────────────────────────────────────────────────────────
  const solar: any = {
    kw: solarKw,
    kwpCapacity: PANEL_KWP,
    cloudCover: cloud,
    tempDerating,
    irradiance,
  };

  const battery: any = {
    kw: batteryKw,
    soc: newSoc,
    capacityKwh: BATTERY_CAPACITY_KWH,
    tempC: battTempC,
    cRate,
    maxChargeKw: BATTERY_MAX_KW,
    maxDischargeKw: BATTERY_MAX_KW,
    healthy: scenario !== 'battery_failure',
  };

  const grid: any = {
    kw: gridKw,
    cumulativeImportKwh: cumulativeImport,
    cumulativeExportKwh: cumulativeExport,
    costToday,
    tariffBand: band,
    tariffRate: rate,
  };

  const carbon: any = {
    avoidedKg: co2Avoided,
    emittedKg: co2Emitted,
    baselineKg: baselineCo2,
  };

  const historyPoint: any = {
    stepIndex,
    hour,
    solar: solarKw,
    load: totalLoad,
    battery: batteryKw,
    batterySoc: newSoc,
    grid: gridKw,
    cost: costToday,
    baselineCost: costToday * 1.1,
    co2: co2Emitted,
    tariffRate: rate,
  };


  const history = [...prevHistory, historyPoint].slice(-STEPS_PER_DAY);

  return {
    stepIndex,
    timeMs,
    playing: false, // controlled by store
    speedMultiplier: 1,
    solar,
    battery,
    grid,
    carbon,
    rooms,
    scenario,
    history,
  };
}

/** Pre-compute an entire day for the scrubber / charts */
export function computeFullDay(scenario: Scenario, dayNoise: number): HistoryPoint[] {
  resetCloud(scenario);
  let soc = 0.55;
  const history: HistoryPoint[] = [];
  for (let i = 0; i < STEPS_PER_DAY; i++) {
    const state = computeStep(i, soc, history, scenario, dayNoise);
    soc = state.battery.soc;
    history.push(state.history[state.history.length - 1]);
  }
  return history;
}

export { STEPS_PER_DAY, STEP_HOURS, TARIFF };
