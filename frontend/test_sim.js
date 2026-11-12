import { PAPER_PRESET } from './src/config/sharedConfig.js';
import { PhysicsSimulator } from './src/sim/physicsSimulator.js';

const sim = new PhysicsSimulator(PAPER_PRESET, 42);
const day = sim.simulateFullDay({ dispatchMode: 'AUTO_AI', scenario: 'NORMAL' });
console.log('Steps length:', day.steps.length);
console.log('Step 0:', day.steps[0]);
console.log('Summary:', day.summary);

const forecast = sim.generateForecast24h();
console.log('Forecast length:', forecast.forecasts.length);

const opt = sim.optimize24hLookahead(67.9);
console.log('Optimization schedule length:', opt.schedule.length);
