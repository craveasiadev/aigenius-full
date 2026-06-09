/**
 * DockTile — the standard button used by the in-shop UI (HUD action
 * chips, side action stack, the bottom MobileDock).
 *
 * Design language matches the AIgenius system tokens in `uiTokens.ts`:
 *   • Frosted glass face on the inactive state (`GLASS` look).
 *   • Solid violet face on the active state (matches `BTN_3D_PRIMARY`).
 *   • Subtle 3-px bottom border that "presses in" on click, mirroring
 *     the chunky-3D-key pattern the rest of the app uses.
 *   • Theme-aware (`dark:` variants on every surface + ink colour).
 *   • Neutral hover treatment — slight lift + face brighten + icon
 *     wiggle. No coloured glow shadows (system rule).
 *
 * Sizes:
 *   • sm  — 44×44, used in the HUD strip (Quests / Tasks / Trophies)
 *   • md  — 58×58 dock default
 *   • lg  — 64×64, side action stack (Restock / Chest)
 *
 * `variant` only tints the **accent** (badge / pulse dot / icon when
 * inactive). The active state itself always uses the system primary
 * (violet) so the look stays cohesive with the rest of AIgenius.
 */
import { motion, type MotionProps } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type DockVariant = 'violet' | 'amber' | 'cyan' | 'rose' | 'lime' | 'sky';
export type DockSize = 'sm' | 'md' | 'lg';

interface DockTileProps {
  /** Lucide icon component OR a literal emoji string. */
  icon?: LucideIcon;
  emoji?: string;
  label?: string;
  /** Count rendered as a small chip in the top-right corner. */
  badge?: string | number;
  /** Switches the face to the violet primary palette. */
  active?: boolean;
  /** Greys it out + blocks clicks. */
  disabled?: boolean;
  /** Pulsing dot top-right (no badge present) — accent comes from `variant`. */
  pulse?: boolean;
  variant?: DockVariant;
  size?: DockSize;
  onClick?: () => void;
  ariaLabel?: string;
  /** Override the rendered body when icon+label isn't enough. */
  children?: ReactNode;
  /** Optional framer-motion `animate` for ambient bob/shake. */
  animate?: MotionProps['animate'];
  transition?: MotionProps['transition'];
}

// Per-variant ink for the icon + badge when the tile is **inactive**.
// All variants share the system glass face, but the icon picks up the
// accent so each tile still has its own identity at a glance.
const VARIANT_INK: Record<DockVariant, string> = {
  violet: 'text-violet-600 dark:text-violet-300',
  amber:  'text-amber-600 dark:text-amber-300',
  cyan:   'text-cyan-600 dark:text-cyan-300',
  rose:   'text-rose-600 dark:text-rose-300',
  lime:   'text-lime-600 dark:text-lime-300',
  sky:    'text-sky-600 dark:text-sky-300',
};

// Solid badge swatch — matches the system "small chip on a card" look.
const VARIANT_BADGE: Record<DockVariant, string> = {
  violet: 'bg-violet-600 text-white',
  amber:  'bg-amber-600 text-white',
  cyan:   'bg-cyan-600 text-white',
  rose:   'bg-rose-600 text-white',
  lime:   'bg-lime-600 text-white',
  sky:    'bg-sky-600 text-white',
};

// Pulsing-dot palette (ping + solid). Literal class strings so Tailwind
// JIT picks them up.
const PULSE_DOT: Record<DockVariant, { ping: string; dot: string }> = {
  violet: { ping: 'bg-violet-400', dot: 'bg-violet-500' },
  amber:  { ping: 'bg-amber-400',  dot: 'bg-amber-500'  },
  cyan:   { ping: 'bg-cyan-400',   dot: 'bg-cyan-500'   },
  rose:   { ping: 'bg-rose-400',   dot: 'bg-rose-500'   },
  lime:   { ping: 'bg-lime-400',   dot: 'bg-lime-500'   },
  sky:    { ping: 'bg-sky-400',    dot: 'bg-sky-500'    },
};

const SIZE: Record<DockSize, { box: string; icon: string; label: string }> = {
  sm: { box: 'min-w-[46px] min-h-[46px] px-1.5 py-1',     icon: 'w-4 h-4',   label: 'text-[8px]' },
  // md — primary world-dock tile. Scales across three breakpoints so
  // a row of 5 of these + the centre globe fits without overlap even
  // on 360 px iPhones:
  //   • base (320–639 px) → 46×46 with a 20 px icon and 9 px label
  //   • sm (640 px+)      → 58×58
  //   • md (768 px+)      → 64×64
  // The min-w/min-h hold the touch target at the 44 px Apple HIG floor
  // on the narrowest phones and grow comfortably on tablets/desktop.
  // Geometry budget at 360 px viewport (worst-case acceptance width):
  //   max width = min(360-24, 720)        = 336
  //   - container padding (px-1 × 2)      =  -8
  //   - centre-globe spacer (58 px mobile)= -58
  //   - 5 inter-tile gaps × clamp~4 px    = -20
  //                                      ────
  //   remaining budget for 5 tiles        = 250 → 50 px each
  //   We use 46 px so there's a 20 px cushion even with rounding.
  md: { box: 'min-w-[46px] min-h-[46px] sm:min-w-[58px] sm:min-h-[58px] md:min-w-[64px] md:min-h-[64px] px-1.5 py-1 sm:px-2 sm:py-1.5', icon: 'w-5 h-5 sm:w-6 sm:h-6', label: 'text-[9px] sm:text-[10px]' },
  // lg — bumped up so the bottom MobileDock + side action stack read
  // as the primary in-game navigation, not as tiny chips.
  lg: { box: 'min-w-[78px] min-h-[78px] sm:min-w-[86px] sm:min-h-[86px] px-3 py-2.5', icon: 'w-8 h-8', label: 'text-[11px]' },
};

// Inactive face — system frosted glass card. Same recipe as `GLASS` in
// uiTokens, just inlined so the active swap stays in this one file.
const INACTIVE_FACE =
  'bg-white/80 dark:bg-slate-900/70 backdrop-blur-xl ' +
  'border border-slate-200 dark:border-white/10 ' +
  'border-b-[3px] border-b-slate-300 dark:border-b-slate-800 ' +
  'shadow-sm shadow-slate-900/5 dark:shadow-black/20';

// Active face — system violet primary (matches `BTN_3D_PRIMARY`).
const ACTIVE_FACE =
  'bg-violet-600 text-white ' +
  'border border-violet-700 ' +
  'border-b-[3px] border-b-violet-800';

// Hover treatment — neutral, no coloured glow. Just a brighter face and
// a touch more shadow so the tile feels "raised" under the cursor.
const INACTIVE_HOVER =
  'hover:bg-white dark:hover:bg-slate-800 ' +
  'hover:border-slate-300 dark:hover:border-white/20 ' +
  'hover:shadow-md';

const ACTIVE_HOVER =
  'hover:bg-violet-500 hover:border-violet-700';

export function DockTile({
  icon: Icon,
  emoji,
  label,
  badge,
  active = false,
  disabled = false,
  pulse = false,
  variant = 'violet',
  size = 'md',
  onClick,
  ariaLabel,
  children,
  animate,
  transition,
}: DockTileProps) {
  const sz = SIZE[size];

  const face = active ? ACTIVE_FACE : INACTIVE_FACE;
  const hover = disabled ? '' : (active ? ACTIVE_HOVER : INACTIVE_HOVER);

  // Icon + label ink. Active = white over violet; inactive = variant
  // accent so the tile reads as its own colour family at rest, then
  // collapses to a unified violet on selection.
  const iconColor = active ? 'text-white' : VARIANT_INK[variant];
  const labelColor = active
    ? 'text-white'
    : 'text-slate-700 dark:text-slate-200';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      aria-pressed={active}
      // The tilt + lift on hover is doing the "3D feel" job — a real
      // three.js scene per button would be wildly overkill (and we're
      // already burning one WebGL context for the iso world). CSS 3D
      // transforms get us the same look at zero cost. We rotate around
      // X *and* Y so the tile catches a "depth" angle on the way up.
      whileHover={disabled ? undefined : {
        y: -4,
        rotateX: -8,
        rotateY: 6,
        scale: 1.04,
      }}
      whileTap={disabled ? undefined : { scale: 0.95, rotateX: 0, rotateY: 0 }}
      animate={animate}
      transition={transition ?? { type: 'spring', stiffness: 380, damping: 22 }}
      style={{
        // Give every tile its own perspective context so rotateX/Y
        // actually skew the face instead of just shrinking it.
        transformStyle: 'preserve-3d',
        transformPerspective: 600,
      }}
      className={[
        'group relative flex flex-col items-center justify-center gap-0.5',
        sz.box,
        'rounded-2xl',
        // Chunky 3D press pattern — matches BTN_3D_* in uiTokens.
        'active:translate-y-[2px] active:border-b-[1px]',
        'transition-[transform,border-bottom-width,background-color,border-color,box-shadow] duration-150',
        'touch-manipulation',
        face,
        hover,
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children ?? (
        <>
          {Icon && (
            <Icon
              className={`${sz.icon} ${iconColor} transition-transform duration-200 group-hover:scale-110`}
            />
          )}
          {emoji && (
            <span
              className={`${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'} leading-none transition-transform duration-200 group-hover:scale-110`}
              aria-hidden
            >
              {emoji}
            </span>
          )}
          {label && (
            <span
              className={[
                sz.label,
                'font-bold leading-none uppercase tracking-wider',
                labelColor,
              ].join(' ')}
            >
              {label}
            </span>
          )}
        </>
      )}

      {/* Hover sparkle field — four little dots that drift up + fade
          out when the cursor lands on the tile. Drawn as absolutely
          positioned spans driven by tailwind `group-hover` so they
          cost nothing while idle. The dot colour follows the tile's
          variant so each button's "burst" matches its identity. */}
      {!disabled && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-visible opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={[
                'absolute w-1 h-1 rounded-full',
                PULSE_DOT[variant].dot,
                // Each dot rides its own delay so they stagger; tw
                // animate-ping does the drift + fade for free.
                'animate-ping',
              ].join(' ')}
              style={{
                top: i % 2 === 0 ? '-6px' : 'auto',
                bottom: i % 2 === 0 ? 'auto' : '-6px',
                left: `${20 + i * 20}%`,
                animationDelay: `${i * 180}ms`,
                animationDuration: '1.2s',
              }}
            />
          ))}
        </span>
      )}

      {/* Count chip — solid accent swatch, top-right corner. Matches the
          "small chip on a card" pattern used elsewhere in the app. */}
      {typeof badge !== 'undefined' && badge !== '' && (
        <span
          className={[
            'absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full',
            'text-[10px] font-bold flex items-center justify-center',
            'border-2 border-white dark:border-slate-900 shadow-sm',
            VARIANT_BADGE[variant],
          ].join(' ')}
        >
          {badge}
        </span>
      )}

      {/* Pulsing dot — drawn instead of the badge when there's no count
          to show but the tile still wants attention. */}
      {pulse && typeof badge === 'undefined' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${PULSE_DOT[variant].ping}`} />
          <span className={`relative inline-flex rounded-full h-3 w-3 ${PULSE_DOT[variant].dot}`} />
        </span>
      )}
    </motion.button>
  );
}

/**
 * DockTray — kept exported in case a future surface wants the grouped
 * "tray" container. Currently unused; the in-shop UI floats individual
 * tiles directly. The tray now uses the system frosted-glass surface
 * (no sky-blue gradient) so if it does come back it matches.
 */
export function DockTray({
  children,
  className = '',
  orientation = 'horizontal',
}: {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  return (
    <div
      className={[
        'rounded-3xl',
        'bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl',
        'border border-slate-200/70 dark:border-white/10',
        'shadow-md shadow-slate-900/5 dark:shadow-black/20',
        'px-2.5 py-2.5',
        orientation === 'horizontal' ? 'flex gap-2' : 'flex flex-col gap-2',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
