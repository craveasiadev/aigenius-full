import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Zap,
  Gift,
  Store,
  User,
  Sparkles,
} from 'lucide-react';
import { DockTile } from './DockTile';

/**
 * Mobile-style bottom dock. Sits above the safe-area bottom inset and
 * stays out of the way of the iso scene. Five icons by default; each one
 * fires `onAction(id)` so the parent can route or open a modal.
 *
 * Sized for thumbs: every button is ≥58 px square. The dock itself is
 * a sky-blue plastic tray so it reads as a single floating UI piece
 * above the iso canvas behind it.
 *
 * Pattern: each item is `{ id, Icon, label }`. Add or remove items in
 * the consumer without touching this component. Every tile uses the
 * shared `DockTile` — same chunky plastic button used elsewhere in the
 * shop UI (Restock / Chest / HUD actions / wave banner), so the whole
 * in-game button family looks and feels identical.
 */

export interface DockItem {
  id: string;
  icon: typeof Zap;
  label: string;
  /** Optional badge count shown top-right of the icon. */
  badge?: number;
}

interface MobileDockProps {
  items?: DockItem[];
  /** Highlight an item as "currently active" (e.g. the open modal). */
  activeId?: string | null;
  onAction: (id: string) => void;
}

export const DEFAULT_DOCK_ITEMS: DockItem[] = [
  { id: 'modules', icon: LayoutGrid, label: 'Modules' },
  { id: 'tokens',  icon: Zap,        label: 'Tokens' },
  { id: 'shop',    icon: Store,      label: 'Browse' },
  { id: 'rewards', icon: Gift,       label: 'Rewards' },
  { id: 'profile', icon: User,       label: 'Profile' },
  // One consolidated "Magic" tile replaces the three Inventory /
  // Invention / Bazaar portals — tapping it opens a small picker
  // (MagicHub) instead of stretching the dock to eight tiles.
  { id: 'magic',   icon: Sparkles,   label: 'Magic' },
];

export function MobileDock({
  items = DEFAULT_DOCK_ITEMS,
  activeId = null,
  onAction,
}: MobileDockProps) {
  return (
    // Wrapper: full-width fixed band with flex-centred contents. This is
    // more robust than `left-1/2 -translate-x-1/2` on the dock itself —
    // when a vertical scrollbar appears, `100vw` and `left: 50%` use
    // different reference widths, which made the dock visibly off-centre
    // by ~scrollbar width.
    <div
      className="fixed inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{
        bottom: 'max(env(safe-area-inset-bottom), 14px)',
      }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 22, stiffness: 220, delay: 0.15 }}
        // pointer-events-auto re-enables clicks on the dock itself; the
        // wrapper above is none so taps on the empty area beside the dock
        // fall through to the canvas (panning the map still works).
        className="pointer-events-auto"
        style={{ maxWidth: 'calc(100vw - 24px)' }}
      >
        {/* No tray — each tile floats free on the screen with a gap
            between them. The shadow under each button is enough to seat
            them against the iso scene without needing a plastic backing.
            Uses `lg` size so the dock reads as primary navigation. */}
        <div className="flex gap-3 sm:gap-4 px-2 touch-manipulation">
          {items.map((item) => (
            <DockTile
              key={item.id}
              size="lg"
              icon={item.icon}
              label={item.label}
              active={item.id === activeId}
              badge={typeof item.badge === 'number' && item.badge > 0
                ? (item.badge > 99 ? '99+' : item.badge)
                : undefined}
              variant="amber"
              onClick={() => onAction(item.id)}
              ariaLabel={item.label}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
