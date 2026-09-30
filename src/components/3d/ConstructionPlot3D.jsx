import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { SafeHtml } from './SafeHtml';
import * as THREE from 'three';
import {
  GLBOrangeVilla,
  GLBBlueCottage,
  GLBPurpleTownhouse,
  GLBGrandHotel,
  GLBPalazzo,
  GLBBarberShop,
} from './CityGLBModels';

// Materials for stylized construction plot
const foundationMat = new THREE.MeshStandardMaterial({
  color: '#495057',
  roughness: 0.9,
  metalness: 0.1,
});

const hazardBorderMat = new THREE.MeshStandardMaterial({
  color: '#ffd166',
  emissive: '#e69500',
  emissiveIntensity: 0.35,
  roughness: 0.6,
});

const rebarSteelMat = new THREE.MeshStandardMaterial({
  color: '#adb5bd',
  metalness: 0.8,
  roughness: 0.3,
});

// Accurate rooftop heights for GLB models so tags float prominently above the roof
const BUILDING_ROOFTOP_HEIGHTS = {
  palazzo: 27.5,
  grand_hotel: 25.0,
  orange_villa: 16.5,
  blue_cottage: 15.5,
  purple_townhouse: 16.5,
  barber_shop: 14.5,
};

export function ConstructionPlot3D({
  plot,
  launchedBuilding = null,
  onSelectPlot,
}) {
  const beaconRef = useRef();
  const { id, name, district, x, z, defaultRot = 0 } = plot;

  // Subtle floating beacon animation
  useFrame((state) => {
    if (beaconRef.current) {
      const t = state.clock.getElapsedTime();
      beaconRef.current.position.y = 1.2 + Math.sin(t * 2.5) * 0.25;
    }
  });

  // If a building has already been launched on this plot, render the built structure
  if (launchedBuilding) {
    const {
      type,
      scale = [2.4, 2.8, 2.4],
      rot = defaultRot,
      color,
      tint,
      customName,
      ownerWallet,
    } = launchedBuilding;
    const pos = [x, 0, z];
    const rotation = [0, rot, 0];
    const tintColor = tint || color || null;
    const tagHeight = (BUILDING_ROOFTOP_HEIGHTS[type] || 18.0) * (scale?.[1] ? scale[1] / 2.6 : 1.0) + 1.5;

    return (
      <group name={`built-${id}`} position={pos}>
        {type === 'palazzo' && <GLBPalazzo rotation={rotation} scale={scale} tint={tintColor} />}
        {type === 'grand_hotel' && <GLBGrandHotel rotation={rotation} scale={scale} tint={tintColor} />}
        {type === 'orange_villa' && <GLBOrangeVilla rotation={rotation} scale={scale} tint={tintColor} />}
        {type === 'blue_cottage' && <GLBBlueCottage rotation={rotation} scale={scale} tint={tintColor} />}
        {type === 'purple_townhouse' && <GLBPurpleTownhouse rotation={rotation} scale={scale} tint={tintColor} />}
        {type === 'barber_shop' && <GLBBarberShop rotation={rotation} scale={scale} tint={tintColor} />}

        {/* 🏷️ Big Prominent Rooftop Landmark Tag */}
        {customName && (
          <SafeHtml position={[0, tagHeight, 0]} center distanceFactor={44} occlude={false}>
            <div className="built-building-nametag big">
              <div className="building-nametag-inner">
                <span className="building-icon">🏛️</span>
                <div className="building-nametag-texts">
                  <span className="building-text">{customName}</span>
                  {ownerWallet && (
                    <span className="building-owner-sub">
                      👑 {ownerWallet.slice(0, 4)}...{ownerWallet.slice(-4)}
                    </span>
                  )}
                </div>
              </div>
              <div className="building-nametag-arrow" />
            </div>
          </SafeHtml>
        )}
      </group>
    );
  }

  const handlePlotSelect = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (e && e.preventDefault) e.preventDefault();
    if (onSelectPlot) onSelectPlot(plot);
  };

  // 🏗️ Empty Construction Plot
  return (
    <group
      name={`plot-${id}`}
      position={[x, 0, z]}
      onClick={handlePlotSelect}
      onPointerDown={handlePlotSelect}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Invisible Enlarged 3D Click Hitbox */}
      <mesh
        position={[0, 1.8, 0]}
        visible={false}
        onClick={handlePlotSelect}
        onPointerDown={handlePlotSelect}
      >
        <cylinderGeometry args={[4.8, 4.8, 3.8, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Concrete Foundation Slab */}
      <mesh position={[0, 0.04, 0]} receiveShadow material={foundationMat}>
        <boxGeometry args={[9.2, 0.08, 9.2]} />
      </mesh>

      {/* Hazard Yellow/Black Caution Borders */}
      <mesh position={[0, 0.082, 4.5]} material={hazardBorderMat}>
        <boxGeometry args={[9.2, 0.06, 0.22]} />
      </mesh>
      <mesh position={[0, 0.082, -4.5]} material={hazardBorderMat}>
        <boxGeometry args={[9.2, 0.06, 0.22]} />
      </mesh>
      <mesh position={[4.5, 0.082, 0]} material={hazardBorderMat}>
        <boxGeometry args={[0.22, 0.06, 9.2]} />
      </mesh>
      <mesh position={[-4.5, 0.082, 0]} material={hazardBorderMat}>
        <boxGeometry args={[0.22, 0.06, 9.2]} />
      </mesh>

      {/* 4 Corner Steel Rebar / Construction Poles */}
      {[
        [-4.2, -4.2],
        [4.2, -4.2],
        [-4.2, 4.2],
        [4.2, 4.2],
      ].map(([px, pz], i) => (
        <group key={`pole-${i}`} position={[px, 0.9, pz]}>
          <mesh castShadow material={rebarSteelMat}>
            <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color="#ff9f1c" emissive="#ff9f1c" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}

      {/* Center Hologram Beacon Marker */}
      <group ref={beaconRef} position={[0, 1.2, 0]}>
        <mesh
          onClick={handlePlotSelect}
          onPointerDown={handlePlotSelect}
        >
          <octahedronGeometry args={[0.65, 0]} />
          <meshStandardMaterial
            color="#00f5d4"
            emissive="#00f5d4"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
            wireframe={false}
          />
        </mesh>
        <pointLight color="#00f5d4" intensity={1.8} distance={8} />

        {/* Floating HTML Plot Badge */}
        <SafeHtml
          position={[0, 4.8, 0]}
          center
          distanceFactor={40}
          occlude={false}
          pointerEvents="auto"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          <div
            className="empty-plot-hologram-badge clickable big"
            onClick={handlePlotSelect}
            onPointerDown={handlePlotSelect}
            role="button"
            tabIndex={0}
          >
            <span className="plot-badge-icon">🏗️</span>
            <div className="plot-badge-content">
              <span className="plot-badge-title">AVAILABLE PLOT</span>
              <span className="plot-badge-name">{name}</span>
            </div>
            <span className="plot-badge-cta">CLICK TO BUILD</span>
          </div>
        </SafeHtml>
      </group>
    </group>
  );
}

export default ConstructionPlot3D;
