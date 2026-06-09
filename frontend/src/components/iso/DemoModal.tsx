import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Sparkles, Paintbrush, Cog, Megaphone, Lightbulb, Heart,
  Zap, Gift, Store, User, ChevronLeft, Lock, Star,
  TrendingUp, ShoppingBag, Crown, ArrowRight, Sun, Coins,
} from 'lucide-react';
import type { DemoStats } from './DemoHUD';

/**
 * Animated modal shell + content router for the dock buttons.
 *
 * State machine (`view`):
 *   • null                → modal closed.
 *   • 'modules'           → grid of the 6 game modules.
 *   • 'module:<id>'       → detail view for one module (demo preview).
 *   • 'tokens' | 'browse' | 'rewards' | 'profile' → top-level demo pages.
 *
 * Why one component for everything: a single backdrop + sheet animation
 * keeps the layout consistent; the body content swaps via AnimatePresence
 * with a small "slide in from the right" transition that gives the
 * modules-grid → module-detail flow a navigated feel without needing
 * a real router.
 *
 * Anonymous demo: no real backend calls. All numbers come from the
 * DemoStats prop. CTAs that would normally write to backend show a
 * "Sign up to continue" call to action instead.
 */

export type DemoView =
  | null
  | 'modules'
  | `module:${ModuleId}`
  | 'tokens'
  | 'browse'
  | 'rewards'
  | 'profile';

type ModuleId =
  | 'product'
  | 'decorate'
  | 'operation'
  | 'marketing'
  | 'innovation'
  | 'csr'
  | 'finance';

interface ModuleDef {
  id: ModuleId;
  name: string;
  tagline: string;
  icon: typeof Sparkles;
  gradient: string; // tailwind gradient classes
  shadowColor: string;
  body: string;
}

const MODULES: ModuleDef[] = [
  {
    id: 'product',
    name: 'Create Product',
    tagline: 'Design + price your goods',
    icon: Lightbulb,
    gradient: 'from-blue-400 to-indigo-500',
    shadowColor: 'shadow-blue-500/30',
    body: 'Generate product ideas with AI, set prices, and watch your shop fill up. In the full game, AI Tokens unlock unique product photos and descriptions.',
  },
  {
    id: 'decorate',
    name: 'Decorate Shop',
    tagline: 'Customise your interior',
    icon: Paintbrush,
    gradient: 'from-pink-400 to-fuchsia-500',
    shadowColor: 'shadow-pink-500/30',
    body: 'Drag furniture, change wallpaper, pick colour schemes. A well-decorated shop attracts more customers and boosts your popularity.',
  },
  {
    id: 'operation',
    name: 'Operations',
    tagline: 'Run the day-to-day',
    icon: Cog,
    gradient: 'from-emerald-400 to-teal-500',
    shadowColor: 'shadow-emerald-500/30',
    body: 'Hire staff, manage inventory, set opening hours. Smooth ops = happy customers = more sales and word-of-mouth.',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    tagline: 'Get the word out',
    icon: Megaphone,
    gradient: 'from-orange-400 to-red-500',
    shadowColor: 'shadow-orange-500/30',
    body: 'Run promotions, design ads, build campaigns. Each marketing action burns AI Tokens but raises your popularity level.',
  },
  {
    id: 'innovation',
    name: 'Innovation',
    tagline: 'Research new products',
    icon: Sparkles,
    gradient: 'from-violet-400 to-purple-500',
    shadowColor: 'shadow-violet-500/30',
    body: 'Unlock new product categories and shop upgrades. Higher innovation level unlocks rarer items and bigger shops.',
  },
  {
    id: 'csr',
    name: 'CSR',
    tagline: 'Do social good',
    icon: Heart,
    gradient: 'from-rose-400 to-pink-500',
    shadowColor: 'shadow-rose-500/30',
    body: 'Donate to causes, host community events, lower your environmental footprint. Boosts long-term loyalty + popularity.',
  },
  {
    id: 'finance',
    name: 'Finance',
    tagline: 'Track sales + play math games',
    icon: Coins,
    gradient: 'from-amber-400 to-orange-500',
    shadowColor: 'shadow-amber-500/30',
    body: 'Watch your daily revenue, profit, and visitor count. Daily math challenges bank bonus coins straight into your vault.',
  },
];

interface DemoModalProps {
  view: DemoView;
  onClose: () => void;
  onChangeView: (v: DemoView) => void;
  stats: DemoStats;
  /** Bumps popularity in the demo (e.g. after running a marketing campaign). */
  onBumpPopularity?: (delta: number) => void;
}

export function DemoModal({ view, onClose, onChangeView, stats, onBumpPopularity }: DemoModalProps) {
  return (
    <AnimatePresence>
      {view !== null && (
        <>
          {/* Backdrop — tap to close. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
            aria-hidden
          />

          {/* Centred flex wrapper — robust across scrollbar widths,
              keyboard insets, and orientation changes. The wrapper itself
              has pointer-events-none so clicks in the empty area around
              the card hit the backdrop (which closes the modal); the
              card opts back into events. */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-3 pointer-events-none"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 12px)',
              // Leave room for the dock at the bottom so the modal
              // doesn't sit ON TOP of the dock buttons on short screens.
              paddingBottom: 'max(env(safe-area-inset-bottom), 96px)',
            }}
          >
            <motion.div
              initial={{ y: 24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              role="dialog"
              aria-modal="true"
              className="w-full max-w-[480px] max-h-full flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              <ModalContent
                view={view}
                onClose={onClose}
                onChangeView={onChangeView}
                stats={stats}
                onBumpPopularity={onBumpPopularity}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────

function ModalContent({ view, onClose, onChangeView, stats, onBumpPopularity }: DemoModalProps) {
  if (view === null) return null;

  // Legacy `module:<id>` views now route to their own isolated demo
  // pages (`/demo/<module>`). The modules grid below intercepts taps
  // and navigates instead of changing the view — but we keep this
  // branch as a fallback when a deep link reaches an old module URL.
  if (view.startsWith('module:')) {
    const id = view.slice('module:'.length) as ModuleId;
    const def = MODULES.find((m) => m.id === id);
    if (!def) return null;
    return (
      <ModuleRedirectView
        def={def}
        onBack={() => onChangeView('modules')}
        onClose={onClose}
      />
    );
  }

  switch (view) {
    case 'modules': return <ModulesGridView onPick={(id) => onChangeView(`module:${id}`)} onClose={onClose} />;
    case 'tokens':  return <TokensView stats={stats} onClose={onClose} />;
    case 'browse':  return <BrowseView onClose={onClose} />;
    case 'rewards': return <RewardsView stats={stats} onClose={onClose} />;
    case 'profile': return <ProfileView onClose={onClose} />;
    default: return null;
  }
}

// ─── Header used by every view ───────────────────────────────────────

function ModalHeader({
  title, subtitle, onClose, onBack, accent,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  onBack?: () => void;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h2 className={`text-base font-bold leading-tight truncate ${accent ?? 'text-slate-900'}`}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Demo "Sign up" CTA banner ──────────────────────────────────────

function DemoCTA({ label = 'Sign up to play for real' }: { label?: string }) {
  return (
    <div className="m-4 p-3 rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 flex items-center gap-3">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow shadow-violet-500/30 flex-shrink-0">
        <Lock className="w-4 h-4 text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-violet-900 truncate">Ready for the real thing?</p>
        <p className="text-[11px] text-violet-700/80">{label}</p>
      </div>
    </div>
  );
}

// ─── Modules grid ───────────────────────────────────────────────────
//
// Each card navigates to its own demo page (`/demo/<id>`). The modal
// closes itself first so the iso scene's R3F resources go idle
// instead of competing for the GPU while the module page is open.

function ModulesGridView({ onPick: _onPick, onClose }: {
  onPick: (id: ModuleId) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const open = (id: ModuleId) => {
    onClose();
    navigate(`/demo/${id}`);
  };
  return (
    <>
      <ModalHeader
        title="Game Modules"
        subtitle="Tap one to open its demo"
        onClose={onClose}
      />
      <div className="p-3 sm:p-4 grid grid-cols-1 [@media(min-width:480px)]:grid-cols-2 gap-2.5 overflow-y-auto">
        {MODULES.map((m, i) => (
          <motion.button
            key={m.id}
            type="button"
            onClick={() => open(m.id)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, type: 'spring', damping: 22, stiffness: 260 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="h-[76px] p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 flex items-center gap-3 text-left transition-colors touch-manipulation"
          >
            <span className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${m.gradient} ${m.shadowColor} shadow-md flex items-center justify-center flex-shrink-0`}>
              <m.icon className="w-6 h-6 text-white" />
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 leading-snug truncate">{m.name}</p>
              <p className="text-[11px] text-slate-500 leading-snug truncate">{m.tagline}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
          </motion.button>
        ))}
      </div>
    </>
  );
}

// ─── Module redirect fallback ───────────────────────────────────────
//
// Old code used to render module:<id> as an in-modal preview card. Now
// each module has its own page; if the modal ever lands on a legacy
// module:<id> URL we surface a single "Open the demo page" button so
// the visitor isn't stuck on a dead route.

function ModuleRedirectView({ def, onBack, onClose }: {
  def: ModuleDef;
  onBack: () => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const open = () => {
    onClose();
    navigate(`/demo/${def.id}`);
  };
  return (
    <>
      <ModalHeader
        title={def.name}
        subtitle={def.tagline}
        onClose={onClose}
        onBack={onBack}
      />
      <div className="p-4 overflow-y-auto flex flex-col gap-4">
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${def.gradient} ${def.shadowColor} shadow-lg text-white`}>
          <def.icon className="w-7 h-7 mb-2 opacity-90" />
          <h3 className="text-lg font-bold">{def.name}</h3>
          <p className="text-sm text-white/90 mt-1 leading-relaxed">{def.body}</p>
        </div>
        <button
          type="button"
          onClick={open}
          className="min-h-[48px] rounded-2xl font-bold text-sm bg-slate-900 text-white active:scale-95 hover:bg-slate-800 transition-all inline-flex items-center justify-center gap-2"
        >
          Open {def.name} demo
          <ArrowRight className="w-4 h-4" />
        </button>
        <DemoCTA label="Sign up to play these modules for real" />
      </div>
    </>
  );
}

// ─── Tokens (topup) ─────────────────────────────────────────────────

function TokensView({ stats, onClose }: { stats: DemoStats; onClose: () => void }) {
  const packs = [
    { id: 's', tokens: 100, price: '$0.99', best: false },
    { id: 'm', tokens: 550, price: '$3.99', best: true },
    { id: 'l', tokens: 1200, price: '$7.99', best: false },
  ];
  return (
    <>
      <ModalHeader
        title="AI Tokens"
        subtitle="Power AI actions across modules"
        onClose={onClose}
      />
      <div className="p-4 overflow-y-auto flex flex-col gap-3">
        {/* Current balance card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 shadow-lg shadow-orange-500/30 text-white">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <p className="text-sm font-semibold opacity-90">Current balance</p>
          </div>
          <p className="text-4xl font-black tabular-nums mt-1">{stats.tokens.toLocaleString()}</p>
        </div>

        <p className="text-sm font-bold text-slate-700">Top-up packs</p>
        <div className="grid grid-cols-3 gap-2">
          {packs.map((p) => (
            <div
              key={p.id}
              className={`relative p-3 rounded-2xl border-2 flex flex-col items-center text-center ${
                p.best
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {p.best && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-amber-400 text-white text-[9px] font-bold uppercase tracking-wide">
                  Best
                </span>
              )}
              <Zap className="w-5 h-5 text-amber-500 mb-1" />
              <p className="text-sm font-bold text-slate-900">{p.tokens.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500">tokens</p>
              <button
                type="button"
                className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                {p.price}
              </button>
            </div>
          ))}
        </div>

        <DemoCTA label="Sign up to actually buy tokens" />
      </div>
    </>
  );
}

// ─── Browse public shops ────────────────────────────────────────────

function BrowseView({ onClose }: { onClose: () => void }) {
  const shops = [
    { name: "Maya's Boba", pop: 92, owner: 'Maya, 11' },
    { name: 'Ace Toy Co.', pop: 78, owner: 'Ace, 9' },
    { name: 'Pixel Comics', pop: 64, owner: 'Sky, 13' },
    { name: 'Bloom Bakery', pop: 58, owner: 'Liam, 10' },
  ];
  return (
    <>
      <ModalHeader
        title="Browse Shops"
        subtitle="See what other Aipreneurs built"
        onClose={onClose}
      />
      <div className="p-4 overflow-y-auto flex flex-col gap-2">
        {shops.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 cursor-pointer"
          >
            <span className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-white text-xl shadow shadow-violet-500/30 flex-shrink-0">
              <Store className="w-6 h-6" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{s.name}</p>
              <p className="text-[11px] text-slate-500">by {s.owner}</p>
            </div>
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-pink-100 text-pink-700 text-xs font-bold">
              <Heart className="w-3 h-3" fill="currentColor" />
              {s.pop}
            </span>
          </motion.div>
        ))}

        <DemoCTA label="Sign up to visit + rate shops" />
      </div>
    </>
  );
}

// ─── Rewards ────────────────────────────────────────────────────────

function RewardsView({ stats, onClose }: { stats: DemoStats; onClose: () => void }) {
  const rewards = [
    { name: 'Daily Login', icon: Sun, status: 'Claimed', done: true },
    { name: 'First Sale', icon: ShoppingBag, status: 'Claim 50 ⚡', done: false },
    { name: 'Reach Popularity 50', icon: TrendingUp, status: stats.popularity >= 50 ? 'Claim 200 ⚡' : `${50 - stats.popularity} to go`, done: false },
    { name: 'Build All 6 Modules', icon: Crown, status: 'Locked', done: false, locked: true },
  ];
  return (
    <>
      <ModalHeader
        title="Rewards"
        subtitle="Daily quests + milestones"
        onClose={onClose}
      />
      <div className="p-4 overflow-y-auto flex flex-col gap-2">
        {rewards.map((r) => (
          <div key={r.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shadow flex-shrink-0 ${
              r.done
                ? 'bg-emerald-100 text-emerald-700'
                : r.locked
                  ? 'bg-slate-200 text-slate-500'
                  : 'bg-gradient-to-br from-amber-300 to-orange-500 text-white shadow-orange-500/30'
            }`}>
              <r.icon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
              <p className="text-[11px] text-slate-500">{r.status}</p>
            </div>
            {r.done && <Star className="w-5 h-5 text-amber-400" fill="currentColor" />}
          </div>
        ))}

        <DemoCTA label="Sign up to start earning rewards" />
      </div>
    </>
  );
}

// ─── Profile ────────────────────────────────────────────────────────

function ProfileView({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalHeader title="Profile" onClose={onClose} />
      <div className="p-4 overflow-y-auto flex flex-col gap-4 items-center">
        <span className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/30">
          <User className="w-12 h-12 text-white" />
        </span>
        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">Demo Player</p>
          <p className="text-xs text-slate-500">Trying Aipreneur demo</p>
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <Gift className="w-5 h-5 mx-auto mb-1 text-rose-500" />
            <p className="text-sm font-bold text-slate-900">1</p>
            <p className="text-[10px] text-slate-500">Shop</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <Sparkles className="w-5 h-5 mx-auto mb-1 text-violet-500" />
            <p className="text-sm font-bold text-slate-900">0</p>
            <p className="text-[10px] text-slate-500">Products</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <Crown className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-sm font-bold text-slate-900">—</p>
            <p className="text-[10px] text-slate-500">Rank</p>
          </div>
        </div>

        <DemoCTA label="Sign up to save your shop + progress" />
      </div>
    </>
  );
}

