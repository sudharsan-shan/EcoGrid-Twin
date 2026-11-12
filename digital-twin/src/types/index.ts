// ─── Core Sensor Reading (Required shape: { id, room, type, value, unit, timestamp }) ───
export interface SensorReading {
  id: string;
  room: string;
  type: string;
  value: number;
  unit: string;
  timestamp: number; // epoch ms
}

// ─── Power & Equipment States ───────────────────────────────────────────────
export interface SolarState {
  sensor: SensorReading;
  kw: number;          // current output kW
  kwpCapacity: number; // 120 kWp
  cloudCover: number;  // 0-100 %
  tempDerating: number;// 0-1 factor
  irradiance: number;  // W/m²
  history: number[];   // last 24 steps kW
  baselineDelta: number; // delta vs baseline
}

export interface BatteryState {
  sensor: SensorReading;
  kw: number;          // +charge / -discharge kW
  soc: number;         // 0.15 - 0.95 (0 - 1 scale)
  capacityKwh: number; // 250 kWh
  tempC: number;       // internal battery temperature
  cRate: number;       // C-rate |kW| / 250
  maxChargeKw: number; // 60 kW
  maxDischargeKw: number;
  healthy: boolean;
  history: number[];   // last 24 steps SoC
  baselineDelta: number;
}

export interface GridState {
  sensor: SensorReading;
  kw: number;          // + import / - export kW
  mode: 'importing' | 'exporting' | 'idle';
  cumulativeImportKwh: number;
  cumulativeExportKwh: number;
  costToday: number;   // Rs
  tariffBand: 'peak' | 'standard' | 'offpeak';
  tariffRate: number;  // Rs/kWh
  history: number[];   // last 24 steps kW
  baselineDelta: number;
}

export interface TotalLoadState {
  sensor: SensorReading;
  kw: number;
  history: number[];
  baselineDelta: number;
  isHigh: boolean;
}

export interface TariffState {
  band: 'peak' | 'standard' | 'offpeak';
  rate: number;         // Rs/kWh
  label: string;
}

export interface CarbonState {
  avoidedKg: number;   // kg avoided vs baseline
  emittedKg: number;   // kg from grid import
  baselineKg: number;  // baseline kg
  history: number[];
  baselineDelta: number;
}

export interface RoomLoad {
  id: string;
  room: string;
  kw: number;
  energyTodayKwh: number;
  appliances: ApplianceState[];
  isHigh: boolean;
}

export interface ApplianceState {
  id: string;
  roomId: string;
  name: string;
  type: ApplianceType;
  kw: number;
  on: boolean;
  energyTodayKwh: number;
}

export type ApplianceType = 'ac' | 'lights' | 'fridge' | 'oven' | 'hvac' | 'ev_charger' | 'pc' | 'printer';

export type Scenario = 'normal' | 'heavy_cloud' | 'load_surge' | 'battery_failure';

export interface HistoryPoint {
  stepIndex: number;
  hour: number;
  solar: number;
  load: number;
  battery: number;
  batterySoc: number;
  grid: number;
  cost: number;
  baselineCost: number;
  co2: number;
  tariffRate: number;
}

export interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'critical';
  timestamp: string;
  targetId?: string; // e.g. 'battery', 'utility', 'solar'
  active: boolean;
}

export interface ClockState {
  date: string;
  time: string;
  stepIndex: number;
  totalSteps: number;
  playing: boolean;
  speedMultiplier: 1 | 10 | 60;
}

export interface TwinData {
  clock: ClockState;
  solar: SolarState;
  load: TotalLoadState;
  battery: BatteryState;
  grid: GridState;
  tariff: TariffState;
  carbon: CarbonState;
  rooms: RoomLoad[];
  alerts: AlertItem[];
  scenario: Scenario;
}

export interface SimState {
  stepIndex: number;
  timeMs: number;
  playing: boolean;
  speedMultiplier: 1 | 10 | 60;
  solar: any;
  battery: any;
  grid: any;
  carbon: any;
  rooms: any[];
  scenario: any;
  history: any[];
}

