import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CableProps {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  powerKw?: number;        // controls speed/brightness
  direction?: 1 | -1;     // 1 = start→end, -1 = end→start
  segments?: number;
}

const PARTICLE_COUNT = 6;

export default function Cable({ start, end, color = '#2dd4bf', powerKw = 1, direction = 1, segments = 20 }: CableProps) {
  const particlesRef = useRef<THREE.Points>(null);
  const progressRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT).map((_, i) => i / PARTICLE_COUNT));

  const curve = useMemo(() => {
    const s = new THREE.Vector3(...start);
    const e = new THREE.Vector3(...end);
    const mid = s.clone().lerp(e, 0.5).add(new THREE.Vector3(0, 0.4, 0));
    return new THREE.QuadraticBezierCurve3(s, mid, e);
  }, [start, end]);

  const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, segments, 0.04, 6, false), [curve, segments]);

  const particlePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;
    const speed = Math.min(0.6, 0.05 + powerKw * 0.008) * direction;
    const arr = progressRef.current;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i] = ((arr[i] + speed * delta + 1) % 1);
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

  const brightness = Math.min(1.5, 0.4 + powerKw * 0.02);

  return (
    <group>
      <mesh geometry={tubeGeom}>
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      <points ref={particlesRef} geometry={particleGeom}>
        <pointsMaterial
          color={color}
          size={0.18}
          sizeAttenuation
          transparent
          opacity={brightness}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
