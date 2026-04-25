import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { StationLayout } from './LayoutData';

interface StationModelProps {
  layout: StationLayout;
  onClick: (layout: StationLayout) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

const StationModel: React.FC<StationModelProps> = ({ layout, onClick, isHovered, onHover }) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(isHovered ? 1.1 : 1, isHovered ? 1.1 : 1, isHovered ? 1.1 : 1),
        0.15
      );
    }
  });

  return (
    <group
      ref={meshRef}
      position={layout.position}
      onClick={(e) => { e.stopPropagation(); onClick(layout); }}
      onPointerOver={(e) => { e.stopPropagation(); onHover(layout.id); }}
      onPointerOut={() => onHover(null)}
    >
      <mesh position={[0, -0.4, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.2, 2.4]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 1.6, 2]} />
        <meshStandardMaterial color={isHovered ? '#f8fafc' : '#ffffff'} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[2.05, 0.15, 2.05]} />
        <meshStandardMaterial color={layout.color} emissive={layout.color} emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, 0.15]} castShadow>
        <boxGeometry args={[2.2, 0.2, 2.2]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      {/* Pintu diletakkan di depan mengarah ke jalan */}
      <mesh position={[0, 0.3, 1.01]}>
        <boxGeometry args={[0.6, 0.8, 0.05]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#0f172a"
        maxWidth={3}
      >
        {layout.name}
      </Text>
    </group>
  );
};

export default StationModel;