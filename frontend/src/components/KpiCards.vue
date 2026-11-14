<template>
  <div class="kpi-grid">
    <!-- 1. Solar Generation Power & Energy -->
    <div class="kpi-card glass-card card-accent-solar kpi-solar">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Solar PV Generation</span>
          <span class="source-badge badge-solar">{{ solarSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-solar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </div>
      </div>

      <div class="kpi-value-row">
        <div class="num-group">
          <span class="kpi-number text-solar tabular-nums">{{ twinStore.state.solar_kw }}</span>
          <span class="kpi-unit">kW</span>
        </div>
        <!-- Delta Indicator -->
        <div v-if="solarDelta !== null" class="delta-badge" :class="solarDelta >= 0 ? 'delta-up' : 'delta-down'">
          <span>{{ solarDelta >= 0 ? '▲ +' : '▼ ' }}{{ Math.abs(solarDelta) }}</span>
        </div>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-solar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="solarSparkArea" fill="url(#grad-solar)" />
          <path :d="solarSparkLine" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">Total Yield: <strong>{{ twinStore.state.solar_energy_kwh }} kWh</strong></span>
        <span class="kpi-sub highlight-solar">GHI: {{ twinStore.state.irradiance }} W/m²</span>
      </div>
    </div>

    <!-- 2. Facility Load Demand -->
    <div class="kpi-card glass-card card-accent-load kpi-load">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Facility Load Demand</span>
          <span class="source-badge badge-load">{{ loadSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-load">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 20V10M12 20V4M6 20v-6"></path>
          </svg>
        </div>
      </div>

      <div class="kpi-value-row">
        <div class="num-group">
          <span class="kpi-number text-load tabular-nums">{{ twinStore.state.load_kw }}</span>
          <span class="kpi-unit">kW</span>
        </div>
        <!-- Delta Indicator -->
        <div v-if="loadDelta !== null" class="delta-badge" :class="loadDelta <= 0 ? 'delta-good' : 'delta-warn'">
          <span>{{ loadDelta >= 0 ? '▲ +' : '▼ ' }}{{ Math.abs(loadDelta) }}</span>
        </div>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-load" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#a855f7" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="loadSparkArea" fill="url(#grad-load)" />
          <path :d="loadSparkLine" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">Current: <strong>{{ twinStore.state.current_a }} A</strong></span>
        <span class="kpi-sub highlight-load">₹{{ twinStore.state.instant_cost_rate }}/hr</span>
      </div>
    </div>

    <!-- 3. Utility Grid Import / Export -->
    <div class="kpi-card glass-card card-accent-grid kpi-grid">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Net Grid Exchange</span>
          <span class="source-badge badge-grid">{{ gridSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-grid">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
      </div>

      <div class="kpi-value-row">
        <div class="num-group">
          <span class="kpi-number text-grid tabular-nums">{{ gridDisplayNumber }}</span>
          <span class="kpi-unit">kW</span>
        </div>
        <!-- Delta Indicator -->
        <div v-if="gridDelta !== null" class="delta-badge" :class="gridDelta <= 0 ? 'delta-good' : 'delta-warn'">
          <span>{{ gridDelta >= 0 ? '▲ +' : '▼ ' }}{{ Math.abs(gridDelta) }}</span>
        </div>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-grid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="gridSparkArea" fill="url(#grad-grid)" />
          <path :d="gridSparkLine" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">Import: <strong>{{ twinStore.state.grid_import_energy_kwh }} kWh</strong></span>
        <span class="kpi-sub highlight-grid">₹{{ twinStore.state.electricity_price }}/kWh (TNPDCL)</span>
      </div>
    </div>

    <!-- 4. Electrical Parameters (3-Phase) -->
    <div class="kpi-card glass-card card-accent-grid kpi-elec">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Grid Electricals (3-Phase)</span>
          <span class="source-badge badge-elec">{{ electricalSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-elec">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
      </div>

      <div class="kpi-value-row">
        <div class="num-group">
          <span class="kpi-number text-elec tabular-nums">{{ twinStore.state.voltage_v }}</span>
          <span class="kpi-unit">V</span>
        </div>
        <span class="hz-tag font-mono">{{ twinStore.state.frequency_hz }} Hz</span>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-elec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="voltageSparkArea" fill="url(#grad-elec)" />
          <path :d="voltageSparkLine" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">Freq: <strong>{{ twinStore.state.frequency_hz }} Hz</strong></span>
        <span class="kpi-sub highlight-elec">PF: <strong>{{ twinStore.state.power_factor }}</strong></span>
      </div>
    </div>

    <!-- 5. Battery BMS State (With Smooth Radial Gauge) -->
    <div class="kpi-card glass-card card-accent-battery kpi-battery" :class="{ 'card-dimmed': !twinStore.state.has_battery }">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Battery Storage (BMS)</span>
          <span class="source-badge badge-battery">{{ batterySourceLabel }}</span>
        </div>
        <div class="icon-circle icon-battery">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="1" y="6" width="18" height="12" rx="2"></rect>
            <line x1="23" y1="10" x2="23" y2="14"></line>
          </svg>
        </div>
      </div>

      <div v-if="twinStore.state.has_battery && twinStore.state.soc !== null" class="kpi-value-row soc-row">
        <!-- Enlarged & Smooth Animated SOC Gauge -->
        <div class="soc-radial">
          <svg viewBox="0 0 40 40" class="circular-chart">
            <path class="circle-bg" d="M20 3 a 17 17 0 1 1 0 34 a 17 17 0 1 1 0 -34" />
            <path 
              class="circle" 
              :stroke-dasharray="`${(twinStore.state.soc || 0) * 1.068}, 106.8`" 
              d="M20 3 a 17 17 0 1 1 0 34 a 17 17 0 1 1 0 -34" 
            />
          </svg>
        </div>
        <div>
          <span class="kpi-number text-battery tabular-nums">{{ twinStore.state.soc }}</span>
          <span class="kpi-unit">%</span>
        </div>
        <div v-if="socDelta !== null" class="delta-badge" :class="socDelta >= 0 ? 'delta-good' : 'delta-warn'">
          <span>{{ socDelta >= 0 ? '▲ +' : '▼ ' }}{{ Math.abs(socDelta) }}%</span>
        </div>
      </div>

      <div v-else class="kpi-value-row">
        <span class="kpi-number text-muted">N/A</span>
        <span class="kpi-unit">No BMS</span>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-battery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="socSparkArea" fill="url(#grad-battery)" />
          <path :d="socSparkLine" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">{{ batteryFlowText }}</span>
        <span v-if="twinStore.state.battery_temp" class="kpi-sub highlight-battery">{{ twinStore.state.battery_temp }}°C</span>
      </div>
    </div>

    <!-- 6. Tamil Nadu Weather Conditions -->
    <div class="kpi-card glass-card card-accent-battery kpi-weather">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Weather & Ambient</span>
          <span class="source-badge badge-weather">Open-Meteo & NASA</span>
        </div>
        <div class="icon-circle icon-weather">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
          </svg>
        </div>
      </div>

      <div class="kpi-value-row">
        <div class="num-group">
          <span class="kpi-number text-weather tabular-nums">{{ twinStore.state.ambient_temp }}</span>
          <span class="kpi-unit">°C</span>
        </div>
        <!-- Delta Indicator -->
        <div v-if="tempDelta !== null" class="delta-badge delta-neutral">
          <span>{{ tempDelta >= 0 ? '▲ +' : '▼ ' }}{{ Math.abs(tempDelta) }}°</span>
        </div>
      </div>

      <!-- Sparkline -->
      <div class="sparkline-wrapper">
        <svg viewBox="0 0 100 28" class="sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad-weather" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#eab308" stop-opacity="0.3" />
              <stop offset="100%" stop-color="#eab308" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <path :d="tempSparkArea" fill="url(#grad-weather)" />
          <path :d="tempSparkLine" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" />
        </svg>
      </div>

      <div class="kpi-bottom">
        <span class="kpi-sub">Cloud Cover: <strong>{{ twinStore.state.cloud_cover }}%</strong></span>
        <span class="kpi-sub highlight-weather">{{ twinStore.state.city }}, TN</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulationStore } from '../store/simulationStore.js'

const twinStore = useSimulationStore()

const solarSourceLabel = computed(() => twinStore.state.data_sources?.solar || 'Solar Inverter')
const loadSourceLabel = computed(() => twinStore.state.data_sources?.load || 'Smart Meter')
const gridSourceLabel = computed(() => twinStore.state.data_sources?.grid || 'Smart Meter')
const electricalSourceLabel = computed(() => twinStore.state.data_sources?.electrical || 'Smart Meter')
const batterySourceLabel = computed(() => twinStore.state.data_sources?.battery || 'Battery BMS')

const batteryFlowText = computed(() => {
  if (!twinStore.state.has_battery) return 'No BMS Configured'
  const kw = twinStore.state.battery_kw
  if (kw > 0) return `Discharging ${kw} kW`
  if (kw < 0) return `Charging ${Math.abs(kw)} kW`
  return 'Battery Standby'
})

const gridDisplayNumber = computed(() => {
  if (twinStore.state.is_islanded) return '0.0'
  if (twinStore.state.grid_import_kw > 0) return `+${twinStore.state.grid_import_kw}`
  if (twinStore.state.grid_export_kw > 0) return `-${twinStore.state.grid_export_kw}`
  return '0.0'
})

// ─── SVG Sparkline Generator Helper ───
function buildSparkPaths(values, minVal = null, maxVal = null) {
  if (!values || values.length < 2) {
    return { line: 'M 0 14 L 100 14', area: 'M 0 14 L 100 14 L 100 28 L 0 28 Z' }
  }

  const min = minVal !== null ? minVal : Math.min(...values)
  const max = maxVal !== null ? maxVal : Math.max(...values)
  const range = max - min || 1
  const count = values.length

  const pts = values.map((val, i) => {
    const x = Number(((i / (count - 1)) * 100).toFixed(1))
    const y = Number((26 - ((val - min) / range) * 22).toFixed(1))
    return [x, y]
  })

  const lineStr = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ')
  const areaStr = `${lineStr} L 100 28 L 0 28 Z`

  return { line: lineStr, area: areaStr }
}

const historySteps = computed(() => twinStore.history || [])

// Solar Sparkline & Delta
const solarValues = computed(() => historySteps.value.map(s => s.solar_kw ?? 0))
const solarSpark = computed(() => buildSparkPaths(solarValues.value))
const solarSparkLine = computed(() => solarSpark.value.line)
const solarSparkArea = computed(() => solarSpark.value.area)
const solarDelta = computed(() => {
  const vals = solarValues.value
  if (vals.length < 2) return null
  return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1))
})

// Load Sparkline & Delta
const loadValues = computed(() => historySteps.value.map(s => s.load_kw ?? 0))
const loadSpark = computed(() => buildSparkPaths(loadValues.value))
const loadSparkLine = computed(() => loadSpark.value.line)
const loadSparkArea = computed(() => loadSpark.value.area)
const loadDelta = computed(() => {
  const vals = loadValues.value
  if (vals.length < 2) return null
  return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1))
})

// Grid Sparkline & Delta
const gridValues = computed(() => historySteps.value.map(s => (s.grid_import_kw || 0) - (s.grid_export_kw || 0)))
const gridSpark = computed(() => buildSparkPaths(gridValues.value))
const gridSparkLine = computed(() => gridSpark.value.line)
const gridSparkArea = computed(() => gridSpark.value.area)
const gridDelta = computed(() => {
  const vals = gridValues.value
  if (vals.length < 2) return null
  return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1))
})

// Voltage Sparkline
const voltageValues = computed(() => historySteps.value.map(s => s.voltage_v || 240))
const voltageSpark = computed(() => buildSparkPaths(voltageValues.value, 235, 245))
const voltageSparkLine = computed(() => voltageSpark.value.line)
const voltageSparkArea = computed(() => voltageSpark.value.area)

// Battery SoC Sparkline & Delta
const socValues = computed(() => historySteps.value.map(s => s.soc ?? 65))
const socSpark = computed(() => buildSparkPaths(socValues.value, 15, 95))
const socSparkLine = computed(() => socSpark.value.line)
const socSparkArea = computed(() => socSpark.value.area)
const socDelta = computed(() => {
  const vals = socValues.value
  if (vals.length < 2) return null
  return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1))
})

// Ambient Temp Sparkline & Delta
const tempValues = computed(() => historySteps.value.map(s => s.ambient_temp ?? 32))
const tempSpark = computed(() => buildSparkPaths(tempValues.value, 20, 45))
const tempSparkLine = computed(() => tempSpark.value.line)
const tempSparkArea = computed(() => tempSpark.value.area)
const tempDelta = computed(() => {
  const vals = tempValues.value
  if (vals.length < 2) return null
  return Number((vals[vals.length - 1] - vals[vals.length - 2]).toFixed(1))
})
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.kpi-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
  gap: 10px;
}

.card-dimmed {
  opacity: 0.6;
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.label-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.source-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge-solar { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.badge-load { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.badge-grid { background: rgba(6, 182, 212, 0.15); color: #38bdf8; }
.badge-elec { background: rgba(56, 189, 248, 0.15); color: #7dd3fc; }
.badge-battery { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.badge-weather { background: rgba(234, 179, 8, 0.15); color: #fde047; }

.icon-circle {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-solar { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.icon-load { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.icon-grid { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
.icon-elec { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
.icon-battery { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.icon-weather { background: rgba(234, 179, 8, 0.15); color: #eab308; }

.kpi-value-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.num-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.soc-row {
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.soc-radial {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
}

.circular-chart {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3.6;
}

.circle {
  fill: none;
  stroke-width: 3.6;
  stroke-linecap: round;
  stroke: var(--color-battery);
  transition: stroke-dasharray 0.5s ease-out;
}

.kpi-number {
  font-family: var(--font-heading);
  font-size: 1.85rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}

.kpi-unit {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hz-tag {
  font-size: 0.75rem;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ─── Delta Indicators ─── */
.delta-badge {
  font-size: 0.68rem;
  font-weight: 800;
  font-family: var(--font-mono);
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1.2;
}

.delta-up, .delta-good {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.delta-down, .delta-warn {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.14);
}

.delta-neutral {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
}

/* ─── Inline Sparkline ─── */
.sparkline-wrapper {
  height: 28px;
  width: 100%;
  margin: 2px 0 4px 0;
}

.sparkline-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.kpi-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-muted);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 8px;
}

.highlight-solar { color: #34d399; font-weight: 600; }
.highlight-load { color: #c084fc; font-weight: 600; }
.highlight-grid { color: #38bdf8; font-weight: 600; }
.highlight-elec { color: #7dd3fc; font-weight: 600; }
.highlight-battery { color: #fbbf24; font-weight: 600; }
.highlight-weather { color: #fde047; font-weight: 600; }

.text-solar { color: var(--color-solar); }
.text-load { color: var(--color-load); }
.text-grid { color: var(--color-grid); }
.text-elec { color: #38bdf8; }
.text-battery { color: var(--color-battery); }
.text-weather { color: #eab308; }
</style>
