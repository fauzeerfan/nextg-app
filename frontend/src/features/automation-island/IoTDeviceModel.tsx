import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { DeviceType } from './LayoutData';

interface IoTDeviceModelProps {
  device: {
    id: string;
    name: string;
    type: DeviceType;
    position: [number, number, number];
  };
  onClick: (device: any) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

const IoTDeviceModel: React.FC<IoTDeviceModelProps> = ({ device, onClick, isHovered, onHover }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = device.position[1] + Math.sin(clock.getElapsedTime() * 3 + device.position[0]) * 0.1;
      groupRef.current.rotation.y += 0.01;
    }
  });

  const renderDeviceShape = () => {
    switch (device.type) {
      case 'sparsha':
        // COUNTER – kotak dengan display
        return (
          <group>
            {/* Badan utama */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.2, 0.15]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
            </mesh>
            {/* Layar display */}
            <mesh position={[0, 0.15, 0.1]}>
              <boxGeometry args={[0.25, 0.12, 0.02]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Angka di layar */}
            <Text position={[0, 0.15, 0.12]} fontSize={0.12} color="#10b981" anchorX="center" anchorY="middle">
              123
            </Text>
            {/* Tombol hijau di samping */}
            <mesh position={[0.18, -0.05, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
              <meshStandardMaterial color="#10b981" />
            </mesh>
          </group>
        );
      case 'dhristi':
        // SCANNER – handheld scanner
        return (
          <group rotation={[0, Math.PI / 4, 0]}>
            {/* Pegangan */}
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.35, 16]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Kepala scanner */}
            <mesh position={[0, 0.05, 0.1]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.15, 0.1, 0.3]} />
              <meshStandardMaterial color="#c084fc" emissive="#c084fc" emissiveIntensity={0.4} />
            </mesh>
            {/* Jendela scan */}
            <mesh position={[0, 0.05, 0.26]}>
              <planeGeometry args={[0.08, 0.04]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            {/* Trigger kuning */}
            <mesh position={[0, -0.1, 0.04]}>
              <boxGeometry args={[0.03, 0.06, 0.05]} />
              <meshStandardMaterial color="#fbbf24" />
            </mesh>
          </group>
        );
      case 'pc':
        return (
          <group>
            <mesh position={[0, 0.1, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.05]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0, 0.1, 0.026]}>
              <boxGeometry args={[0.55, 0.35, 0.01]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[0.2, 0.05, 0.2]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.2]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        );
      case 'tablet':
        return (
          <mesh rotation={[-Math.PI / 6, 0, 0]}>
            <boxGeometry args={[0.4, 0.6, 0.04]} />
            <meshStandardMaterial color="#1e293b" />
            <mesh position={[0, 0, 0.021]}>
               <boxGeometry args={[0.35, 0.55, 0.01]} />
               <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.2} />
            </mesh>
          </mesh>
        );
      case 'scanner':
        return (
          <group rotation={[Math.PI / 4, 0, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[0.1, 0.3, 0.1]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, 0.05, 0.1]}>
              <boxGeometry args={[0.15, 0.15, 0.3]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <mesh position={[0, 0.05, 0.26]}>
              <planeGeometry args={[0.1, 0.05]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </group>
        );
      default:
        return (
          <>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#ffffff" />
          </>
        );
    }
  };

  return (
    <group position={[device.position[0], 0, device.position[2]]}>
      <mesh
        ref={groupRef}
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick(device); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(device.id); }}
        onPointerOut={() => onHover(null)}
        scale={isHovered ? 1.4 : 1.1}
      >
        {renderDeviceShape()}
      </mesh>
      
      <Text
        position={[0, device.position[1] + 0.5, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#0f172a"
      >
        {device.type.toUpperCase()}
      </Text>
    </group>
  );
};

export default IoTDeviceModel;