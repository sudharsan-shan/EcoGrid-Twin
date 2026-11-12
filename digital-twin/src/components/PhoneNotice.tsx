import React from 'react';
import { Monitor } from 'lucide-react';

export const PhoneNotice: React.FC = () => {
  return (
    <div className="phone-notice" role="note">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
        <Monitor size={16} />
        <span>3D Scene Requires Desktop</span>
      </div>
      <p style={{ marginTop: '4px', opacity: 0.9 }}>
        Interactive 3D building twin is optimized for screens 1024px and wider. Displaying real-time simulated telemetry below.
      </p>
    </div>
  );
};
