import { useSimStore } from '../store/simStore';
import type { TwinData, SensorReading, AlertItem } from '../types';

/**
 * useTwinData Hook
 * 
 * Safely abstracts the simulator / external backend logic.
 * Guarantees every sensor reading adheres strictly to:
 * { id: string, room: string, type: string, value: number, unit: string, timestamp: number }
 * 
 * Can be swapped directly for MQTT / REST data without touching UI components.
 */
export function useTwinData(): TwinData {
  const state = useSimStore((s) => s.state);

  const timestamp = Date.now();
  const step = state.stepIndex;
  const hour = Math.floor(step / 4);
  const minute = (step % 4) * 15;
  const timeFormatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const dateFormatted = 'Tue, 13 Oct';

  // 1. Solar Sensor
  const solarSensor: SensorReading = {
    id: 'sensor-solar-rooftop-kw',
    room: 'Rooftop',
    type: 'solar_power',
    value: Number(state.solar.kw.toFixed(2)),
    unit: 'kW',
    timestamp,
  };

  const solarHistory = state.history.slice(-24).map((h) => h.solar);
  const solarState = {
    sensor: solarSensor,
    kw: state.solar.kw,
    kwpCapacity: state.solar.kwpCapacity,
    cloudCover: state.solar.cloudCover,
    tempDerating: state.solar.tempDerating,
    irradiance: state.solar.irradiance,
    history: solarHistory,
    baselineDelta: Number((state.solar.kw - 0).toFixed(1)), // Solar generated vs 0 baseline
  };

  // 2. Load Sensor (Total building load)
  const totalLoadKw = state.rooms.reduce((acc, r) => acc + r.kw, 0);
  const loadSensor: SensorReading = {
    id: 'sensor-total-load-kw',
    room: 'Building',
    type: 'active_power',
    value: Number(totalLoadKw.toFixed(2)),
    unit: 'kW',
    timestamp,
  };

  const loadHistory = state.history.slice(-24).map((h) => h.load);
  const loadState = {
    sensor: loadSensor,
    kw: totalLoadKw,
    history: loadHistory,
    baselineDelta: 0,
    isHigh: totalLoadKw > 120,
  };

  // 3. Battery Sensor
  const batterySensor: SensorReading = {
    id: 'sensor-battery-storage-kw',
    room: 'Utility Room',
    type: 'battery_flow',
    value: Number(state.battery.kw.toFixed(2)),
    unit: 'kW',
    timestamp,
  };

  const batteryHistory = state.history.slice(-24).map((h) => h.batterySoc * 100);
  const batteryState = {
    sensor: batterySensor,
    kw: state.battery.kw,
    soc: state.battery.soc,
    capacityKwh: state.battery.capacityKwh,
    tempC: state.battery.tempC,
    cRate: state.battery.cRate,
    maxChargeKw: state.battery.maxChargeKw,
    maxDischargeKw: state.battery.maxDischargeKw,
    healthy: state.battery.healthy,
    history: batteryHistory,
    baselineDelta: Number(((state.battery.soc - 0.5) * 100).toFixed(0)),
  };

  // 4. Grid Sensor
  const gridSensor: SensorReading = {
    id: 'sensor-eb-grid-meter-kw',
    room: 'EB Panel',
    type: 'grid_exchange',
    value: Number(state.grid.kw.toFixed(2)),
    unit: 'kW',
    timestamp,
  };

  const gridHistory = state.history.slice(-24).map((h) => h.grid);
  const gridState = {
    sensor: gridSensor,
    kw: state.grid.kw,
    mode: (state.grid.kw > 0.05 ? 'importing' : state.grid.kw < -0.05 ? 'exporting' : 'idle') as 'importing' | 'exporting' | 'idle',
    cumulativeImportKwh: state.grid.cumulativeImportKwh,
    cumulativeExportKwh: state.grid.cumulativeExportKwh,
    costToday: state.grid.costToday,
    tariffBand: state.grid.tariffBand,
    tariffRate: state.grid.tariffRate,
    history: gridHistory,
    baselineDelta: Number((state.grid.kw - totalLoadKw).toFixed(1)),
  };

  // 5. Tariff
  const tariffState = {
    band: state.grid.tariffBand,
    rate: state.grid.tariffRate,
    label: state.grid.tariffBand === 'peak' ? 'Peak' : state.grid.tariffBand === 'offpeak' ? 'Off-peak' : 'Standard',
  };

  // 6. Carbon
  const carbonHistory = state.history.slice(-24).map((h) => h.co2);
  const carbonState = {
    avoidedKg: state.carbon.co2Avoided,
    emittedKg: state.carbon.co2Emitted,
    baselineKg: state.carbon.baselineToday,
    history: carbonHistory,
    baselineDelta: Number(state.carbon.co2Avoided.toFixed(1)),
  };

  // 7. Rooms (each room with typed sensor and appliances)
  const rooms = state.rooms.map((r) => {
    return {
      id: r.roomId,
      room: r.roomId === 'utility' ? 'Utility Room' :
            r.roomId === 'room1' ? 'Room 1' :
            r.roomId === 'room2' ? 'Room 2' :
            r.roomId === 'kitchen' ? 'Kitchen' :
            r.roomId === 'mainhall' ? 'Main Hall' : 'Office',
      kw: r.kw,
      energyTodayKwh: Number((r.kw * 0.25 * (step + 1)).toFixed(1)),
      appliances: r.appliances,
      isHigh: r.kw > 25,
    };
  });

  // 8. Alerts
  const alerts: AlertItem[] = [];
  if (state.battery.soc < 0.2) {
    alerts.push({
      id: 'alert-soc-low',
      title: 'Low battery SoC',
      message: `Battery storage at ${(state.battery.soc * 100).toFixed(0)}% (limit 15%)`,
      severity: state.battery.soc < 0.16 ? 'critical' : 'warning',
      timestamp: timeFormatted,
      targetId: 'battery',
      active: true,
    });
  }
  if (state.battery.tempC > 45) {
    alerts.push({
      id: 'alert-temp-high',
      title: 'High battery temperature',
      message: `Cell temperature at ${state.battery.tempC.toFixed(1)}°C (limit 45°C)`,
      severity: 'critical',
      timestamp: timeFormatted,
      targetId: 'battery',
      active: true,
    });
  }
  if (totalLoadKw > 120) {
    alerts.push({
      id: 'alert-load-high',
      title: 'High building load',
      message: `Aggregate load is ${totalLoadKw.toFixed(1)} kW (threshold 120 kW)`,
      severity: 'warning',
      timestamp: timeFormatted,
      targetId: 'building',
      active: true,
    });
  }

  return {
    clock: {
      date: dateFormatted,
      time: timeFormatted,
      stepIndex: state.stepIndex,
      totalSteps: 96,
      playing: state.playing,
      speedMultiplier: state.speedMultiplier,
    },
    solar: solarState,
    load: loadState,
    battery: batteryState,
    grid: gridState,
    tariff: tariffState,
    carbon: carbonState,
    rooms,
    alerts,
    scenario: state.scenario,
  };
}
