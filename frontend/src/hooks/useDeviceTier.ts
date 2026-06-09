import { useEffect, useState } from 'react';

/**
 * useDeviceTier — single source of truth for "how much can this device do?".
 *
 * Combines four signals, picks the lowest:
 *   1. `navigator.hardwareConcurrency`  — CPU thread count.
 *   2. `navigator.deviceMemory`         — RAM in GB (Chromium-only, optional).
 *   3. WebGL renderer string            — picks up Mali / Adreno / PowerVR.
 *   4. `prefers-reduced-motion`         — accessibility intent.
 *
 * The result drives an adaptive layer:
 *   • `<html data-perf="low|mid|high">` so CSS can shed expensive effects
 *     (backdrop-blur, big shadows, animations) on slow GPUs.
 *   • R3F Canvas defaults (`dpr`, `frameloop`, `antialias`, particle counts).
 *   • Toggles for confetti / ambience density throughout the app.
 *
 * The detection runs ONCE on mount, then writes `data-perf` to <html>.
 * Components that care can either read this hook or use CSS selectors
 * (e.g. `:where(html[data-perf="low"]) .my-fx`) — the CSS path is free
 * (no re-render).
 */
export type DeviceTier = 'low' | 'mid' | 'high';

export interface DeviceProfile {
  tier: DeviceTier;
  prefersReducedMotion: boolean;
  /** True if the user is on a known constrained renderer (mobile GPU). */
  isMobileGPU: boolean;
  /** Device pixel ratio cap recommended for R3F (passed to `dpr={[lo, hi]}`). */
  dprCap: [number, number];
  /** Maximum particle count for ambience / confetti / sparkles. */
  particleBudget: number;
  /** Whether shadows should render in 3D scenes. */
  shadows: boolean;
  /** Whether MSAA antialiasing should be enabled. */
  antialias: boolean;
  /** Hint for components: skip non-essential animation. */
  reduceMotion: boolean;
  /** Reasons fed into the decision — handy for a debug panel later. */
  signals: {
    cores: number;
    memoryGB: number | null;
    renderer: string;
  };
}

const KNOWN_LOW_GPU = /(adreno 3|adreno 4|mali-t|mali-4|mali-6|powervr sgx|powervr ge[0-9]?)/i;
const KNOWN_HIGH_GPU = /(rtx|m[12-9] (pro|max|ultra)|apple m[2-9])/i;

const readWebGLRenderer = (): string => {
  if (typeof document === 'undefined') return '';
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return '';
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
  } catch {
    return '';
  }
};

const computeProfile = (): DeviceProfile => {
  if (typeof window === 'undefined') {
    return {
      tier: 'mid',
      prefersReducedMotion: false,
      isMobileGPU: false,
      dprCap: [0.75, 1.5],
      particleBudget: 80,
      shadows: false,
      antialias: false,
      reduceMotion: false,
      signals: { cores: 4, memoryGB: 4, renderer: '' },
    };
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const memoryGB =
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
      : null;
  const renderer = readWebGLRenderer().toLowerCase();
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const isMobileGPU =
    KNOWN_LOW_GPU.test(renderer) ||
    /android|iphone|ipad/i.test(navigator.userAgent) ||
    !!(navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints;

  // Decide tier by the WORST signal — a 4-core CPU with 2 GB RAM and a
  // Mali GPU is "low" even on a fast network.
  let tier: DeviceTier = 'high';
  if (cores <= 4) tier = 'mid';
  if (cores <= 2) tier = 'low';
  if (memoryGB !== null) {
    if (memoryGB <= 2) tier = 'low';
    else if (memoryGB <= 4 && tier === 'high') tier = 'mid';
  }
  if (KNOWN_LOW_GPU.test(renderer)) tier = 'low';
  if (KNOWN_HIGH_GPU.test(renderer) && tier === 'mid') tier = 'high';
  // Reduced motion is a strong "I want simple" signal — drop a notch.
  if (prefersReducedMotion && tier === 'high') tier = 'mid';

  const profilesByTier: Record<DeviceTier, Omit<DeviceProfile, 'tier' | 'prefersReducedMotion' | 'isMobileGPU' | 'signals'>> = {
    low: {
      dprCap: [0.6, 1.0],
      particleBudget: 18,
      shadows: false,
      antialias: false,
      reduceMotion: true,
    },
    mid: {
      dprCap: [0.75, 1.25],
      particleBudget: 60,
      shadows: false,
      antialias: false,
      reduceMotion: prefersReducedMotion,
    },
    high: {
      dprCap: [1, 2],
      particleBudget: 140,
      shadows: true,
      antialias: true,
      reduceMotion: prefersReducedMotion,
    },
  };

  return {
    tier,
    prefersReducedMotion,
    isMobileGPU,
    ...profilesByTier[tier],
    signals: { cores, memoryGB, renderer },
  };
};

/** Cached profile — detection is ~free, but we still memoise once
 *  per page so every component reads the same value. */
let cached: DeviceProfile | null = null;

export const getDeviceProfile = (): DeviceProfile => {
  if (cached) return cached;
  cached = computeProfile();
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-perf', cached.tier);
    if (cached.reduceMotion) {
      document.documentElement.setAttribute('data-reduce-motion', 'true');
    }
  }
  return cached;
};

/** React hook wrapper. Also re-evaluates `prefers-reduced-motion` live
 *  so toggling the OS setting flips the app without a reload. */
export function useDeviceTier(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => getDeviceProfile());
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      cached = null;
      const next = getDeviceProfile();
      setProfile(next);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return profile;
}

/** Allow users to force a tier (e.g. from a Settings page). Writes to
 *  localStorage so the choice persists across reloads. */
export function setDeviceTierOverride(tier: DeviceTier | null) {
  if (typeof localStorage === 'undefined') return;
  if (tier) localStorage.setItem('aig:perf-tier', tier);
  else localStorage.removeItem('aig:perf-tier');
  cached = null;
  // Re-evaluate so the new tier is reflected on <html> immediately.
  getDeviceProfile();
}

// On module load, apply any stored override so detection happens before
// the first Canvas mounts (R3F reads dpr at construction time).
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('aig:perf-tier') as DeviceTier | null;
    if (stored === 'low' || stored === 'mid' || stored === 'high') {
      const p = computeProfile();
      cached = { ...p, tier: stored };
      document.documentElement.setAttribute('data-perf', stored);
    } else {
      // Eagerly seed `data-perf` so the perf-low CSS layer engages on
      // first paint — no flash of expensive-effects-then-strip.
      getDeviceProfile();
    }
  } catch {
    /* localStorage blocked (private mode / sandboxed iframe) — skip */
  }
}
