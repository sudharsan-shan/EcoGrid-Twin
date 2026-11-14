<template>
  <aside class="sidebar glass-card" :class="{ collapsed: collapsed }">
    <!-- Brand / Logo Area -->
    <div class="sidebar-brand">
      <div class="brand-logo-container" :title="'EcoGrid-Twin • ' + twinStore.state.city">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#10b981" stroke="#10b981" />
          </svg>
        </div>
        <div v-show="!collapsed" class="brand-info">
          <div class="brand-title-row">
            <span class="brand-title">EcoGrid<span class="brand-accent">-Twin</span></span>
            <span class="tn-badge">TN</span>
          </div>
          <span class="brand-tag">Tamil Nadu Microgrid</span>
        </div>
      </div>
    </div>

    <!-- Navigation Groups -->
    <nav class="sidebar-nav">
      <!-- 1. MONITOR GROUP -->
      <div class="nav-group">
        <span v-show="!collapsed" class="group-title">Monitor</span>
        <router-link to="/" class="nav-item" active-class="active" title="Overview & Telemetry">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Overview</span>
          <span class="active-indicator"></span>
        </router-link>

        <router-link to="/twin" class="nav-item" active-class="active" title="3D Digital Twin Cutaway">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Digital Twin</span>
          <span class="active-indicator"></span>
        </router-link>

        <router-link to="/analytics" class="nav-item" active-class="active" title="Analytics & Tariffs">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Analytics</span>
          <span class="active-indicator"></span>
        </router-link>
      </div>

      <!-- 2. INTELLIGENCE GROUP -->
      <div class="nav-group">
        <span v-show="!collapsed" class="group-title">Intelligence</span>
        <router-link to="/battery" class="nav-item" active-class="active" title="Battery & PINN Physical Validation">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="6" width="18" height="12" rx="2"></rect>
              <line x1="23" y1="11" x2="23" y2="13"></line>
              <line x1="7" y1="10" x2="7" y2="14"></line>
              <line x1="11" y1="10" x2="11" y2="14"></line>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Battery & PINN</span>
          <span class="active-indicator"></span>
        </router-link>

        <router-link to="/validation" class="nav-item" active-class="active" title="Benchmark Validation (Tables 2-10)">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Validation</span>
          <span class="active-indicator"></span>
        </router-link>
      </div>

      <!-- 3. SYSTEM GROUP -->
      <div class="nav-group">
        <span v-show="!collapsed" class="group-title">System</span>
        <router-link to="/settings" class="nav-item" active-class="active" title="Site & Hardware Configuration">
          <div class="nav-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <span v-show="!collapsed" class="nav-label">Settings</span>
          <span class="active-indicator"></span>
        </router-link>
      </div>
    </nav>

    <!-- Sidebar Footer Site Card -->
    <div class="sidebar-footer">
      <div v-show="!collapsed" class="site-card">
        <div class="site-card-top">
          <div class="site-dot"></div>
          <span class="site-name">{{ twinStore.state.site_name }}</span>
        </div>
        <div class="site-card-sub">
          <span>{{ twinStore.state.city }}, TN</span>
          <span class="mode-pill">{{ currentDispatchModeLabel }}</span>
        </div>
      </div>

      <!-- Collapse Toggle Button -->
      <button 
        class="collapse-btn" 
        @click="$emit('toggle')" 
        :title="collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
        aria-label="Toggle Sidebar Collapse"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline v-if="collapsed" points="9 18 15 12 9 6"></polyline>
          <polyline v-else points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useSimulationStore } from '../store/simulationStore.js'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

defineEmits(['toggle'])

const twinStore = useSimulationStore()

const currentDispatchModeLabel = computed(() => {
  const mode = twinStore.dispatchMode || twinStore.state?.dispatch_mode || 'AUTO_AI'
  if (mode === 'AUTO_AI') return 'AI Optimal'
  if (mode === 'PEAK_SHAVING') return 'Peak Shave'
  if (mode === 'MAX_RENEWABLE') return 'Max Green'
  if (mode === 'ISLANDED') return 'Islanded'
  return mode
})
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  height: calc(100vh - 32px);
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 14px;
  border-radius: var(--radius-xl);
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1),
              padding 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
  padding: 18px 8px;
}

/* ─── Brand ─── */
.sidebar-brand {
  margin-bottom: 24px;
  padding: 0 4px;
}

.brand-logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.logo-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 18px rgba(16, 185, 129, 0.25);
  flex-shrink: 0;
}

.logo-icon svg {
  width: 24px;
  height: 24px;
}

.brand-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.brand-accent {
  color: var(--color-solar);
}

.tn-badge {
  font-size: 0.6rem;
  font-weight: 800;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 1px 5px;
  border-radius: 4px;
}

.brand-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}

/* ─── Navigation Groups ─── */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-title {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  padding: 4px 12px;
  margin-bottom: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.86rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  white-space: nowrap;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 10px 0;
}

.nav-item:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.nav-item.active {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.28);
  box-shadow: 0 0 16px rgba(16, 185, 129, 0.15);
}

.active-indicator {
  display: none;
}

.nav-item.active .active-indicator {
  display: block;
  position: absolute;
  right: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.sidebar.collapsed .nav-item.active .active-indicator {
  display: none;
}

/* ─── Footer Site Card ─── */
.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.site-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.site-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.site-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  flex-shrink: 0;
}

.site-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site-card-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.68rem;
  color: var(--text-muted);
}

.mode-pill {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.62rem;
}

.collapse-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

/* ─── Responsive: Under 900px => Bottom Tab Bar ─── */
@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    bottom: 0;
    top: auto;
    left: 0;
    right: 0;
    width: 100% !important;
    height: 62px;
    flex-direction: row;
    align-items: center;
    padding: 6px 12px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    background: rgba(10, 16, 28, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 1000;
  }

  .sidebar-brand,
  .sidebar-footer,
  .group-title {
    display: none !important;
  }

  .sidebar-nav {
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    width: 100%;
    gap: 4px;
    overflow-x: auto;
  }

  .nav-group {
    flex-direction: row;
    gap: 4px;
  }

  .nav-item {
    flex-direction: column;
    gap: 3px;
    padding: 6px 10px;
    font-size: 0.65rem;
    border-radius: 6px;
  }

  .nav-label {
    display: block !important;
    font-size: 0.62rem;
  }

  .active-indicator {
    display: none !important;
  }
}
</style>
