import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CartoonPineTree,
  CartoonOakTree,
  FlowerField,
  SkyRainbow,
  Butterflies,
} from './EnvironmentProps';
import { ProceduralTerrain } from './ProceduralTerrain';

// Procedural Cartoon Floating Cloud with Safe Camera Proximity Dissolve
function CartoonCloud({ position, scale = 1, speed = 0.5 }) {
  const ref = useRef();
  const groupRef = useRef();

  useFrame(({ camera }, delta) => {
    if (!ref.current) return;
    ref.current.position.x += speed * delta;
    if (ref.current.position.x > 75) {
      ref.current.position.x = -75;
    }

    // ☁️ Dissolve only when camera is extremely close (< 6 units) to prevent interior clipping
    const worldPos = new THREE.Vector3();
    ref.current.getWorldPosition(worldPos);
    const dist = camera.position.distanceTo(worldPos);

    const alpha = THREE.MathUtils.clamp((dist - 4) / 6, 0, 1);
    
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = alpha < 0.99;
          child.material.opacity = alpha;
        }
      });
      groupRef.current.visible = alpha > 0.05;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      <group ref={groupRef}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[1.8, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[1.4, -0.2, 0.3]}>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[-1.4, -0.2, -0.2]}>
          <sphereGeometry args={[1.4, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[0.4, 0.8, -0.2]}>
          <sphereGeometry args={[1.2, 16, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
        <mesh position={[-0.5, 0.6, 0.4]}>
          <sphereGeometry args={[1.0, 14, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// Procedural 3D Cartoon Sun Model
function CartoonSun({
  position = [-2.0, 26.0, 32.0],
  rotation = [0, 0, 0],
  scale = 1.0,
}) {
  const sunRaysRef = useRef();

  useFrame((_, delta) => {
    if (sunRaysRef.current) {
      sunRaysRef.current.rotation.z += 0.3 * delta;
    }
  });

  const rays = useMemo(() => {
    const arr = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      arr.push({ angle });
    }
    return arr;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Glowing Sun Center Sphere */}
      <mesh>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffb703"
          emissive="#fb8500"
          emissiveIntensity={1.2}
          roughness={0.2}
        />
      </mesh>

      {/* Rotating Sun Corona Rays */}
      <group ref={sunRaysRef}>
        {rays.map((r, i) => (
          <group key={i} rotation={[0, 0, r.angle]}>
            <mesh position={[0, 4.4, 0]}>
              <coneGeometry args={[0.9, 2.2, 16]} />
              <meshStandardMaterial
                color="#ffd166"
                emissive="#ffb703"
                emissiveIntensity={0.9}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Soft Sun Aura Glow */}
      <mesh>
        <sphereGeometry args={[4.2, 24, 24]} />
        <meshBasicMaterial
          color="#ffb703"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function WorldArena({
  radius = 24,
  sunPosition = [-2.0, 26.0, 32.0],
  sunRotation = [0, 0, 0],
  sunScale = 1.0,
  rainbowPosition = [0, 15, -34],
  rainbowRotation = [0, 0.26, 0],
  rainbowRadius = 34,
}) {
  // Visible drifting clouds positioned around the arena horizon & sky
  const clouds = useMemo(
    () => [
      { pos: [-38, 22, -28], scale: 2.2, speed: 0.75 },
      { pos: [18, 26, -42], scale: 2.8, speed: 0.5 },
      { pos: [-22, 25, 22], scale: 2.4, speed: 0.65 },
      { pos: [34, 20, 28], scale: 2.0, speed: 0.85 },
      { pos: [5, 28, 5], scale: 2.9, speed: 0.45 },
      { pos: [-45, 19, 12], scale: 2.2, speed: 0.7 },
      { pos: [38, 24, -20], scale: 2.4, speed: 0.6 },
      { pos: [-12, 22, -45], scale: 3.0, speed: 0.4 },
      { pos: [24, 26, 42], scale: 2.3, speed: 0.8 },
      { pos: [-32, 24, 35], scale: 2.0, speed: 0.65 },
    ],
    []
  );

  // Perimeter Trees scattered naturally around the foothills and shoreline
  const perimeterTrees = useMemo(() => {
    const list = [];
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 2) * 0.18);
      const r = radius * 0.88 + (Math.cos(i * 3) * 2.0);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const isPine = i % 2 === 0;
      const scale = 1.0 + Math.random() * 0.5;
      list.push({ x, z, isPine, scale });
    }
    return list;
  }, [radius]);

  return (
    <group>
      {/* 3D Sun Model */}
      <CartoonSun
        position={sunPosition}
        rotation={sunRotation}
        scale={sunScale}
      />

      {/* ⛰️🌊 Low-Poly Procedural Perlin Mountain & Water Terrain */}
      <ProceduralTerrain
        innerRadius={radius + 4}
        outerSize={190}
        segments={85}
      />

      {/* 🌈 Dynamic Sky Rainbow Arc */}
      <SkyRainbow
        position={rainbowPosition}
        rotation={rainbowRotation}
        radius={rainbowRadius}
      />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <CartoonCloud key={i} position={c.pos} scale={c.scale} speed={c.speed} />
      ))}

      {/* Colorful Flower Field */}
      <FlowerField count={45} arenaRadius={radius} />

      {/* Fluttering Butterflies */}
      <Butterflies count={12} arenaRadius={radius} />

      {/* Perimeter Cartoon Pine & Oak Trees */}
      {perimeterTrees.map((tree, i) =>
        tree.isPine ? (
          <CartoonPineTree
            key={i}
            position={[tree.x, 0.1, tree.z]}
            scale={tree.scale}
          />
        ) : (
          <CartoonOakTree
            key={i}
            position={[tree.x, 0.1, tree.z]}
            scale={tree.scale}
          />
        )
      )}
    </group>
  );
}
