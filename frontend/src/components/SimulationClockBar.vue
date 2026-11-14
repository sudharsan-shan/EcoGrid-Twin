<template>
  <div class="sim-clock-bar glass-card" :class="{ expanded: showTimelineControls }">
    <!-- Main Floating Control Row -->
    <div class="clock-primary-row">
      <!-- Left: Play/Pause, Step Navigation & Time Readout -->
      <div class="clock-left">
        <!-- Live Play / Pause Button with Space Shortcut -->
        <button 
          class="play-toggle-btn"
          :class="{ playing: store.isPlaying }"
          @click="store.togglePlay"
          :title="store.isPlaying ? 'Pause Simulation [Space]' : 'Play Simulation [Space]'"
          aria-label="Toggle Simulation Play Pause"
        >
          <!-- Pause Icon -->
          <svg v-if="store.isPlaying" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
          <!-- Play Icon -->
          <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span class="btn-text-label">{{ store.isPlaying ? 'LIVE' : 'PAUSED' }}</span>
        </button>

        <!-- Multi-Day Date Navigator -->
        <div class="day-nav-group">
          <button 
            class="day-arrow-btn" 
            :disabled="store.currentDayOffset === 0" 
            @click="store.prevDay" 
            title="Previous Day"
            aria-label="Previous Day"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          
          <span class="day-badge" :class="{ 'day-future': store.currentDayOffset > 0 }" title="Current Simulation Day (Click Timeline for Multi-Day Horizon)">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            {{ store.currentDayLabel }}
          </span>

          <button 
            class="day-arrow-btn" 
            @click="store.nextDay" 
            title="Advance to Next Day"
            aria-label="Advance Next Day"
          >
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <!-- 15-Minute Step Back / Forward -->
        <div class="step-nav-group">
          <button class="step-btn" @click="store.stepBackward" title="Step -15m [← Left Arrow]" aria-label="Step Backward 15 Minutes">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span class="step-btn-tag">-15m</span>
          </button>
          <button class="step-btn" @click="store.stepForward" title="Step +15m [→ Right Arrow]" aria-label="Step Forward 15 Minutes">
            <span class="step-btn-tag">+15m</span>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <!-- Telemetry Time & Tariff Readout -->
        <div class="time-readout">
          <span class="step-counter">Interval {{ store.currentStep + 1 }}/96</span>
          <span class="time-ist text-solar font-mono">{{ currentStep.time }} IST</span>
          <span class="tariff-chip" :class="tariffChipClass">
            {{ currentStep.tariff_band }} (₹{{ currentStep.tariff_rate }}/kWh)
          </span>
        </div>
      </div>

      <!-- Right: Speed, Seed, Timeline Toggle & CSV -->
      <div class="clock-right">
        <!-- Speed Multipliers -->
        <div class="speed-group" title="Simulation Speed Multiplier">
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
        <div class="seed-input-group" title="Deterministic PRNG Seed">
          <span class="seed-label">Seed:</span>
          <input 
            type="number" 
            v-model.lazy="localSeed" 
            @change="onSeedChange" 
            class="seed-input font-mono" 
            step="1" 
            min="1"
            aria-label="Simulation Seed"
          />
        </div>

        <!-- Toggle Timeline Scrubber Button -->
        <button 
          class="toggle-timeline-btn" 
          :class="{ active: showTimelineControls }" 
          @click="showTimelineControls = !showTimelineControls"
          :title="showTimelineControls ? 'Collapse Timeline Scrubber' : 'Expand 24h Timeline Scrubber'"
          aria-label="Toggle 24 Hour Timeline Scrubber"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>{{ showTimelineControls ? 'Hide Scrubber' : 'Timeline' }}</span>
        </button>

        <!-- CSV Export Button -->
        <button class="csv-btn btn btn-outline btn-sm" @click="store.exportSimulationCsv" title="Export 96-Step Telemetry CSV" aria-label="Export Simulation CSV">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>CSV</span>
        </button>
      </div>
    </div>

    <!-- Collapsible 24-Hour Scrubber & 7-Day Multi-Day Horizon Tray -->
    <div v-if="showTimelineControls" class="timeline-expanded-tray">
      <!-- 7-Day Multi-Day Horizon Selector -->
      <div class="multiday-horizon-row">
        <span class="horizon-label">7-DAY FORECAST HORIZON:</span>
        <div class="day-pills-group" title="Jump to Future Day (Powered by Trained LSTM & NASA Climate Data)">
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
      </div>

      <!-- 24-Hour Continuous Scrubber Slider -->
      <div class="scrubber-track-container">
        <input 
          type="range" 
          min="0" 
          max="95" 
          step="1" 
          :value="store.currentStep" 
          @input="onScrub" 
          class="sim-scrubber"
          aria-label="24-Hour Timeline Scrubber"
        />
        <div class="scrubber-band-ticks">
          <span class="tick offpeak">00:00 Off-Peak (₹5.80)</span>
          <span class="tick peak">06:00 Peak (₹9.50)</span>
          <span class="tick std">09:00 Standard (₹7.50)</span>
          <span class="tick peak">18:00 Peak (₹9.50)</span>
          <span class="tick offpeak">22:00 Off-Peak (₹5.80)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useSimulationStore } from '../store/simulationStore.js'

const store = useSimulationStore()
const localSeed = ref(store.seed)
const showTimelineControls = ref(false)

watch(() => store.seed, (newVal) => {
  localSeed.value = newVal
})

const currentStep = computed(() => store.currentStepData)

const tariffChipClass = computed(() => {
  const band = currentStep.value.tariff_band
  if (band === 'PEAK') return 'chip-peak'
  if (band === 'OFFPEAK') return 'chip-offpeak'
  return 'chip-standard'
})

function onScrub(e) {
  store.setStep(Number(e.target.value))
}

function onSeedChange() {
  store.setSeed(localSeed.value)
}
</script>

<style scoped>
.sim-clock-bar {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  margin-bottom: 16px;
  border-radius: var(--radius-lg);
  gap: 12px;
  background: rgba(11, 19, 34, 0.85);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
}

.clock-primary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.clock-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ─── Play / Pause Button ─── */
.play-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s ease;
}

.play-toggle-btn.playing {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.35);
  color: #34d399;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.2);
}

.play-toggle-btn:hover {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.btn-text-label {
  letter-spacing: 0.05em;
}

/* ─── Day Navigator ─── */
.day-nav-group {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.35);
  padding: 3px 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.day-arrow-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.day-arrow-btn:hover:not(:disabled) {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

.day-arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.day-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-primary);
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.day-badge.day-future {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

/* ─── Step Navigator ─── */
.step-nav-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.step-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: var(--radius-xs);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.step-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.step-btn-tag {
  font-family: var(--font-mono);
}

/* ─── Time & Tariff Readout ─── */
.time-readout {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step-counter {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 600;
}

.time-ist {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-solar);
  background: rgba(16, 185, 129, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.tariff-chip {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  letter-spacing: 0.03em;
}

.chip-peak {
  background: rgba(239, 68, 68, 0.16);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.chip-standard {
  background: rgba(6, 182, 212, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(6, 182, 212, 0.3);
}

.chip-offpeak {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* ─── Right Controls ─── */
.clock-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.speed-group {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 2px;
}

.speed-pill {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.speed-pill:hover {
  color: var(--text-primary);
}

.speed-pill.active {
  background: var(--color-solar);
  color: #060911;
  font-weight: 800;
}

.seed-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
  padding: 3px 8px;
  border-radius: var(--radius-sm);
}

.seed-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 700;
}

.seed-input {
  width: 52px;
  padding: 2px 4px !important;
  font-size: 0.72rem;
  background: transparent !important;
  border: none !important;
  color: var(--text-primary);
  text-align: center;
}

.seed-input:focus {
  box-shadow: none !important;
}

.toggle-timeline-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s;
}

.toggle-timeline-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.toggle-timeline-btn.active {
  background: rgba(56, 189, 248, 0.14);
  border-color: rgba(56, 189, 248, 0.35);
  color: #38bdf8;
}

.csv-btn {
  padding: 6px 12px;
  font-size: 0.75rem;
}

/* ─── Expanded Timeline Tray ─── */
.timeline-expanded-tray {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.multiday-horizon-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.horizon-label {
  font-size: 0.66rem;
  font-weight: 800;
  color: var(--text-dim);
  letter-spacing: 0.06em;
}

.day-pills-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.day-pill {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-pill:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.day-pill.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
}

.scrubber-track-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sim-scrubber {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.scrubber-band-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.64rem;
  color: var(--text-muted);
}

.tick.peak { color: #f87171; font-weight: 700; }
.tick.std { color: #38bdf8; font-weight: 700; }
.tick.offpeak { color: #34d399; font-weight: 700; }
</style>
