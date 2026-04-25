import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text, Sky, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import StationModel from './StationModel';
import IoTDeviceModel from './IoTDeviceModel';
import { STATION_LAYOUTS, IOT_DEVICE_LAYOUTS } from './LayoutData';

interface FactorySceneProps {
  onStationClick: (station: any) => void;
  onDeviceClick: (device: any) => void;
  zoomStation?: string | null;
  onZoomDone?: () => void;
}

// ---------- GUDANG BESAR ----------
const WarehouseBuilding = () => {
  const pos = STATION_LAYOUTS.find(s => s.id === 'WAREHOUSE')?.position || [-18, 0, -1.5];
  return (
    <group position={[pos[0], 0, pos[2]]}>
      {/* Bangunan utama */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 3, 3.5]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Atap (dua sisi miring) */}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[2.8, 1.2, 4]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Pintu besar menghadap ke depan (z positif) */}
      <mesh position={[0, 1.2, 1.76]} castShadow>
        <boxGeometry args={[1.8, 2.5, 0.15]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Jendela kecil di samping */}
      <mesh position={[-2.3, 2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[2.3, 2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.8, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {/* Label */}
      <Text position={[0, 4.2, 0]} fontSize={0.5} color="#f8fafc" anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#0f172a">
        WAREHOUSE
      </Text>
      {/* Simbol panah ke kanan (suplai) */}
      <mesh position={[2.8, 1.5, 0]} rotation={[0, 0, -Math.PI/2]}>
        <coneGeometry args={[0.3, 0.8, 8]} />
        <meshStandardMaterial color="#f59e0b" />
      </mesh>
    </group>
  );
};

// ---------- PULAU DENGAN VEGETASI & ELEMEN ALAM ----------
const Island = () => {
  return (
    <group>
      {/* Base Tanah diperpanjang ke kiri agar mencakup gudang */}
      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[44, 0.4, 10]} />
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      </mesh>
      {/* Rumput Atas */}
      <mesh position={[0, -0.35, 0]} receiveShadow>
        <boxGeometry args={[43.8, 0.08, 9.8]} />
        <meshStandardMaterial color="#7CBA3D" roughness={0.8} />
      </mesh>

      {/* Bebatuan di tepi pulau */}
      {[
        [20, -0.25, 3.5], [-20, -0.25, 3.5], [15, -0.25, -4.5], [-15, -0.25, -4.5],
        [21, -0.3, 0], [-21, -0.3, 0], [0, -0.3, 4.8], [0, -0.3, -4.8],
        [-19, -0.3, 3], [-19, -0.3, -4]
      ].map((pos, i) => (
        <mesh key={`rock-${i}`} position={pos as [number, number, number]} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.25 + Math.random() * 0.3, 0]} />
          <meshStandardMaterial color="#9CA3AF" roughness={0.6} />
        </mesh>
      ))}

      {/* Pohon-pohon */}
      {[
        [-16, -0.25, 3], [-14, -0.25, -3.5], [16, -0.25, -3.5], [14, -0.25, 3.5],
        [-10, -0.25, 4], [10, -0.25, -4], [-17, -0.25, -4], [17, -0.25, 4],
        [-19, -0.25, 3.5], [-19, -0.25, -3.8]
      ].map((pos, i) => (
        <group key={`tree-${i}`} position={pos as [number, number, number]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.6, 8]} />
            <meshStandardMaterial color="#78350F" roughness={0.8} />
          </mesh>
          {[0.5, 0.7, 0.9].map((y, j) => (
            <mesh key={`leaf-${j}`} position={[0, y, 0]} castShadow>
              <coneGeometry args={[0.25 - j * 0.05, 0.3, 8]} />
              <meshStandardMaterial color="#166534" roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Semak kecil */}
      {[...Array(10)].map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const radius = 3 + Math.random() * 1.5;
        const x = Math.cos(angle) * radius * 3.5;
        const z = Math.sin(angle) * radius * 0.8;
        return (
          <mesh key={`bush-${i}`} position={[x, -0.28, z]} castShadow>
            <coneGeometry args={[0.2, 0.25, 6]} />
            <meshStandardMaterial color="#15803D" roughness={0.5} />
          </mesh>
        );
      })}

      {/* Dermaga detail */}
      <group position={[18, -0.35, 2.5]}>
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[6, 0.15, 4]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {[[-2.5, -0.5, 1.5], [-2.5, -0.5, -1.5], [2.5, -0.5, 1.5], [2.5, -0.5, -1.5]].map((pos, i) => (
          <mesh key={`pier-pillar-${i}`} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.6, 8]} />
            <meshStandardMaterial color="#4a5568" roughness={0.5} />
          </mesh>
        ))}
        {[[-2, 0.15, 1.8], [2, 0.15, 1.8], [-2, 0.15, -1.8], [2, 0.15, -1.8]].map((pos, i) => (
          <mesh key={`bollard-${i}`} position={pos as [number, number, number]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.2, 8]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------- AIR IMPROVED ----------
const Water = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = -0.7 + Math.sin(clock.getElapsedTime() * 0.8) * 0.04;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]} receiveShadow>
      <planeGeometry args={[80, 40]} />
      <meshPhysicalMaterial
        color="#0ea5e9"
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.1}
        clearcoat={0.3}
        clearcoatRoughness={0.2}
      />
    </mesh>
  );
};

// ---------- KAPAL ----------
const CargoShip = () => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = -0.5 + Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
      ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.2) * 0.02;
    }
  });

  return (
    <group>
      <Text
        position={[17.5, 2.5, 1]}
        rotation={[0, -Math.PI / 4, 0]}
        fontSize={1.2}
        color="#ef4444"
        outlineWidth={0.08}
        outlineColor="#ffffff"
        fontWeight="bold"
      >
        SHIPPING
      </Text>
      <group ref={ref} position={[22, -0.5, 2.5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[8, 1.2, 2.5]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[7.8, 0.4, 2.4]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
        <mesh position={[-2.5, 1.5, 0]} castShadow>
          <boxGeometry args={[1.5, 1, 2]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[1, 1.4, 0]} castShadow>
          <boxGeometry args={[1.5, 1, 2]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>
        <mesh position={[2.8, 1.4, 0]} castShadow>
          <boxGeometry args={[1.5, 1, 2]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      </group>
    </group>
  );
};

// ---------- JALAN BERKELOK (FIXED & IMPROVED) ----------
const WindingRoad = () => {
  const curve = useMemo(() => {
    const points = [];
    const stations = STATION_LAYOUTS.map(s => new THREE.Vector3(s.position[0], 0, s.position[2]));
    for (let i = 0; i < stations.length - 1; i++) {
      const current = stations[i];
      const next = stations[i + 1];
      points.push(current);
      const midX = (current.x + next.x) / 2;
      const offsetZ = current.z + (i % 2 === 0 ? 1.8 : -1.8);
      points.push(new THREE.Vector3(midX, 0, offsetZ));
    }
    points.push(stations[stations.length - 1]);
    points.push(new THREE.Vector3(15, 0, 0.5));
    points.push(new THREE.Vector3(18, 0, 2.5));
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const dashedLines = useMemo(() => {
    const lines = [];
    const dashCount = 90;
    for (let i = 0; i < dashCount; i++) {
      const t = i / dashCount;
      const position = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const rotationY = Math.atan2(tangent.x, tangent.z);
      lines.push({
        position: [position.x, 0.02, position.z] as [number, number, number],
        rotationY
      });
    }
    return lines;
  }, [curve]);

  return (
    <group position={[0, -0.28, 0]}>
      {/* Base Jalan */}
      <mesh receiveShadow>
        <tubeGeometry args={[curve, 128, 0.4, 16, false]} />
        <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Marka putih lebih tebal */}
      {dashedLines.map((line, idx) => (
        <mesh
          key={`dash-${idx}`}
          position={line.position}
          rotation={[0, line.rotationY, 0]}
          receiveShadow
        >
          <boxGeometry args={[0.06, 0.02, 0.25]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- PARTIKEL ALIRAN MATERIAL ----------
const MaterialParticles = () => {
  const particlesRef = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const points = [];
    const stations = STATION_LAYOUTS.map(s => new THREE.Vector3(s.position[0], 0, s.position[2]));
    for (let i = 0; i < stations.length - 1; i++) {
      const current = stations[i];
      const next = stations[i + 1];
      points.push(current);
      const midX = (current.x + next.x) / 2;
      const offsetZ = current.z + (i % 2 === 0 ? 1.8 : -1.8);
      points.push(new THREE.Vector3(midX, 0, offsetZ));
    }
    points.push(stations[stations.length - 1]);
    points.push(new THREE.Vector3(15, 0, 0.5));
    points.push(new THREE.Vector3(18, 0, 2.5));
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 15; i++) {
      p.push({
        offset: (i / 15) * 0.9,
        speed: 0.02 + Math.random() * 0.06,
        color: new THREE.Color().setHSL(0.55 + i * 0.02, 0.8, 0.5)
      });
    }
    return p;
  }, []);

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    const t = (clock.getElapsedTime() * 0.1) % 1;
    particlesRef.current.children.forEach((child, i) => {
      const p = particles[i];
      const u = (t * p.speed + p.offset) % 1;
      const point = curve.getPointAt(u);
      child.position.set(point.x, 0.15, point.z);
    });
  });

  return (
    <group ref={particlesRef}>
      {particles.map((p, i) => (
        <mesh key={i} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- SCENE UTAMA ----------
const FactoryScene: React.FC<FactorySceneProps> = ({ onStationClick, onDeviceClick, zoomStation, onZoomDone }) => {
  const [hoverStation, setHoverStation] = useState<string | null>(null);
  const [hoverDevice, setHoverDevice] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);

  const devicesWithPos = useMemo(() =>
    IOT_DEVICE_LAYOUTS.map(d => {
      const st = STATION_LAYOUTS.find(s => s.id === d.stationId);
      const pos: [number, number, number] = st
        ? [st.position[0] + d.positionOffset[0], st.position[1] + d.positionOffset[1], st.position[2] + d.positionOffset[2]]
        : [0, 0, 0];
      return { ...d, position: pos };
    }), []
  );

useEffect(() => {
  if (!zoomStation || !controlsRef.current) return;

  let targetPos: THREE.Vector3;
  let targetLookAt: THREE.Vector3;

  if (zoomStation === 'SHIPPING') {
    // Koordinat kapal (CargoShip): [22, -0.5, 2.5]
    targetPos = new THREE.Vector3(22, 3, 8);
    targetLookAt = new THREE.Vector3(22, 0, 2.5);
  } else {
    const station = STATION_LAYOUTS.find(s => s.id === zoomStation);
    if (!station) return;
    targetPos = new THREE.Vector3(station.position[0], 2, station.position[2] + 6);
    targetLookAt = new THREE.Vector3(station.position[0], 0.5, station.position[2]);
  }

  let frameId: number;
  const duration = 1000;
  const startTime = performance.now();
  const startTarget = controlsRef.current.target.clone();
  const startCam = controlsRef.current.object.position.clone();

  const animateZoom = (now: number) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    controlsRef.current.target.lerpVectors(startTarget, targetLookAt, ease);
    controlsRef.current.object.position.lerpVectors(startCam, targetPos, ease);
    controlsRef.current.update();
    if (t < 1) {
      frameId = requestAnimationFrame(animateZoom);
    } else {
      controlsRef.current.target.copy(targetLookAt);
      controlsRef.current.object.position.copy(targetPos);
      controlsRef.current.update();
      if (onZoomDone) onZoomDone();
    }
  };
  frameId = requestAnimationFrame(animateZoom);
  return () => cancelAnimationFrame(frameId);
}, [zoomStation]);

  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-200 to-sky-400 rounded-xl overflow-hidden shadow-2xl">
      <Canvas shadows camera={{ position: [0, 12, 18], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[0, 12, 18]} fov={45} />
        <OrbitControls
          ref={controlsRef}
          enableDamping dampingFactor={0.1}
          maxPolarAngle={Math.PI / 2.2}
          minDistance={10}
          maxDistance={40}
          target={[0, 0, 0]}
        />

        <SoftShadows size={40} samples={16} focus={1} />
        <Sky sunPosition={[100, 20, 100]} />
        <fog attach="fog" args={['#e0f2fe', 30, 65]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 25, 15]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-25}
          shadow-camera-right={25}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />

        <Water />
        <Island />
        <WindingRoad />
        <CargoShip />
        <MaterialParticles />
        <WarehouseBuilding />

        {/* Stasiun: skip WAREHOUSE */}
        {STATION_LAYOUTS.filter(l => l.id !== 'WAREHOUSE').map(l => (
          <StationModel key={l.id} layout={l} onClick={onStationClick} isHovered={hoverStation === l.id} onHover={setHoverStation} />
        ))}

        {devicesWithPos.map(d => (
          <IoTDeviceModel key={d.id} device={d} onClick={onDeviceClick} isHovered={hoverDevice === d.id} onHover={setHoverDevice} />
        ))}

        <Environment preset="sunset" />
      </Canvas>
    </div>
  );
};

export default FactoryScene;