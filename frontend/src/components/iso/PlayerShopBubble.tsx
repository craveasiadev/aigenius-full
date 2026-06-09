import { useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from 'lucide-react';

/**
 * Label that sits directly on top of the player's "My Shop" building.
 *
 * Shows the AI-generated shop image (full image, never cropped — uses
 * `object-contain`) with the shop name in a small strip below and a
 * sharp downward-pointing arrow tail anchored at the roof.
 *
 * **Zoom-proportional sizing** — the bubble is rendered through drei's
 * `<Html>` (which is fixed-pixel by default) but we react to the
 * orthographic camera's `zoom` every frame and apply a matching CSS
 * `scale()` to the wrapper. That keeps the bubble visually attached to
 * the building at every zoom level: at the default city zoom it
 * renders at native CSS size; zoom out and it shrinks with the world;
 * zoom in and it grows. Without this, zooming out used to leave the
 * bubble floating far above the (now-smaller) building.
 *
 * Rendered via drei's `<Html>` (correctly detached from R3F's
 * reconciler). `pointer-events: none` on the wrapper so taps fall
 * through to the building.
 */

interface PlayerShopBubbleProps {
  anchor: [number, number, number];
  shopImageUrl?: string;
  shopName: string;
  /** Hide while the action menu, interior, or move mode is showing. */
  visible: boolean;
}

// Reference zoom — the camera zoom at which the bubble shows at its
// native CSS size. Matches the city default in usePanZoom + IsoScene.
const REFERENCE_ZOOM = 26;
// Clamp the dynamic scale so the bubble never gets unreadably small or
// comically big at the extreme ends of the zoom range.
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.8;

export function PlayerShopBubble({
  anchor,
  shopImageUrl,
  shopName,
  visible,
}: PlayerShopBubbleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  // Read the orthographic zoom each frame and translate/scale the
  // wrapper so its bottom-centre (where the arrow tail is) stays
  // glued to the projected anchor point on the building roof.
  //
  // Why `translateY(-50%)` and NOT `-100%`:
  //   drei's `<Html center>` already shifts the portal up by 50% of
  //   its own height (so the portal's CENTRE lands on the projected
  //   anchor). Stacking another `-100%` on top would land the
  //   bubble's bottom HALF A HEIGHT above the anchor — exactly the
  //   visible gap users were complaining about at low zooms.
  //
  //   `-50%` lands the bubble's bottom on the anchor at every scale,
  //   and the `transformOrigin: bottom center` pins the tail to that
  //   point while the body shrinks/grows above.
  useFrame(({ camera }) => {
    if (!wrapRef.current) return;
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const raw = camera.zoom / REFERENCE_ZOOM;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
    wrapRef.current.style.transform = `translateY(-50%) scale(${scale})`;
  });

  if (!visible) return null;

  return (
    <Html
      position={anchor}
      center
      zIndexRange={[35, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={wrapRef}
        style={{
          transformOrigin: 'bottom center',
          // Initial transform until useFrame fires on the next frame —
          // matches what the frame loop will set so the bubble doesn't
          // flicker on first paint.
          transform: 'translateY(-50%)',
        }}
        className="select-none"
      >
        <div className="relative w-[200px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-amber-300 dark:border-amber-400/70 rounded-2xl shadow-xl shadow-slate-900/15 dark:shadow-black/40 overflow-hidden">
          {/* Image area — 4:3 aspect with object-contain so the full
              generated shop image is always visible. Slate background
              fills any letterbox sliver. */}
          <div className="relative w-full aspect-[4/3] bg-slate-100 dark:bg-slate-800">
            {shopImageUrl ? (
              <img
                src={shopImageUrl}
                alt={`${shopName} exterior`}
                draggable={false}
                loading="eager"
                className="absolute inset-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber-500/70" />
              </div>
            )}

            {/* "YOUR SHOP" chip in the top-left corner */}
            <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400/95 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 text-white" />
              <span className="text-[8px] uppercase tracking-wider font-bold text-white leading-none">
                Your shop
              </span>
            </div>
          </div>

          {/* Name strip — single line, truncated. */}
          <div className="px-2.5 py-1.5 text-center border-t border-amber-200/70 dark:border-amber-400/30">
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate leading-tight">
              {shopName}
            </p>
          </div>
        </div>

        {/* Sharp downward-pointing arrow tail using nested CSS
            triangles. Outer amber renders the bubble-edge outline,
            inner white sits 2 px above and fills it. */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-3 pointer-events-none"
        >
          <span
            className="block w-0 h-0"
            style={{
              borderLeft: '11px solid transparent',
              borderRight: '11px solid transparent',
              borderTop: '14px solid rgb(252 211 77)',
            }}
          />
        </span>
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-2 pointer-events-none"
        >
          <span
            className="block w-0 h-0"
            style={{
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '11px solid rgba(255,255,255,0.92)',
            }}
          />
        </span>
      </div>
    </Html>
  );
}
