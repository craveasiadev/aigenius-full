/**
 * Shared UI design tokens — one source of truth for the AIpreneur look.
 *
 * Design rules:
 *   • NO gradient backgrounds anywhere except this file (and even then,
 *     gradients are only used on the headline accent + one decorative
 *     accent stripe). Solid colours otherwise.
 *   • NO coloured glow shadows (`shadow-violet-500/N` etc). Neutral
 *     drops only.
 *   • Cards use a frosted glass blur with subtle neutral borders.
 *   • Primary buttons use the "chunky 3D plastic key" pattern — a thick
 *     bottom border that gives the button height, and an active state
 *     that pushes the face down by the same amount, like a real button
 *     being pressed.
 *   • All tokens are theme-aware via Tailwind `dark:` variants. The
 *     darkMode strategy is `class` (set on <html>) and is owned by the
 *     global ThemeProvider in src/contexts/ThemeContext.tsx.
 *   • Touch-friendly: minimum tap target heights, `touch-manipulation`
 *     to prevent double-tap zoom on mobile.
 *
 * Usage:
 *   import { GLASS, BTN_3D_PRIMARY } from '@/lib/uiTokens';
 *   <div className={`${GLASS} rounded-3xl p-6`}>...</div>
 *   <button className={`${BTN_3D_PRIMARY} px-6 py-3`}>Save</button>
 */

/** Frosted-glass card. Pair with `rounded-*`, `p-*`, etc. on the element. */
export const GLASS =
  'bg-white/70 dark:bg-slate-900/60 ' +
  'backdrop-blur-xl ' +
  'border border-slate-200/70 dark:border-white/10 ' +
  'shadow-md shadow-slate-900/5 dark:shadow-black/20';

/** Hover state for an interactive GLASS card. Combine with GLASS. */
export const GLASS_HOVER =
  'hover:bg-white dark:hover:bg-slate-900/80 ' +
  'hover:border-slate-300 dark:hover:border-white/20 ' +
  'hover:shadow-lg ' +
  'transition-all';

/** A small icon tile — square, neutral background, used as the "head"
 *  of cards, badges, and CTA labels throughout the app. */
export const ICON_TILE =
  'w-12 h-12 rounded-2xl ' +
  'bg-white dark:bg-slate-800 ' +
  'border border-slate-200 dark:border-white/10 ' +
  'flex items-center justify-center shadow-sm';

/** Smaller icon tile variant for tight UI (segmented controls, inline
 *  badges, etc). 36-px square. */
export const ICON_TILE_SM =
  'w-9 h-9 rounded-xl ' +
  'bg-white dark:bg-slate-800 ' +
  'border border-slate-200 dark:border-white/10 ' +
  'flex items-center justify-center shadow-sm';

/** Chunky 3D primary button. The thick bottom border acts as the
 *  "shadow side" of a physical plastic key; on :active we push the
 *  face down + shrink the bottom border so it reads as pressed in.
 *  Solid violet — no gradient, no glow. */
export const BTN_3D_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-2xl ' +
  'bg-violet-600 text-white font-bold ' +
  'border-b-[5px] border-violet-800 ' +
  'hover:bg-violet-500 hover:border-violet-700 ' +
  'active:translate-y-[3px] active:border-b-[2px] ' +
  'disabled:opacity-60 disabled:hover:bg-violet-600 disabled:active:translate-y-0 disabled:active:border-b-[5px] ' +
  'transition-[transform,border-bottom-width,background-color] duration-100 ' +
  'touch-manipulation';

/** Same plastic-key pattern but for secondary actions. Theme-aware
 *  surface so it lives well on both light + dark pages. */
export const BTN_3D_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-2xl ' +
  'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold ' +
  'border border-slate-200 dark:border-white/10 ' +
  'border-b-[5px] border-b-slate-300 dark:border-b-slate-900 ' +
  'hover:bg-slate-50 dark:hover:bg-slate-700 ' +
  'active:translate-y-[3px] active:border-b-[2px] ' +
  'transition-[transform,border-bottom-width,background-color] duration-100 ' +
  'touch-manipulation';

/** Smaller-padding variant of the primary 3D button — used in nav bars
 *  and other tight UI. */
export const BTN_3D_PRIMARY_SM =
  'inline-flex items-center gap-1.5 rounded-xl ' +
  'bg-violet-600 text-white text-sm font-semibold ' +
  'border-b-[3px] border-violet-800 ' +
  'hover:bg-violet-500 hover:border-violet-700 ' +
  'active:translate-y-[2px] active:border-b-[1px] ' +
  'transition-[transform,border-bottom-width,background-color] duration-100 ' +
  'touch-manipulation';

/** Inverted 3D primary — white face for use on dark cards/sections. */
export const BTN_3D_ON_DARK =
  'inline-flex items-center justify-center gap-2 rounded-2xl ' +
  'bg-white text-slate-900 font-bold ' +
  'border-b-[5px] border-slate-300 ' +
  'hover:bg-slate-100 ' +
  'active:translate-y-[3px] active:border-b-[2px] ' +
  'transition-[transform,border-bottom-width,background-color] duration-100 ' +
  'touch-manipulation';

/** Input field with the same glass-on-surface treatment as the cards. */
export const FIELD =
  'w-full rounded-2xl ' +
  'bg-white/80 dark:bg-slate-900/60 ' +
  'border border-slate-200 dark:border-white/10 ' +
  'border-b-[3px] border-b-slate-300 dark:border-b-slate-800 ' +
  'text-slate-900 dark:text-white ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 ' +
  'focus:outline-none focus:border-violet-400 focus:border-b-violet-500 dark:focus:border-violet-400 ' +
  'transition-colors';

/** Page-level background container. Solid slate with a faint dotted
 *  texture overlay handled by `DottedBackground`. Compose with
 *  min-h-screen and any extra layout classes the page needs. */
export const PAGE =
  'min-h-screen relative isolate ' +
  'bg-slate-50 dark:bg-slate-950 ' +
  'text-slate-900 dark:text-slate-50 ' +
  'antialiased transition-colors duration-300';

// ────────────────────────────────────────────────────────────────────
// GAME-FEEL TOKENS — for the kids-aged-9–12 "futuristic learning game"
// surfaces. Use sparingly on top of the calmer base tokens above. The
// gradient + glow rules from the header docstring do NOT apply here —
// these tokens deliberately use vibrant gradients and accent rings.
// ────────────────────────────────────────────────────────────────────

/** Accent ramp keyed by colour family. Use the `ring` and `text` for
 *  StatTile glow rings; `fill` for the icon tile background. */
export const GAME_ACCENTS = {
  blue: {
    ring: 'ring-blue-300/70 dark:ring-blue-500/40',
    fill: 'bg-blue-100 dark:bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-300',
    bar: 'from-blue-400 to-cyan-400',
  },
  lime: {
    ring: 'ring-lime-300/70 dark:ring-lime-500/40',
    fill: 'bg-lime-100 dark:bg-lime-500/15',
    text: 'text-lime-600 dark:text-lime-300',
    bar: 'from-lime-400 to-emerald-400',
  },
  amber: {
    ring: 'ring-amber-300/70 dark:ring-amber-500/40',
    fill: 'bg-amber-100 dark:bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-300',
    bar: 'from-amber-400 to-orange-400',
  },
  orange: {
    ring: 'ring-orange-300/70 dark:ring-orange-500/40',
    fill: 'bg-orange-100 dark:bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-300',
    bar: 'from-orange-400 to-rose-400',
  },
  pink: {
    ring: 'ring-pink-300/70 dark:ring-pink-500/40',
    fill: 'bg-pink-100 dark:bg-pink-500/15',
    text: 'text-pink-600 dark:text-pink-300',
    bar: 'from-pink-400 to-rose-400',
  },
  violet: {
    ring: 'ring-violet-300/70 dark:ring-violet-500/40',
    fill: 'bg-violet-100 dark:bg-violet-500/15',
    text: 'text-violet-600 dark:text-violet-300',
    bar: 'from-violet-400 to-fuchsia-400',
  },
  cyan: {
    ring: 'ring-cyan-300/70 dark:ring-cyan-500/40',
    fill: 'bg-cyan-100 dark:bg-cyan-500/15',
    text: 'text-cyan-600 dark:text-cyan-300',
    bar: 'from-cyan-400 to-sky-400',
  },
} as const;

export type GameAccent = keyof typeof GAME_ACCENTS;

/** Chunky kid-friendly tab pill. Active state uses violet fill. */
export const GAME_TAB =
  'inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-sm ' +
  'border-b-[3px] transition-[transform,border-bottom-width,background-color,color] duration-100 ' +
  'whitespace-nowrap touch-manipulation';

export const GAME_TAB_ACTIVE =
  'bg-violet-600 text-white border-violet-800 ' +
  'hover:bg-violet-500 active:translate-y-[2px] active:border-b-[1px]';

export const GAME_TAB_INACTIVE =
  'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 ' +
  'border-slate-300 dark:border-slate-900 ' +
  'hover:bg-slate-50 dark:hover:bg-slate-700 ' +
  'active:translate-y-[2px] active:border-b-[1px]';

// ── Cozy palette ────────────────────────────────────────────────────────
// Warm, magical accents reserved for *new* feel-good surfaces (the AI
// companion, reward celebrations, festivals, pet UI). Deliberately ring-
// fenced from the slate/violet system tokens above — so the everyday app
// chrome stays calm while these moments pop. Use only on opt-in surfaces.

export const COZY_ACCENTS = {
  peach:    { bg: 'bg-orange-100 dark:bg-orange-500/20',     ring: 'ring-orange-300 dark:ring-orange-400/50', text: 'text-orange-700 dark:text-orange-200', glow: 'shadow-orange-300/40 dark:shadow-orange-400/30' },
  rose:     { bg: 'bg-rose-100 dark:bg-rose-500/20',         ring: 'ring-rose-300 dark:ring-rose-400/50',     text: 'text-rose-700 dark:text-rose-200',     glow: 'shadow-rose-300/40 dark:shadow-rose-400/30' },
  butter:   { bg: 'bg-amber-100 dark:bg-amber-500/20',       ring: 'ring-amber-300 dark:ring-amber-400/50',   text: 'text-amber-800 dark:text-amber-200',   glow: 'shadow-amber-300/50 dark:shadow-amber-400/30' },
  mint:     { bg: 'bg-emerald-100 dark:bg-emerald-500/20',   ring: 'ring-emerald-300 dark:ring-emerald-400/50', text: 'text-emerald-700 dark:text-emerald-200', glow: 'shadow-emerald-300/40 dark:shadow-emerald-400/30' },
  lavender: { bg: 'bg-violet-100 dark:bg-violet-500/20',     ring: 'ring-violet-300 dark:ring-violet-400/50', text: 'text-violet-700 dark:text-violet-200', glow: 'shadow-violet-300/40 dark:shadow-violet-400/30' },
} as const;

export type CozyAccent = keyof typeof COZY_ACCENTS;

/** Warm playful gradient — saved for the AI companion's bubble and the
 *  reward burst card. Not used anywhere else by design. */
export const COZY_GRADIENT =
  'bg-gradient-to-br from-amber-200 via-rose-200 to-violet-200 ' +
  'dark:from-amber-400/30 dark:via-rose-400/30 dark:to-violet-400/30';

/** Soft outer glow for celebration / companion surfaces. */
export const COZY_GLOW = 'shadow-lg shadow-amber-300/40 dark:shadow-amber-500/20';

/** Playful motion curves — pass to framer-motion `transition.ease`. Reserved
 *  for cozy-layer moments so they read distinct from the rest of the app's
 *  default linear/easeInOut. */
export const EASE_PLAYFUL = [0.34, 1.56, 0.64, 1] as const;   // soft overshoot bounce
export const EASE_SOFT    = [0.22, 1, 0.36, 1] as const;       // gentle ease-out
export const SPRING_BOUNCY = { type: 'spring', stiffness: 340, damping: 16 } as const;

// ── Roblox-style chunky 3D buttons ─────────────────────────────────────
// Pattern: a vibrant gradient body + a thick darker bottom border that
// "pushes down" on tap (translate-y to match the lost height + collapse
// the border to 1px). Pair with `rounded-2xl` and a bold white label.
//
// Reserved for in-game action buttons + the inventory UI; everyday admin
// UI keeps the calmer BTN_3D_* tokens above so the chrome stays neutral.

const ROBLOX_PRESS = 'active:translate-y-[3px] active:border-b-[1px] transition-[transform,border-bottom-width] duration-75';

export const ROBLOX_BTN_BLUE =
  'bg-gradient-to-b from-sky-400 to-sky-500 text-white font-extrabold ' +
  'border-b-[5px] border-sky-700 shadow-md ' +
  'hover:from-sky-300 hover:to-sky-400 ' + ROBLOX_PRESS;

export const ROBLOX_BTN_GREEN =
  'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white font-extrabold ' +
  'border-b-[5px] border-emerald-700 shadow-md ' +
  'hover:from-emerald-300 hover:to-emerald-400 ' + ROBLOX_PRESS;

export const ROBLOX_BTN_RED =
  'bg-gradient-to-b from-rose-400 to-rose-500 text-white font-extrabold ' +
  'border-b-[5px] border-rose-700 shadow-md ' +
  'hover:from-rose-300 hover:to-rose-400 ' + ROBLOX_PRESS;

export const ROBLOX_BTN_AMBER =
  'bg-gradient-to-b from-amber-400 to-amber-500 text-white font-extrabold ' +
  'border-b-[5px] border-amber-700 shadow-md ' +
  'hover:from-amber-300 hover:to-amber-400 ' + ROBLOX_PRESS;

export const ROBLOX_BTN_VIOLET =
  'bg-gradient-to-b from-violet-400 to-violet-500 text-white font-extrabold ' +
  'border-b-[5px] border-violet-700 shadow-md ' +
  'hover:from-violet-300 hover:to-violet-400 ' + ROBLOX_PRESS;

/** Neutral light tile — used as the "off" state of a dock or palette so
 *  every slot still has the chunky 3D body, just calmer. */
export const ROBLOX_TILE_OFF =
  'bg-gradient-to-b from-slate-100 to-slate-200 text-slate-700 ' +
  'border-b-[4px] border-slate-400 shadow ' +
  'hover:from-white hover:to-slate-100 ' + ROBLOX_PRESS;

/** Chunky stat-display tile — for HUD numbers (no press behavior). */
export const ROBLOX_STAT_TILE =
  'bg-gradient-to-b from-slate-800 to-slate-900 text-white ' +
  'border-b-[3px] border-black/60 shadow rounded-xl';

/** Loud "rarity" chip used for badges, quests, and tier callouts. */
export const RARITY_CHIP: Record<'common' | 'rare' | 'epic' | 'legendary', string> = {
  common:
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 ' +
    'border border-slate-200 dark:border-slate-700',
  rare:
    'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 ' +
    'border border-blue-200 dark:border-blue-700/50',
  epic:
    'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-200 ' +
    'border border-violet-200 dark:border-violet-700/50',
  legendary:
    'bg-gradient-to-r from-amber-200 via-orange-200 to-pink-200 ' +
    'dark:from-amber-500/30 dark:via-orange-500/30 dark:to-pink-500/30 ' +
    'text-orange-800 dark:text-amber-100 ' +
    'border border-orange-300 dark:border-orange-700/60',
};
