/**
 * RewardBurst — the "wow moment" overlay that fires when an achievement is
 * granted (any badge in `useAutoAwardBadges`, no matter which page is open).
 *
 * Subscribes to `CompanionProvider.latestAward`. When a new award arrives:
 *   • A glowing card slides in centred on the screen.
 *   • Confetti rains for ~2s.
 *   • The +XP and +coins numbers count up from 0 (juicy tick).
 *   • Auto-dismisses after ~3.6s or on tap; calls `clearAward()` so it
 *     can fire again on the next badge without manual reset.
 *
 * Hooked into the CompanionProvider's celebration pathway specifically so
 * pages don't each need their own award listener — the dashboard wires
 * `onBadgeAwarded` once into `companion.celebrate()` and every page that
 * mounts this overlay shows the moment automatically.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Zap, Gem } from 'lucide-react';
import { Confetti } from '../Confetti';
import { useSpark } from '../companion/CompanionProvider';
import { sfxReward } from '../../lib/sfx';
import { COZY_GLOW } from '../../lib/uiTokens';

const DURATION_MS = 3600;
const COUNT_UP_MS = 1200;

/** Tween a number from 0 → target over `ms` ms (eased). */
function useCountUp(target: number, ms: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out cubic — punchy at the start, settles smoothly
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function RewardBurst() {
  const { latestAward, clearAward } = useSpark();

  // Auto-dismiss timer, restarted whenever a fresh award lands. Plays the
  // sparkly chime exactly once per new award (depends on `latestAward.id`).
  useEffect(() => {
    if (!latestAward) return;
    sfxReward();
    const t = window.setTimeout(() => clearAward(), DURATION_MS);
    return () => window.clearTimeout(t);
  }, [latestAward, clearAward]);

  return (
    <AnimatePresence>
      {latestAward && (
        <BurstOverlay key={latestAward.id} award={latestAward} onDismiss={clearAward} />
      )}
    </AnimatePresence>
  );
}

function BurstOverlay({
  award, onDismiss,
}: {
  award: { id: number; badgeId: string; prettyName: string; xp: number; coins: number };
  onDismiss: () => void;
}) {
  const xp = useCountUp(award.xp, COUNT_UP_MS);
  const coins = useCountUp(award.coins, COUNT_UP_MS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-6 pointer-events-auto"
      onClick={onDismiss}
      role="dialog"
      aria-label="Achievement unlocked"
    >
      {/* Dim only enough to focus attention — not full black, so the
          underlying game still reads as "alive". */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />

      <Confetti show />

      <motion.div
        initial={{ scale: 0.6, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.85, y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className={`${COZY_GLOW} relative max-w-sm w-full rounded-3xl px-6 py-7 text-center border-2 border-white/60 dark:border-white/15 bg-gradient-to-br from-amber-100 via-rose-100 to-violet-100 dark:from-amber-500/40 dark:via-rose-500/30 dark:to-violet-500/40`}
      >
        <motion.span
          // The little trophy bounce on entry — kid juice.
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 14, delay: 0.1 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-amber-500 border-b-[6px] border-amber-700 shadow-xl mb-3"
        >
          <Trophy className="w-10 h-10 text-white drop-shadow" />
        </motion.span>

        <p className="text-[11px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-200">
          Achievement unlocked
        </p>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
          {award.prettyName}
        </h2>

        <div className="mt-4 flex items-center justify-center gap-3">
          {award.xp > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 text-amber-700 dark:text-amber-200 font-extrabold tabular-nums">
              <Zap className="w-4 h-4" />
              +{xp} XP
            </span>
          )}
          {award.coins > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 text-yellow-700 dark:text-yellow-200 font-extrabold tabular-nums">
              <Gem className="w-4 h-4" />
              +{coins}
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-600 dark:text-slate-300 italic">
          Tap anywhere to continue ✨
        </p>
      </motion.div>
    </motion.div>
  );
}

export default RewardBurst;
