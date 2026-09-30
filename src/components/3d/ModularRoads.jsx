import React, { useMemo } from 'react';
import * as THREE from 'three';

export const TILE_SIZE = 8.0;
export const ROAD_WIDTH = 4.0;
export const HALF_TILE = TILE_SIZE / 2; // 4.0

// Shared Road Materials with zero Z-fighting offsets
const roadMat = new THREE.MeshStandardMaterial({
  color: '#2b2d42',
  roughness: 0.85,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});

const curbMat = new THREE.MeshStandardMaterial({
  color: '#8d99ae',
  roughness: 0.65,
});

const yellowLineMat = new THREE.MeshStandardMaterial({
  color: '#ffd166',
  emissive: '#ffd166',
  emissiveIntensity: 0.3,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});

const whiteLineMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: '#ffffff',
  emissiveIntensity: 0.25,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});

// -------------------------------------------------------------
// 1. 🛣️ STRAIGHT ROAD TILE
// Clean asphalt ribbon with side curbs
// -------------------------------------------------------------
export function StraightRoad({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Asphalt Roadway */}
      <mesh position={[0, 0.02, 0]} receiveShadow material={roadMat}>
        <boxGeometry args={[ROAD_WIDTH, 0.04, TILE_SIZE]} />
      </mesh>

      {/* Slim Raised Curbs on Borders */}
      <mesh position={[-ROAD_WIDTH / 2, 0.038, 0]} receiveShadow material={curbMat}>
        <boxGeometry args={[0.18, 0.04, TILE_SIZE]} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2, 0.038, 0]} receiveShadow material={curbMat}>
        <boxGeometry args={[0.18, 0.04, TILE_SIZE]} />
      </mesh>

      {/* Dashed Center Yellow Line */}
      {[-2.2, 0, 2.2].map((z, i) => (
        <mesh key={i} position={[0, 0.044, z]} receiveShadow material={yellowLineMat}>
          <boxGeometry args={[0.16, 0.008, 1.4]} />
        </mesh>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// 2. ↩️ 90° CORNER ROAD TILE (Turn Left / Turn Right)
// -------------------------------------------------------------
export function CornerRoad({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Quarter-Circle Curved Road Arc around pivot (+4, -4) */}
      <group position={[HALF_TILE, 0.02, -HALF_TILE]}>
        {/* Asphalt Curved Ribbon */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={roadMat}>
          <ringGeometry args={[2.0, 6.0, 32, 1, Math.PI, Math.PI / 2]} />
        </mesh>
        {/* Inner Curved Curb */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={curbMat}>
          <ringGeometry args={[1.9, 2.1, 32, 1, Math.PI, Math.PI / 2]} />
        </mesh>
        {/* Outer Curved Curb */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={curbMat}>
          <ringGeometry args={[5.9, 6.1, 32, 1, Math.PI, Math.PI / 2]} />
        </mesh>
        {/* Curved Center Yellow Dashed Line */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={yellowLineMat}>
          <ringGeometry args={[3.92, 4.08, 32, 1, Math.PI + 0.1, Math.PI / 2 - 0.2]} />
        </mesh>
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// 3. ➕ 4-WAY INTERSECTION TILE
// -------------------------------------------------------------
export function IntersectionRoad({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Asphalt Center Cross Base */}
      <mesh position={[0, 0.02, 0]} receiveShadow material={roadMat}>
        <boxGeometry args={[ROAD_WIDTH, 0.04, TILE_SIZE]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow material={roadMat}>
        <boxGeometry args={[TILE_SIZE, 0.04, ROAD_WIDTH]} />
      </mesh>

      {/* 4 Corner Curbs */}
      {[-ROAD_WIDTH / 2, ROAD_WIDTH / 2].map((x) =>
        [-ROAD_WIDTH / 2, ROAD_WIDTH / 2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x > 0 ? x + 0.09 : x - 0.09, 0.038, z > 0 ? z + 0.09 : z - 0.09]} receiveShadow material={curbMat}>
            <boxGeometry args={[0.18, 0.04, 0.18]} />
          </mesh>
        ))
      )}

      {/* Clean Pedestrian Zebra Crosswalks */}
      <ZebraCrosswalk position={[0, 0.044, -HALF_TILE + 0.7]} rotation={0} />
      <ZebraCrosswalk position={[0, 0.044, HALF_TILE - 0.7]} rotation={0} />
    </group>
  );
}

// -------------------------------------------------------------
// 4. 🔀 3-WAY T-INTERSECTION TILE (Seamless Full Branch)
// -------------------------------------------------------------
export function TIntersectionRoad({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Main Through-Road (North to South) */}
      <mesh position={[0, 0.02, 0]} receiveShadow material={roadMat}>
        <boxGeometry args={[ROAD_WIDTH, 0.04, TILE_SIZE]} />
      </mesh>
      {/* Branch Road (Heading East: from center x=0 to x=HALF_TILE) */}
      <mesh position={[HALF_TILE / 2, 0.02, 0]} receiveShadow material={roadMat}>
        <boxGeometry args={[HALF_TILE, 0.04, ROAD_WIDTH]} />
      </mesh>

      {/* Continuous Curb on the Closed West Side */}
      <mesh position={[-ROAD_WIDTH / 2, 0.038, 0]} receiveShadow material={curbMat}>
        <boxGeometry args={[0.18, 0.04, TILE_SIZE]} />
      </mesh>
      {/* Corner curbs on open East side */}
      <mesh position={[ROAD_WIDTH / 2 + 0.09, 0.038, -ROAD_WIDTH / 2 - 0.09]} receiveShadow material={curbMat}>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 + 0.09, 0.038, ROAD_WIDTH / 2 + 0.09]} receiveShadow material={curbMat}>
        <boxGeometry args={[0.18, 0.04, 0.18]} />
      </mesh>

      {/* 1 Zebra Crosswalk at the Branch Entry */}
      <ZebraCrosswalk position={[HALF_TILE - 0.7, 0.044, 0]} rotation={Math.PI / 2} />
    </group>
  );
}

// -------------------------------------------------------------
// 5. 🛑 DEAD END / CUL-DE-SAC TILE
// -------------------------------------------------------------
export function DeadEndRoad({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Roadway leading to turnaround */}
      <mesh position={[0, 0.02, 0.8]} receiveShadow material={roadMat}>
        <boxGeometry args={[ROAD_WIDTH, 0.04, TILE_SIZE - 1.6]} />
      </mesh>
      {/* Rounded Turning Circle */}
      <mesh position={[0, 0.022, -0.6]} receiveShadow material={roadMat}>
        <cylinderGeometry args={[2.8, 2.8, 0.04, 24]} />
      </mesh>
      {/* Rounded End Curb */}
      <mesh position={[0, 0.038, -0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={curbMat}>
        <ringGeometry args={[2.7, 2.9, 24, 1, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// Helper: Zebra Crosswalk
// -------------------------------------------------------------
function ZebraCrosswalk({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[-1.35, -0.75, -0.15, 0.45, 1.05].map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} receiveShadow material={whiteLineMat}>
          <boxGeometry args={[0.32, 0.008, 1.1]} />
        </mesh>
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// 🗺️ MASTER MODULAR ROAD GRID
// -------------------------------------------------------------
export function ModularRoadGrid({ tiles = [] }) {
  return (
    <group name="modular-road-network">
      {tiles.map((tile, idx) => {
        const posX = tile.gx * TILE_SIZE;
        const posZ = tile.gz * TILE_SIZE;
        const rot = tile.rot || 0;

        switch (tile.type) {
          case 'straight':
            return <StraightRoad key={`road-${idx}`} position={[posX, 0, posZ]} rotation={rot} />;
          case 'corner':
          case 'turn_left':
          case 'turn_right':
            return <CornerRoad key={`road-${idx}`} position={[posX, 0, posZ]} rotation={rot} />;
          case 'intersection':
          case 'cross':
            return <IntersectionRoad key={`road-${idx}`} position={[posX, 0, posZ]} />;
          case 't_intersection':
          case '3way':
            return <TIntersectionRoad key={`road-${idx}`} position={[posX, 0, posZ]} rotation={rot} />;
          case 'dead_end':
            return <DeadEndRoad key={`road-${idx}`} position={[posX, 0, posZ]} rotation={rot} />;
          default:
            return <StraightRoad key={`road-${idx}`} position={[posX, 0, posZ]} rotation={rot} />;
        }
      })}
    </group>
  );
}
