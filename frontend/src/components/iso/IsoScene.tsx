import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Store, Compass, Gift, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { IsoCity } from './IsoCity';
import { IsoShop } from './IsoShop';
import { IsoShopInterior } from './IsoShopInterior';
import { LearningHub } from './LearningHub';
import { SettingsHub } from './SettingsHub';
import { detectShopFlavor, type IsoInteriorLayout } from './interiorLayout';
import { useNavigate } from 'react-router-dom';
import { IsoNPCSwarm } from './IsoNPC';
import { GrassDetail } from './GrassDetail';
import { GrassGround } from './GrassGround';
import { CityProps } from './CityProps';
import { PlayerShopBubble } from './PlayerShopBubble';
import { WorldShopPreview } from './WorldShopPreview';
import { fetchWorld, type WorldBuilding } from '../../services/worldsApi';
import { getShopImageUrl } from '../../lib/api';
import {
  SHOPS,
  NPC_PATHS,
  TILE_SIZE,
  ROWS,
  COLS,
  cellToWorld,
  worldToCell,
  type ShopDef,
} from './cityMap';
import { usePanZoom } from './usePanZoom';
import { ShopActionMenu } from './ShopActionMenu';
import { WorldDock, DEFAULT_WORLD_DOCK_ITEMS, type WorldDockItem } from './WorldDock';
import { getDeviceProfile } from '../../hooks/useDeviceTier';

/**
 * Live dock (logged-in student) — mirrors the global BottomNav so the iso
 * world and every module page share one navigation language:
 *   [Store] [Explore]  ◯Home  [Rewards] [More]
 * The centre globe is "Home" (leaves a shop interior, else you're already
 * home); "More" opens the shared shortcuts sheet. The demo scene keeps the
 * game-flavoured default set (Modules/Tokens/Magic/Profile) which opens the
 * in-place DemoModal instead of routing.
 */
// 4 side tiles flanking the centre globe (2 left + 2 right). The dock
// auto-splits at ceil(length / 2) so it keeps the same balanced layout
// even if a 5th tile is added later.
const LIVE_DOCK_ITEMS: WorldDockItem[] = [
  { id: 'store',    icon: Store,   label: 'Store',   variant: 'lime'   },
  { id: 'explore',  icon: Compass, label: 'Explore', variant: 'cyan'   },
  { id: 'rewards',  icon: Gift,    label: 'Rewards', variant: 'amber'  },
  { id: 'more',     icon: Menu,    label: 'More',    variant: 'violet' },
];
import { DemoHUD, type DemoStats } from './DemoHUD';
import { DemoModal, type DemoView } from './DemoModal';
import { ShopMiniGame, type ShopProgressFlags } from './ShopMiniGame';

/**
 * Top-level iso scene — Clash-of-Clans style.
 *
 *   • The user **pans and zooms a map**; there's no walking player.
 *   • Tapping a building opens an action menu: Enter / Move.
 *   • Enter → loading transition → interior view (also scrollable).
 *   • Move → the building goes semi-transparent and follows the camera's
 *     cursor; tapping any tile drops it there. Tick to confirm, X to cancel.
 *   • A mobile dock at the bottom navigates between modules + AI Tokens.
 *
 * Everything is wired up in this single component so the scene state
 * machine (city ↔ interior ↔ move-mode) lives in one place. The actual
 * city / interior visuals + the camera pan/zoom are each in their own
 * file.
 */

// World bounds for the camera target — derived from the map size so the
// user can pan everywhere they need to but can't get lost in empty space.
const CITY_PAN_BOUNDS = {
  minX: -(COLS * TILE_SIZE) / 2 + 4,
  maxX:  (COLS * TILE_SIZE) / 2 - 4,
  minZ: -(ROWS * TILE_SIZE) / 2 + 4,
  maxZ:  (ROWS * TILE_SIZE) / 2 - 4,
};

// Interior room is 12 × 10 world units. The bounds let the camera pan
// across almost the whole room with a 1-unit margin so the walls stay in
// frame instead of disappearing off the edge.
const INTERIOR_PAN_BOUNDS = {
  minX: -5,
  maxX: 5,
  minZ: -4,
  maxZ: 4,
};

interface CityCameraRigProps {
  panEnabled: boolean;
  bounds: typeof CITY_PAN_BOUNDS;
  initial?: [number, number, number];
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  /** World XZ to smoothly recentre on when this prop changes. Used to
   *  auto-focus a tapped shop so its action menu lands near the centre
   *  of the screen instead of near the edge. */
  focusOn?: [number, number] | null;
}

/** Pauses R3F's render loop when the tab is hidden. Lives inside the
 *  Canvas so it can flip the `frameloop` setting via `set()`.
 *  Mobile chromes (Chrome/Safari on Android/iOS) keep WebGL contexts
 *  ticking in the background by default — this is the single biggest
 *  battery + heat win on a phone left on the home screen with the tab
 *  alive. */
function VisibilityPause() {
  const set = useThree((s) => s.set);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVis = () => {
      if (document.hidden) {
        set({ frameloop: 'never' });
      } else {
        set({ frameloop: 'always' });
        invalidate();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [set, invalidate]);
  return null;
}

/** Mounts the pan/zoom controller. Lives inside Canvas so it can access r3f hooks. */
function CameraRig({ panEnabled, bounds, initial, minZoom, maxZoom, initialZoom, focusOn }: CityCameraRigProps) {
  // We pass the pan-enabled flag through the bounds — when disabled, we
  // collapse the pan range to a point so user gestures can't move anything.
  // (Simpler than re-wiring the hook for an "enabled" prop.)
  const effective = useMemo(
    () => panEnabled ? bounds : { minX: bounds.minX, maxX: bounds.maxX, minZ: bounds.minZ, maxZ: bounds.maxZ },
    [panEnabled, bounds],
  );
  const { recentre } = usePanZoom({ bounds: effective, initial, minZoom, maxZoom, initialZoom });

  // Re-fire recentre whenever the focus prop changes. We compare values
  // (not reference) by joining to a string so the consumer can pass a
  // fresh tuple each render without churning the camera.
  const focusKey = focusOn ? `${focusOn[0]},${focusOn[1]}` : null;
  useEffect(() => {
    if (!focusOn) return;
    recentre(focusOn[0], focusOn[1]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return null;
}

/**
 * Captures clicks on empty ground tiles. Renders an invisible plane the
 * size of the city; if the user clicks it (i.e. didn't hit a shop), we
 * forward the world XZ to the parent. Used in "move mode" to relocate a
 * shop, and for closing the action menu by clicking elsewhere.
 */
function GroundPicker({ onGroundClick }: { onGroundClick: (x: number, z: number) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onGroundClick(e.point.x, e.point.z);
      }}
    >
      <planeGeometry args={[COLS * TILE_SIZE * 2, ROWS * TILE_SIZE * 2]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────

/**
 * Total NPCs that should walk through the city at a given popularity
 * level. Encodes the band schedule the dashboard requested:
 *
 *   Level 1-5   → 1-2 NPCs
 *   Level 6-10  → 2-3 NPCs
 *   Level 11-15 → 3-4 NPCs
 *   ... +1 NPC per band of 5 levels, no upper bound.
 *
 * Position within the band determines the exact value: the bottom 3
 * levels of a band get the lower count, the top 2 get the higher. So
 * popularity always feels progressive — every couple of levels gained
 * pulls in another customer.
 */
export function npcCountForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  const band = Math.floor((lv - 1) / 5); // 0, 1, 2, ...
  const positionInBand = (lv - 1) % 5; // 0..4
  const base = band + 1;
  return positionInBand < 3 ? base : base + 1;
}

type Mode =
  | { kind: 'city' }
  | { kind: 'move'; shopId: string; ghostCell: { row: number; col: number } }
  | { kind: 'loading'; targetShopId: string }
  | { kind: 'interior'; shopId: string };

interface IsoSceneProps {
  /** Called when the iso scene first reaches an interactive state. Used by
   *  parents (e.g. DemoPage) to dismiss the boot loader. */
  onReady?: () => void;
  /** AI-generated shop exterior image. When provided, an initial-popout
   *  bubble floats above My Shop showing this image + the shop name —
   *  hidden when the user taps the shop (the action menu replaces it). */
  playerShopImage?: string;
  /** Override the default "My Shop" name with the player's actual shop
   *  name from their backend profile. */
  playerShopName?: string;
  /** Hired staff member's name (e.g. "Wei") shown above the keeper while
   *  the player is working inside their own shop. */
  keeperName?: string;
  /** Real player stats (tokens / popularity level / coins / streak).
   *  When provided, the HUD shows these instead of the local demo
   *  state. The dashboard passes the backend numbers; /demo lets the
   *  internal demo state drive the bar. */
  stats?: DemoStats;
  /** Total NPCs to render across the city. When provided, takes
   *  priority over the demo's "popularity → density" calculation. The
   *  dashboard uses this to gate the crowd on the onboarding step
   *  (set to 0 until the player has staff + at least 2 products). */
  npcCount?: number;
  /** Override the default dock click handler — used by the dashboard
   *  to navigate to real /s/aipreneur/* routes instead of opening the
   *  demo modal. The string id matches `DEFAULT_DOCK_ITEMS[].id`. */
  onDockAction?: (id: string) => void;
  /** Override the HUD "Tokens" pill click. The dashboard wires this to
   *  navigate to the real /s/aipreneur/ai-tokens top-up page; without
   *  it we fall through to the demo modal (used by anonymous /demo). */
  onTokensClick?: () => void;
  /** Pre-hydrated interior layout to apply when the player enters their
   *  own shop. The dashboard passes this from
   *  `business.interior_config.iso_layout`. Other shops still render the
   *  hard-coded default layout. */
  playerInteriorLayout?: IsoInteriorLayout;
  /** Fires whenever the player enters/leaves the interior view. The
   *  dashboard uses this to hide the city-mode GameOverlay HUD so it
   *  doesn't collide with the in-shop mini-game HUD. */
  onInteriorChange?: (inside: boolean) => void;
  /** Real-progress flags forwarded into the in-shop mini-game so its
   *  Missions panel and progress-tied achievements light up from the
   *  student's actual AIpreneur module state. */
  shopProgress?: ShopProgressFlags;
  /** Mini-game payout / nav bridges. The dashboard wires these to
   *  real backend writes + react-router navigation. */
  onShopEarnCoins?: (coins: number) => void;
  onShopEarnXp?: (xp: number) => void;
  onShopEarnTokens?: (tokens: number) => void;
  onShopNavigate?: (route: string) => void;
  /** When true, the scene auto-enters the player's shop interior on mount.
   *  Used when returning from a /s/aipreneur/* sub-page so the user lands
   *  back inside the shop rather than out on the city map. */
  enterPlayerInterior?: boolean;
  /** The student's chosen shop type (passion_category id — cafe, factory,
   *  supermarket, …). Used by the in-shop mini-game to pick a themed
   *  product pool so customer orders match the shop. The layout-based
   *  supermarket detector below overrides this when the saved interior is
   *  clearly a supermarket, so the right pool applies even before the
   *  backend field catches up. */
  shopCategory?: string | null;
  /** Enables the multi-user world system: the 8 surrounding buildings are
   *  populated from real users via the worlds API, and left/right arrows
   *  page between worlds. Off by default (the /demo route keeps the static
   *  placeholder city). */
  worldsEnabled?: boolean;
}

/** Resolve once — small promise sleep used to pace the world transition. */
const wait = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

/** Cloud puffs for the world-transition overlay. Each drifts horizontally
 *  across the screen (alternating directions) to sell the "clouds rolling
 *  in" effect while the next world loads. Sizes are in px. */
const WORLD_CLOUDS = [
  { top: '8%',  size: 460, from: -260, to: 1280, dur: 9,  delay: 0,   opacity: 0.22 },
  { top: '30%', size: 560, from: 1280, to: -360, dur: 12, delay: 1.1, opacity: 0.16 },
  { top: '52%', size: 400, from: -320, to: 1200, dur: 8,  delay: 0.4, opacity: 0.24 },
  { top: '70%', size: 600, from: 1200, to: -420, dur: 13, delay: 2.0, opacity: 0.14 },
  { top: '86%', size: 440, from: -280, to: 1240, dur: 10, delay: 0.8, opacity: 0.2  },
];

/**
 * Overlay live world data onto the static SHOPS template. The 3×3 grid
 * position maps directly to the SHOPS array index (position = index + 1,
 * with index 4 / position 5 being the centre player shop), so each cell
 * keeps its hand-tuned geometry (cell, door, building model) while its
 * identity (name, owner, image) comes from the backend.
 *
 * Cells with no live shop (a partially-filled final world) keep their
 * static placeholder so the city never reads as broken.
 */

/** Shop-height Kenney commercial models. Restricted to the 9 variants the
 *  city was designed around — these are short enough that the floating name
 *  label (fixed at y≈3.6 in IsoShop) always clears the roof. The taller
 *  office/tower variants (e, j, l, m, n) are excluded because their roofs
 *  rise above the label and hide the name. 9 variants = exactly enough to
 *  give every building in a world a distinct model. */
const BUILDING_VARIANTS: ShopDef['buildingId'][] = [
  'a', 'b', 'c', 'd', 'f', 'g', 'h', 'i', 'k',
];

/** Wall / roof / sign colour triples used to repaint world buildings. 14
 *  entries so a world's ≤9 buildings each get a distinct palette. */
const BUILDING_COLORS: Array<{ wall: string; roof: string; sign: string }> = [
  { wall: '#fde68a', roof: '#f59e0b', sign: '#92400e' },
  { wall: '#bbf7d0', roof: '#16a34a', sign: '#14532d' },
  { wall: '#fecdd3', roof: '#e11d48', sign: '#9f1239' },
  { wall: '#bae6fd', roof: '#0284c7', sign: '#075985' },
  { wall: '#ddd6fe', roof: '#7c3aed', sign: '#5b21b6' },
  { wall: '#fed7aa', roof: '#ea580c', sign: '#9a3412' },
  { wall: '#c7d2fe', roof: '#6366f1', sign: '#3730a3' },
  { wall: '#fbcfe8', roof: '#db2777', sign: '#9d174d' },
  { wall: '#a7f3d0', roof: '#059669', sign: '#065f46' },
  { wall: '#fef08a', roof: '#eab308', sign: '#854d0e' },
  { wall: '#99f6e4', roof: '#0d9488', sign: '#115e59' },
  { wall: '#e9d5ff', roof: '#9333ea', sign: '#6b21a8' },
  { wall: '#fda4af', roof: '#f43f5e', sign: '#881337' },
  { wall: '#bfdbfe', roof: '#2563eb', sign: '#1e3a8a' },
];

/**
 * Deterministic, distinct-per-world building style. `world` shifts the start
 * index so each world looks different; the step is coprime to the pool size
 * so the `k`-th building in a world gets a unique model + colour (no repeats
 * within a world, ≤9 buildings ≤ 14 variants). Stable: same world+slot →
 * same look every visit.
 */
function worldBuildingStyle(world: number, k: number) {
  const v = BUILDING_VARIANTS.length; // 9
  const c = BUILDING_COLORS.length; // 14
  // Steps are coprime to the pool sizes (2↔9, 3↔14) so the k-th building in
  // a world always gets a DISTINCT model + colour (no repeats within a world);
  // the per-world offset rotates the assignment so each world looks different.
  const buildingId = BUILDING_VARIANTS[((world * 5) + k * 2) % v];
  const color = BUILDING_COLORS[((world * 7) + k * 3) % c];
  return { buildingId, ...color };
}

function mergeWorldIntoShops(
  base: ShopDef[],
  buildings: WorldBuilding[] | null,
  playerShopName?: string,
  currentWorld = 1,
): ShopDef[] {
  // Assign each non-player building in this world a slot index `k` (ordered
  // by grid position) so the style helper can hand out distinct models.
  const otherPositions = (buildings ?? [])
    .filter((x) => !x.isYourShop)
    .map((x) => x.position)
    .sort((a, z) => a - z);

  return base.map((s, idx) => {
    const position = idx + 1;
    const b = buildings?.find((x) => x.position === position) ?? null;

    // No live data for this cell — keep the static template untouched. In
    // the home world that leaves your placeholder shop in the centre before
    // the feed lands; surrounding cells keep their demo placeholders.
    if (!b) {
      return {
        ...s,
        name: s.isPlayer && playerShopName ? playerShopName : s.name,
        isOtherUser: false,
        worldUserId: undefined,
        ownerName: undefined,
        slug: undefined,
        level: undefined,
        rating: undefined,
        shopImage: undefined,
      };
    }

    // Your own shop — only ever in the home world's centre. Keep geometry +
    // the player treatment (gold pill, shop bubble, Enter menu).
    if (b.isYourShop) {
      return {
        ...s,
        isPlayer: true,
        name: playerShopName || b.shopName || s.name,
        isOtherUser: false,
        worldUserId: b.userId,
        ownerName: undefined,
        slug: b.slug ?? undefined,
        level: undefined,
        rating: undefined,
        shopImage: undefined,
      };
    }

    // Another player's shop. In non-home worlds this can be the CENTRE cell,
    // so we explicitly clear isPlayer — the centre building takes on the other
    // user's identity (name, image, preview card). The building model + colours
    // are re-rolled per world so each world looks visually distinct and no two
    // buildings in a world share a model.
    const k = Math.max(0, otherPositions.indexOf(position));
    const style = worldBuildingStyle(currentWorld, k);
    return {
      ...s,
      isPlayer: false,
      name: b.shopName,
      buildingId: style.buildingId,
      wallColor: style.wall,
      roofColor: style.roof,
      signColor: style.sign,
      isOtherUser: true,
      worldUserId: b.userId,
      ownerName: b.ownerName,
      slug: b.slug ?? undefined,
      level: b.level,
      rating: b.rating,
      shopImage: getShopImageUrl(b.image),
    };
  });
}

export function IsoScene({
  onReady,
  playerShopImage,
  playerShopName,
  keeperName,
  stats: statsProp,
  npcCount,
  onDockAction,
  onTokensClick,
  playerInteriorLayout,
  onInteriorChange,
  shopProgress,
  onShopEarnCoins,
  onShopEarnXp,
  onShopEarnTokens,
  onShopNavigate,
  enterPlayerInterior,
  shopCategory,
  worldsEnabled,
}: IsoSceneProps) {
  const navigate = useNavigate();
  // Mutable shop positions so "Move" actually relocates a building on the map.
  const [shops, setShops] = useState<ShopDef[]>(() =>
    SHOPS.map((s) => ({
      ...s,
      // Override the player shop's name with the real one from props.
      name: s.isPlayer && playerShopName ? playerShopName : s.name,
    })),
  );
  const [mode, setMode] = useState<Mode>({ kind: 'city' });
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const readyFired = useRef(false);

  // ── Multi-user worlds ────────────────────────────────────────────
  // `worldBuildings` is the live feed overlaid onto the SHOPS template;
  // null until the first fetch resolves (or when worlds are disabled, in
  // which case the static placeholder city stays).
  const [worldBuildings, setWorldBuildings] = useState<WorldBuilding[] | null>(null);
  const [currentWorld, setCurrentWorld] = useState(1);
  const [totalWorlds, setTotalWorlds] = useState(1);
  const [worldTransitioning, setWorldTransitioning] = useState(false);
  const [pendingWorld, setPendingWorld] = useState(1);
  const worldLoadedRef = useRef(false);

  // Initial world fetch (world 1) once, when the feature is enabled.
  useEffect(() => {
    if (!worldsEnabled || worldLoadedRef.current) return;
    worldLoadedRef.current = true;
    let cancelled = false;
    fetchWorld(1)
      .then((res) => {
        if (cancelled || !res?.buildings) return;
        setWorldBuildings(res.buildings);
        setCurrentWorld(res.currentWorld);
        setTotalWorlds(res.totalWorlds);
      })
      .catch((err) => {
        // Keep the static placeholder city on failure, but surface why —
        // a 404 here means the backend /aipreneur/worlds routes aren't
        // deployed yet, which is why the Next button stays disabled.
        console.warn('[worlds] initial fetch failed — world nav stays at 1/1:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [worldsEnabled]);

  // Re-derive the on-map shops whenever the live feed (or the player's own
  // shop name) changes. Only active when worlds are enabled; the /demo
  // route leaves `shops` on its static initial value.
  useEffect(() => {
    if (!worldsEnabled) return;
    setShops(mergeWorldIntoShops(SHOPS, worldBuildings, playerShopName, currentWorld));
  }, [worldsEnabled, worldBuildings, playerShopName, currentWorld]);

  // Page to an adjacent world with the cloud / "Loading World…" transition.
  const handleWorldChange = useCallback(
    async (dir: -1 | 1) => {
      if (worldTransitioning) return;
      // Wrap around so the arrows are ALWAYS pressable — past the last
      // world loops back to 1, before the first loops to the last. With a
      // single world this simply reloads world 1 (still plays the cloud
      // transition). The backend clamps the number defensively too.
      let target = currentWorld + dir;
      if (target > totalWorlds) target = 1;
      if (target < 1) target = Math.max(1, totalWorlds);

      setPendingWorld(target);
      setSelectedShopId(null);
      setWorldTransitioning(true);

      // 1) Let the screen darken / cloud over (overlay fades in ~1.4s).
      await wait(1500);
      // 2) Fetch the new world while the screen is covered.
      try {
        const res = await fetchWorld(target);
        if (res?.buildings) {
          setWorldBuildings(res.buildings);
          setCurrentWorld(res.currentWorld);
          setTotalWorlds(res.totalWorlds);
        }
      } catch {
        /* Stay on the current world on failure. */
      }
      // 3) Brief hold on the loading text, then fade out to reveal (~1.4s).
      await wait(700);
      setWorldTransitioning(false);
    },
    [worldTransitioning, currentWorld, totalWorlds],
  );

  // ── HUD stats — real (from props) OR local demo fallback ─────
  // When the parent passes `stats`, we use them directly. Otherwise we
  // fall back to a small local demo state so the anonymous /demo route
  // keeps its self-contained behaviour where module actions visibly
  // bump the on-screen numbers.
  const [localDemoStats, setLocalDemoStats] = useState<DemoStats>({
    tokens: 250,
    popularity: 5,
    coins: 1200,
    streak: 3,
  });
  const stats = statsProp ?? localDemoStats;

  // Currently-open modal view (modules grid, tokens topup, etc.) — null
  // while no modal is open. Driven by the bottom dock buttons.
  const [view, setView] = useState<DemoView>(null);

  const handleCanvasCreated = useCallback(() => {
    // Single shot — the scene is "ready" the moment the Canvas has had its
    // first frame committed.
    requestAnimationFrame(() => {
      if (readyFired.current) return;
      readyFired.current = true;
      onReady?.();
    });
  }, [onReady]);

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === selectedShopId) ?? null,
    [shops, selectedShopId],
  );

  // ── NPC crowd size ──────────────────────────────────────────────
  // Real dashboard passes `npcCount` directly (with onboarding gate +
  // popularity-band formula). The /demo route derives a count locally
  // from its popularity level so the simulator still "feels" alive.
  //
  // Popularity bands (matching the dashboard's formula so /demo and
  // /s/aipreneur scale the same way):
  //   Level 1-2  → 1 NPC      Level 3-7   → 2 NPCs
  //   Level 8-12 → 3 NPCs     Level 13-17 → 4 NPCs   ...
  const npcTotalCount = useMemo(() => {
    if (typeof npcCount === 'number') return Math.max(0, npcCount);
    return npcCountForLevel(stats.popularity);
  }, [npcCount, stats.popularity]);

  const bumpPopularity = useCallback((delta: number) => {
    // Demo-only — only mutates local state when no external stats are
    // wired in. Real dashboard popularity comes from the backend.
    if (statsProp) return;
    setLocalDemoStats((s) => ({
      ...s,
      popularity: Math.max(1, s.popularity + delta),
    }));
  }, [statsProp]);

  // Dock-button handler. When a parent provides `onDockAction` we defer
  // to it (so the live dashboard can navigate to real routes); otherwise
  // we open the demo modal in-place.
  const handleDockAction = useCallback((id: string) => {
    // The 'magic' tile opens the MagicHub picker (Inventory / Invention
    // Lab / Mystery Bazaar). Routed via a window event so we don't
    // thread the hub's open state through this scene or DemoModal.
    if (id === 'magic') {
      window.dispatchEvent(new CustomEvent('open-portal', { detail: 'magic' }));
      return;
    }
    if (onDockAction) {
      onDockAction(id);
      return;
    }
    setView((current) => {
      if (current === id || current?.startsWith(`${id}:`)) return null;
      return id as DemoView;
    });
  }, [onDockAction]);

  // ── Actions ──────────────────────────────────────────────────────
  const handleShopTap = useCallback((shopId: string) => {
    if (mode.kind !== 'city') return;
    setSelectedShopId(shopId);
  }, [mode]);

  const handleEnter = useCallback(() => {
    if (!selectedShop) return;
    setMode({ kind: 'loading', targetShopId: selectedShop.id });
    setSelectedShopId(null);
    // Fake loading delay — gives the user a beat for the transition + makes
    // future server-side scene-loading feel intentional.
    window.setTimeout(() => {
      setMode({ kind: 'interior', shopId: selectedShop.id });
    }, 850);
  }, [selectedShop]);

  const handleStartMove = useCallback(() => {
    if (!selectedShop) return;
    setMode({ kind: 'move', shopId: selectedShop.id, ghostCell: { ...selectedShop.cell } });
  }, [selectedShop]);

  const handleGroundClick = useCallback((x: number, z: number) => {
    if (mode.kind === 'move') {
      const { row, col } = worldToCell(x, z);
      setMode({ kind: 'move', shopId: mode.shopId, ghostCell: { row, col } });
      return;
    }
    // Tapping empty ground in city view closes any open action menu.
    if (selectedShopId) setSelectedShopId(null);
  }, [mode, selectedShopId]);

  const handleConfirmMove = useCallback(() => {
    if (mode.kind !== 'move') return;
    setShops((prev) =>
      prev.map((s) => (s.id === mode.shopId ? { ...s, cell: mode.ghostCell } : s)),
    );
    setMode({ kind: 'city' });
  }, [mode]);

  const handleCancelMove = useCallback(() => {
    setMode({ kind: 'city' });
  }, []);

  const handleLeaveShop = useCallback(() => {
    setMode({ kind: 'city' });
  }, []);

  const inCity = mode.kind === 'city' || mode.kind === 'move';
  const interiorShop = mode.kind === 'interior'
    ? shops.find((s) => s.id === mode.shopId) ?? null
    : null;

  // Notify the parent whenever interior mode toggles so it can hide /
  // show the city-mode GameOverlay (which would otherwise overlap the
  // in-shop mini-game HUD).
  useEffect(() => {
    onInteriorChange?.(mode.kind === 'interior');
  }, [mode.kind, onInteriorChange]);

  // Auto-enter the player's interior when the dashboard signals
  // `enterPlayerInterior` (set on return from a /s/aipreneur/* sub-page
  // that was opened from inside the shop). Runs once on mount.
  const autoEnteredRef = useRef(false);
  useEffect(() => {
    if (!enterPlayerInterior || autoEnteredRef.current) return;
    const player = shops.find((s) => s.isPlayer);
    if (!player) return;
    autoEnteredRef.current = true;
    setMode({ kind: 'interior', shopId: player.id });
  }, [enterPlayerInterior, shops]);

  // Anchor position for the action-menu popover.
  const menuAnchor = useMemo<[number, number, number] | null>(() => {
    if (!selectedShop) return null;
    const [x, , z] = cellToWorld(selectedShop.cell.row, selectedShop.cell.col);
    return [x, 3.4, z];
  }, [selectedShop]);

  // Auto-focus: when the user selects a shop, smoothly pan the camera
  // so the building sits near the centre of the screen. We bias the
  // focus point a bit downward (positive Z = south) so the building +
  // its action menu both fit nicely above the dock. Resetting to null
  // when no shop is selected stops the camera from re-firing.
  const focusTarget = useMemo<[number, number] | null>(() => {
    if (!selectedShop) return null;
    const [x, , z] = cellToWorld(selectedShop.cell.row, selectedShop.cell.col);
    return [x, z + 1.5];
  }, [selectedShop]);

  // Ghost shop (during move mode) — same definition but at ghostCell.
  const ghostShop = useMemo<ShopDef | null>(() => {
    if (mode.kind !== 'move') return null;
    const s = shops.find((x) => x.id === mode.shopId);
    if (!s) return null;
    return { ...s, cell: mode.ghostCell };
  }, [mode, shops]);

  // Player's My Shop — the one with `isPlayer: true`. Anchor sits at
  // the building's roof height. Kenney commercial building 'f' at
  // BUILDING_SCALE 1.9 tops out around y ≈ 2.85 in world coords. The
  // bubble's arrow tail extends a few pixels below this in screen
  // space, so the tip lands at (or just inside) the roof line —
  // making the bubble read as a label glued onto the building rather
  // than a free-floating speech bubble.
  const playerShop = useMemo(() => shops.find((s) => s.isPlayer) ?? null, [shops]);
  const playerShopAnchor = useMemo<[number, number, number] | null>(() => {
    if (!playerShop) return null;
    const [x, , z] = cellToWorld(playerShop.cell.row, playerShop.cell.col);
    return [x, 2.85, z];
  }, [playerShop]);

  return (
    <div
      // Outer div matches the grass colour so any 1-px gap at the canvas
      // edge during scroll bounces stays seamless instead of flashing blue.
      className="relative w-full h-screen overflow-hidden select-none touch-none"
      style={{
        background: '#5fa83e',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Canvas
        orthographic
        // DPR adapts to device tier:
        //   • low  → [0.6, 1.0] : half-fillrate on a 3× retina phone.
        //   • mid  → [0.75, 1.25]
        //   • high → [1, 2]
        // Picked at Canvas-construction; restart the page if the tier
        // changes (rare — only fires on prefers-reduced-motion toggle).
        dpr={getDeviceProfile().dprCap}
        gl={{
          antialias: getDeviceProfile().antialias,
          powerPreference: 'high-performance',
          alpha: false,
          // Disable tonemapping: Kenney GLBs ship their colour in the
          // material/vertex-colours directly. With the default ACES
          // tonemapping + an ambient > 1.0, every standard material clips
          // to white. NoToneMapping renders the authored colour 1:1.
          toneMapping: THREE.NoToneMapping,
        }}
        shadows={getDeviceProfile().shadows}
        // Pause render loop when the tab is hidden (huge battery win on
        // mobile). R3F's "demand" mode requires manual invalidate() calls
        // — we keep "always" while visible because traffic + NPCs are
        // animating; the Page Visibility API zeroes the GPU when hidden.
        frameloop="always"
        onCreated={handleCanvasCreated}
      >
        <VisibilityPause />
        {/*
         * Background colour switches with the scene state:
         *   • city / move / loading → grass green (matches the wide
         *     ground plane behind the tile grid).
         *   • interior              → soft dark slate (the "outside" of
         *     the shop — what the player would see past the cutaway
         *     wall in a Sims-style room view).
         * Without this, the user could pan far enough to see the
         * Three.js default black or our previous sky-blue, which broke
         * the illusion of a contiguous map.
         */}
        <color
          attach="background"
          args={[mode.kind === 'interior' ? '#141029' : '#5fa83e']}
        />
        {/* Lighting rig:
         *   • ambient ~0.7 lifts the shadow side just enough that the GLB
         *     base colour reads. Anything higher washes out the Kenney
         *     vertex colours into a uniform white.
         *   • hemisphere bounce adds a soft sky/ground tint so iso buildings
         *     don't look flat.
         *   • directional sits high+side so roofs are slightly brighter
         *     than walls, giving the city its dimetric "lit-from-above" feel.
         */}
        <ambientLight intensity={0.7} />
        <hemisphereLight args={['#fff7d1', '#3a6b22', 0.35]} />
        <directionalLight position={[12, 18, 8]} intensity={0.9} color="#fff8e0" />

        {inCity && (
          /* City view zoom: the map is ~38×30 world units. With minZoom=14
             a 1280-px canvas shows ~91 world units across — comfortably
             the whole city plus margin. initialZoom=26 centres us on
             the map with the central row of shops in clear focus.
             `focusOn` smoothly pans the camera to whatever shop the user
             has selected, so its action menu lands near the centre. */
          <CameraRig
            panEnabled
            bounds={CITY_PAN_BOUNDS}
            minZoom={14}
            maxZoom={90}
            initialZoom={26}
            focusOn={focusTarget}
          />
        )}
        {mode.kind === 'interior' && (
          /* Interior zoom: the room is 16×12, smaller than the city. We
             want a tighter min so the user can't dolly so far back that
             they lose context. */
          <CameraRig
            key="interior-cam"
            panEnabled
            bounds={INTERIOR_PAN_BOUNDS}
            initial={[0, 0, 0]}
            minZoom={30}
            maxZoom={110}
            initialZoom={50}
          />
        )}

        {/* City / interior are STRICTLY mutually exclusive — using a
         *  single ternary instead of two side-by-side conditionals means
         *  React fully unmounts the inactive scene tree rather than
         *  leaving any of its meshes (cars, buildings, grass) on screen
         *  while the other is rendering. Each branch lives inside its own
         *  Suspense so a slow GLB in one mode can't blank the other. */}
        {mode.kind === 'interior' && interiorShop ? (
          <Suspense key="interior-tree" fallback={null}>
            <IsoShopInterior
              shop={interiorShop}
              // Only the player's own shop reads from the saved layout —
              // other shops keep their hand-tuned default arrangement.
              layout={interiorShop.isPlayer ? playerInteriorLayout : undefined}
              // The player's own shop runs the live work simulation (Wei +
              // customer queue + collision); visited shops stay ambient.
              liveSim={interiorShop.isPlayer === true}
              keeperName={interiorShop.isPlayer ? keeperName : undefined}
            />
          </Suspense>
        ) : mode.kind === 'loading' ? null : (
          <Suspense key="city-tree" fallback={null}>
            {/* Textured grass plane behind the tile grid — procedural
                canvas texture tiled 40× across a 400×400 plane. */}
            <GrassGround />
            {/* 3D tufts scattered across the grass tiles + outer plane. */}
            <GrassDetail />
            <IsoCity />
            {/* Real Kenney road GLBs + streetlamps + trees + parked
                cars + cones. Replaces the box-tile roads. */}
            <CityProps />
            <GroundPicker onGroundClick={handleGroundClick} />
            {/* NPC density follows the player's popularity stat AND a
                baseline of "at least one walker per path" so the
                expanded city never reads as empty. The expanded map has
                9 paths (downtown 5 + outer ring 4) so we floor at
                paths.length to guarantee every road has a body on it. */}
            <IsoNPCSwarm
              paths={NPC_PATHS}
              count={Math.max(npcTotalCount, NPC_PATHS.length)}
            />

            {shops.map((shop) => {
              if (mode.kind === 'move' && shop.id === mode.shopId) return null;
              // Hide the player shop's in-world gold pill when we're
              // going to render the richer PlayerShopBubble (which IS
              // the label) directly over the building.
              const suppressLabel = !!playerShopImage && shop.isPlayer === true;
              return (
                <IsoShop
                  key={shop.id}
                  shop={shop}
                  selected={selectedShopId === shop.id}
                  onTap={() => handleShopTap(shop.id)}
                  suppressLabel={suppressLabel}
                />
              );
            })}

            {ghostShop && <IsoShop shop={ghostShop} moveMode />}

            {/* Action menu — player shop hides "Move", uses gold theme.
                Other players' shops (live worlds) skip this and open the
                read-only preview card overlay instead. */}
            {selectedShop && menuAnchor && mode.kind === 'city' && !selectedShop.isOtherUser && (
              <ShopActionMenu
                anchor={menuAnchor}
                title={selectedShop.name}
                onEnter={handleEnter}
                onMove={selectedShop.isPlayer ? undefined : handleStartMove}
                onClose={() => setSelectedShopId(null)}
                isPlayer={selectedShop.isPlayer}
              />
            )}

            {/* Initial popout bubble — shows the AI-generated shop
             *  image floating above My Shop. Visible only in city
             *  mode + when the user hasn't currently selected the
             *  player shop (the action menu replaces it on tap).
             *  Skipped entirely on the public /demo route where
             *  `playerShopImage` is undefined. */}
            {playerShopImage && playerShop && playerShopAnchor && mode.kind === 'city' && selectedShopId !== playerShop.id && (
              <PlayerShopBubble
                anchor={playerShopAnchor}
                shopImageUrl={playerShopImage}
                shopName={playerShop.name}
                visible
              />
            )}
          </Suspense>
        )}
      </Canvas>

      {/* ── Move-mode confirmation strip ─────────────────────────── */}
      <AnimatePresence>
        {mode.kind === 'move' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur text-white shadow-lg"
            style={{ bottom: 'max(env(safe-area-inset-bottom), 96px)' }}
          >
            <span className="text-sm font-semibold">Tap a tile to move</span>
            <button
              type="button"
              onClick={handleConfirmMove}
              aria-label="Confirm move"
              className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-transform touch-manipulation"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleCancelMove}
              aria-label="Cancel move"
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center active:bg-white/20 active:scale-95 transition-all touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Interior view: top shop-name pill ─────────────────────
          Only shown for OTHER players' shops. The player's own shop
          already gets a gradient signboard from ShopMiniGame, so we
          skip this label to avoid the duplicate stack that bled into
          the mini-game HUD. */}
      <AnimatePresence>
        {mode.kind === 'interior' && interiorShop && !interiorShop.isPlayer && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-slate-900/85 backdrop-blur text-white shadow-lg"
            style={{ top: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <span className="text-sm font-bold">{interiorShop.name}</span>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Interactive shop mini-game — only inside the player's own shop.
          Adds NPC customers, tasks, achievements, and reward feedback as
          a 2D overlay on top of the 3D interior. Local state persisted
          per shop in localStorage; pure presentation otherwise so the
          backend can wire in real coin/XP writes later. */}
      {mode.kind === 'interior' && interiorShop?.isPlayer && (
        <ShopMiniGame
          key={interiorShop.id}
          shopId={interiorShop.id}
          shopName={playerShopName ?? interiorShop.name}
          progress={shopProgress}
          coins={stats.coins}
          onEarnCoins={onShopEarnCoins}
          onEarnXp={onShopEarnXp}
          onEarnTokens={onShopEarnTokens}
          onNavigate={onShopNavigate}
          // Effective shop type — layout-driven flavor detection
          // overrides the saved passion_category so applying any themed
          // preset (supermarket / arcade / restaurant / factory)
          // immediately gives kids a matching product pool, even for
          // accounts whose stored category hasn't been swapped yet.
          shopCategory={(() => {
            const flavor = playerInteriorLayout ? detectShopFlavor(playerInteriorLayout) : null;
            // Map detected flavor onto the passion_category id used by
            // PRODUCT_POOLS — arcade flavor → 'themepark' category.
            if (flavor === 'supermarket') return 'supermarket';
            if (flavor === 'arcade')      return 'themepark';
            if (flavor === 'restaurant')  return 'restaurant';
            if (flavor === 'factory')     return 'factory';
            return shopCategory ?? null;
          })()}
        />
      )}

      {/* For non-player shops keep a plain Leave pill at the top —
          they don't get a Decorate option since you can't decorate
          someone else's shop. */}
      <AnimatePresence>
        {mode.kind === 'interior' && interiorShop && !interiorShop.isPlayer && (
          <motion.button
            type="button"
            onClick={handleLeaveShop}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed right-3 z-30 min-h-[40px] px-3 rounded-full bg-slate-900/85 backdrop-blur text-white text-xs font-semibold active:bg-slate-800 active:scale-95 transition-all touch-manipulation shadow-lg"
            style={{ top: 'max(env(safe-area-inset-top), 12px)' }}
          >
            Leave shop
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Loading overlay between city and interior ─────────────── */}
      <AnimatePresence>
        {mode.kind === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 to-slate-700 text-white flex flex-col items-center justify-center"
          >
            <Loader2 className="w-10 h-10 animate-spin text-white/90" />
            <p className="mt-4 text-base font-bold">Entering shop…</p>
            <p className="mt-1 text-xs text-white/60">
              {shops.find((s) => mode.kind === 'loading' && s.id === mode.targetShopId)?.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── World navigation (left / right arrows + indicator) ───────
          Only in live-worlds mode while standing in the city. Arrows are
          edge-centred so they stay clear of the HUD, settings gear, and
          learning hub. Disabled at the first / last world. */}
      {worldsEnabled && mode.kind === 'city' && !worldTransitioning && (
        <>
          <button
            type="button"
            onClick={() => handleWorldChange(-1)}
            aria-label="Previous world"
            style={{ touchAction: 'manipulation' }}
            className="fixed left-3 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center shadow-lg hover:bg-slate-800/80 active:scale-95 transition touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => handleWorldChange(1)}
            aria-label="Next world"
            style={{ touchAction: 'manipulation' }}
            className="fixed right-3 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-full bg-slate-900/70 backdrop-blur text-white flex items-center justify-center shadow-lg hover:bg-slate-800/80 active:scale-95 transition touch-manipulation"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* "World X of Y" pill, top-centre below the status HUD. */}
          <div
            className="fixed left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-slate-900/70 backdrop-blur text-white text-xs font-bold shadow-lg flex items-center gap-1.5"
            style={{ top: 'calc(max(env(safe-area-inset-top), 12px) + 64px)' }}
          >
            <span aria-hidden>🌐</span>
            World {currentWorld} of {totalWorlds}
          </div>
        </>
      )}

      {/* ── Other player's shop — read-only preview card ───────────── */}
      <AnimatePresence>
        {mode.kind === 'city' && selectedShop?.isOtherUser && (
          <WorldShopPreview
            key={selectedShop.id}
            shopName={selectedShop.name}
            ownerName={selectedShop.ownerName}
            level={selectedShop.level}
            rating={selectedShop.rating}
            image={selectedShop.shopImage}
            slug={selectedShop.slug}
            onClose={() => setSelectedShopId(null)}
            onVisit={() => {
              if (selectedShop.slug) navigate(`/shop/${selectedShop.slug}`);
            }}
          />
        )}
      </AnimatePresence>

      {/* ── World transition — rolling clouds + "Loading World…" ───── */}
      <AnimatePresence>
        {worldTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white overflow-hidden"
            style={{
              background:
                'linear-gradient(160deg, #1e293b 0%, #0b1120 60%, #020617 100%)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          >
            {/* Drifting cloud puffs — large blurred radial blobs sliding
                across the screen in alternating directions so the world
                visibly "clouds over" during the swap. */}
            {WORLD_CLOUDS.map((c, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  top: c.top,
                  width: c.size,
                  height: c.size * 0.55,
                  opacity: c.opacity,
                  filter: 'blur(40px)',
                  background:
                    'radial-gradient(closest-side, rgba(226,232,240,0.95), rgba(226,232,240,0))',
                }}
                initial={{ x: c.from }}
                animate={{ x: c.to }}
                transition={{
                  duration: c.dur,
                  delay: c.delay,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'linear',
                }}
              />
            ))}

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="relative flex flex-col items-center"
            >
              <Loader2 className="w-12 h-12 animate-spin text-white/90" />
              <p className="mt-5 text-lg font-extrabold tracking-wide drop-shadow">🌐 Loading World…</p>
              <p className="mt-1 text-sm text-white/70 drop-shadow">World {pendingWorld}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top status HUD (tokens / popularity / coins / day) ───── */}
      {/* Hidden during interior/loading — interior has its own top
          "Leave shop" pill, no need to stack a second bar. */}
      <DemoHUD
        stats={stats}
        visible={mode.kind === 'city' || mode.kind === 'move'}
        onTokensClick={onTokensClick ?? (() => setView('tokens'))}
      />

      {/* ── Demo modal — routes the 5 dock buttons to their content ── */}
      <DemoModal
        view={view}
        onClose={() => setView(null)}
        onChangeView={setView}
        stats={stats}
        onBumpPopularity={bumpPopularity}
      />

      {/* ── Bottom navigation (TikTok-style) ───────────────────────
          Five-slot dock: Modules · Tokens · [WORLD MAP] · Magic · Profile.
          The centre button is a featured TikTok-"+"-shaped tile that
          opens the live world map. While the player is already on the
          city, it renders muted so the row still reads as a 5-tile set
          (no layout jump) but doesn't tease an action that's a no-op. */}
      {mode.kind !== 'move' && mode.kind !== 'loading' && (
        <WorldDock
          items={onDockAction ? LIVE_DOCK_ITEMS : DEFAULT_WORLD_DOCK_ITEMS}
          activeId={
            // Live nav routes away from this scene, so no persistent
            // highlight; the demo dock highlights the open DemoModal view.
            onDockAction
              ? null
              : view === null
                ? null
                : view.startsWith('module')
                  ? 'modules'
                  : view
          }
          onAction={handleDockAction}
          worldMapState={mode.kind === 'interior' ? 'idle' : 'muted'}
          onWorldMap={() => {
            if (mode.kind === 'interior') handleLeaveShop();
          }}
        />
      )}

      {/* Learning Hub — bottom-right corner FAB above the dock. Always
          visible alongside the WorldDock (same `mode.kind` gating so it
          hides during move + loading transitions). Opens a sheet with
          the 5 business-learning modules; tapping any tile navigates
          to the matching /s/aipreneur/* route. */}
      {mode.kind !== 'move' && mode.kind !== 'loading' && (
        <LearningHub
          onNavigate={(route) => {
            if (onShopNavigate) onShopNavigate(route);
            else navigate(`/demo/${route}`);
          }}
        />
      )}

      {/* Always-visible Settings gear at TOP-RIGHT. Routes to the same
          Profile / Analytics / Token Log / Settings destinations the
          MORE → ⚙ sheet does, but reachable in one tap from anywhere in
          the iso world. Hidden during move/loading like LearningHub. */}
      {mode.kind !== 'move' && mode.kind !== 'loading' && <SettingsHub />}
    </div>
  );
}

export default IsoScene;
