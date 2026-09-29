import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D, Center } from '@react-three/drei';
import * as THREE from 'three';

const PIXEL_FONT_JSON = '/fonts/PressStart2P_Regular.json';

export function MarketCap3D({
  marketCap = 0,
  position = [-2.0, 14.5, -20.0],
  rotation = [0, 0.70, 0],
  scale = 1.15,
}) {
  const groupRef = useRef();

  // Smoothly format market cap value (e.g. $15,420 or $0)
  const formattedVal = useMemo(() => {
    const val = Math.round(marketCap);
    return `$${val.toLocaleString()}`;
  }, [marketCap]);

  // High-contrast dual-tone materials (Bright glowing front face + pitch black extruded outline sides)
  const {
    labelFrontMat,
    labelSideMat,
    valueFrontMat,
    valueSideMat,
    blackShadowMat,
  } = useMemo(() => {
    return {
      labelFrontMat: new THREE.MeshStandardMaterial({
        color: '#ffe600',
        emissive: '#ff9900',
        emissiveIntensity: 0.75,
        roughness: 0.15,
        metalness: 0.5,
        side: THREE.DoubleSide,
      }),
      labelSideMat: new THREE.MeshBasicMaterial({
        color: '#000000',
        side: THREE.DoubleSide,
      }),
      valueFrontMat: new THREE.MeshStandardMaterial({
        color: '#39ff14',
        emissive: '#00ff44',
        emissiveIntensity: 0.85,
        roughness: 0.1,
        metalness: 0.5,
        side: THREE.DoubleSide,
      }),
      valueSideMat: new THREE.MeshBasicMaterial({
        color: '#000000',
        side: THREE.DoubleSide,
      }),
      blackShadowMat: new THREE.MeshBasicMaterial({
        color: '#000000',
        side: THREE.DoubleSide,
      }),
    };
  }, []);

  // Gentle subtle hovering in 3D scene space
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.set(
      position[0],
      position[1] + Math.sin(t * 1.5) * 0.3,
      position[2]
    );
    groupRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      {/* 🏷️ Top Header: "MARKET CAP" */}
      <Center position={[0, 1.45, 0]}>
        <group>
          {/* 1. Deep 3D Black Drop-Shadow */}
          <Text3D
            font={PIXEL_FONT_JSON}
            size={0.65}
            height={0.35}
            position={[0.08, -0.08, -0.06]}
            curveSegments={4}
            bevelEnabled={false}
            letterSpacing={0.06}
            material={blackShadowMat}
          >
            MARKET CAP
          </Text3D>

          {/* 2. Front 3D Text with Sharp Black Outlined Sides */}
          <Text3D
            font={PIXEL_FONT_JSON}
            size={0.65}
            height={0.3}
            position={[0, 0, 0]}
            curveSegments={4}
            bevelEnabled={false}
            letterSpacing={0.06}
            material={[labelFrontMat, labelSideMat]}
            castShadow
            receiveShadow
          >
            MARKET CAP
          </Text3D>
        </group>
      </Center>

      {/* 💰 Big 3D Market Cap Amount (Re-centered on every value change) */}
      <Center key={formattedVal} position={[0, -0.2, 0]}>
        <group>
          {/* 1. Deep 3D Black Drop-Shadow */}
          <Text3D
            font={PIXEL_FONT_JSON}
            size={1.38}
            height={0.55}
            position={[0.12, -0.12, -0.08]}
            curveSegments={4}
            bevelEnabled={false}
            letterSpacing={0.03}
            material={blackShadowMat}
          >
            {formattedVal}
          </Text3D>

          {/* 2. Front 3D Number with Sharp Black Outlined Sides */}
          <Text3D
            font={PIXEL_FONT_JSON}
            size={1.38}
            height={0.5}
            position={[0, 0, 0]}
            curveSegments={4}
            bevelEnabled={false}
            letterSpacing={0.03}
            material={[valueFrontMat, valueSideMat]}
            castShadow
            receiveShadow
          >
            {formattedVal}
          </Text3D>
        </group>
      </Center>
    </group>
  );
}

export default MarketCap3D;
