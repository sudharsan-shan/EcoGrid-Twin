import React, { useState } from 'react';
import {
  Play,
  Pause,
  Sun,
  Moon,
  Download,
  Camera,
  Activity,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { useTwinData } from '../hooks/useTwinData';

export const TopBar: React.FC = () => {
  const { clock, tariff } = useTwinData();
  const setPlaying = useSimStore((s) => s.setPlaying);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const scrubTo = useSimStore((s) => s.scrubTo);
  const theme = useSimStore((s) => s.theme);
  const toggleTheme = useSimStore((s) => s.toggleTheme);
  const history = useSimStore((s) => s.state.history);

  const [exportOpen, setExportOpen] = useState(false);

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Step', 'Time', 'Solar_kW', 'Load_kW', 'Battery_kW', 'Battery_SoC_pct', 'Grid_kW', 'Tariff_Rs_per_kWh', 'Cost_Rs', 'CO2_kg'];
    const rows = history.map((h) => {
      const hour = Math.floor(h.stepIndex / 4);
      const min = (h.stepIndex % 4) * 15;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      return [
        h.stepIndex,
        timeStr,
        h.solar.toFixed(2),
        h.load.toFixed(2),
        h.battery.toFixed(2),
        (h.batterySoc * 100).toFixed(1),
        h.grid.toFixed(2),
        h.tariffRate.toFixed(2),
        h.cost.toFixed(2),
        h.co2.toFixed(2),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ecogrid_twin_readings_step_${clock.stepIndex}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportOpen(false);
  };

  // Export Screenshot
  const handleExportScreenshot = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ecogrid_twin_scene_${clock.time.replace(':', '-')}.png`;
      link.href = dataUrl;
      link.click();
    }
    setExportOpen(false);
  };

  return (
    <header className="top-bar" role="banner">
      {/* Left: Brand & Simulation Clock */}
      <div className="top-bar-left">
        <div className="brand-badge">
          <span className="brand-icon">
            <Activity size={18} />
          </span>
          <span>EcoGrid Twin</span>
          <span className="brand-sub">Smart Building 3D</span>
        </div>

        <div className="clock-display" aria-label="Simulation time">
          <Calendar size={14} color="var(--text-secondary)" />
          <span className="clock-date">{clock.date}</span>
          <span className="clock-time">{clock.time}</span>
        </div>

        {/* Tariff badge */}
        <div
          className={`tariff-badge tariff-${tariff.band}`}
          title={`Tamil Nadu ToU ${tariff.label} rate: ₹${tariff.rate.toFixed(2)}/kWh`}
          aria-label={`Current tariff: ${tariff.label} at ₹${tariff.rate.toFixed(2)} per kWh`}
        >
          <span>{tariff.label}</span>
          <span>₹{tariff.rate.toFixed(2)}</span>
        </div>
      </div>

      {/* Center: Playback, Speed & Scrubber */}
      <div className="top-bar-center">
        <div className="playback-controls">
          <div className="live-status-pill" title="Continuous Real-Time Simulation Active">
            <span className="live-pulse-dot" />
            <span className="live-text">LIVE</span>
          </div>

          <div className="speed-selector" role="group" aria-label="Simulation speed">
            {([1, 10, 60] as const).map((spd) => (
              <button
                key={spd}
                className={`btn-speed ${clock.speedMultiplier === spd ? 'active' : ''}`}
                onClick={() => setSpeed(spd)}
                aria-pressed={clock.speedMultiplier === spd}
              >
                x{spd}
              </button>
            ))}
          </div>

          <div className="scrubber-container">
            <input
              type="range"
              min={0}
              max={95}
              value={clock.stepIndex}
              onChange={(e) => scrubTo(Number(e.target.value))}
              className="scrubber-input"
              aria-label="Simulation 96-step time scrubber"
            />
            <span className="step-indicator">
              {clock.stepIndex + 1}/96
            </span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle & Export Menu */}
      <div className="top-bar-right">
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon"
            style={{ width: 'auto', padding: '0 12px', gap: '6px' }}
            onClick={() => setExportOpen(!exportOpen)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            aria-label="Export menu"
          >
            <Download size={15} />
            <span style={{ fontSize: '12px' }}>Export</span>
            <ChevronDown size={13} />
          </button>

          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-flat)',
                padding: '4px',
                zIndex: 50,
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
              role="menu"
            >
              <button
                className="btn-tool"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleExportScreenshot}
                role="menuitem"
              >
                <Camera size={14} />
                <span>Screenshot (PNG)</span>
              </button>
              <button
                className="btn-tool"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={handleExportCsv}
                role="menuitem"
              >
                <Download size={14} />
                <span>Readings (CSV)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
