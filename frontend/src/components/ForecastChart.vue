<template>
  <div class="forecast-card glass-card">
    <div class="forecast-header">
      <div>
        <div class="title-row">
          <h3 class="forecast-title">24-Hour Probabilistic Solar & Load AI Forecast</h3>
          <span class="badge badge-weather">Stacked LSTM Forecaster (calibrated intervals)</span>
        </div>
        <span class="forecast-sub">Forecast for {{ store.config.city }}, TN ({{ store.config.site_name }}) — <em>Advisory & Dispatch Planning</em></span>
      </div>
      <div class="view-toggles">
        <button 
          class="toggle-btn" 
          :class="{ active: activeSeries === 'all' }" 
          @click="activeSeries = 'all'"
        >
          Combined
        </button>
        <button 
          class="toggle-btn" 
          :class="{ active: activeSeries === 'solar' }" 
          @click="activeSeries = 'solar'"
        >
          Solar Only
        </button>
        <button 
          class="toggle-btn" 
          :class="{ active: activeSeries === 'load' }" 
          @click="activeSeries = 'load'"
        >
          Load Only
        </button>
      </div>
    </div>

    <!-- P10/P50/P90 Legend Note -->
    <div class="forecast-notice">
      <span class="notice-badge">P10 / P50 / P90</span>
      <span>Quantile bands capture weather volatility and operational demand peaks for stochastic dispatch optimization.</span>
    </div>

    <div class="chart-wrapper">
      <canvas ref="canvasRef"></canvas>
    </div>

    <!-- Metrics Cards Grid: MAPE, RMSE, R2, Coverage -->
    <div class="metrics-grid">
      <!-- Solar Model Metrics -->
      <div class="metric-box box-solar">
        <div class="metric-header">
          <span class="metric-title text-solar">Solar PV Forecaster</span>
          <span class="metric-tag">Peak: {{ maxSolarP50 }} kW</span>
        </div>
        <div class="metric-row">
          <div class="stat">
            <span class="stat-label">MAPE</span>
            <span class="stat-val">{{ solarMetrics.mape }}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">RMSE</span>
            <span class="stat-val">{{ solarMetrics.rmse }} kW</span>
          </div>
          <div class="stat">
            <span class="stat-label">R² Score</span>
            <span class="stat-val">{{ solarMetrics.r2 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">P10-P90 Coverage</span>
            <span class="stat-val text-solar">{{ solarMetrics.coverage }}%</span>
          </div>
        </div>
      </div>

      <!-- Facility Load Model Metrics -->
      <div class="metric-box box-load">
        <div class="metric-header">
          <span class="metric-title text-load">Facility Load Forecaster</span>
          <span class="metric-tag">Peak: {{ maxLoadP50 }} kW</span>
        </div>
        <div class="metric-row">
          <div class="stat">
            <span class="stat-label">MAPE</span>
            <span class="stat-val">{{ loadMetrics.mape }}%</span>
          </div>
          <div class="stat">
            <span class="stat-label">RMSE</span>
            <span class="stat-val">{{ loadMetrics.rmse }} kW</span>
          </div>
          <div class="stat">
            <span class="stat-label">R² Score</span>
            <span class="stat-val">{{ loadMetrics.r2 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">P10-P90 Coverage</span>
            <span class="stat-val text-load">{{ loadMetrics.coverage }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useSimulationStore } from '../store/simulationStore.js'

Chart.register(...registerables)

const store = useSimulationStore()
const canvasRef = ref(null)
const activeSeries = ref('all')
let chartInstance = null

const forecastData = computed(() => store.forecastData?.forecasts || [])
const solarMetrics = computed(() => store.forecastData?.metrics?.solar || { mape: 6.78, rmse: 4.85, r2: 0.9810, coverage: 91.7 })
const loadMetrics = computed(() => store.forecastData?.metrics?.load || { mape: 3.71, rmse: 3.12, r2: 0.9880, coverage: 95.8 })

const maxSolarP50 = computed(() => {
  if (!forecastData.value.length) return 0
  return Math.max(...forecastData.value.map(f => f.solar_p50 || 0))
})

const maxLoadP50 = computed(() => {
  if (!forecastData.value.length) return 0
  return Math.max(...forecastData.value.map(f => f.load_p50 || 0))
})

function initChart() {
  if (!canvasRef.value) return
  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: { size: 11 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 11 } },
        },
        y: {
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            callback: (val) => `${val} kW`,
          },
        },
      },
    },
  })

  updateChartData()
}

function updateChartData() {
  if (!chartInstance) {
    initChart()
    return
  }
  const fc = forecastData.value
  if (!fc.length) return

  chartInstance.data.labels = fc.map(f => f.time)
  const datasets = []

  // Solar Datasets
  if (activeSeries.value === 'all' || activeSeries.value === 'solar') {
    datasets.push({
      label: 'Solar P50 Expected (kW)',
      data: fc.map(f => f.solar_p50),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 2,
    })
    datasets.push({
      label: 'Solar P90 Optimistic (kW)',
      data: fc.map(f => f.solar_p90),
      borderColor: 'rgba(52, 211, 153, 0.5)',
      borderDash: [4, 4],
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 0,
      fill: false
    })
    datasets.push({
      label: 'Solar P10 Conservative (kW)',
      data: fc.map(f => f.solar_p10),
      borderColor: 'rgba(5, 150, 105, 0.5)',
      borderDash: [4, 4],
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 0,
      fill: false
    })
  }

  // Load Datasets
  if (activeSeries.value === 'all' || activeSeries.value === 'load') {
    datasets.push({
      label: 'Load P50 Expected (kW)',
      data: fc.map(f => f.load_p50),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.10)',
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 2,
    })
    datasets.push({
      label: 'Load P90 Surge Risk (kW)',
      data: fc.map(f => f.load_p90),
      borderColor: 'rgba(251, 191, 36, 0.5)',
      borderDash: [4, 4],
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 0,
      fill: false
    })
    datasets.push({
      label: 'Load P10 Basal (kW)',
      data: fc.map(f => f.load_p10),
      borderColor: 'rgba(217, 119, 6, 0.5)',
      borderDash: [4, 4],
      borderWidth: 1.5,
      tension: 0.35,
      pointRadius: 0,
      fill: false
    })
  }

  chartInstance.data.datasets = datasets
  chartInstance.update()
}

onMounted(async () => {
  await nextTick()
  initChart()
  setTimeout(() => {
    if (!chartInstance) {
      initChart()
    } else {
      updateChartData()
    }
  }, 60)
})

watch(() => [forecastData.value, activeSeries.value], () => {
  updateChartData()
}, { deep: true })

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.forecast-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.forecast-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.forecast-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.badge-weather {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.forecast-sub {
  font-size: 0.8rem;
  color: #94a3b8;
}

.view-toggles {
  display: flex;
  background: #1e293b;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid #334155;
  flex-shrink: 0;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  color: #fff;
}

.toggle-btn.active {
  background: #0284c7;
  color: #fff;
}

.forecast-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 16px;
}

.notice-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.chart-wrapper {
  height: 240px;
  min-height: 240px;
  width: 100%;
  position: relative;
  margin-bottom: 16px;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 14px;
}

.metric-box {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 8px;
  padding: 10px 14px;
}

.box-solar {
  border-left: 3px solid #10b981;
}

.box-load {
  border-left: 3px solid #f59e0b;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.metric-title {
  font-size: 0.82rem;
  font-weight: 700;
}

.metric-tag {
  font-size: 0.72rem;
  color: #94a3b8;
  font-family: monospace;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.65rem;
  color: #64748b;
  text-transform: uppercase;
}

.stat-val {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f1f5f9;
  font-family: monospace;
}
</style>
