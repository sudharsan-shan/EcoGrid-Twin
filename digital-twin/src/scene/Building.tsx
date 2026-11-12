import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useEcoGridStore } from '../sim/store';
import { Room } from './Room';
import { SolarPanels } from './SolarPanels';
import { UtilityEquipment } from './UtilityEquipment';
import { GridPole } from './GridPole';
import { Cable } from './Cable';
import { BUILDING_ROOMS } from '../sim/model';

const FLOOR_H = 3.2;
const ROOF_H = 6.4;

// 3D Layout Coordinates for 2-floor architecture
const ROOM_3D_LAYOUT: Record<string, { pos: [number, number, number]; size: [number, number]; floorLabel: string }> = {
  // Ground Floor
  utility:     { pos: [-11, 0, -4.5], size: [7, 7],  floorLabel: 'Ground' },
  kitchen:     { pos: [-11, 0, 4.5],  size: [7, 7],  floorLabel: 'Ground' },
  room1:       { pos: [-2,  0, -4.5], size: [8, 7],  floorLabel: 'Ground' },
  room2:       { pos: [7,   0, -4.5], size: [8, 7],  floorLabel: 'Ground' },
  room3:       { pos: [-2,  0, 4.5],  size: [8, 7],  floorLabel: 'Ground' },
  // First Floor
  room4:       { pos: [-2,  FLOOR_H, -4.5], size: [8, 7], floorLabel: '1st Floor' },
  room5:       { pos: [7,   FLOOR_H, -4.5], size: [8, 7], floorLabel: '1st Floor' },
  room6:       { pos: [-2,  FLOOR_H, 4.5],  size: [8, 7], floorLabel: '1st Floor' },
  theater:     { pos: [7,   FLOOR_H, 4.5],  size: [8, 7], floorLabel: '1st Floor' },
};

// Cable routing positions
const INV_POS: [number, number, number] = [-12.2, 1.8, -4.5];
const BAT_POS: [number, number, number] = [-11.0, 1.8, -4.5];
const EB_POS:  [number, number, number] = [-9.8,  1.8, -4.5];
const SOLAR_EXIT: [number, number, number] = [-11, ROOF_H + 0.4, -4.5];
const GRID_POLE_FEED: [number, number, number] = [-19, 5.2, -4.5];

export const Building: React.FC = () => {
  const { dayResult, stepIndex, roofOpen } = useEcoGridStore();
  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];
  const roofRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!roofRef.current) return;
    const mat = roofRef.current.material as THREE.MeshStandardMaterial;
    const target = roofOpen ? 0.05 : 0.85;
    mat.opacity += (target - mat.opacity) * 0.1;
  });

  const roomLoads = currentStep.roomLoads || {};
  const gridNetKw = currentStep.gridImportKw - currentStep.gridExportKw;
  const gridDir: 1 | -1 = gridNetKw >= 0 ? 1 : -1;
  const gridColor = gridNetKw >= 0 ? '#f59e0b' : '#10b981';

  return (
    <group>
      {/* ── Ground Terrain Plane ─────────────────────────────────── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#090d16" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Building Ground Foundation */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[32, 0.1, 18]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* Ground Floor Central Corridor Text */}
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.5, 0.05, 0]}
        fontSize={0.35}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        Ground Corridor
      </Text>

      {/* First Floor Slab */}
      <mesh position={[2.5, FLOOR_H - 0.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[22, 0.1, 17]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>

      {/* First Floor Corridor Text */}
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        position={[2.5, FLOOR_H + 0.05, 0]}
        fontSize={0.35}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        First Floor Corridor
      </Text>

      {/* ── All Building Rooms (Ground & First Floor) ─────────────── */}
      {BUILDING_ROOMS.map((roomDef) => {
        const layout = ROOM_3D_LAYOUT[roomDef.id];
        if (!layout) return null;
        const kw = roomLoads[roomDef.id] || (currentStep.loadKw * roomDef.weight);
        return (
          <Room
            key={roomDef.id}
            id={roomDef.id}
            label={`${roomDef.name}`}
            position={layout.pos}
            size={layout.size}
            kw={kw}
            appliances={roomDef.appliances as any}
            isHighLoad={kw > 15}
          />
        );
      })}

      {/* ── Utility Equipment in Utility Room ────────────────────── */}
      <UtilityEquipment position={[-11, 0, -4.5]} />

      {/* ── External EB Grid Pole ────────────────────────────────── */}
      <GridPole position={[-19, 0, -4.5]} />

      {/* ── Rooftop Solar Array ──────────────────────────────────── */}
      <SolarPanels roofHeight={ROOF_H} />

      {/* ── Power Flow Animated Cables ───────────────────────────── */}
      {/* 1. Solar array -> Inverter */}
      <Cable
        start={SOLAR_EXIT}
        end={INV_POS}
        color="#14b8a6"
        powerKw={currentStep.solarKw}
        direction={1}
      />

      {/* 2. Inverter <-> BESS Battery */}
      <Cable
        start={INV_POS}
        end={BAT_POS}
        color="#a855f7"
        powerKw={Math.abs(currentStep.batteryKw)}
        direction={currentStep.batteryKw >= 0 ? 1 : -1}
      />

      {/* 3. Inverter <-> EB Panel */}
      <Cable
        start={INV_POS}
        end={EB_POS}
        color="#38bdf8"
        powerKw={Math.abs(gridNetKw)}
        direction={1}
      />

      {/* 4. EB Grid Pole -> EB Panel */}
      <Cable
        start={GRID_POLE_FEED}
        end={EB_POS}
        color={gridColor}
        powerKw={Math.abs(gridNetKw)}
        direction={gridDir}
      />

      {/* ── Cutaway Roof ─────────────────────────────────────────── */}
      <mesh
        ref={roofRef}
        position={[0, ROOF_H + 0.1, 0]}
        castShadow
      >
        <boxGeometry args={[32, 0.15, 18]} />
        <meshStandardMaterial
          color="#334155"
          transparent
          opacity={roofOpen ? 0.05 : 0.85}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
};
