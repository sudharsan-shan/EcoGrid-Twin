/**
 * Unit Tests for EcoGrid-Twin Frontend Physics Simulation Core
 * Verifies mathematical compliance with IEEE/Elsevier paper formulas.
 */

import assert from 'node:assert';
import { PhysicsSimulator } from '../src/sim/physicsSimulator.js';
import { PAPER_PRESET, getTariffForHour } from '../src/config/sharedConfig.js';

console.log('─── Running Physics Simulator Unit Tests ───');

const sim = new PhysicsSimulator(PAPER_PRESET, 42);

// Test 1: Deterministic Seed PRNG
const sim1 = new PhysicsSimulator(PAPER_PRESET, 42);
const res1 = sim1.simulateFullDay({ scenario: 'NORMAL' });
const sim2 = new PhysicsSimulator(PAPER_PRESET, 42);
const res2 = sim2.simulateFullDay({ scenario: 'NORMAL' });
assert.strictEqual(res1.summary.total_solar_kwh, res2.summary.total_solar_kwh, 'Seeded runs must be identical');
assert.strictEqual(res1.summary.daily_cost, res2.summary.daily_cost, 'Seeded daily cost must be identical');
console.log('✓ Test 1: Deterministic seed repeatability passed.');

// Test 2: Solar PV Generation & NOCT Derating
const noonSolar = sim.calculateSolar(12.0, 10, 34.0);
assert.ok(noonSolar.solar_kw > 60.0 && noonSolar.solar_kw <= 120.0, 'Noon solar must be positive within capacity');
assert.ok(noonSolar.irradiance > 700.0, 'Clear sky noon GHI should exceed 700 W/m²');

// Night check
const nightSolar = sim.calculateSolar(23.0, 10, 28.0);
assert.strictEqual(nightSolar.solar_kw, 0, 'Night solar must be zero');
console.log('✓ Test 2: Solar PV model & diurnal derating passed.');

// Test 3: Cloud 90% Attenuation Scenario
const normalSolar = sim.calculateSolar(12.0, 10, 32.0);
const cloudySolar = sim.calculateSolar(12.0, 90, 32.0);
const expectedCloudFactor = 1.0 - 0.80 * Math.pow(90 / 100.0, 1.3);
assert.ok(cloudySolar.solar_kw < normalSolar.solar_kw * 0.45, 'Cloud 90% must attenuate PV output significantly');
console.log(`✓ Test 3: Cloud 90% non-linear attenuation passed (factor: ${expectedCloudFactor.toFixed(3)}).`);

// Test 4: Dual-Peak Commercial Load with RC Thermal HVAC Response
const loadAt25C = sim.calculateLoad(10.5, 25.0, 1.0);
const loadAt35C = sim.calculateLoad(10.5, 35.0, 1.0);
assert.ok(loadAt35C > loadAt25C, 'HVAC cooling addon must increase load above 24°C');
const surgeLoad = sim.calculateLoad(10.5, 35.0, 1.9);
assert.ok(surgeLoad > loadAt35C * 1.8, 'Surge multiplier 1.9x must scale total demand');
console.log('✓ Test 4: Commercial dual-peak & RC thermal HVAC load passed.');

// Test 5: Thevenin Battery Dynamics & SoC Clamping [15%, 95%]
const batStep = sim.stepBattery(60.0, 15.5, 30.0, 30.0, false, 0.25);
assert.ok(batStep.nextSoc >= 15.0, 'SoC must never discharge below 15%');
const batChargeStep = sim.stepBattery(-60.0, 94.5, 30.0, 30.0, false, 0.25);
assert.ok(batChargeStep.nextSoc <= 95.0, 'SoC must never charge above 95%');
console.log('✓ Test 5: Thevenin battery SoC bounds [15%, 95%] passed.');

// Test 6: Guardrail Engine Interventions
const guardMinSoc = sim.applyGuardrails(60.0, 15.0, 32.0, 0, 0.25);
assert.strictEqual(guardMinSoc.feasibleKw, 0, 'Discharge at 15% SoC must be clamped to 0 by guardrail');
assert.ok(guardMinSoc.intervened, 'Guardrail must report intervention');

const guardOverTemp = sim.applyGuardrails(50.0, 60.0, 56.0, 0, 0.25);
assert.strictEqual(guardOverTemp.feasibleKw, 0, 'Over-temperature >= 55°C must trigger emergency cut-off');
console.log('✓ Test 6: Safety guardrail projection & intervention logging passed.');

// Test 7: PINN Consistency Metric
const batTest = sim.stepBattery(30.0, 60.0, 30.0, 30.0, false, 0.25);
const pinnNominal = sim.verifyPinn(60.0, batTest.nextSoc, 30.0, 0.25);
assert.ok(pinnNominal.confidence > 0.95, `Nominal battery step must have confidence > 0.95 (got ${pinnNominal.confidence})`);
assert.strictEqual(pinnNominal.isAnomaly, false, 'Nominal step must not be an anomaly');

const pinnUnphysical = sim.verifyPinn(60.0, 80.0, 30.0, 0.25); // Discharging power but SoC jumped up!
assert.ok(pinnUnphysical.residual > 0.5, 'Unphysical step must exceed anomaly threshold 0.5');
assert.strictEqual(pinnUnphysical.isAnomaly, true, 'Unphysical step must be flagged as anomaly');
console.log('✓ Test 7: PINN physical residual & anomaly detection passed.');

// Test 8: TNPDCL Tariff Schedule Accuracy
const peakTariff = getTariffForHour(7.0);
assert.strictEqual(peakTariff.band, 'PEAK', '07:00 IST must be PEAK');
assert.strictEqual(peakTariff.rate, 9.50, 'Peak tariff must be ₹9.50/kWh');

const offpeakTariff = getTariffForHour(23.0);
assert.strictEqual(offpeakTariff.band, 'OFFPEAK', '23:00 IST must be OFFPEAK');
assert.strictEqual(offpeakTariff.rate, 5.80, 'Off-peak tariff must be ₹5.80/kWh');

const stdTariff = getTariffForHour(13.0);
assert.strictEqual(stdTariff.band, 'STANDARD', '13:00 IST must be STANDARD');
assert.strictEqual(stdTariff.rate, 7.50, 'Standard tariff must be ₹7.50/kWh');
console.log('✓ Test 8: TNPDCL ToU tariff schedule lookup passed.');

console.log('\n======================================================');
console.log('  ALL 8 FRONTEND PHYSICS SIMULATOR TESTS PASSED (OK)   ');
console.log('======================================================');
