/**
 * KidStat — a small celebratory stat card for the Learning modules.
 *
 *   ┌──────────────────────────────────────────┐
 *   │   ┌────┐   PRODUCTS                       │
 *   │   │ 📦 │   12                             │
 *   │   └────┘   ↑ 3 this week                  │
 *   └──────────────────────────────────────────┘
 *
 * Chunky 3D plastic icon tile + caps label + big tabular-nums value
 * + optional caption. Each card picks one of 6 accent tones so a row
 * of stats reads as a colourful playful set, not a corporate grid.
 *
 * Use this anywhere a module page wants to show a quick metric to the
 * kid in a way that feels like a game-stat panel rather than a finance
 * dashboard.
 */
import type { LucideIcon, ReactNode } from 'react';
import { GLASS } from '../../lib/uiTokens';

export type KidStatTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'orange';

const TONE: Record<KidStatTone, { tile: string; border: string }> = {
  sky:     { tile: 'bg-gradient-to-br from-sky-400 to-blue-500',         border: 'border-blue-700' },
  emerald: { tile: 'bg-gradient-to-br from-emerald-400 to-green-500',    border: 'border-green-700' },
  amber:   { tile: 'bg-gradient-to-br from-amber-400 to-orange-500',     border: 'border-orange-700' },
  rose:    { tile: 'bg-gradient-to-br from-rose-400 to-pink-500',        border: 'border-pink-700' },
  violet:  { tile: 'bg-gradient-to-br from-violet-400 to-fuchsia-500',   border: 'border-fuchsia-700' },
  orange:  { tile: 'bg-gradient-to-br from-orange-400 to-red-500',       border: 'border-red-700' },
};

interface KidStatProps {
  /** Lucide icon component OR a literal emoji string. Emojis read more
   *  kid-friendly for "fun" metrics; icons are cleaner for "official"
   *  ones. The component renders whichever is provided. */
  icon?: LucideIcon;
  emoji?: string;
  /** Tiny caps label above the value (e.g. "PRODUCTS"). */
  label: string;
  /** The metric itself — string or number. Rendered tabular-nums so
   *  digits line up nicely with neighbouring KidStat cards. */
  value: ReactNode;
  /** Optional caption under the value — a hint, delta, or unit. */
  caption?: ReactNode;
  tone?: KidStatTone;
  /** When set, the card itself becomes a button. Otherwise it renders
   *  as a static div. */
  onClick?: () => void;
}

export function KidStat({
  icon: Icon,
  emoji,
  label,
  value,
  caption,
  tone = 'sky',
  onClick,
}: KidStatProps) {
  const t = TONE[tone];
  const isButton = typeof onClick === 'function';

  const inner = (
    <>
      <span
        className={[
          'inline-flex items-center justify-center shrink-0',
          'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-white',
          'border-b-[4px] active:translate-y-[2px] active:border-b-[2px]',
          'transition-[transform,border-bottom-width]',
          t.tile,
          t.border,
        ].join(' ')}
        aria-hidden
      >
        {Icon && <Icon className="w-5 h-5 sm:w-6 sm:h-6" />}
        {emoji && <span className="text-xl sm:text-2xl leading-none">{emoji}</span>}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1.5 truncate">
          {label}
        </p>
        <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none">
          {value}
        </p>
        {caption && (
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
            {caption}
          </p>
        )}
      </div>
    </>
  );

  const className = [
    GLASS,
    'rounded-2xl p-3 sm:p-4 flex items-center gap-3',
    isButton ? 'hover:brightness-110 active:translate-y-[1px] transition-[transform,filter] cursor-pointer text-left w-full' : '',
  ].join(' ');

  if (isButton) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return <div className={className}>{inner}</div>;
}
