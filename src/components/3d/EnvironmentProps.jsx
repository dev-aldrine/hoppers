import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { isInsideAnyBuilding, isNearRoad } from './cityData';

// 🌲 Low-Poly Cartoon Pine Tree
export function CartoonPineTree({ position = [0, 0, 0], scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 1.5, 8]} />
        <meshStandardMaterial color="#6f4e37" roughness={0.8} />
      </mesh>
      {/* Tier 1 Cone */}
      <mesh castShadow receiveShadow position={[0, 1.8, 0]}>
        <coneGeometry args={[1.5, 1.6, 7]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.6} />
      </mesh>
      {/* Tier 2 Cone */}
      <mesh castShadow receiveShadow position={[0, 2.7, 0]}>
        <coneGeometry args={[1.2, 1.4, 7]} />
        <meshStandardMaterial color="#40916c" roughness={0.6} />
      </mesh>
      {/* Tier 3 Top Cone */}
      <mesh castShadow receiveShadow position={[0, 3.5, 0]}>
        <coneGeometry args={[0.85, 1.2, 7]} />
        <meshStandardMaterial color="#52b788" roughness={0.6} />
      </mesh>
    </group>
  );
}

// 🌳 Low-Poly Cartoon Round Oak Tree
export function CartoonOakTree({ position = [0, 0, 0], scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh castShadow receiveShadow position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.25, 0.45, 2.0, 8]} />
        <meshStandardMaterial color="#58311e" roughness={0.8} />
      </mesh>
      {/* Foliage Spheres Cluster */}
      <mesh castShadow receiveShadow position={[0, 2.6, 0]}>
        <sphereGeometry args={[1.4, 10, 10]} />
        <meshStandardMaterial color="#38b000" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0.7, 2.3, 0.4]}>
        <sphereGeometry args={[1.0, 8, 8]} />
        <meshStandardMaterial color="#70e000" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.6, 2.4, -0.3]}>
        <sphereGeometry args={[1.1, 8, 8]} />
        <meshStandardMaterial color="#38b000" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 3.4, 0.2]}>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshStandardMaterial color="#9ef01a" roughness={0.7} />
      </mesh>
    </group>
  );
}

// 🌸 Single Low-Poly Flower Cluster from GLB (Strictly No Shadows)
function LowPolyFlowerPatch({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1.0 }) {
  const { scene } = useGLTF('/models/low_poly_flowers.glb');

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isLight) {
        child.visible = false;
      }
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={cloned}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

// 🌸 Colorful Low-Poly Flower Field
export function FlowerField({ count = 80, arenaRadius = 80 }) {
  const flowerData = useMemo(() => {
    const items = [];
    let attempts = 0;
    while (items.length < count && attempts < count * 8) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const r = 12 + Math.sqrt(Math.random()) * (arenaRadius * 0.85);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      
      // Check road coordinate distance
      if (isNearRoad(x, z, 2.8)) continue;

      // Check building & construction plot distance
      if (isInsideAnyBuilding(x, z, 2.0)) continue;

      const scale = 0.9 + Math.random() * 0.7;
      const rotY = Math.random() * Math.PI * 2;
      items.push({
        x,
        z,
        rotY,
        scale,
      });
    }
    return items;
  }, [count, arenaRadius]);

  return (
    <group>
      {flowerData.map((f, i) => (
        <LowPolyFlowerPatch
          key={i}
          position={[f.x, 0.05, f.z]}
          rotation={[0, f.rotY, 0]}
          scale={f.scale}
        />
      ))}
    </group>
  );
}

// 🌈 Vibrant Sky Rainbow Arc
export function SkyRainbow({
  position = [0, 16, -35],
  rotation = [0, Math.PI / 12, 0],
  radius = 34,
}) {
  return (
    <group position={position} rotation={rotation}>
      {['#ff0000', '#ff7700', '#ffee00', '#00ff00', '#0099ff', '#8800ff'].map((c, idx) => (
        <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + idx * 0.5, radius + (idx + 1) * 0.5, 64, 1, 0, Math.PI]} />
          <meshBasicMaterial
            color={c}
            side={THREE.DoubleSide}
            transparent
            opacity={0.38}
          />
        </mesh>
      ))}
    </group>
  );
}

// 🦋 Fluttering Colorful Butterflies
export function Butterflies({ count = 8, arenaRadius = 22 }) {
  const butterfliesRef = useRef([]);

  const data = useMemo(() => {
    const list = [];
    const colors = ['#00e5ff', '#ff007f', '#ffe600', '#ffffff'];
    for (let i = 0; i < count; i++) {
      list.push({
        baseAngle: (i / count) * Math.PI * 2,
        radius: 6 + Math.random() * (arenaRadius * 0.6),
        height: 1.2 + Math.random() * 1.8,
        speed: 0.8 + Math.random() * 0.8,
        flapSpeed: 18 + Math.random() * 8,
        color: colors[i % colors.length],
      });
    }
    return list;
  }, [count, arenaRadius]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    butterfliesRef.current.forEach((ref, idx) => {
      if (!ref) return;
      const b = data[idx];
      const angle = b.baseAngle + t * b.speed * 0.4;
      const x = Math.cos(angle) * (b.radius + Math.sin(t * 1.2 + idx) * 2);
      const z = Math.sin(angle) * (b.radius + Math.cos(t * 1.2 + idx) * 2);
      const y = b.height + Math.sin(t * 2.5 + idx) * 0.5;

      ref.position.set(x, y, z);
      ref.rotation.y = -angle + Math.PI / 2;
      ref.rotation.z = Math.sin(t * b.flapSpeed) * 0.6;
    });
  });

  return (
    <group>
      {data.map((b, i) => (
        <group key={i} ref={(el) => (butterfliesRef.current[i] = el)}>
          {/* Left Wing */}
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, 0.4]}>
            <planeGeometry args={[0.2, 0.16]} />
            <meshBasicMaterial color={b.color} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          {/* Right Wing */}
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, -0.4]}>
            <planeGeometry args={[0.2, 0.16]} />
            <meshBasicMaterial color={b.color} side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          {/* Center Body */}
          <mesh>
            <sphereGeometry args={[0.04, 4, 4]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ⛰️ Low-Poly Mountain Ring Surrounding the Circular Map
export function MountainValleyRing({ radius = 28 }) {
  // Generate outer perimeter mountain peaks
  const mountains = useMemo(() => {
    const items = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = radius + 2.5 + (Math.sin(i * 3.5) * 2.5);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      
      const width = 4.5 + (Math.sin(i * 2.7) + 1.2) * 2.0;
      const height = 7.0 + (Math.cos(i * 1.9) + 1.3) * 4.5; // 7m to 18m tall peaks
      const depth = width * 0.9;
      
      const isSnowCapped = height > 11.5;
      const color = i % 3 === 0 ? '#4f772d' : i % 3 === 1 ? '#31572c' : '#52796f';

      items.push({ x, z, width, height, depth, color, isSnowCapped, angle });
    }
    return items;
  }, [radius]);

  return (
    <group>
      {mountains.map((m, idx) => (
        <group key={idx} position={[m.x, 0, m.z]} rotation={[0, m.angle, 0]}>
          {/* Main Mountain Cone Peak */}
          <mesh castShadow receiveShadow position={[0, m.height / 2, 0]}>
            <coneGeometry args={[m.width, m.height, 6]} />
            <meshStandardMaterial
              color={m.color}
              roughness={0.85}
              flatShading
            />
          </mesh>

          {/* Snow Cap on tall peaks */}
          {m.isSnowCapped && (
            <mesh castShadow receiveShadow position={[0, m.height * 0.82, 0]}>
              <coneGeometry args={[m.width * 0.32, m.height * 0.36, 6]} />
              <meshStandardMaterial
                color="#ffffff"
                roughness={0.6}
                flatShading
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

useGLTF.preload('/models/low_poly_flowers.glb');

