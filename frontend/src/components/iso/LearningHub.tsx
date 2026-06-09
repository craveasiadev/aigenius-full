/**
 * Learning Hub — the always-visible entry point to the 5 business-
 * learning modules (Product / Marketing / Staff / Innovations / Finance).
 *
 *   Trigger button: a chunky pill-shaped FAB anchored to the BOTTOM-RIGHT
 *                   of the screen, above the WorldDock. Warm amber
 *                   gradient + graduation-cap icon + "LEARN" label so it
 *                   reads as an "education" CTA at a glance — visually
 *                   distinct from the cool-slate dock tiles below.
 *
 *   Panel:          a slide-up sheet on mobile / a floating card on
 *                   tablet+, listing the 5 modules. Tapping any tile
 *                   fires `onNavigate(route)`.
 *
 * Why a corner FAB and not a dock tile or a top-screen banner:
 *   • Putting it INSIDE the WorldDock row crowded the 4-tile + globe
 *     layout on phones — observed overlap on iPhone 14 width.
 *   • A floating tile above the globe centre looked visually random
 *     because nothing else floats there.
 *   • The bottom-right corner ABOVE the dock is a known-empty zone
 *     (the customer queue cluster lives bottom-LEFT; the shop rating
 *     / happiness panels live top-right). The FAB lands there with no
 *     overlap on any tested viewport (≥ 360 px).
 *
 * Position math (worst-case 360 px viewport, 34 px safe-area inset):
 *   right edge  = env(safe-area-inset-right) + 16 px           ≈ 16 px
 *   bottom edge = env(safe-area-inset-bottom) + 12 + dock + 36 ≈ 130 px
 *   Above the dock (≈90 px tall incl. raised globe), below the
 *   top-right HUD column (≈260 px tall), inside the right edge.
 */
import { AnimatePresence, motion } from 'framer-motion';
import {
  GraduationCap, X, KeyRound,
  Package, Megaphone, Users, Lightbulb, Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

/** Class-code gate. The comparison normalises case + trims whitespace
 *  so the child can type it however they want and still get in. Bump
 *  this string (and the storage key suffix) when the teacher rotates
 *  codes to invalidate everyone's prior unlock. */
const CLASS_CODE = 'AIGENIUS';
const UNLOCK_KEY = 'aig:learning-unlocked:v2';
/** Unlock lifetime in ms. After this window elapses we wipe the stored
 *  timestamp and the child has to re-type the code. Currently 1 minute
 *  — short by design so a kiosk session at school can't be re-used
 *  hours later by a different student. */
const UNLOCK_TTL_MS = 60_000;

/** Returns true if the device currently holds a valid (non-expired)
 *  unlock token. Returns false if missing or expired, AND lazily clears
 *  expired tokens so the storage doesn't accumulate stale entries. */
function isUnlockValid(): boolean {
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const expiresAt = parseInt(raw, 10);
    if (!Number.isFinite(expiresAt)) {
      localStorage.removeItem(UNLOCK_KEY);
      return false;
    }
    if (Date.now() >= expiresAt) {
      localStorage.removeItem(UNLOCK_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

interface ModuleTile {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  route: string;
  /** Floating emoji shown in the portal — gives each portal an instantly
   *  recognizable "world" identity beyond the lucide icon. */
  emoji: string;
  /** One-line hook describing what the kid will learn / do inside. */
  blurb: string;
  /** Solid CSS color for the radial glow halo (matches the tone gradient). */
  glow: string;
}

const MODULES: ModuleTile[] = [
  { id: 'product',     label: 'Product',     icon: Package,   route: 'product',    tone: 'from-sky-400 to-blue-500 border-blue-700',
    emoji: '📦', blurb: 'Design + launch your big idea',        glow: 'rgba(14,165,233,0.55)' },
  { id: 'marketing',   label: 'Marketing',   icon: Megaphone, route: 'marketing',  tone: 'from-orange-400 to-red-500 border-red-700',
    emoji: '📣', blurb: 'Bring crowds to your shop',            glow: 'rgba(249,115,22,0.55)' },
  { id: 'staff',       label: 'Staff',       icon: Users,     route: 'operation',  tone: 'from-lime-400 to-emerald-500 border-emerald-700',
    emoji: '🧑‍🍳', blurb: 'Hire + lead your dream team',       glow: 'rgba(34,197,94,0.55)' },
  { id: 'innovations', label: 'Innovations', icon: Lightbulb, route: 'innovation', tone: 'from-violet-400 to-fuchsia-500 border-fuchsia-700',
    emoji: '🤖', blurb: 'Invent tech that supercharges sales',  glow: 'rgba(168,85,247,0.55)' },
  { id: 'finance',     label: 'Finance',     icon: Wallet,    route: 'finance',    tone: 'from-amber-400 to-orange-500 border-orange-700',
    emoji: '🪙', blurb: 'Count coins, grow your vault',         glow: 'rgba(245,158,11,0.55)' },
];

interface LearningHubProps {
  /** Navigate to a module route key (e.g. `product`, `marketing`). The
   *  parent decides whether to push it onto `/s/aipreneur/<route>` or
   *  open the demo modal. */
  onNavigate: (route: string) => void;
}

export function LearningHub({ onNavigate }: LearningHubProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Class-code gate. The unlock token expires after UNLOCK_TTL_MS (1 min)
  // — the child has to re-type the code on the next attempt past that
  // window. Kept in localStorage as an expiry timestamp so the gate
  // survives a route navigation but not a class change.
  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlockValid());
  const [askCode, setAskCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const codeInputRef = useRef<HTMLInputElement | null>(null);
  const expiryTimerRef = useRef<number | null>(null);

  // Autofocus the field when the prompt opens so kids can start typing
  // immediately on touch + desktop.
  useEffect(() => {
    if (askCode) {
      const t = setTimeout(() => codeInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [askCode]);

  /** Schedule a single timeout to flip `unlocked` back to false the
   *  instant the stored TTL elapses — so an open panel auto-closes and
   *  the next LEARN tap re-prompts. Also runs on mount so a stale
   *  unlock from a prior session is honoured to its real deadline. */
  useEffect(() => {
    if (expiryTimerRef.current) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (!unlocked) return;
    try {
      const raw = localStorage.getItem(UNLOCK_KEY);
      const expiresAt = raw ? parseInt(raw, 10) : 0;
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setUnlocked(false);
        setOpen(false);
        return;
      }
      expiryTimerRef.current = window.setTimeout(() => {
        try { localStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
        setUnlocked(false);
        setOpen(false);
      }, remaining);
    } catch { /* ignore */ }
    return () => {
      if (expiryTimerRef.current) {
        window.clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [unlocked]);

  const handleLearnTap = () => {
    if (open) { close(); return; }
    // Re-validate against the clock on every tap so a token that expired
    // while the FAB was idle is caught without waiting for state to flip.
    if (unlocked && isUnlockValid()) { setOpen(true); return; }
    if (unlocked) setUnlocked(false);
    setCodeInput('');
    setCodeError(false);
    setAskCode(true);
  };

  const submitCode = () => {
    if (codeInput.trim().toUpperCase() === CLASS_CODE) {
      const expiresAt = Date.now() + UNLOCK_TTL_MS;
      try { localStorage.setItem(UNLOCK_KEY, String(expiresAt)); } catch { /* ignore */ }
      setUnlocked(true);
      setAskCode(false);
      setOpen(true);
    } else {
      setCodeError(true);
      // Clear the wrong code after a beat so the next attempt starts
      // fresh — kids retry faster than they can read an error message.
      setTimeout(() => { setCodeInput(''); setCodeError(false); }, 1200);
    }
  };

  /** Portal — a richer per-module tile that reads as a "world entrance":
   *    • Animated radial glow halo in the module's accent color
   *    • Floating emoji (CSS keyframes, no GPU canvas needed)
   *    • Gradient icon tile with the lucide glyph
   *    • Module name + one-line learning hook
   *    • Chevron CTA so the action is obvious
   *  Used by the Learning Portal grid below. */
  const Portal = ({ m, delay }: { m: ModuleTile; delay: number }) => {
    const Icon = m.icon;
    return (
      <motion.button
        type="button"
        onClick={() => { close(); onNavigate(m.route); }}
        aria-label={`Open ${m.label} world`}
        initial={{ opacity: 0, scale: 0.85, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 24, delay }}
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className="group relative flex flex-col items-stretch text-left p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 overflow-hidden touch-manipulation"
      >
        {/* Animated radial glow halo — purely decorative, draws the eye
            to each portal. Color comes from the module's glow token. */}
        <span
          aria-hidden
          className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-2xl opacity-60 group-hover:opacity-90 transition-opacity"
          style={{ background: `radial-gradient(circle, ${m.glow} 0%, transparent 70%)` }}
        />

        <div className="relative flex items-center gap-3">
          {/* Chunky 3D icon tile (matches every other module header) */}
          <span
            className={[
              'inline-flex w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br border-b-[4px] text-white shrink-0',
              'items-center justify-center shadow-lg shadow-black/40',
              'group-active:translate-y-[2px] group-active:border-b-[2px] transition-[transform,border-bottom-width] duration-100',
              m.tone,
            ].join(' ')}
            aria-hidden
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </span>
          {/* Floating emoji bubble — gives each portal its own
              instantly-readable identity. CSS keyframe bob keeps it
              cheap (no GPU canvas needed). */}
          <span
            aria-hidden
            className="absolute -top-1 -right-1 text-2xl sm:text-3xl select-none"
            style={{
              animation: `portalFloat 2.4s ease-in-out infinite`,
              animationDelay: `${delay * 1.5}s`,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            }}
          >
            {m.emoji}
          </span>
        </div>

        <div className="relative mt-2.5 sm:mt-3">
          <p className="text-sm sm:text-base font-extrabold text-white leading-tight">
            {m.label}
          </p>
          <p className="text-[11px] sm:text-xs text-white/65 leading-snug mt-0.5">
            {m.blurb}
          </p>
        </div>

        {/* Open-portal chevron — appears on hover, anchors the CTA */}
        <span
          aria-hidden
          className="absolute bottom-2.5 right-3 text-white/40 group-hover:text-white/90 group-hover:translate-x-0.5 transition-all text-sm font-black"
        >
          →
        </span>
      </motion.button>
    );
  };

  const MenuBody = (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-2 text-white font-black text-base sm:text-lg">
            <GraduationCap className="w-5 h-5 text-amber-300" />
            Learning Portal
          </span>
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white/55">
            Five worlds, five superpowers
          </span>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close learning"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Portal grid — 2 columns on mobile (fits 4 portals + the wide
          finance one spanning both), gives way more visual weight than
          the old 3-col icon grid. */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {MODULES.map((m, i) => (
          <div key={m.id} className={i === 4 ? 'col-span-2' : ''}>
            <Portal m={m} delay={i * 0.05} />
          </div>
        ))}
      </div>
      <p className="text-[10px] sm:text-[11px] text-center text-white/40 leading-snug pt-1">
        Tap any portal to enter that world →
      </p>
      {/* Local keyframes for the floating portal emoji — scoped via a
          style tag so no global CSS edits are needed. */}
      <style>{`
        @keyframes portalFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(-4px) rotate(3deg); }
        }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Dim backdrop — tap to close. */}
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Close learning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Desktop / tablet: floating card anchored above the FAB.
          Static centring on the outer div — see WorldDock for the
          motion / static transform split. */}
      <AnimatePresence>
        {open && (
          <div
            className="hidden sm:block fixed z-50 pointer-events-auto"
            style={{
              right: 'calc(env(safe-area-inset-right) + 16px)',
              bottom: 'calc(env(safe-area-inset-bottom) + 230px)',
            }}
          >
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="rounded-3xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 p-4"
              style={{ width: 'min(420px, calc(100vw - 24px))' }}
            >
              {MenuBody}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile: full-width bottom sheet. */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-slate-900/97 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/60 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pointer-events-auto"
          >
            <div className="w-10 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />
            {MenuBody}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── The trigger FAB — bottom-right, above the dock. ────────────
            Visually distinct from the dock tiles below:
              • shape:   chunky square (not pill like a banner, not flat
                         like a dock tile — clearly its own thing)
              • palette: warm amber → orange gradient (the dock is cool
                         slate, the HUD chips are violet → this stands
                         out as the "learning / education" tile)
              • icon:    graduation cap so the purpose is obvious even
                         without reading the label
              • halo:    a soft amber pulse on the surrounding glow
                         draws the eye to it as a primary CTA
              • label:   "LEARN" below the icon (caps + tracked, same
                         visual family as the dock tile labels) ── */}
      {/* Class-code prompt — shown the first time a child taps LEARN
          on this device (before `localStorage.aig:learning-unlocked`
          is set). The unlock persists across reloads but is per-device,
          so a teacher who rotates the code just bumps UNLOCK_KEY. */}
      <AnimatePresence>
        {askCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setAskCode(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="class-code-title"
              initial={{ scale: 0.85, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-amber-500/20 p-6"
            >
              <button
                type="button"
                onClick={() => setAskCode(false)}
                aria-label="Cancel"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 flex items-center justify-center touch-manipulation"
              >
                <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>

              {/* Chunky 3D key icon — matches the design language of the
                  other 3D plastic tiles in module headers. */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 border-b-[4px] border-orange-700 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/40">
                <KeyRound className="w-8 h-8 text-white drop-shadow" strokeWidth={2.4} />
              </div>

              <h2
                id="class-code-title"
                className="text-xl font-extrabold text-center text-slate-900 dark:text-white"
              >
                Unlock the Portal
              </h2>
              <p className="text-sm text-center text-slate-600 dark:text-slate-300 mt-1 mb-5">
                Type your class code to enter the learning worlds.
              </p>

              <input
                ref={codeInputRef}
                type="text"
                value={codeInput}
                onChange={(e) => { setCodeInput(e.target.value); setCodeError(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submitCode(); }}
                placeholder="Type your code"
                aria-label="Class code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className={[
                  'w-full px-4 py-3.5 rounded-2xl text-center text-lg font-extrabold tracking-[0.18em] uppercase outline-none',
                  'bg-slate-100 dark:bg-slate-800',
                  'border-2',
                  codeError
                    ? 'border-rose-500 text-rose-600 dark:text-rose-300 animate-[shake_0.3s_ease-in-out]'
                    : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-amber-500',
                  'transition-colors',
                ].join(' ')}
              />

              {codeError && (
                <p className="text-xs font-bold text-center text-rose-500 mt-2">
                  Oops — that code isn't right. Try again!
                </p>
              )}

              <button
                type="button"
                onClick={submitCode}
                disabled={!codeInput.trim()}
                className={[
                  'mt-5 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl',
                  'text-base font-extrabold text-white',
                  'bg-gradient-to-b from-amber-400 via-orange-400 to-orange-500',
                  'border-b-[4px] border-orange-700 active:translate-y-[2px] active:border-b-[2px]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'transition-[transform,border-bottom-width] duration-100',
                ].join(' ')}
              >
                Unlock Learning
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleLearnTap}
        aria-label={open ? 'Close learning hub' : 'Open learning hub'}
        aria-expanded={open}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 22, delay: 0.2 }}
        whileTap={{ scale: 0.92 }}
        className={[
          'fixed z-30',
          'flex flex-col items-center justify-center gap-1',
          'w-[64px] h-[72px] sm:w-[76px] sm:h-[86px] rounded-2xl',
          'text-white',
          'bg-gradient-to-b from-amber-400 via-orange-400 to-orange-500',
          'border-b-[4px] border-orange-700',
          'shadow-lg shadow-amber-500/40',
          'active:translate-y-[2px] active:border-b-[2px]',
          'transition-[transform,border-bottom-width,filter] duration-100',
          'hover:brightness-110 touch-manipulation select-none',
        ].join(' ')}
        style={{
          right: 'calc(env(safe-area-inset-right) + 16px)',
          // Sits ≈130 px above safe-area on phones, comfortably above
          // the WorldDock (≈90 px from safe area) with a 30+ px gap.
          bottom: 'calc(env(safe-area-inset-bottom) + 130px)',
        }}
      >
        {/* Gentle pulsing halo — purely decorative, draws the eye to
            the primary learning CTA. Sits behind the button face. */}
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl"
          style={{
            boxShadow: '0 0 24px 6px rgba(251, 191, 36, 0.35)',
          }}
        />
        <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" strokeWidth={2.2} />
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none drop-shadow-sm">
          {open ? 'Close' : 'Learn'}
        </span>
      </motion.button>
    </>
  );
}
