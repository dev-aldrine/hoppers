import React, { useRef, useLayoutEffect, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';

/**
 * 🛡️ SafeHtml: High-performance 3D-to-2D overlay component for React 18/19 + R3F
 * - Fixes "Attempted to synchronously unmount a root while React was already rendering"
 * - Automatically projects 3D coordinates to screen space
 * - Handles camera frustum clipping & distance factor scaling
 * - ⛰️ Raycasting Occlusion: Automatically hides/fades behind mountains, clouds, trees & terrain
 * - Defers ReactDOMRoot unmounting safely via setTimeout to prevent render-phase race conditions
 */
export function SafeHtml({
  children,
  position = [0, 0, 0],
  center = true,
  distanceFactor = 22,
  occlude = true,
  style = {},
  className = '',
  zIndexRange = [100, 0],
  pointerEvents = 'none',
}) {
  const { gl, scene, camera, size } = useThree();
  const groupRef = useRef();
  const rootRef = useRef(null);
  const elementRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentOpacityRef = useRef(1);

  // Initialize DOM container & React 18/19 sub-root
  useLayoutEffect(() => {
    isMountedRef.current = true;
    const parent = gl.domElement?.parentElement || document.body;
    const el = document.createElement('div');
    elementRef.current = el;

    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.pointerEvents = style?.pointerEvents || pointerEvents;
    el.style.userSelect = 'none';
    el.style.willChange = 'transform, opacity';
    el.style.transformOrigin = center ? 'center center' : 'top left';
    el.style.transition = 'opacity 0.15s ease-out';

    parent.appendChild(el);
    const root = ReactDOM.createRoot(el);
    rootRef.current = root;

    return () => {
      isMountedRef.current = false;
      // Immediately remove from DOM to prevent visual artifacts
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      // Safely defer unmount to next tick to avoid synchronous unmount during render
      setTimeout(() => {
        try {
          root.unmount();
        } catch (e) {
          // Ignore if already unmounted
        }
      }, 0);
    };
  }, [gl, center]);

  // Render children into sub-root
  useEffect(() => {
    if (rootRef.current && isMountedRef.current) {
      rootRef.current.render(
        <div style={style} className={className}>
          {children}
        </div>
      );
    }
  });

  // Vector & Raycaster caches to avoid per-frame allocations
  const tempV = useRef(new THREE.Vector3()).current;
  const worldPos = useRef(new THREE.Vector3()).current;
  const rayDir = useRef(new THREE.Vector3()).current;
  const raycaster = useRef(new THREE.Raycaster()).current;
  const frameCount = useRef(0);
  const isOccludedRef = useRef(false);

  // Project 3D position to 2D screen coordinates every frame
  useFrame(() => {
    if (!groupRef.current || !elementRef.current || !isMountedRef.current) return;

    groupRef.current.getWorldPosition(worldPos);
    tempV.copy(worldPos);
    tempV.project(camera);

    const isBehind = tempV.z > 1.0;
    if (isBehind) {
      elementRef.current.style.display = 'none';
      return;
    }

    // ⛰️ Raycast Occlusion Check (Evaluated smoothly every 2 frames for 60fps performance)
    if (occlude) {
      frameCount.current++;
      if (frameCount.current % 2 === 0) {
        const dist = camera.position.distanceTo(worldPos);
        rayDir.subVectors(worldPos, camera.position).normalize();
        raycaster.set(camera.position, rayDir);
        raycaster.near = 0.5;
        raycaster.far = Math.max(0.1, dist - 0.4);

        const hits = raycaster.intersectObjects(scene.children, true);
        let occludedHit = false;

        for (let i = 0; i < hits.length; i++) {
          const obj = hits[i].object;
          if (!obj.isMesh || !obj.visible) continue;

          // Verify hit isn't part of this character/plot hierarchy
          let p = obj;
          let isSelf = false;
          while (p) {
            if (p === groupRef.current || p === groupRef.current.parent) {
              isSelf = true;
              break;
            }
            p = p.parent;
          }

          if (!isSelf && hits[i].distance < dist - 0.5) {
            occludedHit = true;
            break;
          }
        }
        isOccludedRef.current = occludedHit;
      }

      // Smooth opacity transition for clean occlusions
      const targetOpacity = isOccludedRef.current ? 0 : 1;
      currentOpacityRef.current += (targetOpacity - currentOpacityRef.current) * 0.25;

      if (currentOpacityRef.current < 0.03) {
        elementRef.current.style.display = 'none';
        return;
      }
      elementRef.current.style.opacity = currentOpacityRef.current.toFixed(3);
    }

    elementRef.current.style.display = 'block';

    const x = (tempV.x * 0.5 + 0.5) * size.width;
    const y = (-tempV.y * 0.5 + 0.5) * size.height;

    let scale = 1;
    if (distanceFactor) {
      const dist = camera.position.distanceTo(worldPos);
      scale = distanceFactor / Math.max(0.1, dist);
    }

    const translate = center
      ? `translate3d(calc(${x.toFixed(2)}px - 50%), calc(${y.toFixed(2)}px - 50%), 0)`
      : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

    elementRef.current.style.transform = `${translate} scale(${scale.toFixed(4)})`;

    // Dynamic z-index based on depth
    if (zIndexRange) {
      const [maxZ, minZ] = zIndexRange;
      const zIndex = Math.floor(maxZ - ((tempV.z + 1) / 2) * (maxZ - minZ));
      elementRef.current.style.zIndex = `${zIndex}`;
    }
  });

  return <group ref={groupRef} position={position} />;
}

export default SafeHtml;
