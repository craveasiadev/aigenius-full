import { useEffect, useState } from 'react';

/**
 * `useScreenShape` — single source of truth for "what kind of screen are we
 * rendering on?". Updates live on resize/orientation change.
 *
 * Use this when CSS media queries aren't enough — for example when you need
 * to swap between two ENTIRELY different layouts (round watch vs phone vs
 * desktop) rather than just tweak paddings.
 *
 * For most styling, prefer the CSS utilities in index.css (.h-dvh,
 * .round-safe, .page-pad, fluid clamps, container queries) — they cover
 * 95 % of cases without a React re-render.
 */
export type ScreenShape = 'round' | 'square' | 'portrait' | 'landscape';
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface ScreenInfo {
  width: number;
  height: number;
  shape: ScreenShape;
  breakpoint: Breakpoint;
  isTouch: boolean;
  isRound: boolean;
  isWatch: boolean;
  /** True when the viewport is roughly 1:1 (foldable inner, iPad split). */
  isSquareish: boolean;
  /** Diagonal side length of the inscribed square inside a round screen,
   *  in px. Equal to `min(width, height)` on rectangular screens. */
  inscribedSide: number;
}

const pickBreakpoint = (w: number): Breakpoint => {
  if (w < 360) return 'xs';
  if (w < 640) return 'sm';
  if (w < 768) return 'md';
  if (w < 1024) return 'lg';
  if (w < 1440) return 'xl';
  return '2xl';
};

/** Manual override checks — picked up from URL (?shape=round / ?shape=rect)
 *  and localStorage (aig:shape). Lets devs / kiosk operators force a shape
 *  when our heuristic can't see the device bezel. */
const readShapeOverride = (): 'round' | 'rect' | null => {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('shape');
    if (q === 'round' || q === 'rect') {
      localStorage.setItem('aig:shape', q);
      return q;
    }
    const stored = localStorage.getItem('aig:shape');
    if (stored === 'round' || stored === 'rect') return stored;
  } catch {
    /* sandboxed env — ignore */
  }
  return null;
};

const compute = (): ScreenInfo => {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      shape: 'landscape',
      breakpoint: 'lg',
      isTouch: false,
      isRound: false,
      isWatch: false,
      isSquareish: false,
      inscribedSide: 768,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ratio = w / h;
  const isSquareish = ratio >= 0.9 && ratio <= 1.1;
  // Heuristic: ANY near-1:1 viewport is treated as a candidate round display.
  // Real-world round displays come in every size — from a 240 × 240 watch face
  // to a 1080 × 1080 tabletop. Pixel size alone can't disambiguate, so we
  // assume "squareish == probably round" and let users opt out via
  // `?shape=rect` or a Settings toggle.
  const override = readShapeOverride();
  const isWatch = w <= 480 && h <= 480 && isSquareish;
  const isRound =
    override === 'round' || (override !== 'rect' && isSquareish);
  const shape: ScreenShape = isRound
    ? 'round'
    : isSquareish
      ? 'square'
      : ratio < 1
        ? 'portrait'
        : 'landscape';
  const isTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  // Inscribed square side: for a circle of diameter d, inscribed square = d/√2.
  const inscribedSide = isRound
    ? Math.floor(Math.min(w, h) / Math.SQRT2)
    : Math.min(w, h);
  return {
    width: w,
    height: h,
    shape,
    breakpoint: pickBreakpoint(w),
    isTouch,
    isRound,
    isWatch,
    isSquareish,
    inscribedSide,
  };
};

/** Write `data-shape="round|rect"` onto <html> so CSS selectors can pin
 *  fixed-position chrome (header, FABs, dock) into the inscribed square
 *  without per-component changes. Called on first compute + every resize. */
const syncShapeAttribute = (info: ScreenInfo) => {
  if (typeof document === 'undefined') return;
  const next = info.isRound ? 'round' : 'rect';
  if (document.documentElement.getAttribute('data-shape') !== next) {
    document.documentElement.setAttribute('data-shape', next);
  }
};

// Eager seed so the round CSS engages BEFORE React paints (no flash of
// edge-clipped content on the round display's first frame).
if (typeof window !== 'undefined') {
  syncShapeAttribute(compute());
}

export function useScreenShape(): ScreenInfo {
  const [info, setInfo] = useState<ScreenInfo>(() => {
    const i = compute();
    syncShapeAttribute(i);
    return i;
  });

  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = compute();
        syncShapeAttribute(next);
        setInfo(next);
      });
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('orientationchange', onChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('orientationchange', onChange);
    };
  }, []);

  return info;
}

/** Manually flip the shape — useful for a Settings toggle so a user
 *  on a rectangular tablet can preview the round layout, or vice versa. */
export function setShapeOverride(shape: 'round' | 'rect' | null) {
  if (typeof localStorage === 'undefined') return;
  if (shape) localStorage.setItem('aig:shape', shape);
  else localStorage.removeItem('aig:shape');
  syncShapeAttribute(compute());
}
