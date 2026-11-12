import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useSimStore } from '../store/simStore';

export const BatterySocChart: React.FC = () => {
  const history = useSimStore((s) => s.state.history);
  const currentStep = useSimStore((s) => s.state.stepIndex);

  const data = history.map((h) => ({
    time: `${String(Math.floor(h.stepIndex / 4)).padStart(2, '0')}:${String((h.stepIndex % 4) * 15).padStart(2, '0')}`,
    soc: Number((h.batterySoc * 100).toFixed(1)),
  }));

  const currentHourFormatted = `${String(Math.floor(currentStep / 4)).padStart(2, '0')}:${String((currentStep % 4) * 15).padStart(2, '0')}`;

  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <span className="chart-title">Battery SoC over time</span>
        <span className="chart-subtitle">15% - 95% operating limits</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="time"
              interval={15}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[15, 50, 95]}
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
              formatter={(value: any) => [`${value}%`, 'State of charge']}
            />
            {/* 15% lower limit */}
            <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '15% min', position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }} />
            {/* 95% upper limit */}
            <ReferenceLine y={95} stroke="#10b981" strokeDasharray="3 3" label={{ value: '95% max', position: 'insideTopLeft', fill: '#10b981', fontSize: 10 }} />
            {/* Now line */}
            <ReferenceLine x={currentHourFormatted} stroke="#64748b" strokeDasharray="2 2" />
            <Line
              type="monotone"
              dataKey="soc"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#14b8a6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
