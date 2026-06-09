/**
 * AppLoader — full-viewport friendly loading screen.
 *
 * Replaces the old `var(--bg)` + plain spinner "Loading session…" cards
 * scattered around the app. Theme-aware (uses PAGE + DottedBackground),
 * always centred (no black band at the bottom on tall mobile screens —
 * the underlying div is `min-h-screen` with `flex items-center`), and
 * has a tiny bit of life:
 *
 *   • Three-dot bouncing strip under the title — same vibe as a
 *     loading dot indicator in a real chat app.
 *   • Logo tile springs in with a gentle scale, idles with a soft
 *     up-down float so the screen never feels frozen.
 *   • Sub-label cycles between 3 reassuring hints if `hints` is left
 *     empty — keeps the screen feeling alive on slow networks.
 *
 * Usage:
 *
 *   if (loading) return <AppLoader title="Loading session…" />;
 *
 *   <AppLoader
 *     title="Generating your shop…"
 *     subtitle="This may take a moment"
 *     hints={['Mixing the perfect colour palette', 'Placing the sign',
 *             'Polishing the window…']}
 *   />
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { GLASS, PAGE } from '../../lib/uiTokens';
import { DottedBackground } from './DottedBackground';
import { StarfieldBackground } from './StarfieldBackground';

const DEFAULT_HINTS = [
  'Warming up the city…',
  'Polishing the shop window…',
  'Getting the shopkeeper ready…',
];

interface AppLoaderProps {
  /** Top-line big text. Defaults to "Loading…". */
  title?: string;
  /** Sub-line, e.g. "Setting up your shop". When `hints` is provided,
   *  this is rotated through every ~2 seconds. */
  subtitle?: string;
  /** Optional override icon — falls back to the violet Sparkles tile. */
  icon?: LucideIcon;
  /** Cheerful hints that cycle automatically. If omitted, defaults are
   *  used. Pass `[]` to disable the rotating sub-line entirely (the
   *  static `subtitle` is shown instead). */
  hints?: string[];
}

export function AppLoader({
  title = 'Loading…',
  subtitle,
  icon: Icon = Sparkles,
  hints,
}: AppLoaderProps) {
  const tickerHints = hints?.length === 0 ? null : hints ?? DEFAULT_HINTS;
  const [hintIdx, setHintIdx] = useState(0);

  useEffect(() => {
    if (!tickerHints || tickerHints.length <= 1) return;
    const t = window.setInterval(() => {
      setHintIdx((i) => (i + 1) % tickerHints.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, [tickerHints]);

  const displaySubtitle = subtitle ?? (tickerHints ? tickerHints[hintIdx] : '');

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />
      <div className="min-h-screen flex items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className={`${GLASS} rounded-3xl px-7 py-8 w-full max-w-xs text-center`}
        >
          {/* Logo tile with a soft idle float so the screen feels alive
              even when the JS thread is busy parsing chunks. */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-4 mx-auto inline-flex"
          >
            <span className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-violet-600 border-b-[5px] border-violet-800">
              <Icon className="w-8 h-8 text-white" />
              {/* Pulsing halo — purely cosmetic, signals "still working". */}
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-3xl bg-violet-400"
                initial={{ opacity: 0.35, scale: 1 }}
                animate={{ opacity: 0, scale: 1.4 }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              />
            </span>
          </motion.div>

          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {title}
          </h2>

          {/* Cheerful three-dot bouncer instead of the old spinning ring. */}
          <div className="flex items-center justify-center gap-1.5 mt-2 mb-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-violet-500"
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>

          {displaySubtitle && (
            <motion.p
              key={displaySubtitle}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-sm text-slate-600 dark:text-slate-300 leading-snug"
            >
              {displaySubtitle}
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default AppLoader;
