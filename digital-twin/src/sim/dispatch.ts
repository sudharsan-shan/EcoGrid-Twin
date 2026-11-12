/**
 * dispatch.ts - Energy Optimization & Dispatch Coordinator
 * Implements 4 dispatch strategies: AUTO_AI, PEAK_SHAVING, MAX_RENEWABLE, ISLANDED.
 * Coordinates Solar, Battery (BESS), and Grid to minimize ToU tariff cost and CO2 emissions.
 */

import { StepTelemetry } from './model';
import { MicrogridConfig, PAPER_CONSTANTS } from './config';
import { projectBatteryPower, GuardrailIntervention } from './guardrails';

export type DispatchMode = 'AUTO_AI' | 'PEAK_SHAVING' | 'MAX_RENEWABLE' | 'ISLANDED';

export interface LookaheadScheduleItem {
  step: number;
  time: string;
  tariffBand: 'peak' | 'standard' | 'offpeak';
  tariffRate: number;
  solarKw: number;
  loadKw: number;
  batteryKw: number;
  gridKw: number;
  soc: number;
  action: 'CHARGE' | 'DISCHARGE' | 'IDLE';
}

export interface DispatchPlan {
  mode: DispatchMode;
  schedule: LookaheadScheduleItem[];
  totalCost: number;
  totalImportKwh: number;
  totalExportKwh: number;
  co2Kg: number;
  selfSufficiencyPct: number;
}

export function computeLookaheadSchedule(
  steps: StepTelemetry[],
  mode: DispatchMode = 'AUTO_AI',
  config: MicrogridConfig = PAPER_CONSTANTS
): DispatchPlan {
  const schedule: LookaheadScheduleItem[] = [];
  let currentSoc = config.initialSoc;
  let currentTempC = 25.0;
  let totalCost = 0;
  let totalImportKwh = 0;
  let totalExportKwh = 0;
  const dtHours = 0.25;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const solar = s.solarKw;
    const load = s.loadKw;
    const netDemand = load - solar;

    let targetBatteryKw = 0;

    switch (mode) {
      case 'AUTO_AI': {
        // Optimal time-of-use arbitrage
        if (s.tariffBand === 'peak') {
          targetBatteryKw = Math.min(config.bessKw, Math.max(0, netDemand));
        } else if (netDemand < 0) {
          targetBatteryKw = -Math.min(config.bessKw, Math.abs(netDemand));
        } else if (s.tariffBand === 'offpeak' && currentSoc < 75) {
          targetBatteryKw = -30.0;
        } else {
          targetBatteryKw = 0;
        }
        break;
      }
      case 'PEAK_SHAVING': {
        const PEAK_THRESHOLD = 95.0;
        if (netDemand > PEAK_THRESHOLD) {
          targetBatteryKw = Math.min(config.bessKw, netDemand - PEAK_THRESHOLD);
        } else if (netDemand < 0) {
          targetBatteryKw = -Math.min(config.bessKw, Math.abs(netDemand));
        }
        break;
      }
      case 'MAX_RENEWABLE': {
        if (netDemand < 0) {
          targetBatteryKw = -Math.min(config.bessKw, Math.abs(netDemand));
        } else {
          targetBatteryKw = Math.min(config.bessKw, netDemand);
        }
        break;
      }
      case 'ISLANDED': {
        targetBatteryKw = netDemand;
        break;
      }
    }

    // Safety guardrail projection
    const { safeKw } = projectBatteryPower(
      targetBatteryKw,
      currentSoc,
      currentTempC,
      s.step,
      s.time,
      config
    );

    // Update battery SoC
    if (safeKw > 0) {
      currentSoc -= (safeKw * dtHours / config.efficiency / config.bessKwh) * 100;
    } else if (safeKw < 0) {
      currentSoc += (Math.abs(safeKw) * dtHours * config.efficiency / config.bessKwh) * 100;
    }
    currentSoc = Math.max(config.socMin, Math.min(config.socMax, currentSoc));

    const cRate = Math.abs(safeKw) / config.bessKwh;
    currentTempC += (cRate * 1.5 - (currentTempC - s.ambientTempC) * 0.1) * dtHours;

    let gridKw = mode === 'ISLANDED' ? 0 : netDemand - safeKw;
    let gridImportKw = Math.max(0, gridKw);
    let gridExportKw = Math.max(0, -gridKw);

    const stepCost = (gridImportKw * s.tariffRate - gridExportKw * config.tariff.feedin) * dtHours;
    totalCost += stepCost;
    totalImportKwh += gridImportKw * dtHours;
    totalExportKwh += gridExportKw * dtHours;

    let action: 'CHARGE' | 'DISCHARGE' | 'IDLE' = 'IDLE';
    if (safeKw > 0.5) action = 'DISCHARGE';
    else if (safeKw < -0.5) action = 'CHARGE';

    schedule.push({
      step: s.step,
      time: s.time,
      tariffBand: s.tariffBand,
      tariffRate: s.tariffRate,
      solarKw: solar,
      loadKw: load,
      batteryKw: safeKw,
      gridKw: gridKw,
      soc: Number(currentSoc.toFixed(1)),
      action,
    });
  }

  const totalLoadKwh = steps.reduce((sum, s) => sum + s.loadKw * dtHours, 0);
  const selfSufficiencyPct = Number((((totalLoadKwh - totalImportKwh) / totalLoadKwh) * 100).toFixed(1));
  const co2Kg = Number((totalImportKwh * config.co2Factor).toFixed(1));

  return {
    mode,
    schedule,
    totalCost: Number(totalCost.toFixed(1)),
    totalImportKwh: Number(totalImportKwh.toFixed(1)),
    totalExportKwh: Number(totalExportKwh.toFixed(1)),
    co2Kg,
    selfSufficiencyPct,
  };
}
