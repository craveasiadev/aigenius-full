/**
 * ModulePage — the shared visual chrome for every Learning module
 * (Product, Marketing, Staff, Innovation, Finance).
 *
 * Why this exists:
 *   Each module page was hand-rolling its own header + lesson card.
 *   The headers drifted (different sizes, different paddings, different
 *   max-widths, Finance had no lesson card at all), and none of them
 *   felt distinctively kid-friendly — they read like standard admin
 *   dashboards. This component is the one place we apply the kid-game
 *   visual language so all 5 modules look like siblings:
 *
 *     • Chunky 3D plastic icon tile in the header (matches the dock).
 *     • Big friendly title + per-module accent tone.
 *     • Lesson card with a 💡 prefix ("Today's Lesson") in a soft tint
 *       that picks up the module's own accent — not a generic violet
 *       for everything.
 *     • Same starfield background everywhere → continuity with the
 *       rest of the game.
 *     • Consistent responsive padding (env safe-area aware).
 *
 * What it deliberately DOESN'T do:
 *   • Touch any module-specific business logic. Children are rendered
 *     verbatim — every list, form, button, modal stays exactly as the
 *     module already wrote it.
 *
 * Usage:
 *   <ModulePage
 *     title="Product Studio"
 *     subtitle="Make + sell your big ideas"
 *     icon={Package}
 *     tone="sky"
 *     onBack={smartBack}
 *     lesson={{
 *       title: "Every product needs a positioning",
 *       body:  "A great product alone isn't enough — decide WHO it's for…",
 *     }}
 *     headerExtras={<TokensChip />}        // optional right-side HUD
 *   >
 *     {children}
 *   </ModulePage>
 */
import { type ReactNode } from 'react';
import { ArrowLeft, Sun, Moon, Lightbulb, type LucideIcon } from 'lucide-react';
import { StarfieldBackground } from '../ui/StarfieldBackground';
import { DottedBackground } from '../ui/DottedBackground';
import { useTheme } from '../../contexts/ThemeContext';
import { GLASS, GLASS_HOVER, PAGE } from '../../lib/uiTokens';

/** Per-module accent tone. Drives the header icon-tile gradient + the
 *  lesson card tint. Each module picks one so all 5 are visually
 *  distinct at a glance but share the same shape language. */
export type ModuleTone = 'sky' | 'orange' | 'lime' | 'violet' | 'amber';

interface ToneStyles {
  /** Header icon-tile gradient (chunky 3D plastic, matches dock tiles). */
  iconTile: string;
  /** Bottom border on the icon-tile (the "3D press" lip). */
  iconTileBorder: string;
  /** Lesson card background tint (soft, kid-friendly). */
  lessonBg: string;
  /** Lesson card border. */
  lessonBorder: string;
  /** Lesson card title ink. */
  lessonTitleInk: string;
  /** Lesson card body ink. */
  lessonBodyInk: string;
  /** Lesson lightbulb-tile background. */
  lessonBulbBg: string;
  /** Lesson lightbulb-tile bottom border. */
  lessonBulbBorder: string;
}

const TONES: Record<ModuleTone, ToneStyles> = {
  sky: {
    iconTile:        'bg-gradient-to-br from-sky-400 to-blue-500',
    iconTileBorder:  'border-blue-700',
    lessonBg:        'bg-sky-50 dark:bg-sky-500/10',
    lessonBorder:    'border-sky-200 dark:border-sky-400/30',
    lessonTitleInk:  'text-sky-900 dark:text-sky-100',
    lessonBodyInk:   'text-sky-800/90 dark:text-sky-200/90',
    lessonBulbBg:    'bg-sky-600',
    lessonBulbBorder:'border-sky-800',
  },
  orange: {
    iconTile:        'bg-gradient-to-br from-orange-400 to-red-500',
    iconTileBorder:  'border-red-700',
    lessonBg:        'bg-orange-50 dark:bg-orange-500/10',
    lessonBorder:    'border-orange-200 dark:border-orange-400/30',
    lessonTitleInk:  'text-orange-900 dark:text-orange-100',
    lessonBodyInk:   'text-orange-800/90 dark:text-orange-200/90',
    lessonBulbBg:    'bg-orange-600',
    lessonBulbBorder:'border-orange-800',
  },
  lime: {
    iconTile:        'bg-gradient-to-br from-lime-400 to-emerald-500',
    iconTileBorder:  'border-emerald-700',
    lessonBg:        'bg-lime-50 dark:bg-emerald-500/10',
    lessonBorder:    'border-lime-200 dark:border-emerald-400/30',
    lessonTitleInk:  'text-emerald-900 dark:text-emerald-100',
    lessonBodyInk:   'text-emerald-800/90 dark:text-emerald-200/90',
    lessonBulbBg:    'bg-emerald-600',
    lessonBulbBorder:'border-emerald-800',
  },
  violet: {
    iconTile:        'bg-gradient-to-br from-violet-400 to-fuchsia-500',
    iconTileBorder:  'border-fuchsia-700',
    lessonBg:        'bg-violet-50 dark:bg-violet-500/10',
    lessonBorder:    'border-violet-200 dark:border-violet-400/30',
    lessonTitleInk:  'text-violet-900 dark:text-violet-100',
    lessonBodyInk:   'text-violet-800/90 dark:text-violet-200/90',
    lessonBulbBg:    'bg-violet-600',
    lessonBulbBorder:'border-violet-800',
  },
  amber: {
    iconTile:        'bg-gradient-to-br from-amber-400 to-orange-500',
    iconTileBorder:  'border-orange-700',
    lessonBg:        'bg-amber-50 dark:bg-amber-500/10',
    lessonBorder:    'border-amber-200 dark:border-amber-400/30',
    lessonTitleInk:  'text-amber-900 dark:text-amber-100',
    lessonBodyInk:   'text-amber-800/90 dark:text-amber-200/90',
    lessonBulbBg:    'bg-amber-600',
    lessonBulbBorder:'border-amber-800',
  },
};

export interface LessonProps {
  /** Short, attention-grabbing line — the lesson's title. Rendered next
   *  to a 💡 prefix so kids parse it as "today's takeaway", not a
   *  generic warning banner. */
  title: string;
  /** 1–3 sentences explaining the lesson. Kid-friendly tone, plain
   *  English, no jargon. */
  body: string;
}

interface ModulePageProps {
  title: string;
  /** Optional sub-title shown under the title on tablet+. */
  subtitle?: string;
  /** Lucide icon class for the chunky header tile. */
  icon: LucideIcon;
  /** Per-module accent tone (see TONES). */
  tone: ModuleTone;
  /** Back button handler — usually `smartBack` from `useSmartBack()`. */
  onBack: () => void;
  /** Optional lesson card data. Omit to skip the lesson banner entirely
   *  (some flows like step-by-step product creation don't want it). */
  lesson?: LessonProps;
  /** Optional extra elements rendered in the header's right slot,
   *  BEFORE the theme toggle. Used for module-specific HUD chips
   *  (e.g. an AI-tokens counter on Marketing). */
  headerExtras?: ReactNode;
  /** Inner `<main>` max-width. Defaults to `max-w-6xl`. */
  containerWidth?: string;
  /** Optional extra classes for the `<main>` wrapper. */
  mainClassName?: string;
  /** Skip rendering the default `<main>` wrapper — for pages that need
   *  full bleed (e.g. the Finance dashboard's custom 2-column grid). */
  bare?: boolean;
  /** Optional 3D hero scene rendered ABOVE the lesson card. Use
   *  `<ModuleHero3D kind="product|marketing|staff|innovation|finance" />`.
   *  On low-tier devices it auto-falls-back to a flat banner. */
  hero?: ReactNode;
  children: ReactNode;
}

export function ModulePage({
  title,
  subtitle,
  icon: Icon,
  tone,
  onBack,
  lesson,
  headerExtras,
  containerWidth = 'max-w-6xl',
  mainClassName = '',
  bare = false,
  hero,
  children,
}: ModulePageProps) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const t = TONES[tone];

  return (
    <div className={PAGE}>
      <StarfieldBackground />
      <DottedBackground />

      {/* ── Header: chunky 3D icon tile + title (+ optional subtitle on
              tablet+) + optional HUD slot + theme toggle. Sticky so the
              kid always has a back-button regardless of scroll. ── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 8px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className={`${containerWidth} mx-auto px-3 sm:px-4 h-16 sm:h-[72px] flex items-center justify-between gap-2`}>
          {/* Back button — 44 px touch target floor. */}
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 active:translate-y-[1px] transition-transform`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          {/* Title cluster — chunky icon tile + title (+ subtitle on sm+). */}
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2.5 sm:gap-3">
            <span
              className={[
                'inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl text-white shrink-0',
                'border-b-[4px] active:translate-y-[2px] active:border-b-[2px] transition-[transform,border-bottom-width]',
                t.iconTile,
                t.iconTileBorder,
              ].join(' ')}
              aria-hidden
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div className="min-w-0 flex flex-col">
              <h1 className="text-base sm:text-lg font-extrabold leading-tight text-slate-900 dark:text-white truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="hidden sm:block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-tight truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right slot — optional module-specific HUD + theme toggle. */}
          <div className="flex items-center gap-2 shrink-0">
            {headerExtras}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`${GLASS} ${GLASS_HOVER} w-11 h-11 rounded-xl flex items-center justify-center active:translate-y-[1px] transition-transform`}
            >
              {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      {bare ? (
        children
      ) : (
        <main className={`${containerWidth} mx-auto px-3 sm:px-4 pt-5 sm:pt-6 pb-24 ${mainClassName}`}>
          {hero}
          {lesson && (
            <div
              className={[
                'rounded-2xl px-4 py-3 sm:py-4 flex items-start gap-3 mb-5 sm:mb-6',
                'border',
                t.lessonBg,
                t.lessonBorder,
              ].join(' ')}
            >
              {/* Bigger chunky lightbulb tile — feels like a CTA button
                  instead of a subtle icon. Same 3D plastic family as
                  the dock tiles so the visual vocabulary stays unified. */}
              <span
                className={[
                  'inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-white shrink-0',
                  'border-b-[3px]',
                  t.lessonBulbBg,
                  t.lessonBulbBorder,
                ].join(' ')}
                aria-hidden
              >
                <Lightbulb className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] sm:text-xs font-black uppercase tracking-wider leading-none mb-1 ${t.lessonBodyInk}`}>
                  Today's Lesson
                </p>
                <p className={`text-sm sm:text-base font-extrabold leading-snug mb-1 ${t.lessonTitleInk}`}>
                  {lesson.title}
                </p>
                <p className={`text-xs sm:text-sm leading-snug ${t.lessonBodyInk}`}>
                  {lesson.body}
                </p>
              </div>
            </div>
          )}
          {children}
        </main>
      )}
    </div>
  );
}
