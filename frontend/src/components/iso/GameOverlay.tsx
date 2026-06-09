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
import { useEffect, useMemo, useRef, useState } from 'react';
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
}

// ─── Quest catalogue ─────────────────────────────────────────────────
// Each entry is a tiny function from state → { done, progress, ... }
// so adding/removing quests is one-line.

interface Quest {
  id: string;
  title: string;
  hint: string;
  emoji: string;
  accent: GameAccent;
  reward: { xp: number; coins?: number; tokens?: number };
  done: (s: GameOverlayState) => boolean;
  /** Optional 0–1 progress for in-flight quests. */
  progress?: (s: GameOverlayState) => number;
  /** Which module/route the host should open. */
  route?: string;
}

const QUESTS: Quest[] = [
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

// (Mascot tip script removed — the Spark companion now drives the
// "what should I try next?" voice through its own service.)

// ─── Component ────────────────────────────────────────────────────────

export function GameOverlay({ state, onQuestClick }: GameOverlayProps) {
  // Evaluate quests with stable derived data.
  const evaluated = useMemo(
    () =>
      QUESTS.map((q) => ({
        ...q,
        isDone: q.done(state),
        progressPct: q.progress ? q.progress(state) * 100 : q.done(state) ? 100 : 0,
      })),
    [state],
  );

  const completedCount = evaluated.filter((q) => q.isDone).length;
  const totalCount = evaluated.length;
  const overallPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // ─── Quest panel open/close ─────────────────────────────────────
  const [questOpen, setQuestOpen] = useState(false);

  // Mascot tip cycling removed — Spark is now the single companion.

  // ─── Quest-complete reward toast ────────────────────────────────
  // Fire a toast when a quest transitions from incomplete → complete.
  const prevDoneIds = useRef<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    title: string;
    emoji: string;
    xp: number;
    coins?: number;
    tokens?: number;
  } | null>(null);

  useEffect(() => {
    // Initial mount — capture which quests are already done so we don't
    // fire stale toasts on page load.
    if (prevDoneIds.current.size === 0 && evaluated.some((q) => q.isDone)) {
      prevDoneIds.current = new Set(evaluated.filter((q) => q.isDone).map((q) => q.id));
      return;
    }
    const newlyComplete = evaluated.find(
      (q) => q.isDone && !prevDoneIds.current.has(q.id),
    );
    if (newlyComplete) {
      setToast({
        title: newlyComplete.title,
        emoji: newlyComplete.emoji,
        xp: newlyComplete.reward.xp,
        coins: newlyComplete.reward.coins,
        tokens: newlyComplete.reward.tokens,
      });
      prevDoneIds.current = new Set(evaluated.filter((q) => q.isDone).map((q) => q.id));
      // Auto-dismiss after 3.5s.
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [evaluated]);

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
          {completedCount < totalCount && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
          )}
          <Scroll className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Quests</span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-200 text-[10px] tabular-nums font-black">
            {completedCount}/{totalCount}
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
              <div className="p-4 sm:p-5 border-b border-white/10 sticky top-0 bg-slate-900/95 backdrop-blur-xl z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Scroll className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-black text-base leading-tight">
                        Today's Quests
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                        {completedCount} of {totalCount} complete
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
                {/* Overall progress */}
                <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-2">
                {evaluated.map((q) => {
                  const c = GAME_ACCENTS[q.accent];
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        if (q.route && onQuestClick) {
                          try {
                            if (q.isDone) {
                              sessionStorage.removeItem('aipreneur_active_quest');
                            } else {
                              sessionStorage.setItem(
                                'aipreneur_active_quest',
                                JSON.stringify({
                                  id: q.id,
                                  title: q.title,
                                  hint: q.hint,
                                  emoji: q.emoji,
                                  route: q.route,
                                  reward: q.reward,
                                }),
                              );
                            }
                          } catch {}
                          onQuestClick(q.route);
                        }
                        setQuestOpen(false);
                      }}
                      className={`w-full text-left rounded-2xl p-3 sm:p-4 bg-white/5 hover:bg-white/10 active:bg-white/[0.12] transition-all border border-white/5 ring-1 ring-inset ${c.ring}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`shrink-0 w-10 h-10 rounded-xl ${c.fill} flex items-center justify-center text-xl`}
                        >
                          {q.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-white text-sm leading-tight">
                              {q.title}
                            </span>
                            {q.isDone ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-300 border border-lime-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Done
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${RARITY_CHIP.rare}`}
                              >
                                +{q.reward.xp} XP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/60 mt-0.5 leading-snug">
                            {q.hint}
                          </p>
                          {/* Progress bar for partial quests */}
                          {!q.isDone && q.progressPct > 0 && q.progressPct < 100 && (
                            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
                                style={{ width: `${q.progressPct}%` }}
                              />
                            </div>
                          )}
                          {/* Reward chips */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {q.reward.coins && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-200 text-[10px] font-bold">
                                <Coins className="w-3 h-3" />
                                {q.reward.coins}
                              </span>
                            )}
                            {q.reward.tokens && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-200 text-[10px] font-bold">
                                <Zap className="w-3 h-3" />
                                {q.reward.tokens}
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
    </div>
  );
}
