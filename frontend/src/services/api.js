import axios from 'axios'

const API_BASE = '/api'

export const api = {
  // Real-time Telemetry & History
  getTelemetry: () => axios.get(`${API_BASE}/telemetry/current`),
  getState: () => axios.get(`${API_BASE}/telemetry/current`),
  getHistory: (limit = 60) => axios.get(`${API_BASE}/telemetry/history?limit=${limit}`),
  switchSource: (source) => axios.post(`${API_BASE}/telemetry/source`, { source }),

  // Weather & AI Forecasts
  getWeatherForecast: (lat = null, lon = null) => {
    const query = lat && lon ? `?lat=${lat}&lon=${lon}` : ''
    return axios.get(`${API_BASE}/weather/forecast${query}`)
  },
  getAiForecast: () => axios.get(`${API_BASE}/forecast`),
  getForecast: () => axios.get(`${API_BASE}/forecast`),

  // Optimization & Control (Advisory / Simulation)
  runOptimization: () => axios.post(`${API_BASE}/optimize`),
  setControl: (mode, manual_battery_kw = 0.0, is_islanded = null) =>
    axios.post(`${API_BASE}/twin/control`, { mode, manual_battery_kw, is_islanded }),
  setSpeed: (speed, is_paused = null) =>
    axios.post(`${API_BASE}/twin/speed`, { speed, is_paused }),

  // Scenarios (What-if Simulation)
  runScenario: (scenario_type, params = {}) =>
    axios.post(`${API_BASE}/scenario/run`, { scenario_type, params }),
  resetScenario: () => axios.post(`${API_BASE}/scenario/reset`),

  // Analytics & Settings
  getAnalytics: () => axios.get(`${API_BASE}/analytics`),
  getSettings: () => axios.get(`${API_BASE}/settings`),
  updateSettings: (settings) => axios.put(`${API_BASE}/settings`, settings),
}

export function createTwinWebSocket(onMessage, onError) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  // Primary endpoint /ws/telemetry with fallback to /ws/live
  const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`
  
  let ws = null
  let reconnectTimer = null

  function connect() {
    ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      console.log('[WebSocket] Connected to EcoGrid-Twin Tamil Nadu telemetry stream')
    }
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (err) {
        console.error('[WebSocket] Telemetry parsing error:', err)
      }
    }
    ws.onerror = (err) => {
      console.warn('[WebSocket] Telemetry stream error:', err)
      if (onError) onError(err)
    }
    ws.onclose = () => {
      console.log('[WebSocket] Disconnected, reconnecting in 2s...')
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, 2000)
    }
  }

  connect()

  return {
    close: () => {
      clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }
}
