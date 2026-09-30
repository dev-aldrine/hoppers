import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { SafeHtml } from './SafeHtml';
import { soundManager } from '../../audio/soundEffects';
import { resolveBuildingCollisions, isInsideAnyBuilding } from './cityData';
import { registerCitizenPos, unregisterCitizenPos } from './TrafficRegistry';

// Distinct Vibrant Color Palettes & Styles for PumpTown Citizens & Builders
export const PLAYER_STYLES = [
  {
    name: 'Cyber Mint Builder',
    shirtColor: '#00f5d4',
    pantsColor: '#1d2d44',
    hairColor: '#3a2e39',
    skinColor: '#fcd5b5',
    shoesColor: '#2b2d42',
    role: '👷 Builder',
  },
  {
    name: 'Neon Sunset Architect',
    shirtColor: '#ff007f',
    pantsColor: '#7928ca',
    hairColor: '#ffd166',
    skinColor: '#dfa663',
    shoesColor: '#111111',
    role: '📐 Architect',
  },
  {
    name: 'Solar Gold Engineer',
    shirtColor: '#ffbe0b',
    pantsColor: '#fb5607',
    hairColor: '#4a2810',
    skinColor: '#fed8b1',
    shoesColor: '#333333',
    role: '🔨 Engineer',
  },
  {
    name: 'Electric Azure Planner',
    shirtColor: '#3a86ff',
    pantsColor: '#0d1b2a',
    hairColor: '#2b2d42',
    skinColor: '#c4813d',
    shoesColor: '#3a86ff',
    role: '🏗️ Planner',
  },
  {
    name: 'Toxic Emerald Mason',
    shirtColor: '#70e000',
    pantsColor: '#004b23',
    hairColor: '#1b4332',
    skinColor: '#dfa663',
    shoesColor: '#111111',
    role: '🧱 Mason',
  },
  {
    name: '✨ 24K Town Mayor',
    shirtColor: '#ffd700',
    pantsColor: '#ff9900',
    hairColor: '#fff099',
    skinColor: '#fed8b1',
    shoesColor: '#ffd700',
    glow: true,
    role: '👑 Mayor',
  },
  {
    name: '💎 Diamond Tycoon',
    shirtColor: '#00e5ff',
    pantsColor: '#0077b6',
    hairColor: '#90e0ef',
    skinColor: '#fed8b1',
    shoesColor: '#ffffff',
    glow: true,
    role: '💎 Tycoon',
  },
  {
    name: 'Crimson Contractor',
    shirtColor: '#ff0055',
    pantsColor: '#1d3557',
    hairColor: '#22223b',
    skinColor: '#8a5220',
    shoesColor: '#111111',
    role: '🚧 Contractor',
  },
  {
    name: 'Royal Purple Governor',
    shirtColor: '#9d4edd',
    pantsColor: '#240046',
    hairColor: '#3c096c',
    skinColor: '#4d2f1c',
    shoesColor: '#ffffff',
    role: '🏛️ Governor',
  },
  {
    name: 'Stealth Developer',
    shirtColor: '#2b2d42',
    pantsColor: '#181925',
    hairColor: '#111111',
    skinColor: '#dfa663',
    shoesColor: '#ff3366',
    role: '💻 Developer',
  },
];

// Tier emoji based on SOL size
export function getTierEmoji(solAmount) {
  const sol = Number(solAmount) || 0;
  if (sol >= 10.0) return '👑';
  if (sol >= 5.0) return '🐳';
  if (sol >= 2.0) return '🦈';
  if (sol >= 0.5) return '🐬';
  if (sol >= 0.1) return '🐟';
  return '🦐';
}

// Overhead Tag Component
function OverheadTag({
  wallet,
  emoji,
  role,
  isWinner,
  isMegaWhale,
  isWhale,
  isHovered,
  isBuilding,
  tagScale = 1.0,
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
      ) : isBuilding ? (
        <span className="badge-builder-tag" style={{ background: '#ffbe0b', color: '#111', fontWeight: 900, padding: '2px 6px', borderRadius: 4 }}>
          🔨 BUILDING ({wallet})
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

// Soft Ground Shadow
let sharedBlobShadowTexture = null;
function getSharedBlobShadowTexture() {
  if (!sharedBlobShadowTexture && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(10, 25, 8, 0.85)');
    gradient.addColorStop(0.35, 'rgba(10, 25, 8, 0.55)');
    gradient.addColorStop(0.70, 'rgba(10, 25, 8, 0.20)');
    gradient.addColorStop(1.0, 'rgba(10, 25, 8, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    sharedBlobShadowTexture = new THREE.CanvasTexture(canvas);
  }
  return sharedBlobShadowTexture;
}

export function PlayerNPC({
  id,
  wallet = '7xK4...9pZm',
  fullWallet = '7xK4aBcDeFgHiJkLmNoPqRsTuVwXyZ9pZm',
  solAmount = 0.5,
  skinIndex = 0,
  initialPosition = [0, 0, 0],
  arenaRadius = 36,
  overallScale = 0.77,
  groundOffset = 0.2,
  isStationary = false,
  tagOffsetY = 0.0,
  tagScale = 0.82,
  winnerInfo = null,
  hideTag = false,
  isFollowed = false,
  onUpdateHeadPos,
  onSelect,
}) {
  const groupRef = useRef();
  const characterRef = useRef();
  const shadowRef = useRef();
  const tagGroupRef = useRef();
  const hammerToolRef = useRef();
  const [isHovered, setIsHovered] = useState(false);
  const [isBuildingState, setIsBuildingState] = useState(false);

  // Load the character glb model and animations
  const { scene, animations } = useGLTF('/models/character.glb');

  // Select style palette based on skinIndex or wallet hash
  const style = useMemo(() => {
    let index = skinIndex;
    if (index === undefined || index === null) {
      index = Math.abs((wallet || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
    }
    return PLAYER_STYLES[index % PLAYER_STYLES.length];
  }, [skinIndex, wallet]);

  // Clone GLTF hierarchy properly and apply exact materials to all body parts
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);

    const shirtMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.shirtColor),
      roughness: 0.65,
      metalness: style.glow ? 0.4 : 0.05,
      emissive: style.glow ? new THREE.Color(style.shirtColor).multiplyScalar(0.25) : new THREE.Color(0, 0, 0),
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.pantsColor),
      roughness: 0.75,
      metalness: 0.05,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.skinColor),
      roughness: 0.70,
      metalness: 0.0,
    });

    const shoesMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.shoesColor),
      roughness: 0.60,
      metalness: 0.1,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.hairColor),
      roughness: 0.65,
      metalness: 0.05,
    });

    const facialMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a1a'),
      roughness: 0.35,
    });

    const noseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(style.skinColor).multiplyScalar(0.92),
      roughness: 0.65,
    });

    clone.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = false;
        node.frustumCulled = true;

        const name = (node.name || '').toLowerCase();
        const parentName = (node.parent?.name || '').toLowerCase();

        // 👕 SHIRT (Body Shirt: node 0 'mesh', Arm Sleeves: node 9 'mesh_6', node 22 'mesh_8')
        if (
          (parentName === 'body' && (name === 'mesh' || node.position.y > -0.4)) ||
          (parentName === 'arm2' && (name === 'mesh_6' || name === 'mesh')) ||
          (parentName === 'arm1' && (name === 'mesh_8' || name === 'mesh'))
        ) {
          node.material = shirtMat;
        }
        // 👖 PANTS / SHORTS (node 1 'mesh_1' under body)
        else if (parentName === 'body' && (name === 'mesh_1' || node.position.y <= -0.4)) {
          node.material = pantsMat;
        }
        // 👟 SHOES (node 4 'mesh_3' under leg1, node 7 'mesh_5' under leg2)
        else if ((parentName === 'leg1' && name === 'mesh_3') || (parentName === 'leg2' && name === 'mesh_5')) {
          node.material = shoesMat;
        }
        // 💇 HAIR (node 19 'hair' under head)
        else if (name === 'hair' || parentName === 'hair') {
          node.material = hairMat;
        }
        // 👁️ FACIAL (eyes, eyebrows)
        else if (name.includes('eye') || name.includes('eyebrow')) {
          node.material = facialMat;
        }
        // 👃 NOSE
        else if (name.includes('nose')) {
          node.material = noseMat;
        }
        // 🧑 SKIN (legs, hands, head, ears)
        else {
          node.material = skinMat;
        }
      }
    });

    return clone;
  }, [scene, style]);

  // Animation controller for character
  const { actions } = useAnimations(animations, characterRef);

  const shadowMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: getSharedBlobShadowTexture(),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
  }, []);

  // Movement & City Building AI State
  const state = useRef({
    currentPos: new THREE.Vector3(
      (initialPosition && typeof initialPosition[0] === 'number') ? initialPosition[0] : (Math.random() - 0.5) * (arenaRadius * 1.1),
      0,
      (initialPosition && typeof initialPosition[2] === 'number') ? initialPosition[2] : (Math.random() - 0.5) * (arenaRadius * 1.1)
    ),
    targetPos: new THREE.Vector3(
      (Math.random() - 0.5) * (arenaRadius * 1.2),
      0,
      (Math.random() - 0.5) * (arenaRadius * 1.2)
    ),
    moveSpeed: 2.2 + Math.random() * 1.1,
    rotation: Math.random() * Math.PI * 2,
    isWalking: false,
    isBuilding: false,
    buildTimer: 0,
    pauseTimer: 0.5 + Math.random() * 1.5,
  });

  const pickNewTarget = () => {
    let chosenX = (Math.random() - 0.5) * (arenaRadius * 1.3);
    let chosenZ = (Math.random() - 0.5) * (arenaRadius * 1.3);

    // Try finding an open street or plaza location that doesn't intersect buildings
    for (let attempts = 0; attempts < 15; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const r = (0.15 + Math.random() * 0.70) * (arenaRadius * 0.82);
      const testX = Math.cos(angle) * r;
      const testZ = Math.sin(angle) * r;
      if (!isInsideAnyBuilding(testX, testZ, 0.9)) {
        chosenX = testX;
        chosenZ = testZ;
        break;
      }
    }

    state.current.targetPos.set(chosenX, 0, chosenZ);
    state.current.isWalking = true;
    state.current.isBuilding = false;
    state.current.pauseTimer = 0;
    setIsBuildingState(false);
  };

  useEffect(() => {
    if (isStationary) {
      actions['idle']?.reset().fadeIn(0.2).play();
    } else {
      actions['walk']?.reset().fadeIn(0.2).play();
      state.current.isWalking = true;
    }

    const citizenKey = id || wallet || `${state.current.currentPos.x}_${state.current.currentPos.z}`;

    return () => {
      actions['walk']?.stop();
      actions['idle']?.stop();
      unregisterCitizenPos(citizenKey);
    };
  }, [actions, isStationary, id, wallet]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.08);
    const s = state.current;

    // Register active position in Traffic Registry for vehicle collision avoidance
    const citizenKey = id || wallet || 'cit_default';
    registerCitizenPos(citizenKey, s.currentPos.x, s.currentPos.z);

    const PLAYER_HEIGHT = 1.59;
    const headTopY = groundOffset + PLAYER_HEIGHT * overallScale;

    // Follow camera head target
    if (isFollowed && onUpdateHeadPos) {
      onUpdateHeadPos(s.currentPos.x, headTopY - 0.08, s.currentPos.z);
    }

    if (isStationary) {
      groupRef.current.position.set(s.currentPos.x, groundOffset, s.currentPos.z);
      groupRef.current.rotation.set(0, s.rotation, 0);
      groupRef.current.scale.set(overallScale, overallScale, overallScale);
      return;
    }

    // AI Wander & Building Behavior
    if (s.isBuilding) {
      s.buildTimer -= dt;
      if (s.buildTimer <= 0) {
        pickNewTarget();
        if (actions['walk'] && actions['idle']) {
          actions['idle'].fadeOut(0.25);
          actions['walk'].reset().fadeIn(0.25).play();
        }
      }
    } else if (s.pauseTimer > 0) {
      s.pauseTimer -= dt;
      if (s.pauseTimer <= 0) {
        // 40% chance to engage in city building when pausing at a plot
        if (Math.random() < 0.40) {
          s.isBuilding = true;
          s.buildTimer = 3.0 + Math.random() * 4.0;
          setIsBuildingState(true);
        } else {
          pickNewTarget();
          if (actions['walk'] && actions['idle']) {
            actions['idle'].fadeOut(0.25);
            actions['walk'].reset().fadeIn(0.25).play();
          }
        }
      }
    } else {
      const dir = new THREE.Vector3().subVectors(s.targetPos, s.currentPos);
      dir.y = 0;
      const dist = dir.length();

      if (dist < 0.6) {
        s.isWalking = false;
        s.pauseTimer = 1.0 + Math.random() * 2.0;
        if (actions['idle'] && actions['walk']) {
          actions['walk'].fadeOut(0.3);
          actions['idle'].reset().fadeIn(0.3).play();
        }
      } else {
        dir.normalize();
        s.currentPos.addScaledVector(dir, s.moveSpeed * dt);

        // 🛡️ Resolve Building Collisions (Never clip or walk through buildings)
        const hitBuilding = resolveBuildingCollisions(s.currentPos, 0.40);
        if (hitBuilding) {
          // Check if path is blocked and repath
          const newDir = new THREE.Vector3().subVectors(s.targetPos, s.currentPos).setY(0);
          if (newDir.length() < 0.5) {
            pickNewTarget();
          }
        }

        const targetAngle = Math.atan2(dir.x, dir.z);
        let diffAngle = targetAngle - s.rotation;
        while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
        while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
        s.rotation += diffAngle * Math.min(7 * dt, 1.0);

        if (actions['walk']) {
          actions['walk'].timeScale = 1.0 + (s.moveSpeed / 3.0) * 0.3;
        }
      }
    }

    // Arena boundary clamp
    if (s.currentPos.length() > arenaRadius * 0.88) {
      s.currentPos.clampLength(0, arenaRadius * 0.85);
      pickNewTarget();
    }

    // Set transforms
    groupRef.current.position.set(s.currentPos.x, groundOffset, s.currentPos.z);
    groupRef.current.rotation.set(0, s.rotation, 0);
    groupRef.current.scale.set(overallScale, overallScale, overallScale);

    if (tagGroupRef.current) {
      tagGroupRef.current.position.y = PLAYER_HEIGHT + 0.35 + tagOffsetY;
    }

    // Animate building hammer tool if active
    if (hammerToolRef.current && isBuildingState) {
      hammerToolRef.current.rotation.z = Math.sin(Date.now() * 0.012) * 0.45;
    }
  });

  const isWhale = solAmount >= 2.0;
  const isMegaWhale = solAmount >= 5.0;
  const isWinner = Boolean(winnerInfo);
  const emoji = winnerInfo ? '🏆' : getTierEmoji(solAmount);

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        soundManager.playHop(1.2);
        if (onSelect) {
          onSelect({ id, wallet, fullWallet, solAmount, role: style.role });
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
      {/* 🧍 Cloned Animated Player Character */}
      <group ref={characterRef}>
        <primitive object={clonedScene} />
      </group>

      {/* 🔨 Floating Construction Tool when Building */}
      {isBuildingState && (
        <group ref={hammerToolRef} position={[0.35, 1.2, 0.2]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.18, 0.12, 0.12]} />
            <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* 🌑 Soft Ground Blob Shadow */}
      <mesh
        ref={shadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.015, 0]}
        scale={[0.42, 0.42, 0.42]}
        material={shadowMat}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>

      {/* 🏷️ 3D Overhead Name & Builder Tag */}
      {!hideTag && (
        <group ref={tagGroupRef} position={[0, 1.59 + 0.35 + tagOffsetY, 0]}>
          <SafeHtml
            center
            distanceFactor={22}
            occlude={false}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <OverheadTag
              wallet={wallet}
              emoji={emoji}
              role={style.role}
              isWinner={isWinner}
              isMegaWhale={isMegaWhale}
              isWhale={isWhale}
              isHovered={isHovered}
              isBuilding={isBuildingState}
              tagScale={tagScale}
              winnerInfo={winnerInfo}
            />
          </SafeHtml>
        </group>
      )}
    </group>
  );
}

useGLTF.preload('/models/character.glb');

export const DickNPC = PlayerNPC;
export default PlayerNPC;
