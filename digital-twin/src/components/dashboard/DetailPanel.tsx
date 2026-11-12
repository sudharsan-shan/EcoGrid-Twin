import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimStore } from '../../store/simStore';
import { ROOM_DEFS } from '../../sim/simulator';

const hLabel = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 === 0.5 ? '30' : '00'}`;

export default function DetailPanel() {
  const selectedId = useSimStore(s => s.selectedId);
  const selectItem = useSimStore(s => s.selectItem);
  const state = useSimStore(s => s.state);

  const content = useMemo(() => {
    if (!selectedId) return null;

    // Battery
    if (selectedId === 'battery') {
      const { battery } = state;
      const chartData = state.history.map(h => ({
        time: hLabel(h.hour),
        SoC: parseFloat((h.batterySoc * 100).toFixed(1)),
        kW: parseFloat(h.battery.toFixed(1)),
      }));
      return {
        title: '🔋 Battery System',
        stats: [
          { label: 'SoC', value: `${(battery.soc * 100).toFixed(1)}%` },
          { label: 'Power', value: `${battery.kw > 0 ? '↑ Charging' : '↓ Discharging'} ${Math.abs(battery.kw).toFixed(1)} kW` },
          { label: 'Capacity', value: `${battery.capacityKwh} kWh` },
          { label: 'Temperature', value: `${battery.tempC.toFixed(1)}°C` },
          { label: 'C-Rate', value: battery.cRate.toFixed(3) },
          { label: 'Status', value: battery.healthy ? '✅ Healthy' : '🚨 Fault' },
        ],
        chartData,
        chartKey: 'SoC',
        chartColor: '#10b981',
      };
    }

    // Inverter
    if (selectedId === 'inverter') {
      const { solar } = state;
      const chartData = state.history.map(h => ({ time: hLabel(h.hour), kW: parseFloat(h.solar.toFixed(1)) }));
      return {
        title: '⚡ Hybrid Inverter',
        stats: [
          { label: 'Solar Output', value: `${solar.kw.toFixed(1)} kW` },
          { label: 'Panel Capacity', value: `${solar.kwpCapacity} kWp` },
          { label: 'Irradiance', value: `${solar.irradiance.toFixed(0)} W/m²` },
          { label: 'Cloud Cover', value: `${solar.cloudCover.toFixed(0)}%` },
          { label: 'Temp Derating', value: `${(solar.tempDerating * 100).toFixed(1)}%` },
        ],
        chartData,
        chartKey: 'kW',
        chartColor: '#f59e0b',
      };
    }

    // EB Panel
    if (selectedId === 'eb_panel') {
      const { grid } = state;
      const chartData = state.history.map(h => ({ time: hLabel(h.hour), kW: parseFloat(h.grid.toFixed(1)) }));
      return {
        title: '🔌 EB Panel / Smart Meter',
        stats: [
          { label: 'Grid Power', value: `${grid.kw > 0 ? 'Import' : 'Export'} ${Math.abs(grid.kw).toFixed(1)} kW` },
          { label: 'Import Today', value: `${grid.cumulativeImportKwh.toFixed(1)} kWh` },
          { label: 'Export Today', value: `${grid.cumulativeExportKwh.toFixed(1)} kWh` },
          { label: 'Tariff', value: `₹${grid.tariffRate.toFixed(2)}/kWh (${grid.tariffBand})` },
          { label: 'Cost Today', value: `₹${grid.costToday.toFixed(0)}` },
        ],
        chartData,
        chartKey: 'kW',
        chartColor: '#f59e0b',
      };
    }

    // Room
    const roomDef = ROOM_DEFS.find(r => r.id === selectedId);
    const roomLoad = state.rooms.find(r => r.roomId === selectedId);
    if (roomDef && roomLoad) {
      const chartData = state.history.map(h => ({ time: hLabel(h.hour), kW: parseFloat(h.load.toFixed(1)) }));
      return {
        title: `🏠 ${roomDef.label}`,
        stats: [
          { label: 'Current Load', value: `${roomLoad.kw.toFixed(1)} kW` },
          { label: 'Appliances', value: `${roomLoad.appliances.filter(a => a.on).length}/${roomLoad.appliances.length} on` },
          ...roomLoad.appliances.map(a => ({
            label: a.name,
            value: `${a.on ? '🟢' : '🔴'} ${a.kw.toFixed(2)} kW`,
          })),
        ],
        chartData,
        chartKey: 'kW',
        chartColor: '#a855f7',
      };
    }

    // Appliance
    for (const room of state.rooms) {
      const app = room.appliances.find(a => a.id === selectedId);
      if (app) {
        const chartData = state.history.map(h => ({ time: hLabel(h.hour), kW: app.on ? parseFloat(app.kw.toFixed(2)) : 0 }));
        return {
          title: `🔧 ${app.name}`,
          stats: [
            { label: 'Status', value: app.on ? '🟢 On' : '🔴 Off' },
            { label: 'Power', value: `${app.kw.toFixed(2)} kW` },
            { label: 'Room', value: app.roomId },
            { label: 'Energy Today', value: `${app.energyTodayKwh.toFixed(2)} kWh` },
          ],
          chartData,
          chartKey: 'kW',
          chartColor: '#60a5fa',
        };
      }
    }

    return null;
  }, [selectedId, state]);

  if (!content) return null;

  return (
    <div className="detail-panel" role="complementary" aria-label="Detail panel">
      <div className="detail-header">
        <h2 className="detail-title">{content.title}</h2>
        <button className="close-btn" onClick={() => selectItem(null)} aria-label="Close detail panel">✕</button>
      </div>

      <div className="detail-stats">
        {content.stats.map((s, i) => (
          <div key={i} className="stat-row">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="detail-chart">
        <p className="chart-title">24h Trend</p>
        <ResponsiveContainer width="100%" height={130}>
          <LineChart data={content.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} interval={11} />
            <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line type="monotone" dataKey={content.chartKey} stroke={content.chartColor} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
