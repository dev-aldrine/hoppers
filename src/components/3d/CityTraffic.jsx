import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GLBYellowTaxi,
  GLBPoliceCar,
  GLBTransitBus,
  GLBSedanCar,
} from './CityGLBModels';
import {
  citizenPositions,
  vehiclePositions,
  registerVehiclePos,
  unregisterVehiclePos,
} from './TrafficRegistry';

// 🛣️ Lane and Turning Constants
// Total road width = 4.0m. Right-hand lane center is 0.95m from the road centerline.
const LANE_OFFSET = 0.95;
const TURN_RADIUS = 1.6; // Corner turn arc radius, strictly inside 4m x 4m intersection

// 🚗 Strict Road Path Builder
// Generates piecewise exact straight lanes and tight corner arcs that stay 100% on the road
class StrictRoadPath {
  constructor(waypoints) {
    this.points = [];
    this.cumulativeDistances = [];
    this.totalLength = 0;
    this.buildPath(waypoints);
  }

  buildPath(waypoints) {
    const rawPoints = [];
    const num = waypoints.length;

    for (let i = 0; i < num; i++) {
      const pPrev = waypoints[(i - 1 + num) % num];
      const pCurr = waypoints[i];
      const pNext = waypoints[(i + 1) % num];

      // Segment incoming direction & normal
      const dxIn = pCurr[0] - pPrev[0];
      const dzIn = pCurr[1] - pPrev[1];
      const lenIn = Math.hypot(dxIn, dzIn);
      const dirIn = lenIn > 0.001 ? [dxIn / lenIn, dzIn / lenIn] : [0, 1];
      const normIn = [-dirIn[1], dirIn[0]]; // Right-hand normal: (-dz, dx)

      // Segment outgoing direction & normal
      const dxOut = pNext[0] - pCurr[0];
      const dzOut = pNext[1] - pCurr[1];
      const lenOut = Math.hypot(dxOut, dzOut);
      const dirOut = lenOut > 0.001 ? [dxOut / lenOut, dzOut / lenOut] : [0, 1];
      const normOut = [-dirOut[1], dirOut[0]];

      // Turn entrance & exit points
      const tIn = [
        pCurr[0] - dirIn[0] * TURN_RADIUS + normIn[0] * LANE_OFFSET,
        pCurr[1] - dirIn[1] * TURN_RADIUS + normIn[1] * LANE_OFFSET,
      ];
      const tOut = [
        pCurr[0] + dirOut[0] * TURN_RADIUS + normOut[0] * LANE_OFFSET,
        pCurr[1] + dirOut[1] * TURN_RADIUS + normOut[1] * LANE_OFFSET,
      ];

      // Bezier corner control point
      const control = [
        pCurr[0] + (normIn[0] + normOut[0]) * 0.5 * LANE_OFFSET,
        pCurr[1] + (normIn[1] + normOut[1]) * 0.5 * LANE_OFFSET,
      ];

      // Add straight segment from previous corner's exit to current entrance
      if (rawPoints.length > 0) {
        const lastPt = rawPoints[rawPoints.length - 1];
        const segDist = Math.hypot(tIn[0] - lastPt.x, tIn[1] - lastPt.z);
        const steps = Math.max(1, Math.floor(segDist / 0.5));
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const x = THREE.MathUtils.lerp(lastPt.x, tIn[0], t);
          const z = THREE.MathUtils.lerp(lastPt.z, tIn[1], t);
          rawPoints.push(new THREE.Vector3(x, 0.05, z));
        }
      } else {
        rawPoints.push(new THREE.Vector3(tIn[0], 0.05, tIn[1]));
      }

      // Add smooth rounded corner through intersection
      const arcSamples = 8;
      for (let s = 1; s <= arcSamples; s++) {
        const t = s / arcSamples;
        const invT = 1 - t;
        const x = invT * invT * tIn[0] + 2 * invT * t * control[0] + t * t * tOut[0];
        const z = invT * invT * tIn[1] + 2 * invT * t * control[1] + t * t * tOut[1];
        rawPoints.push(new THREE.Vector3(x, 0.05, z));
      }
    }

    // Connect final corner exit back to first point to close the circuit
    const firstPt = rawPoints[0];
    const lastPt = rawPoints[rawPoints.length - 1];
    const closingDist = Math.hypot(firstPt.x - lastPt.x, firstPt.z - lastPt.z);
    if (closingDist > 0.01) {
      const steps = Math.max(1, Math.floor(closingDist / 0.5));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = THREE.MathUtils.lerp(lastPt.x, firstPt.x, t);
        const z = THREE.MathUtils.lerp(lastPt.z, firstPt.z, t);
        rawPoints.push(new THREE.Vector3(x, 0.05, z));
      }
    }

    // Compute cumulative distances for constant linear speed
    this.points = rawPoints;
    this.cumulativeDistances = [0];
    let runningDist = 0;
    for (let i = 1; i < this.points.length; i++) {
      runningDist += this.points[i].distanceTo(this.points[i - 1]);
      this.cumulativeDistances.push(runningDist);
    }
    this.totalLength = runningDist;
  }

  getPointAt(u) {
    const wrappedU = ((u % 1.0) + 1.0) % 1.0;
    const targetDist = wrappedU * this.totalLength;

    let low = 0;
    let high = this.cumulativeDistances.length - 1;
    while (low < high - 1) {
      const mid = (low + high) >> 1;
      if (this.cumulativeDistances[mid] <= targetDist) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const d0 = this.cumulativeDistances[low];
    const d1 = this.cumulativeDistances[high];
    const segLen = d1 - d0;
    const t = segLen > 0.00001 ? (targetDist - d0) / segLen : 0;

    const p0 = this.points[low];
    const p1 = this.points[high];

    return new THREE.Vector3(
      THREE.MathUtils.lerp(p0.x, p1.x, t),
      0.05,
      THREE.MathUtils.lerp(p0.z, p1.z, t)
    );
  }

  sampleAt(u) {
    const pos = this.getPointAt(u);
    const nextPos = this.getPointAt(u + 0.003);

    const dx = nextPos.x - pos.x;
    const dz = nextPos.z - pos.z;
    const heading = Math.atan2(dx, dz);

    return { pos: [pos.x, pos.y, pos.z], heading };
  }
}

// 🚦 Exact Verified Road Network Closed Circuits
const PATH_PERIMETER_CW = new StrictRoadPath([
  [0, -88], [32, -88], [32, -64], [80, -64], [80, -32], [80, 0], [80, 32], [80, 64],
  [40, 64], [0, 64], [-40, 64], [-80, 64], [-80, 32], [-80, 0], [-80, -32], [-80, -64],
  [-32, -64], [-32, -88]
]);

const PATH_PERIMETER_CCW = new StrictRoadPath([
  [0, -88], [-32, -88], [-32, -64], [-80, -64], [-80, -32], [-80, 0], [-80, 32], [-80, 64],
  [-40, 64], [0, 64], [40, 64], [80, 64], [80, 32], [80, 0], [80, -32], [80, -64],
  [32, -64], [32, -88]
]);

const PATH_NORTH_CIVIC_TECH = new StrictRoadPath([
  [0, -88], [32, -88], [32, -64], [80, -64], [80, -32], [40, -32],
  [40, 0], [0, 0], [-40, 0], [-40, -32], [-40, -64], [-32, -64], [-32, -88]
]);

const PATH_NW_VILLAGE = new StrictRoadPath([
  [0, 0], [0, -32], [-40, -32], [-80, -32], [-80, -64], [-40, -64], [-40, 0]
]);

const PATH_NE_DOWNTOWN = new StrictRoadPath([
  [0, 0], [40, 0], [80, 0], [80, -32], [80, -64], [40, -64], [40, -32], [0, -32]
]);

const PATH_SW_ECO = new StrictRoadPath([
  [0, 0], [-40, 0], [-80, 0], [-80, 32], [-80, 64], [-40, 64], [-40, 32], [0, 32]
]);

const PATH_SE_HARBOR = new StrictRoadPath([
  [0, 0], [0, 32], [40, 32], [40, 64], [80, 64], [80, 32], [80, 0], [40, 0]
]);

const PATH_SPINE_EXPRESS = new StrictRoadPath([
  [0, -88], [0, -64], [0, -32], [0, 0], [0, 32], [0, 64],
  [40, 64], [40, 32], [40, 0], [40, -32], [40, -64], [32, -64], [32, -88]
]);

// 🚗 Moving Vehicle Entity with Intelligent Collision Avoidance & Smooth Braking
function StrictMovingVehicle({
  id,
  type,
  variant,
  tint,
  roadPath,
  speed = 9,
  startU = 0,
  scale = [2.7, 2.7, 2.7],
  sirenActive = true,
}) {
  const groupRef = useRef();
  const progressRef = useRef(startU);
  const currentSpeedRef = useRef(speed);
  const stuckTimerRef = useRef(0);
  const vehicleId = useMemo(() => id || `veh_${Math.random().toString(36).substr(2, 9)}`, [id]);

  useEffect(() => {
    return () => {
      unregisterVehiclePos(vehicleId);
    };
  }, [vehicleId]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.08);

    const { pos, heading } = roadPath.sampleAt(progressRef.current);
    groupRef.current.position.set(pos[0], pos[1], pos[2]);
    groupRef.current.rotation.y = heading;

    // Forward direction & right vector in XZ plane
    const fwdX = Math.sin(heading);
    const fwdZ = Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);

    // 🛡️ Intelligent Obstacle Detection (Same-Lane Vehicles & In-Lane Pedestrians)
    let minObstacleDist = 999;

    // 1. Same-Lane Vehicle Anti-Collision (Ignore cross-street and oncoming traffic)
    for (const [otherId, other] of vehiclePositions.entries()) {
      if (otherId === vehicleId) continue;

      // Check heading alignment: only consider vehicles traveling in the same direction (>0.65 cos)
      const headingCos = Math.cos(heading - other.heading);
      if (headingCos <= 0.65) continue; // Cross-street or opposite lane: ignore to prevent intersection deadlock

      const dx = other.x - pos[0];
      const dz = other.z - pos[2];
      const fwd = dx * fwdX + dz * fwdZ;
      const lat = Math.abs(dx * rightX + dz * rightZ);

      // Direct lead car in the same lane
      if (fwd > 0.4 && fwd < 8.5 && lat < 1.25) {
        if (fwd < minObstacleDist) minObstacleDist = fwd;
      }
    }

    // 2. Pedestrian / Citizen In-Lane Yielding
    for (const [_, cit] of citizenPositions.entries()) {
      const dx = cit.x - pos[0];
      const dz = cit.z - pos[2];
      const fwd = dx * fwdX + dz * fwdZ;
      const lat = Math.abs(dx * rightX + dz * rightZ);

      // Pedestrian walking directly in front of car in the lane
      if (fwd > 0.4 && fwd < 6.5 && lat < 1.20) {
        if (fwd < minObstacleDist) minObstacleDist = fwd;
      }
    }

    // 🛑 Dynamic Speed Control
    let targetSpeed = speed;
    if (minObstacleDist < 3.5) {
      targetSpeed = 0; // Safe stop
    } else if (minObstacleDist < 7.5) {
      const factor = (minObstacleDist - 3.5) / (7.5 - 3.5);
      targetSpeed = speed * Math.max(0.15, factor);
    }

    // ⏱️ Anti-Gridlock Watchdog: if stopped for > 2.0s, slowly creep forward to prevent traffic freeze
    if (currentSpeedRef.current < 0.2) {
      stuckTimerRef.current += dt;
      if (stuckTimerRef.current > 2.0) {
        targetSpeed = Math.max(targetSpeed, 2.2);
      }
    } else {
      stuckTimerRef.current = 0;
    }

    // Smooth physics lerp
    const lerpRate = targetSpeed < currentSpeedRef.current ? 8.0 : 2.8;
    currentSpeedRef.current = THREE.MathUtils.lerp(currentSpeedRef.current, targetSpeed, dt * lerpRate);

    // Register active position in TrafficRegistry
    registerVehiclePos(vehicleId, pos[0], pos[2], heading, currentSpeedRef.current);

    // Advance vehicle position only when moving
    if (currentSpeedRef.current > 0.05) {
      progressRef.current = (progressRef.current + (currentSpeedRef.current * dt) / roadPath.totalLength) % 1.0;
    }
  });

  return (
    <group ref={groupRef}>
      {type === 'taxi' && <GLBYellowTaxi variant={variant} scale={scale} />}
      {type === 'police' && <GLBPoliceCar variant={variant} scale={scale} sirenActive={sirenActive} />}
      {type === 'bus' && <GLBTransitBus variant={variant} scale={[2.5, 2.5, 2.5]} tint={tint} />}
      {type === 'sedan' && <GLBSedanCar tint={tint} scale={scale} />}
    </group>
  );
}

// 🅿️ Realistic Parked Vehicles in Safe Off-Road Driveways & Lots
const PARKED_VEHICLES = [
  // Civic Hall driveways & government parking
  { type: 'police', variant: 'police.002', pos: [-10, 0.05, -92], rot: Math.PI / 2, scale: [2.7, 2.7, 2.7], sirenActive: false },
  { type: 'taxi', variant: 'TAXI.003', pos: [10, 0.05, -92], rot: -Math.PI / 2, scale: [2.7, 2.7, 2.7] },
  { type: 'sedan', tint: '#ffffff', pos: [-36, 0.05, -72], rot: 0, scale: [2.7, 2.7, 2.7] },
  { type: 'sedan', tint: '#1d3557', pos: [36, 0.05, -72], rot: 0, scale: [2.7, 2.7, 2.7] },

  // Residential & commercial parking plots
  { type: 'sedan', tint: '#e63946', pos: [-34, 0.05, -48], rot: Math.PI / 2, scale: [2.7, 2.7, 2.7] },
  { type: 'sedan', tint: '#457b9d', pos: [34, 0.05, -48], rot: -Math.PI / 2, scale: [2.7, 2.7, 2.7] },
  { type: 'taxi', variant: 'TAXI.002', pos: [-8, 0.05, -16], rot: 0, scale: [2.7, 2.7, 2.7] },
  { type: 'police', variant: 'police.001', pos: [8, 0.05, -16], rot: 0, scale: [2.7, 2.7, 2.7], sirenActive: false },
  { type: 'sedan', tint: '#2a9d8f', pos: [-74, 0.05, 38], rot: Math.PI / 2, scale: [2.7, 2.7, 2.7] },
  { type: 'sedan', tint: '#9b5de5', pos: [74, 0.05, 38], rot: -Math.PI / 2, scale: [2.7, 2.7, 2.7] },
  { type: 'bus', variant: 'BUS.004', pos: [8, 0.05, 50], rot: 0, scale: [2.5, 2.5, 2.5] },
  { type: 'sedan', tint: '#fb8500', pos: [-50, 0.05, 18], rot: 0, scale: [2.7, 2.7, 2.7] },
  { type: 'sedan', tint: '#212529', pos: [50, 0.05, 18], rot: 0, scale: [2.7, 2.7, 2.7] },
];

export function CityTraffic() {
  return (
    <group name="city-traffic-system">
      {/* ========================================================================= */}
      {/* 🚓 1. POLICE PATROL CRUISERS */}
      {/* ========================================================================= */}
      <StrictMovingVehicle id="police_1" type="police" variant="police.001" roadPath={PATH_PERIMETER_CW} speed={12.0} startU={0.05} sirenActive={true} />
      <StrictMovingVehicle id="police_2" type="police" variant="police.002" roadPath={PATH_PERIMETER_CCW} speed={12.5} startU={0.55} sirenActive={true} />
      <StrictMovingVehicle id="police_3" type="police" variant="police" roadPath={PATH_SPINE_EXPRESS} speed={13.0} startU={0.25} sirenActive={true} />
      <StrictMovingVehicle id="police_4" type="police" variant="police.001" roadPath={PATH_NORTH_CIVIC_TECH} speed={11.5} startU={0.45} sirenActive={true} />

      {/* ========================================================================= */}
      {/* 🚕 2. CLASSIC YELLOW CITY CABS */}
      {/* ========================================================================= */}
      <StrictMovingVehicle id="taxi_1" type="taxi" variant="TAXI.001" roadPath={PATH_PERIMETER_CW} speed={9.5} startU={0.35} />
      <StrictMovingVehicle id="taxi_2" type="taxi" variant="TAXI.002" roadPath={PATH_NE_DOWNTOWN} speed={9.0} startU={0.15} />
      <StrictMovingVehicle id="taxi_3" type="taxi" variant="TAXI.003" roadPath={PATH_NW_VILLAGE} speed={9.2} startU={0.6} />
      <StrictMovingVehicle id="taxi_4" type="taxi" variant="TAXI.001" roadPath={PATH_SE_HARBOR} speed={8.8} startU={0.8} />
      <StrictMovingVehicle id="taxi_5" type="taxi" variant="TAXI.002" roadPath={PATH_SW_ECO} speed={9.2} startU={0.4} />
      <StrictMovingVehicle id="taxi_6" type="taxi" variant="TAXI.003" roadPath={PATH_NORTH_CIVIC_TECH} speed={9.0} startU={0.85} />

      {/* ========================================================================= */}
      {/* 🚌 3. CITY TRANSIT PASSENGER BUSES */}
      {/* ========================================================================= */}
      <StrictMovingVehicle id="bus_1" type="bus" variant="BUS" roadPath={PATH_PERIMETER_CW} speed={7.0} startU={0.68} />
      <StrictMovingVehicle id="bus_2" type="bus" variant="BUS.004" roadPath={PATH_SE_HARBOR} speed={6.8} startU={0.2} tint="#3a86ff" />
      <StrictMovingVehicle id="bus_3" type="bus" variant="BUS" roadPath={PATH_SW_ECO} speed={6.8} startU={0.55} tint="#06d6a0" />
      <StrictMovingVehicle id="bus_4" type="bus" variant="BUS.004" roadPath={PATH_SPINE_EXPRESS} speed={7.0} startU={0.85} />
      <StrictMovingVehicle id="bus_5" type="bus" variant="BUS" roadPath={PATH_PERIMETER_CCW} speed={7.0} startU={0.18} tint="#f72585" />

      {/* ========================================================================= */}
      {/* 🚗 4. SEDAN PASSENGER CARS */}
      {/* ========================================================================= */}
      <StrictMovingVehicle id="sedan_1" type="sedan" tint="#e63946" roadPath={PATH_PERIMETER_CW} speed={9.4} startU={0.88} />
      <StrictMovingVehicle id="sedan_2" type="sedan" tint="#00bbf9" roadPath={PATH_NW_VILLAGE} speed={8.6} startU={0.1} />
      <StrictMovingVehicle id="sedan_3" type="sedan" tint="#ffd166" roadPath={PATH_NE_DOWNTOWN} speed={9.5} startU={0.65} />
      <StrictMovingVehicle id="sedan_4" type="sedan" tint="#06d6a0" roadPath={PATH_SW_ECO} speed={8.5} startU={0.15} />
      <StrictMovingVehicle id="sedan_5" type="sedan" tint="#9b5de5" roadPath={PATH_SE_HARBOR} speed={9.0} startU={0.4} />
      <StrictMovingVehicle id="sedan_6" type="sedan" tint="#f72585" roadPath={PATH_SPINE_EXPRESS} speed={9.6} startU={0.5} />
      <StrictMovingVehicle id="sedan_7" type="sedan" tint="#ffffff" roadPath={PATH_NORTH_CIVIC_TECH} speed={8.8} startU={0.68} />
      <StrictMovingVehicle id="sedan_8" type="sedan" tint="#212529" roadPath={PATH_PERIMETER_CCW} speed={9.8} startU={0.85} />
      <StrictMovingVehicle id="sedan_9" type="sedan" tint="#fb8500" roadPath={PATH_NW_VILLAGE} speed={8.8} startU={0.78} />
      <StrictMovingVehicle id="sedan_10" type="sedan" tint="#457b9d" roadPath={PATH_NE_DOWNTOWN} speed={9.2} startU={0.38} />

      {/* ========================================================================= */}
      {/* 🅿️ 5. STATIC PARKED VEHICLES */}
      {/* ========================================================================= */}
      {PARKED_VEHICLES.map((v, i) => (
        <group key={`parked-${i}`} position={v.pos} rotation={[0, v.rot, 0]}>
          {v.type === 'sedan' && <GLBSedanCar tint={v.tint} scale={v.scale} />}
          {v.type === 'taxi' && <GLBYellowTaxi variant={v.variant} scale={v.scale} />}
          {v.type === 'police' && <GLBPoliceCar variant={v.variant} scale={v.scale} sirenActive={v.sirenActive} />}
          {v.type === 'bus' && <GLBTransitBus variant={v.variant} scale={v.scale} />}
        </group>
      ))}
    </group>
  );
}

export default CityTraffic;
