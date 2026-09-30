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
  outerSize = 850,
  segments = 160,
  seed = 4242,
  summitHeight = 56.0,
}) {
  const waterRef = useRef();

  // Generate Harmonious Low-Poly Terrain with Grand Towering Crown Mountain
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

      // 🏔️ 1. Towering Majestic Center Crown Mountain Peak (0 to 58m radius)
      if (dist <= 58.0) {
        if (dist <= 6.0) {
          // Flat summit plateau for the King pedestal at Y = summitHeight
          y = summitHeight;
        } else {
          // Ascending conical mountain profile with lush natural facets
          const t = (dist - 6.0) / 52.0; // 0 at summit rim, 1 at mountain base
          const baseProfile = Math.cos(t * Math.PI * 0.5);
          const rawElevation = THREE.MathUtils.lerp(0.0, summitHeight, Math.pow(baseProfile, 1.35));
          
          // Natural organic slopes
          const slopeNoise = simplex.noise(x * 0.06, z * 0.06) * 1.8;
          const terraceStep = 3.5;
          const steppedY = Math.floor(rawElevation / terraceStep) * terraceStep;
          const blendY = THREE.MathUtils.lerp(rawElevation + slopeNoise, steppedY, 0.18);
          y = Math.max(0.0, blendY);
        }
      } 
      // 🌿 2. Lush Valley Meadows (58m to 105m radius)
      else if (dist < 105.0) {
        const nGentle = simplex.fbm(x * 0.015, z * 0.015, 2, 2.0, 0.5);
        y = Math.max(0.0, nGentle * 1.8);
      } 
      // ⛰️ 3. Surrounding Rolling Mountain Ridges & Horizon Peaks (105m+)
      else {
        const nMajor = simplex.fbm(x * 0.005, z * 0.005, 3, 2.0, 0.5);
        const nRolling = simplex.fbm(x * 0.012, z * 0.012, 3, 2.1, 0.45);

        const wave1 = Math.sin((nMajor + 0.4) * Math.PI * 0.85);
        const wave2 = Math.cos((nRolling + 0.2) * Math.PI * 0.9);
        
        let mountainHeight = Math.max(0, wave1 * 0.65 + wave2 * 0.35);
        mountainHeight = Math.pow(mountainHeight, 1.25) * 26.0;

        const terraceStep = 3.0;
        const terracedH = Math.floor(mountainHeight / terraceStep) * terraceStep;
        mountainHeight = THREE.MathUtils.lerp(mountainHeight, terracedH, 0.2);

        const blendDist = Math.max(0.0, Math.min(1.0, (dist - 105.0) / 40.0));
        const smoothstepBlend = blendDist * blendDist * (3.0 - 2.0 * blendDist);
        y = mountainHeight * smoothstepBlend;
      }

      pos.setY(i, y);
    }

    // Convert to non-indexed for crisp, beautiful faceted low-poly shading
    const nonIndexed = plane.toNonIndexed();
    nonIndexed.computeVertexNormals();

    const nonIndexedPos = nonIndexed.attributes.position;
    const normals = nonIndexed.attributes.normal;
    const vertexColors = [];

    // 🎨 Lush Vibrant Biome Color Palette (NO GRAY/STONE)
    const cBrightSpring = new THREE.Color('#70e000');     // Electric Sunny Spring Green
    const cLushMeadow = new THREE.Color('#38b000');       // Vibrant Lush Green
    const cDeepGreen = new THREE.Color('#2d6a4f');        // Deep Emerald Green Slope
    const cAlpineForest = new THREE.Color('#1b4332');     // Rich Alpine Evergreen
    const cGoldenHighland = new THREE.Color('#d8f3dc');   // Soft Highland Lime
    const cSunlitMoss = new THREE.Color('#52b788');       // Sunlit Summit Moss Green
    const cWarmGrass = new THREE.Color('#55a630');        // Warm Valley Meadow

    for (let i = 0; i < nonIndexedPos.count; i++) {
      const y = nonIndexedPos.getY(i);
      const x = nonIndexedPos.getX(i);
      const z = nonIndexedPos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const ny = normals ? normals.getY(i) : 1.0;

      let color = cLushMeadow;

      if (dist <= 7.0) {
        // Flat summit peak: Bright Emerald / Golden Highland
        color = cSunlitMoss;
      } else if (dist <= 58.0) {
        // Center Crown Mountain slopes: Rich multi-tone emeralds and vibrant greens (no gray!)
        if (ny < 0.65) {
          // Steeper slopes get rich deep emerald
          color = y > 24.0 ? cDeepGreen : cAlpineForest;
        } else if (y > 36.0) {
          color = cSunlitMoss;
        } else if (y > 18.0) {
          color = cWarmGrass;
        } else {
          color = cBrightSpring;
        }
      } else if (dist < 105.0) {
        // Valley floor: Bright spring meadows
        color = ny > 0.9 ? cBrightSpring : cLushMeadow;
      } else {
        // Outer mountain perimeter: Lush rolling green hills
        if (ny < 0.6) {
          color = cAlpineForest;
        } else if (y < 8.0) {
          color = cLushMeadow;
        } else if (y < 18.0) {
          color = cDeepGreen;
        } else {
          color = cSunlitMoss;
        }
      }

      vertexColors.push(color.r, color.g, color.b);
    }

    nonIndexed.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
    return { geometry: nonIndexed };
  }, [outerSize, segments, seed, summitHeight]);

  return (
    <group>
      {/* ⛰️ Low-Poly Terrain Mesh with Center Crown Mountain */}
      <mesh
        geometry={geometry}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.78}
          metalness={0.08}
          flatShading
        />
      </mesh>
    </group>
  );
}

export default ProceduralTerrain;
