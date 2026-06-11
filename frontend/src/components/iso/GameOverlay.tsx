/**
 * GameOverlay — gamified HUD layer that sits on top of the iso 3D scene.
 *
 * Why a separate file:
 *   The existing DemoHUD already does the resource bar (AI Tokens /
 *   Popularity / Coins / Streak) at the top. This overlay adds the rest
 *   of the kids-9–12 "I'm playing a game" experience without touching
 *   any Three.js code:
 *
 *     • Quest Log — floating button (top-right) that opens a panel of
 *       daily quests. Quests are derived from real backend state
 *       (products, staff, tokens, shop launched, decoration progress)
 *       so checkmarks are honest signals, not theatre.
 *     • Mascot Guide — friendly buddy bubble in the lower-left that
 *       cycles helpful tips based on what the player still hasn't done.
 *     • Shop Vitals — small floating cards on the right edge showing
 *       Shop Rating + Customer Happiness with animated meters.
 *     • Reward Toast — fires when a quest becomes complete (XP / token
 *       payout flashes across the screen).
 *
 * Positioning:
 *   Every panel anchors away from the existing HUD chrome:
 *     - Top-center  → DemoHUD lives here, we don't touch
 *     - Top-left    → "Globe" back button lives here
 *     - Bottom-center → MobileDock lives here
 *     - Bottom-right → Sparkle FAB lives here
 *   So this overlay claims:
 *     - Top-right     → Quest button
 *     - Right edge    → Shop vitals strip (collapses on mobile)
 *     - Bottom-left   → Mascot bubble (above the dock with safe spacing)
 *
 * Interaction safety:
 *   The root container is `pointer-events-none` so the iso scene under
 *   it stays interactive everywhere. Individual cards opt back in with
 *   `pointer-events-auto`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scroll,
  CheckCircle2,
  Circle,
  X,
  Star,
  Smile,
  Trophy,
  Coins,
  Zap,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { GAME_ACCENTS, RARITY_CHIP, type GameAccent } from '../../lib/uiTokens';

// ─── Shape of the data the overlay reads ──────────────────────────────

export interface GameOverlayState {
  shopName: string;
  shopLaunched: boolean;
  productsCount: number;
  staffCount: number;
  aiTokens: number;
  coins: number;
  level: number;
  xp: number;
  popularityLevel: number;
  /** Whether the player has done ANY interior decoration. */
  interiorCustomized: boolean;
  /** Sales count proxies "customers served" until a real metric exists. */
  totalSales: number;
}

export interface GameOverlayProps {
  state: GameOverlayState;
  /** Optional click handlers — let the host page navigate into modules
   *  when the player taps a quest. Keeps routing decisions outside the
   *  presentational overlay. */
  onQuestClick?: (questId: string) => void;
  /** When true, auto-opens the quest panel once per browser session so
   *  new players see their quest list without having to find the button. */
  autoOpen?: boolean;
}

// ─── Phase 1: Tutorial quests ─────────────────────────────────────────
// Shown on first visit until all 6 are complete. After that the player
// graduates to daily rotating quests.

interface Quest {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  accent: GameAccent;
  reward: { xp: number; coins?: number; tokens?: number };
  done: (s: GameOverlayState) => boolean;
  progress?: (s: GameOverlayState) => number;
  route?: string;
}

const TUTORIAL_QUESTS: Quest[] = [
  {
    id: 'first-product',
    title: 'Design your first product',
    hint: 'Open the Create Product module to brainstorm with AI.',
    emoji: '🎨',
    accent: 'pink',
    reward: { xp: 30, tokens: 10 },
    done: (s) => s.productsCount >= 1,
    progress: (s) => Math.min(1, s.productsCount / 1),
    route: 'create-product',
  },
  {
    id: 'hire-staff',
    title: 'Hire your first team member',
    hint: 'Head to the Operations module and pick a helper.',
    emoji: '👥',
    accent: 'lime',
    reward: { xp: 30, coins: 50 },
    done: (s) => s.staffCount >= 1,
    progress: (s) => Math.min(1, s.staffCount / 1),
    route: 'operation',
  },
  {
    id: 'decorate-shop',
    title: 'Add your style to the shop',
    hint: 'Decorate floors, walls, or shelves in the Decorate module.',
    emoji: '🪴',
    accent: 'cyan',
    reward: { xp: 25, coins: 30 },
    done: (s) => s.interiorCustomized,
    route: 'decorate',
  },
  {
    id: 'earn-tokens',
    title: 'Stack 10 AI Tokens',
    hint: 'Complete quests or top up to unlock more AI actions.',
    emoji: '⚡',
    accent: 'amber',
    reward: { xp: 20 },
    done: (s) => s.aiTokens >= 10,
    progress: (s) => Math.min(1, s.aiTokens / 10),
    route: 'ai-tokens',
  },
  {
    id: 'launch-shop',
    title: 'Launch your shop',
    hint: 'Finish your products + staff, then cut the ribbon!',
    emoji: '🚀',
    accent: 'violet',
    reward: { xp: 60, coins: 100, tokens: 20 },
    done: (s) => s.shopLaunched,
    route: 'manage',
  },
  {
    id: 'serve-customers',
    title: 'Serve 5 customers',
    hint: 'Launched shops gather visitors based on popularity.',
    emoji: '🤝',
    accent: 'orange',
    reward: { xp: 40, coins: 80 },
    done: (s) => s.totalSales >= 5,
    progress: (s) => Math.min(1, s.totalSales / 5),
  },
];

// ─── Phase 2: Daily rotating quests ──────────────────────────────────
// After the tutorial is done, 3 quests are picked from this pool each
// day using a date-based seed. Variety covers community, business,
// learning, and shop-game actions so there's always something new.

interface DailyQuestDef {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  accent: GameAccent;
  reward: { xp: number; coins: number };
  /** 'auto' = derives from GameOverlayState; 'navigate' = marked done on tap. */
  completionType: 'auto' | 'navigate';
  done?: (s: GameOverlayState) => boolean;
  progress?: (s: GameOverlayState) => number;
  route?: string;
}

const DAILY_QUEST_POOL: DailyQuestDef[] = [
  // ── Community / CSR ──────────────────────────────────────────────
  {
    id: 'dq_charity',
    title: 'Do a charity action today',
    hint: 'Give back to the community — head to the CSR module.',
    emoji: '💝',
    accent: 'pink',
    reward: { xp: 60, coins: 80 },
    completionType: 'navigate',
    route: 'csr',
  },
  {
    id: 'dq_csr_explore',
    title: 'Explore CSR opportunities',
    hint: 'See what kindness actions your shop can run this week.',
    emoji: '🌍',
    accent: 'lime',
    reward: { xp: 40, coins: 50 },
    completionType: 'navigate',
    route: 'csr',
  },
  // ── Marketing ────────────────────────────────────────────────────
  {
    id: 'dq_marketing',
    title: 'Run a marketing campaign',
    hint: 'Draft a poster or campaign to boost your crowd.',
    emoji: '📣',
    accent: 'orange',
    reward: { xp: 50, coins: 70 },
    completionType: 'navigate',
    route: 'marketing',
  },
  {
    id: 'dq_marketing2',
    title: 'Check your marketing performance',
    hint: 'Review how your last campaign is doing.',
    emoji: '📊',
    accent: 'cyan',
    reward: { xp: 30, coins: 40 },
    completionType: 'navigate',
    route: 'marketing',
  },
  // ── Innovation / Tech ────────────────────────────────────────────
  {
    id: 'dq_innovation',
    title: 'Unlock a tech innovation',
    hint: 'Research a new upgrade in the Innovation module.',
    emoji: '💡',
    accent: 'amber',
    reward: { xp: 55, coins: 75 },
    completionType: 'navigate',
    route: 'innovation',
  },
  // ── Finance / Analytics ──────────────────────────────────────────
  {
    id: 'dq_finance',
    title: 'Review today\'s profit report',
    hint: 'Check how much your shop is making — read the Finance cards.',
    emoji: '💰',
    accent: 'lime',
    reward: { xp: 35, coins: 50 },
    completionType: 'navigate',
    route: 'finance',
  },
  {
    id: 'dq_analytics',
    title: 'Check your shop analytics',
    hint: 'See visitor counts, sales trends, and your top products.',
    emoji: '📈',
    accent: 'violet',
    reward: { xp: 35, coins: 45 },
    completionType: 'navigate',
    route: 'analytics',
  },
  // ── Products ─────────────────────────────────────────────────────
  {
    id: 'dq_new_product',
    title: 'Add a new product to your shop',
    hint: 'Use AI to brainstorm and price a fresh product.',
    emoji: '🛍️',
    accent: 'pink',
    reward: { xp: 50, coins: 65 },
    completionType: 'auto',
    done: (s) => s.productsCount >= 2,
    progress: (s) => Math.min(1, s.productsCount / 2),
    route: 'product',
  },
  {
    id: 'dq_product_range',
    title: 'Build a range of 5 products',
    hint: 'More products = more customers interested in your shop.',
    emoji: '🏪',
    accent: 'orange',
    reward: { xp: 70, coins: 100 },
    completionType: 'auto',
    done: (s) => s.productsCount >= 5,
    progress: (s) => Math.min(1, s.productsCount / 5),
    route: 'product',
  },
  // ── Staff / Operations ───────────────────────────────────────────
  {
    id: 'dq_grow_team',
    title: 'Grow your team to 3 members',
    hint: 'More helpers = faster service and happier customers.',
    emoji: '👨‍👩‍👧',
    accent: 'lime',
    reward: { xp: 60, coins: 80 },
    completionType: 'auto',
    done: (s) => s.staffCount >= 3,
    progress: (s) => Math.min(1, s.staffCount / 3),
    route: 'operation',
  },
  // ── Decoration ───────────────────────────────────────────────────
  {
    id: 'dq_redecorate',
    title: 'Give your shop a new look',
    hint: 'Swap floors, walls, or shelf styles in the Decorate module.',
    emoji: '🎨',
    accent: 'cyan',
    reward: { xp: 40, coins: 55 },
    completionType: 'navigate',
    route: 'decorate',
  },
  // ── Customers / Shop game ────────────────────────────────────────
  {
    id: 'dq_serve_25',
    title: 'Serve 25 total customers',
    hint: 'Open your shop and keep the queue moving!',
    emoji: '🤝',
    accent: 'orange',
    reward: { xp: 50, coins: 70 },
    completionType: 'auto',
    done: (s) => s.totalSales >= 25,
    progress: (s) => Math.min(1, s.totalSales / 25),
  },
  {
    id: 'dq_serve_100',
    title: 'Reach 100 customers served',
    hint: 'Your shop is booming — keep serving the crowd!',
    emoji: '🏆',
    accent: 'amber',
    reward: { xp: 80, coins: 120 },
    completionType: 'auto',
    done: (s) => s.totalSales >= 100,
    progress: (s) => Math.min(1, s.totalSales / 100),
  },
  {
    id: 'dq_serve_400',
    title: 'Hit 400 customers milestone',
    hint: 'Your business is thriving — 400 happy customers!',
    emoji: '🎉',
    accent: 'violet',
    reward: { xp: 120, coins: 200 },
    completionType: 'auto',
    done: (s) => s.totalSales >= 400,
    progress: (s) => Math.min(1, s.totalSales / 400),
  },
  // ── Tokens / Rewards ─────────────────────────────────────────────
  {
    id: 'dq_tokens_50',
    title: 'Collect 50 AI Tokens',
    hint: 'Stack tokens to power more AI actions across your shop.',
    emoji: '⚡',
    accent: 'amber',
    reward: { xp: 45, coins: 60 },
    completionType: 'auto',
    done: (s) => s.aiTokens >= 50,
    progress: (s) => Math.min(1, s.aiTokens / 50),
    route: 'ai-tokens',
  },
  {
    id: 'dq_claim_reward',
    title: 'Claim your daily reward',
    hint: 'Head to the Rewards section and grab today\'s bonus.',
    emoji: '🎁',
    accent: 'pink',
    reward: { xp: 30, coins: 40 },
    completionType: 'navigate',
    route: 'rewards',
  },
  // ── Level / XP ───────────────────────────────────────────────────
  {
    id: 'dq_level_3',
    title: 'Reach Level 3',
    hint: 'Earn XP by completing quests and serving customers.',
    emoji: '🌟',
    accent: 'violet',
    reward: { xp: 60, coins: 80 },
    completionType: 'auto',
    done: (s) => s.level >= 3,
    progress: (s) => Math.min(1, s.level / 3),
  },
  {
    id: 'dq_level_5',
    title: 'Reach Level 5',
    hint: 'A true entrepreneur — keep grinding to Level 5!',
    emoji: '👑',
    accent: 'amber',
    reward: { xp: 100, coins: 150 },
    completionType: 'auto',
    done: (s) => s.level >= 5,
    progress: (s) => Math.min(1, s.level / 5),
  },
  // ── Shop health ──────────────────────────────────────────────────
  {
    id: 'dq_coins_500',
    title: 'Build a 500-coin wallet',
    hint: 'Earn coins by serving customers and completing quests.',
    emoji: '💎',
    accent: 'lime',
    reward: { xp: 55, coins: 75 },
    completionType: 'auto',
    done: (s) => s.coins >= 500,
    progress: (s) => Math.min(1, s.coins / 500),
  },
];

// ─── Daily quest helpers ──────────────────────────────────────────────

const getToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Deterministically pick 3 quests from the pool using the date as seed. */
const pickDailyQuests = (dateStr: string): DailyQuestDef[] => {
  let hash = 0;
  for (const c of dateStr) hash = Math.imul(hash, 31) + c.charCodeAt(0);
  hash = Math.abs(hash);
  const available = [...DAILY_QUEST_POOL];
  const result: DailyQuestDef[] = [];
  let seed = hash;
  while (result.length < 3 && available.length > 0) {
    const idx = Math.abs(seed) % available.length;
    result.push(available.splice(idx, 1)[0]);
    seed = Math.abs(Math.imul(seed, 1103515245) + 12345);
  }
  return result;
};

const getDailyDoneKey = () => `daily_quests_done_${getToday()}`;

const loadDailyDone = (): Set<string> => {
  try {
    const raw = localStorage.getItem(getDailyDoneKey());
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set<string>();
  } catch { return new Set<string>(); }
};

const saveDailyDone = (ids: Set<string>) => {
  try { localStorage.setItem(getDailyDoneKey(), JSON.stringify([...ids])); } catch {}
};

// ─── Component ────────────────────────────────────────────────────────

export function GameOverlay({ state, onQuestClick, autoOpen }: GameOverlayProps) {
  // ── Tutorial quest evaluation ──────────────────────────────────
  const evaluated = useMemo(
    () =>
      TUTORIAL_QUESTS.map((q) => ({
        ...q,
        isDone: q.done(state),
        progressPct: q.progress ? q.progress(state) * 100 : q.done(state) ? 100 : 0,
      })),
    [state],
  );

  const completedCount = evaluated.filter((q) => q.isDone).length;
  const totalCount = evaluated.length;
  const overallPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Tutorial is complete once all 6 setup quests are done.
  const tutorialComplete = completedCount >= totalCount;

  // ── Daily quest state (active after tutorial is done) ───────────
  const todayStr = getToday();
  const todayQuests = useMemo(() => pickDailyQuests(todayStr), [todayStr]);
  const [dailyDoneIds, setDailyDoneIds] = useState<Set<string>>(loadDailyDone);

  const evaluatedDaily = useMemo(
    () =>
      todayQuests.map((q) => ({
        ...q,
        isDone:
          (q.completionType === 'auto' && q.done ? q.done(state) : false) ||
          dailyDoneIds.has(q.id),
        progressPct: q.progress ? q.progress(state) * 100 : 0,
      })),
    [todayQuests, dailyDoneIds, state],
  );

  const dailyCompletedCount = evaluatedDaily.filter((q) => q.isDone).length;
  const dailyOverallPct = (dailyCompletedCount / 3) * 100;

  // Format today as "Mon, 10 Jun"
  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  // ─── Quest panel open/close ─────────────────────────────────────
  const [questOpen, setQuestOpen] = useState(false);

  // Auto-open once per session when the parent signals incomplete quests.
  const autoOpenFiredRef = useRef(false);
  useEffect(() => {
    if (!autoOpen || autoOpenFiredRef.current) return;
    if (sessionStorage.getItem('quests_panel_shown')) return;
    autoOpenFiredRef.current = true;
    sessionStorage.setItem('quests_panel_shown', '1');
    const t = setTimeout(() => setQuestOpen(true), 600);
    return () => clearTimeout(t);
  }, [autoOpen]);

  // ─── Ribbon-cutting ceremony ─────────────────────────────────────
  const [showRibbon, setShowRibbon] = useState(false);
  const [ribbonCut, setRibbonCut] = useState(false);

  // Mascot tip cycling removed — Spark is now the single companion.

  // ─── Quest-complete reward toast ────────────────────────────────
  const prevDoneIds = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    title: string;
    emoji: string;
    xp: number;
    coins?: number;
    tokens?: number;
  } | null>(null);

  const fireToast = useCallback((t: typeof toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Tutorial quest toasts
  useEffect(() => {
    if (prevDoneIds.current.size === 0 && evaluated.some((q) => q.isDone)) {
      prevDoneIds.current = new Set(evaluated.filter((q) => q.isDone).map((q) => q.id));
      return;
    }
    const newlyComplete = evaluated.find((q) => q.isDone && !prevDoneIds.current.has(q.id));
    if (newlyComplete) {
      fireToast({ title: newlyComplete.title, emoji: newlyComplete.emoji, xp: newlyComplete.reward.xp, coins: newlyComplete.reward.coins, tokens: newlyComplete.reward.tokens });
      prevDoneIds.current = new Set(evaluated.filter((q) => q.isDone).map((q) => q.id));
    }
  }, [evaluated, fireToast]);

  // Daily quest auto-complete toasts (state-based)
  const prevDailyDoneIds = useRef<Set<string>>(new Set(dailyDoneIds));
  useEffect(() => {
    if (!tutorialComplete) return;
    const newlyComplete = evaluatedDaily.find((q) => q.isDone && !prevDailyDoneIds.current.has(q.id));
    if (newlyComplete) {
      fireToast({ title: newlyComplete.title, emoji: newlyComplete.emoji, xp: newlyComplete.reward.xp, coins: newlyComplete.reward.coins });
      prevDailyDoneIds.current = new Set(evaluatedDaily.filter((q) => q.isDone).map((q) => q.id));
    }
  }, [evaluatedDaily, tutorialComplete, fireToast]);

  // Derive happiness + rating from real state (simple heuristic).
  const happiness = Math.max(
    20,
    Math.min(
      100,
      50 +
        (state.shopLaunched ? 20 : 0) +
        Math.min(20, state.staffCount * 5) +
        Math.min(10, state.productsCount * 2),
    ),
  );
  const rating = Math.min(5, 3 + happiness / 50); // 3.0–5.0

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* ── Quest button — top-right ───────────────────────────────
          Anchored away from the centred DemoHUD and the top-left
          "Globe" back button. Animates a pulse ring when there are
          unfinished quests so kids notice it. */}
      <div
        className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <motion.button
          type="button"
          onClick={() => setQuestOpen((v) => !v)}
          whileTap={{ scale: 0.94 }}
          className="relative inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-white/10 text-white font-bold text-sm shadow-xl shadow-black/30"
          aria-label="Open quest log"
        >
          {/* Pulse dot when there are incomplete quests */}
          {(tutorialComplete ? dailyCompletedCount < 3 : completedCount < totalCount) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          )}
          <Scroll className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">{tutorialComplete ? 'Daily' : 'Tutorial'}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 text-[10px] tabular-nums font-black">
            {tutorialComplete ? `${dailyCompletedCount}/3` : `${completedCount}/${totalCount}`}
          </span>
        </motion.button>
      </div>

      {/* ── Quest panel ────────────────────────────────────────── */}
      <AnimatePresence>
        {questOpen && (
          <>
            {/* Backdrop — only on mobile, dismisses panel when tapped. */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuestOpen(false)}
              className="absolute inset-0 bg-black/40 md:hidden pointer-events-auto"
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="absolute top-16 right-3 sm:right-4 w-[calc(100vw-1.5rem)] sm:w-80 md:w-96 max-h-[70vh] overflow-y-auto rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/40 pointer-events-auto"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              {/* ── Panel header — phase-aware ── */}
              <div className="p-4 sm:p-5 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${tutorialComplete ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'}`}>
                      <Scroll className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-black text-base leading-tight">
                        {tutorialComplete ? "Today's Quests" : 'Tutorial Setup'}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                        {tutorialComplete ? todayLabel : `${completedCount} of ${totalCount} complete`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuestOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors"
                    aria-label="Close quest log"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {tutorialComplete && (
                  <p className="text-[11px] text-white/40 mb-2">3 new challenges every day — resets at midnight</p>
                )}
                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tutorialComplete ? dailyOverallPct : overallPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${tutorialComplete ? 'from-violet-400 to-fuchsia-500' : 'from-amber-400 to-orange-500'}`}
                  />
                </div>
              </div>

              {/* ── Quest list ── */}
              <div className="p-3 sm:p-4 space-y-2">
                {(tutorialComplete ? evaluatedDaily : evaluated).map((q) => {
                  const c = GAME_ACCENTS[q.accent];
                  const rewardCoins = 'coins' in q.reward ? q.reward.coins : undefined;
                  const rewardTokens = 'tokens' in q.reward ? (q.reward as { tokens?: number }).tokens : undefined;

                  const handleClick = () => {
                    // Launch-shop quest → show the ribbon-cutting ceremony first
                    if (q.id === 'launch-shop' && !state.shopLaunched && state.productsCount >= 1 && state.staffCount >= 1) {
                      setQuestOpen(false);
                      setRibbonCut(false);
                      setShowRibbon(true);
                      return;
                    }
                    // For daily navigate-type quests, mark done on tap
                    if (tutorialComplete && 'completionType' in q && q.completionType === 'navigate' && !q.isDone) {
                      const next = new Set(dailyDoneIds);
                      next.add(q.id);
                      setDailyDoneIds(next);
                      saveDailyDone(next);
                      fireToast({ title: q.title, emoji: q.emoji, xp: q.reward.xp, coins: rewardCoins });
                    }
                    if (q.route && onQuestClick) {
                      try {
                        if (q.isDone) {
                          sessionStorage.removeItem('aipreneur_active_quest');
                        } else {
                          sessionStorage.setItem('aipreneur_active_quest', JSON.stringify({
                            id: q.id, title: q.title, hint: q.hint, emoji: q.emoji,
                            route: q.route, reward: q.reward,
                          }));
                        }
                      } catch {}
                      onQuestClick(q.route);
                    }
                    setQuestOpen(false);
                  };

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={handleClick}
                      className={`w-full text-left rounded-2xl p-3 sm:p-4 bg-white/5 hover:bg-white/10 active:bg-white/[0.12] transition-all border border-white/5 ring-1 ring-inset ${c.ring} ${q.isDone ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-xl ${c.fill} flex items-center justify-center text-xl`}>
                          {q.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-sm leading-tight">{q.title}</span>
                            {q.isDone ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-300 border border-lime-500/30">
                                <CheckCircle2 className="w-3 h-3" />Done
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${RARITY_CHIP.rare}`}>
                                +{q.reward.xp} XP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/60 mt-0.5 leading-snug">{q.hint}</p>
                          {!q.isDone && q.progressPct > 0 && q.progressPct < 100 && (
                            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${c.bar}`} style={{ width: `${q.progressPct}%` }} />
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {rewardCoins && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-200 text-[10px] font-bold">
                                <Coins className="w-3 h-3" />{rewardCoins}
                              </span>
                            )}
                            {rewardTokens && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-200 text-[10px] font-bold">
                                <Zap className="w-3 h-3" />{rewardTokens}
                              </span>
                            )}
                          </div>
                        </div>
                        {q.isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-lime-400 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/30 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* All-done message for daily phase */}
                {tutorialComplete && dailyCompletedCount >= 3 && (
                  <div className="text-center py-4">
                    <div className="text-3xl mb-1">🎉</div>
                    <p className="text-sm font-black text-white">All done for today!</p>
                    <p className="text-xs text-white/50 mt-0.5">New quests arrive tomorrow</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Shop vitals strip — right edge, hidden on smallest mobile ──
          Sits below the quest button. Two stacked cards.
          Also hidden whenever the quest panel is open — they share the
          top-right corner and used to overlap (see screenshot). The
          panel itself already shows the live state at a glance, so
          dropping the strip while it's open is the right call. */}
      <div
        className={`${questOpen ? 'hidden' : 'hidden sm:flex'} absolute top-24 right-3 sm:right-4 flex-col gap-2 pointer-events-auto`}
      >
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring', damping: 22 }}
          className="w-44 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 px-3 py-2.5 shadow-lg shadow-black/30"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">
                Shop Rating
              </span>
            </div>
            <span className="text-sm font-black text-white tabular-nums">
              {rating.toFixed(1)}
            </span>
          </div>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-amber-300 fill-amber-300' : 'text-white/15'}`}
              />
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.35, type: 'spring', damping: 22 }}
          className="w-44 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-white/10 px-3 py-2.5 shadow-lg shadow-black/30"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="inline-flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-white/60">
                Happiness
              </span>
            </div>
            <span className="text-sm font-black text-white tabular-nums">
              {happiness}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${happiness}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-400"
            />
          </div>
        </motion.div>
      </div>

      {/* Mascot guide bubble removed — the Spark companion (bottom-left,
          rendered separately) is now the single AI-assistant voice on
          this screen. The old "AI Buddy" tip bubble was overlapping
          Spark's speech card in the same corner, so we kept the newer
          cozy companion. */}

      {/* ── Reward toast — top-center under the HUD ──────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
            className="absolute left-1/2 -translate-x-1/2 top-20 sm:top-24 pointer-events-auto"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-3xl bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 shadow-2xl shadow-orange-500/40 border border-white/40">
              <div className="w-12 h-12 rounded-2xl bg-white/30 flex items-center justify-center text-2xl">
                {toast.emoji}
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/90">
                  <Trophy className="w-3 h-3" />
                  Quest Complete!
                </div>
                <div className="text-sm sm:text-base font-black text-white leading-tight truncate">
                  {toast.title}
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/30 text-white text-[10px] font-black">
                    +{toast.xp} XP
                  </span>
                  {toast.coins && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/30 text-white text-[10px] font-black">
                      <Coins className="w-3 h-3" />+{toast.coins}
                    </span>
                  )}
                  {toast.tokens && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/30 text-white text-[10px] font-black">
                      <Zap className="w-3 h-3" />+{toast.tokens}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setToast(null)}
                aria-label="Dismiss reward"
                className="ml-2 w-7 h-7 rounded-full bg-white/30 hover:bg-white/40 text-white flex items-center justify-center shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ribbon-cutting ceremony ─────────────────────────────────
          Shown when the player taps "Launch your shop" for the first
          time and has products + staff ready. A full-screen celebration
          modal with a scissor-cut animation before they head to the
          manage page to officially open. */}
      <AnimatePresence>
        {showRibbon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-auto px-4"
            style={{ zIndex: 60 }}
          >
            <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-md" />

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 18, stiffness: 260 }}
              className="relative w-full max-w-sm"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/60 border border-white/10">

                {/* Header gradient */}
                <div className="relative bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-500 px-6 py-6 text-center overflow-hidden">
                  {/* Decorative background circles */}
                  <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10" />

                  {/* Animated ribbon emoji */}
                  <motion.div
                    animate={ribbonCut
                      ? { scale: [1, 1.4, 0.8, 1.2, 1], rotate: [0, -15, 15, -5, 0] }
                      : { y: [0, -4, 0] }
                    }
                    transition={ribbonCut
                      ? { duration: 0.6 }
                      : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }
                    }
                    className="text-6xl mb-3 relative z-10"
                  >
                    {ribbonCut ? '🎊' : '🎀'}
                  </motion.div>

                  <h2 className="text-xl font-extrabold text-white leading-tight relative z-10">
                    {ribbonCut ? 'Shop is Open!' : 'Ready to Open!'}
                  </h2>
                  <p className="text-sm text-white/80 mt-1 relative z-10">
                    {ribbonCut
                      ? `${state.shopName || 'Your shop'} is now welcoming customers!`
                      : `${state.shopName || 'Your shop'} is all set — cut the ribbon to launch!`}
                  </p>
                </div>

                <div className="bg-slate-900 px-5 py-4">
                  {/* Readiness checklist */}
                  {!ribbonCut && (
                    <div className="flex flex-col gap-2 mb-4">
                      {[
                        { emoji: '📦', label: 'Products', value: `${state.productsCount} ready`, done: state.productsCount >= 1 },
                        { emoji: '👥', label: 'Staff', value: `${state.staffCount} hired`, done: state.staffCount >= 1 },
                        { emoji: '🏪', label: 'Shop', value: 'Built & customised', done: true },
                      ].map(item => (
                        <div key={item.label} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${item.done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/10'}`}>
                          <span className="text-lg">{item.done ? '✅' : item.emoji}</span>
                          <span className="flex-1 text-sm font-semibold text-white">{item.label}</span>
                          <span className={`text-xs font-bold ${item.done ? 'text-emerald-400' : 'text-white/40'}`}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reward preview */}
                  {!ribbonCut && (
                    <div className="flex items-center gap-2 justify-center mb-4">
                      <span className="text-xs text-white/50">Reward:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/20 text-violet-200 text-xs font-bold">
                        <Zap className="w-3 h-3" />+60 XP
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-200 text-xs font-bold">
                        <Coins className="w-3 h-3" />+100
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 text-amber-200 text-xs font-bold">
                        <Sparkles className="w-3 h-3" />+20 tokens
                      </span>
                    </div>
                  )}

                  {/* CTA buttons */}
                  {ribbonCut ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRibbon(false);
                        if (onQuestClick) onQuestClick('manage');
                      }}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 border-b-[3px] border-violet-900 text-white font-black text-base active:translate-y-[2px] active:border-b-[1px] transition-all"
                    >
                      🚀 Go to Your Shop Dashboard
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRibbonCut(true);
                          fireToast({ title: 'Shop launched! 🎊', emoji: '🚀', xp: 60, coins: 100, tokens: 20 });
                          // After 2s, navigate to manage
                          setTimeout(() => {
                            setShowRibbon(false);
                            if (onQuestClick) onQuestClick('manage');
                          }, 2200);
                        }}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 border-b-[3px] border-violet-900 text-white font-black text-base flex items-center justify-center gap-2 active:translate-y-[2px] active:border-b-[1px] transition-all mb-2"
                      >
                        <Scissors className="w-5 h-5" />
                        Cut the Ribbon!
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRibbon(false)}
                        className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                      >
                        Not ready yet — go back
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
