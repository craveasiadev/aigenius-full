import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  motion,
  useScroll,
  useVelocity,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { KenneyModel } from '../../components/iso/KenneyModel';
import { KenneyCharacter } from '../../components/iso/KenneyCharacter';
import {
  KENNEY_BUILDINGS_COMMERCIAL,
  KENNEY_CHARACTERS,
} from '../../components/iso/kenneyCatalog';

/**
 * "How it works" — scroll-driven section.
 *
 * Visual concept: a tiny planet. The character walks along the top of a
 * very large green sphere (planet) as the user scrolls. Three buildings
 * are spaced out along her path ahead. The camera follows her from a
 * third-person side-elevation angle, so the world appears to curve away
 * at the horizon like real planetary curvature.
 *
 * Layout (sticky inside a 300vh section):
 *
 *     ┌───────────────────────────────────────────────────┐
 *     │  [chip] How it works                              │  ← section header
 *     │  Walk through the steps                           │     pinned to top
 *     │                                                   │
 *     │            character walking forward              │  ← 3D canvas
 *     │              ↓↓↓ planet curves down ↓↓↓           │
 *     │                                                   │
 *     │            [glass step bubble card]               │  ← DOM overlay,
 *     │                                                   │     fixed bottom
 *     └───────────────────────────────────────────────────┘
 *
 * The character actually moves position along the planet's surface
 * (not just an in-place walk animation), so the user sees real
 * forward progress as they scroll. The camera follows along, holding a
 * constant relative offset. When the character reaches one of the three
 * buildings, the matching step bubble fades in at the bottom of the
 * card area; as she walks past, the next bubble cross-fades in.
 */

// ─────────────────────────────────────────────────────────────────────
// Step data
// ─────────────────────────────────────────────────────────────────────

interface StepDef {
  step: string;
  title: string;
  body: string;
  bullets: string[];
  building: keyof typeof KENNEY_BUILDINGS_COMMERCIAL;
}

const STEPS: StepDef[] = [
  {
    step: '01',
    title: 'Set up a shop',
    body:
      'Your child picks an idea they care about. The AI builds the shop around it — storefront, signage, starter products.',
    bullets: [
      'Pick a sample shop or describe a new idea',
      'AI generates the look in seconds',
      'Name the business + colour scheme',
    ],
    building: 'a',
  },
  {
    step: '02',
    title: 'Create products + launch marketing',
    body:
      'They craft a couple of products and run their first campaign. Each decision costs AI Tokens and earns coins when it lands.',
    bullets: [
      'AI helps draft products — they edit + price',
      'Campaigns spend tokens, raise popularity',
      'Every choice is a tiny trade-off lesson',
    ],
    building: 'd',
  },
  {
    step: '03',
    title: 'Run the shop, watch it grow',
    body:
      'They pan around their isometric city, tap their shop to step inside, serve customers, watch the dashboard tick up in real time.',
    bullets: [
      'Crowd density reflects live popularity',
      'Interior view shows shopkeeper + customers',
      'Daily quests unlock new modules',
    ],
    building: 'g',
  },
];

// ─────────────────────────────────────────────────────────────────────
// Planet + path geometry
// ─────────────────────────────────────────────────────────────────────

// Very large planet — at this radius the visible "ground" looks nearly
// flat but the horizon clearly curves down, which sells the "tiny
// planet" concept without making the character look like an ant.
const PLANET_RADIUS = 28;
// Planet centre sits below the visible scene so the top of the planet
// is at world y=0 — that's where the character + buildings walk.
const PLANET_Y = -PLANET_RADIUS;

// Building angles along the path the character walks. Spread 8° apart
// (~3.9 world units between buildings at this radius), wider than the
// previous version where everything bunched at the same point.
const STEP_ANGLES = [
  THREE.MathUtils.degToRad(8),
  THREE.MathUtils.degToRad(16),
  THREE.MathUtils.degToRad(24),
];
const PATH_END_ANGLE = STEP_ANGLES[STEP_ANGLES.length - 1] + THREE.MathUtils.degToRad(4);

/** Convert a "walk angle" (radians around the planet's X-axis from the
 *  top pole) to a world-space position on the planet's surface. The
 *  surface tangent points along +Z and the surface normal points
 *  outward in the YZ plane. */
function surfacePoint(angle: number): THREE.Vector3 {
  return new THREE.Vector3(
    0,
    PLANET_Y + PLANET_RADIUS * Math.cos(angle),
    PLANET_RADIUS * Math.sin(angle),
  );
}

// ─────────────────────────────────────────────────────────────────────
// Internal Three.js scene
// ─────────────────────────────────────────────────────────────────────

function Scene({
  scrollProgress,
  walking,
  dark,
  onStepProgress,
}: {
  scrollProgress: MotionValue<number>;
  walking: boolean;
  dark: boolean;
  onStepProgress: (sp: number[]) => void;
}) {
  const charRef = useRef<THREE.Group>(null);
  const tmpLookAt = useRef(new THREE.Vector3());

  // Solid (no glow) planet colours — theme-aware.
  const planetColour = dark ? '#16a34a' : '#7ec850';

  useFrame((state) => {
    const p = scrollProgress.get();
    const walkAngle = p * PATH_END_ANGLE;

    // Move the character to the matching surface position. Character
    // rotates around X by `walkAngle` so they stand upright on the
    // curved surface — feet glued to the planet.
    if (charRef.current) {
      const pos = surfacePoint(walkAngle);
      charRef.current.position.copy(pos);
      // Local X rotation — the planet's surface "tilts" relative to
      // world-up as we walk forward, and the character tilts with it.
      charRef.current.rotation.x = walkAngle;
    }

    // Camera follows the character: hover behind + above them along
    // the surface frame. At a surface point parameterised by angle α:
    //   tangent (forward, direction of walking) = (0, -sin α, cos α)
    //   normal  (outward from planet centre)   = (0,  cos α, sin α)
    // Camera offset = above*normal + (-behind)*tangent. Plugging in:
    //   Δy = above*cos α + behind*sin α
    //   Δz = above*sin α − behind*cos α
    const cosA = Math.cos(walkAngle);
    const sinA = Math.sin(walkAngle);
    const charY = PLANET_Y + PLANET_RADIUS * cosA;
    const charZ = PLANET_RADIUS * sinA;
    const camAbove = 2.4;
    const camBehind = 4.8;
    state.camera.position.set(
      0,
      charY + camAbove * cosA + camBehind * sinA,
      charZ + camAbove * sinA - camBehind * cosA,
    );
    // Look slightly forward of the character so we see the upcoming
    // building, not just the back of the character's head.
    tmpLookAt.current.set(0, charY - sinA * 0.4, charZ + cosA * 1.2);
    state.camera.lookAt(tmpLookAt.current);

    // Step progress: 1 when character is at the building, falling to
    // 0 within ±0.07 rad on either side (≈±2.0 units of walk).
    const sp = STEP_ANGLES.map((a) => {
      const d = Math.abs(walkAngle - a);
      return Math.max(0, 1 - d / 0.07);
    });
    onStepProgress(sp);
  });

  return (
    <>
      {/* Neutral 3-point lighting — same recipe as the iso scene, no
          coloured rim lights so the materials read as solid colours. */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 14, 6]} intensity={0.9} />
      <directionalLight position={[-4, 5, -4]} intensity={0.35} />

      {/* The planet — a single big sphere offset below the path so the
          top of the sphere coincides with y=0 where everything walks. */}
      <mesh position={[0, PLANET_Y, 0]}>
        <sphereGeometry args={[PLANET_RADIUS, 96, 64]} />
        <meshStandardMaterial
          color={planetColour}
          roughness={0.9}
          metalness={0}
          toneMapped={false}
        />
      </mesh>

      {/* Buildings — placed on the planet surface at the step angles,
          rotated to stand upright relative to the surface normal. */}
      {STEPS.map((s, i) => (
        <BuildingOnPlanet key={s.step} angle={STEP_ANGLES[i]} buildingId={s.building} />
      ))}

      {/* The character — walks forward along the surface. Plays walk
          animation while scrolling, idle when stopped. */}
      <group ref={charRef}>
        <KenneyCharacter
          path={KENNEY_CHARACTERS.femaleA}
          clip={walking ? 'walk' : 'idle'}
          scale={1}
        />
      </group>
    </>
  );
}

/** A Kenney building placed on the planet's surface at a given walk
 *  angle. Position + rotation match `surfacePoint` so the building
 *  stands upright on the curved ground. */
function BuildingOnPlanet({
  angle,
  buildingId,
}: {
  angle: number;
  buildingId: keyof typeof KENNEY_BUILDINGS_COMMERCIAL;
}) {
  const pos = surfacePoint(angle);
  return (
    <group position={pos.toArray()} rotation={[angle, 0, 0]}>
      <KenneyModel
        path={KENNEY_BUILDINGS_COMMERCIAL[buildingId]}
        // Scale 1.5 — slightly larger than the character so the
        // building reads as a destination, but not so big that it
        // overlaps the bubble card overlay.
        scale={1.5}
        interactive={false}
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────

export function HowItWorksScroll({ dark }: { dark: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Spring-smoothed scroll progress so the camera + character don't
  // jitter on touch fling scrolls.
  const smoothProgress = useSpring(scrollYProgress, {
    damping: 30,
    stiffness: 120,
    mass: 0.8,
  });

  // Velocity-derived walking state. Above the threshold = walking.
  const scrollVelocity = useVelocity(scrollYProgress);
  const [walking, setWalking] = useState(false);
  useMotionValueEvent(scrollVelocity, 'change', (v) => {
    setWalking(Math.abs(v) > 0.04);
  });

  // Per-step visibility 0-1, written by the Scene's frame loop.
  const [stepProgress, setStepProgress] = useState<number[]>([0, 0, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative h-[300vh]"
      aria-label="How it works"
    >
      {/*
       * Sticky container — pins the whole stack (header + canvas +
       * bubble area) to the top of the viewport while the user scrolls
       * through the 300vh section.
       *
       * Layout is a flex column:
       *   1. Section header at the top (chip + h2 + subtitle).
       *   2. Canvas fills the middle.
       *   3. Bubble overlay sits at the bottom — DOM cross-fade
       *      between the three steps, never overlapping the header.
       */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col">
        {/* ── Section header ──────────────────────────────────────── */}
        <div className="shrink-0 pt-20 sm:pt-24 px-4 sm:px-6 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
            How it works
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Walk through it as you scroll
          </h2>
        </div>

        {/* ── 3D canvas ────────────────────────────────────────────── */}
        <div className="flex-1 relative min-h-0">
          <Canvas
            dpr={[1, 1.5]}
            // Camera position is overwritten every frame by the scene
            // itself — these defaults just avoid a one-frame flash
            // before the first useFrame runs.
            camera={{ position: [0, 2.4, 4.8], fov: 45 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              toneMapping: THREE.NoToneMapping,
            }}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <Scene
                scrollProgress={smoothProgress}
                walking={walking}
                dark={dark}
                onStepProgress={setStepProgress}
              />
            </Suspense>
          </Canvas>

          {/* Scroll-down hint — visible only while step 1 hasn't
              activated yet. */}
          <motion.div
            animate={{
              opacity: stepProgress[0] > 0.3 ? 0 : 1,
              y: [0, 6, 0],
            }}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center text-xs font-semibold text-slate-600 dark:text-slate-300 pointer-events-none"
          >
            <span>Scroll down to walk</span>
            <ChevronDownDot />
          </motion.div>
        </div>

        {/* ── Bubble card overlay ─────────────────────────────────────
         *   DOM-positioned, NOT 3D-anchored. The three bubble cards
         *   stack at a fixed bottom-centre position and cross-fade
         *   based on `stepProgress`. Living outside the Canvas means
         *   the cards never compete with the header for screen space.
         */}
        <div className="absolute inset-x-0 bottom-0 px-3 sm:px-4 pb-8 sm:pb-12 pointer-events-none">
          <div className="relative mx-auto max-w-[440px] h-[260px]">
            {STEPS.map((step, i) => (
              <BubbleCard key={step.step} step={step} visible={stepProgress[i] ?? 0} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Bubble card — bottom-centred, DOM-positioned, cross-fades by step.
// ─────────────────────────────────────────────────────────────────────

function BubbleCard({ step, visible }: { step: StepDef; visible: number }) {
  return (
    <motion.div
      animate={{
        opacity: visible,
        y: 18 * (1 - visible),
        scale: 0.96 + 0.04 * visible,
      }}
      transition={{ type: 'spring', damping: 26, stiffness: 220 }}
      style={{ pointerEvents: visible > 0.5 ? 'auto' : 'none' }}
      // Absolute fill — all three bubbles stack at the same spot.
      className="absolute inset-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-5 sm:p-6"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-300">
          STEP {step.step}
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          of 3
        </span>
      </div>
      <h3 className="mt-1 text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
        {step.title}
      </h3>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
        {step.body}
      </p>
      <ul className="mt-3 space-y-1.5">
        {step.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Tiny chevron used by the scroll hint. */
function ChevronDownDot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mt-1">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
