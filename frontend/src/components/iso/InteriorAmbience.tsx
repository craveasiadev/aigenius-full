/**
 * InteriorAmbience — decorative, non-interactive atmosphere for the shop
 * interior so the room no longer floats in a flat dark void.
 *
 * Three cheap layers, all `raycast`-disabled so they never steal taps
 * from the furniture / mini-game:
 *   1. A grounding "stage" plane under + around the room with a soft
 *      radial glow texture, seating the room in a lit space.
 *   2. A few large billboarded glow orbs (violet / cyan / pink) drifting
 *      behind the walls for colour and depth.
 *   3. drei <Sparkles> — gently drifting glowing motes filling the room
 *      volume, plus a sparser wider field, giving constant subtle life.
 *
 * Everything is sized to the room (12 × 10, walls 3 tall) and tuned to
 * stay behind the furniture so it reads as background, not clutter.
 */
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Sparkles, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { ROOM_W, ROOM_D, WALL_H } from './interiorLayout';
import { useSparkOptional } from '../companion/CompanionProvider';
import { getDeviceProfile } from '../../hooks/useDeviceTier';

/** Build a soft radial-gradient sprite once — reused for the stage +
 *  every glow orb so we only pay for one canvas + texture. */
function makeRadialTexture(inner: string, outer: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

interface GlowOrbProps {
  position: [number, number, number];
  size: number;
  color: string;
  /** Gentle bob speed + phase so orbs don't move in lock-step. */
  speed: number;
  phase: number;
}

function GlowOrb({ position, size, color, speed, phase }: GlowOrbProps) {
  const ref = useRef<THREE.Group>(null);
  const tex = useMemo(() => makeRadialTexture(color, 'rgba(0,0,0,0)'), [color]);
  const baseY = position[1];

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.position.y = baseY + Math.sin(t * speed + phase) * 0.5;
  });

  return (
    <Billboard ref={ref} position={position}>
      <mesh raycast={() => null}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  );
}

export interface InteriorAmbienceProps {
  /** 0..1 — scales sparkle density and stage warmth. Drives the "shop feels
   *  busy" reaction without per-page wiring; defaults to a calm 0.5. */
  intensity?: number;
  /** "calm" sits still, "busy" warms the room and adds motes, "celebrating"
   *  briefly swaps the cool stage glow for a warm peach tone. */
  mood?: 'calm' | 'busy' | 'celebrating';
}

export function InteriorAmbience({ intensity = 0.5, mood: moodProp }: InteriorAmbienceProps = {}) {
  // If the parent doesn't pin a mood, follow the global companion state so
  // earning a badge anywhere makes the room sparkle up automatically.
  const spark = useSparkOptional();
  const mood: InteriorAmbienceProps['mood'] =
    moodProp ?? (spark?.mood === 'celebrating' ? 'celebrating' : 'calm');

  // Stage glow — warm peach during celebration, cool lavender otherwise.
  const stageTex = useMemo(
    () => mood === 'celebrating'
      ? makeRadialTexture('rgba(251,191,36,0.55)', 'rgba(40,20,16,0)')
      : makeRadialTexture('rgba(124,93,250,0.45)', 'rgba(20,16,40,0)'),
    [mood],
  );

  // Sparkle density scales with intensity + mood (busy/celebrating push it
  // up so a crowded happy shop visibly buzzes more than an empty one)
  // AND with the device tier — low-spec phones get a fraction of the
  // motes so the room still feels alive without GPU thrashing.
  const moodBoost = mood === 'celebrating' ? 1.5 : mood === 'busy' ? 1.25 : 1.0;
  const tier = getDeviceProfile().tier;
  const tierScale = tier === 'low' ? 0.25 : tier === 'mid' ? 0.6 : 1.0;
  const denseCount = Math.max(
    4,
    Math.round(60 * (0.6 + intensity * 0.8) * moodBoost * tierScale),
  );
  const sparseCount = Math.max(
    2,
    Math.round(28 * (0.7 + intensity * 0.6) * moodBoost * tierScale),
  );
  const denseColor = mood === 'celebrating' ? '#fed7aa' : '#e9d5ff';

  return (
    <group>
      {/* ── Grounding stage — large soft glow plane just under the
            floor, extending well past the walls so the room feels
            seated in a lit space instead of a flat void. ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.06, 0]}
        raycast={() => null}
      >
        <planeGeometry args={[ROOM_W * 2.6, ROOM_D * 2.6]} />
        <meshBasicMaterial
          map={stageTex}
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ── Drifting glow orbs behind / around the room for depth.
            On low-tier devices we drop them entirely — they're cheap
            individually but the additive transparent blending hits
            fillrate hard on integrated mobile GPUs. ── */}
      {tier !== 'low' && (
        <>
          <GlowOrb position={[-ROOM_W * 0.75, WALL_H * 0.9, -ROOM_D * 0.7]} size={9}  color="rgba(139,92,246,0.9)"  speed={0.5} phase={0} />
          <GlowOrb position={[ROOM_W * 0.8,  WALL_H * 1.1, -ROOM_D * 0.5]} size={8}  color="rgba(34,211,238,0.85)" speed={0.42} phase={1.7} />
          {tier === 'high' && (
            <>
              <GlowOrb position={[ROOM_W * 0.2,  WALL_H * 0.4,  ROOM_D * 0.9]} size={7}  color="rgba(244,114,182,0.8)" speed={0.55} phase={3.1} />
              <GlowOrb position={[-ROOM_W * 0.6, WALL_H * 0.3,  ROOM_D * 0.7]} size={6}  color="rgba(56,189,248,0.75)" speed={0.48} phase={4.4} />
            </>
          )}
        </>
      )}

      {/* ── Floating motes filling the room volume — the main "alive"
            layer. Soft, slow, and dense enough to read without
            distracting from gameplay. ── */}
      <Sparkles
        count={denseCount}
        scale={[ROOM_W * 0.95, WALL_H * 1.4, ROOM_D * 0.95]}
        position={[0, WALL_H * 0.7, 0]}
        size={4}
        speed={mood === 'celebrating' ? 0.55 : 0.35}
        opacity={0.7}
        color={denseColor}
        noise={1.2}
      />
      {/* Sparser, larger twinkles in a wider field for layered depth. */}
      <Sparkles
        count={sparseCount}
        scale={[ROOM_W * 2.2, WALL_H * 2.2, ROOM_D * 2.2]}
        position={[0, WALL_H, 0]}
        size={6}
        speed={mood === 'celebrating' ? 0.4 : 0.22}
        opacity={0.5}
        color="#a5f3fc"
        noise={1}
      />
    </group>
  );
}
