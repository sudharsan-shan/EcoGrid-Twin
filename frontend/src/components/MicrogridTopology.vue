<template>
  <div class="topology-container glass-card">
    <div class="topology-header">
      <div class="header-left">
        <div class="title-row">
          <h3 class="title">Microgrid Telemetry Topology</h3>
          <span class="site-tag">{{ twinStore.state.site_name }} ({{ twinStore.state.city }}, TN)</span>
        </div>
        <span class="subtitle">Live physics-guided power flow synchronization & 3-phase parameters</span>
      </div>
      <div class="header-badges">
        <span class="badge" :class="sourceBadgeClass">{{ twinStore.state.source_mode }}</span>
        <span v-if="twinStore.state.is_islanded" class="badge badge-alert">ISLANDED MICROGRID</span>
        <span v-else class="badge badge-grid">TNPDCL GRID SYNC</span>
      </div>
    </div>

    <!-- Interactive Power Flow Schematic -->
    <div class="schematic-canvas">
      <!-- SVG Animated Circuit Lines & Particles -->
      <svg class="flow-svg" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base Lines -->
        <!-- Solar -> Bus -->
        <path d="M 170 90 L 400 180" stroke="rgba(16, 185, 129, 0.25)" stroke-width="3" stroke-dasharray="6,6" fill="none" />
        <!-- Battery <-> Bus -->
        <path d="M 170 270 L 400 180" stroke="rgba(245, 158, 11, 0.25)" stroke-width="3" stroke-dasharray="6,6" fill="none" />
        <!-- Grid <-> Bus -->
        <path d="M 630 90 L 400 180" stroke="rgba(6, 182, 212, 0.25)" stroke-width="3" stroke-dasharray="6,6" fill="none" />
        <!-- Bus -> Load -->
        <path d="M 400 180 L 630 270" stroke="rgba(168, 85, 247, 0.25)" stroke-width="3" stroke-dasharray="6,6" fill="none" />

        <!-- Animated Flow Particle Lines (Active when power > 0) -->
        <!-- Solar Flow -->
        <path 
          v-if="twinStore.state.solar_kw > 1" 
          d="M 170 90 L 400 180" 
          stroke="#10b981" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />

        <!-- Battery Flow -->
        <path 
          v-if="twinStore.state.battery_kw > 0.5" 
          d="M 170 270 L 400 180" 
          stroke="#f59e0b" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />
        <path 
          v-else-if="twinStore.state.battery_kw < -0.5" 
          d="M 400 180 L 170 270" 
          stroke="#f59e0b" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />

        <!-- Grid Flow -->
        <path 
          v-if="twinStore.state.grid_import_kw > 0.5" 
          d="M 630 90 L 400 180" 
          stroke="#06b6d4" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />
        <path 
          v-else-if="twinStore.state.grid_export_kw > 0.5" 
          d="M 400 180 L 630 90" 
          stroke="#10b981" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />

        <!-- Load Flow -->
        <path 
          v-if="twinStore.state.load_kw > 1" 
          d="M 400 180 L 630 270" 
          stroke="#a855f7" 
          stroke-width="3" 
          fill="none" 
          class="animated-flow"
          filter="url(#glow)"
        />
      </svg>

      <!-- Topology Nodes Overlay -->
      <div class="nodes-wrapper">
        <!-- 1. Solar PV Array Node (Top Left) -->
        <div class="topo-node node-solar">
          <div class="node-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#10b981" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </div>
          <div class="node-info">
            <div class="node-header">
              <span class="node-title">Solar PV Array</span>
              <span class="node-source-tag">{{ solarSourceTag }}</span>
            </div>
            <div class="node-value text-solar">{{ twinStore.state.solar_kw }} <small>kW</small></div>
            <div class="node-meta">
              <span>GHI: {{ twinStore.state.irradiance }} W/m²</span>
              <span>Yield: {{ twinStore.state.solar_energy_kwh }} kWh</span>
            </div>
          </div>
        </div>

        <!-- 2. Battery Storage Node (Bottom Left) -->
        <div class="topo-node node-battery" :class="{ 'node-dimmed': !twinStore.state.has_battery }">
          <div class="node-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#f59e0b" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2"></rect><line x1="23" y1="10" x2="23" y2="14"></line></svg>
          </div>
          <div class="node-info">
            <div class="node-header">
              <span class="node-title">Battery Storage (BESS)</span>
              <span class="node-source-tag">{{ batterySourceTag }}</span>
            </div>
            <div class="node-value text-battery">
              {{ batteryPowerDisplay }} <small>kW</small>
            </div>
            <div class="node-meta">
              <span v-if="twinStore.state.has_battery && twinStore.state.soc !== null">SoC: {{ twinStore.state.soc }}% ({{ twinStore.state.battery_temp }}°C)</span>
              <span v-else>No BMS Connected</span>
            </div>
          </div>
        </div>

        <!-- 3. Central Microgrid Smart Bus (Center) -->
        <div class="topo-node node-central">
          <div class="pulse-ring"></div>
          <div class="central-core">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#38bdf8" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            <span class="central-title">3-PHASE BUS</span>
            <div class="bus-elec-details">
              <span>{{ twinStore.state.voltage_v }}V • {{ twinStore.state.frequency_hz }}Hz</span>
              <span class="text-solar">{{ twinStore.state.self_sufficiency_pct }}% Self-Suff.</span>
            </div>
          </div>
        </div>

        <!-- 4. Utility Grid Node (Top Right) -->
        <div class="topo-node node-grid">
          <div class="node-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#06b6d4" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </div>
          <div class="node-info">
            <div class="node-header">
              <span class="node-title">TNPDCL Utility Grid</span>
              <span class="node-source-tag">{{ gridSourceTag }}</span>
            </div>
            <div class="node-value text-grid">
              {{ gridPowerDisplay }} <small>kW</small>
            </div>
            <div class="node-meta">
              <span>Tariff: ₹{{ twinStore.state.electricity_price }}/kWh</span>
              <span>Import: {{ twinStore.state.grid_import_energy_kwh }} kWh</span>
            </div>
          </div>
        </div>

        <!-- 5. Facility Demand Load Node (Bottom Right) -->
        <div class="topo-node node-load">
          <div class="node-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#a855f7" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <div class="node-info">
            <div class="node-header">
              <span class="node-title">Facility Load Demand</span>
              <span class="node-source-tag">{{ loadSourceTag }}</span>
            </div>
            <div class="node-value text-load">{{ twinStore.state.load_kw }} <small>kW</small></div>
            <div class="node-meta">
              <span>Current: {{ twinStore.state.current_a }} A</span>
              <span>Rate: ₹{{ twinStore.state.instant_cost_rate }}/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTwinStore } from '../store/twinStore'

const twinStore = useTwinStore()

const solarSourceTag = computed(() => twinStore.state.source_mode === 'SIMULATION' ? 'Simulation' : 'Inverter')
const loadSourceTag = computed(() => twinStore.state.source_mode === 'SIMULATION' ? 'Simulation' : 'Smart Meter')
const gridSourceTag = computed(() => twinStore.state.source_mode === 'SIMULATION' ? 'Simulation' : 'Smart Meter')
const batterySourceTag = computed(() => twinStore.state.source_mode === 'SIMULATION' ? 'Simulation' : 'BMS')

const batteryPowerDisplay = computed(() => {
  if (!twinStore.state.has_battery) return '0.0'
  const kw = twinStore.state.battery_kw
  if (kw > 0) return `+${kw} (Discharge)`
  if (kw < 0) return `${kw} (Charge)`
  return `0.0 (Idle)`
})

const gridPowerDisplay = computed(() => {
  if (twinStore.state.is_islanded) return '0.0 (Islanded)'
  if (twinStore.state.grid_import_kw > 0) return `+${twinStore.state.grid_import_kw} (Import)`
  if (twinStore.state.grid_export_kw > 0) return `-${twinStore.state.grid_export_kw} (Export)`
  return '0.0 (Balanced)'
})

const sourceBadgeClass = computed(() => {
  const mode = twinStore.state.source_mode
  if (mode === 'SIMULATION') return 'badge-solar'
  if (mode === 'MODBUS_RTU' || mode === 'MODBUS_TCP') return 'badge-grid'
  return 'badge-battery'
})
</script>

<style scoped>
.topology-container {
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.topology-header {
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

.title {
  font-size: 1.2rem;
  color: var(--text-primary);
}

.site-tag {
  font-size: 0.72rem;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(6, 182, 212, 0.12);
  padding: 2px 8px;
  border-radius: 4px;
}

.subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.header-badges {
  display: flex;
  gap: 8px;
}

.schematic-canvas {
  position: relative;
  height: 380px;
  width: 100%;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.9) 0%, rgba(7, 11, 19, 0.95) 100%);
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.flow-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.animated-flow {
  stroke-dasharray: 8 6;
  animation: dash 1s linear infinite;
}

@keyframes dash {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: 0; }
}

.nodes-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  padding: 20px 36px;
  pointer-events: none;
}

.topo-node {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-width: 255px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.topo-node:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.node-dimmed {
  opacity: 0.6;
}

.node-solar { grid-column: 1; grid-row: 1; align-self: start; }
.node-battery { grid-column: 1; grid-row: 2; align-self: end; }
.node-grid { grid-column: 3; grid-row: 1; align-self: start; justify-self: end; }
.node-load { grid-column: 3; grid-row: 2; align-self: end; justify-self: end; }

.node-central {
  grid-column: 2;
  grid-row: 1 / span 2;
  place-self: center;
  width: 135px;
  height: 135px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0.9) 70%);
  border: 2px solid rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 30px rgba(56, 189, 248, 0.25);
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid rgba(56, 189, 248, 0.5);
  animation: pulse-ring 2.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(0.95); opacity: 0.8; }
  100% { transform: scale(1.4); opacity: 0; }
}

.central-core {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
}

.central-title {
  font-family: var(--font-heading);
  font-size: 0.72rem;
  font-weight: 800;
  color: #38bdf8;
  letter-spacing: 0.05em;
}

.bus-elec-details {
  display: flex;
  flex-direction: column;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.node-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex-grow: 1;
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.node-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.node-source-tag {
  font-size: 0.6rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  padding: 1px 4px;
  border-radius: 3px;
}

.node-value {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  font-weight: 800;
}

.node-value small {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.node-meta {
  display: flex;
  flex-direction: column;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.text-solar { color: var(--color-solar); }
.text-battery { color: var(--color-battery); }
.text-grid { color: var(--color-grid); }
.text-load { color: var(--color-load); }
</style>
