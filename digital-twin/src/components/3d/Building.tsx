import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore } from '../../store/simStore';
import Room from './Room';
import SolarPanels from './SolarPanels';
import UtilityEquipment from './UtilityEquipment';
import GridPole from './GridPole';
import Cable from './Cable';
import { ROOM_DEFS } from '../../sim/simulator';

// Building dimensions: 30m x 16m
// Row 1 (z=-4): Utility(6x7), Room1(8x7), Room2(8x7)  — top
// Corridor (z=0): 1m gap
// Row 2 (z=5): Kitchen(6x7), MainHall(12x7), Office(8x7) — bottom
const WALL_H = 3.0;
const ROOF_H = WALL_H + 0.2;

const ROOM_LAYOUT: Record<string, { pos: [number, number, number]; size: [number, number] }> = {
  utility:  { pos: [-10, 0, -4.5], size: [7,  7] },
  room1:    { pos: [-1,  0, -4.5], size: [9,  7] },
  room2:    { pos: [8.5, 0, -4.5], size: [9,  7] },
  kitchen:  { pos: [-10, 0, 4.5],  size: [7,  7] },
  mainhall: { pos: [0.5, 0, 4.5],  size: [13, 7] },
  office:   { pos: [9.5, 0, 4.5],  size: [9,  7] },
};

// Cable waypoints (all at y=1.8 for overhead routing)
const INV_POS: [number, number, number] = [-11.2, 1.8, -4.5];
const BAT_POS: [number, number, number] = [-10.0, 1.8, -4.5];
const EB_POS:  [number, number, number] = [-8.8,  1.8, -4.5];
const SOLAR_EXIT: [number, number, number] = [-10, ROOF_H + 0.5, -4.5];
const GRID_POLE: [number, number, number] = [-18, 0, -4.5];

export default function Building() {
  const { state } = useSimStore();
  const [showRoof, setShowRoof] = useState(true);
  const roofRef = useRef<THREE.Mesh>(null);

  const { solar, battery, grid, rooms, scenario } = state;

  // Animate roof fade
  useFrame(() => {
    if (!roofRef.current) return;
    const mat = roofRef.current.material as THREE.MeshStandardMaterial;
    const target = showRoof ? 0.85 : 0;
    mat.opacity += (target - mat.opacity) * 0.08;
  });

  // Map room loads by id
  const roomMap = Object.fromEntries(rooms.map(r => [r.roomId, r]));
  const labels = Object.fromEntries(ROOM_DEFS.map(d => [d.id, d.label]));

  // Grid import/export direction
  const gridDir: 1 | -1 = grid.kw > 0 ? 1 : -1;
  const gridColor = grid.kw > 0 ? '#f59e0b' : '#22c55e'; // amber import, green export

  return (
    <>
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={80}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        color="#fffbf0"
      />
      <pointLight position={[-10, 8, -4.5]} intensity={0.6} color="#6ee7b7" distance={20} />

      {/* Environment */}
      <Environment preset="city" />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} metalness={0.1} />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[80, 80]}
        cellSize={1}
        cellThickness={0.3}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor="#334155"
        fadeDistance={50}
        fadeStrength={1}
        infiniteGrid
      />

      {/* ─── Rooms ─────────────────────────────────────────────────── */}
      {Object.entries(ROOM_LAYOUT).map(([id, { pos, size }]) => (
        <Room
          key={id}
          roomLoad={roomMap[id] ?? { roomId: id, kw: 0, appliances: [] }}
          label={labels[id] ?? id}
          position={pos}
          size={size}
          wallHeight={WALL_H}
        />
      ))}

      {/* ─── Corridor label ──────────────────────────────────────────── */}
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.3}
        color="#475569"
        anchorX="center"
        anchorY="middle"
      >
        ── CORRIDOR ──
      </Text>

      {/* ─── Utility Equipment ───────────────────────────────────────── */}
      <UtilityEquipment
        soc={battery.soc}
        batteryKw={battery.kw}
        healthy={battery.healthy}
        solarKw={solar.kw}
        gridKw={grid.kw}
        position={[-10, 0.05, -4.5]}
      />

      {/* ─── Rooftop Solar ───────────────────────────────────────────── */}
      <SolarPanels
        position={[-1, ROOF_H + 0.15, -4]}
        kw={solar.kw}
        scenario={scenario}
        kwpCapacity={solar.kwpCapacity}
      />

      {/* ─── EB Grid Pole ────────────────────────────────────────────── */}
      <GridPole position={GRID_POLE} gridKw={grid.kw} />

      {/* ─── Roof (toggleable) ───────────────────────────────────────── */}
      <mesh ref={roofRef} position={[0, ROOF_H, 0]}>
        <boxGeometry args={[32, 0.3, 18]} />
        <meshStandardMaterial
          color="#1e293b"
          transparent
          opacity={showRoof ? 0.85 : 0}
          roughness={0.6}
          metalness={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* ─── Cables ──────────────────────────────────────────────────── */}

      {/* Solar → Inverter */}
      <Cable
        start={SOLAR_EXIT}
        end={INV_POS}
        color="#2dd4bf"
        powerKw={solar.kw}
        direction={1}
      />

      {/* Inverter ↔ Battery */}
      <Cable
        start={INV_POS}
        end={BAT_POS}
        color="#2dd4bf"
        powerKw={Math.abs(battery.kw)}
        direction={battery.kw >= 0 ? 1 : -1}
      />

      {/* Grid Pole ↔ EB Panel */}
      <Cable
        start={[-18, 3.5, -4.5]}
        end={EB_POS}
        color={gridColor}
        powerKw={Math.abs(grid.kw)}
        direction={gridDir}
      />

      {/* EB Panel → Each room distribution */}
      {Object.entries(ROOM_LAYOUT).filter(([id]) => id !== 'utility').map(([id, { pos }]) => (
        <Cable
          key={id}
          start={EB_POS}
          end={[pos[0], 1.8, pos[2]]}
          color="#a855f7"
          powerKw={roomMap[id]?.kw ?? 0}
          direction={1}
          segments={12}
        />
      ))}

      {/* ─── Roof Toggle Button (3D label) ──────────────────────────── */}
      <group
        position={[14, 5, -9]}
        onClick={e => { e.stopPropagation(); setShowRoof(v => !v); }}
      >
        <mesh>
          <boxGeometry args={[3.2, 0.6, 0.1]} />
          <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.3} />
        </mesh>
        <Text position={[0, 0, 0.07]} fontSize={0.28} color="#bfdbfe" anchorX="center" anchorY="middle">
          {showRoof ? '🏠 Hide Roof' : '🏠 Show Roof'}
        </Text>
      </group>
    </>
  );
}
