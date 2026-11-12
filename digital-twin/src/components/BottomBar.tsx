import React from 'react';
import { AlertTriangle, ShieldCheck, Zap, Cloud, BatteryCharging } from 'lucide-react';
import { useSimStore } from '../store/simStore';
import { useTwinData } from '../hooks/useTwinData';
import type { Scenario } from '../types';

export const BottomBar: React.FC = () => {
  const { alerts, scenario } = useTwinData();
  const setScenario = useSimStore((s) => s.setScenario);
  const selectItem = useSimStore((s) => s.selectItem);

  const scenarios: { id: Scenario; label: string; icon: React.ReactNode }[] = [
    { id: 'normal', label: 'Normal', icon: <ShieldCheck size={14} /> },
    { id: 'heavy_cloud', label: 'Heavy cloud cover', icon: <Cloud size={14} /> },
    { id: 'load_surge', label: 'Load surge', icon: <Zap size={14} /> },
    { id: 'battery_failure', label: 'Battery failure', icon: <BatteryCharging size={14} /> },
  ];

  return (
    <footer className="bottom-bar" role="contentinfo">
      {/* Left: Scenarios */}
      <div className="scenarios-group" role="group" aria-label="Simulation scenarios">
        <span className="scenario-label">Scenario:</span>
        {scenarios.map((sc) => (
          <button
            key={sc.id}
            className={`btn-scenario ${scenario === sc.id ? 'active' : ''}`}
            onClick={() => setScenario(sc.id)}
            aria-pressed={scenario === sc.id}
          >
            {sc.icon}
            <span>{sc.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Alert Chips (Click to focus object in 3D) */}
      <div className="alerts-group" role="region" aria-label="System alerts">
        {alerts.length === 0 ? (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            All systems nominal · 0 active alerts
          </span>
        ) : (
          alerts.map((al) => (
            <button
              key={al.id}
              className="alert-chip"
              onClick={() => {
                if (al.targetId) selectItem(al.targetId);
              }}
              title={`Click to focus on ${al.targetId || 'target'} in 3D scene`}
              aria-label={`${al.title}: ${al.message}`}
            >
              <AlertTriangle size={14} />
              <span>{al.title}</span>
              <span style={{ opacity: 0.75, fontSize: '11px' }}>({al.timestamp})</span>
            </button>
          ))
        )}
      </div>
    </footer>
  );
};
