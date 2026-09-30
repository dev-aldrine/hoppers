import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SafeHtml } from './SafeHtml';

const CROWN_GLB_URL = '/models/king_crown.glb';

// Preload crown model for instantaneous rendering
useGLTF.preload(CROWN_GLB_URL);

// 👑 Golden Crown 3D Model
export function KingCrownModel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [0.85, 0.85, 0.85] }) {
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
          child.material.metalness = 0.92;
          child.material.roughness = 0.18;
          child.material.emissive = new THREE.Color('#ffb703');
          child.material.emissiveIntensity = 0.45;
        }
      }
    });
    return clone;
  }, [scene]);

  useFrame((state) => {
    if (crownRef.current) {
      const t = state.clock.getElapsedTime();
      crownRef.current.position.y = position[1] + Math.sin(t * 2.5) * 0.12;
      crownRef.current.rotation.y = rotation[1] + t * 0.9;
    }
  });

  return (
    <group ref={crownRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedCrown} />
      <pointLight color="#ffd166" intensity={2.2} distance={8} />
    </group>
  );
}

// 🏛️ The Crown Summit: Crown Mountain Pedestal & Floating Golden Crown
export function KingSummit3D({
  summitPos = [0, 56.0, 0],
  crownedKing = null,
  timerSeconds = 60,
  timerDuration = 60,
  accumulatedFeesSol = 0.5,
  isRealCA = false,
}) {
  const beamRef = useRef();

  useFrame((state) => {
    if (beamRef.current) {
      const t = state.clock.getElapsedTime();
      beamRef.current.material.opacity = 0.35 + Math.sin(t * 4.0) * 0.15;
    }
  });

  const timerPct = Math.max(0, Math.min(100, (timerSeconds / timerDuration) * 100));
  const isTimeLow = timerSeconds <= 15;

  const hasRealKing = Boolean(
    isRealCA &&
    crownedKing &&
    crownedKing.wallet &&
    crownedKing.wallet.length >= 32 &&
    !crownedKing.wallet.toLowerCase().includes('updating')
  );

  const formattedWallet = hasRealKing
    ? `${crownedKing.wallet.slice(0, 4)}...${crownedKing.wallet.slice(-4)}`
    : 'Last buyer (no timer)';

  return (
    <group position={summitPos}>
      {/* ⛰️ Summit Golden Altar / Pedestal */}
      <group position={[0, -0.2, 0]}>
        {/* Tier 1 Base Platform (Lush Emerald & Gold Rim) */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <cylinderGeometry args={[5.2, 5.8, 0.6, 24]} />
          <meshStandardMaterial color="#1b4332" roughness={0.4} metalness={0.6} />
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

        {/* 4 Summit Rune Torches / Pillars (Golden Bronze & Flame) */}
        {[
          [-3.2, -3.2],
          [3.2, -3.2],
          [-3.2, 3.2],
          [3.2, 3.2],
        ].map(([px, pz], i) => (
          <group key={`torch-${i}`} position={[px, 0.6, pz]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.18, 0.25, 1.6, 8]} />
              <meshStandardMaterial color="#c77dff" metalness={0.7} roughness={0.3} emissive="#7b2cbf" emissiveIntensity={0.3} />
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

      {/* 👑 Majestic Floating King Crown directly on the Summit Dais */}
      <KingCrownModel
        position={[0, 1.6, 0]}
        rotation={[0, 0, 0]}
        scale={[0.95, 0.95, 0.95]}
      />

      {/* 🏷️ Big Majestic Overhead Crown & Timer Badge (+30% Y elevation) - ONLY shown when real CA / King active */}
      {hasRealKing && (
        <SafeHtml position={[0, 12.5, 0]} center distanceFactor={52} occlude={false}>
          <div className="king-summit-overhead-badge">
            {/* Crown Title Header */}
            <div className="king-badge-header">
              <span className="king-badge-crown-icon">👑</span>
              <div className="king-badge-titles">
                <span className="king-badge-realm-title">CURRENT CROWN HOLDER</span>
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
              <span>💰 0.30% Creator Rewards:</span>
              <strong>
                {accumulatedFeesSol >= 0.2
                  ? `◎ ${accumulatedFeesSol.toFixed(3)} SOL`
                  : 'Accumulating...'}
              </strong>
            </div>
          </div>
        </SafeHtml>
      )}
    </group>
  );
}

export default KingSummit3D;
