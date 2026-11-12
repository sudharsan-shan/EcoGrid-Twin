import { useSimStore } from '../../store/simStore';

interface AlertChip {
  id: string;
  label: string;
  active: boolean;
  severity: 'warning' | 'critical';
}

export default function AlertChips() {
  const battery = useSimStore(s => s.state.battery);
  const solar = useSimStore(s => s.state.solar);
  const rooms = useSimStore(s => s.state.rooms);

  const totalLoad = rooms.reduce((s, r) => s + r.kw, 0);

  const chips: AlertChip[] = [
    {
      id: 'soc-low',
      label: `🔋 SoC Low (${(battery.soc * 100).toFixed(0)}%)`,
      active: battery.soc < 0.20,
      severity: 'critical',
    },
    {
      id: 'batt-temp',
      label: `🌡️ Batt Temp ${battery.tempC.toFixed(1)}°C`,
      active: battery.tempC > 45,
      severity: 'warning',
    },
    {
      id: 'load-high',
      label: `⚡ High Load ${totalLoad.toFixed(0)} kW`,
      active: totalLoad > 130,
      severity: 'warning',
    },
    {
      id: 'batt-fail',
      label: '🚨 Battery Failure',
      active: !battery.healthy,
      severity: 'critical',
    },
    {
      id: 'cloud',
      label: `☁️ Cloud ${solar.cloudCover.toFixed(0)}%`,
      active: solar.cloudCover > 70,
      severity: 'warning',
    },
  ];

  const activeAlerts = chips.filter(c => c.active);
  if (activeAlerts.length === 0) return null;

  return (
    <div className="alert-chips">
      {activeAlerts.map(chip => (
        <div key={chip.id} className={`alert-chip ${chip.severity}`}>
          {chip.label}
        </div>
      ))}
    </div>
  );
}
