import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Building } from './Building';
import { useEcoGridStore } from '../sim/store';

const ROOM_CENTERS: Record<string, [number, number, number]> = {
  utility: [-11, 0, -4.5],
  kitchen: [-11, 0, 4.5],
  room1: [-2, 0, -4.5],
  room2: [7, 0, -4.5],
  room3: [-2, 0, 4.5],
  room4: [-2, 3.2, -4.5],
  room5: [7, 3.2, -4.5],
  room6: [-2, 3.2, 4.5],
  theater: [7, 3.2, 4.5],
  battery: [-11, 1.25, -4.5],
};

function CameraRig() {
  const controlsRef = useRef<any>(null);
  const viewPreset = useEcoGridStore((s) => s.viewPreset);
  const selectedId = useEcoGridStore((s) => s.selectedId);

  // Animate camera position smoothly towards target
  useFrame(({ camera }) => {
    if (!controlsRef.current) return;

    let targetCamPos: [number, number, number] | null = null;
    let targetLook: [number, number, number] | null = null;

    if (selectedId && ROOM_CENTERS[selectedId]) {
      const [rx, ry, rz] = ROOM_CENTERS[selectedId];
      targetCamPos = [rx + 3, ry + 7, rz + 8];
      targetLook = [rx, ry + 1, rz];
    } else if (viewPreset === 'top') {
      targetCamPos = [0, 36, 0.01];
      targetLook = [0, 0, 0];
    } else if (viewPreset === 'front') {
      targetCamPos = [0, 10, 28];
      targetLook = [0, 2, 0];
    }

    if (targetCamPos && targetLook) {
      camera.position.lerp(new THREE.Vector3(...targetCamPos), 0.08);
      controlsRef.current.target.lerp(new THREE.Vector3(...targetLook), 0.08);
      controlsRef.current.update();
    }
  });


  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={6}
      maxDistance={55}
      maxPolarAngle={Math.PI / 2.05}
      target={[0, 1, 0]}
    />
  );
}

export const SceneRoot: React.FC = () => {
  return (
    <Canvas
      className="scene-canvas"
      camera={{ position: [22, 18, 22], fov: 42 }}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <CameraRig />

      {/* Lighting: soft daylight & directional sun */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[18, 28, 12]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0001}
      />
      <hemisphereLight args={['#38bdf8', '#0f172a', 0.35]} />

      <Building />
    </Canvas>
  );
};
