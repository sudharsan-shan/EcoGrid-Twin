<template>
  <div class="chart-card glass-card">
    <div class="chart-header">
      <div>
        <div class="title-row">
          <h3 class="chart-title">Real-Time Power Telemetry</h3>
          <span class="source-pill">{{ telemetrySourceLabel }}</span>
        </div>
        <span class="chart-sub">Streaming time-series power balance (kW) from database history</span>
      </div>
      <div class="chart-legend">
        <span class="legend-item"><span class="dot dot-solar"></span>Solar PV</span>
        <span class="legend-item"><span class="dot dot-load"></span>Load</span>
        <span class="legend-item"><span class="dot dot-battery"></span>Battery</span>
        <span class="legend-item"><span class="dot dot-grid"></span>Grid Import</span>
      </div>
    </div>
    <div class="chart-wrapper">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useTwinStore } from '../store/twinStore'

Chart.register(...registerables)

const twinStore = useTwinStore()
const canvasRef = ref(null)
let chartInstance = null

const telemetrySourceLabel = computed(() => {
  return twinStore.state.source_mode === 'SIMULATION' ? 'Simulation Database Feed' : 'Live Meter Telemetry'
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
      datasets: [
        {
          label: 'Solar PV (kW)',
          data: [],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
          pointRadius: 0,
        },
        {
          label: 'Facility Load (kW)',
          data: [],
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.05)',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: 'Battery (kW)',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 0,
        },
        {
          label: 'Grid Import (kW)',
          data: [],
          borderColor: '#06b6d4',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 200 },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
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
          ticks: {
            color: '#64748b',
            font: { size: 11 },
            maxTicksLimit: 8,
          },
        },
        y: {
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

  const history = twinStore.history || []
  if (!history.length) return

  const sliced = history.slice(-40)
  chartInstance.data.labels = sliced.map((h) => {
    if (h.time) return h.time
    if (h.sim_time) return h.sim_time
    try {
      const dt = new Date(h.timestamp)
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    } catch {}
    return ''
  })

  chartInstance.data.datasets[0].data = sliced.map((h) => h.solar_kw ?? 0)
  chartInstance.data.datasets[1].data = sliced.map((h) => h.load_kw ?? 0)
  chartInstance.data.datasets[2].data = sliced.map((h) => h.battery_kw ?? 0)
  chartInstance.data.datasets[3].data = sliced.map((h) => h.grid_import_kw ?? 0)

  chartInstance.update('none')
}

watch(
  () => [twinStore.currentStep, twinStore.fullDayResult],
  () => {
    updateChartData()
  },
  { deep: true }
)

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

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
.chart-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chart-title {
  font-size: 1.1rem;
  color: var(--text-primary);
}

.source-pill {
  font-size: 0.65rem;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.chart-sub {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chart-legend {
  display: flex;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-solar { background: var(--color-solar); }
.dot-load { background: var(--color-load); }
.dot-battery { background: var(--color-battery); }
.dot-grid { background: var(--color-grid); }

.chart-wrapper {
  position: relative;
  height: 250px;
  min-height: 250px;
  width: 100%;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}
</style>
