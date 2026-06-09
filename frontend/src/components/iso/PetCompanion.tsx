/**
 * PetCompanion — the active pet that ROAMS the shop interior.
 *
 * Previously this was a glowing emoji-orb that hovered next to Wei.
 * Now that we have real animal GLB models, the pet:
 *
 *   • Loads the chosen pet's GLB.
 *   • Wanders independently around the shop floor — random waypoints,
 *     furniture-aware collision (uses the same obstacle set as the
 *     customer sim), gentle pace.
 *   • Visits Wei every so often (anchor "magnet" beat) so the pet
 *     stays visually connected to the gameplay loop without being
 *     glued to her side.
 *   • Gently rotates to face its target so the iso silhouette reads as
 *     a walking animal, not a sliding sprite.
 *
 * Pure presentation: no physics, no React state per frame (positions
 * live in refs), no lifecycle effects. Reads the active pet via
 * useCollection().
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useCollection } from '../../lib/useCollection';
import { findPet } from '../../data/pets';
import {
  FLOOR_BOUNDS,
  getInteriorObstacles,
  type InteriorObstacle,
  type IsoInteriorLayout,
} from './interiorLayout';

interface PetCompanionProps {
  /** A ref to an object exposing `.x` / `.z` (mutated in place each frame).
   *  Typically the ShopWorkSim's keeper ref so the pet occasionally drifts
   *  back to Wei between wandering loops. */
  anchorRef: React.MutableRefObject<{ x: number; z: number }>;
  /** Current interior layout — drives obstacle avoidance so the pet
   *  walks AROUND tables / shelves / the counter instead of through them. */
  layout?: IsoInteriorLayout;
}

// Kenney animal GLBs ship at ~1.6 m tall by default — way too big next
// to Wei. Scale them down to ~30% so the pet reads as a cute companion
// next to the keeper instead of dwarfing her.
const PET_SCALE = 0.35;
const PET_R = 0.18;          // smaller collision radius matches smaller body
const SPEED = 0.85;          // a touch quicker so the pet visibly wanders

// Browse area — keep the pet in front of the counter so it never
// wanders into Wei's lane behind the bar.
const BOUNDS = {
  minX: FLOOR_BOUNDS.minX + 0.6,
  maxX: FLOOR_BOUNDS.maxX - 0.6,
  minZ: -0.5,
  maxZ: FLOOR_BOUNDS.maxZ - 1.2,
};

function blocked(x: number, z: number, obstacles: InteriorObstacle[]): boolean {
  for (const o of obstacles) {
    if (Math.hypot(x - o.x, z - o.z) < o.r + PET_R) return true;
  }
  return false;
}

function pickWaypoint(obstacles: InteriorObstacle[], curX: number, curZ: number) {
  for (let i = 0; i < 12; i++) {
    const x = BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX);
    const z = BOUNDS.minZ + Math.random() * (BOUNDS.maxZ - BOUNDS.minZ);
    if (blocked(x, z, obstacles)) continue;
    if (Math.hypot(x - curX, z - curZ) < 1.0) continue;
    return { x, z };
  }
  return null;
}

export function PetCompanion({ anchorRef, layout }: PetCompanionProps) {
  const { activePet } = useCollection();
  const pet = activePet ? findPet(activePet) : undefined;

  // Stable obstacle list — only re-derived when the layout content
  // changes. Wei is added each frame inside the walker so the pet
  // doesn't try to mount the keeper.
  const obstacles = useMemo(
    () => (layout ? getInteriorObstacles(layout) : []),
    [layout],
  );

  // Position + animation state live in refs (no React state per frame).
  const pos = useRef({ x: 0.5, z: 1.5, rotY: 0 });
  const target = useRef<{ x: number; z: number } | null>(null);
  const idleTimer = useRef(0);
  const grp = useRef<THREE.Group>(null);

  // Preload the GLB. Bail out if no pet active.
  const glbPath = pet?.glbPath;
  // useGLTF needs an absolute path; we accept undefined by returning early.

  // Reset position when the active pet changes (snap to anchor so the
  // newly-summoned pet appears next to Wei).
  useEffect(() => {
    if (!pet) return;
    pos.current.x = anchorRef.current.x + 0.85;
    pos.current.z = anchorRef.current.z + 0.5;
    target.current = null;
    idleTimer.current = 0.6;
  }, [activePet]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((state, rawDt) => {
    if (!grp.current || !pet) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;

    // ── Wandering AI ────────────────────────────────────────────────

    if (idleTimer.current > 0) {
      // Standing still for a beat. Slight bob + look-around rotation.
      idleTimer.current -= dt;
    } else {
      // Pick a destination if we don't have one. The "go visit Wei"
      // magnet was making the pet camp at the counter — drop it so the
      // pet truly roams. (Wei is always reachable on the customer side
      // of the shop because the browse bounds clip into her zone
      // anyway.)
      if (!target.current) {
        target.current = pickWaypoint(obstacles, pos.current.x, pos.current.z);
      }

      if (target.current) {
        const dx = target.current.x - pos.current.x;
        const dz = target.current.z - pos.current.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.12) {
          // Arrived. Short idle, then a new waypoint. Shorter so the
          // pet is visibly walking ~70% of the time, not standing.
          target.current = null;
          idleTimer.current = rand(0.4, 1.2);
        } else {
          const step = Math.min(SPEED * dt, dist);
          const nx = pos.current.x + (dx / dist) * step;
          const nz = pos.current.z + (dz / dist) * step;
          if (!blocked(nx, nz, obstacles)) {
            pos.current.x = nx;
            pos.current.z = nz;
            // Face the direction of travel.
            const desiredRot = Math.atan2(dx, dz);
            // Smooth rotation toward target (no snap).
            let drot = desiredRot - pos.current.rotY;
            // shortest-arc wrap
            while (drot > Math.PI) drot -= Math.PI * 2;
            while (drot < -Math.PI) drot += Math.PI * 2;
            pos.current.rotY += drot * Math.min(1, dt * 6);
          } else {
            // Try axis slide.
            if (!blocked(nx, pos.current.z, obstacles)) {
              pos.current.x = nx;
            } else if (!blocked(pos.current.x, nz, obstacles)) {
              pos.current.z = nz;
            } else {
              // Wedged — drop target so we re-roll next frame.
              target.current = null;
              idleTimer.current = 0.3;
            }
          }
        }
      } else {
        // No waypoint and idle expired but pickWaypoint returned null
        // (shop is fully packed). Wait a beat and retry.
        idleTimer.current = 0.6;
      }
    }

    // ── Apply transform ─────────────────────────────────────────────
    // Tiny vertical bob so the pet feels lively even while standing.
    const bob = Math.sin(t * 3.4) * 0.025;
    grp.current.position.set(pos.current.x, bob, pos.current.z);
    grp.current.rotation.y = pos.current.rotY;
  });

  if (!pet || !glbPath) return null;

  return (
    <group ref={grp} position={[pos.current.x, 0, pos.current.z]}>
      <PetModel path={glbPath} auraHex={pet.auraHex} />
    </group>
  );
}

// ── Inner: GLB loader + soft glow disk under the model ─────────────
function PetModel({ path, auraHex }: { path: string; auraHex: string }) {
  const { scene } = useGLTF(path);
  // Clone so multiple active-pet swaps don't fight over the same scene
  // graph if the GLB ever ends up rendered twice.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Soft disk on the ground tinted by the pet's aura colour. Reads as
  // a "magic glow" without needing any post-processing.
  const auraTex = useMemo(() => makeAura(auraHex), [auraHex]);

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
        raycast={() => null}
      >
        {/* Aura now sized to the smaller pet — was 1.05, now 0.65 so it
            reads as a soft halo, not a saucer the pet sits in. */}
        <planeGeometry args={[0.65, 0.65]} />
        <meshBasicMaterial
          map={auraTex}
          transparent
          opacity={0.6}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <primitive object={cloned} scale={PET_SCALE} />
    </>
  );
}

function makeAura(hex: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, hex);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function rand(lo: number, hi: number) {
  return lo + Math.random() * (hi - lo);
}

// Preload all 24 GLBs so the pet swap is instant when the player picks
// a new active pet from the inventory. Tiny up-front cost; massive UX
// win the first time they swap.
import('../../data/pets').then(({ PETS }) => {
  PETS.forEach((p) => useGLTF.preload(p.glbPath));
}).catch(() => { /* preload best-effort */ });
