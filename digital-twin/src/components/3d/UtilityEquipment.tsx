import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore } from '../../store/simStore';

interface UtilityEquipmentProps {
  soc: number;
  batteryKw: number;
  healthy: boolean;
  solarKw: number;
  gridKw: number;
  position: [number, number, number];
}

export default function UtilityEquipment({ soc, batteryKw, healthy, solarKw, gridKw, position }: UtilityEquipmentProps) {
  const batteryRef = useRef<THREE.Mesh>(null);
  const selectItem = useSimStore(s => s.selectItem);

  useFrame(({ clock }) => {
    if (!batteryRef.current) return;
    const mat = batteryRef.current.material as THREE.MeshStandardMaterial;
    if (!healthy) {
      // Red flicker for battery failure
      mat.emissive.set('#ff2200');
      mat.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
    } else {
      const socColor = soc > 0.5 ? '#10b981' : soc > 0.25 ? '#f59e0b' : '#ef4444';
      mat.emissive.set(socColor);
      mat.emissiveIntensity = 0.2 + soc * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Hybrid Inverter */}
      <group position={[-1.2, 0, 0]} onClick={e => { e.stopPropagation(); selectItem('inverter'); }}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[0.7, 1.2, 0.4]} />
          <meshStandardMaterial color="#1d4ed8" emissive="#1d4ed8" emissiveIntensity={0.2} metalness={0.7} roughness={0.3} />
        </mesh>
        <Text position={[0, 1.35, 0]} fontSize={0.18} color="#93c5fd" anchorX="center">Inverter</Text>
        <Text position={[0, 1.15, 0]} fontSize={0.14} color="#60a5fa" anchorX="center">
          {solarKw.toFixed(1)} kW
        </Text>
      </group>

      {/* Battery Pack */}
      <group position={[0, 0, 0]} onClick={e => { e.stopPropagation(); selectItem('battery'); }}>
        <mesh ref={batteryRef} castShadow position={[0, 0.8, 0]}>
          <boxGeometry args={[0.9, 1.6, 0.5]} />
          <meshStandardMaterial color={healthy ? '#0f172a' : '#7f1d1d'} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* SoC bar */}
        <mesh position={[0.5, 0.08 + soc * 1.44, 0]}>
          <boxGeometry args={[0.08, soc * 1.6, 0.52]} />
          <meshStandardMaterial color={soc > 0.5 ? '#10b981' : soc > 0.25 ? '#f59e0b' : '#ef4444'} emissive={soc > 0.5 ? '#10b981' : '#ef4444'} emissiveIntensity={0.5} />
        </mesh>
        <Text position={[0, 1.75, 0]} fontSize={0.18} color="#a3e635" anchorX="center">Battery</Text>
        <Text position={[0, 1.55, 0]} fontSize={0.14} color="#86efac" anchorX="center">
          {(soc * 100).toFixed(0)}% SoC
        </Text>
        <Text position={[0, 1.38, 0]} fontSize={0.13} color="#6ee7b7" anchorX="center">
          {batteryKw > 0 ? '↑' : '↓'} {Math.abs(batteryKw).toFixed(1)} kW
        </Text>
      </group>

      {/* EB Panel + Smart Meter */}
      <group position={[1.2, 0, 0]} onClick={e => { e.stopPropagation(); selectItem('eb_panel'); }}>
        <mesh castShadow position={[0, 0.7, 0]}>
          <boxGeometry args={[0.7, 1.4, 0.35]} />
          <meshStandardMaterial color="#78350f" emissive="#92400e" emissiveIntensity={0.15} metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Smart meter display */}
        <mesh position={[0, 0.85, 0.19]}>
          <boxGeometry args={[0.4, 0.3, 0.01]} />
          <meshStandardMaterial color="#0c4a6e" emissive="#0ea5e9" emissiveIntensity={0.6} />
        </mesh>
        <Text position={[0, 1.55, 0]} fontSize={0.18} color="#fbbf24" anchorX="center">EB Panel</Text>
        <Text position={[0, 1.35, 0]} fontSize={0.14} color="#fde68a" anchorX="center">
          {gridKw > 0 ? 'Import' : 'Export'} {Math.abs(gridKw).toFixed(1)} kW
        </Text>
      </group>
    </group>
  );
}
