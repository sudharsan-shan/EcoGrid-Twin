import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useSimStore } from '../store/simStore';

export const TariffBandsChart: React.FC = () => {
  const currentStep = useSimStore((s) => s.state.stepIndex);
  const currentHour = Math.floor(currentStep / 4);

  // 24 hours tariff array
  const hours = Array.from({ length: 24 }, (_, h) => {
    let rate = 7.5;
    let band = 'standard';
    let label = 'Standard';
    if ((h >= 6 && h < 9) || (h >= 18 && h < 21)) {
      rate = 9.5;
      band = 'peak';
      label = 'Peak';
    } else if (h >= 22 || h < 6) {
      rate = 5.8;
      band = 'offpeak';
      label = 'Off-peak';
    }
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      h,
      rate,
      band,
      label,
      isCurrent: h === currentHour,
    };
  });

  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <span className="chart-title">Tariff bands (ToU)</span>
        <span className="chart-subtitle">₹ / kWh by hour</span>
      </div>
      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hours} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              interval={3}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 11]}
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
              formatter={(value: any, _: any, props: any) => [
                `₹${value}/kWh (${props.payload.label})`,
                props.payload.isCurrent ? 'Current Hour Rate' : 'Rate',
              ]}
            />
            <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
              {hours.map((entry, index) => {
                let fill = '#a855f7';
                if (entry.band === 'peak') fill = '#ef4444';
                else if (entry.band === 'offpeak') fill = '#10b981';
                else fill = '#f59e0b';

                // Highlight current hour
                const opacity = entry.isCurrent ? 1 : 0.45;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={fill}
                    fillOpacity={opacity}
                    stroke={entry.isCurrent ? '#ffffff' : 'none'}
                    strokeWidth={entry.isCurrent ? 1.5 : 0}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
