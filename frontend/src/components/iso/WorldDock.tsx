import { motion } from 'framer-motion';
import {
  Globe,
  LayoutGrid,
  Zap,
  User,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { DockTile, type DockVariant } from './DockTile';

/**
 * WorldDock — the iso scene's bottom navigation, built from the same
 * chunky-plastic visual vocabulary as the rest of the game (DockTile,
 * BTN_3D_PRIMARY). NOT a TikTok clone — it borrows only the IDEA of a
 * raised centre tile, then dresses it in the game's own palette
 * (violet primary, friendly amber/sky accents, glassy faces, soft
 * blue glow under the featured button).
 *
 * Layout (left → right):
 *    [Modules] [Tokens]  ◯  [Magic] [Profile]
 *                       ↑
 *               featured "World Map" disc
 *
 * The disc is larger than the side tiles and sits ~16 px above the bar,
 * which keeps the row TikTok-shaped but the styling kid-friendly:
 * pillow-soft sky/violet gradient, white globe icon, gentle glow halo,
 * and the same 3D press the rest of the buttons use. When the player is
 * already on the city map the disc renders muted so the row layout
 * doesn't jump and the kid can still see where the world shortcut lives.
 */

export type WorldDockItemId =
  | 'modules' | 'tokens' | 'magic' | 'profile'
  | 'rewards' | 'shop'
  // Slots shared with the global BottomNav so the two docks match.
  | 'home' | 'store' | 'explore' | 'more';

export interface WorldDockItem {
  id: WorldDockItemId;
  icon: LucideIcon;
  label: string;
  /** DockTile accent — picks the tile's inactive icon tint. */
  variant: DockVariant;
  /** Optional notification badge count. */
  badge?: number;
}

interface WorldDockProps {
  /** 4 side tiles. 2 render on each side of the centre disc. */
  items?: WorldDockItem[];
  /** Highlight one side tile as active. */
  activeId?: string | null;
  onAction: (id: WorldDockItemId) => void;
  onWorldMap: () => void;
  /** `idle` = full colour + glow. `muted` = greyed (already on world map). */
  worldMapState?: 'idle' | 'muted';
}

export const DEFAULT_WORLD_DOCK_ITEMS: WorldDockItem[] = [
  { id: 'modules', icon: LayoutGrid, label: 'Modules', variant: 'violet' },
  { id: 'tokens',  icon: Zap,        label: 'Tokens',  variant: 'amber'  },
  { id: 'magic',   icon: Sparkles,   label: 'Magic',   variant: 'rose'   },
  { id: 'profile', icon: User,       label: 'Profile', variant: 'sky'    },
];

export function WorldDock({
  items = DEFAULT_WORLD_DOCK_ITEMS,
  activeId = null,
  onAction,
  onWorldMap,
  worldMapState = 'idle',
}: WorldDockProps) {
  // Split the items into two halves around the central world-map disc.
  // Supports 4 items (2+2 — the original config) or 5 items (2+3) so
  // we can add a 5th tile like LEARNING without a visual jump. With 5
  // tiles the row is slightly wider; the wrapper's `maxWidth:
  // calc(100vw - 24px)` keeps it from spilling on narrow phones.
  const splitAt = Math.ceil(items.length / 2);
  const left  = items.slice(0, splitAt);
  const right = items.slice(splitAt);

  return (
    <div
      className="fixed inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{
        // Lift the dock off the bottom edge by 12 px PLUS whatever the
        // device's home-indicator/notch reserves. On Android browsers
        // without a safe-area inset this resolves to 12 px; on iPhones
        // with a home bar it grows to ≈46 px so the dock never sits
        // under the indicator.
        bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220, delay: 0.15 }}
        className="pointer-events-auto"
        // Constrain the dock to the viewport with 12 px of side breathing
        // room. Capped at 720 px so it doesn't span an entire ultra-wide
        // monitor — keeps the tap targets close together on desktop too.
        style={{ maxWidth: 'min(calc(100vw - 24px), 720px)' }}
      >
        {/* The disc OVERLAPS the bar — render it absolutely with the
            tile row positioned underneath so the disc reads as the
            primary focal point. The spacer in the flex row reserves
            the disc's footprint so the side tiles never sit under it. */}
        <div className="relative px-1 sm:px-2">
          {/* Tile row — gap uses `clamp()` so it grows smoothly from
              4 px on the narrowest phones to 16 px on tablets/desktops.
              `items-end` keeps every tile's label baseline aligned even
              when one tile (e.g. with a notification badge) is taller. */}
          <div
            className="flex items-end touch-manipulation"
            style={{ gap: 'clamp(4px, 1.4vw, 16px)' }}
          >
            {left.map((item) => (
              <DockTile
                key={item.id}
                size="md"
                icon={item.icon}
                label={item.label}
                active={item.id === activeId}
                badge={typeof item.badge === 'number' && item.badge > 0
                  ? (item.badge > 99 ? '99+' : item.badge)
                  : undefined}
                variant={item.variant}
                onClick={() => onAction(item.id)}
                ariaLabel={item.label}
              />
            ))}

            {/* Spacer where the disc visually lives. Width MUST track
                the disc's responsive size or the side tiles will start
                creeping under it. The disc is 58 px on the smallest
                phones and 78 px on ≥sm — spacer mirrors that exactly. */}
            <div aria-hidden className="w-[58px] sm:w-[78px] shrink-0" />

            {right.map((item) => (
              <DockTile
                key={item.id}
                size="md"
                icon={item.icon}
                label={item.label}
                active={item.id === activeId}
                badge={typeof item.badge === 'number' && item.badge > 0
                  ? (item.badge > 99 ? '99+' : item.badge)
                  : undefined}
                variant={item.variant}
                onClick={() => onAction(item.id)}
                ariaLabel={item.label}
              />
            ))}
          </div>

          {/* Centre featured disc — absolutely positioned so it lifts
              above the row by ~14 px and is centred over the spacer.
              `top` value matches the disc's responsive size so the
              lift looks consistent across breakpoints. */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-3 sm:-top-4"
            style={{ pointerEvents: 'none' }}
          >
            <WorldMapDisc onClick={onWorldMap} state={worldMapState} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Centre featured button — chunky plastic disc, game-style ────── */

function WorldMapDisc({
  onClick,
  state,
}: {
  onClick: () => void;
  state: 'idle' | 'muted';
}) {
  const muted = state === 'muted';
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={muted ? 'Already on world map' : 'Open world map'}
      whileTap={{ scale: 0.92 }}
      // Pointer events are RE-enabled on the button itself; the wrapper
      // above is none so the row stays clickable around the disc.
      style={{ pointerEvents: 'auto' }}
      className={[
        // Smaller on the narrowest phones so the 5-tile row still fits
        // on a 360 px viewport without the disc clipping its neighbours.
        // Jumps up to the original 78×78 at the `sm` breakpoint.
        'relative w-[58px] h-[58px] sm:w-[78px] sm:h-[78px] rounded-full',
        'flex items-center justify-center text-white',
        // Plastic 3D press — same bottom-border family as DockTile.
        'border-b-[5px] active:translate-y-[2px] active:border-b-[2px]',
        'transition-[transform,border-bottom-width,background-color] duration-100',
        'touch-manipulation select-none',
        muted
          ? 'bg-gradient-to-b from-slate-500 to-slate-700 border-slate-900'
          : 'bg-gradient-to-b from-sky-400 via-sky-500 to-violet-600 border-violet-800 hover:from-sky-300 hover:to-violet-500',
      ].join(' ')}
    >
      {/* Soft halo glow — sky-blue spread for "live world" energy.
          Pure CSS shadow, no extra DOM nodes. */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: muted
            ? '0 4px 10px -2px rgba(0,0,0,0.35)'
            : '0 6px 14px -3px rgba(0,0,0,0.45), 0 0 26px 4px rgba(56,189,248,0.35)',
        }}
      />
      {/* Glass-dome highlight along the top */}
      <span
        aria-hidden
        className="absolute inset-1 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 22%, rgba(255,255,255,0.5), rgba(255,255,255,0) 55%)',
        }}
      />
      <Globe className="w-6 h-6 sm:w-7 sm:h-7 relative z-10 drop-shadow-md" strokeWidth={2.4} />
    </motion.button>
  );
}
