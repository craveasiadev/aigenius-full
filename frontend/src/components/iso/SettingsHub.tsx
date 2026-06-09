/**
 * Settings Hub — always-visible floating gear button at the TOP-RIGHT of
 * the iso world (and shop interior) that opens a small panel with the
 * personal-admin shortcuts: Profile / Analytics / Token Log / Settings.
 *
 * Mirror of LearningHub but for admin tasks instead of learning. Pulled
 * out as its own component so the iso scene has one source of truth for
 * each FAB cluster (LearningHub bottom-right, SettingsHub top-right).
 *
 * Why a corner FAB:
 *   • Keeps the settings cluster reachable on every screen, not buried
 *     inside the MORE sheet → tap MORE → tap gear path.
 *   • Top-right is empty real estate in the iso scene (HUD chips are
 *     centered; QUESTS/TASKS/TROPHIES chips sit in the centered tray
 *     too with breathing room before the right edge).
 *   • Same shape vocabulary as LearningHub so the two FABs visually
 *     pair as "two corner shortcuts" without screaming.
 */
import { AnimatePresence, motion } from 'framer-motion';
import {
  Settings, X,
  User, BarChart3, History,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SettingsTile {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Lucide icon foreground gradient (tone). */
  tone: string;
  /** Route to navigate to on tap. */
  route: string;
}

const TILES: SettingsTile[] = [
  { id: 'profile',   label: 'Profile',   icon: User,      route: '/s/aipreneur/profile',   tone: 'from-slate-500 to-slate-700 border-slate-900' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, route: '/s/aipreneur/analytics', tone: 'from-sky-400 to-sky-600 border-sky-800' },
  { id: 'history',   label: 'Token Log', icon: History,   route: '/s/aipreneur/tokens',    tone: 'from-fuchsia-400 to-fuchsia-600 border-fuchsia-800' },
  { id: 'settings',  label: 'Settings',  icon: Settings,  route: '/s/settings',            tone: 'from-zinc-500 to-zinc-700 border-zinc-900' },
];

export function SettingsHub() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const navigate = useNavigate();

  const handlePick = (route: string) => {
    close();
    navigate(route);
  };

  return (
    <>
      {/* Dim backdrop — tap to close. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close settings"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Desktop / tablet: floating card anchored below the FAB. */}
      <AnimatePresence>
        {open && (
          <div
            className="hidden sm:block fixed z-50 pointer-events-auto"
            style={{
              right: 'calc(env(safe-area-inset-right) + 16px)',
              // Sits BELOW the FAB (which lives at top: safe + 12). 80px
              // gap clears the FAB itself + HUD chips on iPad layouts.
              top: 'calc(env(safe-area-inset-top) + 80px)',
            }}
          >
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-3.5"
              // Wider card (320 → 360) so the subtitle "Account & data"
              // and the "Token Log" tile label both fit on a single
              // line. Below 360 the 2-column grid starts squeezing
              // labels into ugly two-line wraps.
              style={{ width: 'min(360px, calc(100vw - 24px))' }}
            >
              <Body tiles={TILES} onPick={handlePick} onClose={close} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile: bottom sheet (same pattern as LearningHub) so the kid's
          thumb stays in the lower half of the screen. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-slate-900/97 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/60 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-auto"
          >
            <Body tiles={TILES} onPick={handlePick} onClose={close} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating gear FAB — top-right corner. Matches the visual family
          of the LearningHub bottom-right FAB (chunky 3D plastic key tile
          with bottom-border + active translate-y press). Slate tone so
          it reads as "settings/admin", visually distinct from the warm
          amber LEARN FAB. */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close settings' : 'Open settings'}
        aria-expanded={open}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.25 }}
        whileTap={{ scale: 0.92 }}
        className={[
          'fixed z-30',
          'flex items-center justify-center',
          'w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] rounded-2xl',
          'text-white',
          'bg-gradient-to-b from-slate-500 via-slate-600 to-slate-700',
          'border-b-[4px] border-slate-900',
          'shadow-lg shadow-black/40',
          'active:translate-y-[2px] active:border-b-[2px]',
          'transition-[transform,border-bottom-width,filter] duration-100',
          'hover:brightness-110 touch-manipulation select-none',
        ].join(' ')}
        style={{
          right: 'calc(env(safe-area-inset-right) + 16px)',
          // Top edge of the safe area + 12px. Sits ABOVE the centered
          // HUD chip tray (which has 12px top inset too but is centered
          // and never extends past ~90px from the right edge).
          top: 'calc(env(safe-area-inset-top) + 12px)',
        }}
      >
        <Settings className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm" strokeWidth={2.2} />
      </motion.button>
    </>
  );
}

/** Shared body — same markup for the desktop floating card AND the
 *  mobile bottom sheet. Tile grid + close handle. */
function Body({
  tiles, onPick, onClose,
}: {
  tiles: SettingsTile[];
  onPick: (route: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        {/* min-w-0 + flex-1 lets the title cluster shrink if the X
            button needs room, instead of wrapping the subtitle. */}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 text-white font-black text-base sm:text-lg leading-tight">
            <Settings className="w-5 h-5 text-slate-300 shrink-0" />
            Settings
          </span>
          {/* Shorter subtitle that fits a single line at every supported
              card width (down to 280px). "Your account & data" reads
              naturally without truncation. */}
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/55 whitespace-nowrap truncate mt-0.5">
            Your account &amp; data
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 flex items-center justify-center active:scale-90 transition-transform shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tiles.map((t, i) => {
          const Icon = t.icon;
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => onPick(t.route)}
              aria-label={t.label}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24, delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex items-center gap-2.5 p-3 rounded-2xl bg-slate-800/70 border border-white/10 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 touch-manipulation"
            >
              <span
                className={[
                  'inline-flex w-10 h-10 rounded-xl bg-gradient-to-br border-b-[3px] text-white shrink-0',
                  'items-center justify-center shadow-md shadow-black/40',
                  t.tone,
                ].join(' ')}
                aria-hidden
              >
                <Icon className="w-5 h-5" />
              </span>
              {/* whitespace-nowrap so "Token Log" stays on a single line
                  inside the narrow 2-col tile. min-w-0 + truncate as a
                  safety net for any future longer label. */}
              <span className="text-sm font-extrabold text-white whitespace-nowrap truncate min-w-0">
                {t.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default SettingsHub;
