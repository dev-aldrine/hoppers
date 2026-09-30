import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SafeHtml } from './SafeHtml';
import { soundManager } from '../../audio/soundEffects';

const CROWN_GLB_URL = '/models/king_crown.glb';
const CHARACTER_GLB_URL = '/models/character.glb';

// Preload models for instantaneous rendering
useGLTF.preload(CROWN_GLB_URL);
useGLTF.preload(CHARACTER_GLB_URL);

// 👑 Golden Crown 3D Model
export function KingCrownModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [0.45, 0.45, 0.45] }) {
  const { scene } = useGLTF(CROWN_GLB_URL);
  const crownRef = useRef();

  const clonedCrown = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.metalness = 0.9;
          child.material.roughness = 0.2;
          child.material.emissive = new THREE.Color('#ffb703');
          child.material.emissiveIntensity = 0.4;
        }
      }
    });
    return clone;
  }, [scene]);

  useFrame((state) => {
    if (crownRef.current) {
      const t = state.clock.getElapsedTime();
      crownRef.current.position.y = position[1] + Math.sin(t * 3.0) * 0.04;
      crownRef.current.rotation.y = rotation[1] + t * 0.8;
    }
  });

  return (
    <group ref={crownRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedCrown} />
      <pointLight color="#ffd166" intensity={1.5} distance={4} />
    </group>
  );
}

// 💥 Falling / Dethroned King Tumbling Off Cliff
function FallingKing({ king, summitPos, onDone }) {
  const groupRef = useRef();
  const { scene } = useGLTF(CHARACTER_GLB_URL);
  
  // Clone character model
  const characterModel = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color('#ef476f');
        }
      }
    });
    return clone;
  }, [scene]);

  // Random trajectory off the mountain cliff
  const trajectory = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const horizontalSpeed = 8.0 + Math.random() * 4.0;
    return {
      vx: Math.cos(angle) * horizontalSpeed,
      vy: 6.0 + Math.random() * 3.0,
      vz: Math.sin(angle) * horizontalSpeed,
      spinX: (Math.random() - 0.5) * 12.0,
      spinY: (Math.random() - 0.5) * 10.0,
      spinZ: (Math.random() - 0.5) * 12.0,
      startY: summitPos[1],
      startX: summitPos[0],
      startZ: summitPos[2],
      startTime: Date.now(),
    };
  }, [summitPos]);

  useFrame(() => {
    if (!groupRef.current) return;
    const elapsed = (Date.now() - trajectory.startTime) / 1000;
    
    // Physics displacement: gravity = -18 m/s^2
    const x = trajectory.startX + trajectory.vx * elapsed;
    const y = Math.max(-2, trajectory.startY + trajectory.vy * elapsed - 0.5 * 18 * elapsed * elapsed);
    const z = trajectory.startZ + trajectory.vz * elapsed;

    groupRef.current.position.set(x, y, z);
    groupRef.current.rotation.x += trajectory.spinX * 0.03;
    groupRef.current.rotation.y += trajectory.spinY * 0.03;
    groupRef.current.rotation.z += trajectory.spinZ * 0.03;

    // Fade out / cleanup after 2.5s
    if (elapsed > 2.5) {
      if (onDone) onDone(king.id);
    }
  });

  return (
    <group ref={groupRef} position={summitPos} scale={[0.75, 0.75, 0.75]}>
      <primitive object={characterModel} />
    </group>
  );
}

// 🏛️ The Crown Summit: Crown Mountain Pedestal & Active Crowned King
export function KingSummit3D({
  summitPos = [0, 18.0, 0],
  crownedKing = null,
  timerSeconds = 60,
  timerDuration = 60,
  accumulatedFeesSol = 0.5,
  fallenKings = [],
  onRemoveFallenKing,
}) {
  const kingGroupRef = useRef();
  const beamRef = useRef();
  const { scene, animations } = useGLTF(CHARACTER_GLB_URL);
  const { actions } = useAnimations(animations, kingGroupRef);

  // Trigger idle animation for king
  useEffect(() => {
    if (actions) {
      const firstAction = Object.values(actions)[0];
      if (firstAction) {
        firstAction.reset().fadeIn(0.3).play();
      }
    }
  }, [actions, crownedKing?.wallet]);

  // Gentle breathing / victory sway
  useFrame((state) => {
    if (kingGroupRef.current) {
      const t = state.clock.getElapsedTime();
      kingGroupRef.current.rotation.y = Math.sin(t * 0.5) * 0.25;
    }
    if (beamRef.current) {
      const t = state.clock.getElapsedTime();
      beamRef.current.material.opacity = 0.35 + Math.sin(t * 4.0) * 0.15;
    }
  });

  const timerPct = Math.max(0, Math.min(100, (timerSeconds / timerDuration) * 100));
  const isTimeLow = timerSeconds <= 15;

  const formattedWallet = crownedKing?.wallet
    ? `${crownedKing.wallet.slice(0, 4)}...${crownedKing.wallet.slice(-4)}`
    : 'Waiting for King...';

  return (
    <group position={summitPos}>
      {/* ⛰️ Summit Golden Altar / Pedestal */}
      <group position={[0, -0.2, 0]}>
        {/* Tier 1 Base Platform */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[5.2, 5.8, 0.6, 24]} />
          <meshStandardMaterial color="#2b2d42" roughness={0.7} metalness={0.2} />
        </mesh>
        
        {/* Tier 2 Polished Gold Platform */}
        <mesh position={[0, 0.45, 0]} receiveShadow>
          <cylinderGeometry args={[4.2, 4.6, 0.4, 24]} />
          <meshStandardMaterial
            color="#ffd166"
            roughness={0.25}
            metalness={0.85}
            emissive="#e69500"
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* Central Crown Dais */}
        <mesh position={[0, 0.8, 0]} receiveShadow>
          <cylinderGeometry args={[2.2, 2.5, 0.35, 16]} />
          <meshStandardMaterial
            color="#00f5d4"
            roughness={0.2}
            metalness={0.9}
            emissive="#00f5d4"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* 4 Summit Rune Torches / Pillars */}
        {[
          [-3.2, -3.2],
          [3.2, -3.2],
          [-3.2, 3.2],
          [3.2, 3.2],
        ].map(([px, pz], i) => (
          <group key={`torch-${i}`} position={[px, 0.6, pz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.25, 1.6, 8]} />
              <meshStandardMaterial color="#495057" metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.9, 0]}>
              <octahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial
                color="#ffd166"
                emissive="#ff9f1c"
                emissiveIntensity={1.2}
              />
            </mesh>
            <pointLight position={[0, 0.9, 0]} color="#ff9f1c" intensity={1.8} distance={8} />
          </group>
        ))}
      </group>

      {/* 🌟 Golden Celestial Light Beam */}
      <mesh ref={beamRef} position={[0, 25, 0]}>
        <cylinderGeometry args={[2.5, 3.5, 50, 16, 1, true]} />
        <meshBasicMaterial
          color="#ffd166"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 👑 Active Crowned King Character at Summit */}
      {crownedKing && (
        <group ref={kingGroupRef} position={[0, 1.0, 0]} scale={[0.85, 0.85, 0.85]}>
          <primitive object={scene} />

          {/* 3D King Crown attached to head */}
          <KingCrownModel
            position={[0, 1.95, 0]}
            rotation={[0, 0, 0]}
            scale={[0.55, 0.55, 0.55]}
          />
        </group>
      )}

      {/* 🏷️ Big Majestic Overhead Crown & Timer Badge */}
      <SafeHtml position={[0, 4.6, 0]} center distanceFactor={48} occlude={false}>
        <div className="king-summit-overhead-badge">
          {/* Crown Title Header */}
          <div className="king-badge-header">
            <span className="king-badge-crown-icon">👑</span>
            <div className="king-badge-titles">
              <span className="king-badge-realm-title">CURRENT KING OF THE MOUNTAIN</span>
              <span className="king-badge-wallet">
                {formattedWallet} {crownedKing?.buyAmountSol ? `(🔥 ${crownedKing.buyAmountSol} SOL)` : ''}
              </span>
            </div>
          </div>

          {/* 60-Second Countdown Timer Bar */}
          <div className="king-timer-container">
            <div className="king-timer-info-row">
              <span className="king-timer-label">HOLD CROWN FOR 60s TO CLAIM FEES:</span>
              <span className={`king-timer-clock ${isTimeLow ? 'urgent' : ''}`}>
                ⏱️ {timerSeconds.toFixed(1)}s
              </span>
            </div>
            <div className="king-timer-bar-track">
              <div
                className={`king-timer-bar-fill ${isTimeLow ? 'urgent' : ''}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          </div>

          {/* Reward Bounty Banner */}
          <div className="king-bounty-chip">
            <span>💰 Winner Takes Accumulated Fees:</span>
            <strong>◎ {accumulatedFeesSol.toFixed(3)} SOL</strong>
          </div>
        </div>
      </SafeHtml>

      {/* 💥 Falling Dethroned Kings */}
      {fallenKings.map((fk) => (
        <FallingKing
          key={fk.id}
          king={fk}
          summitPos={summitPos}
          onDone={onRemoveFallenKing}
        />
      ))}
    </group>
  );
}

export default KingSummit3D;
