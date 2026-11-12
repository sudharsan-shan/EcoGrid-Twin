import React from 'react';
import { Text } from '@react-three/drei';

interface GridPoleProps {
  position?: [number, number, number];
}

export const GridPole: React.FC<GridPoleProps> = ({ position = [-18, 0, -4.5] }) => {
  return (
    <group position={position}>
      {/* Wooden / Concrete utility pole */}
      <mesh position={[0, 3.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 7, 12]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Crossarm 1 (top) */}
      <mesh position={[0, 6.2, 0]}>
        <boxGeometry args={[0.15, 0.15, 2.2]} />
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </mesh>

      {/* Insulators */}
      {[-0.9, 0, 0.9].map((z, i) => (
        <mesh key={i} position={[0, 6.4, z]}>
          <cylinderGeometry args={[0.06, 0.08, 0.3, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}

      {/* Transformer canister */}
      <mesh position={[0.3, 5.2, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.35, 1.0, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      <Text
        position={[0, 1.2, 0.5]}
        fontSize={0.25}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        EB 11kV Grid
      </Text>
    </group>
  );
};
