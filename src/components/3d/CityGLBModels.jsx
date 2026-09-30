import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const GLB_URL = '/models/lowpolycity.glb';

// Helper to extract any node/mesh from the city GLB and center its base at (0, 0, 0)
function useCityMesh(nodeName, tint = null) {
  const { nodes } = useGLTF(GLB_URL);

  const centeredObject = useMemo(() => {
    const rawNode = nodes[nodeName];
    if (!rawNode) return new THREE.Group();

    const clone = rawNode.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    // Compute bounding box to center X/Z and align ground Y to 0
    const box = new THREE.Box3().setFromObject(clone);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const minY = box.min.y;

    clone.position.set(-center.x, -minY, -center.z);

    const pivot = new THREE.Group();
    pivot.add(clone);

    pivot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = Math.max(child.material.roughness || 0.5, 0.4);
          if (tint) {
            // Apply vibrant color tint to building walls and main structure
            if (!child.material.name || !child.material.name.toLowerCase().includes('vetro')) {
              child.material.color = new THREE.Color(tint);
            }
          }
        }
      }
    });

    return pivot;
  }, [nodes, nodeName, tint]);

  return centeredObject;
}

// 🏡 Mediterranean Orange Villa with Terracotta Roof (2-Story Villa: ~8.2m wide, 4.6m tall)
export function GLBOrangeVilla({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [3.0, 3.2, 3.0], tint = null }) {
  const model = useCityMesh('casaArancione', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🏡 Cozy Blue Cottage with Chimney (2-Story Cottage: ~8.4m wide, 4.4m tall)
export function GLBBlueCottage({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.8, 3.0, 2.8], tint = null }) {
  const model = useCityMesh('casaBlu', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🏡 Purple Residential Townhouse (Urban Rowhouse: ~8.2m wide, 4.5m tall)
export function GLBPurpleTownhouse({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.8, 3.2, 2.8], tint = null }) {
  const model = useCityMesh('CasaViola', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🏨 Grand Hotel with 3D Signage & Entrance Canopy (Towering High-Rise: ~22m tall!)
export function GLBGrandHotel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.4, 3.6, 2.4], tint = null }) {
  const model = useCityMesh('Hotel', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🏛️ Classical Metropolis Palace / Multi-Story Highrise Tower (Towering Palazzo: ~26m tall!)
export function GLBPalazzo({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [1.8, 2.6, 1.8], tint = null }) {
  const model = useCityMesh('Palazzo', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 💈 Barber Shop / Boutique Storefront with Awning (Cozy Storefront: ~5.0m wide, 3.9m tall)
export function GLBBarberShop({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [3.0, 3.0, 3.0], tint = null }) {
  const model = useCityMesh('Barbiere', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// ⛲ Tiered 3D Stone Water Fountain (Grand Plaza Fountain: ~5.0m diameter)
export function GLBStoneFountain({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.5, 2.5, 2.5], tint = null }) {
  const model = useCityMesh('Fontana', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🪑 Wooden Park Bench (Human-proportioned Bench: ~1.5m wide)
export function GLBParkBench({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.5, 2.5, 2.5], tint = null }) {
  const model = useCityMesh('Panca', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 💡 Low-Poly City Street Light (Streetlight: ~4.2m tall)
export function GLBCityLamp({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.5, 2.8, 2.5], tint = null }) {
  const model = useCityMesh('Lampione', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🚕 Yellow City Taxi (TAXI.001, TAXI.002, TAXI.003)
export function GLBYellowTaxi({ variant = 'TAXI.001', position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.6, 2.6, 2.6] }) {
  const model = useCityMesh(variant);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🚓 Police Cruiser (police, police.001, police.002)
export function GLBPoliceCar({ variant = 'police.001', position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.6, 2.6, 2.6], sirenActive = true }) {
  const model = useCityMesh(variant);
  const instance = useMemo(() => model.clone(true), [model]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={instance} />
      {/* 🚨 Flashing Police Siren Emergency Beacon */}
      {sirenActive && (
        <group position={[0, 0.65, -0.05]}>
          <pointLight color="#ef233c" intensity={1.5} distance={6} />
          <pointLight color="#00b4d8" intensity={1.5} distance={6} />
        </group>
      )}
    </group>
  );
}

// 🚌 Transit Passenger Bus (BUS, BUS.004)
export function GLBTransitBus({ variant = 'BUS', position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.4, 2.4, 2.4], tint = null }) {
  const model = useCityMesh(variant, tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// 🚗 Sedan Passenger Car (AutoBASE in multiple vibrant colorways)
export function GLBSedanCar({ position = [0, 0, 0], rotation = [0, 0, 0], scale = [2.6, 2.6, 2.6], tint = '#ef476f' }) {
  const model = useCityMesh('AutoBASE', tint);
  const instance = useMemo(() => model.clone(true), [model]);
  return <primitive object={instance} position={position} rotation={rotation} scale={scale} />;
}

// Preload the GLB model asset
useGLTF.preload(GLB_URL);

