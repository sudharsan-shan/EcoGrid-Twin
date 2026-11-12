import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useSimStore } from '../store/simStore';

export const EnergyBalanceChart: React.FC = () => {
  const history = useSimStore((s) => s.state.history);
  const currentStep = useSimStore((s) => s.state.stepIndex);

  const data = history.map((h) => ({
    time: `${String(Math.floor(h.stepIndex / 4)).padStart(2, '0')}:${String((h.stepIndex % 4) * 15).padStart(2, '0')}`,
    step: h.stepIndex,
    solar: Number(h.solar.toFixed(1)),
    load: Number(h.load.toFixed(1)),
    battery: Number(h.battery.toFixed(1)),
    grid: Number(h.grid.toFixed(1)),
  }));

  const currentHourFormatted = `${String(Math.floor(currentStep / 4)).padStart(2, '0')}:${String((currentStep % 4) * 15).padStart(2, '0')}`;

  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <span className="chart-title">24-hour energy balance</span>
        <span className="chart-subtitle">kW profile</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              interval={15}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            />
            <ReferenceLine
              x={currentHourFormatted}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: 'Now', position: 'top', fill: '#ef4444', fontSize: 10 }}
            />
            <Area type="monotone" dataKey="solar" name="Solar" stroke="#14b8a6" fill="url(#solarGrad)" strokeWidth={1.5} />
            <Area type="monotone" dataKey="load" name="Load" stroke="#a855f7" fill="url(#loadGrad)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
