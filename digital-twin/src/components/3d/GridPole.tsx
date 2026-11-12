import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GridPoleProps {
  position: [number, number, number];
  gridKw: number;
}

export default function GridPole({ position, gridKw }: GridPoleProps) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    // flicker if grid is active
    if (Math.abs(gridKw) > 0.5) {
      lightRef.current.intensity = 0.8 + Math.sin(clock.getElapsedTime() * 50) * 0.05;
    } else {
      lightRef.current.intensity = 0.1;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 6, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Cross-arm */}
      <mesh position={[0, 5.8, 0]} castShadow>
        <boxGeometry args={[1.5, 0.1, 0.1]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Insulators */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={i} position={[x, 5.7, 0]} castShadow>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#dc2626" roughness={0.6} />
        </mesh>
      ))}
      {/* Street light arm */}
      <mesh position={[0.5, 5.6, 0]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Light bulb */}
      <mesh position={[0.8, 5.25, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          color="#fef3c7"
          emissive="#fbbf24"
          emissiveIntensity={Math.abs(gridKw) > 0.5 ? 1 : 0.1}
        />
      </mesh>
      <pointLight ref={lightRef} position={[0.8, 5.25, 0]} color="#fbbf24" intensity={0.8} distance={6} />

      {/* Base plate */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.4, 0.2, 0.4]} />
        <meshStandardMaterial color="#374151" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}
