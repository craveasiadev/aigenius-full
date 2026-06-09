/**
 * FestivalBanner — slim banner at the top of the iso world showing the
 * current seasonal festival. Tappable to dismiss for the day.
 *
 * Reads `getCurrentFestival()` (pure date-based lookup). Dismissal is
 * remembered per-day in localStorage so the banner doesn't nag, but it
 * comes back fresh the next morning.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getCurrentFestival } from '../../data/festivals';
import { COZY_GLOW } from '../../lib/uiTokens';

const KEY = 'aigenius_festival_dismissed_v1';
function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function isDismissedToday(): boolean {
  try { return localStorage.getItem(KEY) === todayStamp(); } catch { return false; }
}
function dismissForToday() {
  try { localStorage.setItem(KEY, todayStamp()); } catch { /* ignore */ }
}

export function FestivalBanner() {
  const festival = getCurrentFestival();
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissedToday());

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        className="fixed z-30 pointer-events-auto select-none"
        style={{
          top:  'calc(env(safe-area-inset-top) + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <div
          className={`${COZY_GLOW} inline-flex items-center gap-2 rounded-full pl-3 pr-1.5 py-1 border-2 border-white/60 dark:border-white/15`}
          // Inline accent so each festival actually feels different at a glance.
          style={{ backgroundColor: festival.accentHex + 'CC' }}
        >
          <span className="text-lg leading-none">{festival.emoji}</span>
          <span className="text-[11px] sm:text-xs font-extrabold text-white drop-shadow-sm max-w-[60vw] truncate">
            {festival.banner}
          </span>
          <button
            type="button"
            onClick={() => { dismissForToday(); setDismissed(true); }}
            aria-label="Hide for today"
            className="w-6 h-6 rounded-full bg-white/30 hover:bg-white/50 text-white flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default FestivalBanner;
