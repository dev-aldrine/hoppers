import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CartoonPineTree,
  CartoonOakTree,
  FlowerField,
} from './EnvironmentProps';
import { ProceduralTerrain } from './ProceduralTerrain';
import { KingSummit3D } from './KingSummit3D';

// Procedural Cartoon Floating Cloud with Safe Camera Proximity Dissolve
function CartoonCloud({ position, scale = 1, speed = 0.5 }) {
  const ref = useRef();
  const groupRef = useRef();

  useFrame(({ camera }, delta) => {
    if (!ref.current) return;
    ref.current.position.x += speed * delta;
    if (ref.current.position.x > 140) {
      ref.current.position.x = -140;
    }

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
  crownedKing,
  timerSeconds = 60,
  timerDuration = 60,
  accumulatedFeesSol = 0.5,
  fallenKings = [],
  onRemoveFallenKing,
}) {
  // High drifting clouds
  const clouds = useMemo(
    () => [
      { pos: [-45, 42.0, -35], scale: 2.8, speed: 0.65 },
      { pos: [25, 48.0, -48], scale: 3.2, speed: 0.5 },
      { pos: [-30, 44.0, 32], scale: 2.8, speed: 0.6 },
      { pos: [42, 38.0, 35], scale: 2.4, speed: 0.75 },
      { pos: [8, 52.0, 8], scale: 3.5, speed: 0.4 },
      { pos: [-55, 38.0, 15], scale: 2.6, speed: 0.65 },
      { pos: [45, 46.0, -25], scale: 3.0, speed: 0.55 },
    ],
    []
  );

  // Foothill & Valley Trees around the mountain base (r in 45m to 85m)
  const trees = useMemo(() => {
    const list = [];
    const count = 64;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.sin(i * 3) * 0.25);
      const r = 48 + (Math.cos(i * 4) * 28);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const isPine = i % 2 === 0;
      const scale = 1.3 + Math.random() * 0.8;
      list.push({ x, z, isPine, scale });
    }
    return list;
  }, []);

  return (
    <group>
      {/* ⛰️ Low-Poly Terrain with Grand Center Crown Mountain (Summit Y=32.0) */}
      <ProceduralTerrain
        outerSize={850}
        segments={160}
        summitHeight={32.0}
      />

      {/* 👑 The Crown Summit Platform & Crowned King Character */}
      <KingSummit3D
        summitPos={[0, 32.0, 0]}
        crownedKing={crownedKing}
        timerSeconds={timerSeconds}
        timerDuration={timerDuration}
        accumulatedFeesSol={accumulatedFeesSol}
        fallenKings={fallenKings}
        onRemoveFallenKing={onRemoveFallenKing}
      />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <CartoonCloud key={i} position={c.pos} scale={c.scale} speed={c.speed} />
      ))}

      {/* Colorful Flower Field in the Valley */}
      <FlowerField count={120} arenaRadius={80} />

      {/* Foothill & Valley Pine/Oak Trees */}
      {trees.map((tree, i) =>
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

export default WorldArena;
