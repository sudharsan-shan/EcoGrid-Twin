import { useSimStore } from '../../store/simStore';
import type { Scenario } from '../../types';

const SCENARIOS: { id: Scenario; label: string; icon: string; desc: string }[] = [
  { id: 'normal',          label: 'Normal',       icon: '☀️', desc: 'Typical day' },
  { id: 'heavy_cloud',     label: 'Heavy Cloud',  icon: '☁️', desc: 'Solar <25%' },
  { id: 'load_surge',      label: 'Load Surge',   icon: '⚡', desc: 'Load ×1.9' },
  { id: 'battery_failure', label: 'Batt Failure', icon: '🔴', desc: 'BMS fault' },
];

export default function ScenarioBar() {
  const scenario = useSimStore(s => s.state.scenario);
  const setScenario = useSimStore(s => s.setScenario);

  return (
    <div className="scenario-bar">
      <span className="scenario-label">Scenario:</span>
      {SCENARIOS.map(s => (
        <button
          key={s.id}
          className={`scenario-btn ${scenario === s.id ? 'active' : ''}`}
          onClick={() => setScenario(s.id)}
          title={s.desc}
        >
          <span>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
