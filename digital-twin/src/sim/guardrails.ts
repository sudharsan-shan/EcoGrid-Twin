/**
 * guardrails.ts - Physical Safety & Setpoint Projector
 * Enforces SoC bounds [15%, 95%], power bounds [-60kW, +60kW],
 * and thermal cutoffs (caution 45°C, cutoff 55°C).
 * Records an immutable log of all safety interventions.
 */

import { MicrogridConfig, PAPER_CONSTANTS } from './config';

export interface GuardrailIntervention {
  id: string;
  step: number;
  timeStr: string;
  requestedKw: number;
  appliedKw: number;
  reason: 'SOC_MIN' | 'SOC_MAX' | 'POWER_LIMIT' | 'THERMAL_CAUTION' | 'THERMAL_CUTOFF' | 'BESS_DISABLED';
  details: string;
}

export interface GuardrailCheckResult {
  safeKw: number;
  intervention: GuardrailIntervention | null;
}

export function projectBatteryPower(
  requestedKw: number,
  currentSoc: number,
  currentTempC: number,
  step: number,
  timeStr: string,
  config: MicrogridConfig = PAPER_CONSTANTS
): GuardrailCheckResult {
  // If battery is disabled in config
  if (!config.hasBattery) {
    if (Math.abs(requestedKw) > 0.01) {
      return {
        safeKw: 0,
        intervention: {
          id: `int-${step}-${Date.now()}`,
          step,
          timeStr,
          requestedKw,
          appliedKw: 0,
          reason: 'BESS_DISABLED',
          details: 'BESS is disabled in configuration',
        },
      };
    }
    return { safeKw: 0, intervention: null };
  }

  // Thermal Cutoff: >= 55°C -> shutdown battery
  if (currentTempC >= config.cutoffTempC) {
    if (Math.abs(requestedKw) > 0.01) {
      return {
        safeKw: 0,
        intervention: {
          id: `int-${step}-${Date.now()}`,
          step,
          timeStr,
          requestedKw,
          appliedKw: 0,
          reason: 'THERMAL_CUTOFF',
          details: `Battery temperature ${currentTempC.toFixed(1)}°C exceeded cutoff ${config.cutoffTempC}°C`,
        },
      };
    }
    return { safeKw: 0, intervention: null };
  }

  let safeKw = requestedKw;

  // Thermal Caution: >= 45°C -> throttle to 50%
  if (currentTempC >= config.cautionTempC) {
    const throttledKw = Math.sign(requestedKw) * Math.min(Math.abs(requestedKw), config.bessKw * 0.5);
    if (Math.abs(throttledKw - requestedKw) > 0.1) {
      safeKw = throttledKw;
      return {
        safeKw,
        intervention: {
          id: `int-${step}-${Date.now()}`,
          step,
          timeStr,
          requestedKw,
          appliedKw: safeKw,
          reason: 'THERMAL_CAUTION',
          details: `Temperature ${currentTempC.toFixed(1)}°C triggered 50% thermal derating`,
        },
      };
    }
  }

  // Max Inverter Power: [-bessKw, +bessKw]
  if (safeKw > config.bessKw) {
    const applied = config.bessKw;
    return {
      safeKw: applied,
      intervention: {
        id: `int-${step}-${Date.now()}`,
        step,
        timeStr,
        requestedKw,
        appliedKw: applied,
        reason: 'POWER_LIMIT',
        details: `Discharge requested ${requestedKw.toFixed(1)} kW clamped to inverter limit ${config.bessKw} kW`,
      },
    };
  } else if (safeKw < -config.bessKw) {
    const applied = -config.bessKw;
    return {
      safeKw: applied,
      intervention: {
        id: `int-${step}-${Date.now()}`,
        step,
        timeStr,
        requestedKw,
        appliedKw: applied,
        reason: 'POWER_LIMIT',
        details: `Charge requested ${Math.abs(requestedKw).toFixed(1)} kW clamped to inverter limit ${config.bessKw} kW`,
      },
    };
  }

  // SoC bounds projection
  // dt = 15 min = 0.25h
  const dtHours = 0.25;
  // If discharging (kw > 0), deltaSoc = -(kw * dt / eff) / capacity * 100
  if (safeKw > 0) {
    const nextSoc = currentSoc - (safeKw * dtHours / config.efficiency / config.bessKwh) * 100;
    if (nextSoc < config.socMin) {
      const allowedDischarge = Math.max(0, ((currentSoc - config.socMin) / 100) * config.bessKwh * config.efficiency / dtHours);
      return {
        safeKw: Number(allowedDischarge.toFixed(2)),
        intervention: {
          id: `int-${step}-${Date.now()}`,
          step,
          timeStr,
          requestedKw,
          appliedKw: Number(allowedDischarge.toFixed(2)),
          reason: 'SOC_MIN',
          details: `Discharge would violate minimum SoC limit (${config.socMin}%). Clamped.`,
        },
      };
    }
  } else if (safeKw < 0) {
    // If charging (kw < 0)
    const chargeKw = Math.abs(safeKw);
    const nextSoc = currentSoc + (chargeKw * dtHours * config.efficiency / config.bessKwh) * 100;
    if (nextSoc > config.socMax) {
      const allowedCharge = Math.max(0, ((config.socMax - currentSoc) / 100) * config.bessKwh / (config.efficiency * dtHours));
      return {
        safeKw: Number((-allowedCharge).toFixed(2)),
        intervention: {
          id: `int-${step}-${Date.now()}`,
          step,
          timeStr,
          requestedKw,
          appliedKw: Number((-allowedCharge).toFixed(2)),
          reason: 'SOC_MAX',
          details: `Charge would violate maximum SoC limit (${config.socMax}%). Clamped.`,
        },
      };
    }
  }

  return { safeKw, intervention: null };
}
