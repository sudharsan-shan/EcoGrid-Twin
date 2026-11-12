/**
 * config.ts - Paper Constants and Microgrid Configuration
 */

export interface MicrogridConfig {
  site: string;
  latitude: number;
  longitude: number;
  pvKwp: number;
  hasBattery: boolean;
  bessKwh: number;
  bessKw: number;
  socMin: number;
  socMax: number;
  initialSoc: number;
  efficiency: number;
  cautionTempC: number;
  cutoffTempC: number;
  co2Factor: number; // kg CO2 / kWh
  seed: number;
  tariff: {
    peak: number;
    standard: number;
    offpeak: number;
    feedin: number;
    category: string;
    peakHours: [number, number][]; // e.g. [[6, 9], [18, 21]]
    offpeakHours: [number, number][]; // e.g. [[22, 24], [0, 5]]
  };
}

export const PAPER_CONSTANTS: MicrogridConfig = {
  site: 'Chennai 13.08N 80.27E',
  latitude: 13.0827,
  longitude: 80.2707,
  pvKwp: 120.0,
  hasBattery: true,
  bessKwh: 250.0,
  bessKw: 60.0,
  socMin: 15.0,
  socMax: 95.0,
  initialSoc: 67.9,
  efficiency: 0.94,
  cautionTempC: 45.0,
  cutoffTempC: 55.0,
  co2Factor: 0.72,
  seed: 42,
  tariff: {
    peak: 9.50,
    standard: 7.50,
    offpeak: 5.80,
    feedin: 3.50,
    category: 'LT-III-B Commercial',
    peakHours: [[6, 9], [18, 21]],
    offpeakHours: [[22, 24], [0, 5]],
  },
};

export const PAPER_REFERENCE = {
  site: "Chennai 13.08N 80.27E",
  pvKwp: 120,
  bessKwh: 250,
  bessKw: 60,
  soc: [15, 95],
  eff: 0.94,
  cautionC: 45,
  co2: 0.72,
  tariff: {
    peak: 9.5,
    standard: 7.5,
    offpeak: 5.8,
    feedin: 3.5,
    peakHours: "06-09,18-21",
    standardHours: "05-06,09-18,21-22",
    offpeakHours: "22-05",
  },
  table2: {
    solar: 695.8,
    load: 2127.1,
    peakSolar: 88.4,
    peakLoad: 134.0,
    gridImport: 1382.1,
    batteryDischarge: 191.7,
  },
  table3: {
    initialSoc: 67.9,
    finalSoc: 41.2,
    swing: 55.8,
    peakTemp: 32.0,
    maxDischarge: 60.0,
    maxCharge: 30.0,
    maxCrate: 0.240,
    throughput: 334.2,
    cycles: 0.67,
  },
  table4: {
    baseline: 10902.5,
    optimized: 10215.0,
    saving: 687.4,
    savingPct: 6.3,
    peakImport: 337.6,
    offpeakImport: 486.0,
  },
  table5: {
    solar: { mape: 6.78, rmse: 6.69, r2: 0.9544, coverage: 100.0 },
    load: { mape: 3.71, rmse: 3.99, r2: 0.9557, coverage: 95.8 },
  },
  table6: {
    meanResidual: 0.0622,
    maxResidual: 4.0847,
    meanConfidence: 0.9969,
    minConfidence: 0.796,
    above95: 97.9,
    meanSocErr: 1.337,
    anomalies: 2,
  },
  table7: {
    baseline: 9090.67,
    optimized: 8296.19,
    saving: 794.48,
    savingPct: 8.7,
    co2Avoided: 44.72,
  },
  table8: {
    AUTO_AI: { import: 1382.1, export: 0.0, selfSuff: 37.6, cost: 10215.0, co2: 995.1 },
    PEAK_SHAVING: { import: 1419.2, export: 12.1, selfSuff: 33.4, cost: 10282.6, co2: 1021.9 },
    MAX_RENEWABLE: { import: 1310.1, export: 0.0, selfSuff: 34.4, cost: 10199.5, co2: 943.3 },
  },
  table9: {
    peakGhi: 950.0,
    ghiIntegral: 7232,
    tempMin: 17.4,
    tempMax: 32.6,
    cloudMean: 3.4,
    pvEff: 82.1,
    slope: 0.0911,
  },
  table10: {
    baselineCo2: 1531.5,
    actualCo2: 995.1,
    avoided: 536.4,
    avoidedPct: 35.0,
    selfSuffAvg: 37.6,
  },
};

export function getTariffBand(hour: number, cfg: MicrogridConfig = PAPER_CONSTANTS): { band: 'peak' | 'standard' | 'offpeak'; rate: number } {
  const h = hour % 24;
  for (const [start, end] of cfg.tariff.peakHours) {
    if (h >= start && h < end) return { band: 'peak', rate: cfg.tariff.peak };
  }
  for (const [start, end] of cfg.tariff.offpeakHours) {
    if (h >= start && h < end) return { band: 'offpeak', rate: cfg.tariff.offpeak };
  }
  return { band: 'standard', rate: cfg.tariff.standard };
}
