/**
 * Portals — Inventory / Invention Lab / Mystery Bazaar.
 *
 * The bottom dock now has a single "MAGIC" tile (instead of three
 * separate ones) so we don't crowd the row. This component:
 *
 *   1. Owns the open/close state for the hub picker + the three panels.
 *   2. Listens for `open-portal` window CustomEvents from the dock —
 *      the only id we expect now is `'magic'`, which opens the hub.
 *   3. Renders the hub itself + the three magical-layer panels.
 *
 * The hub is a small game-style picker with three big cards. Tap one,
 * the hub fades out and that panel opens; closing the panel doesn't
 * reopen the hub (the player can re-tap Magic to come back).
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Backpack, Wand2, Sparkles, X } from 'lucide-react';
import { InventionLab } from '../labs/InventionLab';
import { MysteryBazaar } from '../labs/MysteryBazaar';
import { InventoryPanel } from '../inventory/InventoryPanel';
import { sfxTap } from '../../lib/sfx';

type MagicChoice = 'inventory' | 'invention' | 'bazaar';

export function Portals() {
  const [hubOpen, setHubOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [bazaarOpen, setBazaarOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      sfxTap();
      // Single supported id today — opens the picker. Legacy individual
      // ids ('inventory' / 'invention' / 'bazaar') still work in case
      // anything in the codebase dispatches them directly.
      if (id === 'magic') setHubOpen(true);
      else if (id === 'inventory') setInventoryOpen(true);
      else if (id === 'invention') setLabOpen(true);
      else if (id === 'bazaar') setBazaarOpen(true);
    };
    window.addEventListener('open-portal', handler as EventListener);
    return () => window.removeEventListener('open-portal', handler as EventListener);
  }, []);

  const choose = (c: MagicChoice) => {
    sfxTap();
    setHubOpen(false);
    if (c === 'inventory') setInventoryOpen(true);
    else if (c === 'invention') setLabOpen(true);
    else setBazaarOpen(true);
  };

  return (
    <>
      <MagicHub
        open={hubOpen}
        onClose={() => setHubOpen(false)}
        onChoose={choose}
      />
      <InventoryPanel open={inventoryOpen} onClose={() => setInventoryOpen(false)} />
      <InventionLab open={labOpen} onClose={() => setLabOpen(false)} />
      <MysteryBazaar open={bazaarOpen} onClose={() => setBazaarOpen(false)} />
    </>
  );
}

/**
 * Small modal picker — three big cards (Inventory / Invention / Bazaar)
 * laid out in a row on desktop, stacked on mobile. Each card uses one
 * of the magical-layer accent colours so the hub itself is visually
 * playful, distinct from the system-coloured BTN_3D_* family.
 */
function MagicHub({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (c: MagicChoice) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto px-4"
          onClick={onClose}
        >
          {/* Scrim */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/40 p-5 sm:p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2">
                <span className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                    Magic
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pick a magical place to visit
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            </div>

            {/* Three cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <HubCard
                icon={<Backpack className="w-7 h-7" />}
                title="Inventory"
                blurb="Pets, inventions, secrets and decor you've collected."
                accent="cyan"
                onClick={() => onChoose('inventory')}
              />
              <HubCard
                icon={<Wand2 className="w-7 h-7" />}
                title="Invention Lab"
                blurb="Brew a brand-new gadget with the AI assistant."
                accent="amber"
                onClick={() => onChoose('invention')}
              />
              <HubCard
                icon={<Sparkles className="w-7 h-7" />}
                title="Mystery Bazaar"
                blurb="Today's rotating market of rare goodies."
                accent="violet"
                onClick={() => onChoose('bazaar')}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Hub card ──────────────────────────────────────────────────────────
const ACCENT: Record<'cyan' | 'amber' | 'violet', { ring: string; bg: string; ink: string }> = {
  cyan:   { ring: 'ring-cyan-300 dark:ring-cyan-400/40',     bg: 'bg-cyan-50 dark:bg-cyan-500/10',     ink: 'text-cyan-700 dark:text-cyan-200' },
  amber:  { ring: 'ring-amber-300 dark:ring-amber-400/40',   bg: 'bg-amber-50 dark:bg-amber-500/10',   ink: 'text-amber-700 dark:text-amber-200' },
  violet: { ring: 'ring-violet-300 dark:ring-violet-400/40', bg: 'bg-violet-50 dark:bg-violet-500/10', ink: 'text-violet-700 dark:text-violet-200' },
};

function HubCard({
  icon, title, blurb, accent, onClick,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  accent: 'cyan' | 'amber' | 'violet';
  onClick: () => void;
}) {
  const a = ACCENT[accent];
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`text-left rounded-2xl ${a.bg} ring-1 ${a.ring} p-4 border border-white dark:border-white/5 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`w-12 h-12 rounded-2xl bg-white dark:bg-slate-900/70 ${a.ink} flex items-center justify-center mb-3 border border-slate-200 dark:border-white/10`}>
        {icon}
      </div>
      <h3 className={`text-sm font-extrabold ${a.ink} mb-1`}>{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{blurb}</p>
    </motion.button>
  );
}

export default Portals;
