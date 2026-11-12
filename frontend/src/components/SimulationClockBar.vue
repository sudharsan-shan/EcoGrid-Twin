<template>
  <div class="sim-clock-bar glass-card" :class="{ expanded: showTimelineControls }">
    <!-- Left: Live Telemetry Status & Time Readout & Day Navigator -->
    <div class="clock-left">
      <div class="live-status-pill" title="Continuous Real-Time Telemetry Simulation Active">
        <span class="live-pulse-dot"></span>
        <span class="live-text">LIVE</span>
      </div>

      <!-- Multi-Day Date Navigator -->
      <div class="day-nav-group">
        <button 
          class="day-arrow-btn" 
          :disabled="store.currentDayOffset === 0" 
          @click="store.prevDay" 
          title="Previous Day"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        
        <span class="day-badge" :class="{ 'day-future': store.currentDayOffset > 0 }" title="Current Simulation Day (Click Timeline for Multi-Day Selector)">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          {{ store.currentDayLabel }}
        </span>

        <button 
          class="day-arrow-btn" 
          @click="store.nextDay" 
          title="Advance to Next Day (Tomorrow & Future)"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="time-readout">
        <span class="step-counter">Interval {{ store.currentStep + 1 }}/96</span>
        <span class="time-ist text-solar">{{ currentStep.time }} IST</span>
        <span class="tariff-chip" :class="tariffChipClass">
          {{ currentStep.tariff_band }} (₹{{ currentStep.tariff_rate }}/kWh)
        </span>
      </div>
    </div>

    <!-- Center: Collapsible 24-Hour Scrubber Slider (Revealed on Demand) -->
    <div v-if="showTimelineControls" class="clock-center">
      <div class="step-nav-group">
        <button class="step-btn" @click="store.stepBackward" title="Step -15m (Left Arrow)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <button class="step-btn" @click="store.stepForward" title="Step +15m (Right Arrow)">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="scrubber-track-container">
        <input 
          type="range" 
          min="0" 
          max="95" 
          step="1" 
          :value="store.currentStep" 
          @input="onScrub" 
          class="sim-scrubber"
        />
        <div class="scrubber-band-ticks">
          <span class="tick offpeak">00:00 Off-Peak</span>
          <span class="tick peak">06:00 Peak</span>
          <span class="tick std">09:00 Standard</span>
          <span class="tick peak">18:00 Peak</span>
          <span class="tick offpeak">22:00 Off-Peak</span>
        </div>
      </div>
    </div>

    <!-- Right: Controls, Timeline Toggle, and CSV Export -->
    <div class="clock-right">
      <template v-if="showTimelineControls">
        <!-- Quick Multi-Day Horizon Selector -->
        <div class="day-pills-group" title="Jump to Future Days">
          <button 
            v-for="d in [0, 1, 2, 3, 4, 5, 6]" 
            :key="d" 
            class="day-pill" 
            :class="{ active: store.currentDayOffset === d }" 
            @click="store.setDay(d)"
          >
            {{ d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `+${d}d` }}
          </button>
        </div>

        <!-- Speed Multipliers -->
        <div class="speed-group">
          <button 
            v-for="s in [1, 2, 5, 10]" 
            :key="s" 
            class="speed-pill"
            :class="{ active: store.playSpeed === s }"
            @click="store.setSpeed(s)"
          >
            {{ s }}x
          </button>
        </div>

        <!-- Seed Selector -->
        <div class="seed-input-group" title="Deterministic pseudo-random seed">
          <label>Seed:</label>
          <input 
            type="number" 
            v-model.lazy="localSeed" 
            @change="onSeedChange" 
            class="seed-input" 
            step="1" 
            min="1"
          />
        </div>
      </template>

      <!-- Toggle Timeline Button -->
      <button 
        class="toggle-timeline-btn" 
        :class="{ active: showTimelineControls }" 
        @click="showTimelineControls = !showTimelineControls"
        :title="showTimelineControls ? 'Hide Timeline Scrubber' : 'Inspect 24h Timeline Scrubber'"
      >
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>{{ showTimelineControls ? 'Hide Timeline' : 'Timeline Scrubber' }}</span>
      </button>

      <!-- CSV Export Button -->
      <button class="csv-btn" @click="store.exportSimulationCsv" title="Export all 96 steps to CSV">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <span>CSV</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { useSimulationStore } from '../store/simulationStore.js';

const store = useSimulationStore();
const localSeed = ref(store.seed);
const showTimelineControls = ref(false); // Collapsed by default for a clean, non-intrusive live SCADA view

watch(() => store.seed, (newVal) => {
  localSeed.value = newVal;
});

const currentStep = computed(() => store.currentStepData);

const tariffChipClass = computed(() => {
  const band = currentStep.value.tariff_band;
  if (band === 'PEAK') return 'chip-peak';
  if (band === 'OFFPEAK') return 'chip-offpeak';
  return 'chip-standard';
});

function onScrub(e) {
  store.setStep(Number(e.target.value));
}

function onSeedChange() {
  store.setSeed(localSeed.value);
}

// Global keyboard shortcuts
function handleKeydown(e) {
  if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return;
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    store.stepForward();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    store.stepBackward();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  // Guarantee live simulation is actively advancing automatically
  if (!store.isPlaying || !store.clockTimer) {
    store.play();
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.sim-clock-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 18px;
  margin-bottom: 20px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.22);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.sim-clock-bar.expanded {
  padding: 12px 18px;
}

.clock-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

/* Multi-Day Navigation Styles */
.day-nav-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.35);
  padding: 3px 6px;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
}

.day-arrow-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 4px;
  transition: all 0.15s;
}

.day-arrow-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.day-arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.day-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  font-weight: 700;
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  user-select: none;
  white-space: nowrap;
}

.day-badge.day-future {
  color: #c084fc;
}

.day-pills-group {
  display: inline-flex;
  gap: 3px;
  background: rgba(15, 23, 42, 0.7);
  padding: 2px 4px;
  border-radius: 8px;
  border: 1px solid #334155;
  margin-right: 4px;
}

.day-pill {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.day-pill:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.day-pill.active {
  background: #38bdf8;
  color: #0f172a;
  font-weight: 800;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
}

.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.45);
  padding: 5px 12px;
  border-radius: 8px;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
  user-select: none;
}

.live-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse-live 1.8s infinite ease-in-out;
}

.live-text {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #34d399;
}

@keyframes pulse-live {
  0% {
    transform: scale(0.9);
    opacity: 0.6;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
    box-shadow: 0 0 0 5px rgba(16, 185, 129, 0);
  }
  100% {
    transform: scale(0.9);
    opacity: 0.6;
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.time-readout {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-counter {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

.time-ist {
  font-size: 0.95rem;
  font-weight: 700;
  font-family: monospace;
}

.tariff-chip {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.chip-peak {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.chip-standard {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.chip-offpeak {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

/* Center Scrubber (Shown when expanded) */
.clock-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 580px;
  animation: fadeIn 0.25s ease-out;
}

.step-nav-group {
  display: flex;
  gap: 4px;
}

.step-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}

.step-btn:hover {
  background: #334155;
  color: #fff;
}

.scrubber-track-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sim-scrubber {
  width: 100%;
  accent-color: #38bdf8;
  cursor: pointer;
  height: 6px;
}

.scrubber-band-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.62rem;
  color: #64748b;
  padding: 0 2px;
  user-select: none;
}

.tick.offpeak { color: #10b981; }
.tick.peak { color: #ef4444; }
.tick.std { color: #f59e0b; }

/* Right Controls */
.clock-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.speed-group {
  display: flex;
  background: #1e293b;
  border-radius: 6px;
  padding: 2px;
  border: 1px solid #334155;
}

.speed-pill {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 3px 7px;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.speed-pill:hover {
  color: #fff;
}

.speed-pill.active {
  background: #0284c7;
  color: #fff;
}

.seed-input-group {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  color: #94a3b8;
}

.seed-input {
  width: 48px;
  padding: 3px 5px;
  background: #1e293b;
  border: 1px solid #334155;
  color: #38bdf8;
  font-family: monospace;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  text-align: center;
}

.toggle-timeline-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #94a3b8;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-timeline-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: #38bdf8;
}

.toggle-timeline-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border-color: #38bdf8;
}

.csv-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.csv-btn:hover {
  background: rgba(16, 185, 129, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .sim-clock-bar {
    flex-direction: column;
    align-items: stretch;
  }
  .clock-left, .clock-center, .clock-right {
    justify-content: space-between;
    width: 100%;
    max-width: 100%;
  }
}
</style>
