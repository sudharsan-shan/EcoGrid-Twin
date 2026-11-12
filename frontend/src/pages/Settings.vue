<template>
  <div class="settings-view">
    <SimulationClockBar />

    <div class="settings-header glass-card">
      <div>
        <h2 class="title">Tamil Nadu Site & Hardware Configuration</h2>
        <span class="subtitle">Configure site geography, TNPDCL electricity tariffs, and read-only telemetry adapters</span>
      </div>
      <div class="header-buttons">
        <button class="btn btn-outline" @click="applyPaperPreset" title="Reset all parameters to IEEE/Elsevier journal paper values">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <span>Paper Preset</span>
        </button>
        <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          <span>{{ saving ? 'Saving...' : 'Save Configuration' }}</span>
        </button>
      </div>
    </div>

    <div v-if="successMsg" class="alert-box alert-success glass-card">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>{{ successMsg }}</span>
    </div>

    <!-- Telemetry Source Switch Banner -->
    <div class="glass-card source-switcher-card">
      <div class="switcher-header">
        <div>
          <h3 class="card-title text-solar">Active Telemetry Source</h3>
          <span class="card-sub">Select whether to run in Tamil Nadu Physics Simulation or connect to real RS485/MQTT hardware</span>
        </div>
        <div class="source-toggle-group">
          <button 
            class="toggle-btn"
            :class="{ active: form.telemetry_source === 'SIMULATION' }"
            @click="form.telemetry_source = 'SIMULATION'"
          >
            Simulation Mode
          </button>
          <button 
            class="toggle-btn"
            :class="{ active: form.telemetry_source === 'MODBUS_RTU' }"
            @click="form.telemetry_source = 'MODBUS_RTU'"
          >
            Live Modbus RTU
          </button>
          <button 
            class="toggle-btn"
            :class="{ active: form.telemetry_source === 'MODBUS_TCP' }"
            @click="form.telemetry_source = 'MODBUS_TCP'"
          >
            Live Modbus TCP
          </button>
          <button 
            class="toggle-btn"
            :class="{ active: form.telemetry_source === 'MQTT' }"
            @click="form.telemetry_source = 'MQTT'"
          >
            Live MQTT
          </button>
        </div>
      </div>
      <div class="read-only-notice">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#38bdf8" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        <span><strong>Strictly Read-Only:</strong> The collector exclusively reads telemetry from smart meters and inverters. No control or write commands are transmitted.</span>
      </div>
    </div>

    <div class="config-grid">
      <!-- 1. Site & Tamil Nadu Geography -->
      <div class="glass-card config-card">
        <h3 class="card-title text-solar">1. Site Location & Geography</h3>
        <span class="card-sub">Tamil Nadu site details and weather coordinates</span>

        <div class="form-group">
          <label>Microgrid Site Name</label>
          <input type="text" v-model="form.site_name" placeholder="e.g. Chennai Industrial Microgrid" />
        </div>

        <div class="form-group">
          <label>Tamil Nadu City</label>
          <select v-model="form.tamilnadu_city" @change="onCityChange">
            <option v-for="city in availableCities" :key="city" :value="city">{{ city }}</option>
          </select>
          <small>Auto-calibrates solar irradiance and weather forecast coordinates</small>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Latitude (°N)</label>
            <input type="number" v-model.number="form.latitude" step="0.0001" />
          </div>
          <div class="form-group">
            <label>Longitude (°E)</label>
            <input type="number" v-model.number="form.longitude" step="0.0001" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Solar PV Capacity (kW)</label>
            <input type="number" v-model.number="form.solar_capacity_kw" step="5" min="1" />
          </div>
          <div class="form-group">
            <label>Battery Capacity (kWh)</label>
            <input type="number" v-model.number="form.battery_capacity_kwh" :disabled="!form.has_battery" step="10" min="0" />
          </div>
        </div>

        <div class="form-row" v-if="form.has_battery">
          <div class="form-group">
            <label>Max Inverter / Battery Power (kW)</label>
            <input type="number" v-model.number="form.battery_max_power_kw" step="5" min="1" />
          </div>
          <div class="form-group">
            <label>Operating SoC Range (%)</label>
            <div style="display: flex; gap: 8px;">
              <input type="number" v-model.number="form.battery_min_soc" placeholder="Min 15%" min="5" max="50" style="width: 50%" />
              <input type="number" v-model.number="form.battery_max_soc" placeholder="Max 95%" min="60" max="100" style="width: 50%" />
            </div>
          </div>
        </div>

        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.has_battery" @change="onBatteryToggle" />
            <span>Battery Energy Storage (BESS) Installed</span>
          </label>
          <small>Uncheck if site is pure Solar PV without a battery storage system</small>
        </div>
      </div>

      <!-- 2. TNPDCL Consumer Category & Electricity Tariffs -->
      <div class="glass-card config-card">
        <h3 class="card-title text-grid">2. TNPDCL Electricity Tariffs (₹ INR)</h3>
        <span class="card-sub">Enter tariff values from your TNPDCL electricity bill</span>

        <div class="form-group">
          <label>TNPDCL Consumer Tariff Category</label>
          <select v-model="form.tnpdcl_category">
            <option value="LT-III-B Commercial">LT-III-B Commercial</option>
            <option value="HT-I-A Industrial">HT-I-A Industrial</option>
            <option value="LT-III-A Industries">LT-III-A Industries (Small/Med)</option>
            <option value="LT-I-A Domestic">LT-I-A Domestic</option>
            <option value="HT-III Commercial">HT-III Commercial & IT</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Standard Rate (₹/kWh)</label>
            <input type="number" v-model.number="form.grid_standard_price" step="0.10" />
            <small>Normal daytime rate</small>
          </div>
          <div class="form-group">
            <label>Peak ToU Rate (₹/kWh)</label>
            <input type="number" v-model.number="form.grid_peak_price" step="0.10" />
            <small>06-09 & 18-21 hrs IST</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Off-Peak Rate (₹/kWh)</label>
            <input type="number" v-model.number="form.grid_offpeak_price" step="0.10" />
            <small>22-05 hrs night rate</small>
          </div>
          <div class="form-group">
            <label>Solar Export Credit (₹/kWh)</label>
            <input type="number" v-model.number="form.grid_feed_in_tariff" step="0.10" />
            <small>Net-metering remuneration</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fixed Charge (₹/month)</label>
            <input type="number" v-model.number="form.grid_fixed_charge" step="10" />
          </div>
          <div class="form-group">
            <label>Demand Charge (₹/kVA/mo)</label>
            <input type="number" v-model.number="form.grid_demand_charge" step="10" />
          </div>
        </div>
      </div>

      <!-- 3. RS485 Modbus RTU / TCP Hardware Settings -->
      <div class="glass-card config-card">
        <h3 class="card-title text-elec">3. RS485 Modbus Settings</h3>
        <span class="card-sub">Smart meter (Schneider, Selec, Elmeasure) & Solar inverter connection</span>

        <div class="form-group">
          <label>Device Register Mapping Profile</label>
          <select v-model="form.modbus_device_profile">
            <option value="schneider_em6400ng">Schneider Electric EM6400NG / Conzerv EM6400</option>
            <option value="selec_mfm383a">Selec MFM383A / MFM384 Multifunction Meter</option>
            <option value="growatt_inverter">Growatt Solar Inverter</option>
            <option value="custom_profile">Custom Register Mapping JSON</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Serial COM Port (Windows)</label>
            <input type="text" v-model="form.modbus_port" placeholder="COM3" />
            <small>e.g. COM3, COM4 or /dev/ttyUSB0</small>
          </div>
          <div class="form-group">
            <label>Baud Rate</label>
            <select v-model.number="form.modbus_baudrate">
              <option :value="4800">4800</option>
              <option :value="9600">9600</option>
              <option :value="19200">19200</option>
              <option :value="38400">38400</option>
              <option :value="115200">115200</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Modbus Slave ID</label>
            <input type="number" v-model.number="form.modbus_slave_id" min="1" max="247" />
          </div>
          <div class="form-group">
            <label>Modbus TCP Host IP</label>
            <input type="text" v-model="form.modbus_tcp_host" placeholder="192.168.1.100" />
          </div>
        </div>
      </div>

      <!-- 4. MQTT Broker Configuration -->
      <div class="glass-card config-card">
        <h3 class="card-title text-load">4. MQTT Gateway Settings</h3>
        <span class="card-sub">Subscribe to Shelly 3EM, ESP32, or IoT gateway telemetry topics</span>

        <div class="form-row">
          <div class="form-group">
            <label>MQTT Broker Host</label>
            <input type="text" v-model="form.mqtt_broker" placeholder="127.0.0.1 or broker.emqx.io" />
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="number" v-model.number="form.mqtt_port" />
          </div>
        </div>

        <div class="form-group">
          <label>Meter Telemetry Topic</label>
          <input type="text" v-model="form.mqtt_topic_meter" placeholder="ecogrid/meter/telemetry" />
        </div>

        <div class="form-group">
          <label>Solar Inverter Topic</label>
          <input type="text" v-model="form.mqtt_topic_inverter" placeholder="ecogrid/solar/inverter" />
        </div>

        <div class="form-group">
          <label>Battery BMS Topic</label>
          <input type="text" v-model="form.mqtt_topic_bms" placeholder="ecogrid/battery/bms" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SimulationClockBar from '../components/SimulationClockBar.vue'
import { api } from '../services/api'
import { useSimulationStore } from '../store/simulationStore.js'
import { PAPER_PRESET } from '../config/sharedConfig.js'

const store = useSimulationStore()

const availableCities = [
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Thanjavur',
  'Tuticorin'
]

const cityCoords = {
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Coimbatore: { lat: 11.0168, lon: 76.9558 },
  Madurai: { lat: 9.9252, lon: 78.1198 },
  Tiruchirappalli: { lat: 10.7905, lon: 78.7047 },
  Salem: { lat: 11.6643, lon: 78.1460 },
  Tirunelveli: { lat: 8.7139, lon: 77.7567 },
  Erode: { lat: 11.3410, lon: 77.7172 },
  Vellore: { lat: 12.9165, lon: 79.1325 },
  Thanjavur: { lat: 10.7870, lon: 79.1378 },
  Tuticorin: { lat: 8.7642, lon: 78.1348 }
}

const form = ref({
  site_name: store.config.site_name,
  tamilnadu_city: store.config.city,
  latitude: store.config.latitude,
  longitude: store.config.longitude,
  timezone: store.config.timezone,
  tnpdcl_category: store.config.tnpdcl_category,
  grid_standard_price: store.config.grid_standard_price,
  grid_peak_price: store.config.grid_peak_price,
  grid_offpeak_price: store.config.grid_offpeak_price,
  grid_feed_in_tariff: store.config.grid_feed_in_tariff,
  grid_fixed_charge: store.config.grid_fixed_charge,
  grid_demand_charge: store.config.grid_demand_charge,
  solar_capacity_kw: store.config.solar_capacity_kw,
  has_battery: store.config.has_battery,
  battery_capacity_kwh: store.config.battery_capacity_kwh,
  battery_max_power_kw: store.config.battery_max_power_kw,
  battery_min_soc: store.config.battery_min_soc,
  battery_max_soc: store.config.battery_max_soc,
  grid_carbon_intensity: store.config.grid_carbon_intensity,
  telemetry_source: store.sourceMode,
  modbus_type: 'RTU',
  modbus_port: 'COM3',
  modbus_baudrate: 9600,
  modbus_slave_id: 1,
  modbus_tcp_host: '192.168.1.100',
  modbus_tcp_port: 502,
  modbus_device_profile: 'schneider_em6400ng',
  mqtt_broker: '127.0.0.1',
  mqtt_port: 1883,
  mqtt_topic_meter: 'ecogrid/meter/telemetry',
  mqtt_topic_inverter: 'ecogrid/solar/inverter',
  mqtt_topic_bms: 'ecogrid/battery/bms'
})

const saving = ref(false)
const successMsg = ref('')

function onCityChange() {
  const city = form.value.tamilnadu_city
  if (city && cityCoords[city]) {
    form.value.latitude = cityCoords[city].lat
    form.value.longitude = cityCoords[city].lon
  }
}

function onBatteryToggle() {
  if (!form.value.has_battery) {
    form.value.battery_capacity_kwh = 0
    form.value.battery_max_power_kw = 0
  } else {
    if (!form.value.battery_capacity_kwh || form.value.battery_capacity_kwh <= 0) {
      form.value.battery_capacity_kwh = 250.0
      form.value.battery_max_power_kw = 60.0
    }
  }
}

function applyPaperPreset() {
  store.applyPaperPreset()
  form.value = {
    ...form.value,
    site_name: PAPER_PRESET.site_name,
    tamilnadu_city: PAPER_PRESET.city,
    latitude: PAPER_PRESET.latitude,
    longitude: PAPER_PRESET.longitude,
    solar_capacity_kw: PAPER_PRESET.solar_capacity_kw,
    has_battery: PAPER_PRESET.has_battery,
    battery_capacity_kwh: PAPER_PRESET.battery_capacity_kwh,
    battery_max_power_kw: PAPER_PRESET.battery_max_power_kw,
    battery_min_soc: PAPER_PRESET.battery_min_soc,
    battery_max_soc: PAPER_PRESET.battery_max_soc,
    grid_peak_price: PAPER_PRESET.grid_peak_price,
    grid_standard_price: PAPER_PRESET.grid_standard_price,
    grid_offpeak_price: PAPER_PRESET.grid_offpeak_price,
    grid_feed_in_tariff: PAPER_PRESET.grid_feed_in_tariff,
    grid_carbon_intensity: PAPER_PRESET.grid_carbon_intensity,
    telemetry_source: 'SIMULATION'
  }
  successMsg.value = 'Paper preset loaded: Chennai 13.08°N 80.27°E, PV 120kWp, BESS 250kWh/60kW, SoC 15-95%, ToU 9.50/7.50/5.80, CO₂ 0.72.'
  setTimeout(() => { successMsg.value = '' }, 4000)
}

async function loadSettings() {
  try {
    const res = await api.getSettings()
    if (res.data) {
      form.value = { ...form.value, ...res.data }
    }
  } catch (err) {
    console.warn('Backend API settings not reached, using shared simulation store config.')
  }
}

async function saveSettings() {
  saving.value = true
  successMsg.value = ''
  try {
    // 1. Update backend if accessible
    try {
      await api.updateSettings(form.value)
    } catch (e) {
      // Backend optional
    }

    // 2. Synchronize shared simulation store
    store.updateConfig({
      site_name: form.value.site_name,
      city: form.value.tamilnadu_city,
      latitude: form.value.latitude,
      longitude: form.value.longitude,
      solar_capacity_kw: form.value.solar_capacity_kw,
      has_battery: form.value.has_battery,
      battery_capacity_kwh: form.value.battery_capacity_kwh,
      battery_max_power_kw: form.value.battery_max_power_kw,
      battery_min_soc: form.value.battery_min_soc,
      battery_max_soc: form.value.battery_max_soc,
      grid_peak_price: form.value.grid_peak_price,
      grid_standard_price: form.value.grid_standard_price,
      grid_offpeak_price: form.value.grid_offpeak_price,
      grid_feed_in_tariff: form.value.grid_feed_in_tariff,
      grid_fixed_charge: form.value.grid_fixed_charge,
      grid_demand_charge: form.value.grid_demand_charge,
      grid_carbon_intensity: form.value.grid_carbon_intensity || 0.72
    })

    store.sourceMode = form.value.telemetry_source

    successMsg.value = `Site configuration saved. All pages updated consistently across simulation!`
    setTimeout(() => {
      successMsg.value = ''
    }, 4000)
  } catch (err) {
    console.error('Failed to save settings:', err)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-header {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-buttons {
  display: flex;
  gap: 12px;
}

.title { font-size: 1.3rem; color: var(--text-primary); }
.subtitle { font-size: 0.8rem; color: var(--text-muted); }

.alert-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 600;
}

.alert-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
}

.source-switcher-card {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.switcher-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.source-toggle-group {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  gap: 4px;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: var(--color-solar);
  color: #070b13;
}

.read-only-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  color: #7dd3fc;
  background: rgba(6, 182, 212, 0.08);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: 20px;
}

.config-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title { font-size: 1.1rem; }
.card-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: -10px; margin-bottom: 4px; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #10b981;
}

.form-group small {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.checkbox-group {
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #10b981;
}

.text-solar { color: var(--color-solar); }
.text-grid { color: var(--color-grid); }
.text-elec { color: #38bdf8; }
.text-load { color: var(--color-load); }
</style>
