import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEcoGridStore } from '../sim/store';
import { ApplianceModel } from './Appliances';
import type { ApplianceState } from '../types';

interface RoomProps {
  id: string;
  label: string;
  position: [number, number, number];
  size: [number, number]; // [width, depth]
  kw: number;
  appliances?: ApplianceState[];
  isHighLoad?: boolean;
}

const WALL_H = 3.0;
const WALL_THICK = 0.12;

export const Room: React.FC<RoomProps> = ({
  id,
  label,
  position,
  size,
  kw,
  appliances = [],
  isHighLoad = false,
}) => {
  const [w, d] = size;
  const selectedId = useEcoGridStore((s) => s.selectedId);
  const selectItem = useEcoGridStore((s) => s.selectItem);
  const hoveredId = useEcoGridStore((s) => s.hoveredId);
  const setHoveredItem = useEcoGridStore((s) => s.setHoveredItem);

  const floorRef = useRef<THREE.Mesh>(null);
  const isSelected = selectedId === id;
  const isHovered = hoveredId === id;
  const anySelected = Boolean(selectedId);
  const isDimmed = anySelected && !isSelected;

  // Pulse effect for high load
  useFrame(({ clock }) => {
    if (!floorRef.current) return;
    const mat = floorRef.current.material as THREE.MeshStandardMaterial;
    if (isHighLoad) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
      mat.emissive.set('#f59e0b');
      mat.emissiveIntensity = 0.2 + pulse * 0.4;
    } else if (isSelected) {
      mat.emissive.set('#a855f7');
      mat.emissiveIntensity = 0.3;
    } else if (isHovered) {
      mat.emissive.set('#14b8a6');
      mat.emissiveIntensity = 0.25;
    } else {
      mat.emissive.set('#000000');
      mat.emissiveIntensity = 0;
    }
  });

  return (
    <group position={position}>
      {/* ── Floor Plane ────────────────────────────────────────── */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          selectItem(id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredItem(id);
        }}
        onPointerOut={() => {
          if (hoveredId === id) setHoveredItem(null);
        }}
      >
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial
          color={isDimmed ? '#1e293b' : isSelected ? '#334155' : '#1f2937'}
          roughness={0.8}
        />
      </mesh>

      {/* ── Thin Perimeter Walls ──────────────────────────────── */}
      {/* North Wall */}
      <mesh position={[0, WALL_H / 2, -d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, WALL_H, WALL_THICK]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={isDimmed ? 0.3 : 0.75}
          roughness={0.6}
        />
      </mesh>
      {/* South Wall */}
      <mesh position={[0, WALL_H / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, WALL_H, WALL_THICK]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={isDimmed ? 0.3 : 0.75}
          roughness={0.6}
        />
      </mesh>
      {/* West Wall */}
      <mesh position={[-w / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICK, WALL_H, d]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={isDimmed ? 0.3 : 0.75}
          roughness={0.6}
        />
      </mesh>
      {/* East Wall */}
      <mesh position={[w / 2, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[WALL_THICK, WALL_H, d]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={isDimmed ? 0.3 : 0.75}
          roughness={0.6}
        />
      </mesh>

      {/* ── Floor Labels ───────────────────────────────────────── */}
      <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <Text
          fontSize={0.45}
          color={isSelected ? '#c084fc' : isHovered ? '#2dd4bf' : '#94a3b8'}
          anchorX="center"
          anchorY="middle"
          position={[0, 0.4, 0]}
        >
          {label}
        </Text>
        <Text
          fontSize={0.3}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.4, 0]}
        >
          {`${kw.toFixed(1)} kW`}
        </Text>
      </group>

      {/* ── Appliances inside room ─────────────────────────────── */}
      <group>
        {appliances.map((app, idx) => {
          // Space appliances nicely within the room floor
          const offsetStep = (w - 2) / (appliances.length || 1);
          const posX = -w / 2 + 1.2 + idx * offsetStep;
          const posZ = (idx % 2 === 0 ? 1 : -1) * (d / 4);
          return (
            <group
              key={app.id}
              onClick={(e) => {
                e.stopPropagation();
                selectItem(id);
              }}
            >
              <ApplianceModel
                type={app.type}
                position={[posX, 0, posZ]}
                on={app.on}
              />
            </group>
          );
        })}
      </group>
    </group>
  );
};
