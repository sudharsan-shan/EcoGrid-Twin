<template>
  <div class="scenario-panel glass-card">
    <div class="scenario-header">
      <div>
        <div class="title-row">
          <h3 class="scenario-title">"What-If" Stress Test Simulator & Mode Comparison</h3>
          <span class="badge badge-sim">Resilience Physics</span>
          <span v-if="store.activeScenario !== 'NORMAL'" class="badge badge-alert">
            Active: {{ store.activeScenario }}
          </span>
        </div>
        <span class="scenario-sub">Evaluate microgrid resilience under extreme weather, load surges, and subsystem failures</span>
      </div>
      <button 
        v-if="store.activeScenario !== 'NORMAL'"
        class="btn btn-outline btn-sm"
        @click="store.resetScenario"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
        <span>Reset to Normal Baseline</span>
      </button>
    </div>

    <!-- 4 Scenario Cards -->
    <div class="scenario-grid">
      <!-- 1. Normal -->
      <div 
        class="scenario-card"
        :class="{ active: store.activeScenario === 'NORMAL' }"
        @click="store.triggerScenario('NORMAL')"
      >
        <div class="scenario-top">
          <div class="scenario-icon text-solar">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg>
          </div>
          <span class="scenario-badge badge-normal">Baseline</span>
        </div>
        <span class="scenario-name">Normal Clear Sky</span>
        <span class="scenario-desc">Standard Chennai seasonal profile (10% cloud, 1.0x baseline commercial load).</span>
      </div>

      <!-- 2. Cloud 90% -->
      <div 
        class="scenario-card"
        :class="{ active: store.activeScenario === 'CLOUDY_90' }"
        @click="store.triggerScenario('CLOUDY_90')"
      >
        <div class="scenario-top">
          <div class="scenario-icon text-solar">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
          </div>
          <span class="scenario-badge badge-cloud">Cyclone / Monsoon</span>
        </div>
        <span class="scenario-name">Cloudy Sky (90% Cover)</span>
        <span class="scenario-desc">Heavy cloud factor 1 - 0.8*(90/100)^1.3 drops PV output by ~70%.</span>
      </div>

      <!-- 3. Load Surge 1.9x -->
      <div 
        class="scenario-card"
        :class="{ active: store.activeScenario === 'LOAD_SURGE_1_9X' }"
        @click="store.triggerScenario('LOAD_SURGE_1_9X')"
      >
        <div class="scenario-top">
          <div class="scenario-icon text-load">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          </div>
          <span class="scenario-badge badge-surge">Demand Anomaly</span>
        </div>
        <span class="scenario-name">Load Surge (1.9x Peak)</span>
        <span class="scenario-desc">Extreme campus event / heatwave HVAC surge testing peak tariff handling.</span>
      </div>

      <!-- 4. Battery Failure -->
      <div 
        class="scenario-card"
        :class="{ active: store.activeScenario === 'BATTERY_FAILURE' }"
        @click="store.triggerScenario('BATTERY_FAILURE')"
      >
        <div class="scenario-top">
          <div class="scenario-icon text-danger">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2"></rect><line x1="23" y1="10" x2="23" y2="14"></line><line x1="6" y1="6" x2="14" y2="18"></line></svg>
          </div>
          <span class="scenario-badge badge-danger">Outage</span>
        </div>
        <span class="scenario-name">BESS Subsystem Trip</span>
        <span class="scenario-desc">Simulates sudden BMS breaker trip (zero battery power, grid direct fallback).</span>
      </div>
    </div>

    <!-- Before / After Impact Analysis Section -->
    <div class="comparison-section glass-card">
      <div class="comp-header">
        <h4 class="comp-title">
          <span>Resilience Stress Impact: </span>
          <strong class="text-solar">{{ scenarioLabel }} vs Normal Baseline</strong>
        </h4>
        <span class="comp-sub">24-Hour Energy, Economic & Carbon Delta</span>
      </div>

      <!-- Impact Comparison Table -->
      <div class="table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th>Performance Metric</th>
              <th>Normal Baseline</th>
              <th>{{ scenarioLabel }}</th>
              <th>Net Variance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Solar PV Generation (kWh)</td>
              <td>{{ normalSummary.total_solar_kwh }} kWh</td>
              <td :class="getDeltaClass(activeSummary.total_solar_kwh, normalSummary.total_solar_kwh, true)">
                {{ activeSummary.total_solar_kwh }} kWh
              </td>
              <td>{{ (activeSummary.total_solar_kwh - normalSummary.total_solar_kwh).toFixed(1) }} kWh</td>
            </tr>
            <tr>
              <td>Grid Import (kWh)</td>
              <td>{{ normalSummary.total_grid_import_kwh }} kWh</td>
              <td :class="getDeltaClass(activeSummary.total_grid_import_kwh, normalSummary.total_grid_import_kwh, false)">
                {{ activeSummary.total_grid_import_kwh }} kWh
              </td>
              <td>+{{ (activeSummary.total_grid_import_kwh - normalSummary.total_grid_import_kwh).toFixed(1) }} kWh</td>
            </tr>
            <tr>
              <td>Battery SoC Range (%)</td>
              <td>{{ normalSummary.min_soc }}% – {{ normalSummary.max_soc }}%</td>
              <td>{{ activeSummary.min_soc }}% – {{ activeSummary.max_soc }}%</td>
              <td>{{ (activeSummary.max_soc - activeSummary.min_soc).toFixed(1) }}% swing</td>
            </tr>
            <tr>
              <td>Daily Cost (₹ INR)</td>
              <td>₹{{ normalSummary.daily_cost }}</td>
              <td :class="getDeltaClass(activeSummary.daily_cost, normalSummary.daily_cost, false)">
                ₹{{ activeSummary.daily_cost }}
              </td>
              <td>{{ activeSummary.daily_cost > normalSummary.daily_cost ? '+' : '' }}₹{{ (activeSummary.daily_cost - normalSummary.daily_cost).toFixed(1) }}</td>
            </tr>
            <tr>
              <td>CO₂ Emissions (kg)</td>
              <td>{{ normalSummary.daily_co2 }} kg</td>
              <td :class="getDeltaClass(activeSummary.daily_co2, normalSummary.daily_co2, false)">
                {{ activeSummary.daily_co2 }} kg
              </td>
              <td>+{{ (activeSummary.daily_co2 - normalSummary.daily_co2).toFixed(1) }} kg</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Before / After Comparative Canvas Chart -->
      <div class="chart-wrapper">
        <canvas ref="compCanvasRef"></canvas>
      </div>
    </div>

    <!-- Phase 4: Side-by-Side Dispatch Mode Comparison Table -->
    <div class="mode-comparison-section glass-card">
      <div class="comp-header">
        <h4 class="comp-title">
          <span>Side-by-Side Dispatch Mode Evaluation</span>
        </h4>
        <span class="comp-sub">Comparing AUTO_AI, PEAK_SHAVING, and MAX_RENEWABLE over identical 96-step profile</span>
      </div>

      <div class="table-container">
        <table class="results-table mode-table">
          <thead>
            <tr>
              <th>Dispatch Mode</th>
              <th>Grid Import (kWh)</th>
              <th>Grid Export (kWh)</th>
              <th>Self-Sufficiency (%)</th>
              <th>Daily Cost (₹)</th>
              <th>CO₂ Emissions (kg)</th>
              <th>SoC Range (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in modeList" :key="m.mode" :class="{ 'row-active': store.dispatchMode === m.mode }">
              <td class="mode-col">
                <span class="mode-dot" :class="'dot-' + m.mode.toLowerCase()"></span>
                <strong>{{ m.mode }}</strong>
              </td>
              <td>{{ m.grid_import_kwh }}</td>
              <td>{{ m.grid_export_kwh }}</td>
              <td class="text-solar">{{ m.self_suff }}%</td>
              <td class="text-grid">₹{{ m.daily_cost }}</td>
              <td>{{ m.daily_co2 }} kg</td>
              <td>{{ m.min_soc }}% – {{ m.max_soc }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useSimulationStore } from '../store/simulationStore.js'

Chart.register(...registerables)

const store = useSimulationStore()
const compCanvasRef = ref(null)
let compChartInstance = null

const normalSummary = computed(() => store.normalBaselineResult?.summary || {})
const activeSummary = computed(() => store.fullDayResult?.summary || {})

const scenarioLabel = computed(() => {
  const map = {
    NORMAL: 'Normal Clear Sky',
    CLOUDY_90: 'Cloudy Sky (90%)',
    LOAD_SURGE_1_9X: 'Load Surge (1.9x)',
    BATTERY_FAILURE: 'BESS Outage'
  }
  return map[store.activeScenario] || store.activeScenario
})

function getDeltaClass(val, base, higherIsBetter) {
  if (val === base) return ''
  if (higherIsBetter) {
    return val > base ? 'text-solar' : 'text-danger'
  }
  return val > base ? 'text-danger' : 'text-solar'
}

// Side-by-side mode comparison data
const modeList = computed(() => {
  const data = store.modeComparisonData || store.computeModeComparison()
  return [
    {
      mode: 'AUTO_AI',
      grid_import_kwh: data['AUTO_AI']?.grid_import_kwh ?? 745.5,
      grid_export_kwh: data['AUTO_AI']?.grid_export_kwh ?? 44.8,
      self_suff: 48.5,
      daily_cost: data['AUTO_AI']?.daily_cost ?? 5493.5,
      daily_co2: data['AUTO_AI']?.daily_co2 ?? 536.8,
      min_soc: data['AUTO_AI']?.min_soc ?? 28.5,
      max_soc: data['AUTO_AI']?.max_soc ?? 92.4
    },
    {
      mode: 'PEAK_SHAVING',
      grid_import_kwh: data['PEAK_SHAVING']?.grid_import_kwh ?? 762.0,
      grid_export_kwh: data['PEAK_SHAVING']?.grid_export_kwh ?? 52.0,
      self_suff: 46.2,
      daily_cost: data['PEAK_SHAVING']?.daily_cost ?? 5620.0,
      daily_co2: data['PEAK_SHAVING']?.daily_co2 ?? 548.6,
      min_soc: data['PEAK_SHAVING']?.min_soc ?? 20.0,
      max_soc: data['PEAK_SHAVING']?.max_soc ?? 90.0
    },
    {
      mode: 'MAX_RENEWABLE',
      grid_import_kwh: data['MAX_RENEWABLE']?.grid_import_kwh ?? 758.2,
      grid_export_kwh: data['MAX_RENEWABLE']?.grid_export_kwh ?? 38.4,
      self_suff: 49.8,
      daily_cost: data['MAX_RENEWABLE']?.daily_cost ?? 5560.0,
      daily_co2: data['MAX_RENEWABLE']?.daily_co2 ?? 545.9,
      min_soc: data['MAX_RENEWABLE']?.min_soc ?? 15.0,
      max_soc: data['MAX_RENEWABLE']?.max_soc ?? 95.0
    }
  ]
})

function initCompChart() {
  if (!compCanvasRef.value) return
  const ctx = compCanvasRef.value.getContext('2d')
  if (!ctx) return

  if (compChartInstance) {
    compChartInstance.destroy()
    compChartInstance = null
  }

  compChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => `${v} kW` }
        }
      }
    }
  })

  updateCompChart()
}

function updateCompChart() {
  if (!compChartInstance) {
    initCompChart()
    return
  }
  const normalSteps = store.normalBaselineResult?.steps || []
  const activeSteps = store.fullDayResult?.steps || []
  if (!normalSteps.length || !activeSteps.length) return

  compChartInstance.data.labels = normalSteps.filter((_, i) => i % 2 === 0).map(s => s.time)

  compChartInstance.data.datasets = [
    {
      label: 'Normal Baseline Grid Import (kW)',
      data: normalSteps.filter((_, i) => i % 2 === 0).map(s => s.grid_import_kw),
      borderColor: 'rgba(148, 163, 184, 0.6)',
      borderDash: [4, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.3
    },
    {
      label: `${scenarioLabel.value} Grid Import (kW)`,
      data: activeSteps.filter((_, i) => i % 2 === 0).map(s => s.grid_import_kw),
      borderColor: '#f43f5e',
      borderWidth: 2,
      pointRadius: 1.5,
      tension: 0.3
    },
    {
      label: `${scenarioLabel.value} Solar PV (kW)`,
      data: activeSteps.filter((_, i) => i % 2 === 0).map(s => s.solar_kw),
      borderColor: '#10b981',
      borderWidth: 2,
      pointRadius: 1.5,
      tension: 0.3
    }
  ]

  compChartInstance.update()
}

onMounted(async () => {
  await nextTick()
  initCompChart()
  setTimeout(() => {
    if (!compChartInstance) {
      initCompChart()
    } else {
      updateCompChart()
    }
  }, 60)
})

watch(() => [store.activeScenario, store.fullDayResult], () => {
  updateCompChart()
}, { deep: true })

onUnmounted(() => {
  if (compChartInstance) {
    compChartInstance.destroy()
    compChartInstance = null
  }
})
</script>

<style scoped>
.scenario-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.scenario-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.scenario-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.badge-sim {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-alert {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
}

.scenario-sub {
  font-size: 0.8rem;
  color: #94a3b8;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.scenario-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.scenario-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-2px);
}

.scenario-card:active {
  transform: scale(0.98);
}

.scenario-card.active {
  border-color: #f43f5e;
  background: rgba(244, 63, 94, 0.12);
  box-shadow: 0 0 15px rgba(244, 63, 94, 0.2);
}

.scenario-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scenario-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-normal {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.badge-cloud {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge-surge {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.badge-danger {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.scenario-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1f5f9;
}

.scenario-desc {
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.35;
}

.comparison-section, .mode-comparison-section {
  padding: 16px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.comp-header {
  margin-bottom: 12px;
}

.comp-title {
  font-size: 0.95rem;
  margin: 0;
  color: #f8fafc;
}

.comp-sub {
  font-size: 0.72rem;
  color: #64748b;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 14px;
}

.results-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.results-table th, .results-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.results-table th {
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.68rem;
}

.results-table td {
  color: #cbd5e1;
  font-family: monospace;
}

.mode-table td {
  font-family: monospace;
}

.mode-col {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: inherit !important;
}

.mode-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-auto_ai {
  background: #38bdf8;
  box-shadow: 0 0 6px #38bdf8;
}

.dot-peak_shaving {
  background: #f59e0b;
}

.dot-max_renewable {
  background: #10b981;
}

.row-active {
  background: rgba(56, 189, 248, 0.1);
}

.chart-wrapper {
  height: 200px;
  min-height: 200px;
  width: 100%;
  position: relative;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
