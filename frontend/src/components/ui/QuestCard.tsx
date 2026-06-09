/**
 * Quest-style mission card. Used on dashboards to make modules,
 * chapters, and tasks feel like collectible side-quests.
 *
 * Shape: large icon at left, title + body in the middle, optional
 * rarity chip + reward chips + progress bar. The whole thing sits in a
 * coloured glow ring keyed by accent + has a chunky press-down active
 * state.
 */
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  GLASS,
  GAME_ACCENTS,
  RARITY_CHIP,
  type GameAccent,
} from '../../lib/uiTokens';
import { XPBar } from './XPBar';

export interface QuestCardProps {
  icon: LucideIcon | string;
  title: string;
  subtitle?: string;
  body?: string;
  accent?: GameAccent;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  progress?: number;
  progressLabel?: string;
  rewards?: Array<{ emoji: string; label: string }>;
  tags?: string[];
  onClick?: () => void;
  cta?: string;
  delay?: number;
}

export function QuestCard({
  icon,
  title,
  subtitle,
  body,
  accent = 'violet',
  rarity,
  progress,
  progressLabel,
  rewards,
  tags,
  onClick,
  cta,
  delay = 0,
}: QuestCardProps) {
  const c = GAME_ACCENTS[accent];
  const isIconComponent = typeof icon !== 'string';
  const interactive = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay, type: 'spring', stiffness: 220, damping: 22 }}
      whileHover={interactive ? { y: -2 } : undefined}
      onClick={onClick}
      className={[
        GLASS,
        'rounded-3xl p-5 sm:p-6 relative',
        'ring-2 ring-inset',
        c.ring,
        interactive ? 'cursor-pointer touch-manipulation' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${c.fill}`}
        >
          {isIconComponent ? (
            (() => {
              const Icon = icon as LucideIcon;
              return <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${c.text}`} />;
            })()
          ) : (
            <span className="text-2xl sm:text-3xl leading-none">{icon as string}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className={`text-xs sm:text-sm font-bold ${c.text} mt-0.5 truncate`}>{subtitle}</p>
              )}
            </div>
            {rarity && (
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${RARITY_CHIP[rarity]}`}
              >
                {rarity}
              </span>
            )}
          </div>

          {body && (
            <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {body}
            </p>
          )}

          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${c.fill} ${c.text}`}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {typeof progress === 'number' && (
            <div className="mt-3">
              <XPBar
                percent={progress}
                accent={accent}
                height="sm"
                label={progressLabel}
                caption={`${Math.round(progress)}%`}
              />
            </div>
          )}

          {rewards && rewards.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {rewards.map((r) => (
                <div
                  key={r.label}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-700/40"
                >
                  <span className="text-sm">{r.emoji}</span>
                  <span className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-200">
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {interactive && cta && (
            <div className="mt-4 flex items-center gap-1 text-sm font-bold text-violet-600 dark:text-violet-300">
              {cta}
              <ChevronRight className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
