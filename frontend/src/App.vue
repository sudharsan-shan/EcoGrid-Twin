<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isCollapsed }">
    <!-- Left Sidebar (Desktop) / Bottom Tab Bar (Mobile) -->
    <Navbar :collapsed="isCollapsed" @toggle="toggleSidebar" />

    <!-- Main Workspace Container -->
    <div class="main-wrapper">
      <!-- Slim Mission-Control Top Strip -->
      <header class="top-strip glass-card">
        <div class="strip-left">
          <button 
            class="sidebar-toggle-btn" 
            @click="toggleSidebar" 
            :title="isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'"
            aria-label="Toggle Sidebar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div class="header-titles">
            <h1 class="header-page-title">{{ pageTitle }}</h1>
            <span class="header-page-subtitle">{{ pageSubtitle }}</span>
          </div>
        </div>

        <div class="strip-right">
          <!-- Active Source Tag -->
          <div class="source-pill" :class="sourcePillClass" title="Active Telemetry Data Provider">
            <span class="source-tag-label">SOURCE:</span>
            <span>{{ twinStore.state.source_mode }}</span>
          </div>

          <!-- IST Live Clock Readout -->
          <div class="sim-clock" title="Tamil Nadu Local Time (Asia/Kolkata)">
            <span class="clock-label">Time (IST)</span>
            <span class="clock-val">{{ formattedIstTime }}</span>
          </div>

          <!-- Live Freshness Status Badge (SIMULATION | LIVE | DISCONNECTED) -->
          <div class="status-badge" :class="statusBadgeClass" title="Telemetry Feed Heartbeat Status">
            <span class="status-dot"></span>
            <span>{{ statusBadgeText }}</span>
          </div>
        </div>
      </header>

      <!-- Main Page Content with Smooth Transition -->
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Toast Notifications Host -->
    <ToastHost />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import ToastHost from './components/ToastHost.vue'
import { useSimulationStore } from './store/simulationStore.js'

const route = useRoute()
const twinStore = useSimulationStore()

// Sidebar Collapse State with LocalStorage Persistence
const isCollapsed = ref(false)

try {
  const saved = localStorage.getItem('ecogrid_sidebar_collapsed')
  if (saved !== null) {
    isCollapsed.value = saved === 'true'
  }
} catch {
  // Graceful fallback if localStorage is blocked
}

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
  try {
    localStorage.setItem('ecogrid_sidebar_collapsed', String(isCollapsed.value))
  } catch {}
}

// Route Titles & Subtitles
const pageMeta = {
  Home: {
    title: 'Microgrid Overview',
    subtitle: 'Real-time generation, commercial facility load & smart dispatch telemetry'
  },
  DigitalTwin: {
    title: '3D Digital Twin',
    subtitle: 'Interactive spatial facility twin & sub-zone cutaway model'
  },
  Analytics: {
    title: 'Analytics & Benchmarks',
    subtitle: 'Financial savings, TNPDCL tariffs & environmental metrics'
  },
  Battery: {
    title: 'Battery Dynamics & PINN',
    subtitle: 'Thevenin equivalent model & continuous physics consistency evaluation'
  },
  Validation: {
    title: 'Benchmark Validation',
    subtitle: 'Numerical verification against IEEE/Elsevier paper ground truth'
  },
  Settings: {
    title: 'Site & Hardware Settings',
    subtitle: 'Microgrid configuration, TNPDCL tariffs & adapter telemetry'
  }
}

const pageTitle = computed(() => {
  const name = route.name
  return pageMeta[name]?.title || 'EcoGrid-Twin'
})

const pageSubtitle = computed(() => {
  const name = route.name
  return pageMeta[name]?.subtitle || `${twinStore.siteName} • ${twinStore.city}, TN`
})

// Clock & Telemetry Status Logic
const formattedIstTime = computed(() => {
  const ts = twinStore.state?.timestamp
  if (!ts) return '--:--:--'
  try {
    const dt = new Date(ts)
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
    return twinStore.state.source_mode === 'SIMULATION' ? 'SIMULATION' : 'LIVE'
  }
  return 'DISCONNECTED'
})

const sourcePillClass = computed(() => {
  const mode = twinStore.state.source_mode
  if (mode === 'SIMULATION') return 'pill-sim'
  if (mode === 'MODBUS_RTU' || mode === 'MODBUS_TCP') return 'pill-modbus'
  return 'pill-mqtt'
})

// Global Keyboard Shortcuts (Space = Play/Pause, Left/Right = Step 15m)
function handleGlobalKeydown(e) {
  if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return
  if (e.code === 'Space') {
    e.preventDefault()
    twinStore.togglePlay()
  } else if (e.code === 'ArrowRight') {
    e.preventDefault()
    twinStore.stepForward()
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault()
    twinStore.stepBackward()
  }
}

onMounted(() => {
  twinStore.initialize()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  padding: 16px;
  gap: 16px;
  max-width: 1720px;
  margin: 0 auto;
  position: relative;
}

.main-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ─── Top Strip ─── */
.top-strip {
  height: var(--topstrip-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-radius: var(--radius-lg);
  gap: 16px;
  flex-shrink: 0;
}

.strip-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.sidebar-toggle-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.18s ease;
  flex-shrink: 0;
}

.sidebar-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.header-titles {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.header-page-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
  margin: 0;
  white-space: nowrap;
}

.header-page-subtitle {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.source-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-md);
  font-size: 0.72rem;
  font-weight: 700;
  font-family: var(--font-mono);
}

.source-tag-label {
  font-size: 0.62rem;
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
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  text-align: center;
}

.clock-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
  line-height: 1;
}

.clock-val {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-weight: 700;
  color: #38bdf8;
  line-height: 1.2;
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

/* ─── Main Content ─── */
.main-content {
  width: 100%;
}

/* ─── Responsive: Under 900px ─── */
@media (max-width: 900px) {
  .app-layout {
    padding: 10px 10px 76px 10px;
    gap: 10px;
  }

  .sidebar-toggle-btn {
    display: none;
  }

  .top-strip {
    padding: 0 12px;
    height: auto;
    min-height: 56px;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .header-page-title {
    font-size: 1rem;
  }

  .header-page-subtitle {
    display: none;
  }

  .strip-right {
    gap: 8px;
  }

  .source-pill,
  .sim-clock {
    padding: 3px 8px;
  }
}
</style>
