import * as THREE from 'three';

const detectLowEndDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (memory && memory <= 4) return true;
  if (cores && cores <= 2) return true;
  if (isMobile && (!memory || memory <= 6)) return true;
  return false;
};

const detectSlowNetwork = (): boolean => {
  if (typeof window === 'undefined') return false;
  const connection = (navigator as any).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return typeof connection.effectiveType === 'string' && /\b(?:slow-2g|2g|3g)\b/.test(connection.effectiveType);
};

const detectVeryLowEndDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const memory = (navigator as any).deviceMemory;
  const cores = navigator.hardwareConcurrency;
  if (memory && memory <= 2) return true;
  if (cores && cores <= 1) return true;
  return false;
};

export const isLowEndDevice = detectLowEndDevice();
export const isSlowNetwork = detectSlowNetwork();
export const isVeryLowEndDevice = detectVeryLowEndDevice();
export const useLiteScene = isLowEndDevice || isSlowNetwork;

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || (navigator as any).maxTouchPoints > 0;
};

export interface SceneBudget {
  npcMax: number;
  carMax: number;
  shadowMapSize: number;
  shadowType: THREE.ShadowMapType;
  dprMin: number;
  dprMax: number;
  fogNear: number;
  fogFar: number;
  cameraFar: number;
  antialias: boolean;
  shadows: boolean;
  hemisphereLight: boolean;
  decorScale: number;
  performanceMin: number;
}

/*
 * Scene budgets per device tier.
 *
 * Updated 2026-05-19: shadows are OFF across the board by default. They were
 * the biggest single FPS cost (extra full-scene render pass + 512×512
 * shadow map every frame), and after subjective testing on mid-range
 * Android phones the visual difference is negligible at the small shop
 * scale. The "full" tier can opt back in by editing this file.
 *
 * DPR limits are also tightened: the desktop "full" tier caps at 1.0 (was
 * 1.25) — there's no measurable visual improvement above 1.0 for a
 * stylised low-poly shop, and fillrate scales with the square of DPR.
 */
export const SCENE_BUDGET: SceneBudget = isVeryLowEndDevice
  ? {
      npcMax: 2,
      carMax: 1,
      shadowMapSize: 256,
      shadowType: THREE.BasicShadowMap,
      dprMin: 0.45,
      dprMax: 0.65,
      fogNear: 16,
      fogFar: 40,
      cameraFar: 55,
      antialias: false,
      shadows: false,
      hemisphereLight: false,
      decorScale: 0.35,
      performanceMin: 0.25,
    }
  : useLiteScene
  ? {
      npcMax: 3,
      carMax: 1,
      shadowMapSize: 256,
      shadowType: THREE.BasicShadowMap,
      dprMin: 0.55,
      dprMax: 0.8,
      fogNear: 22,
      fogFar: 55,
      cameraFar: 75,
      antialias: false,
      shadows: false,
      hemisphereLight: false,
      decorScale: 0.55,
      performanceMin: 0.3,
    }
  : {
      npcMax: 6,
      carMax: 3,
      shadowMapSize: 512,
      shadowType: THREE.BasicShadowMap,
      dprMin: 0.9,
      dprMax: 1.0,
      fogNear: 35,
      fogFar: 110,
      cameraFar: 130,
      antialias: true,
      shadows: false,
      hemisphereLight: false,
      decorScale: 1,
      performanceMin: 0.5,
    };
