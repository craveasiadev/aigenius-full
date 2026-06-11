/**
 * studentNav — single source of truth for the student-area navigation.
 *
 * Both bottom docks share this so they stay in lock-step ("link to each
 * other"):
 *   • BottomNav  — the slate pill used on every module/satellite page.
 *   • WorldDock  — the iso-world dock on the AIpreneur dashboard.
 *
 * Exports:
 *   • MAIN_NAV          — the 5 primary slots (Home/Store/Explore/Rewards/More)
 *   • MORE_NAV          — every other route, shown in the "More" sheet
 *   • StudentMoreSheet  — the bottom sheet that lists MORE_NAV (+ optional
 *                         context-specific `extraItems`, e.g. the iso scene's
 *                         Magic portal) and a Logout action.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut, Home, Store, Compass, Gift, ArrowLeft,
  Package, Palette, Users, Megaphone, Lightbulb, Heart,
  Wallet, User, Zap, BarChart3, Settings, History, Sparkles,
  LucideIcon,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

export interface MainNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface MoreNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Solid Tailwind tone for the 3D tile head, e.g. 'bg-violet-600 border-violet-800'. */
  tone: string;
  /** Route to navigate to. Omit when the item runs a custom `onClick`. */
  path?: string;
  /** Custom action (e.g. open the Magic portal) — used in place of `path`. */
  onClick?: () => void;
}

/** The 5 primary slots. "More" is rendered by each dock, not listed here. */
export const MAIN_NAV: MainNavItem[] = [
  { id: 'home',    label: 'Home',    icon: Home,    path: '/s/aipreneur' },
  { id: 'store',   label: 'Store',   icon: Store,   path: '/s/aipreneur/store' },
  { id: 'explore', label: 'Explore', icon: Compass, path: '/s/aipreneur/explore' },
  { id: 'rewards', label: 'Rewards', icon: Gift,    path: '/s/aipreneur/rewards' },
];

export const MORE_NAV: MoreNavItem[] = [
  { id: 'product',    label: 'Products',   icon: Package,    path: '/s/aipreneur/product',    tone: 'bg-violet-600 border-violet-800' },
  { id: 'decorate',   label: 'Decorate',   icon: Palette,    path: '/s/aipreneur/decorate',   tone: 'bg-pink-500 border-pink-700' },
  { id: 'operation',  label: 'Staff',      icon: Users,      path: '/s/aipreneur/operation',  tone: 'bg-sky-500 border-sky-700' },
  { id: 'marketing',  label: 'Marketing',  icon: Megaphone,  path: '/s/aipreneur/marketing',  tone: 'bg-amber-500 border-amber-700' },
  { id: 'innovation', label: 'Innovation', icon: Lightbulb,  path: '/s/aipreneur/innovation', tone: 'bg-emerald-500 border-emerald-700' },
  { id: 'csr',        label: 'Kindness',   icon: Heart,      path: '/s/aipreneur/csr',        tone: 'bg-rose-500 border-rose-700' },
  { id: 'manage',     label: 'Shop HQ',    icon: Sparkles,   path: '/s/aipreneur/manage',     tone: 'bg-violet-600 border-violet-800' },
  { id: 'finance',    label: 'Finance',    icon: Wallet,     path: '/s/aipreneur/finance',    tone: 'bg-emerald-500 border-emerald-700' },
  { id: 'tokens',     label: 'Top Up',     icon: Zap,        path: '/s/aipreneur/ai-tokens',  tone: 'bg-amber-500 border-amber-700' },
];

/** Settings-flavored items pulled OUT of the main grid into their own
 *  sub-panel — accessed via the gear button in the sheet header. Cleans
 *  up the main grid (which is now action / module destinations) and
 *  gives parents/students one obvious place for personal admin stuff. */
export const SETTINGS_NAV: MoreNavItem[] = [
  { id: 'profile',   label: 'Profile',   icon: User,      path: '/s/aipreneur/profile',   tone: 'bg-slate-700 border-slate-900' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/s/aipreneur/analytics', tone: 'bg-sky-500 border-sky-700' },
  { id: 'history',   label: 'Token Log', icon: History,   path: '/s/aipreneur/tokens',    tone: 'bg-fuchsia-500 border-fuchsia-700' },
  { id: 'settings',  label: 'Settings',  icon: Settings,  path: '/s/settings',            tone: 'bg-slate-700 border-slate-900' },
];

interface StudentMoreSheetProps {
  show: boolean;
  onClose: () => void;
  /** Context-only extra tiles (e.g. the iso Magic portal) prepended to the grid. */
  extraItems?: MoreNavItem[];
}

/**
 * Bottom sheet listing every non-primary destination. Shared by both docks
 * so a route added here shows up in both navs at once.
 */
export function StudentMoreSheet({ show, onClose, extraItems = [] }: StudentMoreSheetProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useGeniusAuth();

  // Two views inside the same sheet:
  //   • 'main'     — module/shortcut grid (default)
  //   • 'settings' — Profile / Analytics / Token Log / Settings sub-panel
  // The settings cluster used to live in the main grid but cluttered it;
  // tapping the gear icon in the header now reveals them in their own
  // panel so the main grid stays focused on shop/learning destinations.
  const [view, setView] = useState<'main' | 'settings'>('main');

  // Reset to the main view every time the sheet is closed/reopened so
  // the kid doesn't return to a stale sub-panel from a previous session.
  useEffect(() => {
    if (!show) setView('main');
  }, [show]);

  const isActive = (path?: string) => !!path && location.pathname === path;

  const handleItem = (item: MoreNavItem) => {
    onClose();
    if (item.onClick) item.onClick();
    else if (item.path) navigate(item.path);
  };

  const mainItems = [...extraItems, ...MORE_NAV];
  const items = view === 'settings' ? SETTINGS_NAV : mainItems;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
            className="w-full max-w-md mx-3 max-h-[80vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-xl shadow-black/40 overflow-hidden"
          >
            {/* Header — left cluster swaps between the main "All
                shortcuts" label and a back-arrow "Settings" label when
                the sub-panel is open. Right cluster has the gear toggle
                (hidden when already in settings view) + close button. */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {view === 'settings' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setView('main')}
                      aria-label="Back"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-700 border-b-[3px] border-slate-900 active:translate-y-[2px] active:border-b-[1px] transition-[transform,border-bottom-width] duration-100"
                    >
                      <ArrowLeft className="w-4 h-4 text-white" />
                    </button>
                    <h3 className="text-white font-extrabold text-base">Settings</h3>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800">
                      <Menu className="w-4 h-4 text-white" />
                    </span>
                    <h3 className="text-white font-extrabold text-base">All shortcuts</h3>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Gear shortcut — single tap to jump into the settings
                    cluster (Profile / Analytics / Token Log / Settings).
                    Hidden when already viewing settings to avoid being a
                    no-op button. */}
                {view === 'main' && (
                  <button
                    type="button"
                    onClick={() => setView('settings')}
                    aria-label="Settings"
                    title="Settings — Profile, Analytics, Token Log"
                    className="w-9 h-9 rounded-xl bg-slate-700 border-b-[3px] border-slate-900 flex items-center justify-center hover:brightness-110 active:translate-y-[2px] active:border-b-[1px] transition-[transform,border-bottom-width,filter] duration-100"
                  >
                    <Settings className="w-4 h-4 text-white" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* Grid — animates left/right on view change so the swap
                between main and settings reads as a single panel pivot. */}
            <div className="p-4 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={view}
                  initial={{ opacity: 0, x: view === 'settings' ? 24 : -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: view === 'settings' ? -24 : 24 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="grid grid-cols-3 sm:grid-cols-4 gap-2"
                >
                  {items.map((item, i) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleItem(item)}
                        className={[
                          'aspect-square rounded-2xl p-2 flex flex-col items-center justify-center gap-1.5 transition-colors border touch-manipulation',
                          active
                            ? 'bg-white/10 border-white/20'
                            : 'bg-white/5 border-white/10 hover:bg-white/10',
                        ].join(' ')}
                      >
                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-b-[3px] ${item.tone}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </span>
                        <span className="text-white/80 text-[10px] font-bold text-center leading-tight">
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>

              {/* Logout — only on main view; in Settings the kid is doing
                  admin tasks, not signing out. The back arrow at top-left
                  is the natural exit from the sub-panel. */}
              {view === 'main' && (
                <button
                  type="button"
                  onClick={() => { void logout(); onClose(); }}
                  className="w-full mt-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-rose-500 text-white border-b-[3px] border-rose-700 hover:bg-rose-400 active:translate-y-[2px] active:border-b-[1px] transition-[transform,border-bottom-width,background-color] duration-100 touch-manipulation"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
