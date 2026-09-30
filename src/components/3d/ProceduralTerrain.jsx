import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Deterministic 2D Simplex/Perlin Noise Generator with Fixed Seed
class SimplexNoise2D {
  constructor(seed = 4242) {
    this.p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) this.p[i] = i;
    
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
  innerRadius = 125, // Flat city arena radius
  outerSize = 650,    // Full horizon mountain span
  segments = 140,     // Optimal resolution for clean low-poly facets
  seed = 4242,
}) {
  const waterRef = useRef();

  // Generate Harmonious Low-Poly Terraced & Rolling Mountain Ranges
  const { geometry } = useMemo(() => {
    const simplex = new SimplexNoise2D(seed);
    const plane = new THREE.PlaneGeometry(outerSize, outerSize, segments, segments);
    plane.rotateX(-Math.PI / 2);

    const pos = plane.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);

      let y = 0;

      if (dist <= innerRadius) {
        // Flat ground for the metropolis city
        y = 0;
      } else {
        // 1. Broad Continental Mountain Ridges (Low-frequency rolling waves)
        const nMajor = simplex.fbm(x * 0.0055, z * 0.0055, 3, 2.0, 0.5);
        
        // 2. Rolling Alpine Foothills & Peaks (Medium-frequency rounded noise)
        const nRolling = simplex.fbm(x * 0.012, z * 0.012, 3, 2.1, 0.45);

        // 3. Smooth Non-Pointy Ridge Transformation (Plateau / Rolling Wave)
        // Instead of sharp exponential powers (which cause needle spikes),
        // we use soft sinusoidal wave curves and smoothed plateaus
        const wave1 = Math.sin((nMajor + 0.4) * Math.PI * 0.85);
        const wave2 = Math.cos((nRolling + 0.2) * Math.PI * 0.9);
        
        // Soft mountain elevation: scenic rolling hills and low-profile ridges
        let mountainHeight = Math.max(0, wave1 * 0.65 + wave2 * 0.35);
        mountainHeight = Math.pow(mountainHeight, 1.25) * 18.5;

        // Subtle terracing / stratification for clean low-poly aesthetic
        const terraceStep = 2.5;
        const terracedH = Math.floor(mountainHeight / terraceStep) * terraceStep;
        const terraceFract = (mountainHeight % terraceStep) / terraceStep;
        const smoothTerrace = terracedH + Math.pow(terraceFract, 2.0) * terraceStep;
        mountainHeight = THREE.MathUtils.lerp(mountainHeight, smoothTerrace, 0.30);

        // Coastal Valleys and Inlets
        const valleyDip = (nMajor - 0.25) * 4.5;
        const rawY = nMajor > -0.1 ? mountainHeight : valleyDip;

        // Smooth transition from flat town border into gentle foothills and rolling ridges
        const blendDist = Math.max(0.0, Math.min(1.0, (dist - innerRadius) / 32.0));
        const smoothstepBlend = blendDist * blendDist * (3.0 - 2.0 * blendDist);
        y = rawY * smoothstepBlend;
      }

      pos.setY(i, y);
    }

    // Convert to non-indexed for crisp, beautiful faceted low-poly shading
    const nonIndexed = plane.toNonIndexed();
    nonIndexed.computeVertexNormals();

    const nonIndexedPos = nonIndexed.attributes.position;
    const normals = nonIndexed.attributes.normal;
    const vertexColors = [];

    // 🎨 Curated Lush Sunny Biome Palette (No Snow)
    const cSand = new THREE.Color('#e9d8a6');          // Warm Golden Beach / Coast
    const cGrass = new THREE.Color('#48bb35');         // Lush Lowland Meadow
    const cHighlandGreen = new THREE.Color('#38b000'); // Sunny Highland Green
    const cPineGreen = new THREE.Color('#2d6a4f');     // Deep Alpine Pine Forest
    const cSlateRock = new THREE.Color('#5c677d');     // Steep Cliff Slate Rock
    const cLightRock = new THREE.Color('#8d99ae');     // Sunny Rocky Outcrops & Ledges

    for (let i = 0; i < nonIndexedPos.count; i++) {
      const y = nonIndexedPos.getY(i);
      const x = nonIndexedPos.getX(i);
      const z = nonIndexedPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const ny = normals ? normals.getY(i) : 1.0; // Slope vertical normal: 1 = flat, < 0.7 = steep cliff

      let color = cGrass;

      if (dist <= innerRadius + 2.0) {
        color = cGrass;
      } else if (y < 0.2) {
        color = cSand; // Golden Shore / Beach
      } else if (ny < 0.65 && y > 2.0) {
        // Steep cliff face -> Slate Mountain Rock
        color = y > 10.0 ? cLightRock : cSlateRock;
      } else if (y < 5.0) {
        color = cGrass; // Lowland rolling meadow
      } else if (y < 11.0) {
        color = cPineGreen; // Highland alpine pine forest
      } else {
        color = cHighlandGreen; // Sunny lush green summit ridges
      }

      vertexColors.push(color.r, color.g, color.b);
    }



    nonIndexed.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    return { geometry: nonIndexed };
  }, [innerRadius, outerSize, segments, seed]);

  // Subtle animated ocean ripples in valleys
  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.getElapsedTime();
    waterRef.current.position.y = -0.12 + Math.sin(t * 1.2) * 0.04;
  });

  return (
    <group>
      {/* ⛰️ Beautiful Low-Poly Terraced & Rolling Mountain Ranges */}
      <mesh name="terrain-mesh" geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          roughness={0.78}
          metalness={0.06}
          flatShading
        />
      </mesh>

      {/* 🌊 Crystal Turquoise Lagoon Water in Coastal Inlets */}
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.12, 0]}
        receiveShadow
      >
        <planeGeometry args={[outerSize * 1.15, outerSize * 1.15, 16, 16]} />
        <meshStandardMaterial
          color="#00b4d8"
          roughness={0.12}
          metalness={0.65}
          transparent
          opacity={0.80}
        />
      </mesh>

      {/* Deep Sea Floor Sub-Layer */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -6.0, 0]}
      >
        <planeGeometry args={[outerSize * 1.25, outerSize * 1.25]} />
        <meshStandardMaterial color="#0077b6" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default ProceduralTerrain;
