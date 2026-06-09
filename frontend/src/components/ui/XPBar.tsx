/**
 * Animated XP / progress bar with a shimmering fill.
 *
 * Render either as a labelled bar ("Lv 4 → Lv 5") with current/max counts
 * or as a bare progress bar. Used in dashboards, quest cards, and the
 * teacher tier progress.
 */
import { motion } from 'framer-motion';
import type { GameAccent } from '../../lib/uiTokens';
import { GAME_ACCENTS } from '../../lib/uiTokens';

export interface XPBarProps {
  /** 0–100. Clamped. */
  percent: number;
  accent?: GameAccent;
  height?: 'sm' | 'md' | 'lg';
  label?: string;
  caption?: string;
  className?: string;
}

export function XPBar({
  percent,
  accent = 'violet',
  height = 'md',
  label,
  caption,
  className = '',
}: XPBarProps) {
  const c = GAME_ACCENTS[accent];
  const pct = Math.max(0, Math.min(100, percent));
  const h = height === 'sm' ? 'h-2' : height === 'lg' ? 'h-4' : 'h-3';

  return (
    <div className={className}>
      {(label || caption) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
              {label}
            </span>
          )}
          {caption && (
            <span className={`text-xs sm:text-sm font-bold ${c.text}`}>{caption}</span>
          )}
        </div>
      )}
      <div
        className={`relative ${h} rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${c.bar}`}
        >
          {/* Shimmer sweep — pure CSS gradient that loops left→right. */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <div className="xp-shimmer absolute inset-y-0 w-1/3 -left-1/3" />
          </div>
        </motion.div>
      </div>

      {/* Local keyframes — scoped so we don't pollute the global stylesheet. */}
      <style>{`
        @keyframes xp-shimmer-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(400%); }
        }
        .xp-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent);
          animation: xp-shimmer-move 2.4s linear infinite;
        }
      `}</style>
    </div>
  );
}
