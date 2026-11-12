import React from 'react';
import { X, ArrowLeft, Power } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useSimStore } from '../store/simStore';
import { useTwinData } from '../hooks/useTwinData';

export const RoomDetailCard: React.FC = () => {
  const selectedId = useSimStore((s) => s.selectedId);
  const selectItem = useSimStore((s) => s.selectItem);
  const history = useSimStore((s) => s.state.history);
  const { rooms } = useTwinData();

  if (!selectedId) return null;

  // Find room or fallback
  const room = rooms.find(
    (r) => r.id.toLowerCase() === selectedId.toLowerCase() ||
           r.room.toLowerCase().replace(/\s+/g, '') === selectedId.toLowerCase().replace(/\s+/g, '')
  );

  if (!room) return null;

  // Synthetic 24-step room profile scaled to room load
  const miniChartData = history.slice(-24).map((h) => ({
    time: `${String(Math.floor(h.stepIndex / 4)).padStart(2, '0')}:${String((h.stepIndex % 4) * 15).padStart(2, '0')}`,
    kw: Number(((h.load * (room.kw / (rooms.reduce((s, x) => s + x.kw, 0) || 1)))).toFixed(2)),
  }));

  return (
    <div className="room-detail-card" role="region" aria-label={`Details for ${room.room}`}>
      <div className="room-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-icon"
            onClick={() => selectItem(null)}
            title="Back to overview (Esc)"
            aria-label="Back to overview"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="room-detail-title">{room.room}</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {room.kw.toFixed(1)} kW live · {room.energyTodayKwh} kWh today
            </span>
          </div>
        </div>
        <button
          className="btn-icon"
          onClick={() => selectItem(null)}
          title="Close detail view"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mini 24h chart */}
      <div style={{ height: '120px', width: '100%', marginTop: '4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={miniChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
            <XAxis
              dataKey="time"
              interval={8}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={{ stroke: 'var(--border-color)' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              formatter={(v: any) => [`${v} kW`, 'Room load']}
            />
            <Line
              type="monotone"
              dataKey="kw"
              stroke="var(--color-purple)"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Appliance list with read-only on/off status switches */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Connected appliances ({room.appliances.length})
        </div>
        <div className="appliance-list">
          {room.appliances.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px' }}>
              No individual sub-appliances metered in this zone.
            </div>
          ) : (
            room.appliances.map((app) => (
              <div key={app.id} className="appliance-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Power size={14} color={app.on ? 'var(--color-teal)' : 'var(--text-muted)'} />
                  <span>{app.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {app.kw.toFixed(1)} kW
                  </span>
                  <span className={`status-pill ${app.on ? 'on' : 'off'}`} title="Simulator status (Read-only)">
                    {app.on ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
