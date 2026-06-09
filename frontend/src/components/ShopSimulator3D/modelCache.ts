import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useMemo } from 'react';
import { resolvePublicAssetUrl } from './assetPath';
import { useLiteScene, isVeryLowEndDevice } from './performance';

export const DEFAULT_CHARACTER_MODEL = resolvePublicAssetUrl('assets/dassets/Casual Character.glb');

export const CAR_MODELS = [
  resolvePublicAssetUrl('assets/dassets/Car.glb'),
  resolvePublicAssetUrl('assets/dassets/Police Car.glb'),
  resolvePublicAssetUrl('assets/dassets/CAR Model.glb'),
];

export const NPC_MODELS = [
  resolvePublicAssetUrl('assets/dassets/avatar/Animated Woman.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Business Man.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Worker.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Witch.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Adventurer.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Man.glb'),
];

export const ACTIVE_CAR_MODELS = isVeryLowEndDevice
  ? CAR_MODELS.slice(0, 1)
  : useLiteScene
  ? CAR_MODELS.slice(0, 1)
  : CAR_MODELS;

export const ACTIVE_NPC_MODELS = isVeryLowEndDevice
  ? NPC_MODELS.slice(0, 2)
  : useLiteScene
  ? NPC_MODELS.slice(0, 3)
  : NPC_MODELS;

export const EXTERIOR_MODELS = {
  tulip: resolvePublicAssetUrl('assets/dassets/tulip 3.glb'),
  grass: resolvePublicAssetUrl('assets/dassets/Grass 2.glb'),
  largeBldg: resolvePublicAssetUrl('assets/dassets/Large Building.glb'),
  smallBldg: resolvePublicAssetUrl('assets/dassets/Small Building.glb'),
};

const INTERIOR_MODELS = [
  resolvePublicAssetUrl('assets/dassets/interior/ATM.glb'),
  resolvePublicAssetUrl('assets/dassets/interior/Vending Machine.glb'),
  resolvePublicAssetUrl('assets/dassets/interior/Butter Robot.glb'),
  resolvePublicAssetUrl('assets/dassets/interior/toy robot.glb'),
];

let criticalPreloaded = false;
let backgroundPrefetched = false;

// Critical = ONLY the player avatar.
// Anything else loads lazily on first render, behind individual Suspense
// boundaries, so it doesn't compete with the player for bandwidth.
function getCriticalModels(savedAvatarPath?: string): string[] {
  const list = [DEFAULT_CHARACTER_MODEL];
  if (savedAvatarPath && savedAvatarPath !== DEFAULT_CHARACTER_MODEL) {
    list.push(savedAvatarPath);
  }
  return list;
}

export function preloadCriticalModels(savedAvatarPath?: string) {
  if (criticalPreloaded) return;
  criticalPreloaded = true;
  getCriticalModels(savedAvatarPath).forEach((m) => useGLTF.preload(m));
}

// Background prefetch via raw fetch() — this warms the HTTP cache so that
// when a component later calls useGLTF(path), the GLB bytes are already in
// the browser cache and the parse happens instantly.
//
// Crucially, this bypasses drei's loading manager, so it does NOT show up in
// `useProgress()` — the progress bar stays driven by critical loads only and
// fills smoothly to 100% as soon as the player is ready.
async function backgroundFetch(url: string) {
  try {
    const init: RequestInit & { priority?: 'low' | 'high' | 'auto' } = {
      priority: 'low',
      credentials: 'omit',
      cache: 'force-cache',
    };
    await fetch(url, init);
  } catch {
    // Best-effort; failures retry on real useGLTF
  }
}

function scheduleIdle(cb: () => void, delay = 0) {
  if (typeof window === 'undefined') return;
  const ric = (window as any).requestIdleCallback as
    | ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => number)
    | undefined;
  if (delay > 0) {
    setTimeout(() => (ric ? ric(() => cb(), { timeout: 4000 }) : cb()), delay);
  } else if (ric) {
    ric(() => cb(), { timeout: 4000 });
  } else {
    setTimeout(cb, 50);
  }
}

// Background prefetch order: NPCs first (most likely to appear in view),
// then cars, then exterior, then interior.
const BACKGROUND_QUEUE = [
  ...ACTIVE_NPC_MODELS,
  ...ACTIVE_CAR_MODELS,
  ...Object.values(EXTERIOR_MODELS),
  ...INTERIOR_MODELS,
];

export function preloadIdleModels() {
  if (backgroundPrefetched) return;
  backgroundPrefetched = true;
  // Start ~3 seconds after this is called (scene should be interactive by then),
  // and fan out one fetch per ~200 ms so we never saturate the connection.
  BACKGROUND_QUEUE.forEach((url, i) => {
    scheduleIdle(() => backgroundFetch(url), 3000 + i * 200);
  });
}

interface CloneOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}

// Clone a GLTF scene with a fresh skeleton (so animations don't share state)
// while applying shadow/culling flags up-front. Memoise per (scene, options).
export function useSkeletonClone(scene: THREE.Object3D, opts: CloneOptions = {}) {
  const { castShadow = false, receiveShadow = false, frustumCulled = true } = opts;
  return useMemo(() => {
    const c = cloneWithSkeleton(scene) as THREE.Object3D;
    c.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
        mesh.frustumCulled = frustumCulled;
      }
    });
    return c;
  }, [scene, castShadow, receiveShadow, frustumCulled]);
}

// For static decor (buildings, plants), clone once and freeze matrix.
const staticCloneCache = new WeakMap<THREE.Object3D, THREE.Object3D>();
export function useStaticClone(scene: THREE.Object3D): THREE.Object3D {
  return useMemo(() => {
    let cached = staticCloneCache.get(scene);
    if (!cached) {
      cached = scene.clone(true);
      cached.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.frustumCulled = true;
          mesh.matrixAutoUpdate = false;
          mesh.updateMatrix();
        }
      });
      staticCloneCache.set(scene, cached);
    }
    const inst = cached.clone(true);
    inst.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.matrixAutoUpdate = false;
      }
    });
    return inst;
  }, [scene]);
}
