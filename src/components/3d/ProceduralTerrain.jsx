import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Deterministic 2D Simplex/Perlin Noise Generator with Fixed Seed
class SimplexNoise2D {
  constructor(seed = 4242) {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    
    // Fully deterministic Lehmer / Park-Miller PRNG permutation shuffle
    let s = (Math.abs(seed) || 4242) % 2147483647;
    if (s === 0) s = 1;

    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const tmp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = tmp;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const grad3 = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [1, 0], [-1, 0],
      [0, 1], [0, -1], [0, 1], [0, -1],
    ];

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0.0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0.0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0.0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  // Fractal Brownian Motion (Multi-octave noise)
  fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }
    return total / maxValue;
  }
}

export function ProceduralTerrain({
  innerRadius = 24, // Flat grass arena radius in center
  outerSize = 180,  // Terrain span
  segments = 85,    // Low poly mesh resolution
  seed = 4242,      // Fixed deterministic seed
}) {
  const waterRef = useRef();

  // Generate Low-Poly Flat-Shaded Terrain Geometry with Fixed Deterministic Seed
  const { geometry } = useMemo(() => {
    const simplex = new SimplexNoise2D(seed);
    const plane = new THREE.PlaneGeometry(outerSize, outerSize, segments, segments);
    plane.rotateX(-Math.PI / 2);

    const pos = plane.attributes.position;

    const cSand = new THREE.Color('#e9d8a6');
    const cLushGrass = new THREE.Color('#48bb35');
    const cDeepForest = new THREE.Color('#2d6a4f');
    const cRock = new THREE.Color('#6c757d');
    const cSnow = new THREE.Color('#ffffff');

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);

      let y = 0;

      if (dist <= innerRadius) {
        // Flat center island for characters
        y = 0;
      } else {
        // Multi-octave mountain and valley noise
        const n1 = simplex.fbm(x * 0.018, z * 0.018, 4, 2.0, 0.5);
        const n2 = simplex.fbm(x * 0.045, z * 0.045, 2, 2.0, 0.4);
        const mountainShape = Math.pow(Math.max(0, n1 + 0.35), 2.2) * 26.0 + n2 * 4.0;
        const valleyDip = n1 * 5.0 - 2.5;

        const rawY = n1 > 0 ? mountainShape : valleyDip;

        // Smoothly blend from 0 at innerRadius to full height outside
        const blend = Math.min(1.0, Math.max(0.0, (dist - innerRadius) / 10.0));
        const smoothBlend = blend * blend * (3.0 - 2.0 * blend); // smoothstep
        y = rawY * smoothBlend;
      }

      pos.setY(i, y);
    }

    // Convert to non-indexed for crisp low-poly faceted flat shading
    const nonIndexed = plane.toNonIndexed();
    nonIndexed.computeVertexNormals();

    const nonIndexedPos = nonIndexed.attributes.position;
    const vertexColors = [];

    // Assign biome colors per vertex based on height
    for (let i = 0; i < nonIndexedPos.count; i++) {
      const y = nonIndexedPos.getY(i);
      const x = nonIndexedPos.getX(i);
      const z = nonIndexedPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);

      let color = cLushGrass;

      if (dist <= innerRadius + 1.0) {
        color = cLushGrass;
      } else if (y < -0.2) {
        color = cSand; // Underwater sandy valley bed
      } else if (y < 0.6) {
        color = cSand; // Shore / Beach
      } else if (y < 4.5) {
        color = cLushGrass; // Lowland grass
      } else if (y < 9.0) {
        color = cDeepForest; // Highland forest
      } else if (y < 14.5) {
        color = cRock; // Mountain Rock
      } else {
        color = cSnow; // Snow peak
      }

      vertexColors.push(color.r, color.g, color.b);
    }

    nonIndexed.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    return { geometry: nonIndexed };
  }, [innerRadius, outerSize, segments, seed]);

  // Subtle animated ocean/lake ripples
  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.getElapsedTime();
    waterRef.current.position.y = -0.15 + Math.sin(t * 1.5) * 0.05;
  });

  return (
    <group>
      {/* ⛰️ Low-Poly Procedural Mountain Terrain with Biome Colors */}
      <mesh name="terrain-mesh" geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.82}
          metalness={0.08}
          flatShading
        />
      </mesh>

      {/* 🌊 Sparkling Stylized Water Layer Filling the Valleys */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.15, 0]}
        receiveShadow
      >
        <planeGeometry args={[outerSize * 1.1, outerSize * 1.1, 16, 16]} />
        <meshStandardMaterial
          color="#00b4d8"
          roughness={0.15}
          metalness={0.7}
          transparent
          opacity={0.78}
        />
      </mesh>

      {/* Deep Ocean Bed Sub-Plate */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -4.5, 0]}
      >
        <planeGeometry args={[outerSize * 1.2, outerSize * 1.2]} />
        <meshStandardMaterial color="#0077b6" roughness={0.9} />
      </mesh>
    </group>
  );
}
