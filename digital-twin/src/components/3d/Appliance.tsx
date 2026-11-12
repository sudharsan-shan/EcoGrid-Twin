import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore } from '../../store/simStore';
import type { ApplianceState } from '../../types';

interface ApplianceProps {
  appliance: ApplianceState;
  position: [number, number, number];
}

const APPLIANCE_COLORS: Record<string, string> = {
  ac: '#60a5fa',
  lights: '#fbbf24',
  fridge: '#34d399',
  oven: '#f97316',
  hvac: '#a78bfa',
  ev_charger: '#22d3ee',
  pc: '#94a3b8',
  printer: '#cbd5e1',
};

export default function Appliance({ appliance, position }: ApplianceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const selectItem = useSimStore(s => s.selectItem);
  const selectedId = useSimStore(s => s.selectedId);
  const isSelected = selectedId === appliance.id;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (appliance.on) {
      meshRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  const color = APPLIANCE_COLORS[appliance.type] ?? '#ffffff';

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={e => { e.stopPropagation(); selectItem(appliance.id); }}
        castShadow
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={color}
          emissive={appliance.on ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.8 : appliance.on ? 0.35 : 0}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.58, 0.58, 0.58]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
      <Text
        position={[0, 0.45, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {appliance.name}
      </Text>
      {appliance.on && (
        <pointLight
          color={color}
          intensity={0.3}
          distance={1.5}
          decay={2}
        />
      )}
    </group>
  );
}
