import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

/**
 * WorldMapFab — bottom-centre circular floating action button.
 *
 * Acts as the primary "go back to the live world map" shortcut. Sits
 * above the MobileDock so it reads as the dominant action when the
 * player is INSIDE a shop interior. Glowing-blue plastic disc with a
 * globe icon, elevated shadow, pulsing ring — same family as the iso
 * scene's other 3D plastic UI (DockTile / IsoShopFab) but visually
 * bumped one tier higher in the hierarchy.
 *
 * Pure presentation — the consumer wires `onClick` to whatever should
 * happen (leave interior, focus city map, etc.). Mount above
 * MobileDock; the dock owns the bottom-of-screen layout slot.
 */

export interface WorldMapFabProps {
  onClick: () => void;
  /** Optional aria-label override. Defaults to "World map". */
  ariaLabel?: string;
  /** Visual state — `idle` (default) shows the gentle pulsing ring.
   *  `muted` dims and stops the pulse (e.g. when the player is already
   *  on the city map and the FAB is just decorative). */
  state?: 'idle' | 'muted';
}

export function WorldMapFab({
  onClick,
  ariaLabel = 'World map',
  state = 'idle',
}: WorldMapFabProps) {
  const muted = state === 'muted';
  return (
    // Fixed full-width band so the button stays centred regardless of
    // scrollbars (same trick MobileDock uses). Z just below modals so
    // a popup can still cover it.
    <div
      className="fixed inset-x-0 z-30 flex justify-center pointer-events-none"
      style={{
        // Sits ~88 px above the dock's safe-area bottom — half the FAB
        // overlaps the dock band so it reads as the centre tile rising
        // above its neighbours.
        bottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 88px)',
      }}
    >
      <motion.button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        initial={{ y: 30, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 240, delay: 0.2 }}
        whileTap={{ scale: 0.92 }}
        className={[
          'pointer-events-auto relative w-[72px] h-[72px] rounded-full',
          'flex items-center justify-center text-white',
          // Glowing blue plastic. Inner gradient + bottom border = the
          // chunky 3D look the rest of the game uses; outer blur shadow
          // = the "glow" the brief asked for.
          muted
            ? 'bg-slate-700 border-b-[5px] border-slate-900'
            : 'bg-gradient-to-b from-sky-400 to-blue-600 border-b-[5px] border-blue-800 hover:from-sky-300 hover:to-blue-500',
          'active:translate-y-[3px] active:border-b-[2px]',
          'transition-[transform,border-bottom-width,background-color] duration-100',
          'touch-manipulation select-none',
        ].join(' ')}
        style={{
          // Elevated shadow — two stops: tight contact + spread halo.
          // The blue spread becomes the "glow" against the dark canvas.
          boxShadow: muted
            ? '0 6px 12px -4px rgba(0,0,0,0.45)'
            : '0 6px 14px -4px rgba(0,0,0,0.5), 0 0 28px 6px rgba(56,189,248,0.35)',
        }}
      >
        {/* Pulsing outer ring — only when idle, marks the FAB as the
            primary call-to-action. CSS-driven so framer-motion isn't
            paying for the animation on every frame. */}
        {!muted && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: '0 0 0 0 rgba(56,189,248,0.55)',
              animation: 'worldfab-pulse 2.4s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        )}

        {/* Inset highlight — a thin top sheen so the button reads as
            a glass dome rather than a flat circle. */}
        <span
          aria-hidden
          className="absolute inset-1 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 22%, rgba(255,255,255,0.45), rgba(255,255,255,0) 55%)',
          }}
        />

        <Globe className="w-8 h-8 relative z-10 drop-shadow" strokeWidth={2.4} />
      </motion.button>

      {/* Keyframes for the pulse ring — scoped per-component via a
          plain <style> so we don't have to touch the global Tailwind
          config for a one-off animation. */}
      <style>{`
        @keyframes worldfab-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(56,189,248,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(56,189,248,0);    }
          100% { box-shadow: 0 0 0 0   rgba(56,189,248,0);    }
        }
      `}</style>
    </div>
  );
}
