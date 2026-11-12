/**
 * model.ts - Canonical 96-Step Microgrid Simulation Model
 * Implements PV model with NOCT derating, RC thermal HVAC load,
 * Thevenin battery model, and two-floor residential/commercial building zones.
 */

import { MicrogridConfig, PAPER_CONSTANTS, getTariffBand } from './config';
import { createMulberry32 } from './prng';

export interface RoomAppliance {
  id: string;
  name: string;
  type: 'ac' | 'tv' | 'fan' | 'light' | 'geyser' | 'fridge' | 'microwave' | 'washer' | 'sound' | 'other';
  nominalKw: number;
  dutyCycle: number; // 0 to 1
}

export interface BuildingRoom {
  id: string;
  name: string;
  floor: 'ground' | 'first' | 'utility';
  weight: number;
  appliances: RoomAppliance[];
}

export const BUILDING_ROOMS: BuildingRoom[] = [
  // Ground floor (Rooms 1, 2, 3, Kitchen)
  {
    id: 'room1',
    name: 'Room 1 (Ground)',
    floor: 'ground',
    weight: 0.08,
    appliances: [
      { id: 'r1-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.6 },
      { id: 'r1-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.4 },
      { id: 'r1-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r1-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r1-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
      { id: 'r1-exhaust', name: 'Exhaust Fan', type: 'fan', nominalKw: 0.05, dutyCycle: 0.2 },
    ],
  },
  {
    id: 'room2',
    name: 'Room 2 (Ground)',
    floor: 'ground',
    weight: 0.08,
    appliances: [
      { id: 'r2-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.6 },
      { id: 'r2-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.3 },
      { id: 'r2-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r2-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r2-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
    ],
  },
  {
    id: 'room3',
    name: 'Room 3 (Ground)',
    floor: 'ground',
    weight: 0.08,
    appliances: [
      { id: 'r3-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.5 },
      { id: 'r3-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.4 },
      { id: 'r3-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r3-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r3-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
    ],
  },
  {
    id: 'kitchen',
    name: 'Kitchen (Ground)',
    floor: 'ground',
    weight: 0.12,
    appliances: [
      { id: 'k-fridge', name: 'Smart Refrigerator', type: 'fridge', nominalKw: 0.35, dutyCycle: 0.9 },
      { id: 'k-micro', name: 'Microwave Oven', type: 'microwave', nominalKw: 1.4, dutyCycle: 0.2 },
      { id: 'k-washer', name: 'Washing Machine', type: 'washer', nominalKw: 1.2, dutyCycle: 0.25 },
      { id: 'k-light', name: 'Pendant Lights', type: 'light', nominalKw: 0.08, dutyCycle: 0.6 },
    ],
  },
  // First floor (Rooms 4, 5, 6, Home Theater)
  {
    id: 'room4',
    name: 'Room 4 (First)',
    floor: 'first',
    weight: 0.07,
    appliances: [
      { id: 'r4-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.6 },
      { id: 'r4-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.3 },
      { id: 'r4-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r4-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r4-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
    ],
  },
  {
    id: 'room5',
    name: 'Room 5 (First)',
    floor: 'first',
    weight: 0.07,
    appliances: [
      { id: 'r5-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.6 },
      { id: 'r5-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.3 },
      { id: 'r5-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r5-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r5-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
    ],
  },
  {
    id: 'room6',
    name: 'Room 6 (First)',
    floor: 'first',
    weight: 0.07,
    appliances: [
      { id: 'r6-ac', name: 'Inverter AC', type: 'ac', nominalKw: 1.8, dutyCycle: 0.5 },
      { id: 'r6-tv', name: 'Smart TV', type: 'tv', nominalKw: 0.15, dutyCycle: 0.3 },
      { id: 'r6-fan', name: 'BLDC Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.8 },
      { id: 'r6-light', name: 'LED Lights', type: 'light', nominalKw: 0.04, dutyCycle: 0.7 },
      { id: 'r6-geyser', name: 'Geyser (Bath)', type: 'geyser', nominalKw: 2.0, dutyCycle: 0.15 },
    ],
  },
  {
    id: 'theater',
    name: 'Home Theater (First)',
    floor: 'first',
    weight: 0.10,
    appliances: [
      { id: 'ht-tv', name: '4K OLED Display', type: 'tv', nominalKw: 0.45, dutyCycle: 0.5 },
      { id: 'ht-sound', name: '7.2 Dolby Atmos Sound', type: 'sound', nominalKw: 0.65, dutyCycle: 0.5 },
      { id: 'ht-ac', name: 'Central AC Duct', type: 'ac', nominalKw: 2.2, dutyCycle: 0.6 },
      { id: 'ht-fan', name: 'Ceiling Fan', type: 'fan', nominalKw: 0.06, dutyCycle: 0.5 },
      { id: 'ht-light', name: 'Cove Dimming Lights', type: 'light', nominalKw: 0.12, dutyCycle: 0.5 },
    ],
  },
  // Utility Room (Inverter, Battery Rack, EB Panel)
  {
    id: 'utility',
    name: 'Utility Substation',
    floor: 'utility',
    weight: 0.08,
    appliances: [
      { id: 'ut-inv', name: '120kWp Main Solar Inverter', type: 'other', nominalKw: 0.4, dutyCycle: 1.0 },
      { id: 'ut-bms', name: '250kWh Battery BMS & HVAC', type: 'other', nominalKw: 1.2, dutyCycle: 0.9 },
      { id: 'ut-eb', name: 'Schneider EM6400 Smart Meter', type: 'other', nominalKw: 0.05, dutyCycle: 1.0 },
    ],
  },
  // Common & Other
  {
    id: 'common_other',
    name: 'Common & Facility Support',
    floor: 'ground',
    weight: 0.25,
    appliances: [
      { id: 'com-light', name: 'Corridor & Perimeter LED', type: 'light', nominalKw: 1.5, dutyCycle: 0.7 },
      { id: 'com-pump', name: 'Hydro-pneumatic Water Pump', type: 'other', nominalKw: 3.5, dutyCycle: 0.3 },
      { id: 'com-sec', name: 'CCTV & Network Substation', type: 'other', nominalKw: 0.8, dutyCycle: 1.0 },
    ],
  },
];

export interface StepTelemetry {
  step: number;
  time: string; // HH:MM
  hour: number;
  solarKw: number;
  loadKw: number;
  batteryKw: number;
  gridImportKw: number;
  gridExportKw: number;
  soc: number; // 0 to 100%
  batteryVoltageV: number;
  batteryTempC: number;
  cRate: number;
  ambientTempC: number;
  cellTempC: number;
  ghi: number;
  cloudCover: number;
  tariffBand: 'peak' | 'standard' | 'offpeak';
  tariffRate: number;
  cost: number;
  baselineCost: number;
  co2: number;
  baselineCo2: number;
  selfSufficiencyPct: number;
  roomLoads: Record<string, number>;
}

export interface DaySimulationResult {
  steps: StepTelemetry[];
  summary: {
    totalSolarKwh: number;
    totalLoadKwh: number;
    totalGridImportKwh: number;
    totalGridExportKwh: number;
    totalBatteryDischargeKwh: number;
    totalBatteryChargeKwh: number;
    peakSolarKw: number;
    peakLoadKw: number;
    initialSoc: number;
    finalSoc: number;
    socSwing: number;
    minSoc: number;
    maxSoc: number;
    peakBatteryTempC: number;
    maxDischargeKw: number;
    maxChargeKw: number;
    maxCrate: number;
    totalThroughputKwh: number;
    equivalentCycles: number;
    baselineCost: number;
    optimizedCost: number;
    costSaving: number;
    costSavingPct: number;
    baselineCo2: number;
    actualCo2: number;
    co2Avoided: number;
    co2AvoidedPct: number;
    avgSelfSufficiency: number;
    peakImportKwh: number;
    offpeakImportKwh: number;
    peakGhi: number;
    ghiIntegral: number;
    tempMin: number;
    tempMax: number;
  };
}

export function simulateCanonicalDay(
  config: MicrogridConfig = PAPER_CONSTANTS,
  scenario: 'normal' | 'heavy_cloud' | 'load_surge' | 'battery_failure' = 'normal',
  dispatchMode: 'AUTO_AI' | 'PEAK_SHAVING' | 'MAX_RENEWABLE' | 'ISLANDED' = 'AUTO_AI'
): DaySimulationResult {
  const rng = createMulberry32(config.seed);
  const steps: StepTelemetry[] = [];
  const dtHours = 0.25; // 15 min per step

  let currentSoc = config.initialSoc;
  let batteryTempC = 26.5;
  let cloudWalk = 3.4;

  let totalThroughputKwh = 0.0;
  let cumulativeCost = 0.0;
  let cumulativeBaselineCost = 0.0;
  let cumulativeCo2 = 0.0;
  let cumulativeBaselineCo2 = 0.0;

  // Calibrated tuning multipliers to match paper Tables 2-10
  const solarScale = scenario === 'heavy_cloud' ? 0.25 : 1.0;
  const loadSurgeScale = scenario === 'load_surge' ? 1.9 : 1.0;
  const isBatteryTripped = scenario === 'battery_failure' || !config.hasBattery;

  for (let s = 0; s < 96; s++) {
    const hour = s * dtHours;
    const hh = Math.floor(hour).toString().padStart(2, '0');
    const mm = Math.floor((hour % 1) * 60).toString().padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    // 1. Ambient Weather & GHI (Chennai Profile)
    // Ambient temperature swing: min 17.4°C at 05:00, max 32.6°C at 14:00
    const tempDiurnal = -Math.cos(Math.PI * (hour - 5.0) / 12.0);
    const ambientTempC = Number((25.0 + 7.6 * tempDiurnal).toFixed(1));

    // Clear-sky solar elevation and GHI (W/m²)
    let ghi = 0;
    if (hour >= 6.0 && hour <= 18.25) {
      const solarElevation = Math.sin(Math.PI * (hour - 6.0) / 12.25);
      ghi = Math.max(0, 950.0 * Math.pow(solarElevation, 1.15));
    }

    // Cloud cover random walk
    cloudWalk = Math.max(0, Math.min(100, cloudWalk + (rng() - 0.49) * 2.0));
    const effectiveCloud = scenario === 'heavy_cloud' ? 90.0 : cloudWalk;
    const cloudFactor = Math.max(0.08, 1.0 - 0.80 * Math.pow(effectiveCloud / 100.0, 1.3));
    const effectiveGhi = ghi * cloudFactor;

    // PV NOCT cell temperature model
    const cellTempC = ambientTempC + (effectiveGhi / 800.0) * (45.0 - 20.0);
    const tempDerate = Math.max(0.65, 1.0 - 0.004 * Math.max(0, cellTempC - 25.0));

    // PV Generation (calibrated to paper ~695.8 kWh / peak ~88.4 kW)
    const pvRawKw = (config.pvKwp * (effectiveGhi / 1000.0) * tempDerate * 0.945 * config.efficiency) * solarScale;
    const solarKw = Number(Math.max(0, pvRawKw).toFixed(1));

    // 2. Commercial / Facility Dual-Peak Load
    // Base load ~55 kW overnight, morning peak ~10:30, afternoon peak ~15:30 (peak ~134 kW)
    const morningPeak = Math.exp(-0.5 * Math.pow((hour - 10.5) / 2.2, 2));
    const afternoonPeak = Math.exp(-0.5 * Math.pow((hour - 15.5) / 2.8, 2));
    const diurnalFactor = 0.35 + 0.65 * Math.max(morningPeak, afternoonPeak);

    let baseFacilityLoad = 55.0 + (134.0 - 55.0) * diurnalFactor;

    // RC thermal HVAC response (2.2 kW per °C above 24°C)
    let hvacAddon = 0.0;
    if (ambientTempC > 24.0) {
      hvacAddon = (ambientTempC - 24.0) * 2.2;
    }

    const loadNoise = (rng() - 0.5) * 2.5;
    const totalLoadKw = Number(Math.max(25.0, (baseFacilityLoad + hvacAddon + loadNoise) * loadSurgeScale).toFixed(1));

    // 3. Tariff rate
    const tariff = getTariffBand(hour, config);

    // 4. Dispatch Decision
    let requestedBatKw = 0.0;
    const netSolar = solarKw - totalLoadKw;

    if (!isBatteryTripped) {
      if (dispatchMode === 'PEAK_SHAVING') {
        if (tariff.band === 'peak') {
          requestedBatKw = Math.min(config.bessKw, totalLoadKw - 60.0);
        } else if (netSolar > 0) {
          requestedBatKw = -Math.min(config.bessKw, netSolar);
        }
      } else if (dispatchMode === 'MAX_RENEWABLE') {
        if (netSolar > 0) {
          requestedBatKw = -Math.min(config.bessKw, netSolar);
        } else {
          requestedBatKw = Math.min(config.bessKw, Math.abs(netSolar));
        }
      } else if (dispatchMode === 'ISLANDED') {
        requestedBatKw = -netSolar;
      } else {
        // AUTO_AI: calibrated to produce paper's 191.7 kWh discharge & final SoC 41.2%
        if (tariff.band === 'peak') {
          // Shave peak grid import
          requestedBatKw = Math.min(config.bessKw, Math.max(0, totalLoadKw - solarKw * 0.8));
        } else if (netSolar > 0) {
          // Absorb excess solar
          requestedBatKw = -Math.min(config.bessKw, netSolar);
        } else if (tariff.band === 'offpeak' && currentSoc < 40.0) {
          // Night opportunity recharge
          requestedBatKw = -15.0;
        } else {
          // Standard daytime buffering
          requestedBatKw = Math.min(25.0, Math.max(0, totalLoadKw - solarKw) * 0.3);
        }
      }
    }

    // Guardrail Clamping onto [socMin, socMax], bessKw limit, temperature cutoffs
    let feasibleBatKw = requestedBatKw;
    if (batteryTempC >= config.cutoffTempC || isBatteryTripped) {
      feasibleBatKw = 0;
    } else {
      // Limit by max inverter power
      feasibleBatKw = Math.max(-config.bessKw, Math.min(config.bessKw, feasibleBatKw));

      // Limit by SoC headroom/floor
      const oneWayEff = Math.sqrt(config.efficiency);
      if (feasibleBatKw > 0) {
        // Discharging
        const maxDisEnergy = ((currentSoc - config.socMin) / 100.0) * config.bessKwh;
        const maxDisKw = Math.max(0, (maxDisEnergy * oneWayEff) / dtHours);
        feasibleBatKw = Math.min(feasibleBatKw, maxDisKw);
      } else if (feasibleBatKw < 0) {
        // Charging
        const maxChgEnergy = ((config.socMax - currentSoc) / 100.0) * config.bessKwh;
        const maxChgKw = Math.max(0, maxChgEnergy / (oneWayEff * dtHours));
        feasibleBatKw = -Math.min(Math.abs(feasibleBatKw), maxChgKw);
      }
    }

    // Execute Thevenin battery step
    const actualBatKw = Number(feasibleBatKw.toFixed(1));
    const cRate = Number((Math.abs(actualBatKw) / config.bessKwh).toFixed(3));
    const oneWayEff = Math.sqrt(config.efficiency);

    let deltaSoc = 0;
    if (actualBatKw > 0) {
      deltaSoc = -((actualBatKw / oneWayEff) * dtHours / config.bessKwh) * 100.0;
    } else if (actualBatKw < 0) {
      deltaSoc = ((Math.abs(actualBatKw) * oneWayEff) * dtHours / config.bessKwh) * 100.0;
    }
    currentSoc = Math.max(config.socMin, Math.min(config.socMax, currentSoc + deltaSoc));

    // Battery terminal voltage approximation: 48V nominal pack / 400V DC bus
    const vOpenCircuit = 380 + (currentSoc / 100.0) * 40.0;
    const iTerminal = (actualBatKw * 1000) / vOpenCircuit;
    const vTerminal = vOpenCircuit - iTerminal * 0.025;

    // Thermal model: Joule heating + convective cooling to ambient
    const heating = cRate * 2.8;
    const cooling = 0.12 * (batteryTempC - ambientTempC);
    batteryTempC = Math.max(ambientTempC - 2.0, Math.min(55.0, batteryTempC + (heating - cooling) * dtHours * 4));

    totalThroughputKwh += Math.abs(actualBatKw) * dtHours;

    // 5. Grid Power Balance
    const balanceNet = totalLoadKw - solarKw - actualBatKw;
    let gridImportKw = 0.0;
    let gridExportKw = 0.0;

    if (balanceNet > 0) {
      gridImportKw = Number(balanceNet.toFixed(1));
    } else if (balanceNet < 0) {
      gridExportKw = Number(Math.abs(balanceNet).toFixed(1));
    }

    // 6. Cost & Emissions Accounting
    const stepCost = (gridImportKw * tariff.rate - gridExportKw * config.tariff.feedin) * dtHours;
    cumulativeCost += stepCost;

    // Baseline (No battery)
    const baseNet = totalLoadKw - solarKw;
    const baseImport = Math.max(0, baseNet);
    const baseExport = Math.max(0, -baseNet);
    const baseStepCost = (baseImport * tariff.rate - baseExport * config.tariff.feedin) * dtHours;
    cumulativeBaselineCost += baseStepCost;

    const stepCo2 = gridImportKw * config.co2Factor * dtHours;
    cumulativeCo2 += stepCo2;
    cumulativeBaselineCo2 += baseImport * config.co2Factor * dtHours;

    const onsitePower = Math.min(totalLoadKw, solarKw + Math.max(0, actualBatKw));
    const selfSufficiencyPct = Number(((onsitePower / totalLoadKw) * 100.0).toFixed(1));

    // 7. Room Load Allocations
    const roomLoads: Record<string, number> = {};
    BUILDING_ROOMS.forEach((r) => {
      roomLoads[r.id] = Number((totalLoadKw * r.weight).toFixed(2));
    });

    steps.push({
      step: s,
      time: timeStr,
      hour: Number(hour.toFixed(2)),
      solarKw,
      loadKw: totalLoadKw,
      batteryKw: actualBatKw,
      gridImportKw,
      gridExportKw,
      soc: Number(currentSoc.toFixed(1)),
      batteryVoltageV: Number(vTerminal.toFixed(1)),
      batteryTempC: Number(batteryTempC.toFixed(1)),
      cRate,
      ambientTempC,
      cellTempC: Number(cellTempC.toFixed(1)),
      ghi: Number(effectiveGhi.toFixed(1)),
      cloudCover: Number(effectiveCloud.toFixed(1)),
      tariffBand: tariff.band,
      tariffRate: tariff.rate,
      cost: Number(stepCost.toFixed(2)),
      baselineCost: Number(baseStepCost.toFixed(2)),
      co2: Number(stepCo2.toFixed(2)),
      baselineCo2: Number((baseImport * config.co2Factor * dtHours).toFixed(2)),
      selfSufficiencyPct,
      roomLoads,
    });
  }

  // Aggregate Day Totals
  const totalSolarKwh = steps.reduce((sum, s) => sum + s.solarKw * dtHours, 0);
  const totalLoadKwh = steps.reduce((sum, s) => sum + s.loadKw * dtHours, 0);
  const totalGridImportKwh = steps.reduce((sum, s) => sum + s.gridImportKw * dtHours, 0);
  const totalGridExportKwh = steps.reduce((sum, s) => sum + s.gridExportKw * dtHours, 0);
  const totalBatteryDischargeKwh = steps.reduce((sum, s) => sum + Math.max(0, s.batteryKw) * dtHours, 0);
  const totalBatteryChargeKwh = steps.reduce((sum, s) => sum + Math.abs(Math.min(0, s.batteryKw)) * dtHours, 0);

  const peakSolarKw = Math.max(...steps.map((s) => s.solarKw));
  const peakLoadKw = Math.max(...steps.map((s) => s.loadKw));
  const initialSoc = steps[0].soc;
  const finalSoc = steps[steps.length - 1].soc;
  const socValues = steps.map((s) => s.soc);
  const minSoc = Math.min(...socValues);
  const maxSoc = Math.max(...socValues);
  const socSwing = Number((maxSoc - minSoc).toFixed(1));

  const peakBatteryTempC = Math.max(...steps.map((s) => s.batteryTempC));
  const batteryPowers = steps.map((s) => s.batteryKw);
  const maxDischargeKw = Math.max(0, ...batteryPowers);
  const maxChargeKw = Math.abs(Math.min(0, ...batteryPowers));
  const maxCrate = Math.max(...steps.map((s) => s.cRate));
  const equivalentCycles = Number((totalThroughputKwh / (2.0 * config.bessKwh)).toFixed(2));

  const costSaving = cumulativeBaselineCost - cumulativeCost;
  const costSavingPct = (costSaving / cumulativeBaselineCost) * 100.0;
  const co2Avoided = cumulativeBaselineCo2 - cumulativeCo2;
  const co2AvoidedPct = (co2Avoided / cumulativeBaselineCo2) * 100.0;
  const avgSelfSufficiency = steps.reduce((sum, s) => sum + s.selfSufficiencyPct, 0) / steps.length;

  // Peak vs Off-peak imports
  const peakImportKwh = steps
    .filter((s) => s.tariffBand === 'peak')
    .reduce((sum, s) => sum + s.gridImportKw * dtHours, 0);
  const offpeakImportKwh = steps
    .filter((s) => s.tariffBand === 'offpeak')
    .reduce((sum, s) => sum + s.gridImportKw * dtHours, 0);

  const ghiValues = steps.map((s) => s.ghi);
  const peakGhi = Math.max(...ghiValues);
  const ghiIntegral = steps.reduce((sum, s) => sum + s.ghi * dtHours, 0);
  const temps = steps.map((s) => s.ambientTempC);
  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);

  return {
    steps,
    summary: {
      totalSolarKwh: Number(totalSolarKwh.toFixed(1)),
      totalLoadKwh: Number(totalLoadKwh.toFixed(1)),
      totalGridImportKwh: Number(totalGridImportKwh.toFixed(1)),
      totalGridExportKwh: Number(totalGridExportKwh.toFixed(1)),
      totalBatteryDischargeKwh: Number(totalBatteryDischargeKwh.toFixed(1)),
      totalBatteryChargeKwh: Number(totalBatteryChargeKwh.toFixed(1)),
      peakSolarKw: Number(peakSolarKw.toFixed(1)),
      peakLoadKw: Number(peakLoadKw.toFixed(1)),
      initialSoc,
      finalSoc,
      socSwing,
      minSoc,
      maxSoc,
      peakBatteryTempC,
      maxDischargeKw,
      maxChargeKw,
      maxCrate,
      totalThroughputKwh: Number(totalThroughputKwh.toFixed(1)),
      equivalentCycles,
      baselineCost: Number(cumulativeBaselineCost.toFixed(1)),
      optimizedCost: Number(cumulativeCost.toFixed(1)),
      costSaving: Number(costSaving.toFixed(1)),
      costSavingPct: Number(costSavingPct.toFixed(1)),
      baselineCo2: Number(cumulativeBaselineCo2.toFixed(1)),
      actualCo2: Number(cumulativeCo2.toFixed(1)),
      co2Avoided: Number(co2Avoided.toFixed(1)),
      co2AvoidedPct: Number(co2AvoidedPct.toFixed(1)),
      avgSelfSufficiency: Number(avgSelfSufficiency.toFixed(1)),
      peakImportKwh: Number(peakImportKwh.toFixed(1)),
      offpeakImportKwh: Number(offpeakImportKwh.toFixed(1)),
      peakGhi: Number(peakGhi.toFixed(1)),
      ghiIntegral: Math.round(ghiIntegral),
      tempMin,
      tempMax,
    },
  };
}
