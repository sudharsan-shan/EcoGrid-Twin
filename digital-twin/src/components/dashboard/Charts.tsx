import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useSimStore } from '../../store/simStore';

const fmt = (v: number) => v.toFixed(1);
const hLabel = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 === 0.5 ? '30' : '00'}`;

export function EnergyBalanceChart() {
  const history = useSimStore(s => s.state.history);
  const data = history.map(h => ({
    time: hLabel(h.hour),
    Solar: parseFloat(h.solar.toFixed(1)),
    Load: parseFloat(h.load.toFixed(1)),
    Battery: parseFloat(h.battery.toFixed(1)),
    Grid: parseFloat(h.grid.toFixed(1)),
  }));

  return (
    <div className="chart-card">
      <h3 className="chart-title">⚡ 24-Hour Energy Balance</h3>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="solar-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="load-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval={7} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit="kW" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Area type="monotone" dataKey="Solar" stroke="#f59e0b" fill="url(#solar-grad)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="Load" stroke="#a855f7" fill="url(#load-grad)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Battery" stroke="#2dd4bf" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
          <Line type="monotone" dataKey="Grid" stroke="#94a3b8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BatterySocChart() {
  const history = useSimStore(s => s.state.history);
  const data = history.map(h => ({
    time: hLabel(h.hour),
    SoC: parseFloat((h.batterySoc * 100).toFixed(1)),
  }));

  return (
    <div className="chart-card">
      <h3 className="chart-title">🔋 Battery SoC (%)</h3>
      <ResponsiveContainer width="100%" height={130}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="soc-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval={11} />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} unit="%" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(v: number) => [`${fmt(v)}%`, 'SoC']}
          />
          <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Min', fill: '#ef4444', fontSize: 9 }} />
          <ReferenceLine y={95} stroke="#2dd4bf" strokeDasharray="4 2" label={{ value: 'Max', fill: '#2dd4bf', fontSize: 9 }} />
          <Area type="monotone" dataKey="SoC" stroke="#10b981" fill="url(#soc-grad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TariffChart() {
  const history = useSimStore(s => s.state.history);
  const current = useSimStore(s => s.state.grid);
  const data = history.map(h => ({
    time: hLabel(h.hour),
    Rate: h.tariffRate,
  }));

  const bandColor = current.tariffBand === 'peak' ? '#ef4444' : current.tariffBand === 'offpeak' ? '#22c55e' : '#f59e0b';

  return (
    <div className="chart-card">
      <h3 className="chart-title">
        💰 Tariff: <span style={{ color: bandColor }}>
          {current.tariffBand.toUpperCase()} – ₹{current.tariffRate.toFixed(2)}/kWh
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval={11} />
          <YAxis domain={[4, 11]} tick={{ fill: '#64748b', fontSize: 10 }} unit="₹" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(v: number) => [`₹${v.toFixed(2)}/kWh`, 'Rate']}
          />
          <ReferenceLine y={9.5} stroke="#ef4444" strokeDasharray="3 2" />
          <ReferenceLine y={7.5} stroke="#f59e0b" strokeDasharray="3 2" />
          <ReferenceLine y={5.8} stroke="#22c55e" strokeDasharray="3 2" />
          <Line type="stepAfter" dataKey="Rate" stroke="#e2e8f0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostChart() {
  const history = useSimStore(s => s.state.history);
  const data = history.map(h => ({
    time: hLabel(h.hour),
    'Actual Cost (₹)': parseFloat(h.cost.toFixed(0)),
    'Baseline (₹)': parseFloat((h.load * 0.25 * 7.5).toFixed(0)), // simplified baseline
  }));

  return (
    <div className="chart-card">
      <h3 className="chart-title">📊 Cumulative Cost vs Baseline</h3>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} interval={11} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit="₹" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Line type="monotone" dataKey="Actual Cost (₹)" stroke="#22d3ee" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Baseline (₹)" stroke="#f87171" strokeWidth={2} dot={false} strokeDasharray="5 3" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
