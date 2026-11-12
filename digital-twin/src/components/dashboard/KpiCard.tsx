import type { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: ReactNode;
  color: string;
  subtext?: string;
  alert?: boolean;
}

export default function KpiCard({ label, value, unit, icon, color, subtext, alert }: KpiCardProps) {
  return (
    <div className={`kpi-card ${alert ? 'kpi-alert' : ''}`} style={{ '--accent': color } as React.CSSProperties}>
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">
          {value}
          {unit && <span className="kpi-unit"> {unit}</span>}
        </div>
        {subtext && <div className="kpi-sub">{subtext}</div>}
      </div>
    </div>
  );
}
