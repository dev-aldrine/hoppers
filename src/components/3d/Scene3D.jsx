import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { WorldArena } from './WorldArena';
import { PlayerNPC } from './PlayerNPC';

// 🎯 Elastic Pan & Dynamic Character Head-Follower Camera Controller:
// - Smoothly tracks & focuses on selected player's head when clicked with cinematic ease-in
// - Smoothly zooms out with ease-in when unfocused back to arena overview
// - Free 360° orbiting around moving player
function ElasticPanCameraController({
  center = [0, 1.2, 0],
  selectedNpcId = null,
  followedHeadPos,
  hasFollowTarget,
}) {
  const { scene } = useThree();
  const controlsRef = useRef();
  const isPanning = useRef(false);
  const isInteracting = useRef(false);
  const defaultCenter = useMemo(() => new THREE.Vector3(...center), [center]);
  const prevSelectedId = useRef(null);

  // Smooth cinematic ease transitions (focus in & zoom out)
  const transitionState = useRef({
    type: 'none', // 'focus' | 'unfocus' | 'none'
    progress: 0,
    duration: 1.0,
    startCam: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endCam: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  // Reusable raycasting buffers
  const raycaster = useRef(new THREE.Raycaster()).current;
  const rayDir = useRef(new THREE.Vector3()).current;
  const safeCamPos = useRef(new THREE.Vector3()).current;

  useEffect(() => {
    const handleStart = (e) => {
      isInteracting.current = true;
      if (e.button === 2 || e.button === 1) {
        isPanning.current = true;
      }
      // If user starts manual interaction, let user take immediate control
      if (transitionState.current.type !== 'none') {
        transitionState.current.type = 'none';
      }
    };
    const handleEnd = () => {
      isInteracting.current = false;
      isPanning.current = false;
    };

    window.addEventListener('mousedown', handleStart);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchstart', handleStart);
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('mousedown', handleStart);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchend', handleEnd);
    };
  }, []);

  useFrame((_, delta) => {
    if (!controlsRef.current) return;
    const dt = Math.min(delta, 0.08);
    const target = controlsRef.current.target;
    const cam = controlsRef.current.object;
    const tr = transitionState.current;

    // Detect selection change: trigger Ease-In Focus or Ease-In Unfocus Zoom Out
    if (selectedNpcId !== prevSelectedId.current) {
      if (selectedNpcId && followedHeadPos.current) {
        // 🎯 START FOCUS TRANSITION (Ease-In zoom towards player head)
        tr.type = 'focus';
        tr.progress = 0;
        tr.duration = 0.95;
        tr.startCam.copy(cam.position);
        tr.startTarget.copy(target);
      } else if (!selectedNpcId && prevSelectedId.current) {
        // 🔭 START UNFOCUS TRANSITION (Ease-In zoom out to full arena overview)
        tr.type = 'unfocus';
        tr.progress = 0;
        tr.duration = 1.1;
        tr.startCam.copy(cam.position);
        tr.startTarget.copy(target);

        // Compute natural overview camera position preserving angle
        const camDir = new THREE.Vector3().subVectors(cam.position, target).setY(0);
        if (camDir.lengthSq() < 0.1) camDir.set(24, 0, 28);
        camDir.normalize().multiplyScalar(36.0);
        tr.endCam.set(camDir.x, 22.0, camDir.z);
        tr.endTarget.copy(defaultCenter);
      }
      prevSelectedId.current = selectedNpcId;
    }

    // 1. ACTIVE TRANSITION ANIMATION (Cinematic Smooth Ease-In Curve)
    if (tr.type !== 'none') {
      tr.progress += dt / tr.duration;
      const t = Math.min(1.0, tr.progress);

      // Ease-in / smooth ease curve: starts gently, accelerates smoothly into glide
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      if (tr.type === 'focus' && followedHeadPos.current) {
        const headPos = followedHeadPos.current;
        const currentCamDir = new THREE.Vector3().subVectors(tr.startCam, tr.startTarget).setY(0);
        if (currentCamDir.lengthSq() < 0.1) currentCamDir.set(8.0, 0, 10.0);
        currentCamDir.normalize().multiplyScalar(10.5);
        const desiredCamPos = new THREE.Vector3(headPos.x + currentCamDir.x, headPos.y + 4.8, headPos.z + currentCamDir.z);

        cam.position.lerpVectors(tr.startCam, desiredCamPos, easeT);
        target.lerpVectors(tr.startTarget, headPos, easeT);
        controlsRef.current.update();

        if (t >= 1.0) {
          tr.type = 'none';
        }
      } else if (tr.type === 'unfocus') {
        cam.position.lerpVectors(tr.startCam, tr.endCam, easeT);
        target.lerpVectors(tr.startTarget, tr.endTarget, easeT);
        controlsRef.current.update();

        if (t >= 1.0) {
          tr.type = 'none';
          hasFollowTarget.current = false;
        }
      }
    } else if (selectedNpcId && hasFollowTarget.current && followedHeadPos.current) {
      // 2. ACTIVE FOLLOWING (Smooth Tracking Head with Free Orbit)
      const headPos = followedHeadPos.current;
      target.lerp(headPos, Math.min(10 * dt, 1.0));

      if (!isInteracting.current) {
        const currentOffset = new THREE.Vector3().subVectors(cam.position, target);
        if (currentOffset.length() < 4.5) currentOffset.setLength(5.5);
        if (currentOffset.length() > 26) currentOffset.setLength(20);
        const desiredCamPos = new THREE.Vector3().copy(target).add(currentOffset);
        cam.position.lerp(desiredCamPos, Math.min(8 * dt, 1.0));
      }
      controlsRef.current.update();
    } else {
      // 3. IDLE ARENA OVERVIEW MODE: Free within town, progressive elastic resistance past boundary
      const townCenterX = 0;
      const townCenterZ = -12;
      const radiusX = 140.0; // Town east-west limit
      const radiusZ = 160.0; // Town north-south limit

      const dx = target.x - townCenterX;
      const dz = target.z - townCenterZ;
      const normDist = Math.sqrt((dx / radiusX) * (dx / radiusX) + (dz / radiusZ) * (dz / radiusZ));

      if (normDist > 1.0) {
        // Target is attempting to pan farther than the town limits -> Apply elastic resistance
        const excess = normDist - 1.0;
        const maxOvershoot = 0.25; // Max 25% boundary stretch

        if (excess > maxOvershoot) {
          // Hard clamp at max stretch
          const clampedNorm = 1.0 + maxOvershoot;
          const scale = clampedNorm / normDist;
          target.x = townCenterX + dx * scale;
          target.z = townCenterZ + dz * scale;
        }

        // Elastic spring pull-back resistance towards town edge
        const returnX = townCenterX + dx / normDist;
        const returnZ = townCenterZ + dz / normDist;
        const resistanceStrength = isPanning.current ? Math.min(3.5 * excess, 2.5) : 6.0;

        target.x = THREE.MathUtils.lerp(target.x, returnX, Math.min(resistanceStrength * dt, 1.0));
        target.z = THREE.MathUtils.lerp(target.z, returnZ, Math.min(resistanceStrength * dt, 1.0));
      }

      controlsRef.current.update();
    }

    // ⛰️ Smart Mountain Collision Avoidance (Line of Sight Protection)
    if (cam && scene) {
      rayDir.subVectors(cam.position, target);
      const currentDist = rayDir.length();

      if (currentDist > 2.0) {
        rayDir.normalize();
        raycaster.set(target, rayDir);
        raycaster.near = 1.0;
        raycaster.far = currentDist;

        const hits = raycaster.intersectObjects(scene.children, true);
        let blockedDist = currentDist;

        for (let i = 0; i < hits.length; i++) {
          const hit = hits[i];
          if (hit.object.isMesh && (hit.object.name === 'terrain-mesh' || hit.object.name === 'mountain-mesh')) {
            if (hit.distance < blockedDist - 0.4) {
              blockedDist = hit.distance;
              break;
            }
          }
        }

        if (blockedDist < currentDist - 0.4) {
          const safeDistance = Math.max(8.0, blockedDist - 1.0);
          safeCamPos.copy(target).addScaledVector(rayDir, safeDistance);
          cam.position.lerp(safeCamPos, Math.min(12 * dt, 1.0));
          controlsRef.current.update();
        }
      }

      if (cam.position.y < 2.5) {
        cam.position.y = 2.5;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={true}
      panSpeed={1.0}
      screenSpacePanning={true}
      enableRotate={true}
      rotateSpeed={1.0}
      enableZoom={true}
      zoomSpeed={1.2}
      enableDamping={true}
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={240}
      maxPolarAngle={Math.PI / 2 - 0.08}
      minPolarAngle={Math.PI / 32}
      target={center}
    />
  );
}


export function Scene3D({
  npcs = [],
  selectedNpcId = null,
  onSelectNpc,
  arenaRadius = 140,
  overallScale = 0.77,
  groundOffset = 0.2,
  isStationary = false,
  tagOffsetY = 0.0,
  tagScale = 0.85,
  crownedKing = null,
  timerSeconds = 60,
  timerDuration = 60,
  accumulatedFeesSol = 0.5,
  fallenKings = [],
  onRemoveFallenKing,
}) {
  const followedHeadPos = useRef(new THREE.Vector3(0, 19.5, 0));
  const hasFollowTarget = useRef(false);

  return (
    <div className="canvas-container">
      <Canvas
        shadows
        onPointerMissed={(e) => {
          if (e.type === 'click' && onSelectNpc) {
            onSelectNpc(null);
          }
        }}
        camera={{
          position: [38, 32, 45],
          fov: 44,
          near: 0.1,
          far: 1400,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Bright Sunny Skyblue Atmosphere with Horizon Mountain Fog */}
        <color attach="background" args={['#7ec8f8']} />
        <fog attach="fog" args={['#8fd5ff', 240, 750]} />

        {/* Natural Daylight & Grass Ground Bounce */}
        <hemisphereLight
          skyColor="#ffffff"
          groundColor="#3d8b27"
          intensity={1.1}
        />
        <ambientLight intensity={0.5} />

        {/* Primary Sun Directional Light */}
        <directionalLight
          position={[-15.0, 65.0, 70.0]}
          intensity={2.3}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={450}
          shadow-camera-left={-160}
          shadow-camera-right={160}
          shadow-camera-top={160}
          shadow-camera-bottom={-160}
          shadow-bias={-0.0003}
          shadow-normalBias={0.02}
        />

        {/* Warm Sunlight Fill */}
        <directionalLight
          position={[10.0, 30.0, -50.0]}
          intensity={0.4}
          color="#fff8e7"
        />

        {/* 🎯 Free Orbit & Dynamic Head-Follower Camera */}
        <ElasticPanCameraController
          center={[0, 15.0, 0]}
          selectedNpcId={selectedNpcId}
          followedHeadPos={followedHeadPos}
          hasFollowTarget={hasFollowTarget}
        />

        <Suspense fallback={null}>
          <group onClick={() => onSelectNpc && onSelectNpc(null)}>
            <WorldArena
              crownedKing={crownedKing}
              timerSeconds={timerSeconds}
              timerDuration={timerDuration}
              accumulatedFeesSol={accumulatedFeesSol}
              fallenKings={fallenKings}
              onRemoveFallenKing={onRemoveFallenKing}
            />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Scene3D;
