import React from 'react';
import { Sun, Zap, Battery, ArrowDownLeft, ArrowUpRight, Coins, Leaf } from 'lucide-react';
import { useTwinData } from '../hooks/useTwinData';

interface SparklineProps {
  data: number[];
  color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 56;
  const height = 20;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const KpiCards: React.FC = () => {
  const { solar, load, battery, grid, carbon } = useTwinData();

  const isBattAlert = battery.soc < 0.2 || !battery.healthy || battery.tempC > 45;
  const isLoadAlert = load.isHigh;

  return (
    <div className="kpi-grid">
      {/* 1. Solar kW */}
      <div className="kpi-card">
        <div className="kpi-header">
          <div className="kpi-label-group">
            <Sun size={14} color="var(--color-teal)" />
            <span className="kpi-label">Solar</span>
          </div>
          <Sparkline data={solar.history} color="var(--color-teal)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{solar.kw.toFixed(1)}</span>
          <span className="kpi-unit">kW</span>
        </div>
        <div className="kpi-footer">
          <span className="kpi-delta favorable">+{solar.baselineDelta} kW vs zero</span>
          <span className="kpi-unit">{solar.cloudCover.toFixed(0)}% cloud</span>
        </div>
      </div>

      {/* 2. Load kW */}
      <div className={`kpi-card ${isLoadAlert ? 'alert-active' : ''}`}>
        <div className="kpi-header">
          <div className="kpi-label-group">
            <Zap size={14} color="var(--color-purple)" />
            <span className="kpi-label">Load</span>
          </div>
          <Sparkline data={load.history} color="var(--color-purple)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{load.kw.toFixed(1)}</span>
          <span className="kpi-unit">kW</span>
        </div>
        <div className="kpi-footer">
          <span className="kpi-delta">Active load</span>
          <span className="kpi-unit">{isLoadAlert ? 'High demand' : 'Nominal'}</span>
        </div>
      </div>

      {/* 3. Battery kW & SoC */}
      <div className={`kpi-card ${isBattAlert ? 'alert-active' : ''}`}>
        <div className="kpi-header">
          <div className="kpi-label-group">
            <Battery size={14} color={isBattAlert ? 'var(--color-red)' : 'var(--color-teal)'} />
            <span className="kpi-label">Battery</span>
          </div>
          <Sparkline data={battery.history} color={isBattAlert ? 'var(--color-red)' : 'var(--color-teal)'} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{(battery.soc * 100).toFixed(0)}%</span>
          <span className="kpi-unit">
            {battery.kw > 0.1 ? `+${battery.kw.toFixed(1)} kW` : battery.kw < -0.1 ? `${battery.kw.toFixed(1)} kW` : 'Idle'}
          </span>
        </div>
        <div className="battery-bar-track" aria-hidden="true">
          <div
            className="battery-bar-fill"
            style={{
              width: `${Math.min(100, Math.max(0, battery.soc * 100))}%`,
              backgroundColor: isBattAlert ? 'var(--color-red)' : 'var(--color-teal)',
            }}
          />
        </div>
        <div className="kpi-footer">
          <span className="kpi-delta">{battery.tempC.toFixed(1)}°C</span>
          <span className="kpi-unit">{battery.healthy ? '250 kWh' : 'Fault'}</span>
        </div>
      </div>

      {/* 4. Grid kW */}
      <div className="kpi-card">
        <div className="kpi-header">
          <div className="kpi-label-group">
            {grid.mode === 'importing' ? (
              <ArrowDownLeft size={14} color="var(--color-amber)" />
            ) : grid.mode === 'exporting' ? (
              <ArrowUpRight size={14} color="var(--color-green)" />
            ) : (
              <Zap size={14} color="var(--color-slate)" />
            )}
            <span className="kpi-label">Grid</span>
          </div>
          <Sparkline data={grid.history} color={grid.mode === 'importing' ? 'var(--color-amber)' : 'var(--color-green)'} />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{Math.abs(grid.kw).toFixed(1)}</span>
          <span className="kpi-unit">kW</span>
        </div>
        <div className="kpi-footer">
          <span
            className="kpi-delta"
            style={{
              color: grid.mode === 'importing' ? 'var(--color-amber)' : 'var(--color-green)',
            }}
          >
            {grid.mode === 'importing' ? 'Importing' : grid.mode === 'exporting' ? 'Exporting' : 'Balanced'}
          </span>
          <span className="kpi-unit">₹{grid.tariffRate.toFixed(2)}/kWh</span>
        </div>
      </div>

      {/* 5. Cost Today */}
      <div className="kpi-card">
        <div className="kpi-header">
          <div className="kpi-label-group">
            <Coins size={14} color="var(--color-amber)" />
            <span className="kpi-label">Cost today</span>
          </div>
          <Sparkline data={grid.history.map((g) => Math.max(0, g))} color="var(--color-amber)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">₹{Math.round(grid.costToday).toLocaleString()}</span>
        </div>
        <div className="kpi-footer">
          <span className="kpi-delta favorable">ToU optimised</span>
          <span className="kpi-unit">{grid.cumulativeImportKwh.toFixed(0)} kWh in</span>
        </div>
      </div>

      {/* 6. CO2 Avoided */}
      <div className="kpi-card">
        <div className="kpi-header">
          <div className="kpi-label-group">
            <Leaf size={14} color="var(--color-green)" />
            <span className="kpi-label">CO₂ avoided</span>
          </div>
          <Sparkline data={carbon.history} color="var(--color-green)" />
        </div>
        <div className="kpi-value-row">
          <span className="kpi-number">{carbon.avoidedKg.toFixed(1)}</span>
          <span className="kpi-unit">kg</span>
        </div>
        <div className="kpi-footer">
          <span className="kpi-delta favorable">vs baseline</span>
          <span className="kpi-unit">{carbon.emittedKg.toFixed(1)} kg net</span>
        </div>
      </div>
    </div>
  );
};
