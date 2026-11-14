<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast" tag="div" class="toast-list">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        class="toast-item glass-card"
        :class="`toast-${toast.type}`"
        role="alert"
      >
        <div class="toast-indicator"></div>
        <div class="toast-icon">
          <!-- Success -->
          <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#10b981" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <!-- Warning -->
          <svg v-else-if="toast.type === 'warning'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#f59e0b" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <!-- Danger -->
          <svg v-else-if="toast.type === 'danger'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ef4444" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <!-- Info -->
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div v-if="toast.message" class="toast-message">{{ toast.message }}</div>
        </div>

        <button class="toast-close" @click="removeToast(toast.id)" aria-label="Close Notification">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSimulationStore } from '../store/simulationStore.js'

const store = useSimulationStore()
const toasts = ref([])
let nextId = 1

function addToast({ title, message, type = 'info', duration = 4000 }) {
  const id = nextId++
  const toast = { id, title, message, type }
  toasts.value.push(toast)

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

function removeToast(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx !== -1) {
    toasts.value.splice(idx, 1)
  }
}

// 1. Watch active scenario changes
watch(() => store.activeScenario, (newScen, oldScen) => {
  if (!newScen || newScen === oldScen) return
  if (newScen === 'NORMAL') {
    addToast({
      title: 'Baseline Scenario Restored',
      message: 'Operating conditions returned to standard Chennai clear sky profile.',
      type: 'success'
    })
  } else {
    const map = {
      'CLOUDY_90': 'Severe Cloud Cover (90% attenuation) applied',
      'LOAD_SURGE_1_9X': 'Industrial Peak Load Surge (1.9x) injected',
      'BATTERY_FAILURE': 'BESS Emergency Outage Subsystem trip simulated'
    }
    addToast({
      title: `Scenario Active: ${newScen}`,
      message: map[newScen] || 'Dynamic microgrid condition injected.',
      type: 'warning'
    })
  }
})

// 2. Watch Battery Temperature
let tempAlertFired = false
watch(() => store.currentStepData?.battery_temp, (temp) => {
  if (temp >= 55) {
    addToast({
      title: 'Emergency Battery Over-Temperature',
      message: `Cell temperature at ${temp}°C! Emergency cut-off triggered by safety guardrail.`,
      type: 'danger'
    })
  } else if (temp >= 45 && !tempAlertFired) {
    tempAlertFired = true
    addToast({
      title: 'Battery Thermal Warning',
      message: `Pack temperature reached ${temp}°C (approaching 45°C caution limit).`,
      type: 'warning'
    })
    setTimeout(() => { tempAlertFired = false }, 10000)
  }
})

// 3. Watch Guardrail Interventions
let lastInterventionCount = 0
watch(() => store.guardrailEvents?.length || 0, (count) => {
  if (count > lastInterventionCount) {
    const lastEvent = store.guardrailEvents[store.guardrailEvents.length - 1]
    addToast({
      title: 'Guardrail Intervention',
      message: lastEvent?.reason || 'Setpoint projected back to physical boundaries.',
      type: 'warning'
    })
  }
  lastInterventionCount = count
})

// 4. Watch Connection / Data Freshness Status
watch(() => store.isFreshData, (isFresh, wasFresh) => {
  if (wasFresh !== undefined && isFresh !== wasFresh) {
    if (isFresh) {
      addToast({
        title: 'Telemetry Connected',
        message: 'Synchronized with active telemetry stream.',
        type: 'success'
      })
    } else {
      addToast({
        title: 'Telemetry Disconnected',
        message: 'Data feed lost or stalled.',
        type: 'danger'
      })
    }
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
  max-width: 380px;
  width: calc(100vw - 48px);
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(13, 20, 36, 0.94);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  position: relative;
  overflow: hidden;
}

.toast-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.toast-info .toast-indicator { background: var(--color-elec); }
.toast-success .toast-indicator { background: var(--color-solar); }
.toast-warning .toast-indicator { background: var(--color-battery); }
.toast-danger .toast-indicator { background: var(--color-danger); }

.toast-icon {
  margin-top: 1px;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.3;
}

.toast-message {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 2px;
  line-height: 1.35;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.toast-close:hover {
  color: var(--text-primary);
}

/* Animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}
</style>

