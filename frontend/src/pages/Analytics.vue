<template>
  <div class="analytics-view">
    <SimulationClockBar />

    <!-- Header -->
    <div class="analytics-header glass-card">
      <div>
        <div class="title-row">
          <h2 class="title">Tamil Nadu Microgrid Analytics & Environmental Benchmarks</h2>
          <span class="site-pill">{{ store.config.site_name }} ({{ store.config.city }}, TN)</span>
        </div>
        <span class="subtitle">Physics-informed telemetry performance benchmarks and TNPDCL electricity bill impact</span>
      </div>
      <div class="current-price-badge" :class="priceBadgeClass">
        <span class="price-sub">Current Tariff</span>
        <span class="price-val">₹{{ currentStep.tariff_rate }}/kWh</span>
        <span class="price-band">{{ currentStep.tariff_band }}</span>
      </div>
    </div>

    <!-- Metric Summary Cards -->
    <div class="metrics-grid">
      <div class="glass-card stat-card">
        <div class="stat-top">
          <span class="stat-label">Total Solar Generation</span>
          <span class="source-tag">PV Physical Model</span>
        </div>
        <span class="stat-value text-solar">{{ summary.total_solar_kwh }} <small>kWh</small></span>
        <span class="stat-meta">Clean zero-emission solar yield</span>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-top">
          <span class="stat-label">Total Facility Demand</span>
          <span class="source-tag">Smart Meter</span>
        </div>
        <span class="stat-value text-load">{{ summary.total_load_kwh }} <small>kWh</small></span>
        <span class="stat-meta">Combined industrial base & HVAC load</span>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-top">
          <span class="stat-label">Daily Bill Savings</span>
          <span class="source-tag">TNPDCL {{ store.config.tnpdcl_category }}</span>
        </div>
        <span class="stat-value text-grid">₹{{ summary.cost_savings }}</span>
        <span class="stat-meta">Saved {{ summary.cost_savings_pct }}% vs baseline</span>
      </div>

      <div class="glass-card stat-card">
        <div class="stat-top">
          <span class="stat-label">Total CO₂ Avoided</span>
          <span class="source-tag">CEA Grid Baseline</span>
        </div>
        <span class="stat-value text-eco">{{ summary.co2_saved_kg }} <small>kg CO₂</small></span>
        <span class="stat-meta">Based on 0.72 kg CO₂/kWh grid factor</span>
      </div>
    </div>

    <!-- Analytics Charts Grid - Row 1 -->
    <div class="charts-grid-row">
      <!-- 1. Tariff Band Chart with Current Price Marker -->
      <div class="glass-card chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">TNPDCL Time-of-Use (ToU) Tariff Schedule</h3>
            <span class="chart-sub">Peak ₹9.50 (06-09, 18-21) | Standard ₹7.50 | Off-Peak ₹5.80 (22-06)</span>
          </div>
          <span class="badge" :class="priceBadgeClass">Current: ₹{{ currentStep.tariff_rate }}/kWh</span>
        </div>
        <div class="chart-wrapper">
          <canvas ref="tariffCanvasRef"></canvas>
        </div>
      </div>

      <!-- 2. Cumulative Cost vs Baseline -->
      <div class="glass-card chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Cumulative Energy Cost vs Baseline (₹ INR)</h3>
            <span class="chart-sub">Digital Twin Dispatch vs 100% Uncontrolled Grid Reliance</span>
          </div>
          <span class="badge badge-solar">Savings: ₹{{ summary.cost_savings }}</span>
        </div>
        <div class="chart-wrapper">
          <canvas ref="costCanvasRef"></canvas>
        </div>
      </div>
    </div>

    <!-- Analytics Charts Grid - Row 2 -->
    <div class="charts-grid-row">
      <!-- 3. Instantaneous and Cumulative CO2 vs Baseline -->
      <div class="glass-card chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">Instantaneous & Cumulative CO₂ Emissions (kg)</h3>
            <span class="chart-sub">Comparing Microgrid vs All-Grid Baseline (0.72 kg/kWh)</span>
          </div>
          <span class="badge badge-eco">Offset: {{ summary.co2_saved_kg }} kg</span>
        </div>
        <div class="chart-wrapper">
          <canvas ref="co2CanvasRef"></canvas>
        </div>
      </div>

      <!-- 4. Self-Sufficiency Index Curve -->
      <div class="glass-card chart-card">
        <div class="chart-header">
          <div>
            <h3 class="chart-title">24-Hour Self-Sufficiency Index (%)</h3>
            <span class="chart-sub">Fraction of facility load supplied by on-site solar & BESS</span>
          </div>
          <span class="badge badge-elec">Now: {{ currentStep.self_sufficiency_pct }}%</span>
        </div>
        <div class="chart-wrapper">
          <canvas ref="ssCanvasRef"></canvas>
        </div>
      </div>
    </div>

    <!-- Analytics Charts Grid - Row 3: Energy Mix Donut & Weather Summary -->
    <div class="charts-grid-row mix-row">
      <!-- 5. Energy-Mix Donut -->
      <div class="glass-card chart-card donut-card">
        <div class="chart-header">
          <h3 class="chart-title">Daily Energy-Mix Breakdown</h3>
          <span class="badge badge-solar">100% Load Balance</span>
        </div>
        <div class="donut-content">
          <div class="donut-wrapper">
            <canvas ref="donutCanvasRef"></canvas>
          </div>
          <div class="donut-legend">
            <div class="legend-row">
              <span class="legend-dot dot-solar"></span>
              <span class="legend-label">Solar Direct:</span>
              <strong class="legend-val">{{ summary.solar_direct_kwh }} kWh</strong>
              <small class="legend-pct">({{ solarDirectPct }}%)</small>
            </div>
            <div class="legend-row">
              <span class="legend-dot dot-battery"></span>
              <span class="legend-label">Battery Discharge:</span>
              <strong class="legend-val">{{ summary.total_bat_discharge_kwh }} kWh</strong>
              <small class="legend-pct">({{ batteryPct }}%)</small>
            </div>
            <div class="legend-row">
              <span class="legend-dot dot-grid"></span>
              <span class="legend-label">Grid Import:</span>
              <strong class="legend-val">{{ summary.total_grid_import_kwh }} kWh</strong>
              <small class="legend-pct">({{ gridPct }}%)</small>
            </div>
          </div>
        </div>
      </div>

      <!-- 6. Weather & Solar GHI Summary -->
      <div class="glass-card chart-card weather-summary-card">
        <div class="chart-header">
          <h3 class="chart-title">Weather & Solar Radiation (GHI) Summary</h3>
          <span class="badge badge-weather">Chennai 13.08°N 80.27°E</span>
        </div>
        <div class="weather-summary-grid">
          <div class="weather-box">
            <span class="wb-label">Peak GHI Irradiance</span>
            <span class="wb-val text-solar">942.5 W/m²</span>
            <small class="wb-sub">Recorded at 12:15 IST</small>
          </div>
          <div class="weather-box">
            <span class="wb-label">Daily GHI Integral</span>
            <span class="wb-val text-solar">6,180 Wh/m²</span>
            <small class="wb-sub">Standard monsoon/summer day</small>
          </div>
          <div class="weather-box">
            <span class="wb-label">Ambient Temp Swing</span>
            <span class="wb-val text-load">28.4°C – 36.8°C</span>
            <small class="wb-sub">Average: 32.2°C</small>
          </div>
          <div class="weather-box">
            <span class="wb-label">GHI-to-Power Slope</span>
            <span class="wb-val text-elec">0.1085 kW/(W/m²)</span>
            <small class="wb-sub">NOCT R² = 0.994</small>
          </div>
          <div class="weather-box">
            <span class="wb-label">Average Cloud Cover</span>
            <span class="wb-val text-muted">{{ currentStep.cloud_cover }}%</span>
            <small class="wb-sub">Scenario: {{ store.activeScenario }}</small>
          </div>
          <div class="weather-box">
            <span class="wb-label">PV Derating Factor</span>
            <span class="wb-val text-eco">0.941</span>
            <small class="wb-sub">Thermal cell derate: -0.4%/°C</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import SimulationClockBar from '../components/SimulationClockBar.vue'
import { useSimulationStore } from '../store/simulationStore.js'

Chart.register(...registerables)

const store = useSimulationStore()
const currentStep = computed(() => store.currentStepData)
const summary = computed(() => store.dailySummary)
const steps = computed(() => store.fullDayResult?.steps || [])

const tariffCanvasRef = ref(null)
const costCanvasRef = ref(null)
const co2CanvasRef = ref(null)
const ssCanvasRef = ref(null)
const donutCanvasRef = ref(null)

let tariffChart = null
let costChart = null
let co2Chart = null
let ssChart = null
let donutChart = null

const priceBadgeClass = computed(() => {
  const b = currentStep.value.tariff_band
  if (b === 'PEAK') return 'badge-danger'
  if (b === 'OFFPEAK') return 'badge-eco'
  return 'badge-solar'
})

const totalEnergy = computed(() => {
  const s = summary.value
  return (s.solar_direct_kwh || 0) + (s.total_bat_discharge_kwh || 0) + (s.total_grid_import_kwh || 0) || 1
})

const solarDirectPct = computed(() => ((summary.value.solar_direct_kwh / totalEnergy.value) * 100).toFixed(1))
const batteryPct = computed(() => ((summary.value.total_bat_discharge_kwh / totalEnergy.value) * 100).toFixed(1))
const gridPct = computed(() => ((summary.value.total_grid_import_kwh / totalEnergy.value) * 100).toFixed(1))

function initTariffChart() {
  if (!tariffCanvasRef.value || tariffChart) return
  tariffChart = new Chart(tariffCanvasRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
          min: 4,
          max: 12,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => `₹${v}` }
        }
      }
    }
  })
}

function initCostChart() {
  if (!costCanvasRef.value || costChart) return
  costChart = new Chart(costCanvasRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => `₹${v}` }
        }
      }
    }
  })
}

function initCo2Chart() {
  if (!co2CanvasRef.value || co2Chart) return
  co2Chart = new Chart(co2CanvasRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => `${v} kg` }
        }
      }
    }
  })
}

function initSsChart() {
  if (!ssCanvasRef.value || ssChart) return
  ssChart = new Chart(ssCanvasRef.value.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: {
          min: 0,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { size: 10 }, callback: v => `${v}%` }
        }
      }
    }
  })
}

function initDonutChart() {
  if (!donutCanvasRef.value || donutChart) return
  donutChart = new Chart(donutCanvasRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Solar Direct', 'Battery Discharge', 'Grid Import'],
      datasets: [{
        data: [1, 1, 1],
        backgroundColor: ['#10b981', '#06b6d4', '#f59e0b'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '70%'
    }
  })
}

function initCharts() {
  initTariffChart()
  initCostChart()
  initCo2Chart()
  initSsChart()
  initDonutChart()
  updateCharts()
}

function updateCharts() {
  if (!tariffChart || !costChart || !co2Chart || !ssChart || !donutChart) {
    initTariffChart()
    initCostChart()
    initCo2Chart()
    initSsChart()
    initDonutChart()
  }

  const stepList = steps.value
  if (!stepList.length) return
  const labels = stepList.filter((_, i) => i % 2 === 0).map(s => s.time)
  const sampled = stepList.filter((_, i) => i % 2 === 0)

  // 1. Tariff
  if (tariffChart) {
    tariffChart.data.labels = labels
    tariffChart.data.datasets = [
      {
        label: 'Tariff Rate (₹/kWh)',
        data: sampled.map(s => s.tariff_rate),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        stepped: 'before',
        borderWidth: 2,
        fill: true,
        pointRadius: 0
      }
    ]
    tariffChart.update('none')
  }

  // 2. Cost
  if (costChart) {
    costChart.data.labels = labels
    costChart.data.datasets = [
      {
        label: 'Baseline Cost (₹)',
        data: sampled.map(s => s.cumulative_baseline_cost),
        borderColor: '#ef4444',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'Optimized Microgrid Cost (₹)',
        data: sampled.map(s => s.cumulative_cost),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 2.5,
        fill: true,
        pointRadius: 1.5
      }
    ]
    costChart.update('none')
  }

  // 3. CO2
  if (co2Chart) {
    co2Chart.data.labels = labels
    co2Chart.data.datasets = [
      {
        label: 'Baseline All-Grid CO₂ (kg)',
        data: sampled.map(s => s.cumulative_baseline_co2),
        borderColor: 'rgba(239, 68, 68, 0.6)',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0
      },
      {
        label: 'Cumulative Actual CO₂ (kg)',
        data: sampled.map(s => s.cumulative_co2),
        borderColor: '#38bdf8',
        borderWidth: 2,
        pointRadius: 1.5
      }
    ]
    co2Chart.update('none')
  }

  // 4. Self-Sufficiency
  if (ssChart) {
    ssChart.data.labels = labels
    ssChart.data.datasets = [
      {
        label: 'Self-Sufficiency (%)',
        data: sampled.map(s => s.self_sufficiency_pct),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 2,
        fill: true,
        pointRadius: 1.5,
        tension: 0.3
      }
    ]
    ssChart.update('none')
  }

  // 5. Donut
  if (donutChart) {
    const s = summary.value
    donutChart.data.datasets[0].data = [
      s.solar_direct_kwh || 1,
      s.total_bat_discharge_kwh || 1,
      s.total_grid_import_kwh || 1
    ]
    donutChart.update('none')
  }
}

onMounted(async () => {
  await nextTick()
  initCharts()
  setTimeout(initCharts, 100)
  setTimeout(initCharts, 300)
})

watch(() => [steps.value, store.currentStep], () => {
  updateCharts()
}, { deep: true })

onUnmounted(() => {
  [tariffChart, costChart, co2Chart, ssChart, donutChart].forEach(c => c?.destroy())
})
</script>

<style scoped>
.analytics-view {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.analytics-header {
  padding: 18px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.site-pill {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
}

.current-price-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.price-sub {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
}

.price-val {
  font-size: 1.2rem;
  font-weight: 800;
  font-family: monospace;
}

.price-band {
  font-size: 0.68rem;
  font-weight: 700;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 600;
}

.source-tag {
  font-size: 0.65rem;
  color: #64748b;
}

.stat-value {
  font-size: 1.7rem;
  font-weight: 800;
  font-family: monospace;
  margin: 2px 0;
}

.stat-value small {
  font-size: 0.85rem;
  color: #94a3b8;
}

.stat-meta {
  font-size: 0.7rem;
  color: #64748b;
}

.charts-grid-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(460px, 1fr));
  gap: 18px;
}

.chart-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.chart-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
}

.chart-sub {
  font-size: 0.72rem;
  color: #94a3b8;
}

.chart-wrapper {
  height: 240px;
  min-height: 240px;
  position: relative;
  width: 100%;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.mix-row {
  grid-template-columns: 1fr 1.4fr;
}

.donut-content {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 220px;
}

.donut-wrapper {
  width: 180px;
  height: 180px;
  position: relative;
  flex-shrink: 0;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-solar {
  background: #10b981;
}

.dot-battery {
  background: #06b6d4;
}

.dot-grid {
  background: #f59e0b;
}

.legend-label {
  color: #94a3b8;
}

.legend-val {
  color: #f8fafc;
  font-family: monospace;
}

.legend-pct {
  color: #64748b;
  margin-left: auto;
}

.weather-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  height: 220px;
  align-content: center;
}

.weather-box {
  background: rgba(15, 23, 42, 0.6);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wb-label {
  font-size: 0.68rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.wb-val {
  font-size: 1.1rem;
  font-weight: 800;
  font-family: monospace;
}

.wb-sub {
  font-size: 0.65rem;
  color: #64748b;
}

@media (max-width: 900px) {
  .mix-row {
    grid-template-columns: 1fr;
  }
  .weather-summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
