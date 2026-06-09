/**
 * Spark — the persistent AI imagination companion.
 *
 * A soft floating bubble that lives in the corner of the screen, gently bobs,
 * and reacts to game events through the `CompanionProvider` bus. Tapping it
 * opens a small panel with a kid-friendly creative prompt fetched from
 * `sparkService` (LLM if available, otherwise a curated local bank). A
 * "give me another" button gets a fresh idea on demand.
 *
 * Design choices:
 *   • Cozy warm palette (COZY_GRADIENT / COZY_GLOW) so Spark visually
 *     breaks from the cool slate UI and reads as a creature, not a chip.
 *   • Hides itself when the provider's `hidden` flag is set (edit modes,
 *     full-screen overlays) — pages opt out, they don't tear it down.
 *   • Three mood states drive subtle visual changes — calm (idle), bouncier
 *     animation (excited), confetti pulse (celebrating).
 *   • Speech bubble shows the provider's current `message` (set by cheer/
 *     say/celebrate) — auto-dismisses on its own timer.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { useSpark } from './CompanionProvider';
import { getSparkPrompt, type SparkPromptKind } from '../../services/sparkService';
import { COZY_GRADIENT, COZY_GLOW } from '../../lib/uiTokens';

interface SparkProps {
  /** Default prompt category for the tap-open panel. */
  promptKind?: SparkPromptKind;
  /** Override the friendly name shown in the panel header. */
  name?: string;
}

export function Spark({ promptKind = 'idea', name = 'Spark' }: SparkProps) {
  const { mood, message, hidden } = useSpark();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch a prompt the first time the panel opens (or on "another").
  const fetchPrompt = async (fresh = false) => {
    setLoading(true);
    try {
      const r = await getSparkPrompt(promptKind, { fresh });
      setPrompt(r.text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !prompt) void fetchPrompt(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (hidden) return null;

  // Mood → motion tweaks. Idle = slow bob; excited = bigger bob; celebrating
  // = quick pulse so the kid's eye catches it even mid-action.
  const bobAmp = mood === 'celebrating' ? 6 : mood === 'excited' ? 4 : 2.5;
  const bobDur = mood === 'celebrating' ? 0.55 : mood === 'excited' ? 0.9 : 1.6;

  return (
    <div
      className="fixed z-40 pointer-events-none select-none"
      // Sit above the mobile dock + safe-area inset; left so it never
      // overlaps the right-side top-up / settings buttons.
      style={{
        left: 'max(env(safe-area-inset-left), 12px)',
        bottom: 'calc(env(safe-area-inset-bottom) + 86px)',
      }}
      aria-live="polite"
    >
      {/* ── Speech bubble (event-driven message above the mascot) ── */}
      <AnimatePresence>
        {message && !open && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="mb-2 max-w-[220px]"
          >
            <div className={`${COZY_GRADIENT} ${COZY_GLOW} rounded-2xl px-3 py-2 text-[13px] font-bold text-slate-800 dark:text-slate-100 border border-white/40 dark:border-white/10`}>
              {message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mascot bubble ── */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Spark' : 'Open Spark'}
        animate={{ y: [0, -bobAmp, 0] }}
        transition={{ duration: bobDur, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scale: 0.92 }}
        className={`${COZY_GRADIENT} ${COZY_GLOW} pointer-events-auto relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] border-white/60 dark:border-white/15`}
      >
        <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-200 drop-shadow" />
        {mood === 'celebrating' && (
          // Soft pulse ring during big celebrations.
          <span className="absolute inset-0 rounded-full ring-4 ring-amber-300/60 animate-ping" />
        )}
      </motion.button>

      {/* ── Tap-open panel (creative prompt) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="pointer-events-auto absolute bottom-[72px] left-0 w-[270px]"
          >
            <div className={`${COZY_GRADIENT} ${COZY_GLOW} rounded-2xl p-3 border border-white/50 dark:border-white/10`}>
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-200" />
                  {name} says…
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="w-7 h-7 rounded-md bg-white/40 dark:bg-black/20 hover:bg-white/60 text-slate-700 dark:text-slate-200 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[13px] leading-snug font-semibold text-slate-800 dark:text-slate-100 min-h-[40px]">
                {loading ? 'Hmm, thinking…' : (prompt ?? 'Tap to get an idea!')}
              </p>
              <button
                type="button"
                onClick={() => void fetchPrompt(true)}
                disabled={loading}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/60 dark:bg-black/30 hover:bg-white/80 text-[11px] font-bold text-slate-800 dark:text-slate-100 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Another!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Spark;
