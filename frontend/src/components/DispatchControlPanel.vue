<template>
  <div class="control-panel glass-card">
    <!-- Advisory Read-Only Banner -->
    <div class="advisory-banner">
      <div class="banner-left">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        <span class="banner-text"><strong>Read-Only Supervisory Dispatch & Guardrail Engine</strong> — Real-time setpoints are projected onto physical feasibility boundaries with continuous safety logging.</span>
      </div>
      <span class="badge badge-sim">Digital Twin Simulation</span>
    </div>

    <div class="panel-header">
      <div>
        <h3 class="panel-title">Smart Dispatch Strategy & 24-Hour Lookahead Optimizer</h3>
        <span class="panel-sub">Co-optimizing battery storage and solar self-consumption under TNPDCL ToU Tariffs</span>
      </div>
      <button 
        class="btn btn-primary" 
        @click="runOptimizer"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>Re-Solve 24h Lookahead Schedule</span>
      </button>
    </div>

    <!-- Mode Buttons Grid -->
    <div class="mode-grid">
      <div 
        class="mode-card"
        :class="{ active: currentMode === 'AUTO_AI' }"
        @click="store.setDispatchMode('AUTO_AI')"
      >
        <div class="mode-icon text-solar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
        </div>
        <div class="mode-meta">
          <span class="mode-name">Auto AI Dispatch</span>
          <span class="mode-desc">Dynamic cost & carbon optimizer balancing TNPDCL peak shaving with daytime solar storage.</span>
        </div>
      </div>

      <div 
        class="mode-card"
        :class="{ active: currentMode === 'PEAK_SHAVING' }"
        @click="store.setDispatchMode('PEAK_SHAVING')"
      >
        <div class="mode-icon text-battery">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <div class="mode-meta">
          <span class="mode-name">Peak Shaving</span>
          <span class="mode-desc">Discharges battery during TN morning (06-09) & evening (18-21) peak tariff windows (₹9.50/kWh).</span>
        </div>
      </div>

      <div 
        class="mode-card"
        :class="{ active: currentMode === 'MAX_RENEWABLE' }"
        @click="store.setDispatchMode('MAX_RENEWABLE')"
      >
        <div class="mode-icon text-solar">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path></svg>
        </div>
        <div class="mode-meta">
          <span class="mode-name">Max Green Energy</span>
          <span class="mode-desc">Prioritizes 100% solar self-consumption, minimizing dependency on grid imports.</span>
        </div>
      </div>

      <div 
        class="mode-card"
        :class="{ active: currentMode === 'ISLANDED' }"
        @click="store.setDispatchMode('ISLANDED')"
      >
        <div class="mode-icon text-danger">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
        </div>
        <div class="mode-meta">
          <span class="mode-name">Islanded Microgrid</span>
          <span class="mode-desc">Zero-grid operation: microgrid balances load strictly via solar PV and battery.</span>
        </div>
      </div>
    </div>

    <!-- Optimization Results Summary Box -->
    <div v-if="optResult" class="opt-result-drawer glass-card">
      <div class="opt-header">
        <div class="opt-title-group">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span class="opt-title">24-Hour Lookahead Schedule (TNPDCL Tariffs)</span>
        </div>
        <span class="badge badge-solar">Optimized Cost: ₹{{ optResult.projected_cost }} / day</span>
      </div>
      <div class="opt-stats-row">
        <div class="opt-stat">
          <span class="opt-stat-label">Baseline Daily Cost</span>
          <span class="opt-stat-val text-muted">₹{{ optResult.baseline_cost }}</span>
          <small class="opt-stat-sub">No battery dispatch</small>
        </div>
        <div class="opt-stat">
          <span class="opt-stat-label">Daily Cost Savings</span>
          <span class="opt-stat-val text-solar">₹{{ optResult.cost_saving }} ({{ optResult.saving_pct }}%)</span>
          <small class="opt-stat-sub">Peak tariff arbitrage</small>
        </div>
        <div class="opt-stat">
          <span class="opt-stat-label">CO₂ Avoided</span>
          <span class="opt-stat-val text-eco">{{ optResult.co2_saved_kg }} kg</span>
          <small class="opt-stat-sub">0.72 kg/kWh grid factor</small>
        </div>
        <div class="opt-stat">
          <span class="opt-stat-label">Guardrail Feasibility</span>
          <span class="opt-stat-val text-elec">100% Projected</span>
          <small class="opt-stat-sub">Limits: 15-95% SoC, 60kW</small>
        </div>
      </div>

      <!-- Schedule Chart Canvas -->
      <div class="sched-chart-section">
        <div class="chart-title-row">
          <span class="chart-label">24-Hour Lookahead Dispatch Schedule (Battery Power, SoC & Hourly Cost)</span>
        </div>
        <div class="chart-wrapper">
          <canvas ref="schedCanvasRef"></canvas>
        </div>
      </div>
    </div>

    <!-- Guardrail Interventions Log Panel -->
    <div class="guardrail-panel glass-card">
      <div class="guardrail-header">
        <div class="guardrail-title-group">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span class="guardrail-title">Physics & Safety Guardrail Engine</span>
        </div>
        <span class="guardrail-count" :class="{ 'has-alerts': guardrailEvents.length > 0 }">
          {{ guardrailEvents.length }} Interventions Today
        </span>
      </div>

      <div v-if="guardrailEvents.length > 0" class="guardrail-list">
        <div v-for="(ev, idx) in guardrailEvents.slice(0, 4)" :key="idx" class="guardrail-item">
          <span class="ev-step">Step {{ ev.step + 1 }}</span>
          <span class="ev-power">Req: {{ ev.requestedKw }}kW → Clamped: {{ ev.feasibleKw }}kW</span>
          <span class="ev-reason">{{ ev.reason }}</span>
        </div>
      </div>
      <div v-else class="guardrail-empty">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
        <span>All setpoints within safe physical feasibility bounds [15% - 95% SoC, ≤ 60kW, &lt; 45°C].</span>
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
const currentMode = computed(() => store.dispatchMode)
const optResult = computed(() => store.optimizerResult)
const guardrailEvents = computed(() => store.guardrailEvents)

const schedCanvasRef = ref(null)
let schedChartInstance = null

function runOptimizer() {
  store.recomputeAll()
}

function initSchedChart() {
  if (!schedCanvasRef.value) return
  if (schedChartInstance) {
    schedChartInstance.destroy()
    schedChartInstance = null
  }
  const ctx = schedCanvasRef.value.getContext('2d')

  schedChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#64748b', font: { size: 10 } }
        },
        y: {
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { size: 10 },
            callback: (val) => `${val} kW`
          }
        },
        ySoc: {
          position: 'right',
          grid: { drawOnChartArea: false },
          min: 0,
          max: 100,
          ticks: {
            color: '#06b6d4',
            font: { size: 10 },
            callback: (val) => `${val}%`
          }
        }
      }
    }
  })

  updateSchedChart()
}

function updateSchedChart() {
  if (!schedChartInstance) {
    initSchedChart()
    return
  }
  if (!optResult.value?.schedule) return
  const sched = optResult.value.schedule

  schedChartInstance.data.labels = sched.map(s => s.time)
  schedChartInstance.data.datasets = [
    {
      type: 'bar',
      label: 'Scheduled Battery (kW)',
      data: sched.map(s => s.battery_kw),
      backgroundColor: sched.map(s => s.battery_kw >= 0 ? 'rgba(56, 189, 248, 0.6)' : 'rgba(16, 185, 129, 0.6)'),
      borderRadius: 4
    },
    {
      type: 'line',
      label: 'Projected SoC (%)',
      data: sched.map(s => s.soc),
      borderColor: '#06b6d4',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.3,
      yAxisID: 'ySoc'
    },
    {
      type: 'line',
      label: 'Hourly Cost (₹)',
      data: sched.map(s => s.cost),
      borderColor: '#f59e0b',
      borderDash: [3, 3],
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.2
    }
  ]
  schedChartInstance.update('none')
}

onMounted(async () => {
  await nextTick()
  initSchedChart()
  setTimeout(initSchedChart, 100)
  setTimeout(initSchedChart, 300)
})

watch(() => optResult.value, async () => {
  await nextTick()
  updateSchedChart()
}, { deep: true })

onUnmounted(() => {
  if (schedChartInstance) {
    schedChartInstance.destroy()
    schedChartInstance = null
  }
})
</script>

<style scoped>
.control-panel {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.advisory-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  padding: 8px 14px;
  border-radius: 8px;
  gap: 12px;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-text {
  font-size: 0.78rem;
  color: #94a3b8;
}

.badge-sim {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  margin: 0;
}

.panel-sub {
  font-size: 0.8rem;
  color: #94a3b8;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.mode-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-card:hover {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(30, 41, 59, 0.5);
  transform: translateY(-2px);
}

.mode-card:active {
  transform: scale(0.98);
}

.mode-card.active {
  border-color: #38bdf8;
  background: rgba(2, 132, 199, 0.15);
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
}

.mode-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.mode-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mode-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: #f8fafc;
}

.mode-desc {
  font-size: 0.72rem;
  color: #94a3b8;
  line-height: 1.35;
}

.opt-result-drawer {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.opt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.opt-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f1f5f9;
}

.opt-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.opt-stat {
  background: rgba(30, 41, 59, 0.5);
  padding: 10px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.opt-stat-label {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.opt-stat-val {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 2px 0;
  font-family: monospace;
}

.opt-stat-sub {
  font-size: 0.68rem;
  color: #64748b;
}

.sched-chart-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

.chart-title-row {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.chart-wrapper {
  height: 200px;
  position: relative;
}

.guardrail-panel {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 14px;
}

.guardrail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.guardrail-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guardrail-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f8fafc;
}

.guardrail-count {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.guardrail-count.has-alerts {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.guardrail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.guardrail-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 41, 59, 0.4);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
}

.ev-step {
  color: #38bdf8;
  font-family: monospace;
  font-weight: bold;
}

.ev-power {
  color: #cbd5e1;
  font-family: monospace;
}

.ev-reason {
  color: #fbbf24;
  margin-left: auto;
}

.chart-wrapper {
  height: 260px;
  min-height: 260px;
  position: relative;
  width: 100%;
}

.chart-wrapper canvas {
  width: 100% !important;
  height: 100% !important;
}

.guardrail-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #94a3b8;
  padding: 6px 4px;
}
</style>
