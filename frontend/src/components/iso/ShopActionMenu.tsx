import { Html } from '@react-three/drei';
import { DoorOpen, Move, X } from 'lucide-react';

/**
 * Floating action menu anchored to a shop's world-space position.
 *
 * Implemented with drei's `<Html>` so the DOM tree is properly detached
 * from R3F's reconciler. Using a raw `createPortal` from inside the
 * Canvas was throwing "container.getState is not a function" — R3F was
 * trying to mount the DOM container as a THREE scene root. `<Html>`
 * handles the projection + reconciler-switch correctly.
 */

interface ShopActionMenuProps {
  /** World position to anchor the menu to. */
  anchor: [number, number, number];
  /** Building label shown at the top of the menu. */
  title: string;
  onEnter: () => void;
  /** Optional — when omitted, the "Move shop" row is hidden.
   *  This is how the player's own shop renders only an Enter action. */
  onMove?: () => void;
  onClose: () => void;
  /** Cosmetic — when true, the title bar uses the gold "My Shop" theme. */
  isPlayer?: boolean;
}

export function ShopActionMenu({
  anchor,
  title,
  onEnter,
  onMove,
  onClose,
  isPlayer = false,
}: ShopActionMenuProps) {
  return (
    <Html
      position={anchor}
      center
      zIndexRange={[40, 0]}
      // Pass-through clicks on the empty area around the card so canvas
      // pan still works; the card itself opts back in with `pointer-events-auto`.
      style={{ pointerEvents: 'none' }}
    >
      <div
        // -translate-y-full anchors the menu above the projected pixel.
        // pointer-events-auto: this inner card receives clicks.
        className="-translate-y-full pointer-events-auto select-none touch-manipulation"
      >
        <div
          className={`relative bg-white rounded-2xl shadow-xl overflow-hidden min-w-[180px] ${
            isPlayer ? 'border-2 border-amber-300' : 'border border-slate-200'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 border-b ${
              isPlayer
                ? 'bg-amber-50 border-amber-100'
                : 'bg-slate-50 border-slate-100'
            }`}
          >
            <span
              className={`text-xs font-bold truncate ${
                isPlayer ? 'text-amber-900' : 'text-slate-800'
              }`}
            >
              {isPlayer && '⭐ '}
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-1.5 flex flex-col gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEnter();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100 active:scale-[0.98] transition-all"
            >
              <DoorOpen className="w-4 h-4 text-emerald-600" />
              {isPlayer ? 'Enter my shop' : 'Enter shop'}
            </button>
            {onMove && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="min-h-[44px] flex items-center gap-2.5 px-3 rounded-xl text-sm font-semibold text-slate-800 hover:bg-violet-50 hover:text-violet-700 active:bg-violet-100 active:scale-[0.98] transition-all"
              >
                <Move className="w-4 h-4 text-violet-600" />
                Move shop
              </button>
            )}
          </div>
          {/* Tail pointing down at the building */}
          <div
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 bg-white border-r border-b border-slate-200"
          />
        </div>
      </div>
    </Html>
  );
}
