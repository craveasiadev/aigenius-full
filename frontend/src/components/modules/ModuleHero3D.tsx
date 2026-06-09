/**
 * ModuleHero3D — small Three.js hero scene mounted at the top of each
 * Learning module to give every module its own "alive" mini-world.
 *
 * Five flavors:
 *   • product    — rotating pedestal with a glowing product cube
 *   • marketing  — floating billboard + speech bubbles
 *   • staff      — bouncing avatar squad on a counter
 *   • innovation — holographic blueprint + orbiting gears
 *   • finance    — rotating coin vault with stacked coins
 *
 * Performance-aware:
 *   • Reads `getDeviceProfile()` — on low-tier the Canvas is skipped
 *     entirely and a flat 2D fallback emoji scene is shown. No GPU work,
 *     same visual identity (just static instead of animated).
 *   • DPR caps to the device profile.
 *   • frameloop="always" only when in view (IntersectionObserver pauses
 *     R3F when scrolled past — module hero is small, scrolls off fast).
 *   • Geometry is shared at module scope (one cube/cylinder/torus per
 *     kind, not per-frame).
 */
import { Suspense, useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles, Text, RoundedBox, Billboard } from '@react-three/drei';
import { getDeviceProfile } from '../../hooks/useDeviceTier';

export type HeroKind = 'product' | 'marketing' | 'staff' | 'innovation' | 'finance';

interface ModuleHero3DProps {
  kind: HeroKind;
  /** Tone driving accent color of glows/sparkles. Defaults are picked
   *  per-kind so callers usually don't need to override. */
  accent?: string;
  /** Compact mode for narrow header areas (default 120 px tall). */
  height?: number;
  /** Emoji shown in the 2D fallback (low-tier devices or when WebGL
   *  isn't available). Defaults are picked per-kind. */
  fallbackEmoji?: string;
  /** Friendly caption shown over the scene. */
  caption?: string;
  /** Optional small chip at top-right that hints at interactivity
   *  (e.g. "✋ Drag to spin"). Pass an empty string to hide; omit to
   *  use the per-kind default. */
  hint?: string;
}

/** Per-kind defaults — colors, fallback emoji, caption, interactive hint. */
const HERO_DEFAULTS: Record<HeroKind, { accent: string; emoji: string; caption: string; hint?: string }> = {
  product:    { accent: '#0ea5e9', emoji: '📦', caption: 'Design your next big idea', hint: '✋ Drag to spin' },
  marketing:  { accent: '#f97316', emoji: '📣', caption: 'Tell the world your story' },
  staff:      { accent: '#22c55e', emoji: '🧑‍🍳', caption: 'Your dream team awaits' },
  innovation: { accent: '#a855f7', emoji: '🤖', caption: 'Invent the future' },
  finance:    { accent: '#f59e0b', emoji: '🪙', caption: 'Count your coins' },
};

/** Top-level dispatch — picks the right inner scene per kind. Each
 *  scene is intentionally tiny (one or two animated meshes) so all
 *  five hero canvases combined cost less than a single full game scene. */
function HeroScene({ kind, accent }: { kind: HeroKind; accent: string }) {
  switch (kind) {
    case 'product':    return <ProductScene  accent={accent} />;
    case 'marketing':  return <MarketingScene accent={accent} />;
    case 'staff':      return <StaffScene    accent={accent} />;
    case 'innovation': return <InnovationScene accent={accent} />;
    case 'finance':    return <FinanceScene  accent={accent} />;
  }
}

// ─── Product: pedestal + drag-to-spin glowing box ────────────────────
/** Interactive: the cube auto-rotates by default, but the kid can grab
 *  it (touch-drag on mobile, mouse-drag on desktop) to spin it manually.
 *  Auto-rotation pauses while held and resumes after release with a
 *  little angular velocity inherited from the throw — so a quick flick
 *  sends it spinning, just like spinning a real product on a turntable. */
function ProductScene({ accent }: { accent: string }) {
  const boxRef = useRef<THREE.Group>(null);
  // Latched manual rotation angle (radians). Auto-rotation adds to this
  // each frame; pointer drag SETS it directly so the kid feels in control.
  const yawRef = useRef(0);
  // Drag state — only the active pointer's screen X is tracked because
  // we only spin around the Y axis (no top/bottom tumbling).
  const dragRef = useRef<{ pointerId: number | null; lastX: number; vel: number; t: number }>({
    pointerId: null, lastX: 0, vel: 0, t: 0,
  });
  // Drives the "Drag to spin →" hint — fades out after the first touch.
  const [hasInteracted, setHasInteracted] = useState(false);

  useFrame((s, delta) => {
    if (!boxRef.current) return;
    if (dragRef.current.pointerId !== null) {
      // Held: render the latched angle directly, no auto-add.
      boxRef.current.rotation.y = yawRef.current;
    } else {
      // Released / never touched: auto-spin at ~0.6 rad/s + decaying
      // throw-velocity from the last flick (drops by ~25 %/s).
      yawRef.current += (0.6 + dragRef.current.vel) * delta;
      dragRef.current.vel *= Math.max(0, 1 - delta * 1.5);
      boxRef.current.rotation.y = yawRef.current;
    }
    // Vertical bob — independent of spin so the box always feels lively.
    boxRef.current.position.y = 0.3 + Math.sin(s.clock.elapsedTime * 1.6) * 0.06;
  });

  const onPointerDown = (e: any) => {
    e.stopPropagation();
    (e.target as HTMLElement | undefined)?.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      vel: 0,
      t: performance.now(),
    };
    if (!hasInteracted) setHasInteracted(true);
  };
  const onPointerMove = (e: any) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragRef.current.lastX;
    // 1 % screen-width drag → ~0.06 rad spin. Feels close to "wrist flick"
    // on phones without runaway sensitivity on desktops.
    const dyaw = dx * 0.012;
    yawRef.current += dyaw;
    const now = performance.now();
    const dtSec = Math.max(1, now - dragRef.current.t) / 1000;
    // Track velocity (rad/s) so the release inherits the flick.
    dragRef.current.vel = dyaw / dtSec;
    dragRef.current.lastX = e.clientX;
    dragRef.current.t = now;
  };
  const onPointerUp = (e: any) => {
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current.pointerId = null;
    // Clamp throw velocity so kids can't accidentally launch into a strobe.
    dragRef.current.vel = Math.max(-6, Math.min(6, dragRef.current.vel));
  };

  return (
    <>
      {/* Pedestal */}
      <mesh position={[0, -0.45, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.85, 0.18, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Top ring glow */}
      <mesh position={[0, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.7, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {/* Product box — wrapped in a Group so the pointer handlers
          attach to the whole interactive area, not a single face. The
          group has an invisible larger hit-box behind it so kids with
          fat fingers on a phone can grab it even if they miss by ~30 px. */}
      <group
        ref={boxRef}
        position={[0, 0.3, 0]}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <RoundedBox args={[0.8, 0.8, 0.8]} radius={0.08} smoothness={4}>
          <meshStandardMaterial color={accent} metalness={0.3} roughness={0.4} emissive={accent} emissiveIntensity={0.25} />
        </RoundedBox>
        {/* Invisible larger hit-target — `colorWrite={false}` keeps it
            from showing up in the picture, `transparent` + opacity 0
            lets the renderer still register pointer events on it. */}
        <mesh>
          <sphereGeometry args={[0.95, 12, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
        </mesh>
      </group>
      {/* Floating price tag */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={1.2}>
        <Billboard position={[0.9, 0.7, 0]}>
          <RoundedBox args={[0.5, 0.28, 0.05]} radius={0.05} smoothness={4}>
            <meshStandardMaterial color="#fde68a" emissive="#facc15" emissiveIntensity={0.5} />
          </RoundedBox>
          <Text position={[0, 0, 0.04]} fontSize={0.13} color="#451a03" font={undefined} anchorX="center" anchorY="middle">
            $$$
          </Text>
        </Billboard>
      </Float>
      <Sparkles count={12} scale={[2.2, 1.4, 2.2]} size={3} speed={0.4} color={accent} opacity={0.7} />
    </>
  );
}

// ─── Marketing: billboard + drifting bubbles ─────────────────────────
function MarketingScene({ accent }: { accent: string }) {
  const board = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!board.current) return;
    board.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.25;
  });
  return (
    <>
      <group ref={board}>
        {/* Billboard frame */}
        <RoundedBox args={[1.6, 1.05, 0.12]} radius={0.06} smoothness={4} position={[0, 0.25, 0]}>
          <meshStandardMaterial color="#fef3c7" metalness={0.1} roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[1.45, 0.92, 0.18]} radius={0.04} smoothness={4} position={[0, 0.25, 0.04]}>
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
        </RoundedBox>
        <Text position={[0, 0.25, 0.16]} fontSize={0.22} color="#fff" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#000">
          SALE!
        </Text>
        {/* Posts */}
        <mesh position={[-0.55, -0.45, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[0.55, -0.45, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      </group>
      {/* Drifting speech bubbles */}
      <Float speed={2.5} rotationIntensity={0.3} floatIntensity={1.5}>
        <mesh position={[-1.0, 0.6, 0.2]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={0.3} floatIntensity={1.2}>
        <mesh position={[1.0, 0.85, 0.2]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.2} />
        </mesh>
      </Float>
      <Sparkles count={10} scale={[2.5, 1.5, 2.5]} size={2.5} speed={0.5} color={accent} opacity={0.6} />
    </>
  );
}

// ─── Staff: 3 bouncing avatars on a counter ──────────────────────────
function StaffScene({ accent }: { accent: string }) {
  const refs = [useRef<THREE.Group>(null), useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.forEach((r, i) => {
      if (!r.current) return;
      r.current.position.y = 0.15 + Math.abs(Math.sin(t * 2.2 + i * 1.1)) * 0.12;
    });
  });
  const colors = ['#fcd34d', '#fb923c', '#a78bfa'];
  return (
    <>
      {/* Counter */}
      <RoundedBox args={[2.0, 0.18, 0.7]} radius={0.04} smoothness={4} position={[0, -0.4, 0]}>
        <meshStandardMaterial color="#7c3aed" />
      </RoundedBox>
      <RoundedBox args={[2.0, 0.25, 0.7]} radius={0.04} smoothness={4} position={[0, -0.55, 0]}>
        <meshStandardMaterial color="#1e1b4b" />
      </RoundedBox>
      {/* Avatars */}
      {[-0.65, 0, 0.65].map((x, i) => (
        <group key={i} ref={refs[i]} position={[x, 0.15, 0.1]}>
          {/* Body */}
          <mesh>
            <capsuleGeometry args={[0.18, 0.3, 4, 8]} />
            <meshStandardMaterial color={colors[i]} />
          </mesh>
          {/* Head */}
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#fde68a" />
          </mesh>
          {/* Smile dot eyes */}
          <mesh position={[-0.06, 0.39, 0.16]}><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
          <mesh position={[ 0.06, 0.39, 0.16]}><sphereGeometry args={[0.025, 8, 8]} /><meshBasicMaterial color="#0f172a" /></mesh>
        </group>
      ))}
      {/* Mood hearts */}
      <Float speed={2.2} rotationIntensity={0.2} floatIntensity={1.2}>
        <mesh position={[0, 0.9, 0.3]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#f472b6" emissive="#f472b6" emissiveIntensity={0.45} />
        </mesh>
      </Float>
      <Sparkles count={14} scale={[2.5, 1.6, 1.6]} size={2} speed={0.4} color={accent} opacity={0.6} />
    </>
  );
}

// ─── Innovation: holographic icosahedron + orbiting rings ────────────
function InnovationScene({ accent }: { accent: string }) {
  const group = useRef<THREE.Group>(null);
  const torus = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (group.current) group.current.rotation.y = t * 0.6;
    if (torus.current) {
      torus.current.rotation.x = t * 0.9;
      torus.current.rotation.y = t * 1.3;
    }
  });
  return (
    <>
      {/* Lab table */}
      <mesh position={[0, -0.45, 0]}>
        <boxGeometry args={[1.8, 0.1, 0.9]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <ringGeometry args={[0.55, 0.65, 32]} />
        <meshBasicMaterial color={accent} transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <group ref={group}>
        {/* Hologram core */}
        <mesh position={[0, 0.2, 0]}>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} wireframe transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <icosahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} transparent opacity={0.3} />
        </mesh>
        {/* Orbit ring */}
        <mesh ref={torus} position={[0, 0.2, 0]}>
          <torusGeometry args={[0.78, 0.025, 12, 80]} />
          <meshStandardMaterial color="#fff" emissive={accent} emissiveIntensity={0.8} />
        </mesh>
      </group>
      <Sparkles count={20} scale={[2.5, 2, 2.5]} size={2.4} speed={0.5} color={accent} opacity={0.7} />
    </>
  );
}

// ─── Finance: coin vault + spinning coin ─────────────────────────────
function FinanceScene({ accent }: { accent: string }) {
  const coin = useRef<THREE.Mesh>(null);
  const stack = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (coin.current) {
      coin.current.rotation.y = t * 2.4;
      coin.current.position.y = 0.5 + Math.sin(t * 1.4) * 0.08;
    }
    if (stack.current) stack.current.rotation.y = t * 0.3;
  });
  return (
    <>
      {/* Vault floor */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.12, 32]} />
        <meshStandardMaterial color="#78350f" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Coin stacks */}
      <group ref={stack}>
        {[-0.45, 0.45].map((x, i) => (
          <group key={i} position={[x, -0.35, 0]}>
            {[0, 1, 2, 3].map((y) => (
              <mesh key={y} position={[0, y * 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
                <meshStandardMaterial color={accent} metalness={0.7} roughness={0.25} emissive={accent} emissiveIntensity={0.2} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {/* Floating big coin */}
      <mesh ref={coin} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
        <meshStandardMaterial color={accent} metalness={0.85} roughness={0.18} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
      <Sparkles count={16} scale={[2.5, 1.6, 2.5]} size={2.2} speed={0.4} color={accent} opacity={0.7} />
    </>
  );
}

/** Lightweight in-view detector — pauses the Canvas's render loop when
 *  the hero scrolls offscreen, so a kid scrolling through a long module
 *  page doesn't pay GPU cost for a scene they can't see. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? true),
      { rootMargin: '50px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

export function ModuleHero3D({
  kind,
  accent,
  height = 180,
  fallbackEmoji,
  caption,
  hint,
}: ModuleHero3DProps) {
  const defaults = HERO_DEFAULTS[kind];
  const resolvedAccent = accent ?? defaults.accent;
  const resolvedEmoji = fallbackEmoji ?? defaults.emoji;
  const resolvedCaption = caption ?? defaults.caption;
  const resolvedHint = hint ?? defaults.hint;

  const profile = useMemo(() => getDeviceProfile(), []);
  const { ref, inView } = useInView<HTMLDivElement>();

  // Low-tier or no-WebGL → fallback to a flat decorative banner so the
  // module still has visual identity without GPU cost.
  if (profile.tier === 'low') {
    return (
      <FallbackHero
        emoji={resolvedEmoji}
        caption={resolvedCaption}
        accent={resolvedAccent}
        height={height}
      />
    );
  }

  return (
    <div
      ref={ref}
      className="relative w-full rounded-3xl overflow-hidden mb-4 sm:mb-5"
      style={{
        height,
        background: `radial-gradient(ellipse at center, ${resolvedAccent}26 0%, transparent 70%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)`,
      }}
    >
      <Canvas
        dpr={profile.dprCap}
        gl={{ antialias: profile.antialias, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0.4, 3.2], fov: 38 }}
        frameloop={inView ? 'always' : 'never'}
        shadows={false}
        // touch-none stops Safari/Chrome from swiping the page when the
        // kid drags the cube — otherwise a horizontal swipe spins the
        // cube AND yanks the browser into native overscroll.
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} color="#fff8e0" />
        <pointLight position={[-2, 1, 2]} intensity={0.6} color={resolvedAccent} />
        <Suspense fallback={null}>
          <HeroScene kind={kind} accent={resolvedAccent} />
        </Suspense>
      </Canvas>

      {/* Caption overlay — bottom-left so it doesn't fight the 3D content. */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-4 pb-3 pt-6 bg-gradient-to-t from-black/55 via-black/15 to-transparent">
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/80">
          Welcome
        </p>
        <p className="text-sm sm:text-base font-extrabold text-white drop-shadow-lg leading-tight">
          {resolvedCaption}
        </p>
      </div>

      {/* Interactive hint chip — top-right, gently pulsing so the kid
          sees it's actionable. `pointer-events-none` so it never blocks
          the actual drag-spin gesture happening behind it. */}
      {resolvedHint && (
        <div
          className="pointer-events-none absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-white/12 backdrop-blur-md border border-white/20 text-[10px] sm:text-[11px] font-extrabold text-white shadow-lg"
          style={{ animation: 'heroHintPulse 2.4s ease-in-out infinite' }}
        >
          {resolvedHint}
        </div>
      )}
      <style>{`
        @keyframes heroHintPulse {
          0%, 100% { transform: scale(1);   opacity: 0.88; }
          50%      { transform: scale(1.06); opacity: 1;    }
        }
      `}</style>
    </div>
  );
}

/** Flat decorative banner — used on low-tier devices and as the
 *  SSR / no-WebGL fallback. Keeps the module's visual identity (color
 *  gradient + giant emoji) without any GPU cost. */
function FallbackHero({
  emoji, caption, accent, height,
}: { emoji: string; caption: string; accent: string; height: number }) {
  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden mb-4 sm:mb-5 flex items-center justify-center"
      style={{
        height,
        background: `radial-gradient(ellipse at center, ${accent}45 0%, ${accent}15 50%, transparent 80%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)`,
      }}
    >
      <div className="text-center px-4">
        <div className="text-5xl sm:text-6xl mb-1 drop-shadow-lg">{emoji}</div>
        <p className="text-sm sm:text-base font-extrabold text-white drop-shadow-md">
          {caption}
        </p>
      </div>
    </div>
  );
}

export default ModuleHero3D;
