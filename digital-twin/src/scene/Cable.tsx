import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEcoGridStore } from '../sim/store';

interface CableProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  powerKw?: number;       // controls speed / brightness
  direction?: 1 | -1;    // 1 = start→end, -1 = end→start
  segments?: number;
}

const PARTICLE_COUNT = 8;

export const Cable: React.FC<CableProps> = ({
  start,
  end,
  color = '#14b8a6',
  powerKw = 1,
  direction = 1,
  segments = 24,
}) => {
  const isPlaying = useEcoGridStore((s) => s.playing);
  const particlesRef = useRef<THREE.Points>(null);
  const progressRef = useRef<Float32Array>(
    new Float32Array(PARTICLE_COUNT).map((_, i) => i / PARTICLE_COUNT)
  );

  const reducedMotion = useMemo(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.45, 0));
    return new THREE.QuadraticBezierCurve3(s, mid, e);
  }, [start, end]);

  const tubeGeom = useMemo(
    () => new THREE.TubeGeometry(curve, segments, 0.045, 8, false),
    [curve, segments]
  );

  const particlePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame((_, delta) => {
    if (!particlesRef.current || !isPlaying || reducedMotion) return;
    const speed = Math.min(0.5, 0.06 + Math.abs(powerKw) * 0.007) * direction;
    const arr = progressRef.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i] = (arr[i] + speed * delta + 1) % 1;
      const pt = curve.getPoint(arr[i]);
      particlePositions[i * 3] = pt.x;
      particlePositions[i * 3 + 1] = pt.y;
      particlePositions[i * 3 + 2] = pt.z;
    }
    const geom = particlesRef.current.geometry;
    (geom.attributes.position as THREE.BufferAttribute).set(particlePositions);
    geom.attributes.position.needsUpdate = true;
  });

  const particleGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    return g;
  }, [particlePositions]);

  const brightness = Math.min(1.0, 0.4 + Math.abs(powerKw) * 0.015);

  return (
    <group>
      {/* Outer translucent conduit */}
      <mesh geometry={tubeGeom}>
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.6}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Energy flow animated particles */}
      {!reducedMotion && (
        <points ref={particlesRef} geometry={particleGeom}>
          <pointsMaterial
            color={color}
            size={0.22}
            sizeAttenuation
            transparent
            opacity={brightness}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};
