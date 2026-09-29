import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SafeHtml } from './SafeHtml';
import { soundManager } from '../../audio/soundEffects';
import {
  calculateTotalInches,
  calculateTotalShaftScale,
  calculateBaseInches,
  calculateHodlGrowthInches,
  formatInches,
  inchesToCm,
  inchesToMm,
  formatMm,
  formatHodlDuration,
} from '../../solana/growthMechanics';

// Color Palettes for skin & head variations
export const SKIN_PALETTES = [
  // Natural skin tones
  {
    name: 'Ivory Pale',
    color: '#fed8b1',
    headColor: '#ff99aa', // Rosy pink head
    emissive: '#000000',
    roughness: 0.72,
  },
  {
    name: 'Warm Tan',
    color: '#dfa663',
    headColor: '#e57c74', // Coral-pink head
    emissive: '#000000',
    roughness: 0.72,
  },
  {
    name: 'Golden Bronze',
    color: '#c4813d',
    headColor: '#d26662', // Rosy bronze head
    emissive: '#000000',
    roughness: 0.70,
  },
  {
    name: 'Rich Espresso',
    color: '#8a5220',
    headColor: '#a64943', // Warm mahogany pink head
    emissive: '#000000',
    roughness: 0.75,
  },
  {
    name: 'Deep Cocoa',
    color: '#4d2f1c',
    headColor: '#782d28', // Deep terracotta head
    emissive: '#000000',
    roughness: 0.80,
  },
  // Meme & Degen tiers
  {
    name: '✨ 24K Pure Gold',
    color: '#ffd700',
    headColor: '#ff9900', // Rich amber gold head
    emissive: '#331c00',
    roughness: 0.22,
    metalness: 0.85,
    glow: true,
  },
  {
    name: '💎 Diamond Hands',
    color: '#00e5ff',
    headColor: '#7a00ff', // Violet cyan diamond head
    emissive: '#002936',
    roughness: 0.18,
    metalness: 0.75,
    glow: true,
  },
  {
    name: '🌸 Neon Anime Pink',
    color: '#ff2a85',
    headColor: '#ff66b2', // Vibrant bubblegum pink head
    emissive: '#330018',
    roughness: 0.45,
    glow: true,
  },
  {
    name: '👽 Alien Degen',
    color: '#39ff14',
    headColor: '#00e676', // Toxic neon emerald head
    emissive: '#0a3300',
    roughness: 0.50,
    glow: true,
  },
  {
    name: '🔥 Laser Red',
    color: '#ff003c',
    headColor: '#ff5500', // Blazing fiery orange-red head
    emissive: '#330000',
    roughness: 0.40,
    glow: true,
  },
  {
    name: '👑 Royal Purple',
    color: '#9d00ff',
    headColor: '#e040fb', // Electric orchid magenta head
    emissive: '#220033',
    roughness: 0.50,
    glow: true,
  },
];

export function calculateShaftScale(solAmount) {
  const sol = Math.max(0.01, Number(solAmount) || 0.1);
  const scale = 1.0 + Math.log10(1 + sol * 2.0) * 0.75;
  return Math.min(2.8, Math.max(1.0, scale));
}

// Get tier emoji based on SOL purchase size
export function getTierEmoji(solAmount) {
  const sol = Number(solAmount) || 0;
  if (sol >= 10.0) return '👑'; // Gigachad Whale
  if (sol >= 5.0) return '🐳';  // Whale
  if (sol >= 2.0) return '🦈';  // Shark
  if (sol >= 0.5) return '🐬';  // Dolphin
  if (sol >= 0.1) return '🐟';  // Fish
  return '🦐';                  // Shrimp
}

// Shared Body & Head Material Caches
const SHARED_BODY_MATERIALS = new Map();
const SHARED_HEAD_MATERIALS = new Map();
let sharedEyesMaterial = null;
let sharedMouthMaterial = null;

function getSharedBodyMaterial(palette) {
  const key = palette.name;
  if (!SHARED_BODY_MATERIALS.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.color),
      emissive: new THREE.Color(palette.emissive || '#000000'),
      roughness: palette.roughness ?? 0.75,
      metalness: palette.metalness ?? 0.0,
      envMapIntensity: palette.glow ? 1.5 : 0.8,
    });
    SHARED_BODY_MATERIALS.set(key, mat);
  }
  return SHARED_BODY_MATERIALS.get(key);
}

function getSharedHeadMaterial(palette) {
  const key = palette.name;
  if (!SHARED_HEAD_MATERIALS.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.headColor || palette.color),
      emissive: new THREE.Color(palette.emissive || '#000000'),
      roughness: (palette.roughness ?? 0.75) * 0.9,
      metalness: palette.metalness ?? 0.0,
      envMapIntensity: palette.glow ? 1.5 : 0.8,
    });
    SHARED_HEAD_MATERIALS.set(key, mat);
  }
  return SHARED_HEAD_MATERIALS.get(key);
}

function getSharedEyesMaterial(originalMat) {
  if (!sharedEyesMaterial && originalMat) {
    sharedEyesMaterial = originalMat.clone();
    sharedEyesMaterial.roughness = 0.35;
    sharedEyesMaterial.metalness = 0.0;
  }
  return sharedEyesMaterial || originalMat;
}

function getSharedMouthMaterial(originalMat) {
  if (!sharedMouthMaterial && originalMat) {
    sharedMouthMaterial = originalMat.clone();
    sharedMouthMaterial.roughness = 0.35;
    sharedMouthMaterial.metalness = 0.0;
  }
  return sharedMouthMaterial || originalMat;
}

// Isolated Lightweight Overhead Tag Component
function OverheadTag({
  wallet,
  emoji,
  isWinner,
  isMegaWhale,
  isWhale,
  isHovered,
  tagScale,
  winnerInfo,
}) {
  return (
    <div
      className={`npc-overhead-tag enhanced-tag ${
        isWinner ? 'prize-winner' : isMegaWhale ? 'mega-whale' : isWhale ? 'whale' : ''
      } ${isHovered ? 'hovered' : ''}`}
      style={{ transform: `scale(${tagScale})` }}
    >
      {isWinner ? (
        <span className="badge-winner-tag">
          🏆 #{winnerInfo.rank} ({wallet})
        </span>
      ) : (
        <>
          <span className="badge-emoji">{emoji}</span>
          <span className="badge-wallet">{wallet}</span>
        </>
      )}
    </div>
  );
}

// Cached Soft Ground Blob Shadow Texture
let sharedBlobShadowTexture = null;

function getSharedBlobShadowTexture() {
  if (!sharedBlobShadowTexture && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(8, 20, 5, 0.85)');
    gradient.addColorStop(0.35, 'rgba(8, 20, 5, 0.60)');
    gradient.addColorStop(0.70, 'rgba(8, 20, 5, 0.22)');
    gradient.addColorStop(1.0, 'rgba(8, 20, 5, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    sharedBlobShadowTexture = new THREE.CanvasTexture(canvas);
  }
  return sharedBlobShadowTexture;
}

export function DickNPC({
  id,
  wallet = '7xK4...9pZm',
  fullWallet = '7xK4aBcDeFgHiJkLmNoPqRsTuVwXyZ9pZm',
  solAmount = 0.5,
  skinIndex = 0,
  initialPosition = [0, 0, 0],
  spawnTimestamp = Date.now(),
  bonusMinutes = 0,
  growthRatePerMin = 1.5,
  targetInches = 69.0,
  winnerInfo = null, // { rank: 1, prizeSol: "2.00" } if winner
  arenaRadius = 24,
  overallScale = 7.5,
  groundOffset = 0.2,
  isStationary = false,
  tagOffsetY = -0.26,
  tagScale = 1.60,
  overrideShaftScale,
  overrideInches,
  hideTag = false,
  isFollowed = false,
  onUpdateHeadPos,
  onSelect,
}) {
  const groupRef = useRef();
  const tagGroupRef = useRef();
  const dustRef = useRef();
  const shadowRef = useRef();
  const { scene } = useGLTF('/models/dick.glb');

  const palette = SKIN_PALETTES[skinIndex % SKIN_PALETTES.length];

  const shadowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getSharedBlobShadowTexture(),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, []);

  // Clone scene deeply and assign shared cached materials
  const { clonedScene, shaftNode, headNode, ballsNode } = useMemo(() => {
    const cloned = scene.clone(true);
    const bodyMat = getSharedBodyMaterial(palette);
    const headMat = getSharedHeadMaterial(palette);

    let shaft = null;
    let head = null;
    let balls = null;

    cloned.traverse((node) => {
      const name = (node.name || '').toLowerCase();
      const parentName = (node.parent?.name || '').toLowerCase();

      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
        node.frustumCulled = true;

        if (name.includes('eye')) {
          // Keep original cartoon white + pupil eyes texture
          node.material = getSharedEyesMaterial(node.material);
        } else if (name.includes('mouth') || parentName.includes('mouth')) {
          // Keep original cartoon smile mouth texture
          node.material = getSharedMouthMaterial(node.material);
        } else if (
          name.includes('sphere') ||
          parentName === 'head' ||
          (parentName.includes('head') && !name.includes('eye') && !name.includes('mouth'))
        ) {
          // Head glans spheres get distinct rosy / complementary head palette color
          node.material = headMat;
        } else {
          // Shaft & balls get body skin palette
          node.material = bodyMat;
        }
      }

      if (name === 'shaft') {
        shaft = node;
      } else if (name === 'head') {
        head = node;
      } else if (name === 'balls') {
        balls = node;
      }
    });

    if (balls) {
      balls.position.set(0, 0, 0);
    }

    return {
      clonedScene: cloned,
      shaftNode: shaft,
      headNode: head,
      ballsNode: balls,
    };
  }, [scene, palette]);

  // Movement & Smooth Physics State
  const state = useRef({
    currentPos: new THREE.Vector3(initialPosition[0], 0, initialPosition[2]),
    targetPos: new THREE.Vector3(
      (Math.random() - 0.5) * (arenaRadius * 1.2),
      0,
      (Math.random() - 0.5) * (arenaRadius * 1.2)
    ),
    hopPhase: Math.random() * Math.PI * 2,
    hopSpeed: 4.2 + Math.random() * 1.6,
    moveSpeed: 3.8 + Math.random() * 2.2,
    rotation: Math.random() * Math.PI * 2,
    smoothSquashY: 1.0,
    smoothSquashXZ: 1.0,
    smoothWobbleZ: 0.0,
    smoothTiltX: 0.0,
    dustOpacity: 0.0,
    dustScale: 0.1,
    currentInches: overrideInches ?? calculateTotalInches(solAmount, spawnTimestamp, growthRatePerMin, bonusMinutes),
    currentScaleY: overrideShaftScale ?? 1.0,
    initialized: false,
  });

  const [isHovered, setIsHovered] = useState(false);

  // Pick new random target within arena
  const pickNewTarget = () => {
    const angle = Math.random() * Math.PI * 2;
    const r = (0.2 + Math.random() * 0.75) * (arenaRadius * 0.85);
    state.current.targetPos.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  };

  const SHAFT_BOTTOM_OFFSET = 0.140625;
  const SHAFT_HEIGHT = 0.375;
  const HEAD_BASE_Y = 0.5825;

  // Animation Frame Loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const s = state.current;
    const dt = Math.min(delta, 0.08);

    // 1. Calculate Real-Time HODL Growth & Mesh Scaling
    const inches = overrideInches !== undefined
      ? overrideInches
      : calculateTotalInches(solAmount, spawnTimestamp, growthRatePerMin, bonusMinutes);
    s.currentInches = inches;
    const shaftScaleY = overrideShaftScale !== undefined
      ? overrideShaftScale
      : calculateTotalShaftScale(inches);
    s.currentScaleY = shaftScaleY;

    if (shaftNode) {
      shaftNode.scale.set(1, shaftScaleY, 1);
      shaftNode.position.y = -SHAFT_BOTTOM_OFFSET * shaftScaleY;
    }
    if (headNode) {
      headNode.position.y = HEAD_BASE_Y + SHAFT_HEIGHT * (shaftScaleY - 1);
    }

    // Dynamic vertical anchor points for Tag
    const headPeakY = HEAD_BASE_Y + SHAFT_HEIGHT * (shaftScaleY - 1) + 0.08;
    const tagFinalY = headPeakY + 0.15 + tagOffsetY;

    if (tagGroupRef.current) {
      tagGroupRef.current.position.y = tagFinalY;
    }

    if (isStationary) {
      groupRef.current.position.set(s.currentPos.x, groundOffset, s.currentPos.z);
      groupRef.current.rotation.set(0, s.rotation, 0);
      groupRef.current.scale.set(overallScale, overallScale, overallScale);
      if (shadowRef.current) {
        shadowRef.current.position.set(0, (0.025 - groundOffset) / overallScale, 0);
        shadowRef.current.rotation.set(-Math.PI / 2, 0, 0);
        shadowRef.current.scale.set(0.42, 0.42, 0.42);
        if (shadowRef.current.material) shadowRef.current.material.opacity = 0.72;
      }
      if (isFollowed && onUpdateHeadPos) {
        const worldHeadX = s.currentPos.x;
        const worldHeadY = groundOffset + (headPeakY - 0.04) * overallScale;
        const worldHeadZ = s.currentPos.z;
        onUpdateHeadPos(worldHeadX, worldHeadY, worldHeadZ);
      }
      return;
    }

    // 2. Hop Cycle Calculation
    s.hopPhase = (s.hopPhase + s.hopSpeed * dt) % (Math.PI * 2);
    const hopProgress = s.hopPhase / (Math.PI * 2);
    const hopHeight = (0.55 + Math.min(1.2, shaftScaleY * 0.06)) * (overallScale / 7.5);

    let currentHopY = 0;
    let targetSquashY = 1.0;
    let targetSquashXZ = 1.0;
    let targetTiltX = 0.0;

    if (hopProgress < 0.65) {
      // AIRBORNE PHASE
      const airT = hopProgress / 0.65;
      currentHopY = Math.sin(airT * Math.PI) * hopHeight;

      const verticalVelocity = Math.cos(airT * Math.PI);
      targetSquashY = 1.0 + Math.sin(airT * Math.PI) * 0.12 + Math.max(0, verticalVelocity) * 0.08;
      targetSquashXZ = 1.0 / Math.sqrt(targetSquashY);
      targetTiltX = Math.sin(airT * Math.PI) * 0.1;

      s.dustOpacity = Math.max(0, s.dustOpacity - 4 * dt);
    } else {
      // GROUND IMPACT PHASE
      const groundT = (hopProgress - 0.65) / 0.35;
      currentHopY = 0;

      const squashIntensity = Math.sin(groundT * Math.PI);
      targetSquashY = 1.0 - squashIntensity * 0.18;
      targetSquashXZ = 1.0 + squashIntensity * 0.12;
      targetTiltX = 0;

      if (groundT < 0.35) {
        s.dustOpacity = (1.0 - groundT / 0.35) * 0.7;
        s.dustScale = 0.6 + groundT * 1.5;
      }
    }

    // Update head position for camera follower
    if (isFollowed && onUpdateHeadPos) {
      const worldHeadX = s.currentPos.x;
      const worldHeadY = currentHopY + groundOffset + (headPeakY - 0.04) * overallScale;
      const worldHeadZ = s.currentPos.z;
      onUpdateHeadPos(worldHeadX, worldHeadY, worldHeadZ);
    }

    // 3. Smooth Lerping
    const lerpRate = Math.min(16 * dt, 1.0);
    s.smoothSquashY += (targetSquashY - s.smoothSquashY) * lerpRate;
    s.smoothSquashXZ += (targetSquashXZ - s.smoothSquashXZ) * lerpRate;
    s.smoothTiltX += (targetTiltX - s.smoothTiltX) * lerpRate;

    const targetWobbleZ = Math.sin(s.hopPhase * 1.5) * 0.05 * (shaftScaleY > 3 ? 1.2 : 0.7);
    s.smoothWobbleZ += (targetWobbleZ - s.smoothWobbleZ) * Math.min(12 * dt, 1.0);

    // 4. Autonomous Wander Movement
    const dir = new THREE.Vector3().subVectors(s.targetPos, s.currentPos);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 1.2 * (overallScale / 7.5)) {
      pickNewTarget();
    } else {
      dir.normalize();
      if (hopProgress < 0.65) {
        const movePower = Math.sin((hopProgress / 0.65) * Math.PI);
        s.currentPos.addScaledVector(dir, s.moveSpeed * dt * (0.5 + movePower * 1.2));
      }

      const targetAngle = Math.atan2(dir.x, dir.z);
      let diffAngle = targetAngle - s.rotation;
      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
      s.rotation += diffAngle * Math.min(6 * dt, 1.0);
    }

    // 5. Transformations (100% controlled in useFrame, no React JSX prop reset)
    groupRef.current.position.set(
      s.currentPos.x,
      currentHopY + groundOffset,
      s.currentPos.z
    );
    groupRef.current.rotation.set(s.smoothTiltX, s.rotation, s.smoothWobbleZ);
    groupRef.current.scale.set(
      s.smoothSquashXZ * overallScale,
      s.smoothSquashY * overallScale,
      s.smoothSquashXZ * overallScale
    );

    // 6. Update Ground Dark Circle Blob Shadow (Pinned flat to ground: shrinks & softens in air, expands on ground)
    if (shadowRef.current) {
      const localGroundY = (0.025 - (currentHopY + groundOffset)) / (s.smoothSquashY * overallScale);
      shadowRef.current.position.set(0, localGroundY, 0);
      shadowRef.current.rotation.set(-Math.PI / 2 - s.smoothTiltX, 0, -s.smoothWobbleZ);

      const airRatio = hopHeight > 0 ? Math.min(1.0, Math.max(0, currentHopY / hopHeight)) : 0;
      const baseShadowRadius = 0.48 / Math.max(0.7, s.smoothSquashXZ);
      // When jumping high: shrinks by ~45%; when on ground: expands to full size
      const currentShadowScale = baseShadowRadius * (1.0 - airRatio * 0.45);

      shadowRef.current.scale.set(currentShadowScale, currentShadowScale, currentShadowScale);
      if (shadowRef.current.material) {
        // When on ground: dark (0.80); when high in air: softens down to ~0.35
        shadowRef.current.material.opacity = 0.80 * (1.0 - airRatio * 0.55);
      }
    }

    // 7. Update Landing Dust Puff
    if (dustRef.current) {
      const localGroundY = (0.02 - (currentHopY + groundOffset)) / (s.smoothSquashY * overallScale);
      dustRef.current.position.set(0, localGroundY, 0);
      dustRef.current.rotation.set(-Math.PI / 2 - s.smoothTiltX, 0, -s.smoothWobbleZ);
      dustRef.current.scale.set(s.dustScale, s.dustScale, s.dustScale);
      dustRef.current.material.opacity = s.dustOpacity;
    }
  });

  const isWhale = solAmount >= 2.0;
  const isMegaWhale = solAmount >= 5.0;
  const isWinner = Boolean(winnerInfo);
  const emoji = winnerInfo ? '🏆' : getTierEmoji(solAmount);

  const baseInches = calculateBaseInches(solAmount);
  const hodlInches = calculateHodlGrowthInches(spawnTimestamp, growthRatePerMin, bonusMinutes);
  const initialScaleY = overrideShaftScale !== undefined 
    ? overrideShaftScale 
    : calculateTotalShaftScale(calculateTotalInches(solAmount, spawnTimestamp, growthRatePerMin, bonusMinutes));
  const initialHeadPeakY = HEAD_BASE_Y + SHAFT_HEIGHT * (initialScaleY - 1) + 0.08;

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        soundManager.playHop(1.2);
        if (onSelect) {
          onSelect({ id, wallet, fullWallet, solAmount });
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        setIsHovered(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        setIsHovered(false);
      }}
    >
      <primitive object={clonedScene} />

      {/* 🌑 High-Performance Dynamic Ground Blob Shadow */}
      <mesh
        ref={shadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        material={shadowMat}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* 💨 Cartoon Landing Impact Dust Puff Ring */}
      <mesh
        ref={dustRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <ringGeometry args={[0.15, 0.38, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          side={THREE.DoubleSide}
          transparent
          opacity={0}
        />
      </mesh>

      {/* 🏷️ 3D Overhead Name, Inches & Buy Tag (Optimized non-blocking projection) */}
      {!hideTag && (
        <group ref={tagGroupRef} position={[0, initialHeadPeakY + 0.15 + tagOffsetY, 0]}>
          <SafeHtml
            center
            distanceFactor={22}
            occlude={false}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <OverheadTag
              wallet={wallet}
              emoji={emoji}
              isWinner={isWinner}
              isMegaWhale={isMegaWhale}
              isWhale={isWhale}
              isHovered={isHovered}
              tagScale={tagScale}
              winnerInfo={winnerInfo}
            />
          </SafeHtml>
        </group>
      )}
    </group>
  );
}

useGLTF.preload('/models/dick.glb');
useGLTF.preload('/models/king_crown.glb');

export default DickNPC;
