/**
 * WorldGlobeHub — pre-game greeting + carousel world.
 *
 * Shown BEFORE the iso world. Visual idea:
 *
 *     ┌─────────────────────────────────────┐
 *     │  Hello {name}!                      │
 *     │  Pick a shop to enter               │
 *     │                                     │
 *     │            🌍🏬🌳                   │  ← 3D globe with
 *     │           ╱        ╲                │    buildings sitting
 *     │           ╲   ●    ╱                │    on the equator
 *     │            ╲      ╱                 │
 *     │             ────                    │
 *     │     ◀  Boba Bar  ▶                  │  ← active building
 *     │     · · ● · · · · ·                 │    label + dots
 *     │                                     │
 *     │         [ Enter ]                   │  ← chunky 3D button
 *     └─────────────────────────────────────┘
 *
 * Interaction:
 *   • Swipe / drag horizontally on the globe → it spins around its
 *     Y axis. Velocity is preserved at pointerup → flick to scroll.
 *   • On release, the globe snaps to the nearest building so the
 *     "front" one is always centred.
 *   • Tap the active building (or the Enter button) → `onEnter(id)`.
 *   • Left / right arrow buttons step to the previous / next building.
 *   • Dots indicator shows position in the carousel.
 *
 * Rendering:
 *   • Globe is a sphere with a procedural Earth texture
 *     (`globeTexture.ts`) for recognisable continent shapes.
 *   • Buildings are children of the globe (so they spin with it).
 *     Each is placed on the equator at evenly spaced longitudes.
 *   • Camera is perspective, fixed, looking at the equator. Globe
 *     rotates around Y; everything else stays put.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, useGLTF, useTexture } from '@react-three/drei';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, Sun, Moon } from 'lucide-react';
import { KenneyModel } from './KenneyModel';
import { KENNEY_BUILDINGS_COMMERCIAL, type CommercialBuildingId } from './kenneyCatalog';
import { getGlobeTexture } from './globeTexture';
import { useTheme } from '../../contexts/ThemeContext';
import { GLASS, GLASS_HOVER, BTN_3D_PRIMARY, PAGE } from '../../lib/uiTokens';
import { DottedBackground } from '../ui/DottedBackground';
import { StarfieldBackground } from '../ui/StarfieldBackground';

const GLOBE_RADIUS = 9.0;
// Negative lift sinks the building's anchor slightly INTO the earth
// so the artwork's footprint (sidewalk / steps in the PNG) overlaps
// the surface curve. Avoids the "floating on a halo above the planet"
// look the user flagged.
const BUILDING_LIFT = -0.35;
// Globe centre 10 units below world origin. With R = 9, the dome
// apex sits at world y = -1, putting the active building's base
// just below the centre of view and its roof comfortably above —
// the model lands in the middle band of the canvas, with only a
// thin slice of the dome visible underneath.
const GLOBE_OFFSET_Y = -10.0;
// Buildings ride a great-circle ring that runs from the dome's APEX
// down the front to the equator, around the back, and back up to the
// apex. That ring lives in the Y-Z plane (perpendicular to the X
// axis). When the globe spins around its X axis (the "Ferris wheel"
// axis), buildings cycle top → front → bottom → back → top — the
// volume-knob / clock motion the user wants.
const FRONT_ANGLE = 0; // ring angle where the active building lives:
                       // 0 = top of the ring (apex of the dome)

export interface GlobeBuilding {
  id: string;
  name: string;
  /** Which Kenney commercial building to show (used when `imagePath`
   *  is not set — the GLB falls back to this catalogue lookup). */
  buildingId?: CommercialBuildingId;
  /** Optional PNG asset URL — when present the carousel renders the
   *  building as a billboard plane textured with this image, plus a
   *  small 3D pedestal underneath. Use this to show real-brand PNG
   *  shop art (e.g. Zus, Mamee) instead of the procedural Kenney
   *  building set. */
  imagePath?: string;
}

interface WorldGlobeHubProps {
  /** Greeting line; renders as `Hello {name}!` */
  name?: string;
  /** Buildings to place around the globe. Order = carousel order. */
  buildings: GlobeBuilding[];
  /** Called when the active building is tapped or the Enter button hit. */
  onEnter: (id: string) => void;
  /** Optional back button handler. Renders a back pill when provided. */
  onBack?: () => void;
}

export function WorldGlobeHub({
  name,
  buildings,
  onEnter,
  onBack,
}: WorldGlobeHubProps) {
  const { theme, toggleTheme } = useTheme();
  // The currently-centred building (front-facing). Update this from the
  // 3D rotation each frame; the visible label + dots are driven off it.
  const [activeIdx, setActiveIdx] = useState(0);
  // Stable callback ref pattern: the canvas runs at high FPS but we
  // only want to call setActiveIdx when it actually changes.
  const activeIdxRef = useRef(0);

  // `target` is the world-space rotation we're lerping toward (in radians).
  // `rotation` is the live displayed value, which the spin damper drives.
  // We use refs so pointermove handlers can write to them without
  // triggering React re-renders on every drag tick.
  const target = useRef(0);
  const rotation = useRef(0);
  // Velocity carried over from a flick gesture — decays each frame.
  const velocity = useRef(0);
  // True while the user is actively dragging the globe.
  const dragging = useRef(false);
  // Reference to the inner spinning <group> so we can write rotation
  // each frame from useFrame without re-rendering.
  const spinRef = useRef<THREE.Group>(null);

  const n = buildings.length;
  const step = useMemo(() => (n > 0 ? (Math.PI * 2) / n : 0), [n]);

  const stepTo = (delta: number) => {
    if (n === 0) return;
    target.current += step * delta;
    velocity.current = 0;
  };

  const active = buildings[activeIdx] || buildings[0];
  const dark = theme === 'dark';

  return (
    <div className={`${PAGE} flex flex-col h-screen overflow-hidden touch-manipulation`}>
      <StarfieldBackground />
      <DottedBackground />

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        className="relative z-20"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            >
              <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          ) : <span className="w-10" />}

          <span className={`${GLASS} px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300`}>
            Aipreneur · World
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* ── Greeting ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center px-6 pt-6 pb-2 relative z-20"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
          Hello, <span className="text-violet-600 dark:text-violet-300">{name || 'friend'}</span>!
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Spin the world to pick a shop.
        </p>
      </motion.div>

      {/* ── Globe Canvas ─────────────────────────────────────────── */}
      <main className="relative flex-1 min-h-0">
        {/* Single floating shop-name label over the canvas. Replaces
            the previous per-building 3D billboards that all stacked
            on top of each other when buildings were near the front. */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex justify-center px-6">
          <motion.div
            key={active?.id || 'none'}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="px-5 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-lg"
          >
            <p className="text-white font-extrabold text-base text-center whitespace-nowrap">
              {active?.name ?? ''}
            </p>
          </motion.div>
        </div>
        <Canvas
          // Camera at near eye-level (slight downward tilt) framing
          // the building dead-centre. With the globe sunk to OFFSET
          // = -12, the building's base sits at world y = -3 and its
          // roof extends up past y = 2, so the view passes right
          // through the middle of the model. The globe only reveals
          // a thin horizon strip at the bottom of the canvas.
          camera={{ position: [0, 1, 11], fov: 48 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
          {/* Transparent canvas — the page's StarfieldBackground sits
              underneath the WebGL layer, giving the globe a night-sky
              backdrop in dark mode and pastel bubbles in light mode. */}
          <ambientLight intensity={0.75} />
          <hemisphereLight args={['#fff7d1', '#0f172a', 0.3]} />
          <directionalLight position={[6, 10, 8]} intensity={1.1} color="#fff8e0" />

          <SpinController
            rotation={rotation}
            target={target}
            velocity={velocity}
            dragging={dragging}
            spinRef={spinRef}
            step={step}
            n={n}
            onActiveChange={(idx) => {
              if (activeIdxRef.current !== idx) {
                activeIdxRef.current = idx;
                setActiveIdx(idx);
              }
            }}
          />

          {/* The whole scene is sunk below the canvas centre so only
              the top sliver of the globe shows. The earth + buildings
              live in the same spinning group, so the planet rotates
              with the carousel — the continents under the active
              shop scroll past as the user swipes. */}
          <group ref={spinRef} position={[0, GLOBE_OFFSET_Y, 0]}>
            <Suspense fallback={null}>
              <Globe />
            </Suspense>
            <Suspense fallback={null}>
              {buildings.map((b, i) => {
                const angle = i * step;
                return (
                  <BuildingOnGlobe
                    key={b.id}
                    building={b}
                    angle={angle}
                    spinRef={rotation}
                    step={step}
                    isActive={i === activeIdx}
                    onTap={() => onEnter(b.id)}
                  />
                );
              })}
            </Suspense>
          </group>
        </Canvas>

        {/* Soft glow at the bottom edge to ground the globe. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-100/80 dark:from-slate-950/80 to-transparent"
        />

        {/* ── Carousel controls overlay ────────────────────────────
            Stacked on the bottom of the canvas (overlapping the
            dome's lower edge) so the globe gets all the vertical
            space it can use. Compact one-row layout: prev / name
            pill / next on top, then dots + Enter button below. */}
        <div
          className="absolute inset-x-0 bottom-0 z-20 px-3 pointer-events-none"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
        >
          <div className="max-w-md mx-auto pointer-events-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => stepTo(-1)}
                aria-label="Previous"
                className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-2xl flex items-center justify-center shrink-0`}
              >
                <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>

              <div className={`${GLASS} flex-1 max-w-xs rounded-2xl px-3 py-1.5 text-center`}>
                <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 leading-tight">
                  Now visiting
                </p>
                <motion.p
                  key={active?.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight"
                >
                  {active?.name ?? '—'}
                </motion.p>
              </div>

              <button
                type="button"
                onClick={() => stepTo(1)}
                aria-label="Next"
                className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-2xl flex items-center justify-center shrink-0`}
              >
                <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            {/* Dots indicator — smaller + closer together than before. */}
            <div className="flex items-center justify-center gap-1 mb-2">
              {buildings.map((b, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={b.id}
                    type="button"
                    aria-label={`Jump to ${b.name}`}
                    onClick={() => stepTo(i - activeIdx)}
                    className={[
                      'transition-all rounded-full',
                      isActive
                        ? 'w-5 h-1 bg-violet-600 dark:bg-violet-400'
                        : 'w-1 h-1 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400',
                    ].join(' ')}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => active && onEnter(active.id)}
              className={`${BTN_3D_PRIMARY} w-full min-h-[44px] text-sm`}
            >
              <Sparkles className="w-4 h-4" />
              Enter {active?.name ?? 'shop'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── R3F internals ─────────────────────────────────────────────────────

/**
 * The earth sphere — uses the procedural equirectangular texture from
 * `globeTexture.ts`. That texture is purpose-built at 1024×512 (the
 * 2:1 aspect that wraps a sphere without seams) with hand-placed
 * continent blobs.
 *
 * Why not the PNG in public/assets/World/earth.png:
 *   The supplied PNG is ~5000×5000 (a near-square photo of Earth from
 *   space). Wrapping a square image as an equirectangular sphere
 *   distorts it into a featureless smear — which is exactly the
 *   "blank white dome" the player was seeing. The procedural texture
 *   gives a stylised Earth that matches the Kenney art style anyway.
 *
 * Why the sphere is rotated 90° on its X axis:
 *   Equirectangular textures smear their top pixel row across the
 *   entire north pole. Rotating the sphere so the equator faces the
 *   camera puts undistorted texture pixels under the player's gaze.
 */
function Globe() {
  const tex = useMemo(() => getGlobeTexture(), []);

  return (
    <group>
      {/* Atmosphere halo — subtle blue glow behind the silhouette. */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 1.05, 48, 32]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {/* Earth — rotated so the visible top is an equatorial latitude
          (where the texture mapping is undistorted) instead of the
          north pole (where the equirectangular projection smears). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
        <meshStandardMaterial map={tex} roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
}

/**
 * PNG-as-building. Renders only the supplied artwork as a billboard
 * plane — no pedestal, no chrome around it. The PNG itself is the
 * building. A subtle drop-shadow disc sits on the ground beneath it
 * so the model reads as standing on the surface rather than floating
 * in space, but nothing else competes for attention.
 *
 * Used by the demo carousel for the two real-brand shops the user
 * supplied (Zus, Mamee). The Kenney GLB path is still the fallback
 * in `BuildingOnGlobe` when an entry has no `imagePath`.
 */
function PNGBuilding({ imagePath }: { imagePath: string }) {
  const tex = useTexture(imagePath) as THREE.Texture;
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  }, [tex]);

  // Preserve the PNG's authored aspect ratio so the building reads
  // proportionally. Default to 3:4 portrait until the image loads.
  const aspect = useMemo(() => {
    const w = tex.image?.width;
    const h = tex.image?.height;
    return w && h ? w / h : 0.75;
  }, [tex.image?.width, tex.image?.height]);
  const planeH = 3.4;
  const planeW = planeH * aspect;

  return (
    <Billboard position={[0, planeH / 2, 0]} follow>
      <mesh>
        <planeGeometry args={[planeW, planeH]} />
        <meshBasicMaterial
          map={tex}
          transparent
          alphaTest={0.05}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  );
}

interface BuildingOnGlobeProps {
  building: GlobeBuilding;
  /** Longitude (radians around Y) where this building sits. */
  angle: number;
  /** Live spin rotation (Y rotation of the parent globe group), in
   *  radians. Used to compute the front-facing prominence factor. */
  spinRef: React.MutableRefObject<number>;
  /** Angular gap between adjacent buildings on the ring (= 2π/n).
   *  Used by the visibility curve to fade each piece in/out exactly
   *  one step of arc on either side of the apex. */
  step: number;
  isActive: boolean;
  onTap: () => void;
}

/**
 * One building on the globe. Two nested groups place it on the dome:
 *   1. Outer rotates around the polar (Y) axis by `angle` → longitude.
 *   2. Inner tilts by the latitude and translates outward → the model
 *      stands perpendicular to the surface.
 *
 * Per-frame, this component reads the parent spin rotation to compute
 * each building's "front-ness": 1.0 when dead centre, fading to 0
 * when on the far side. That drives:
 *   • Scale — front building is 1.25×, sides are 0.65×, far side ~0.2×.
 *   • Opacity — far-side buildings fade out so they don't poke through
 *     the globe silhouette as ghost shapes.
 * The result matches the sketch: one big building front + two smaller
 * neighbours flanking it + the rest tucked behind the dome.
 */
function BuildingOnGlobe({
  building, angle, spinRef, step: stepArc, isActive, onTap,
}: BuildingOnGlobeProps) {
  const wrapperRef = useRef<THREE.Group>(null);

  const path = building.buildingId
    ? KENNEY_BUILDINGS_COMMERCIAL[building.buildingId]
    : KENNEY_BUILDINGS_COMMERCIAL.a;

  // Per-frame: front-ness factor drives scale + halo. We DO NOT
  // counter-rotate the building any more — the user wants the
  // buildings glued to the earth, so when the globe spins, each
  // building tilts with the surface it sits on. Only the building
  // currently at the apex of the dome (the active one) reads as
  // upright; its neighbours lean toward whichever edge they're
  // rolling off.
  //
  // We render ALL buildings every frame (no `t > threshold` cutoff)
  // so the carousel never gaps — as one rolls off behind the globe,
  // its neighbour rolls into view on the other side. Three's depth
  // buffer hides the back half against the globe sphere.
  useFrame(() => {
    // World-space ring angle of this building, normalised to the
    // shortest arc from the top of the ring ∈ [0, π].
    const TWO_PI = Math.PI * 2;
    let raw = (angle - spinRef.current + Math.PI) % TWO_PI;
    if (raw < 0) raw += TWO_PI;
    const delta = Math.abs(raw - Math.PI);
    // Very steep falloff: only the building closest to the apex is
    // visually present. Adjacent buildings collapse to near-zero
    // scale; further ones are completely hidden. During a swipe,
    // there's a brief moment where two are both growing/shrinking
    // around 50% scale — that handoff replaces the "all gone" gap.
    // Use a smoothstep across the last step's worth of arc so the
    // current building stays at full size until the user has rotated
    // halfway to the next one, then fades.
    const u = 1 - Math.min(1, delta / stepArc);
    const fade = u * u * (3 - 2 * u); // classic smoothstep
    const scale = fade * 1.6; // 0 when out of step range, 1.6 at apex
    if (wrapperRef.current) {
      wrapperRef.current.scale.setScalar(scale);
      // Hide entirely past one step from apex so the back of the
      // globe doesn't render ghost dots.
      wrapperRef.current.visible = scale > 0.02;
    }
  });

  // Two nested groups place the building on a great-circle ring in
  // the X-Y plane (the plane perpendicular to the camera-forward axis):
  //
  //   1. Outer: rotate around Z by `-angle` → position on the ring.
  //      angle = 0 is the TOP of the ring (apex of the dome). Negative
  //      Z rotation makes positive angles move the building CLOCKWISE
  //      on screen — so the next building lives at "3 o'clock" (the
  //      right side), matching the user's "right as front" request.
  //   2. Inner: translate along the now-rotated +Y axis by R → walks
  //      out to the sphere surface.
  //
  // After both transforms, the wrapper sits on the sphere at world
  // (R sin angle, R cos angle, 0) — i.e. on the visible front face of
  // the globe — AND its local +Y points radially outward so the
  // building stands perpendicular to the surface. When the parent
  // globe group rotates around its Z axis the whole ring spins like
  // a clock face: active stays at the top, the next building rises
  // from the right, the previous one descends to the left.
  return (
    <group rotation={[0, 0, -angle]}>
      <group position={[0, GLOBE_RADIUS + BUILDING_LIFT, 0]}>
        <group ref={wrapperRef}>
            {building.imagePath ? (
              <Suspense fallback={null}>
                <PNGBuilding imagePath={building.imagePath} />
              </Suspense>
            ) : (
              <KenneyModel path={path} scale={1} interactive={false} />
            )}

            {/* Tap target — invisible plane sized for thumbs. Only the
                active piece registers a tap so the user never picks
                a partly-hidden neighbour by accident. */}
            {isActive && (
              <mesh
                position={[0, 0.6, 0]}
                onPointerDown={(e) => { e.stopPropagation(); onTap(); }}
              >
                <planeGeometry args={[1.6, 1.6]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
          </group>
        </group>
      </group>
  );
}

interface SpinControllerProps {
  rotation: React.MutableRefObject<number>;
  target: React.MutableRefObject<number>;
  velocity: React.MutableRefObject<number>;
  dragging: React.MutableRefObject<boolean>;
  spinRef: React.RefObject<THREE.Group>;
  step: number;
  n: number;
  onActiveChange: (idx: number) => void;
}

/**
 * Handles pointer drag → spin and per-frame rotation easing.
 *
 * The canvas DOM element receives the gestures. Drag horizontally to
 * change `target.current`; on pointerup we keep the residual velocity
 * for a flick, then ease `rotation.current` toward the snapped `target`
 * each frame. Writes the rotation directly to `spinRef`'s `rotation.y`
 * so we never trigger React renders on the spin path.
 */
function SpinController({
  rotation,
  target,
  velocity,
  dragging,
  spinRef,
  step,
  n,
  onActiveChange,
}: SpinControllerProps) {
  const { gl, size } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;

    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      velocity.current = 0;
      try { el.setPointerCapture(e.pointerId); } catch {}
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const now = performance.now();
      // Clock-face spin: dragging RIGHT (or down) advances the
      // carousel — the active piece rolls clockwise to "3 o'clock"
      // and the next building rises from "9 o'clock" to the top.
      // Dragging the opposite way reverses. We accept whichever axis
      // the user moves more in.
      const dy = e.clientY - lastY;
      const dx = e.clientX - lastX;
      const dominant = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      const radPerPx = (Math.PI * 2) / (size.width * 2.2);
      const dRot = dominant * radPerPx;
      target.current += dRot;
      rotation.current += dRot;
      const dt = Math.max(1, now - lastT) / 1000;
      velocity.current = dRot / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
      // Snap to nearest building. Carry the flick velocity into the
      // target so a strong swipe overshoots by one building.
      if (n > 0) {
        const projected = target.current + velocity.current * 0.18;
        const snapped = Math.round(projected / step) * step;
        target.current = snapped;
      }
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [gl, size.width, step, n, rotation, target, velocity, dragging]);

  useFrame((_, dt) => {
    // Lerp rotation toward target. While dragging, target is being
    // written each pointermove and rotation chases it tightly.
    // Off-drag, we still lerp toward the snapped target with a soft
    // spring feel.
    const lerpRate = dragging.current ? 0.5 : Math.min(1, dt * 8);
    rotation.current += (target.current - rotation.current) * lerpRate;

    // Velocity decay (used only in the brief moment between release and
    // full settle so a flick reads as momentum).
    velocity.current *= 0.92;

    if (spinRef.current) {
      // Clock-face spin around the Z axis (camera-forward). The ring
      // lies in the X-Y plane so a Z rotation makes its surface
      // points trace circles centred on the visible disc — exactly the
      // motion of a clock hand / volume knob.
      spinRef.current.rotation.z = rotation.current;
    }

    if (n > 0) {
      // Each building i sits at base ring-angle i*step. Outer rotation
      // R_z(-baseAngle) places it on the front face; then the parent
      // spinRef R_z(α) rotates it world-side. A point (0, R, 0) ends
      // up at world ring-angle (i*step − α). For the building to be
      // at the TOP (angle 0): α = i*step, i.e. i = α / step.
      const raw = rotation.current / step;
      const idx = ((Math.round(raw) % n) + n) % n;
      onActiveChange(idx);
    }
  });

  return null;
}

// Preload all commercial building GLBs so the carousel doesn't pop.
Object.values(KENNEY_BUILDINGS_COMMERCIAL).forEach((p) => useGLTF.preload(p));
