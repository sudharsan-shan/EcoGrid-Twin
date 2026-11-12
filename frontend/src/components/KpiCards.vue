<template>
  <div class="kpi-grid">
    <!-- 1. Solar Generation Power & Energy -->
    <div class="kpi-card glass-card kpi-solar">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Solar PV Generation</span>
          <span class="source-badge badge-solar">{{ solarSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-solar">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-number text-solar">{{ twinStore.state.solar_kw }}</span>
        <span class="kpi-unit">kW</span>
      </div>
      <div class="kpi-bottom">
        <span class="kpi-sub">Total Yield: <strong>{{ twinStore.state.solar_energy_kwh }} kWh</strong></span>
        <span class="kpi-sub highlight-solar">GHI: {{ twinStore.state.irradiance }} W/m²</span>
      </div>
    </div>

    <!-- 2. Facility Load Demand -->
    <div class="kpi-card glass-card kpi-load">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Facility Load Demand</span>
          <span class="source-badge badge-load">{{ loadSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-load">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 20V10M12 20V4M6 20v-6"></path></svg>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-number text-load">{{ twinStore.state.load_kw }}</span>
        <span class="kpi-unit">kW</span>
      </div>
      <div class="kpi-bottom">
        <span class="kpi-sub">Current: <strong>{{ twinStore.state.current_a }} A</strong></span>
        <span class="kpi-sub highlight-load">₹{{ twinStore.state.instant_cost_rate }}/hr</span>
      </div>
    </div>

    <!-- 3. Utility Grid Import / Export -->
    <div class="kpi-card glass-card kpi-grid">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Net Grid Exchange</span>
          <span class="source-badge badge-grid">{{ gridSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-grid">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-number text-grid">{{ gridDisplayNumber }}</span>
        <span class="kpi-unit">kW</span>
      </div>
      <div class="kpi-bottom">
        <span class="kpi-sub">Import: <strong>{{ twinStore.state.grid_import_energy_kwh }} kWh</strong></span>
        <span class="kpi-sub highlight-grid">₹{{ twinStore.state.electricity_price }}/kWh (TNPDCL)</span>
      </div>
    </div>

    <!-- 4. Electrical Parameters (3-Phase) -->
    <div class="kpi-card glass-card kpi-elec">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Grid Electricals (3-Phase)</span>
          <span class="source-badge badge-elec">{{ electricalSourceLabel }}</span>
        </div>
        <div class="icon-circle icon-elec">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-number text-elec">{{ twinStore.state.voltage_v }}</span>
        <span class="kpi-unit">V</span>
      </div>
      <div class="kpi-bottom">
        <span class="kpi-sub">Freq: <strong>{{ twinStore.state.frequency_hz }} Hz</strong></span>
        <span class="kpi-sub highlight-elec">PF: <strong>{{ twinStore.state.power_factor }}</strong></span>
      </div>
    </div>

    <!-- 5. Battery BMS State (Conditional) -->
    <div class="kpi-card glass-card kpi-battery" :class="{ 'card-dimmed': !twinStore.state.has_battery }">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Battery Storage (BMS)</span>
          <span class="source-badge badge-battery">{{ batterySourceLabel }}</span>
        </div>
        <div class="icon-circle icon-battery">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="6" width="18" height="12" rx="2"></rect><line x1="23" y1="10" x2="23" y2="14"></line></svg>
        </div>
      </div>
      <div v-if="twinStore.state.has_battery && twinStore.state.soc !== null" class="kpi-value-row soc-row">
        <div class="soc-radial">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" :stroke-dasharray="`${twinStore.state.soc || 0}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
        </div>
        <div>
          <span class="kpi-number text-battery">{{ twinStore.state.soc }}</span>
          <span class="kpi-unit">%</span>
        </div>
      </div>
      <div v-else class="kpi-value-row">
        <span class="kpi-number text-muted">N/A</span>
        <span class="kpi-unit">No BMS</span>
      </div>
      <div class="kpi-bottom">
        <span class="kpi-sub">{{ batteryFlowText }}</span>
        <span v-if="twinStore.state.battery_temp" class="kpi-sub highlight-battery">{{ twinStore.state.battery_temp }}°C</span>
      </div>
    </div>

    <!-- 6. Tamil Nadu Weather Conditions -->
    <div class="kpi-card glass-card kpi-weather">
      <div class="kpi-top">
        <div class="label-group">
          <span class="kpi-label">Weather & Ambient</span>
          <span class="source-badge badge-weather">Weather Forecast</span>
        </div>
        <div class="icon-circle icon-weather">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
        </div>
      </div>
      <div class="kpi-value-row">
        <span class="kpi-number text-weather">{{ twinStore.state.ambient_temp }}</span>
        <span class="kpi-unit">°C</span>
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
import { useTwinStore } from '../store/twinStore'

const twinStore = useTwinStore()

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
</script>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.kpi-card {
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
}

.kpi-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
}

.kpi-solar::before { background: var(--color-solar); }
.kpi-load::before { background: var(--color-load); }
.kpi-grid::before { background: var(--color-grid); }
.kpi-elec::before { background: #38bdf8; }
.kpi-battery::before { background: var(--color-battery); }
.kpi-weather::before { background: #eab308; }

.card-dimmed {
  opacity: 0.65;
}

.kpi-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kpi-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.source-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
  text-transform: uppercase;
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
  gap: 6px;
  margin-bottom: 10px;
}

.soc-row {
  align-items: center;
  gap: 12px;
}

.soc-radial {
  width: 40px;
  height: 40px;
}

.circular-chart {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.circle-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3.8;
}

.circle {
  fill: none;
  stroke-width: 3.8;
  stroke-linecap: round;
  stroke: var(--color-battery);
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
