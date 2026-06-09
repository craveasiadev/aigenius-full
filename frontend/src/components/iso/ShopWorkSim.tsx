/**
 * ShopWorkSim — the live "shop is open" simulation for the player's own
 * interior. Replaces the old static keeper + aimless ambient NPCs.
 *
 * What it does, every frame, driven by one controller:
 *   • Wei (the player's hired shopkeeper) stands behind the counter, slides
 *     left/right with little pauses so she never looks frozen, and turns to
 *     help whoever is at the front of the line.
 *   • Customers spawn at the door, walk in and LINE UP in a single file in
 *     front of the counter. The front customer is served (a short beat),
 *     reacts happily, then walks to the exit and despawns — and everyone
 *     behind shuffles forward. A fresh customer arrives to keep the shop busy.
 *   • Furniture is treated as solid: customers collision-check every step
 *     against the real layout footprints (and the room walls), so they route
 *     around tables/shelves instead of clipping through them.
 *
 * Design choices:
 *   • Kinematics live in refs and are advanced in `useFrame` — positions
 *     never go through React state, so there's no per-frame re-render. Only
 *     spawning/despawning a customer (a few seconds apart) touches state.
 *   • Wei does NOT run furniture collision: she's confined to a thin, known-
 *     clear lane right behind the counter, which the continuous counter wall
 *     already seals off from the shop floor. That keeps her lively without
 *     ever getting wedged between the counter and the back appliances.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { KenneyCharacter } from './KenneyCharacter';
import { KENNEY_CHARACTERS, type CharacterId } from './kenneyCatalog';
import { PetCompanion } from './PetCompanion';
import {
  FLOOR_BOUNDS,
  ROOM_D,
  getInteriorObstacles,
  detectShopFlavor,
  type IsoInteriorLayout,
  type InteriorObstacle,
} from './interiorLayout';

const CUSTOMER_IDS: CharacterId[] = [
  'femaleA', 'femaleB', 'femaleC', 'femaleD', 'femaleE', 'femaleF',
  'maleA', 'maleB', 'maleC', 'maleD', 'maleE', 'maleF',
];

// ── Geometry of the shift ──────────────────────────────────────────────
// The entry/exit point is computed PER-LAYOUT as `scaledDoor` inside the
// component (see useMemo below) so customers arrive at the correct edge
// in bigger rooms (factory 1.55×, restaurant 1.3×). The base 12×10 m
// position is `(0, ROOM_D / 2 - 0.7)` ≈ (0, +4.3).
// Front-of-line spot. Kept clear of the counter's collision footprint (the
// counter sits at z=-3, radius ~0.75, +0.32 self ⇒ blocked within ~1.07), so
// the front customer can actually REACH this point and be served.
const SERVE = { x: 0, z: -1.7 };
// Queue spacing — tight enough that the whole line sits CLOSE to the
// counter (so customer #3 isn't standing in the middle of the shop), but
// just wide enough that two iso sprites don't visually share a tile.
// 0.95 ≈ one full character footprint + a sliver of breathing room.
const QUEUE_GAP = 0.95;
const MAX_QUEUE = 4;                              // visible line length
const SELF_R = 0.2;                              // character collision radius
// After being served the customer steps sideways to a small "pay window"
// next to the counter (still IN the shop, still next to Wei) — they
// don't immediately walk away. They pay, collect, then leave.
const SIDESTEP_X = 1.05;

// Wei's patrol lane — a thin strip right behind the counter. Clear by
// construction, so she moves freely here without obstacle checks.
// Wei's patrol z is `scaledKeeperZ` (computed per layout) so she still
// stands ~1.15 m off the back wall after the floor scales.
const KEEPER_X_MIN = -2.1;
const KEEPER_X_MAX = 2.1;
const KEEPER_FACE = Math.PI;                      // face the customer side (+Z)

const SPAWN_MIN = 1.5;                             // seconds between arrivals
const SPAWN_MAX = 10;
const SERVE_TIME = 2.0;                            // seconds Wei spends serving
// After Wei finishes the order, the customer sidesteps to the pay
// window and stays there for ~1.8s ("💳 Paying…") then ~1.4s
// ("🛍️ Got it!") before walking to the door. Total dwell ≈ 3.2s — feels
// like a real transaction without dragging the loop out.
const PAY_TIME = 1.8;
const COLLECT_TIME = 1.4;

// Real stuck detection: sample position every PROGRESS_CHECK seconds.
// If the customer moved less than PROGRESS_MIN units in that window
// while in a pathing state, they're really stuck (axis-slide thrashing
// doesn't fool us — we're checking actual ground covered).
const PROGRESS_CHECK = 0.4;
const PROGRESS_MIN = 0.08;

// Maximum time a customer stays in the shop before being force-routed
// to the door. Hard cap so the shop always turns over even if every
// other safety net fails. 18 – 28 s per customer feels lively.
const VISIT_DURATION_MIN = 18;
const VISIT_DURATION_MAX = 28;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

// State machine:
//   browsing   → walks to a random shop waypoint (avoiding furniture).
//                Customers spawn directly in this state, so the very
//                first frame they're already walking somewhere (no
//                "entering foothold" pile-up at the door).
//   idling     → standing at a waypoint, looking around, occasionally chatting
//   approaching→ heading to the BACK of the queue line (only when a slot is free)
//   queued     → has a slot behind the front of the line
//   waiting    → at the front of the line, ordering (Wei serves)
//   served     → just-finished serve, briefly sidesteps to the pay window
//   paying     → at the pay window, "💳" bubble, doesn't move
//   collecting → still at the pay window, "🛍️" bubble, doesn't move
//   leaving    → walks to the door + despawns
type CustomerState =
  | 'browsing' | 'idling' | 'approaching'
  | 'queued' | 'waiting'
  | 'served' | 'paying' | 'collecting'
  | 'leaving';
type Personality = 'chatty' | 'shy' | 'excited' | 'curious' | 'hungry';

interface Customer {
  id: string;
  character: CharacterId;
  personality: Personality;
  x: number;
  z: number;
  rotY: number;
  moving: boolean;
  state: CustomerState;
  speed: number;
  timer: number;          // generic per-state countdown
  bubble: string | null;  // current floating dialogue
  bubbleUntil: number;    // sim time when bubble auto-clears
  chatTimer: number;      // countdown to next chatter line
  waitingTotal: number;   // seconds spent in 'waiting' (drives grumpy lines)
  sidestepX: number;      // X target while in 'served' (offset from serve slot
                          // so the next customer doesn't stack on them).
  // ── Wandering ───────────────────────────────────────────────────
  waypoint: { x: number; z: number } | null;
                          // current browse target — null means pick one
  browseCount: number;    // how many waypoints visited this visit; after
                          // ~2–3 they head to the counter
  stuckTimer: number;     // seconds the agent has shown no real progress;
                          // when > 1.5 s we re-roll / escape
  // ── Progress tracking (true stuck detection) ──────────────────
  // `c.moving` lies: stepToward's axis-slide flips it to true even when
  // the customer isn't really getting anywhere (rocking back and forth
  // between two collisions). So we sample the actual position every
  // PROGRESS_CHECK seconds and only call them "moving" if they covered
  // a meaningful distance in that interval.
  lastCheckX: number;
  lastCheckZ: number;
  progressCheckT: number;
  // ── Visit lifetime ────────────────────────────────────────────
  // Total seconds since spawn. After ~VISIT_DURATION, we force the
  // customer to leave regardless of what they're doing, so the shop
  // turns over even if pathfinding misbehaves.
  visitT: number;
}

interface Keeper {
  x: number;
  z: number;
  moving: boolean;
  state: 'patrol' | 'serving';
  targetX: number;
  pause: number;          // dwell between patrol moves
  serveTimer: number;
  bubble: string | null;
  bubbleUntil: number;
}

// ── Personality dialogue banks ──────────────────────────────────────
// Each line is short enough to read at a glance over a walking sprite.

const CHATTER: Record<Personality, string[]> = {
  chatty:  ['Wow! 🌟', 'So cute!', 'Nice place!', 'Love it!', 'Cool shop!'],
  shy:     ['…', '🙂', 'hi', 'ok'],
  excited: ['YESSS!', 'Amazing!!', 'wow 🤩', 'Best!'],
  curious: ["What's that?", 'Ooh!', 'Hmm 🤔', 'Tell me more'],
  hungry:  ['So hungry!', 'Yumm 🍪', 'Need a snack', 'Feed me 😋'],
};
const IMPATIENT = ['still waiting…', '⏳', 'hmm…', 'come on…'];
const SERVED_LINES = ['Thanks! 😊', 'Yum!', 'So good 🌟', 'Lovely!'];
// New: split the post-serve moment into two phases so the customer
// actually *feels* like they're paying and collecting.
const PAYING_LINES = ['💳 Paying…', '🪙 …', '💰 here you go', '💳 tap-tap'];
const COLLECTING_LINES = ['🛍️ Got it!', '☕ thanks!', '🧋 yes!', '🍪 yay!'];

// ── Appreciation lines ──────────────────────────────────────────────
// LOUD, enthusiastic compliments fired by the customer when they've
// just been served (right at the counter, while paying / collecting)
// and as a parting line on the walk to the door. The all-caps energy
// is intentional — kids 9–12 read these as "the customer is HYPED",
// which is the feeling we want when their shop performs well.
const APPRECIATION_LINES = [
  'VERY NICE! 🤩',
  'GREAT JOB! 👏',
  'BEST SHOP EVER! 💖',
  'AMAZING WEI! 🌟',
  '10 OUT OF 10! 🏆',
  'WOWWW! ✨',
  'SO COOL!! 😎',
  'LOVE IT!! 💯',
];
// A softer "looks back at Wei on the way out" wave-goodbye. Friendly
// not loud — closes out the visit with warmth.
const FAREWELL_LINES = [
  'Thanks Wei! 👋',
  'See you! 💕',
  'Bye Wei! 🌈',
  'Best shop! 💫',
  'Coming back soon! 🛍️',
];
const WEI_LINES = ['Enjoy!', 'Thanks!', 'Come again 🌟', 'Have fun!', 'Awesome!'];
const PERSONALITIES: Personality[] = ['chatty', 'shy', 'excited', 'curious', 'hungry'];

const pickFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function blocked(
  x: number,
  z: number,
  obstacles: InteriorObstacle[],
  selfId?: string,
): boolean {
  for (const o of obstacles) {
    if (selfId && o.id === selfId) continue; // never collide with self
    if (Math.hypot(x - o.x, z - o.z) < o.r + SELF_R) return true;
  }
  return false;
}

/** Collision-aware step toward (tx,tz). Returns true once arrived. Mutates
 *  the agent's x/z/rotY/moving in place. Slides along a single axis when the
 *  direct step is blocked so customers hug furniture instead of stopping. */
function stepToward(
  a: { x: number; z: number; rotY: number; moving: boolean },
  tx: number, tz: number, speed: number, dt: number,
  obstacles: InteriorObstacle[],
  selfId?: string,
): boolean {
  const dx = tx - a.x;
  const dz = tz - a.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.07) { a.moving = false; return true; }

  const step = Math.min(speed * dt, dist);
  let nx = a.x + (dx / dist) * step;
  let nz = a.z + (dz / dist) * step;

  if (blocked(nx, nz, obstacles, selfId)) {
    if (!blocked(nx, a.z, obstacles, selfId)) nz = a.z;        // slide along X
    else if (!blocked(a.x, nz, obstacles, selfId)) nx = a.x;   // slide along Z
    else { a.moving = false; return false; }                    // wedged this frame
  }

  a.x = clamp(nx, FLOOR_BOUNDS.minX, FLOOR_BOUNDS.maxX);
  a.z = clamp(nz, FLOOR_BOUNDS.minZ, FLOOR_BOUNDS.maxZ);
  a.rotY = Math.atan2(dx, dz);
  a.moving = true;
  return false;
}

export interface ShopWorkSimProps {
  /** The player's interior layout — furniture positions become obstacles. */
  layout: IsoInteriorLayout;
  /** Which Kenney model represents the keeper (the shop's keeperId). */
  keeperCharacter: CharacterId;
  /** Hired staff member's name shown above the keeper (e.g. "Wei"). */
  keeperName?: string;
  /** How many customers can be in the shop at once. */
  capacity?: number;
}

export function ShopWorkSim({
  layout,
  keeperCharacter,
  keeperName,
  capacity = MAX_QUEUE,
}: ShopWorkSimProps) {
  // The dashboard rebuilds the `layout` object on every render (inline
  // hydrate), so we key off a content SIGNATURE rather than object identity.
  // `layoutSig` is a primitive string — equal across renders unless the
  // furniture actually changed — so the reset effect below stays quiet.
  const { obstacles, layoutSig, flavor, scaledDoor, scaledKeeperZ } = useMemo(() => {
    const s = layout.floorScale && layout.floorScale > 0 ? layout.floorScale : 1;
    return {
      obstacles: getInteriorObstacles(layout),
      layoutSig: layout.items.map((i) => `${i.type}:${i.x.toFixed(2)}:${i.z.toFixed(2)}`).join('|'),
      flavor: detectShopFlavor(layout),
      // DOOR + KEEPER positions stretch outward with the floor so customers
      // arrive AT the edge of the room (not 2 m short of it) and Wei
      // patrols behind the counter at the new back wall.
      scaledDoor: { x: 0, z: (ROOM_D / 2) * s - 0.7 },
      scaledKeeperZ: -((ROOM_D / 2) * s - 1.15),
    };
  }, [layout]);

  // Themed-pack layouts each set their own "liveliness profile". Markets
  // hum with shoppers, arcades buzz, restaurants seat a steady stream,
  // gyms have a constant flow of members coming for sessions, factories
  // run thinner because they're industrial floors not retail. Generic
  // Kenney layouts keep the original 4-customer cap.
  const isMarket  = flavor === 'supermarket';
  const isArcade  = flavor === 'arcade';
  const isRestaurant = flavor === 'restaurant';
  const isFactory = flavor === 'factory';
  const isGym     = flavor === 'gym';
  const effectiveCapacity =
    isMarket     ? capacity + 2 :
    isArcade     ? capacity + 2 :
    isRestaurant ? capacity + 1 :
    isGym        ? capacity + 1 :
    isFactory    ? capacity - 1 :
    capacity;
  const spawnMin =
    isMarket || isArcade ? 0.8 :
    isRestaurant || isGym ? 1.0 :
    isFactory ? 3.0 :
    SPAWN_MIN;
  const spawnMax =
    isMarket || isArcade ? 4.5 :
    isRestaurant || isGym ? 6.0 :
    isFactory ? 12 :
    SPAWN_MAX;

  // Kinematics live in refs (mutated each frame, never trigger re-render).
  const customersRef = useRef<Map<string, Customer>>(new Map());
  const queueRef = useRef<string[]>([]);             // ordered front → back
  const keeperRef = useRef<Keeper>({
    x: 0, z: scaledKeeperZ, moving: false, state: 'patrol',
    targetX: 0, pause: 0, serveTimer: 0,
    bubble: null, bubbleUntil: 0,
  });
  const spawnTimerRef = useRef<number>(1.0);
  const nextIdRef = useRef(0);
  // Monotonic sim clock — drives bubble auto-expiry without a separate timer
  // per agent. Survives tab-switch dt clamps because we accumulate clamped dt.
  const simTimeRef = useRef(0);
  // Spaces out chatter bubbles so two nearby customers never display
  // overlapping speech at the same instant. Updated whenever ANY customer
  // emits a chatter bubble; new chatter is suppressed for ~1.6s after.
  const lastBubbleRef = useRef(-10);
  const BUBBLE_GAP = 1.6;

  // The only piece of React state: which customers exist (for mounting their
  // meshes). Changes a few seconds apart, never per frame.
  const [ids, setIds] = useState<string[]>([]);

  // Reset cleanly only when the furniture layout content or keeper actually
  // changes (e.g. re-entering the shop or finishing a decorate session) —
  // NOT on every parent re-render.
  useEffect(() => {
    customersRef.current.clear();
    queueRef.current = [];
    setIds([]);
    spawnTimerRef.current = 1.0;
  }, [layoutSig, keeperCharacter]);

  // Queue slots — index 0 is the active "ordering" spot dead-centre on
  // Wei. The rest of the line zig-zags slightly side-to-side instead of
  // perfectly aligning on x=0, so the iso silhouette reads as several
  // distinct people (not a totem pole) AND customer-vs-customer
  // collision can keep them spaced without anyone clipping.
  function slotPos(index: number) {
    if (index <= 0) return { x: SERVE.x, z: SERVE.z };
    // Alternate sides by index, with a slowly-growing offset so each
    // row is offset just a touch more than the one in front. Keeps the
    // line readable without spreading into the seating area.
    const side = index % 2 === 1 ? -1 : 1;
    const offset = 0.35 + (Math.floor(index / 2) * 0.1);
    return { x: SERVE.x + side * offset, z: SERVE.z + index * QUEUE_GAP };
  }

  function spawnCustomer() {
    const id = `cust-${nextIdRef.current++}`;
    // Pick an "intent" — some customers head straight to the counter
    // ("eager"), most browse for a beat first ("browser"). The browser
    // count lets us slowly drift them toward the queue once they've
    // looked around enough. Wider speed range so a stream of customers
    // doesn't move in lock-step.
    const eager = Math.random() < 0.25;
    // Spread spawn x a touch wider so two customers entering on the
    // same tick don't immediately collide-wedge each other at the door.
    const c: Customer = {
      id,
      character: CUSTOMER_IDS[Math.floor(Math.random() * CUSTOMER_IDS.length)],
      personality: pickFrom(PERSONALITIES),
      x: scaledDoor.x + rand(-0.9, 0.9),
      z: scaledDoor.z,
      rotY: Math.PI, // facing into the shop (−Z)
      moving: true,
      // Skip the dedicated 'entering' foothold — every customer used to
      // path to (0, 2.8) and pile up there. They now go straight into
      // 'browsing' (which picks its own random waypoint) or
      // 'approaching' (for eagers and only if a queue slot is free).
      // The screen door is right behind them so they're visibly walking
      // *into* the shop on the very first frame.
      state: 'browsing',
      speed: rand(0.85, 1.45),
      timer: 0,
      bubble: null,
      bubbleUntil: 0,
      chatTimer: rand(2.0, 5.0),
      waitingTotal: 0,
      sidestepX: 0,
      waypoint: null,
      // Eagers begin past the browseCount threshold so the first idle
      // tick rolls them straight into the queue.
      browseCount: eager ? 99 : 0,
      stuckTimer: 0,
      // Seed progress tracking at the spawn position so the first
      // 0.4 s check doesn't immediately flag them as stuck.
      lastCheckX: scaledDoor.x,
      lastCheckZ: scaledDoor.z,
      progressCheckT: 0,
      visitT: 0,
    };
    customersRef.current.set(id, c);
    // NOT pushed into queueRef anymore — customers join the queue only
    // when they decide to (in the 'approaching' transition below).
    setIds((prev) => [...prev, id]);
  }

  /** Find a free spot somewhere on the shop floor that no furniture / no
   *  other customer occupies. Used as a browse waypoint. Up to 12 tries
   *  before giving up (then null — caller falls back to "do nothing").
   *
   *  We keep waypoints in the *front half* of the shop (closer to the
   *  door than to Wei's counter) so browsers don't crowd the queue
   *  area. The line of business stays a separate stage from the
   *  browsing area. */
  function pickBrowseWaypoint(currentX: number, currentZ: number): { x: number; z: number } | null {
    const minX = FLOOR_BOUNDS.minX + 0.8;
    const maxX = FLOOR_BOUNDS.maxX - 0.8;
    // Wait → minZ of -0.5 keeps browsers from drifting into the
    // immediate counter zone. Door is at +4.3, so the corridor is from
    // -0.5 → +3.6.
    const minZ = -0.5;
    const maxZ = scaledDoor.z - 0.6;
    for (let i = 0; i < 12; i++) {
      const x = rand(minX, maxX);
      const z = rand(minZ, maxZ);
      // Must be clear of every static obstacle (skip self by passing
      // no id — we just look at furniture, customers can resolve their
      // own collisions via stepToward).
      if (blocked(x, z, obstacles)) continue;
      // Don't pick a waypoint right where the customer already is.
      if (Math.hypot(x - currentX, z - currentZ) < 1.0) continue;
      return { x, z };
    }
    return null;
  }

  /** Try to join the queue at the back. Returns the assigned slot index
   *  on success, or -1 if the line is full and the customer should
   *  keep browsing for now. */
  function tryJoinQueue(id: string): number {
    if (queueRef.current.includes(id)) return queueRef.current.indexOf(id);
    if (queueRef.current.length >= MAX_QUEUE) return -1;
    queueRef.current.push(id);
    return queueRef.current.length - 1;
  }

  function despawn(id: string) {
    customersRef.current.delete(id);
    queueRef.current = queueRef.current.filter((q) => q !== id);
    setIds((prev) => prev.filter((q) => q !== id));
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp big tab-restore frames
    simTimeRef.current += dt;
    const now = simTimeRef.current;
    const customers = customersRef.current;
    const queue = queueRef.current;
    const keeper = keeperRef.current;

    // ── Spawning ──────────────────────────────────────────────────────
    // Cap the TOTAL number of customers in the shop (queue + browsers +
    // post-serve + leaving), not just queue length. Otherwise a steady
    // stream of browsers would pile up indefinitely. `capacity` doubles
    // as the queue cap inside `tryJoinQueue`, but the shop can host a
    // few more bodies at once (browsers + people leaving) — so we allow
    // up to `capacity + 3`.
    spawnTimerRef.current -= dt;
    if (spawnTimerRef.current <= 0 && customers.size < effectiveCapacity + 3) {
      spawnCustomer();
      spawnTimerRef.current = rand(spawnMin, spawnMax);
    }

    // ── Dynamic obstacle list ─────────────────────────────────────────
    // Each frame we combine the static furniture obstacles with every
    // living agent (other customers + Wei). Each entry carries the
    // agent's id so `stepToward(..., selfId)` skips the agent's own
    // entry and they don't block themselves. This is what stops two
    // customers from sharing the same spot — every other customer is
    // now a solid 0.32 m radius circle in the world they have to walk
    // around. Building the array once per frame is cheap (≤ 10 agents).
    const dynObstacles: InteriorObstacle[] = obstacles.slice();
    for (const c of customers.values()) {
      dynObstacles.push({ x: c.x, z: c.z, r: SELF_R, id: c.id });
    }
    dynObstacles.push({ x: keeper.x, z: keeper.z, r: SELF_R, id: '__keeper__' });

    // ── Expire stale dialogue bubbles ────────────────────────────────
    if (keeper.bubble && now >= keeper.bubbleUntil) keeper.bubble = null;

    // ── Customers ─────────────────────────────────────────────────────
    // Iterate ALL customers: entering/queued/waiting use their queue slot,
    // while served/leaving customers have already left the line and just
    // walk to the door. (The line shuffles forward because served customers
    // are removed from `queue` the instant Wei finishes — see keeper block.)
    for (const id of [...customers.keys()]) {
      const c = customers.get(id);
      if (!c) continue;

      // ── Per-customer bubble lifecycle ─────────────────────────────
      // Expire stale lines so they don't linger over a walking sprite, and
      // tick the chat timer so each personality occasionally pipes up.
      // A global throttle (`lastBubbleRef`) suppresses simultaneous bubbles
      // so two nearby customers never visually overlap their speech.
      if (c.bubble && now >= c.bubbleUntil) c.bubble = null;
      c.chatTimer -= dt;
      // Chatter only fires for customers still in the line — once they've
      // been served they're "transacting" and their bubbles come from the
      // PAYING / COLLECTING lines instead.
      if (
        c.chatTimer <= 0 &&
        c.state !== 'served' && c.state !== 'paying' &&
        c.state !== 'collecting' && c.state !== 'leaving' &&
        now - lastBubbleRef.current >= BUBBLE_GAP
      ) {
        // 30% of chatter pulls from the loud appreciation bank instead
        // of the personality default — so a happy browser will spot
        // Wei from across the shop and call out "VERY NICE!". Queued
        // customers in particular get this most: they're literally
        // staring at the counter, so a compliment reads naturally.
        const compliment = c.state === 'queued' || c.state === 'waiting'
          ? Math.random() < 0.5
          : Math.random() < 0.3;
        c.bubble = compliment
          ? pickFrom(APPRECIATION_LINES)
          : pickFrom(CHATTER[c.personality]);
        c.bubbleUntil = now + 2.2;
        c.chatTimer = rand(5.5, 11.0);
        lastBubbleRef.current = now;
      } else if (c.chatTimer <= 0) {
        // Re-arm quickly so we try again once the global gap clears.
        c.chatTimer = 0.8;
      }

      // ── Visit lifetime ─────────────────────────────────────────────
      // Every customer is allotted a finite visit. When it expires we
      // force them to walk back to the door and leave, regardless of
      // what state they're currently in. This guarantees the shop
      // always turns over — even if every other safety net fails.
      c.visitT += dt;
      // Deterministic per-customer visit cap in [MIN, MAX) — derived
      // from the id so every customer has their own pace without
      // needing another field on the struct.
      const span = VISIT_DURATION_MAX - VISIT_DURATION_MIN;
      const visitCap = VISIT_DURATION_MIN + (c.id.length * 7 % (span * 10)) / 10;
      if (c.visitT > visitCap && c.state !== 'leaving' && c.state !== 'served' && c.state !== 'paying' && c.state !== 'collecting') {
        if (queueRef.current.includes(id)) {
          queueRef.current = queueRef.current.filter((q) => q !== id);
        }
        c.state = 'leaving';
        c.timer = 0;       // skip the look-back wave; their time is up
        c.waypoint = null;
        c.stuckTimer = 0;
      }
      // ── Stuck-recovery (real progress check) ─────────────────────
      // `c.moving` is unreliable — stepToward's axis-slide flips it to
      // true even when the customer is just rocking between two
      // collisions. Sample the actual position every PROGRESS_CHECK
      // seconds and only count it as "moved" if they covered at least
      // PROGRESS_MIN units in that window.
      const isPathingState =
        c.state === 'browsing' ||
        c.state === 'approaching' || c.state === 'leaving';
      if (isPathingState) {
        c.progressCheckT += dt;
        if (c.progressCheckT >= PROGRESS_CHECK) {
          const moved = Math.hypot(c.x - c.lastCheckX, c.z - c.lastCheckZ);
          if (moved < PROGRESS_MIN) {
            c.stuckTimer += c.progressCheckT;
          } else {
            c.stuckTimer = 0;
          }
          c.lastCheckX = c.x;
          c.lastCheckZ = c.z;
          c.progressCheckT = 0;
        }
      } else {
        c.stuckTimer = 0;
        c.progressCheckT = 0;
        c.lastCheckX = c.x;
        c.lastCheckZ = c.z;
      }
      // When stuck >1.5 s during browsing/approaching, re-plan. When
      // stuck >2.0 s during leaving, despawn (we can't path them home,
      // so just remove them — better than a frozen agent in the shop).
      if (c.state === 'leaving' && c.stuckTimer > 2.0) {
        despawn(id);
        continue;
      }
      if (isPathingState && c.state !== 'leaving' && c.stuckTimer > 1.5) {
        // Drop any commitments and re-plan from scratch.
        if (queueRef.current.includes(id)) {
          queueRef.current = queueRef.current.filter((q) => q !== id);
        }
        c.waypoint = null;
        c.state = 'browsing';
        c.stuckTimer = 0;
      }

      if (c.state === 'browsing') {
        // Pick a random waypoint somewhere in the front half of the
        // shop and walk to it. Furniture-aware (waypoint is sampled
        // outside any furniture footprint). Stuck-recovery re-rolls
        // the waypoint when we can't move for >0.9s.
        if (!c.waypoint || c.stuckTimer > 0.9) {
          c.waypoint = pickBrowseWaypoint(c.x, c.z);
          c.stuckTimer = 0;
        }
        if (!c.waypoint) {
          // Couldn't sample one — try the queue as a fallback. Failing
          // that, just hang out where we are for a beat.
          const slot = tryJoinQueue(id);
          if (slot >= 0) {
            c.state = 'approaching';
          } else {
            c.state = 'idling';
            c.timer = 1.2;
          }
        } else {
          const arrived = stepToward(c, c.waypoint.x, c.waypoint.z, c.speed * 0.95, dt, dynObstacles, id);
          if (arrived) {
            // Half the time, skip the idle entirely and go straight to
            // the next waypoint. Customers feel actively engaged with
            // the shop instead of "stopping every few feet".
            if (Math.random() < 0.5) {
              c.waypoint = null; // browsing block will roll a new one next frame
            } else {
              c.state = 'idling';
              c.timer = rand(0.9, 2.2);   // shorter idle so they don't look stuck
              c.waypoint = null;
            }
            c.browseCount += 1;
          }
        }
      } else if (c.state === 'idling') {
        // Stand at the waypoint, gently rotating to "look around". Once
        // the idle timer hits zero, decide what to do next based on how
        // many waypoints they've already visited.
        c.moving = false;
        c.timer -= dt;
        // Look around — wobble facing direction slowly.
        const seed = id.length + nextIdRef.current;
        c.rotY = Math.sin(now * 0.6 + seed * 0.5) * 1.4;
        if (c.timer <= 0) {
          // After 2 browses they should head for the counter. If the
          // queue is full they go for another lap instead.
          if (c.browseCount >= 2) {
            const slot = tryJoinQueue(id);
            c.state = slot >= 0 ? 'approaching' : 'browsing';
          } else {
            c.state = 'browsing';
          }
        }
      } else if (c.state === 'approaching' || c.state === 'queued') {
        // Walk up to (or shuffle within) this customer's slot in the
        // line. Uses the dynamic obstacle set so other customers + Wei
        // are treated as solid.
        const slot = queue.indexOf(id);
        if (slot < 0) {
          // Got bumped out of the queue somehow — fall back to browsing
          // and try again later.
          c.state = 'browsing';
          c.waypoint = null;
          continue;
        }
        const target = slotPos(slot);
        const arrived = stepToward(c, target.x, target.z, c.speed, dt, dynObstacles, id);
        if (arrived) {
          if (slot === 0) { c.state = 'waiting'; c.rotY = Math.PI; }
          else c.state = 'queued';
        } else if (c.state === 'queued') {
          // Already in the line, shuffling toward the slot — sway a
          // touch so they don't look glued in place. Small sinusoid
          // driven by id-derived phase so neighbours sway out of sync.
          const seed = id.length + nextIdRef.current;
          const sway = Math.sin(now * 1.3 + seed * 0.7) * 0.06;
          c.rotY = Math.PI + sway;
        }
        // Stuck-recovery for an approaching customer who can't find a
        // path to the queue back: yield the slot and go back to
        // browsing, then try again later.
        if (c.state === 'approaching' && c.stuckTimer > 1.6) {
          queueRef.current = queueRef.current.filter((q) => q !== id);
          c.state = 'browsing';
          c.waypoint = null;
          c.stuckTimer = 0;
        }
      } else if (c.state === 'waiting') {
        // Hold position at the counter; face the keeper. Served via keeper.
        c.moving = false;
        c.rotY = Math.PI;
        c.waitingTotal += dt;
        // If Wei is taking a while, the customer starts looking impatient —
        // a soft prompt without making the game stressful.
        if (c.waitingTotal > 4 && !c.bubble) {
          c.bubble = pickFrom(IMPATIENT);
          c.bubbleUntil = now + 1.8;
          c.waitingTotal = 1.5; // re-arm after a beat, not constant whining
        }
      } else if (c.state === 'served') {
        // Briefly shuffle aside to the pay window so the next person in
        // line can walk into the serve slot. The transition to 'paying'
        // happens once they arrive at the sidestep position.
        c.timer -= dt;
        const arrived = stepToward(
          c,
          c.sidestepX,
          SERVE.z,           // keep them right at the counter, not back in the queue
          c.speed * 0.9,
          dt,
          dynObstacles, id,
        );
        // Face Wei (toward -Z) while paying so the iso silhouette reads
        // "still talking to the keeper" instead of "wandering off".
        c.rotY = Math.PI;
        if (arrived || c.timer <= 0) {
          c.state = 'paying';
          c.timer = PAY_TIME;
          c.bubble = pickFrom(PAYING_LINES);
          c.bubbleUntil = now + PAY_TIME;
          c.moving = false;
        }
      } else if (c.state === 'paying') {
        // Stand at the pay window. Wei keeps serving the next person —
        // the queue has already shuffled forward.
        c.moving = false;
        c.rotY = Math.PI;
        c.timer -= dt;
        if (c.timer <= 0) {
          // Transition into the collect beat with a LOUD appreciation
          // bubble — kids see "VERY NICE!" / "GREAT JOB!" the moment
          // their shop has finished serving the customer.
          c.state = 'collecting';
          c.timer = COLLECT_TIME;
          c.bubble = pickFrom(APPRECIATION_LINES);
          c.bubbleUntil = now + COLLECT_TIME;
        }
      } else if (c.state === 'collecting') {
        // "Picking up the drink" — same spot, different bubble. After
        // this they finally head for the door. Halfway through, swap to
        // the COLLECTING_LINES so the player sees BOTH the loud
        // appreciation AND the "got my drink" beat in one visit.
        c.moving = false;
        c.rotY = Math.PI;
        c.timer -= dt;
        if (c.timer <= COLLECT_TIME / 2 && c.bubble && APPRECIATION_LINES.includes(c.bubble)) {
          c.bubble = pickFrom(COLLECTING_LINES);
          c.bubbleUntil = now + (COLLECT_TIME / 2);
        }
        if (c.timer <= 0) {
          c.state = 'leaving';
          // Set up the look-back beat — `timer` doubles here as a one-
          // shot "I haven't waved goodbye yet" gate. The leaving block
          // consumes it once and clears.
          c.timer = 0.8;
        }
      } else if (c.state === 'leaving') {
        // Walk to the door — but right at the start, briefly look back
        // at Wei and wave a parting line ("Thanks Wei! 👋"). This makes
        // the customer feel like a real person closing the interaction
        // instead of a sprite that vanishes. The look-back lasts ~0.8s.
        if (c.timer > 0) {
          c.timer -= dt;
          c.moving = false;
          c.rotY = Math.PI; // facing Wei
          if (!c.bubble) {
            c.bubble = pickFrom(FAREWELL_LINES);
            c.bubbleUntil = now + 1.4;
          }
          // Don't path yet — wait out the wave.
          continue;
        }
        const arrived = stepToward(c, scaledDoor.x, scaledDoor.z, c.speed * 1.15, dt, dynObstacles, id);
        if (arrived) despawn(id);
        // Leaving customer wedged for too long? Free up the world by
        // despawning them where they stand — better than a frozen agent
        // blocking the room forever.
        else if (c.stuckTimer > 3) despawn(id);
      }
    }

    // ── Keeper (Wei) ──────────────────────────────────────────────────
    const front = queue.length > 0 ? customers.get(queue[0]) : undefined;
    const someoneWaiting = !!front && front.state === 'waiting';

    if (someoneWaiting) {
      // Move to the front customer's x, then serve.
      keeper.state = 'serving';
      const targetX = clamp(front!.x, KEEPER_X_MIN, KEEPER_X_MAX);
      const dx = targetX - keeper.x;
      if (Math.abs(dx) > 0.05) {
        keeper.x += Math.sign(dx) * Math.min(1.4 * dt, Math.abs(dx));
        keeper.moving = true;
        keeper.serveTimer = SERVE_TIME;
      } else {
        keeper.moving = false;
        keeper.serveTimer -= dt;
        if (keeper.serveTimer <= 0) {
          // Serve complete — send the customer to the pay window. They'll
          // dwell there through 'served' → 'paying' → 'collecting' before
          // finally leaving, so the moment reads as a real transaction
          // (not "thanks bye" 0.7 s later). Pull them OUT of the queue
          // immediately so the next person can walk into the serve slot.
          front!.state = 'served';
          front!.timer = 0.6; // max time spent sidestepping before forcing 'paying'
          front!.bubble = pickFrom(SERVED_LINES);
          front!.bubbleUntil = now + 1.8;
          // Alternate sidestep direction per serve so a steady stream of
          // customers spreads to BOTH sides of the counter, not one pile.
          front!.sidestepX = nextIdRef.current % 2 === 0 ? -SIDESTEP_X : SIDESTEP_X;
          queueRef.current = queue.filter((q) => q !== front!.id);
          // Wei thanks the customer too — her own bubble plays alongside.
          keeper.bubble = pickFrom(WEI_LINES);
          keeper.bubbleUntil = now + 2.2;
          keeper.serveTimer = SERVE_TIME;
        }
      }
    } else {
      // Patrol: drift left/right behind the counter with little pauses so
      // Wei always looks busy rather than frozen in one spot.
      keeper.state = 'patrol';
      if (keeper.pause > 0) {
        keeper.pause -= dt;
        keeper.moving = false;
      } else {
        const dx = keeper.targetX - keeper.x;
        if (Math.abs(dx) < 0.06) {
          keeper.moving = false;
          keeper.pause = rand(0.6, 1.8);
          keeper.targetX = rand(KEEPER_X_MIN, KEEPER_X_MAX);
        } else {
          keeper.x += Math.sign(dx) * Math.min(0.9 * dt, Math.abs(dx));
          keeper.moving = true;
        }
      }
    }
  });

  return (
    <group>
      {ids.map((id) => {
        const c = customersRef.current.get(id);
        if (!c) return null;
        return <CustomerWalker key={id} agent={c} />;
      })}
      <KeeperWalker agent={keeperRef.current} character={keeperCharacter} name={keeperName} />
      {/* Active pet (if any) floats beside Wei. The pet reads keeperRef
          directly each frame — no React state plumbing needed. */}
      <PetCompanion anchorRef={keeperRef} layout={layout} />
    </group>
  );
}

/** Renders one customer; copies its ref-driven kinematics to the group each
 *  frame and flips walk/idle only when its motion actually changes. */
function CustomerWalker({ agent }: { agent: Customer }) {
  const grp = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(true);
  const [bubble, setBubble] = useState<string | null>(null);

  useFrame(() => {
    if (!grp.current) return;
    grp.current.position.set(agent.x, 0, agent.z);
    grp.current.rotation.y = agent.rotY;
    if (agent.moving !== walking) setWalking(agent.moving);
    if (agent.bubble !== bubble) setBubble(agent.bubble);
  });

  return (
    <group ref={grp} position={[agent.x, 0, agent.z]} rotation={[0, agent.rotY, 0]}>
      <KenneyCharacter
        path={KENNEY_CHARACTERS[agent.character]}
        clip={walking ? 'walk' : 'idle'}
        scale={0.85}
      />
      {bubble && <SpeechBubble text={bubble} y={1.85} />}
    </group>
  );
}

/** Renders Wei. Always faces the customers; slides laterally behind the
 *  counter. Walk/idle flips with motion; a name tag floats above her. */
function KeeperWalker({ agent, character, name }: {
  agent: Keeper; character: CharacterId; name?: string;
}) {
  const grp = useRef<THREE.Group>(null);
  const [walking, setWalking] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);

  useFrame(() => {
    if (!grp.current) return;
    grp.current.position.set(agent.x, 0, agent.z);
    if (agent.moving !== walking) setWalking(agent.moving);
    if (agent.bubble !== bubble) setBubble(agent.bubble);
  });

  return (
    <group ref={grp} position={[agent.x, 0, agent.z]} rotation={[0, KEEPER_FACE, 0]}>
      <KenneyCharacter
        path={KENNEY_CHARACTERS[character]}
        clip={walking ? 'walk' : 'idle'}
        scale={1.0}
      />
      {/* Wei's reaction bubble — pops above the name tag when she finishes
          serving someone so the moment reads as a friendly hand-off. */}
      {bubble && <SpeechBubble text={bubble} y={2.55} />}
      {name && (
        <Billboard position={[0, 2.05, 0]} rotation={[0, -KEEPER_FACE, 0]}>
          <mesh>
            <planeGeometry args={[Math.max(name.length * 0.16 + 0.3, 0.9), 0.46]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.82} toneMapped={false} />
          </mesh>
          <Text fontSize={0.26} color="#ffffff" anchorX="center" anchorY="middle" position={[0, 0, 0.01]}>
            {name}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

/** Cute warm-tinted speech bubble billboarded above an agent. Width adapts
 *  to the text length so 1-emoji blurbs don't look stretched. */
function SpeechBubble({ text, y }: { text: string; y: number }) {
  const w = Math.max(text.length * 0.16 + 0.45, 0.95);
  return (
    <Billboard position={[0, y, 0]}>
      <mesh>
        <planeGeometry args={[w, 0.5]} />
        <meshBasicMaterial color="#fff7ed" transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w - 0.08, 0.42]} />
        <meshBasicMaterial color="#ffedd5" transparent opacity={1} toneMapped={false} />
      </mesh>
      <Text
        fontSize={0.24}
        color="#7c2d12"
        anchorX="center"
        anchorY="middle"
        position={[0, 0, 0.01]}
        maxWidth={w - 0.15}
      >
        {text}
      </Text>
    </Billboard>
  );
}
