import React, { Suspense, useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { WorldArena } from './WorldArena';
import { DickNPC } from './DickNPC';
import { MarketCap3D } from './MarketCap3D';

// 🎯 Elastic Pan & Dynamic Character Head-Follower Camera Controller:
// - Smoothly tracks & focuses on selected hopper's head when clicked with cinematic ease-in
// - Smoothly zooms out with ease-in when unfocused back to arena overview
// - Free 360° orbiting around moving hopper
function ElasticPanCameraController({
  center = [0, 1.8, 0],
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
        // 🎯 START FOCUS TRANSITION (Ease-In zoom towards hopper head)
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
      // 3. IDLE ARENA OVERVIEW MODE
      if (!isPanning.current) {
        if (target.distanceTo(defaultCenter) > 0.01) {
          target.lerp(defaultCenter, Math.min(5.5 * dt, 1.0));
          controlsRef.current.update();
        }
      } else {
        const offset = new THREE.Vector3().subVectors(target, defaultCenter);
        const dist = offset.length();
        const maxDragRadius = 8.0;

        if (dist > maxDragRadius) {
          offset.clampLength(0, maxDragRadius);
          target.copy(defaultCenter).add(offset);
        }
        target.lerp(defaultCenter, 1.5 * dt);
        controlsRef.current.update();
      }
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
      panSpeed={0.55}
      screenSpacePanning={true}
      enableRotate={true}
      rotateSpeed={0.8}
      enableZoom={true}
      zoomSpeed={1.0}
      enableDamping={true}
      dampingFactor={0.05}
      minDistance={4}
      maxDistance={65}
      maxPolarAngle={Math.PI / 2 - 0.12}
      minPolarAngle={Math.PI / 16}
      target={center}
    />
  );
}

export function Scene3D({
  npcs = [],
  selectedNpcId = null,
  onSelectNpc,
  marketCap = 0,
  mcapDistance,
  mcapOrbitAngle,
  mcapHeightOffset,
  mcapFacingAngle,
  mcapScale,
  arenaRadius = 28,
  overallScale = 7.5,
  groundOffset = 0.2,
  isStationary = false,
  tagOffsetY = -0.26,
  tagScale = 1.60,
  sunPosition = [-2.0, 26.0, 32.0],
  sunRotation = [0, 0, 0],
  sunScale = 1.0,
  rainbowPosition = [-29.5, -1.5, -47.5],
  rainbowRotation = [1.57, 0.17, -0.7],
  rainbowRadius = 33.0,
}) {
  const followedHeadPos = useRef(new THREE.Vector3(0, 1.8, 0));
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
          position: [24, 22, 28],
          fov: 42,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        {/* Bright Sunny Skyblue Atmosphere */}
        <color attach="background" args={['#7ec8f8']} />
        <fog attach="fog" args={['#8fd5ff', 55, 140]} />

        {/* Natural Daylight & Grass Ground Bounce */}
        <hemisphereLight
          skyColor="#ffffff"
          groundColor="#3d8b27"
          intensity={1.1}
        />
        <ambientLight intensity={0.5} />

        {/* Primary Sun Directional Light Aligned with 3D Sun */}
        <directionalLight
          position={sunPosition}
          intensity={2.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={140}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-bias={-0.0003}
          shadow-normalBias={0.02}
        />

        {/* Warm Sunlight Fill */}
        <directionalLight
          position={[-sunPosition[0] * 0.7, 25, -sunPosition[2] * 0.7]}
          intensity={0.4}
          color="#fff8e7"
        />

        {/* 🎯 Free Orbit & Dynamic Head-Follower Camera */}
        <ElasticPanCameraController
          center={[0, 1.8, 0]}
          selectedNpcId={selectedNpcId}
          followedHeadPos={followedHeadPos}
          hasFollowTarget={hasFollowTarget}
        />

        <Suspense fallback={null}>
          {(() => {
            // 🏛️ Big Central Stationary Monument Hopper (Scaled 20% smaller: 1.872x overall scale)
            const monumentOverallScale = overallScale * 1.872;
            const mcap = Math.max(0, Number(marketCap) || 0);
            const monumentShaftScale = 1.0 + (mcap > 0 ? Math.log10(1 + mcap / 1200) * 1.2 : 0);
            const monumentInches = monumentShaftScale * 4.92;

            // Compute exact top peak of the center dick head in world coordinates
            const HEAD_BASE_Y = 0.5825;
            const SHAFT_HEIGHT = 0.375;
            const headPeakLocalY = HEAD_BASE_Y + SHAFT_HEIGHT * (monumentShaftScale - 1) + 0.12;
            const headTopWorldY = groundOffset + headPeakLocalY * monumentOverallScale;

            // 🎯 Anchor Market Cap directly on top of the center dick head at all times
            const sc = mcapScale !== undefined ? mcapScale : 0.95;
            const marketCapPos = [0, headTopWorldY + 2.0, 0];
            const marketCapRot = [0.0, 0.0, 0.0];
            const marketCapScale = sc;

            return (
              <>
                <DickNPC
                  id="monument_center"
                  wallet="$GROWERS"
                  fullWallet="MARKET CAP MONUMENT"
                  solAmount={5.0}
                  skinIndex={1}
                  initialPosition={[0, 0, 0]}
                  arenaRadius={arenaRadius}
                  overallScale={monumentOverallScale}
                  groundOffset={groundOffset}
                  isStationary={true}
                  hideTag={true}
                  overrideShaftScale={monumentShaftScale}
                  overrideInches={monumentInches}
                  isFollowed={selectedNpcId === 'monument_center' || selectedNpcId === '$GROWERS'}
                  onUpdateHeadPos={(x, y, z) => {
                    if (selectedNpcId === 'monument_center' || selectedNpcId === '$GROWERS') {
                      followedHeadPos.current.set(x, y * 0.90, z);
                      hasFollowTarget.current = true;
                    }
                  }}
                  onSelect={() => {
                    if (onSelectNpc) {
                      onSelectNpc(selectedNpcId === 'monument_center' ? null : {
                        id: 'monument_center',
                        wallet: '$GROWERS',
                        fullWallet: 'Central Market Cap Monument',
                        solAmount: 5.0,
                        totalInches: monumentInches,
                      });
                    }
                  }}
                />

                {/* 👾 3D In-Scene Pixel Market Cap Display (Pivoted to Center Dick) */}
                <MarketCap3D
                  marketCap={marketCap}
                  position={marketCapPos}
                  rotation={marketCapRot}
                  scale={marketCapScale}
                />
              </>
            );
          })()}

          <group onClick={() => onSelectNpc && onSelectNpc(null)}>
            <WorldArena
              radius={arenaRadius}
              sunPosition={sunPosition}
              sunRotation={sunRotation}
              sunScale={sunScale}
              rainbowPosition={rainbowPosition}
              rainbowRotation={rainbowRotation}
              rainbowRadius={rainbowRadius}
            />
          </group>

          {/* Render All Dynamic NPCs */}
          {npcs.map((npc) => {
            const isFollowed =
              selectedNpcId === npc.id ||
              (selectedNpcId && (selectedNpcId === npc.wallet || selectedNpcId === npc.fullWallet));

            return (
              <DickNPC
                key={npc.id}
                {...npc}
                arenaRadius={arenaRadius}
                overallScale={overallScale}
                groundOffset={groundOffset}
                isStationary={isStationary}
                tagOffsetY={tagOffsetY}
                tagScale={tagScale}
                isFollowed={Boolean(isFollowed)}
                onUpdateHeadPos={(x, y, z) => {
                  if (isFollowed) {
                    followedHeadPos.current.set(x, y, z);
                    hasFollowTarget.current = true;
                  }
                }}
                onSelect={(selected) => {
                  if (onSelectNpc) {
                    onSelectNpc(selectedNpcId === selected.id ? null : selected);
                  }
                }}
              />
            );
          })}
        </Suspense>
      </Canvas>
    </div>
  );
}
