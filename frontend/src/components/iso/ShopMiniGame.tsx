/**
 * ShopMiniGame — playable customer-service mini-game that runs inside
 * the player's shop interior.
 *
 * Design intent (per the kids-9–12 queue/wave brief):
 *
 *   1. Customers (NPCs) WALK IN from the right edge of the screen and
 *      take a position in a visible queue line. Only the customer at
 *      the FRONT of the queue (next to the counter icon on the left)
 *      is the "active" one the player can serve.
 *
 *      State machine per customer:
 *          entering → waiting (in queue) → ordering (front of queue)
 *          ordering → served → leaving (happy walk-off)
 *          ordering → angry → leaving (unhappy walk-off)
 *
 *      `framer-motion`'s `layout` prop animates the slide-forward when
 *      the active customer is served and everyone behind moves up.
 *
 *   2. Wave system. Each wave has a target number of customers to
 *      serve. Difficulty ramps:
 *          - faster spawn cadence
 *          - shorter patience
 *          - more customers per wave
 *      Hitting the target → "Wave Complete!" banner + bonus reward,
 *      then a short breather, then the next wave starts.
 *      Letting too many leave angry → "Wave Failed" banner, the wave
 *      restarts with progress reset (XP/level kept).
 *
 *   3. Daily tasks + lifetime achievements unchanged from the prior
 *      version — they layer on top of the wave loop.
 *
 * Persistence:
 *   `shop_game_state_<id>`        — today's HUD + per-wave progress
 *   `shop_game_achievements_<id>` — unlocked achievement ids (forever)
 *   `shop_game_lifetime_<id>`     — lifetime stats (forever)
 *
 * Positioning safety:
 *   Root container is `pointer-events-none`; cards opt back in. Layout
 *   avoids the IsoShopFab (bottom-right), MobileDock, and the leave
 *   pill (top-right on non-player shops).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Smile,
  Star,
  Coins,
  Zap,
  CheckCircle2,
  ListChecks,
  X,
  Sparkles,
  Award,
  Store,
} from 'lucide-react';
import { BTN_3D_PRIMARY, BTN_3D_SECONDARY } from '../../lib/uiTokens';
import { DockTile } from './DockTile';

// ─── Types ────────────────────────────────────────────────────────────

type CustomerState = 'entering' | 'waiting' | 'ordering' | 'served' | 'angry' | 'leaving';

/** Variant catalogue — 8 customer archetypes with different stats so
 *  the queue feels varied. Picked at spawn time. */
type CustomerVariantId =
  | 'kid' | 'astronaut' | 'gamer' | 'pinkhair'
  | 'vip' | 'impatient' | 'curious' | 'bigspender';

interface CustomerVariant {
  id: CustomerVariantId;
  label: string;          // shown above the name on the card
  avatar: string;         // emoji
  /** Multiplies the wave-config patience. 0.6 = very impatient. */
  patienceMul: number;
  /** Multiplies XP + coin reward on serve. */
  rewardMul: number;
  /** Lower = rarer. Weights are relative, not %. */
  weight: number;
  /** Reaction emoji shown above the avatar when served happy/fast. */
  happyEmoji: string;
  /** Optional accent ring colour (matches a tailwind hex token). */
  ringHex: string;
}

const CUSTOMER_VARIANTS: CustomerVariant[] = [
  { id: 'kid',         label: 'Regular',     avatar: '🧒', patienceMul: 1.0, rewardMul: 1.0, weight: 28, happyEmoji: '😄', ringHex: '#cbd5e1' },
  { id: 'astronaut',   label: 'Astronaut',   avatar: '👨‍🚀', patienceMul: 1.2, rewardMul: 1.3, weight: 10, happyEmoji: '🚀', ringHex: '#60a5fa' },
  { id: 'gamer',       label: 'Gamer',       avatar: '🎮', patienceMul: 0.9, rewardMul: 1.1, weight: 14, happyEmoji: '🎉', ringHex: '#a78bfa' },
  { id: 'pinkhair',    label: 'Trendy',      avatar: '👩‍🎤', patienceMul: 1.1, rewardMul: 1.0, weight: 12, happyEmoji: '💖', ringHex: '#f472b6' },
  { id: 'vip',         label: 'VIP',         avatar: '👑', patienceMul: 0.8, rewardMul: 2.0, weight: 5,  happyEmoji: '⭐',  ringHex: '#facc15' },
  { id: 'impatient',   label: 'Impatient',   avatar: '😤', patienceMul: 0.6, rewardMul: 0.9, weight: 10, happyEmoji: '😅', ringHex: '#fb7185' },
  { id: 'curious',     label: 'Curious',     avatar: '🧐', patienceMul: 1.4, rewardMul: 1.0, weight: 12, happyEmoji: '✨', ringHex: '#34d399' },
  { id: 'bigspender',  label: 'Big Spender', avatar: '🤑', patienceMul: 1.0, rewardMul: 3.0, weight: 4,  happyEmoji: '💰', ringHex: '#fbbf24' },
];

/** Pick a variant using weighted random. */
function pickVariant(): CustomerVariant {
  const total = CUSTOMER_VARIANTS.reduce((a, v) => a + v.weight, 0);
  let r = Math.random() * total;
  for (const v of CUSTOMER_VARIANTS) {
    r -= v.weight;
    if (r <= 0) return v;
  }
  return CUSTOMER_VARIANTS[0];
}

interface Reaction {
  id: string;
  emoji: string;
  /** Birth time in performance.now() */
  bornAt: number;
}

interface Customer {
  id: string;
  /** Queue index visible to the player ("#3"). Reassigned when the
   *  queue shifts so labels stay stable per-position. */
  ticket: number;
  name: string;
  variant: CustomerVariant;
  wants: { emoji: string; label: string };
  /** Pre-built, shop-themed order line shown in the speech bubble. */
  question: string;
  state: CustomerState;
  /** Time `state === 'ordering'` began — patience timer reference. */
  orderingStartedAt: number | null;
  /** ms of patience for THIS customer (set when they start ordering). */
  patienceMs: number;
  /** Result for the leaving-out animation: happy=lime, angry=rose. */
  result?: 'happy' | 'neutral' | 'angry';
  /** Ephemeral emoji popups that float above the avatar (entering,
   *  waiting, ordering, etc). Auto-pruned after a few seconds. */
  reactions: Reaction[];
}

interface GameState {
  day: string;
  xp: number;
  level: number;
  happiness: number;
  rating: number;
  /** 0–100 popularity. Drives spawn rate inside the shop and is
   *  pushed up by fast serves / down by misses, plus a slow regression
   *  to a midpoint so it never bottoms out forever. */
  popularity: number;
  servedToday: number;
  ignoredToday: number;
  /** Wave number, 1-indexed. */
  wave: number;
  /** Customers served IN THIS WAVE so far. */
  waveServed: number;
  /** Angry customers IN THIS WAVE so far. */
  waveAngry: number;
  taskProgress: Record<string, number>;
  pendingToasts: Toast[];
}

/** Real-progress flags fed from AIpreneurDashboard so missions reflect
 *  the student's actual state on the live AIpreneur modules. */
export interface ShopProgressFlags {
  hasProduct: boolean;
  hasStaff: boolean;
  hasDecor: boolean;
  hasMarketing: boolean;
  hasInnovation: boolean;
  hasCSR: boolean;
  shopLaunched: boolean;
}

/** Each mission maps a step in the real AIpreneur module flow to a
 *  visible quest the player can tap. `route` is appended to
 *  `/s/aipreneur/` by the host page so we never hard-code a wrong
 *  path here. `done` is derived from the live ShopProgressFlags. */
interface MissionDef {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  /** Suffix appended to `/s/aipreneur/`. */
  route: string;
  done: (p: ShopProgressFlags) => boolean;
}

const MISSIONS: MissionDef[] = [
  { id: 'product',     title: 'Create your first product', hint: 'Brainstorm with AI and price it.',           emoji: '🛒', route: 'product',     done: (p) => p.hasProduct },
  { id: 'operation',   title: 'Hire your first helper',    hint: 'Add staff so customers get served fast.',    emoji: '👨‍🍳', route: 'operation',   done: (p) => p.hasStaff },
  { id: 'decorate',    title: 'Decorate your shop',        hint: 'Pick a floor, wall, or shelf style.',        emoji: '🪴', route: 'decorate',    done: (p) => p.hasDecor },
  { id: 'marketing',   title: 'Launch a marketing poster', hint: 'Draft a campaign, raise popularity.',         emoji: '📣', route: 'marketing',   done: (p) => p.hasMarketing },
  { id: 'innovation',  title: 'Unlock a tech upgrade',     hint: 'Research new categories + shop sizes.',      emoji: '💡', route: 'innovation',  done: (p) => p.hasInnovation },
  { id: 'csr',         title: 'Do a kindness action',      hint: 'Donate or run a community event.',           emoji: '💝', route: 'csr',         done: (p) => p.hasCSR },
  { id: 'finance',     title: 'Check today’s profit',  hint: 'Read the cards in the Finance module.',      emoji: '💰', route: 'finance',     done: () => false },
  { id: 'analytics',   title: 'Review your shop analytics', hint: 'See visitors, sales, and ratings.',          emoji: '📊', route: 'analytics',   done: () => false },
  { id: 'rewards',     title: 'Claim your reward',         hint: 'Trade tokens for cool unlocks.',             emoji: '🎁', route: 'rewards',     done: () => false },
];

// Station hotspots were moved into the unified IsoShopFab action menu
// (the "Stations" group) where their definitions now live, so the
// duplicate list here was removed.

interface Toast {
  id: string;
  emoji: string;
  text: string;
  tint: 'good' | 'bad' | 'reward';
}

interface LifetimeStats {
  totalServed: number;
  highestHappiness: number;
  highestWave: number;
  visitedInterior: boolean;
  /** Live progress flags forwarded from the host page so an
   *  achievement can unlock as soon as the student completes a real
   *  module action, even if it happened outside the mini-game. */
  realFlags: ShopProgressFlags;
}

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (s: GameState, lifetime: LifetimeStats) => boolean;
}

interface TaskDef {
  id: string;
  title: string;
  target: number;
  emoji: string;
  reward: { xp: number; coins: number };
}

// ─── Static config ────────────────────────────────────────────────────

type ProductItem = { emoji: string; label: string };

/** Per-shop-type product pools so customers ask for items that match the
 *  shop. Keyed by the onboarding `passion_category` ids (cafe, factory,
 *  themepark, fashion, gym, restaurant, supermarket). A supermarket's
 *  customers ask for groceries, a gym's ask for protein + gear, etc. —
 *  never an off-theme item. */
const PRODUCT_POOLS: Record<string, ProductItem[]> = {
  cafe: [
    { emoji: '☕', label: 'hot latte' },
    { emoji: '🧋', label: 'bubble tea' },
    { emoji: '🥐', label: 'croissant' },
    { emoji: '🍰', label: 'slice of cake' },
    { emoji: '🍪', label: 'cookie' },
    { emoji: '🍩', label: 'donut' },
    { emoji: '🥪', label: 'sandwich' },
    { emoji: '🍵', label: 'matcha latte' },
  ],
  factory: [
    { emoji: '📦', label: 'shipping box' },
    { emoji: '🔩', label: 'gear set' },
    { emoji: '🔧', label: 'tool kit' },
    { emoji: '⚙️', label: 'engine part' },
    { emoji: '🪛', label: 'screwdriver' },
    { emoji: '🤖', label: 'robot kit' },
    { emoji: '🧱', label: 'building block' },
    { emoji: '🏭', label: 'factory pack' },
  ],
  themepark: [
    { emoji: '🎢', label: 'ride ticket' },
    { emoji: '🎡', label: 'ferris pass' },
    { emoji: '🍭', label: 'lollipop' },
    { emoji: '🍿', label: 'popcorn' },
    { emoji: '🎈', label: 'balloon' },
    { emoji: '🧸', label: 'plush prize' },
    { emoji: '🎁', label: 'goodie bag' },
    { emoji: '🎟️', label: 'park ticket' },
  ],
  fashion: [
    { emoji: '👕', label: 't-shirt' },
    { emoji: '👗', label: 'dress' },
    { emoji: '👖', label: 'jeans' },
    { emoji: '🧥', label: 'jacket' },
    { emoji: '👟', label: 'sneakers' },
    { emoji: '🧢', label: 'cap' },
    { emoji: '👜', label: 'handbag' },
    { emoji: '🕶️', label: 'sunglasses' },
  ],
  gym: [
    { emoji: '🏋️', label: 'dumbbells' },
    { emoji: '🧘', label: 'yoga mat' },
    { emoji: '💪', label: 'protein shake' },
    { emoji: '🥤', label: 'sports drink' },
    { emoji: '⚡', label: 'energy bar' },
    { emoji: '🥊', label: 'boxing gloves' },
    { emoji: '🚴', label: 'spin pass' },
    { emoji: '🏃', label: 'training plan' },
  ],
  restaurant: [
    { emoji: '🍔', label: 'cheese burger' },
    { emoji: '🍕', label: 'pizza slice' },
    { emoji: '🍝', label: 'pasta bowl' },
    { emoji: '🍜', label: 'noodle soup' },
    { emoji: '🍱', label: 'bento box' },
    { emoji: '🥗', label: 'fresh salad' },
    { emoji: '🍣', label: 'sushi roll' },
    { emoji: '🌮', label: 'taco plate' },
  ],
  supermarket: [
    { emoji: '🍎', label: 'fresh apples' },
    { emoji: '🥖', label: 'baguette' },
    { emoji: '🥛', label: 'milk carton' },
    { emoji: '🥚', label: 'egg dozen' },
    { emoji: '🧀', label: 'cheese block' },
    { emoji: '🍌', label: 'banana bunch' },
    { emoji: '🧴', label: 'shampoo' },
    { emoji: '🧻', label: 'paper towels' },
    { emoji: '🍞', label: 'loaf of bread' },
    { emoji: '🥫', label: 'soup can' },
  ],
};

// Fallback mixed pool for shops with no/unknown category.
const DEFAULT_POOL: ProductItem[] = [
  { emoji: '🧁', label: 'cupcake' },
  { emoji: '🧃', label: 'juice box' },
  { emoji: '🍦', label: 'ice cream' },
  { emoji: '🍩', label: 'donut' },
  { emoji: '🍪', label: 'cookie' },
  { emoji: '🥤', label: 'bubble tea' },
  { emoji: '🍰', label: 'slice of cake' },
  { emoji: '🎮', label: 'toy' },
];

const resolveProductPool = (category?: string | null): ProductItem[] =>
  (category && PRODUCT_POOLS[category]) || DEFAULT_POOL;

/** Kid-friendly order phrasings. `%s` is replaced by the item label. */
const ORDER_PHRASES = [
  'Got a %s?',
  'One %s, please!',
  'Can I get a %s?',
  'I’d love a %s!',
  'Do you have a %s?',
  'A %s for me!',
];
const orderPhrase = (label: string) =>
  pick(ORDER_PHRASES).replace('%s', label);

const CUSTOMER_NAMES = [
  'Mia', 'Leo', 'Aria', 'Kai', 'Zoe', 'Finn', 'Luna', 'Eli',
  'Noor', 'Theo', 'Yara', 'Rex', 'Iris', 'Jude', 'Sana', 'Nico',
  'Maya', 'Otto', 'Pia', 'Quin',
];

const CUSTOMER_AVATARS = ['👧', '👦', '🧒', '👩‍🦱', '👨‍🦱', '👩‍🎤', '👨‍🚀', '👵', '👴', '🧑'];

const TASKS: TaskDef[] = [
  { id: 'serve3',  title: 'Serve 3 customers',         target: 3,  emoji: '🤝', reward: { xp: 30, coins: 20 } },
  { id: 'serve10', title: 'Serve 10 customers',        target: 10, emoji: '🛍️', reward: { xp: 80, coins: 60 } },
  { id: 'happy80', title: 'Keep happiness above 80%',  target: 1,  emoji: '😊', reward: { xp: 25, coins: 15 } },
  { id: 'restock', title: 'Restock the shelf',         target: 1,  emoji: '📦', reward: { xp: 20, coins: 10 } },
  { id: 'chest',   title: 'Open the reward chest',     target: 1,  emoji: '🎁', reward: { xp: 30, coins: 40 } },
];

/**
 * Achievement definitions. Some unlock from gameplay (queue mini-game),
 * others unlock from REAL site progress (product created, marketing
 * launched, etc.) so the trophy case maps cleanly to the broader
 * AIpreneur journey. The `checkProgress` arg is passed by the component
 * — it's the live data passed in via props.
 */
const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'shop-starter',  title: 'Shop Starter',         description: 'Step into your shop for the first time.',  emoji: '🏪', check: (_s, l) => l.visitedInterior },
  { id: 'first-sale',    title: 'First Sale',           description: 'Serve your very first customer.',           emoji: '💸', check: (_s, l) => l.totalServed >= 1 },
  { id: 'five-happy',    title: '5 Happy Customers',    description: 'Serve 5 customers in a row.',               emoji: '🥳', check: (_s, l) => l.totalServed >= 5 },
  { id: 'queue-master',  title: 'Queue Master',         description: 'Serve 25 customers.',                       emoji: '🗄️', check: (_s, l) => l.totalServed >= 25 },
  { id: 'rush-hour',     title: 'Rush Hour Hero',       description: 'Clear a full wave at Wave 5+.',             emoji: '⏱️', check: (_s, l) => l.highestWave >= 5 },
  { id: 'product-maker', title: 'Product Creator',      description: 'Create your first product (real site).',    emoji: '🎨', check: (_s, l) => l.realFlags.hasProduct },
  { id: 'decor-genius',  title: 'Decorator Genius',     description: 'Customise your shop interior (real site).', emoji: '🪴', check: (_s, l) => l.realFlags.hasDecor },
  { id: 'helper-boss',   title: 'Helper Boss',          description: 'Hire your first helper (real site).',       emoji: '👨‍🍳', check: (_s, l) => l.realFlags.hasStaff },
  { id: 'marketing-star',title: 'Marketing Star',       description: 'Launch your first campaign (real site).',   emoji: '📣', check: (_s, l) => l.realFlags.hasMarketing },
  { id: 'finance-rookie',title: 'Finance Rookie',       description: 'Reach a 4.5 rating in your shop.',          emoji: '📊', check: (s) => s.rating >= 4.5 },
  { id: 'five-star',     title: '5-Star Shop',          description: 'Reach a perfect 5.0 rating.',               emoji: '🌟', check: (s) => s.rating >= 4.95 },
  { id: 'mini-boss',     title: 'Mini Boss Entrepreneur', description: 'Serve 50 + reach a 5.0 rating.',          emoji: '👑', check: (s, l) => l.totalServed >= 50 && s.rating >= 4.95 },
];

/**
 * Per-wave difficulty knobs. The wave system reads from `waveConfig(n)`
 * to keep all balancing in one place — easy to tweak.
 */
function waveConfig(wave: number) {
  const target = Math.min(20, 4 + wave * 2);                // 6, 8, 10, …
  const spawnMin = Math.max(1800, 6000 - wave * 700);       // 6s → 1.8s floor
  const spawnMax = Math.max(3500, 10000 - wave * 900);      // 10s → 3.5s floor
  const patience = Math.max(8000, 28000 - wave * 2500);     // 28s → 8s floor
  const angryToFail = Math.max(2, 5 - Math.floor(wave / 3));// 5 → 2 fails to bust
  return { target, spawnMin, spawnMax, patience, angryToFail };
}

const MAX_QUEUE = 6;

// ─── Helpers ──────────────────────────────────────────────────────────

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const uid = () => Math.random().toString(36).slice(2, 10);

const BLANK_PROGRESS: ShopProgressFlags = {
  hasProduct: false,
  hasStaff: false,
  hasDecor: false,
  hasMarketing: false,
  hasInnovation: false,
  hasCSR: false,
  shopLaunched: false,
};

const blankState = (): GameState => ({
  day: todayKey(),
  popularity: 50,
  xp: 0,
  level: 1,
  happiness: 70,
  rating: 4.2,
  servedToday: 0,
  ignoredToday: 0,
  wave: 1,
  waveServed: 0,
  waveAngry: 0,
  taskProgress: {},
  pendingToasts: [],
});

const loadState = (shopId: string): GameState => {
  try {
    const raw = localStorage.getItem(`shop_game_state_${shopId}`);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    // Daily rollover — keep XP/level/rating, reset the day counters
    // and start fresh at Wave 1 each day.
    if (parsed.day !== todayKey()) {
      return {
        ...blankState(),
        xp: parsed.xp ?? 0,
        level: parsed.level ?? 1,
        happiness: Math.max(60, Math.min(100, parsed.happiness ?? 70)),
        rating: parsed.rating ?? 4.2,
      };
    }
    return { ...blankState(), ...parsed, pendingToasts: [] };
  } catch {
    return blankState();
  }
};

const saveState = (shopId: string, s: GameState) => {
  try {
    const { pendingToasts: _ignored, ...rest } = s;
    localStorage.setItem(`shop_game_state_${shopId}`, JSON.stringify(rest));
  } catch {
    // ignore
  }
};

const loadAchievements = (shopId: string): Set<string> => {
  try {
    const raw = localStorage.getItem(`shop_game_achievements_${shopId}`);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
};

const saveAchievements = (shopId: string, ach: Set<string>) => {
  try {
    localStorage.setItem(`shop_game_achievements_${shopId}`, JSON.stringify([...ach]));
  } catch {
    // ignore
  }
};

const loadLifetime = (shopId: string): LifetimeStats => {
  const fallback: LifetimeStats = {
    totalServed: 0,
    highestHappiness: 0,
    highestWave: 1,
    visitedInterior: false,
    realFlags: { ...BLANK_PROGRESS },
  };
  try {
    const raw = localStorage.getItem(`shop_game_lifetime_${shopId}`);
    if (!raw) return fallback;
    // Spread parsed LAST so saved values win; fallback fills missing keys
    // (e.g. older records that pre-date `highestWave` / `realFlags`).
    const parsed = JSON.parse(raw) as Partial<LifetimeStats>;
    return {
      ...fallback,
      ...parsed,
      realFlags: { ...fallback.realFlags, ...(parsed.realFlags ?? {}) },
    };
  } catch {
    return fallback;
  }
};

const saveLifetime = (shopId: string, l: LifetimeStats) => {
  try {
    localStorage.setItem(`shop_game_lifetime_${shopId}`, JSON.stringify(l));
  } catch {
    // ignore
  }
};

// ─── Component ────────────────────────────────────────────────────────

export interface ShopMiniGameProps {
  shopId: string;
  shopName: string;
  /** Live progress flags from the AIpreneur backend — drive the
   *  mission list, achievement unlocks, and the "you're connected
   *  to the real site" feel. */
  progress?: ShopProgressFlags;
  /** Optional payout hook — let the host page write the mini-game's
   *  coin/XP earnings to the real backend. Defaults to no-ops. */
  onEarnCoins?: (coins: number) => void;
  /** Current coin balance from the backend (the city HUD shows the same
   *  number outside the shop). Drives the in-shop coins counter so the
   *  player can watch it tick up as they serve customers and down when
   *  they spend. Falls back to 0 when not provided. */
  coins?: number;
  onEarnXp?: (xp: number) => void;
  onEarnTokens?: (tokens: number) => void;
  /** Called when the player taps a mission card or a shop hotspot.
   *  The host page should navigate to `/s/aipreneur/<route>`. */
  onNavigate?: (route: string) => void;
  /** Onboarding passion_category id (e.g. 'ice_cream') — themes the
   *  items customers ask for so an ice-cream shop gets ice-cream orders. */
  shopCategory?: string | null;
  /** Real product names the student created — occasionally a customer
   *  asks for one of these by name for a personal touch. */
  productNames?: string[];
}

export function ShopMiniGame({
  shopId,
  shopName,
  progress = BLANK_PROGRESS,
  onEarnCoins,
  coins = 0,
  onEarnXp,
  onEarnTokens,
  onNavigate,
  shopCategory,
  productNames,
}: ShopMiniGameProps) {
  const [state, setState] = useState<GameState>(() => loadState(shopId));
  const [achievements, setAchievements] = useState<Set<string>>(() => loadAchievements(shopId));
  const [lifetime, setLifetime] = useState<LifetimeStats>(() => loadLifetime(shopId));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [achievementToast, setAchievementToast] = useState<AchievementDef | null>(null);
  /** Banner: 'complete' | 'failed' | null. Pauses spawning when set. */
  const [waveBanner, setWaveBanner] = useState<'complete' | 'failed' | null>(null);

  // ─── Coin balance HUD ──────────────────────────────────────────
  // `displayCoins` is what the HUD chip shows. It's seeded from the
  // backend `coins` prop and bumped locally the instant the player earns
  // in-game (so the counter feels responsive even before the backend
  // round-trips). When the backend balance itself changes — e.g. the
  // student spends coins in another module — the prop sync below catches
  // it and flashes the delta. `coinFx` drives the floating +N / −N popup.
  const [displayCoins, setDisplayCoins] = useState<number>(coins);
  const [coinFx, setCoinFx] = useState<{ id: number; amount: number } | null>(null);
  const prevCoinsProp = useRef<number>(coins);
  const coinFxId = useRef(0);

  const flashCoinDelta = useCallback((amount: number) => {
    if (!amount) return;
    coinFxId.current += 1;
    setCoinFx({ id: coinFxId.current, amount });
  }, []);

  /** Credit in-game earnings: bump the visible balance + flash a +N popup,
   *  then forward to the host so the backend can persist it. */
  const creditCoins = useCallback((amount: number) => {
    setDisplayCoins((c) => c + amount);
    flashCoinDelta(amount);
    onEarnCoins?.(amount);
  }, [flashCoinDelta, onEarnCoins]);

  // Keep the visible balance in step with the authoritative backend value
  // whenever it actually changes (covers spends made outside the shop).
  useEffect(() => {
    if (coins === prevCoinsProp.current) return;
    const diff = coins - prevCoinsProp.current;
    prevCoinsProp.current = coins;
    setDisplayCoins(coins);
    flashCoinDelta(diff);
  }, [coins, flashCoinDelta]);

  const cfg = useMemo(() => waveConfig(state.wave), [state.wave]);

  // Shop-themed product pool (memoised by category). The spawn loop reads
  // the pool + real product names; refs keep the long-lived setTimeout
  // closure reading fresh values without re-subscribing.
  const pool = useMemo(() => resolveProductPool(shopCategory), [shopCategory]);
  const poolRef = useRef(pool);
  useEffect(() => { poolRef.current = pool; }, [pool]);
  const productNamesRef = useRef<string[]>(productNames ?? []);
  useEffect(() => { productNamesRef.current = productNames ?? []; }, [productNames]);

  // ─── Persist ──────────────────────────────────────────────────
  useEffect(() => { saveState(shopId, state); }, [shopId, state]);
  useEffect(() => { saveAchievements(shopId, achievements); }, [shopId, achievements]);
  useEffect(() => { saveLifetime(shopId, lifetime); }, [shopId, lifetime]);

  // Mark "visited interior" once on mount.
  useEffect(() => {
    if (!lifetime.visitedInterior) {
      setLifetime((l) => ({ ...l, visitedInterior: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep `lifetime.realFlags` in sync with the live progress prop so
  // achievements tied to real-site state (e.g. Product Creator) can
  // unlock the instant the student finishes that module — even on the
  // very same shop visit.
  useEffect(() => {
    const next = { ...progress };
    const same = (Object.keys(next) as Array<keyof ShopProgressFlags>).every(
      (k) => lifetime.realFlags[k] === next[k],
    );
    if (!same) setLifetime((l) => ({ ...l, realFlags: next }));
  }, [progress, lifetime.realFlags]);

  // Track the highest wave reached.
  useEffect(() => {
    if (state.wave > lifetime.highestWave) {
      setLifetime((l) => ({ ...l, highestWave: state.wave }));
    }
  }, [state.wave, lifetime.highestWave]);

  // ─── Toasts ───────────────────────────────────────────────────
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    setState((s) => ({ ...s, pendingToasts: [...s.pendingToasts, { ...t, id: uid() }] }));
  }, []);
  const dismissToast = useCallback((id: string) => {
    setState((s) => ({ ...s, pendingToasts: s.pendingToasts.filter((t) => t.id !== id) }));
  }, []);
  useEffect(() => {
    if (state.pendingToasts.length === 0) return;
    const oldest = state.pendingToasts[0];
    const t = setTimeout(() => dismissToast(oldest.id), 2200);
    return () => clearTimeout(t);
  }, [state.pendingToasts, dismissToast]);

  // ─── Achievement evaluation ───────────────────────────────────
  useEffect(() => {
    for (const def of ACHIEVEMENTS) {
      if (achievements.has(def.id)) continue;
      if (def.check(state, lifetime)) {
        setAchievements((prev) => {
          const next = new Set(prev);
          next.add(def.id);
          return next;
        });
        setAchievementToast(def);
        setTimeout(() => setAchievementToast(null), 4500);
        break;
      }
    }
  }, [state, lifetime, achievements]);

  // ─── Queue management ─────────────────────────────────────────
  // Promote the front of the queue to 'ordering' whenever the slot is
  // empty. Customers in 'entering' state graduate to 'waiting' after
  // their walk-in animation completes (handled via onAnimationComplete
  // on the card itself — we just trust the state).
  useEffect(() => {
    setCustomers((q) => {
      // Filter out any leaving customers older than their exit time —
      // safety net in case AnimatePresence onExitComplete misfires.
      const filtered = q;
      // Promote front waiting customer to ordering if no one is ordering.
      const hasOrdering = filtered.some((c) => c.state === 'ordering');
      if (!hasOrdering) {
        const idx = filtered.findIndex((c) => c.state === 'waiting');
        if (idx >= 0) {
          return filtered.map((c, i) => {
            if (i !== idx) return c;
            // Use the customer's per-variant patience (already baked
            // in at spawn) — don't reset to cfg.patience here or VIPs
            // would lose their impatience trait at the counter.
            return {
              ...c,
              state: 'ordering',
              orderingStartedAt: performance.now(),
              reactions: [
                ...c.reactions,
                { id: uid(), emoji: '🤔', bornAt: performance.now() },
              ],
            };
          });
        }
      }
      return filtered;
    });
  }, [customers.length, cfg.patience]);

  // Drive the ordering customer's patience tick + promote next when
  // they leave / get angry.
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const t = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(t);
  }, []);

  // Compute "ordering" customer's patience % once per tick. If 0,
  // mark them angry.
  useEffect(() => {
    setCustomers((q) => {
      const ordering = q.find((c) => c.state === 'ordering');
      if (!ordering || ordering.orderingStartedAt == null) return q;
      const elapsed = now - ordering.orderingStartedAt;
      if (elapsed >= ordering.patienceMs) {
        // Patience expired → angry.
        return q.map((c) =>
          c.id === ordering.id
            ? {
                ...c,
                state: 'angry',
                result: 'angry',
                reactions: [
                  ...c.reactions,
                  { id: uid(), emoji: '😟', bornAt: performance.now() },
                ],
              }
            : c,
        );
      }
      return q;
    });
  }, [now]);

  // When a customer becomes 'angry' or 'served' (via serve()), bump
  // happiness/rating, then transition to 'leaving' after a small
  // delay so the player sees the reaction.
  useEffect(() => {
    const angryOrServed = customers.filter(
      (c) => c.state === 'angry' || c.state === 'served',
    );
    if (angryOrServed.length === 0) return;
    const timers = angryOrServed.map((c) => {
      const ms = c.state === 'angry' ? 900 : 700;
      return setTimeout(() => {
        setCustomers((q) => q.map((cc) => (cc.id === c.id ? { ...cc, state: 'leaving' } : cc)));
        if (c.state === 'angry') {
          setState((s) => ({
            ...s,
            happiness: Math.max(0, s.happiness - 8),
            rating: Math.max(2.5, s.rating - 0.05),
            ignoredToday: s.ignoredToday + 1,
            waveAngry: s.waveAngry + 1,
          }));
          pushToast({ emoji: '😠', text: 'Customer left unhappy', tint: 'bad' });
        }
      }, ms);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers.map((c) => `${c.id}:${c.state}`).join(',')]);

  // Strip 'leaving' customers after their exit animation finishes (1s).
  useEffect(() => {
    const leaving = customers.filter((c) => c.state === 'leaving');
    if (leaving.length === 0) return;
    const t = setTimeout(() => {
      setCustomers((q) => q.filter((c) => c.state !== 'leaving'));
    }, 1000);
    return () => clearTimeout(t);
  }, [customers.map((c) => `${c.id}:${c.state}`).join(',')]);

  // ─── Spawn customers ──────────────────────────────────────────
  // Spawning pauses when:
  //   • a wave banner is visible (player hasn't decided yet)
  //   • the player completed the wave target (banner dismissed but
  //     not advanced — they're "on a break")
  //   • the player hit too many angries and dismissed the fail banner
  //     (waiting on a Retry).
  const spawningPausedRef = useRef(false);
  useEffect(() => {
    spawningPausedRef.current =
      waveBanner !== null ||
      state.waveServed >= cfg.target ||
      state.waveAngry >= cfg.angryToFail;
  }, [waveBanner, state.waveServed, state.waveAngry, cfg.target, cfg.angryToFail]);

  useEffect(() => {
    let canceled = false;
    const schedule = (delay: number) => {
      const timer = setTimeout(() => {
        if (canceled) return;
        if (spawningPausedRef.current) {
          schedule(800);
          return;
        }
        setCustomers((q) => {
          // Visible-on-screen count (anything except leaving) caps queue.
          const visible = q.filter((c) => c.state !== 'leaving').length;
          if (visible >= MAX_QUEUE) return q;
          // Shop-themed order. ~20% of the time, if the student has real
          // products, a customer asks for one by name (keeps the themed
          // emoji from the category pool as the icon).
          const poolItem = pick(poolRef.current);
          const realNames = productNamesRef.current;
          const useReal = realNames.length > 0 && Math.random() < 0.2;
          const product: ProductItem = useReal
            ? { emoji: poolItem.emoji, label: pick(realNames) }
            : poolItem;
          const variant = pickVariant();
          // Each new customer takes the next ticket number — same as
          // the deli "Now serving #N" feel. Stable per-customer so the
          // # label can re-render without churn.
          const ticket = q.length + 1;
          const c: Customer = {
            id: uid(),
            ticket,
            name: pick(CUSTOMER_NAMES),
            variant,
            wants: product,
            question: orderPhrase(product.label),
            state: 'entering',
            orderingStartedAt: null,
            // Variant patience multiplier modulates the wave-cfg patience.
            patienceMs: Math.max(4000, cfg.patience * variant.patienceMul),
            reactions: [
              // 🛒 popup when they walk in — gives the queue a "real
              // shop" feel; auto-pruned by the reaction tick effect.
              { id: uid(), emoji: '🛒', bornAt: performance.now() },
            ],
          };
          return [...q, c];
        });
        // After arriving, transition 'entering' → 'waiting' once the
        // walk-in animation is done. Doing it on a small timeout is
        // simpler + cheaper than per-card animation callbacks.
        setTimeout(() => {
          if (canceled) return;
          setCustomers((q) =>
            q.map((c) => (c.state === 'entering' ? { ...c, state: 'waiting' } : c)),
          );
        }, 700);
        // Popularity multiplier: 50 = baseline, 100 = ~0.6× spawn delay
        // (fast arrivals), 0 = ~1.5× spawn delay (slow). Tied to live
        // state so the meter directly drives queue density.
        const popMul = Math.max(0.55, 1.5 - state.popularity / 100);
        const nextDelay = (cfg.spawnMin + Math.random() * (cfg.spawnMax - cfg.spawnMin)) * popMul;
        schedule(nextDelay);
      }, delay);
      return timer;
    };
    // First customer in 1.2s so the player sees activity right away.
    const initial = schedule(1200);
    return () => {
      canceled = true;
      clearTimeout(initial);
    };
  }, [cfg.spawnMin, cfg.spawnMax, cfg.patience, state.popularity]);

  // ─── Wave progression ─────────────────────────────────────────
  // Wave complete + wave failed banners are TRIGGERED at the
  // transition (in serve() / angry handler) and DISMISSED by the
  // player tapping a button. They do NOT auto-dismiss — previous
  // versions used setTimeout cleanups that fought the effect
  // dep-array and left banners stuck on screen.
  //
  // Each banner action handler:
  //   • Wave complete → "Start Next Wave" (advance wave + clear
  //     counters) or "Take a Break" (just close banner; spawning
  //     stays paused until the player taps Start Next Wave from the
  //     HUD).
  //   • Wave failed → "Try Again" (reset wave counters, same wave)
  //     or "Stop" (close banner; player can resume later).
  const startNextWave = useCallback(() => {
    setState((s) => ({ ...s, wave: s.wave + 1, waveServed: 0, waveAngry: 0 }));
    setWaveBanner(null);
  }, []);
  const retryWave = useCallback(() => {
    setState((s) => ({ ...s, waveServed: 0, waveAngry: 0 }));
    setWaveBanner(null);
  }, []);
  const dismissWaveBanner = useCallback(() => {
    // Just close — don't change wave counters. The "Resume" button on
    // the HUD lets the player restart spawning when they're ready.
    setWaveBanner(null);
  }, []);

  // Track wave completion / failure via state transitions in a single
  // effect that only fires when the counters move. Guard with a ref so
  // we never fire twice for the same threshold crossing.
  const lastTriggeredRef = useRef<{ served: number; angry: number; wave: number }>({
    served: -1,
    angry: -1,
    wave: -1,
  });
  useEffect(() => {
    if (waveBanner !== null) return;
    const sig = { served: state.waveServed, angry: state.waveAngry, wave: state.wave };
    // Reset memo if we moved to a new wave.
    if (sig.wave !== lastTriggeredRef.current.wave) {
      lastTriggeredRef.current = { served: -1, angry: -1, wave: sig.wave };
    }
    if (state.waveServed >= cfg.target && lastTriggeredRef.current.served < state.waveServed) {
      lastTriggeredRef.current.served = state.waveServed;
      const bonusXp = 30 + state.wave * 15;
      const bonusCoins = 20 + state.wave * 10;
      setState((s) => ({
        ...s,
        xp: s.xp + bonusXp,
        level: Math.max(1, Math.floor((s.xp + bonusXp) / 100) + 1),
        rating: Math.min(5, s.rating + 0.05),
      }));
      creditCoins(bonusCoins);
      pushToast({ emoji: '🌊', text: `Wave ${state.wave} bonus +${bonusXp} XP`, tint: 'reward' });
      setWaveBanner('complete');
    } else if (state.waveAngry >= cfg.angryToFail && lastTriggeredRef.current.angry < state.waveAngry) {
      lastTriggeredRef.current.angry = state.waveAngry;
      pushToast({ emoji: '😅', text: 'Wave failed — try again!', tint: 'bad' });
      setWaveBanner('failed');
    }
  }, [state.waveServed, state.waveAngry, state.wave, cfg.target, cfg.angryToFail, waveBanner, creditCoins, pushToast]);

  // ─── Action: serve the active customer ─────────────────────────
  const serve = useCallback(() => {
    setCustomers((q) => {
      const idx = q.findIndex((c) => c.state === 'ordering');
      if (idx < 0) return q;
      const active = q[idx];
      const elapsed = active.orderingStartedAt != null
        ? now - active.orderingStartedAt
        : 0;
      const pct = elapsed / active.patienceMs;
      const result: 'happy' | 'neutral' = pct < 0.55 ? 'happy' : 'neutral';
      // Variant reward multiplier — a VIP / Big Spender pays out way
      // more than a Regular Kid. Base values come from the queue
      // mini-game economy; multiplier ties to CUSTOMER_VARIANTS.
      const mult = active.variant.rewardMul;
      const xpGain = Math.round((result === 'happy' ? 12 : 8) * mult);
      const coinGain = Math.round((result === 'happy' ? 6 : 4) * mult);
      const tokenGain = active.variant.id === 'vip' || active.variant.id === 'bigspender' ? 1 : 0;
      setState((s) => {
        const xp = s.xp + xpGain;
        const level = Math.max(1, Math.floor(xp / 100) + 1);
        const happiness = Math.min(100, s.happiness + (result === 'happy' ? 5 : 2));
        const rating = Math.min(5, s.rating + (result === 'happy' ? 0.03 : 0.01));
        // Popularity rises when customers leave happy, drifts back
        // toward 50 on neutral serves so it never lock-stays at 100.
        const popDelta = result === 'happy' ? 3 : 1;
        const popularity = Math.max(0, Math.min(100, s.popularity + popDelta));
        return {
          ...s,
          xp,
          level,
          happiness,
          rating,
          popularity,
          servedToday: s.servedToday + 1,
          waveServed: s.waveServed + 1,
          taskProgress: {
            ...s.taskProgress,
            serve3: Math.min(3, (s.taskProgress.serve3 ?? 0) + 1),
            serve10: Math.min(10, (s.taskProgress.serve10 ?? 0) + 1),
            happy80: happiness >= 80 ? 1 : (s.taskProgress.happy80 ?? 0),
          },
        };
      });
      setLifetime((l) => ({
        ...l,
        totalServed: l.totalServed + 1,
        highestHappiness: Math.max(l.highestHappiness, Math.min(100, state.happiness + 5)),
      }));
      creditCoins(coinGain);
      onEarnXp?.(xpGain);
      if (tokenGain) onEarnTokens?.(tokenGain);
      pushToast({
        emoji: result === 'happy' ? active.variant.happyEmoji : '💰',
        text: tokenGain
          ? `+${coinGain} coin · +${xpGain} XP · +${tokenGain} 🎟`
          : `+${coinGain} coin · +${xpGain} XP`,
        tint: 'reward',
      });
      return q.map((c, i) => {
        if (i !== idx) return c;
        // Stamp the happy-emoji reaction so the popup floats above
        // the avatar before the customer animates out.
        return {
          ...c,
          state: 'served',
          result,
          reactions: [
            ...c.reactions,
            {
              id: uid(),
              emoji: result === 'happy' ? c.variant.happyEmoji : '👍',
              bornAt: performance.now(),
            },
          ],
        };
      });
    });
  }, [now, creditCoins, onEarnXp, onEarnTokens, pushToast, state.happiness]);

  // ─── Slow popularity decay — drifts toward 50 so a perfect run
  // doesn't lock the meter at 100 forever, and a bad run can claw
  // its way back without playing again. */}
  useEffect(() => {
    const t = setInterval(() => {
      setState((s) => {
        if (s.popularity === 50) return s;
        const next = s.popularity > 50 ? s.popularity - 0.5 : s.popularity + 0.4;
        return { ...s, popularity: Math.round(next * 10) / 10 };
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // ─── Reaction-popup tick — prunes expired reactions ──────────
  useEffect(() => {
    const t = setInterval(() => {
      setCustomers((q) => {
        const tNow = performance.now();
        let dirty = false;
        const next = q.map((c) => {
          const cleaned = c.reactions.filter((r) => tNow - r.bornAt < 1800);
          if (cleaned.length !== c.reactions.length) {
            dirty = true;
            return { ...c, reactions: cleaned };
          }
          return c;
        });
        return dirty ? next : q;
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  // ─── Action: restock + chest ──────────────────────────────────
  const restock = useCallback(() => {
    if ((state.taskProgress.restock ?? 0) >= 1) return;
    setState((s) => ({
      ...s,
      happiness: Math.min(100, s.happiness + 6),
      rating: Math.min(5, s.rating + 0.1),
      taskProgress: { ...s.taskProgress, restock: 1 },
    }));
    pushToast({ emoji: '📦', text: 'Shelf restocked!', tint: 'good' });
  }, [state.taskProgress.restock, pushToast]);

  const openChest = useCallback(() => {
    if ((state.taskProgress.chest ?? 0) >= 1) return;
    const xpGain = 50;
    const coinGain = 40;
    setState((s) => ({
      ...s,
      xp: s.xp + xpGain,
      level: Math.max(1, Math.floor((s.xp + xpGain) / 100) + 1),
      taskProgress: { ...s.taskProgress, chest: 1 },
    }));
    creditCoins(coinGain);
    pushToast({ emoji: '🎁', text: `Chest! +${xpGain} XP · +${coinGain} coin`, tint: 'reward' });
  }, [state.taskProgress.chest, pushToast, creditCoins]);

  // ─── Derived display values ───────────────────────────────────
  const xpInLevel = state.xp % 100;
  const happinessTint = state.happiness >= 80 ? 'lime' : state.happiness >= 50 ? 'amber' : 'rose';

  const completedTasks = useMemo(
    () => TASKS.filter((t) => (state.taskProgress[t.id] ?? 0) >= t.target),
    [state.taskProgress],
  );

  // Visible customers in display order: leftmost = ordering, then
  // waiting (front-to-back), then entering. 'leaving' uses its own
  // exit animation and stays in array until the cleanup effect fires.
  const visibleCustomers = useMemo(() => {
    const orderingC = customers.find((c) => c.state === 'ordering');
    const waitingC = customers.filter((c) => c.state === 'waiting');
    const enteringC = customers.filter((c) => c.state === 'entering');
    const reactingC = customers.filter((c) => c.state === 'served' || c.state === 'angry');
    const leavingC = customers.filter((c) => c.state === 'leaving');
    return [
      ...leavingC,                                            // exit animation
      ...(reactingC.length && !orderingC ? reactingC : []),   // edge case
      ...(orderingC ? [orderingC] : []),
      ...(reactingC.length && orderingC ? reactingC.filter((c) => c.id !== orderingC.id) : []),
      ...waitingC,
      ...enteringC,
    ];
  }, [customers]);

  // Active customer (ordering) patience %.
  const activeCustomer = customers.find((c) => c.state === 'ordering');
  const activePatiencePct = activeCustomer && activeCustomer.orderingStartedAt != null
    ? Math.max(0, Math.min(100, 100 - ((now - activeCustomer.orderingStartedAt) / activeCustomer.patienceMs) * 100))
    : 0;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* ── Top game HUD — fluid width with hard right margin so it
            can't slide under floating buttons on tablet widths. The
            inner pills collapse down at narrow viewports. ─────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-auto max-w-[calc(100vw-180px)]"
        style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        {/* HUD tray — system frosted dark-glass surface (matches the GLASS
            token language in uiTokens). Subtle neutral border, no chunky
            Roblox-style bottom edge, so the strip seats calmly above the
            iso scene without screaming for attention. */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 py-2 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-white/10 shadow-md shadow-black/30 overflow-hidden">
          {/* Wave badge */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[10px] font-black border-b-[3px] border-orange-700">
              W{state.wave}
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Wave</span>
              <span className="text-xs font-black text-white tabular-nums">
                {state.waveServed}/{cfg.target}
              </span>
            </div>
          </div>

          {/* Coins — live balance. Ticks up on serve/wave/chest and down
              when the backend balance drops (e.g. a purchase elsewhere).
              The floating +N / −N popup makes every change legible. */}
          <div className="relative flex items-center gap-1.5 pr-1.5 sm:pr-2 border-r border-white/10">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center border-b-[3px] border-amber-700">
              <Coins className="w-3.5 h-3.5 text-white" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold hidden sm:block">Coins</span>
              <motion.span
                key={displayCoins}
                initial={{ scale: 1.25 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                className="text-xs font-black text-yellow-300 tabular-nums"
              >
                {Math.max(0, Math.round(displayCoins)).toLocaleString()}
              </motion.span>
            </div>
            {/* Floating delta popup */}
            <AnimatePresence>
              {coinFx && (
                <motion.span
                  key={coinFx.id}
                  initial={{ opacity: 0, y: 4, scale: 0.8 }}
                  animate={{ opacity: 1, y: -14, scale: 1 }}
                  exit={{ opacity: 0, y: -26 }}
                  transition={{ duration: 0.5 }}
                  onAnimationComplete={() => setCoinFx(null)}
                  className={`absolute left-1/2 -translate-x-1/2 -top-1 text-[11px] font-black tabular-nums pointer-events-none drop-shadow ${
                    coinFx.amount >= 0 ? 'text-lime-300' : 'text-rose-300'
                  }`}
                >
                  {coinFx.amount >= 0 ? '+' : '−'}{Math.abs(Math.round(coinFx.amount))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Level + XP (XP bar hidden on tight screens) */}
          <div className="flex items-center gap-1.5 pr-1.5 sm:pr-2 border-r border-white/10">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-black border-b-[3px] border-violet-800">
              {state.level}
            </span>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Lv</span>
              <div className="w-12 md:w-16 h-1.5 rounded-full bg-white/10 overflow-hidden mt-0.5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400"
                  initial={false}
                  animate={{ width: `${xpInLevel}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Happiness — hidden on tightest mobile so the pill bar fits. */}
          <div className="hidden xs:flex sm:flex items-center gap-1 sm:gap-1.5 px-1 sm:px-1.5">
            <Smile className={`w-4 h-4 ${happinessTint === 'lime' ? 'text-lime-300' : happinessTint === 'amber' ? 'text-amber-300' : 'text-rose-300'}`} />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold hidden md:block">Mood</span>
              <span className="text-xs font-black text-white tabular-nums">{Math.round(state.happiness)}%</span>
            </div>
          </div>

          {/* Rating — only on md+ */}
          <div className="hidden md:flex items-center gap-1.5 px-1.5">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Rating</span>
              <span className="text-xs font-black text-white tabular-nums">{state.rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Popularity — visible heart icon + percent. Drives spawn
              rate. Shown on md+ to keep the mobile HUD short. */}
          <div className="hidden md:flex items-center gap-1.5 px-1.5">
            <Sparkles className="w-4 h-4 text-pink-300" />
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">Pop</span>
              <span className="text-xs font-black text-white tabular-nums">{Math.round(state.popularity)}%</span>
            </div>
          </div>

          {/* HUD action buttons — chunky dock tiles so every shop menu
              button speaks the same plastic-tile language as the bottom
              MobileDock. The `sm` size keeps them tight inside the HUD
              strip. Missions / Tasks / Achievements each get their own
              variant colour so the active-state glow reads. */}
          <div className="flex items-center gap-1.5 pl-1.5">
            <DockTile
              size="sm"
              variant="violet"
              icon={Sparkles}
              label="Quests"
              active={missionsOpen}
              pulse={MISSIONS.filter((m) => !m.done(progress)).length > 0}
              badge={`${MISSIONS.filter((m) => m.done(progress)).length}/${MISSIONS.length}`}
              onClick={() => {
                setMissionsOpen((v) => !v);
                setTasksOpen(false);
                setAchievementsOpen(false);
              }}
              ariaLabel="Open missions"
            />

            <div className="hidden xs:block sm:block">
              <DockTile
                size="sm"
                variant="cyan"
                icon={ListChecks}
                label="Tasks"
                active={tasksOpen}
                pulse={completedTasks.length < TASKS.length}
                badge={`${completedTasks.length}/${TASKS.length}`}
                onClick={() => {
                  setTasksOpen((v) => !v);
                  setMissionsOpen(false);
                  setAchievementsOpen(false);
                }}
                ariaLabel="Open tasks"
              />
            </div>

            <div className="hidden md:block">
              <DockTile
                size="sm"
                variant="amber"
                icon={Trophy}
                label="Trophies"
                active={achievementsOpen}
                badge={`${achievements.size}/${ACHIEVEMENTS.length}`}
                onClick={() => {
                  setAchievementsOpen((v) => !v);
                  setTasksOpen(false);
                  setMissionsOpen(false);
                }}
                ariaLabel="Open achievements"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Shop sign — sits well below the HUD pill so the two
            never stack on top of each other. Hidden on the smallest
            mobile where there's no spare vertical room. ───────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none hidden md:block max-w-[60vw]"
        style={{ top: 'calc(env(safe-area-inset-top) + 70px)' }}
      >
        <div className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-300 to-pink-300 text-orange-900 font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 border border-orange-200 truncate">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span className="truncate">{shopName || 'Your Shop'}</span>
          </span>
        </div>
      </div>

      {/* ── Tasks panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {tasksOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="absolute left-2 right-2 sm:left-auto sm:right-3 sm:w-80 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-3 pointer-events-auto"
            style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 text-white font-black text-sm">
                <ListChecks className="w-4 h-4 text-cyan-300" />
                Today's Tasks
              </div>
              <button
                onClick={() => setTasksOpen(false)}
                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
                aria-label="Close tasks"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {TASKS.map((t) => {
                const progress = state.taskProgress[t.id] ?? 0;
                const done = progress >= t.target;
                return (
                  <div key={t.id} className={`rounded-xl p-2.5 border ${done ? 'bg-lime-500/10 border-lime-500/30' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white truncate">{t.title}</span>
                          <span className="text-[10px] font-black text-white/60 tabular-nums shrink-0">
                            {Math.min(progress, t.target)}/{t.target}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${done ? 'bg-lime-400' : 'bg-cyan-400'}`}
                            style={{ width: `${(Math.min(progress, t.target) / t.target) * 100}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-white/60">
                          <span className="inline-flex items-center gap-0.5"><Zap className="w-3 h-3 text-amber-300" />+{t.reward.xp}</span>
                          <span className="inline-flex items-center gap-0.5"><Coins className="w-3 h-3 text-yellow-300" />+{t.reward.coins}</span>
                        </div>
                      </div>
                      {done && <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Missions panel — real AIpreneur module flow ──────── */}
      <AnimatePresence>
        {missionsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="absolute left-2 right-2 sm:left-auto sm:right-3 sm:w-80 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-3 pointer-events-auto"
            style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 text-white font-black text-sm">
                <Sparkles className="w-4 h-4 text-violet-300" />
                Shop Missions
              </div>
              <button
                onClick={() => setMissionsOpen(false)}
                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
                aria-label="Close missions"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {MISSIONS.map((m) => {
                const done = m.done(progress);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate(m.route);
                      setMissionsOpen(false);
                    }}
                    className={`w-full text-left rounded-xl p-2.5 border transition-all ${
                      done
                        ? 'bg-lime-500/10 border-lime-500/30 hover:bg-lime-500/15'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl shrink-0">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white">{m.title}</span>
                          {done ? (
                            <span className="text-[9px] font-black uppercase tracking-wider text-lime-300 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider text-violet-300">
                              Go →
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{m.hint}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          /s/aipreneur/{m.route}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Station hotspots now live in the unified IsoShopFab action
          menu (bottom-right FAB → "Stations" group), so the old cramped
          right-side stack was removed to avoid label/icon overlap and
          give the queue + HUD more room. */}

      {/* ── Achievements panel ───────────────────────────────── */}
      <AnimatePresence>
        {achievementsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="absolute left-2 right-2 sm:left-auto sm:right-3 sm:w-80 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 p-3 pointer-events-auto"
            style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 text-white font-black text-sm">
                <Trophy className="w-4 h-4 text-amber-300" />
                Achievements
              </div>
              <button
                onClick={() => setAchievementsOpen(false)}
                className="w-7 h-7 rounded-md bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center"
                aria-label="Close achievements"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {ACHIEVEMENTS.map((a) => {
                const unlocked = achievements.has(a.id);
                return (
                  <div key={a.id} className={`rounded-xl p-2.5 border ${unlocked ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl shrink-0 ${unlocked ? '' : 'grayscale'}`}>{a.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-white truncate">{a.title}</div>
                        <div className="text-[10px] text-white/60 leading-snug">{a.description}</div>
                      </div>
                      {unlocked && <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Side action buttons ──────────────────────────────────
          Free-floating chunky white tiles — no tray. Each tile has its
          own shadow + coloured hover glow + press-down behavior so the
          buttons look like they're floating against the iso scene. */}
      <div
        className="absolute left-3 sm:left-4 pointer-events-auto flex flex-col gap-3"
        style={{ top: 'calc(env(safe-area-inset-top) + 80px)' }}
      >
        <DockTile
          size="lg"
          variant="cyan"
          emoji="📦"
          label="Restock"
          disabled={(state.taskProgress.restock ?? 0) >= 1}
          pulse={(state.taskProgress.restock ?? 0) < 1}
          onClick={restock}
          ariaLabel="Restock the shelf"
        />
        <DockTile
          size="lg"
          variant="amber"
          emoji="🎁"
          label="Chest"
          disabled={(state.taskProgress.chest ?? 0) >= 1}
          pulse={(state.taskProgress.chest ?? 0) < 1}
          onClick={openChest}
          ariaLabel="Open reward chest"
          // Idle wiggle on the chest while it's still claimable so the
          // eye is drawn to the "free reward" tile.
          animate={
            (state.taskProgress.chest ?? 0) < 1
              ? { rotate: [-2, 2, -2, 2, 0] }
              : undefined
          }
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
        />
      </div>

      {/* ── Floating action toasts — sit below the shop sign so
            neither one clips the other on tablets. ─────────────── */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1"
        style={{ top: 'calc(env(safe-area-inset-top) + 120px)' }}
      >
        <AnimatePresence>
          {state.pendingToasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 18, stiffness: 240 }}
              className={`px-3 py-1.5 rounded-2xl text-xs font-black shadow-lg backdrop-blur border ${
                t.tint === 'good'
                  ? 'bg-lime-500/90 text-white border-lime-300/40'
                  : t.tint === 'bad'
                    ? 'bg-rose-500/90 text-white border-rose-300/40'
                    : 'bg-amber-500/90 text-white border-amber-300/40'
              }`}
            >
              <span className="mr-1">{t.emoji}</span>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── The queue itself: counter on the LEFT, line of customers
            extending right. Visible customers are laid out in a flex
            row with framer-motion's `layout` so when one is served
            the rest slide forward automatically. ───────────────── */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-6 relative">
          {/* Counter marker — anchors the left end of the queue. */}
          <div className="absolute left-3 sm:left-6 bottom-0 -ml-0 pointer-events-none flex flex-col items-center">
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-200 to-amber-400 border-b-[4px] border-amber-700 flex items-center justify-center text-3xl sm:text-4xl shadow-xl"
            >
              👵
            </motion.div>
            <div className="mt-1 px-2 py-0.5 rounded-md bg-amber-500/95 text-white text-[9px] font-black uppercase tracking-wider shadow flex items-center gap-1">
              <Store className="w-2.5 h-2.5" />
              Counter
            </div>
            {/* Patience ring around the active customer slot — shown
                only when there's an ordering customer. */}
          </div>

          {/* Customer row — leftmost is the active (ordering). */}
          <div className="pl-24 sm:pl-32 flex items-end gap-2 sm:gap-3 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {visibleCustomers.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-2 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-white/10 text-white text-xs font-bold mb-3"
                >
                  Waiting for customers…
                </motion.div>
              )}

              {visibleCustomers.map((c, idx) => (
                <QueueCustomer
                  key={c.id}
                  customer={c}
                  index={idx}
                  isActive={c.state === 'ordering'}
                  patiencePct={c.state === 'ordering' ? activePatiencePct : 100}
                  onServe={c.state === 'ordering' ? serve : undefined}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Wave popup — proper game notification ─────────────────
            Full-screen scrim + backdrop blur so the popup sits on top
            of a dimmed scene. The card itself is a frosted glass
            surface (system `GLASS`), centred by flex (not by absolute
            translate-1/2 — framer-motion's inline transform was
            overwriting Tailwind's translate classes and pushing the
            old card off to the side). The popup has a bouncy spring
            entrance, a big circular emoji crest at the top with a
            sparkle ring, and chunky 3D system buttons. Doesn't
            auto-dismiss — the player picks a path. */}
      <AnimatePresence>
        {waveBanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            // The wrapper takes the FULL viewport and uses flex to
            // centre the card. This sidesteps the framer-motion vs
            // -translate-1/2 conflict that was offsetting the old card.
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto px-4"
          >
            {/* Scrim — dims the iso scene behind the popup so the popup
                actually pops. Clicking the scrim does nothing on
                purpose; the player has to make a decision. */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260, mass: 0.8 }}
              className="relative w-full max-w-sm"
            >
              {/* Card — frosted glass, neutral border. The big circular
                  emoji crest sits half-outside the top edge so the
                  popup reads as "something arrived". */}
              <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/40 pt-14 pb-6 px-6 text-center">
                {/* Emoji crest — pinned half-outside the top edge. The
                    coloured ring matches the popup state (rose = fail,
                    emerald = complete). A second outer halo gives it
                    the "this is a moment" feel. */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 12,
                    stiffness: 200,
                    delay: 0.1,
                  }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2"
                >
                  <div
                    className={`relative w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-xl border-4 border-white dark:border-slate-900 ${
                      waveBanner === 'complete'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  >
                    <span aria-hidden>
                      {waveBanner === 'complete' ? '🎉' : '😅'}
                    </span>
                    {/* Ambient pulse halo so the crest feels alive. */}
                    <span
                      className={`absolute inset-0 rounded-full animate-ping opacity-40 ${
                        waveBanner === 'complete'
                          ? 'bg-emerald-400'
                          : 'bg-rose-400'
                      }`}
                    />
                  </div>
                </motion.div>

                {/* State tag — small uppercase pill above the title. */}
                <div
                  className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    waveBanner === 'complete'
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {waveBanner === 'complete' ? 'Wave Complete' : 'Wave Failed'}
                </div>

                {/* Title */}
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {waveBanner === 'complete'
                    ? `Wave ${state.wave} Cleared!`
                    : 'Too many sad customers'}
                </h2>

                {/* Body copy */}
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-snug">
                  {waveBanner === 'complete'
                    ? `Next wave will have ${waveConfig(state.wave + 1).target} customers and less patience.`
                    : 'Reset this wave or take a break — your XP and level are safe.'}
                </p>

                {/* CTAs — system 3D buttons so they match the rest of
                    AIgenius. Stacked on tight screens, row otherwise. */}
                <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {waveBanner === 'complete' ? (
                    <>
                      <button
                        type="button"
                        onClick={startNextWave}
                        className={`${BTN_3D_PRIMARY} flex-1 px-4 py-2.5 text-sm`}
                      >
                        ▶ Start Wave {state.wave + 1}
                      </button>
                      <button
                        type="button"
                        onClick={dismissWaveBanner}
                        className={`${BTN_3D_SECONDARY} flex-1 px-4 py-2.5 text-sm`}
                      >
                        ☕ Take a Break
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={retryWave}
                        className={`${BTN_3D_PRIMARY} flex-1 px-4 py-2.5 text-sm`}
                      >
                        🔁 Try Again
                      </button>
                      <button
                        type="button"
                        onClick={dismissWaveBanner}
                        className={`${BTN_3D_SECONDARY} flex-1 px-4 py-2.5 text-sm`}
                      >
                        ⏸ Stop for Now
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── "Take a break" mode: floating Resume button ─────────
          When the banner is dismissed without proceeding, the wave
          is paused but the player needs a clear way back in. */}
      {!waveBanner && state.waveServed >= cfg.target && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: 'calc(env(safe-area-inset-top) + 110px)' }}
        >
          <button
            type="button"
            onClick={startNextWave}
            className={`${BTN_3D_PRIMARY} px-5 py-2.5 text-sm`}
          >
            ▶ Start Wave {state.wave + 1}
          </button>
        </div>
      )}
      {!waveBanner && state.waveAngry >= cfg.angryToFail && state.waveServed < cfg.target && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: 'calc(env(safe-area-inset-top) + 110px)' }}
        >
          <button
            type="button"
            onClick={retryWave}
            className={`${BTN_3D_SECONDARY} px-5 py-2.5 text-sm`}
          >
            🔁 Retry Wave {state.wave}
          </button>
        </div>
      )}

      {/* ── Achievement banner ───────────────────────────────── */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 18, stiffness: 240 }}
            className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 240px)' }}
          >
            <div className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-3xl bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 shadow-2xl shadow-orange-500/40 border border-white/40 max-w-[90vw]">
              <div className="w-14 h-14 rounded-2xl bg-white/30 flex items-center justify-center text-3xl">
                {achievementToast.emoji}
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-white/90 inline-flex items-center gap-1">
                  <Award className="w-3 h-3" /> Achievement Unlocked
                </div>
                <div className="text-sm sm:text-base font-black text-white leading-tight">
                  {achievementToast.title}
                </div>
                <div className="text-[11px] text-white/90 leading-snug max-w-[200px]">
                  {achievementToast.description}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inner: Queue customer ────────────────────────────────────────────

/**
 * One customer in the visible queue line.
 *
 * Animation language:
 *   - entering  → comes in from the right edge (x: +180) and settles
 *     into position. `layout` handles its slot.
 *   - waiting   → just sits in its layout slot, gently bobbing.
 *   - ordering  → larger card with a speech bubble, patience ring,
 *     and a SERVE button. Only this one is tappable.
 *   - served    → green pip overlay, +reaction emoji.
 *   - angry     → red pip overlay, +angry emoji.
 *   - leaving   → animates off to the left (x: -300) with fade-out.
 */
function QueueCustomer({
  customer,
  index,
  isActive,
  patiencePct,
  onServe,
}: {
  customer: Customer;
  index: number;
  isActive: boolean;
  patiencePct: number;
  onServe?: () => void;
}) {
  const s = customer.state;
  const tint =
    patiencePct >= 60 ? 'bg-lime-400'
    : patiencePct >= 30 ? 'bg-amber-400'
    : 'bg-rose-400';

  // Initial / exit transforms — define the walk-in / walk-out feel.
  const variants = {
    initial:
      s === 'entering'
        ? { x: 180, opacity: 0, scale: 0.85 }
        : { opacity: 0, scale: 0.85 },
    animate: { x: 0, opacity: 1, scale: isActive ? 1.0 : 0.88 },
    exit:
      s === 'leaving'
        ? { x: -260, opacity: 0, scale: 0.7, transition: { duration: 0.8, ease: 'easeIn' as const } }
        : { opacity: 0, scale: 0.85 },
  } as const;

  // Bobbing motion for waiting customers, scaled down by queue depth.
  const bob = !isActive && s === 'waiting'
    ? { y: [0, -3 - index * 0.5, 0] }
    : {};

  return (
    <motion.div
      layout
      variants={variants}
      initial="initial"
      animate={{ ...variants.animate, ...bob }}
      exit="exit"
      transition={{
        type: 'spring',
        damping: 22,
        stiffness: 240,
        y: { duration: 2.4 + index * 0.2, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`relative flex flex-col items-center pointer-events-auto ${isActive ? 'z-10' : 'z-0'}`}
    >
      {/* Floating emoji reactions — short popups that drift up and
          fade. Stacks neatly above the avatar without crowding the
          speech bubble. */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <AnimatePresence>
          {customer.reactions.slice(-2).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8, scale: 0.6 }}
              animate={{ opacity: 1, y: -18 - i * 12, scale: 1 }}
              exit={{ opacity: 0, y: -34, scale: 0.5 }}
              transition={{ type: 'spring', damping: 18, stiffness: 240 }}
              className="absolute left-1/2 -translate-x-1/2 text-xl sm:text-2xl select-none drop-shadow"
            >
              {r.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Speech bubble — only when ordering (active). */}
      {isActive && s === 'ordering' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-1 max-w-[160px] sm:max-w-[200px] relative"
        >
          <div className="px-2.5 py-1.5 rounded-2xl rounded-bl-none bg-white text-slate-900 text-xs font-bold border border-slate-200 shadow-md">
            <span className="text-base mr-0.5">{customer.wants.emoji}</span>
            {customer.question}
          </div>
          <div className="absolute -bottom-1 left-3 w-2.5 h-2.5 bg-white border-r border-b border-slate-200 rotate-45" />
        </motion.div>
      )}

      {/* Order emoji over waiting (non-active) customers — matches the
          attached customer reference style (small emoji above each
          avatar bubble in the queue). */}
      {!isActive && s === 'waiting' && (
        <div className="mb-1 text-[18px] sm:text-xl select-none">
          {customer.wants.emoji}
        </div>
      )}

      {/* Variant label chip — gives each NPC a visible "type" so
          kids learn to recognise repeat archetypes. */}
      {isActive && s === 'ordering' && (
        <div
          className="mb-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow"
          style={{
            background: customer.variant.ringHex,
            color: 'rgba(15, 23, 42, 0.9)',
          }}
        >
          {customer.variant.label}
        </div>
      )}

      {/* Avatar — round bubble matching the reference style. The
          coloured ring tints with the variant so each customer type
          reads at a glance. */}
      <motion.button
        type="button"
        onClick={onServe}
        whileTap={isActive && onServe ? { scale: 0.92 } : undefined}
        disabled={!isActive || !onServe}
        className={`relative rounded-full flex items-center justify-center shadow-lg transition-all touch-manipulation ${
          isActive
            ? 'w-20 h-20 sm:w-24 sm:h-24 text-4xl sm:text-5xl bg-white hover:bg-slate-50'
            : 'w-12 h-12 sm:w-14 sm:h-14 text-2xl sm:text-3xl bg-white/95'
        } ${s === 'served' ? 'bg-lime-100' : ''} ${s === 'angry' ? 'bg-rose-100' : ''}`}
        style={{
          border: `3px solid ${customer.variant.ringHex}`,
          boxShadow: isActive
            ? `0 8px 18px ${customer.variant.ringHex}40, 0 0 0 4px rgba(255,255,255,0.4)`
            : `0 4px 10px rgba(0,0,0,0.18)`,
        }}
        aria-label={isActive ? `Serve ${customer.name}` : `${customer.name} waiting`}
      >
        {customer.variant.avatar}

        {/* Patience ring for active customer */}
        {isActive && s === 'ordering' && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="6" />
            <motion.circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={patiencePct >= 60 ? '#84cc16' : patiencePct >= 30 ? '#f59e0b' : '#f43f5e'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 46}
              animate={{ strokeDashoffset: 2 * Math.PI * 46 * (1 - patiencePct / 100) }}
              transition={{ duration: 0.2 }}
            />
          </svg>
        )}
      </motion.button>

      {/* # ticket label — matches the reference's #1, #2, #3 style.
          Always visible so the player can track queue order. */}
      <div className="mt-1.5 px-1.5 py-0.5 rounded-md bg-slate-900/85 text-white text-[9px] font-black tabular-nums">
        #{customer.ticket}
      </div>

      {/* Active customer name + TAP cue */}
      {isActive && s === 'ordering' && (
        <div className="mt-1 text-[10px] font-black text-white uppercase tracking-wider drop-shadow inline-flex items-center gap-1">
          {customer.name}
          <span className="px-1.5 py-0.5 rounded-md bg-violet-500/95 text-white text-[9px]">TAP</span>
        </div>
      )}

      {/* Waiting customer linear patience bar */}
      {!isActive && s === 'waiting' && (
        <span className="mt-1 w-10 h-1 rounded-full bg-white/20 overflow-hidden block">
          <span className={`block h-full ${tint}`} style={{ width: '100%' }} />
        </span>
      )}
    </motion.div>
  );
}
