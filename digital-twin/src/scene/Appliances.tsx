import React from 'react';
import type { ApplianceType } from '../types';

interface ApplianceModelProps {
  type: ApplianceType;
  position: [number, number, number];
  on?: boolean;
}

export const ApplianceModel: React.FC<ApplianceModelProps> = ({ type, position, on = true }) => {
  const activeColor = on ? '#14b8a6' : '#64748b';

  switch (type) {
    case 'ac':
      // Wall-mounted split AC unit
      return (
        <group position={position}>
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[1.2, 0.4, 0.35]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
          </mesh>
          {on && (
            <mesh position={[0.4, 2.15, 0.18]}>
              <boxGeometry args={[0.08, 0.04, 0.02]} />
              <meshBasicMaterial color={activeColor} />
            </mesh>
          )}
        </group>
      );

    case 'lights':
      // Ceiling hanging pendant light
      return (
        <group position={position}>
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, 2.25, 0]}>
            <coneGeometry args={[0.3, 0.25, 12]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
          {on && (
            <pointLight position={[0, 2.1, 0]} intensity={0.4} distance={4} color="#fef08a" />
          )}
        </group>
      );

    case 'fridge':
      // Kitchen Refrigerator
      return (
        <group position={position}>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.8, 1.8, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Handle */}
          <mesh position={[0.35, 1.0, 0.42]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
        </group>
      );

    case 'oven':
      // Kitchen oven / microwave range
      return (
        <group position={position}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.9, 0.9, 0.7]} />
            <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.5, 0.36]}>
            <boxGeometry args={[0.6, 0.4, 0.02]} />
            <meshStandardMaterial color="#0f172a" roughness={0.1} />
          </mesh>
        </group>
      );

    case 'hvac':
      // Commercial HVAC ceiling cassette
      return (
        <group position={position}>
          <mesh position={[0, 2.8, 0]}>
            <boxGeometry args={[1.5, 0.2, 1.5]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          {on && (
            <mesh position={[0, 2.68, 0]}>
              <boxGeometry args={[1.2, 0.02, 1.2]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          )}
        </group>
      );

    case 'ev_charger':
      // EV wall-box charging pedestal
      return (
        <group position={position}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} />
          </mesh>
          <mesh position={[0, 1.1, 0.16]}>
            <boxGeometry args={[0.2, 0.3, 0.05]} />
            <meshBasicMaterial color={activeColor} />
          </mesh>
        </group>
      );

    case 'pc':
      // Desktop workstation monitor and tower
      return (
        <group position={position}>
          {/* Desk */}
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[1.2, 0.76, 0.6]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.7} />
          </mesh>
          {/* Monitor */}
          <mesh position={[0, 0.95, -0.05]}>
            <boxGeometry args={[0.65, 0.38, 0.04]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
          {on && (
            <mesh position={[0, 0.95, -0.02]}>
              <boxGeometry args={[0.6, 0.34, 0.01]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
          )}
        </group>
      );

    case 'printer':
      // Office multi-function laser printer
      return (
        <group position={position}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.7, 0.9, 0.7]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.8, 0.2]}>
            <boxGeometry args={[0.3, 0.1, 0.2]} />
            <meshBasicMaterial color={activeColor} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
};
