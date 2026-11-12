<template>
  <header class="navbar glass-card">
    <div class="nav-brand">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#10b981" stroke="#10b981" />
        </svg>
      </div>
      <div class="brand-text">
        <div class="brand-title-row">
          <span class="brand-title">EcoGrid<span class="brand-accent">-Twin</span></span>
          <span class="tn-badge">Tamil Nadu</span>
        </div>
        <span class="brand-tag">{{ twinStore.state.site_name }} • {{ twinStore.state.city }}, TN</span>
      </div>
    </div>

    <nav class="nav-links">
      <router-link to="/" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span>Overview</span>
      </router-link>
      <router-link to="/twin" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <span>Digital Twin</span>
      </router-link>
      <router-link to="/analytics" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
        <span>Analytics</span>
      </router-link>
      <router-link to="/battery" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2"></rect><line x1="23" y1="11" x2="23" y2="13"></line><line x1="7" y1="10" x2="7" y2="14"></line><line x1="11" y1="10" x2="11" y2="14"></line></svg>
        <span>Battery & PINN</span>
      </router-link>
      <router-link to="/validation" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>Validation</span>
      </router-link>
      <router-link to="/settings" class="nav-link" active-class="active">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        <span>Settings</span>
      </router-link>
    </nav>

    <!-- Telemetry & Status Controls -->
    <div class="nav-controls">
      <!-- Active Source Tag -->
      <div class="source-pill" :class="sourcePillClass">
        <span class="source-tag-label">SOURCE:</span>
        <span>{{ twinStore.state.source_mode }}</span>
      </div>

      <!-- IST Time Display -->
      <div class="sim-clock">
        <span class="clock-label">Time (IST)</span>
        <span class="clock-val">{{ formattedIstTime }}</span>
      </div>

      <!-- Live Freshness Status Badge -->
      <div class="status-badge" :class="statusBadgeClass">
        <span class="status-dot"></span>
        <span>{{ statusBadgeText }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useTwinStore } from '../store/twinStore'

const twinStore = useTwinStore()

const formattedIstTime = computed(() => {
  if (!twinStore.state?.timestamp) return '--:--:--'
  try {
    const dt = new Date(twinStore.state.timestamp)
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '--:--:--'
  }
})

const isFresh = computed(() => twinStore.isFreshData)

const statusBadgeClass = computed(() => {
  if (isFresh.value) return 'online'
  return 'offline'
})

const statusBadgeText = computed(() => {
  if (isFresh.value) {
    return twinStore.state.source_mode === 'SIMULATION' ? 'SIMULATION (LIVE)' : 'HARDWARE LIVE'
  }
  return 'DISCONNECTED'
})

const sourcePillClass = computed(() => {
  const mode = twinStore.state.source_mode
  if (mode === 'SIMULATION') return 'pill-sim'
  if (mode === 'MODBUS_RTU' || mode === 'MODBUS_TCP') return 'pill-modbus'
  return 'pill-mqtt'
})
</script>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  margin-bottom: 24px;
  border-radius: var(--radius-lg);
  gap: 16px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.2);
}

.logo-icon svg {
  width: 26px;
  height: 26px;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.brand-accent {
  color: var(--color-solar);
}

.tn-badge {
  font-size: 0.65rem;
  font-weight: 700;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 1px 6px;
  border-radius: 999px;
  text-transform: uppercase;
}

.brand-tag {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link.active {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.source-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.source-tag-label {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.pill-sim {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.pill-modbus {
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #38bdf8;
}

.pill-mqtt {
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.3);
  color: #c084fc;
}

.sim-clock {
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  text-align: center;
}

.clock-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

.clock-val {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: #38bdf8;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.status-badge.offline {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.status-badge.offline .status-dot {
  background: #ef4444;
  box-shadow: 0 0 10px #ef4444;
}
</style>
