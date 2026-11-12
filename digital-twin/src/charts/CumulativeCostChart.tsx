import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useSimStore } from '../store/simStore';

export const CumulativeCostChart: React.FC = () => {
  const history = useSimStore((s) => s.state.history);

  let runCost = 0;
  let runBaseline = 0;

  const data = history.map((h) => {
    // 15 min step = 0.25h
    const importKwh = Math.max(0, h.grid) * 0.25;
    const baselineKwh = h.load * 0.25;

    runCost += importKwh * h.tariffRate;
    runBaseline += baselineKwh * h.tariffRate;

    return {
      time: `${String(Math.floor(h.stepIndex / 4)).padStart(2, '0')}:${String((h.stepIndex % 4) * 15).padStart(2, '0')}`,
      cost: Number(runCost.toFixed(0)),
      baseline: Number(runBaseline.toFixed(0)),
      saving: Number((runBaseline - runCost).toFixed(0)),
    };
  });

  const latestSaving = data.length > 0 ? data[data.length - 1].saving : 0;

  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <span className="chart-title">Cumulative cost & savings</span>
        <span className="chart-subtitle" style={{ color: 'var(--color-green)' }}>
          +₹{latestSaving.toLocaleString()} saved
        </span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
              formatter={(value: any, name: any) => [
                `₹${value}`,
                name === 'cost' ? 'Optimised Dispatch' : 'No-battery Baseline',
              ]}
            />
            <Line
              type="monotone"
              dataKey="cost"
              name="cost"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="baseline"
              stroke="#64748b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
