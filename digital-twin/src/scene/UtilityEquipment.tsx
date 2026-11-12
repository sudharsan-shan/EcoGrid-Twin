import React from 'react';
import { Text } from '@react-three/drei';
import { useEcoGridStore } from '../sim/store';

interface UtilityProps {
  position?: [number, number, number];
}

export const UtilityEquipment: React.FC<UtilityProps> = ({ position = [-10, 0, -4.5] }) => {
  const { dayResult, stepIndex, selectItem, config } = useEcoGridStore();
  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];

  const isBatteryAlert = currentStep.soc < 20 || currentStep.batteryTempC > config.cautionTempC || !config.hasBattery;
  const batteryColor = !config.hasBattery ? '#64748b' : isBatteryAlert ? '#ef4444' : '#14b8a6';

  return (
    <group position={position}>
      {/* ── 1. Hybrid Inverter ───────────────────────────────────── */}
      <group
        position={[-1.2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectItem('utility');
        }}
      >
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.9, 1.8, 0.5]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Status display */}
        <mesh position={[0, 1.4, 0.26]}>
          <boxGeometry args={[0.4, 0.3, 0.02]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        <Text
          position={[0, 0.4, 0.26]}
          fontSize={0.12}
          color="#94a3b8"
          anchorX="center"
          anchorY="middle"
        >
          Inverter
        </Text>
      </group>

      {/* ── 2. Battery Storage (250 kWh) ─────────────────────────── */}
      <group
        position={[0, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectItem('utility');
        }}
      >
        {/* Main Cabinet */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <boxGeometry args={[1.3, 2.3, 0.8]} />
          <meshStandardMaterial
            color={batteryColor}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
        {/* 4 Battery Rack Modules */}
        {[0.6, 1.0, 1.4, 1.8].map((y, i) => (
          <mesh key={i} position={[0, y, 0.41]}>
            <boxGeometry args={[1.1, 0.28, 0.02]} />
            <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        {/* Glowing SoC LED */}
        <mesh position={[0.4, 2.1, 0.42]}>
          <boxGeometry args={[0.08, 0.08, 0.02]} />
          <meshBasicMaterial color={batteryColor} />
        </mesh>
        <Text
          position={[0, 0.25, 0.42]}
          fontSize={0.13}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {config.hasBattery ? `BESS ${currentStep.soc.toFixed(0)}%` : 'BESS (OFF)'}
        </Text>
      </group>

      {/* ── 3. EB Distribution Panel ─────────────────────────────── */}
      <group
        position={[1.2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectItem('utility');
        }}
      >
        <mesh position={[0, 1.1, 0]} castShadow>
          <boxGeometry args={[0.8, 1.9, 0.4]} />
          <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Circuit Breakers */}
        <mesh position={[0, 1.3, 0.21]}>
          <boxGeometry args={[0.5, 0.6, 0.02]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <Text
          position={[0, 0.4, 0.21]}
          fontSize={0.12}
          color="#cbd5e1"
          anchorX="center"
          anchorY="middle"
        >
          EB Panel
        </Text>
      </group>
    </group>
  );
};
