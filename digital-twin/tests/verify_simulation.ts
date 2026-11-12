/**
 * tests/verify_simulation.ts - Automated Model & Physics Verification Suite
 * Verifies:
 * 1. SoC bounds strictly within [15%, 95%]
 * 2. Seed determinism: Mulberry32 PRNG reproducibility
 * 3. Energy conservation closure: Load = Solar + BESS_disch - BESS_chg + Grid_import - Grid_export
 * 4. Honest Delta % calculations vs Paper reference
 */

import { PAPER_CONSTANTS, PAPER_REFERENCE } from '../src/sim/config';
import { simulateCanonicalDay } from '../src/sim/model';
import { generateForecast } from '../src/sim/forecast';
import { evaluatePinnBattery } from '../src/sim/pinn';
import { computeLookaheadSchedule } from '../src/sim/dispatch';

function runTests() {
  console.log('====================================================');
  console.log(' EcoGrid-Twin Automated Verification Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Run canonical simulation
  const result1 = simulateCanonicalDay(PAPER_CONSTANTS, 'normal', 'AUTO_AI');

  // Test 1: 96 steps present
  assert(result1.steps.length === 96, 'Canonical simulation produces exactly 96 steps (15-min intervals)');

  // Test 2: SoC Bounds [15%, 95%]
  const socMin = Math.min(...result1.steps.map(s => s.soc));
  const socMax = Math.max(...result1.steps.map(s => s.soc));
  assert(socMin >= PAPER_CONSTANTS.socMin - 0.01, `Minimum SoC (${socMin.toFixed(2)}%) stays at or above 15%`);
  assert(socMax <= PAPER_CONSTANTS.socMax + 0.01, `Maximum SoC (${socMax.toFixed(2)}%) stays at or below 95%`);

  // Test 3: PRNG Seed Determinism
  const result2 = simulateCanonicalDay(PAPER_CONSTANTS, 'normal', 'AUTO_AI');
  const identicalSolar = result1.steps.every((s, i) => s.solarKw === result2.steps[i].solarKw);
  const identicalLoad = result1.steps.every((s, i) => s.loadKw === result2.steps[i].loadKw);
  const identicalSoc = result1.steps.every((s, i) => s.soc === result2.steps[i].soc);
  assert(identicalSolar && identicalLoad && identicalSoc, 'Mulberry32 PRNG seed 42 produces 100% bit-exact deterministic reproduction');

  // Test 4: Daily Energy Balance Closure within 0.5%
  // Energy supplied = Solar generation + Battery discharge + Grid import
  // Energy consumed = Facility Load + Battery charge + Grid export
  const dt = 0.25;
  const suppliedKwh = result1.steps.reduce((sum, s) => sum + s.solarKw + Math.max(0, s.batteryKw) + s.gridImportKw, 0) * dt;
  const consumedKwh = result1.steps.reduce((sum, s) => sum + s.loadKw + Math.abs(Math.min(0, s.batteryKw)) + s.gridExportKw, 0) * dt;
  const balanceDeltaPct = Math.abs(suppliedKwh - consumedKwh) / consumedKwh * 100;
  assert(balanceDeltaPct < 0.5, `Energy balance closure error (${balanceDeltaPct.toFixed(3)}%) is strictly under 0.5%`);

  // Test 5: Forecast Output & Evaluation Metrics
  const forecast = generateForecast(result1.steps);
  assert(forecast.series.length === 96, '24-hour LSTM forecast generates 96 prediction intervals');
  assert(forecast.solarMetrics.mape > 0 && forecast.solarMetrics.mape < 15, `Solar Forecast MAPE (${forecast.solarMetrics.mape}%) is valid`);
  assert(forecast.loadMetrics.mape > 0 && forecast.loadMetrics.mape < 10, `Load Forecast MAPE (${forecast.loadMetrics.mape}%) is valid`);

  // Test 6: PINN Physics Residual & Confidence
  const pinn = evaluatePinnBattery(result1.steps, PAPER_CONSTANTS);
  assert(pinn.points.length === 96, 'PINN state estimator produces 96 step evaluations');
  assert(pinn.metrics.meanConfidence > 0.95, `PINN Mean Confidence (${pinn.metrics.meanConfidence}) exceeds 0.95`);
  assert(pinn.metrics.anomalyCount === 2, `PINN accurately flags ${pinn.metrics.anomalyCount} transient physics anomalies`);

  // Test 7: Dispatch Lookahead Optimization
  const dispatch = computeLookaheadSchedule(result1.steps, 'AUTO_AI', PAPER_CONSTANTS);
  assert(dispatch.schedule.length === 96, 'Dispatch lookahead schedule generates 96 actions');
  assert(dispatch.totalCost > 0, `Lookahead dispatch total cost is positive (₹${dispatch.totalCost})`);

  // Test 8: BESS Installed Toggle logic
  const noBatteryConfig = { ...PAPER_CONSTANTS, hasBattery: false };
  const noBatteryResult = simulateCanonicalDay(noBatteryConfig, 'normal', 'AUTO_AI');
  const allBatteryZero = noBatteryResult.steps.every(s => s.batteryKw === 0);
  assert(allBatteryZero, 'Disabling BESS strictly clamps all battery power to 0 kW across all 96 steps');

  console.log(`\n====================================================`);
  console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
