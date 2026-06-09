/**
 * Unified inside-shop action menu shown over the iso scene while the
 * player is inside THEIR OWN shop. One floating action button (FAB)
 * sits bottom-right; tapping it expands a clean, grouped, game-style
 * menu:
 *
 *   • Shop Actions → Decorate, Products, Leave Shop
 *   • Stations     → Shelf, Counter, Poster, Tech, Kindness, Register
 *
 * Each station routes to its real /s/aipreneur/* module page via
 * `onHotspot(route)`. The shop actions use their dedicated callbacks.
 *
 * Responsive:
 *   • ≥ sm  → menu opens as a floating card anchored above the FAB.
 *   • < sm  → menu opens as a full-width bottom sheet so it never
 *             crowds the queue / HUD on narrow screens.
 *
 * Every tile is icon-on-top + label-below (never overlapping), ≥64px
 * tall (well above the 44px touch-target minimum), with consistent
 * sizing, playful colours, and tap feedback.
 */
import { AnimatePresence, motion } from 'framer-motion';
import {
  Palette, Package, LogOut, Sparkles, X,
  ShoppingCart, Users, Megaphone, Lightbulb, Heart, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

interface ActionTile {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Gradient + border tone for the tile head. */
  tone: string;
  onClick: () => void;
}

interface IsoShopFabProps {
  /** Only render when the player is inside THEIR OWN shop. */
  visible: boolean;
  onDecorate: () => void;
  onProducts: () => void;
  onLeave: () => void;
  /** Navigate to a station's real module route (e.g. 'marketing'). */
  onHotspot: (route: string) => void;
}

/** Station definitions — each maps to a real AIpreneur module route. */
const STATIONS: Array<{ id: string; label: string; icon: LucideIcon; route: string; tone: string }> = [
  { id: 'shelf',    label: 'Shelf',    icon: ShoppingCart, route: 'product',    tone: 'from-pink-400 to-rose-500 border-rose-700' },
  { id: 'counter',  label: 'Counter',  icon: Users,        route: 'operation',  tone: 'from-lime-400 to-emerald-500 border-emerald-700' },
  { id: 'poster',   label: 'Poster',   icon: Megaphone,    route: 'marketing',  tone: 'from-orange-400 to-red-500 border-red-700' },
  { id: 'tech',     label: 'Tech',     icon: Lightbulb,    route: 'innovation', tone: 'from-violet-400 to-fuchsia-500 border-fuchsia-700' },
  { id: 'kindness', label: 'Kindness', icon: Heart,        route: 'csr',        tone: 'from-rose-400 to-pink-500 border-pink-700' },
  { id: 'register', label: 'Register', icon: Wallet,       route: 'finance',    tone: 'from-amber-400 to-orange-500 border-orange-700' },
];

export function IsoShopFab({ visible, onDecorate, onProducts, onLeave, onHotspot }: IsoShopFabProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const shopActions: ActionTile[] = [
    { id: 'decorate', label: 'Decorate',   icon: Palette, tone: 'from-violet-500 to-purple-600 border-violet-800', onClick: () => { close(); onDecorate(); } },
    { id: 'products', label: 'Products',   icon: Package, tone: 'from-sky-400 to-blue-500 border-blue-700',        onClick: () => { close(); onProducts(); } },
    { id: 'leave',    label: 'Leave Shop', icon: LogOut,  tone: 'from-rose-400 to-red-500 border-red-700',         onClick: () => { close(); onLeave(); } },
  ];

  const stationActions: ActionTile[] = STATIONS.map((s) => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    tone: s.tone,
    onClick: () => { close(); onHotspot(s.route); },
  }));

  if (!visible) return null;

  const Tile = ({ a, delay }: { a: ActionTile; delay: number }) => {
    const Icon = a.icon;
    return (
      <motion.button
        type="button"
        onClick={a.onClick}
        aria-label={a.label}
        initial={{ opacity: 0, scale: 0.6, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26, delay }}
        whileTap={{ scale: 0.9 }}
        className="flex flex-col items-center gap-1.5 min-w-[64px] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-2xl"
      >
        <span
          className={[
            'w-14 h-14 rounded-2xl bg-gradient-to-br border-b-[4px] text-white',
            'flex items-center justify-center shadow-lg shadow-black/30',
            'active:translate-y-[2px] active:border-b-[2px] transition-[transform,border-bottom-width,filter] duration-100 hover:brightness-110',
            a.tone,
          ].join(' ')}
        >
          <Icon className="w-6 h-6" />
        </span>
        <span className="text-[11px] font-bold text-white/90 leading-none text-center whitespace-nowrap">
          {a.label}
        </span>
      </motion.button>
    );
  };

  const MenuBody = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-white font-black text-base">
          <Sparkles className="w-5 h-5 text-fuchsia-300" />
          Shop Menu
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Shop Actions group */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 px-0.5">
          Shop Actions
        </div>
        <div className="grid grid-cols-3 gap-3 justify-items-center">
          {shopActions.map((a, i) => (
            <Tile key={a.id} a={a} delay={i * 0.03} />
          ))}
        </div>
      </div>

      {/* Stations group */}
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-white/40 mb-2 px-0.5">
          Stations
        </div>
        <div className="grid grid-cols-3 gap-3 justify-items-center">
          {stationActions.map((a, i) => (
            <Tile key={a.id} a={a} delay={(shopActions.length + i) * 0.03} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Dim backdrop — tap to close. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* ── Desktop / tablet: floating card anchored above the FAB ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="menu-card"
            role="menu"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="hidden sm:block fixed z-50 w-[320px] rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-4 pointer-events-auto"
            style={{
              right: 'max(env(safe-area-inset-right), 16px)',
              bottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 180px)',
            }}
          >
            {MenuBody}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile: bottom sheet ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="menu-sheet"
            role="menu"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-slate-900/97 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/60 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-auto"
          >
            {/* Grab handle */}
            <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />
            {MenuBody}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main FAB ── */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          right: 'max(env(safe-area-inset-right), 16px)',
          bottom: 'calc(max(env(safe-area-inset-bottom), 14px) + 100px)',
        }}
      >
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close shop menu' : 'Open shop menu'}
          aria-expanded={open}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.18 }}
          whileTap={{ scale: 0.92 }}
          className="pointer-events-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-xl shadow-violet-500/40 border-b-[4px] border-violet-800"
        >
          <motion.span
            animate={{ rotate: open ? 135 : 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="inline-flex"
          >
            {open ? <X className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}
