import React, { useMemo } from 'react';
import { useEcoGridStore } from '../sim/store';

interface SolarPanelsProps {
  roofHeight?: number;
}

export const SolarPanels: React.FC<SolarPanelsProps> = ({ roofHeight = 3.2 }) => {
  const { dayResult, stepIndex, scenario } = useEcoGridStore();
  const currentStep = dayResult.steps[stepIndex] || dayResult.steps[0];

  // Cloud dimming
  const isCloudy = scenario === 'heavy_cloud';
  const panelColor = isCloudy ? '#1e293b' : '#0284c7';
  const panelRoughness = isCloudy ? 0.8 : 0.2;
  const panelMetalness = isCloudy ? 0.2 : 0.8;

  // Grid of tilted panels (4 rows of 8 panels = 32 panels representing 120 kWp)
  const panels = useMemo(() => {
    const arr: { x: number; z: number }[] = [];
    const rows = 4;
    const cols = 8;
    const startX = -10;
    const startZ = -4.5;
    const dx = 2.8;
    const dz = 3.0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        arr.push({
          x: startX + c * dx,
          z: startZ + r * dz,
        });
      }
    }
    return arr;
  }, []);

  return (
    <group position={[0, roofHeight, 0]}>
      {panels.map((p, idx) => (
        <group key={idx} position={[p.x, 0.2, p.z]} rotation={[-Math.PI / 8, 0, 0]}>
          {/* Aluminum mounting rail */}
          <mesh position={[0, -0.05, 0]}>
            <boxGeometry args={[2.2, 0.08, 1.4]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Photovoltaic glass panel */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2.0, 0.04, 1.2]} />
            <meshStandardMaterial
              color={panelColor}
              metalness={panelMetalness}
              roughness={panelRoughness}
              emissive={isCloudy ? '#000000' : '#0369a1'}
              emissiveIntensity={Math.max(0, currentStep.solarKw / 120) * 0.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};
