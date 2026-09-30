import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CartoonPineTree,
  CartoonOakTree,
  FlowerField,
} from './EnvironmentProps';
import { ProceduralTerrain } from './ProceduralTerrain';
import { PumpTownCity } from './PumpTownCity';

// Procedural Cartoon Floating Cloud with Safe Camera Proximity Dissolve
function CartoonCloud({ position, scale = 1, speed = 0.5 }) {
  const ref = useRef();
  const groupRef = useRef();

  useFrame(({ camera }, delta) => {
    if (!ref.current) return;
    ref.current.position.x += speed * delta;
    if (ref.current.position.x > 110) {
      ref.current.position.x = -110;
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

export function WorldArena({
  radius = 24,
  launchedBuildings = {},
  onSelectPlot,
}) {
  // Visible drifting clouds positioned high in the sky (height increased by 60%)
  const clouds = useMemo(
    () => [
      { pos: [-38, 35.2, -28], scale: 2.4, speed: 0.75 },
      { pos: [18, 41.6, -42], scale: 3.0, speed: 0.5 },
      { pos: [-22, 40.0, 22], scale: 2.6, speed: 0.65 },
      { pos: [34, 32.0, 28], scale: 2.2, speed: 0.85 },
      { pos: [5, 44.8, 5], scale: 3.2, speed: 0.45 },
      { pos: [-45, 30.4, 12], scale: 2.4, speed: 0.7 },
      { pos: [38, 38.4, -20], scale: 2.6, speed: 0.6 },
      { pos: [-12, 35.2, -45], scale: 3.2, speed: 0.4 },
      { pos: [24, 41.6, 42], scale: 2.5, speed: 0.8 },
      { pos: [-32, 38.4, 35], scale: 2.2, speed: 0.65 },
    ],
    []
  );

  // Perimeter Trees scattered naturally around the foothills and shoreline
  const perimeterTrees = useMemo(() => {
    const list = [];
    const count = 72;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 2) * 0.18);
      const r = radius * 0.95 + (Math.cos(i * 3) * 3.5);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const isPine = i % 2 === 0;
      const scale = 1.2 + Math.random() * 0.8;
      list.push({ x, z, isPine, scale });
    }
    return list;
  }, [radius]);

  return (
    <group>
      {/* ⛰️🌊 Low-Poly Procedural Perlin Mountain & Water Terrain (Super Big Island) */}
      <ProceduralTerrain
        innerRadius={radius + 35}
        outerSize={850}
        segments={160}
      />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <CartoonCloud key={i} position={c.pos} scale={c.scale} speed={c.speed} />
      ))}

      {/* 🏙️ PumpTown City: Town Hall, Buildings, Roads & Active Construction Plots */}
      <PumpTownCity
        launchedBuildings={launchedBuildings}
        onSelectPlot={onSelectPlot}
      />

      {/* Colorful Flower Field */}
      <FlowerField count={100} arenaRadius={radius} />

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

