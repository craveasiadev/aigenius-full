import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { KenneyCharacter } from './KenneyCharacter';
import { KENNEY_CHARACTERS, type CharacterId } from './kenneyCatalog';

/**
 * Animated Kenney mini-character that walks a closed waypoint loop.
 *
 * Each NPC owns its own cloned skeleton (via `KenneyCharacter`) so multiple
 * NPCs of the same model can walk independently. The waypoint follower is
 * just linear interpolation between consecutive `path` points + a short
 * dwell on arrival. Cheap and predictable; pathfinding isn't needed for an
 * iso ambient scene.
 */

const NPC_SCALE = 0.85; // Slightly smaller than 1.0 so they look "kid-sized"

interface IsoNPCProps {
  /** World-space waypoints. The NPC walks 0 → 1 → 2 → … → 0. */
  path: Array<[number, number, number]>;
  /** Movement speed in world units per second. */
  speed?: number;
  /** Which Kenney mini-character to render. */
  characterId?: CharacterId;
  /** Pause time at each waypoint in seconds. */
  dwell?: number;
}

const ALL_NPC_IDS: CharacterId[] = [
  'femaleA', 'femaleB', 'femaleC', 'femaleD', 'femaleE', 'femaleF',
  'maleA', 'maleB', 'maleC', 'maleD', 'maleE', 'maleF',
];

function pickCharacterByIndex(i: number): CharacterId {
  return ALL_NPC_IDS[i % ALL_NPC_IDS.length];
}

export function IsoNPC({
  path,
  speed = 1.4,
  characterId = 'femaleA',
  dwell = 0.3,
}: IsoNPCProps) {
  const group = useRef<THREE.Group>(null);
  const seg = useRef(0);
  const t = useRef(0);
  const wait = useRef(0);

  useFrame((_, dt) => {
    if (!group.current || path.length < 2) return;

    if (wait.current > 0) {
      wait.current = Math.max(0, wait.current - dt);
      return;
    }

    const a = path[seg.current];
    const b = path[(seg.current + 1) % path.length];

    const ax = a[0], az = a[2];
    const bx = b[0], bz = b[2];
    const dx = bx - ax;
    const dz = bz - az;
    const segLen = Math.hypot(dx, dz) || 1;

    t.current += (speed * dt) / segLen;

    if (t.current >= 1) {
      t.current = 0;
      seg.current = (seg.current + 1) % path.length;
      wait.current = dwell;
      group.current.position.set(b[0], 0, b[2]);
      return;
    }

    const x = ax + dx * t.current;
    const z = az + dz * t.current;
    group.current.position.set(x, 0, z);

    // Face the direction of travel. `atan2(dx, dz)` matches three.js' Y-up
    // convention where rotation.y = 0 looks down +Z.
    group.current.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <group ref={group} position={path[0]}>
      <KenneyCharacter
        path={KENNEY_CHARACTERS[characterId]}
        clip="walk"
        scale={NPC_SCALE}
      />
    </group>
  );
}

/**
 * Convenience renderer for multiple NPCs over the same set of paths.
 * Each NPC gets a different mini-character so the city feels populated
 * instead of cloned.
 */
export function IsoNPCSwarm({
  paths,
  count,
  perPath,
}: {
  paths: Array<Array<[number, number, number]>>;
  /** Total number of NPCs to render. Distributed as evenly as possible
   *  across `paths` (round-robin). When 0 → no NPCs rendered, which is
   *  how the dashboard signals "shop not set up yet, don't spawn
   *  customers". Takes priority over `perPath` when both are given. */
  count?: number;
  /** Legacy prop — `count` per path. Used only when `count` is
   *  undefined (preserves the original demo behaviour). */
  perPath?: number;
}) {
  // Derive a flat list of { pathIndex, sequenceOnPath } placements.
  // Using a total count + round-robin distribution lets the caller
  // ask for any integer 0..N, instead of being locked to multiples
  // of paths.length the way the old perPath API was.
  const placements: Array<{ pathIdx: number; seq: number }> = [];
  if (typeof count === 'number') {
    for (let i = 0; i < Math.max(0, count); i++) {
      placements.push({ pathIdx: i % paths.length, seq: Math.floor(i / paths.length) });
    }
  } else {
    const pp = perPath ?? 1;
    for (let pi = 0; pi < paths.length; pi++) {
      for (let ni = 0; ni < pp; ni++) placements.push({ pathIdx: pi, seq: ni });
    }
  }

  return (
    <>
      {placements.map((p, idx) => {
        const path = paths[p.pathIdx];
        // Rotate the path so this NPC starts at a different waypoint
        // than its band-mate — keeps them spread out instead of
        // stacked on top of each other at spawn.
        const rotated = [...path.slice(p.seq), ...path.slice(0, p.seq)];
        return (
          <IsoNPC
            key={`${p.pathIdx}-${p.seq}`}
            path={rotated}
            characterId={pickCharacterByIndex(idx)}
            speed={1.2 + (p.seq * 0.2)}
          />
        );
      })}
    </>
  );
}

// Preload every mini-character GLB so animation rigs are warm by the time
// the city mounts. Keeps the first NPC frame from stuttering.
Object.values(KENNEY_CHARACTERS).forEach((p) => useGLTF.preload(p));
