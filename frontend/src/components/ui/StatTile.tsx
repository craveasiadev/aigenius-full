/**
 * Gamified stat tile — used across dashboards for "AI Tokens", "Level",
 * "Active Students", etc.
 *
 * Shape: tall card with a colour-accented icon tile, big numeric value,
 * label underneath, and an optional progress bar at the bottom. The
 * whole card sits in a soft glow ring keyed by the accent colour so a
 * row of these reads like collectible game cards instead of a row of
 * dashboard widgets.
 *
 * Clickable when `onClick` is provided; otherwise renders as a static
 * panel. Theme-aware via the GAME_ACCENTS palette.
 */
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { GAME_ACCENTS, GLASS, type GameAccent } from '../../lib/uiTokens';

export interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
  accent?: GameAccent;
  /** 0–100. If supplied, a tinted bar renders under the value. */
  progress?: number;
  /** Optional sparkle emoji for that "collectible" reading. */
  emoji?: string;
  onClick?: () => void;
  delay?: number;
}

export function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
  accent = 'violet',
  progress,
  emoji,
  onClick,
  delay = 0,
}: StatTileProps) {
  const c = GAME_ACCENTS[accent];
  const interactive = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      whileHover={interactive ? { y: -3, scale: 1.02 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={[
        GLASS,
        'rounded-3xl p-4 sm:p-5 relative overflow-hidden',
        'ring-2 ring-inset',
        c.ring,
        interactive ? 'cursor-pointer touch-manipulation' : '',
      ].join(' ')}
    >
      {emoji && (
        <span
          aria-hidden
          className="absolute -top-2 -right-2 text-3xl sm:text-4xl select-none rotate-12 opacity-80"
        >
          {emoji}
        </span>
      )}

      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${c.fill}`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {suffix && (
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{suffix}</span>
        )}
      </div>

      <div className="mt-0.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
        {label}
      </div>

      {hint && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">{hint}</div>
      )}

      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${c.bar}`}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </motion.div>
  );
}
