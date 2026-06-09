/**
 * InteriorNPCs — ambient 3D customer characters inside the shop room.
 *
 * Spawns 4–6 Kenney mini-characters that walk randomised waypoint
 * loops through the player's shop interior. Each NPC:
 *   1. enters from the door (front of room, +Z)
 *   2. wanders between 2–3 in-room waypoints near the shelves/chairs
 *      — pausing at each one so they read as "browsing"
 *   3. heads to the counter (back of room, -Z) for a beat
 *   4. exits out the door again
 *
 * The path then loops, so the room always has motion. New character
 * IDs are assigned per NPC so the crowd doesn't look cloned.
 *
 * Pure presentation — connects to nothing else in the game state. The
 * existing 2D ShopMiniGame queue still drives scoring/quests; this
 * component just makes the room feel alive in three dimensions.
 *
 * Design notes:
 *   • Path waypoints are produced once per NPC (via `useMemo`) so
 *     they stay stable across re-renders.
 *   • Waypoints are biased to AVOID the central walking aisle where
 *     the shopkeeper stands, so 3D customers don't visually clip
 *     through her.
 *   • NPCs walk slightly slower than city ambient NPCs so the room
 *     reads as a calm shop interior, not a busy street.
 */
import { useMemo } from 'react';
import { IsoNPC } from './IsoNPC';
import type { CharacterId } from './kenneyCatalog';
import { ROOM_W, ROOM_D } from './interiorLayout';

const ALL_NPC_IDS: CharacterId[] = [
  'femaleA', 'femaleB', 'femaleC', 'femaleD', 'femaleE', 'femaleF',
  'maleA', 'maleB', 'maleC', 'maleD', 'maleE', 'maleF',
];

// Walking aisle = a central rectangle that stays well clear of every
// edge where furniture / shelves typically sit. This is the key
// anti-clip rule: keep NPCs in the middle 60% of the room and they
// won't walk through counters or shelves placed against the walls.
//
//                 ┌─── back wall (−Z) ───┐
//                 │  ┌────── keeper ────┐│  ← walls have shelves
//                 │  │   walking aisle  ││
//                 │  │  (NPCs stay here)││
//                 │  └──────────────────┘│
//                 └──── door zone ───────┘  ← +Z
const AISLE_HALF_W = (ROOM_W * 0.6) / 2;   // ±3.6 (was ±5.7)
const AISLE_BACK_Z = -ROOM_D * 0.20;        // -2.0 (no closer to keeper)
const AISLE_FRONT_Z = ROOM_D * 0.30;        // +3.0 (door at +5.0)

const DOOR_Z = ROOM_D / 2 - 1.0;            // entry point
const DOOR_X_RANGE = 1.6;                   // tighter door span

// Reserve a buffer around the shopkeeper position so NPCs don't
// merge through her body.
const KEEPER_X = 0;
const KEEPER_Z = -3.8;
const KEEPER_RADIUS = 1.5;                  // larger buffer than before

// Central counter zone — small footprint where NPCs can briefly stop
// next to the keeper instead of overlapping with her.
const COUNTER_STOP_Z = AISLE_BACK_Z;        // closest aisle-Z to keeper

function inKeeperZone(x: number, z: number) {
  return Math.hypot(x - KEEPER_X, z - KEEPER_Z) < KEEPER_RADIUS;
}

function randInRoom(): [number, number, number] {
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * AISLE_HALF_W * 2;
    const z = AISLE_BACK_Z + Math.random() * (AISLE_FRONT_Z - AISLE_BACK_Z);
    if (!inKeeperZone(x, z)) return [x, 0, z];
  }
  // Deterministic fallback that's always in-aisle and away from the
  // keeper — picks a left or right alternate position.
  return [AISLE_HALF_W * 0.6 * (Math.random() > 0.5 ? 1 : -1), 0, AISLE_FRONT_Z * 0.5];
}

/**
 * Build one customer's path:
 *   door → (1–3 wander stops) → counter (offset to the side of the
 *   keeper) → door.
 *
 * Reusing the same shape keeps every NPC's walk feeling intentional.
 */
function buildCustomerPath(): Array<[number, number, number]> {
  const wanderStops = 1 + Math.floor(Math.random() * 2); // 1 or 2 stops
  const doorX = (Math.random() - 0.5) * DOOR_X_RANGE;

  const path: Array<[number, number, number]> = [
    [doorX, 0, DOOR_Z],
  ];

  for (let i = 0; i < wanderStops; i++) {
    path.push(randInRoom());
  }

  // Counter visit — sit clearly to one side of the keeper so the
  // NPC's mesh never overlaps hers.
  const counterX = (Math.random() > 0.5 ? 1 : -1) * (1.7 + Math.random() * 0.8);
  path.push([counterX, 0, COUNTER_STOP_Z]);

  // Brief side-step on the way out so the leave-path isn't an exact
  // reverse of the arrival path (more visual variety).
  if (Math.random() > 0.5) {
    path.push(randInRoom());
  }

  // Walk back to the door so the cycle loops cleanly.
  path.push([doorX + (Math.random() - 0.5) * 0.6, 0, DOOR_Z]);

  return path;
}

export interface InteriorNPCsProps {
  /** How many ambient customers to render. Sensible default keeps the
   *  room feeling lively without flooding the framerate. */
  count?: number;
}

export function InteriorNPCs({ count = 5 }: InteriorNPCsProps) {
  // One path + character per NPC, computed once per mount. Stable so
  // the NPCs don't teleport when the parent re-renders for unrelated
  // reasons (e.g. interior layout edits, theme toggle).
  const npcs = useMemo(() => {
    const out: Array<{ id: string; path: Array<[number, number, number]>; character: CharacterId; speed: number; dwell: number }> = [];
    for (let i = 0; i < count; i++) {
      out.push({
        id: `interior-npc-${i}`,
        path: buildCustomerPath(),
        character: ALL_NPC_IDS[(i * 3 + Math.floor(Math.random() * ALL_NPC_IDS.length)) % ALL_NPC_IDS.length],
        // Slightly varied speed + dwell so the crowd has individual
        // rhythm — none of them move in lock-step.
        speed: 0.85 + Math.random() * 0.55,
        dwell: 0.8 + Math.random() * 1.6,
      });
    }
    return out;
  }, [count]);

  return (
    <>
      {npcs.map((n) => (
        <IsoNPC
          key={n.id}
          path={n.path}
          characterId={n.character}
          speed={n.speed}
          dwell={n.dwell}
        />
      ))}
    </>
  );
}
