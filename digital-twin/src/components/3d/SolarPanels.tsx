import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SolarPanelsProps {
  position: [number, number, number];
  kw: number;
  scenario: string;
  kwpCapacity?: number;
}

export default function SolarPanels({ position, kw, scenario, kwpCapacity = 120 }: SolarPanelsProps) {
  const groupRef = useRef<THREE.Group>(null);

  const panels = useMemo(() => {
    const result: [number, number][] = [];
    const cols = 6, rows = 4;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        result.push([c * 2.2 - (cols - 1) * 1.1, r * 1.4 - (rows - 1) * 0.7]);
      }
    }
    return result;
  }, []);

  const generating = kw > 1;
  const dimmed = scenario === 'heavy_cloud' || scenario === 'battery_failure';

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const flicker = generating ? Math.sin(t * 2) * 0.05 + 0.95 : 0;
    const intensity = dimmed ? 0.03 : flicker * (kw / kwpCapacity) * 0.5;
    groupRef.current.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = intensity;
      }
    });
  });

  return (
    <group position={position} rotation={[0.25, 0, 0]}>
      <group ref={groupRef}>
        {panels.map(([px, pz], i) => (
          <mesh key={i} position={[px, 0.05, pz]} castShadow>
            <boxGeometry args={[1.9, 0.06, 1.2]} />
            <meshStandardMaterial
              color={dimmed ? '#334155' : '#1e3a5f'}
              emissive="#2563eb"
              emissiveIntensity={0.15}
              roughness={0.3}
              metalness={0.8}
            />
          </mesh>
        ))}
      </group>
      {/* Frame supports */}
      {[-6, 0, 6].map((fx, i) => (
        <mesh key={i} position={[fx, -0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
