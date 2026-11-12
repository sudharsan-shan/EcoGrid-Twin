import { Text } from '@react-three/drei';
import { useSimStore } from '../../store/simStore';
import type { RoomLoad } from '../../types';
import Appliance from './Appliance';

interface RoomProps {
  roomLoad: RoomLoad;
  label: string;
  position: [number, number, number];
  size: [number, number]; // [width, depth]
  wallHeight?: number;
  wallColor?: string;
}

// Appliance layout offsets within a room
const APPLIANCE_OFFSETS: [number, number, number][] = [
  [-0.8, 0, -0.6],
  [0.8, 0, -0.6],
  [-0.8, 0, 0.6],
  [0.8, 0, 0.6],
  [0, 0, -0.8],
  [0, 0, 0.8],
];

export default function Room({ roomLoad, label, position, size, wallHeight = 2.4, wallColor = '#334155' }: RoomProps) {
  const selectItem = useSimStore(s => s.selectItem);
  const selectedId = useSimStore(s => s.selectedId);
  const isSelected = selectedId === roomLoad.roomId;
  const [w, d] = size;
  const wallT = 0.12;

  return (
    <group position={position}>
      {/* Floor */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={e => { e.stopPropagation(); selectItem(roomLoad.roomId); }}
      >
        <planeGeometry args={[w - wallT, d - wallT]} />
        <meshStandardMaterial
          color={isSelected ? '#1e3a5f' : '#1e293b'}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Walls – 4 sides as thin boxes */}
      {/* North */}
      <mesh position={[0, wallHeight / 2, -d / 2]} castShadow>
        <boxGeometry args={[w, wallHeight, wallT]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* South */}
      <mesh position={[0, wallHeight / 2, d / 2]} castShadow>
        <boxGeometry args={[w, wallHeight, wallT]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* West */}
      <mesh position={[-w / 2, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[wallT, wallHeight, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* East */}
      <mesh position={[w / 2, wallHeight / 2, 0]} castShadow>
        <boxGeometry args={[wallT, wallHeight, d]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.05} />
      </mesh>

      {/* Room label on floor */}
      <Text
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color={isSelected ? '#7dd3fc' : '#94a3b8'}
        anchorX="center"
        anchorY="middle"
        maxWidth={w - 0.5}
      >
        {label}
      </Text>

      {/* kW label */}
      <Text
        position={[0, 0.04, 0.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.22}
        color="#22d3ee"
        anchorX="center"
        anchorY="middle"
      >
        {roomLoad.kw.toFixed(1)} kW
      </Text>

      {/* Appliances */}
      {roomLoad.appliances.map((app, i) => (
        <Appliance
          key={app.id}
          appliance={app}
          position={APPLIANCE_OFFSETS[i % APPLIANCE_OFFSETS.length]}
        />
      ))}

      {/* Selection glow ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.95, 32]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}
