import { motion } from 'framer-motion';
import { Zap, Heart, Coins, Flame } from 'lucide-react';

/**
 * Top-of-screen game HUD. Four solid pill cards:
 *
 *   • AI Tokens   — currency for AI-powered actions (product gen, marketing).
 *   • Popularity  — integer level (1, 2, 3, …, no upper limit). Drives
 *                   the crowd density of NPCs walking through the city.
 *   • Coins       — total profit / in-game cash from sales.
 *   • Streak      — consecutive-day play streak.
 *
 * All values come from props — the IsoScene host either passes real
 * backend numbers (live student dashboard) or a small local demo state
 * (anonymous /demo route). The HUD itself is presentation only.
 */

export interface DemoStats {
  tokens: number;
  /** Popularity LEVEL — integer starting at 1, no upper bound. */
  popularity: number;
  coins: number;
  /** Daily play streak in days. */
  streak: number;
}

interface DemoHUDProps {
  stats: DemoStats;
  /** Hidden during interior / loading modes — interior has its own
   *  "Leave shop" pill at the top, no need to double up. */
  visible?: boolean;
  /** Optional click handler — focuses on Tokens card; opens topup. */
  onTokensClick?: () => void;
}

export function DemoHUD({ stats, visible = true, onTokensClick }: DemoHUDProps) {
  if (!visible) return null;

  const popularity = Math.max(1, Math.floor(stats.popularity));
  // Ring "fill" — show progress within the current 5-level band so the
  // user has a visible signal when they're close to the next bracket
  // (which unlocks an extra NPC walking past).
  const bandProgress = ((popularity - 1) % 5) / 5; // 0 → 0.8 within band
  const bandLow = Math.floor((popularity - 1) / 5) * 5 + 1;
  const bandHigh = bandLow + 4;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 24, stiffness: 240, delay: 0.1 }}
      className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{ top: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md shadow-xl shadow-black/30 border border-white/10 pointer-events-auto">
        {/* ── AI Tokens ─────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onTokensClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-white/10 active:bg-white/15 active:scale-95 transition-all"
          aria-label="AI Tokens"
        >
          <span className="w-7 h-7 rounded-lg bg-amber-500 border-b-[3px] border-amber-700 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </span>
          <span className="flex flex-col items-start leading-tight text-white">
            <span className="text-[10px] uppercase tracking-wide text-white/60">Tokens</span>
            <span className="text-sm font-bold tabular-nums">{stats.tokens.toLocaleString()}</span>
          </span>
        </button>

        <span className="w-px h-7 bg-white/10" aria-hidden />

        {/* ── Popularity (level integer + within-band progress ring) ── */}
        <div
          className="flex items-center gap-1.5 px-2 py-1"
          title={`Popularity level — band ${bandLow}–${bandHigh}`}
        >
          <span className="relative w-7 h-7 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" className="absolute inset-0">
              <circle cx="14" cy="14" r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
              <motion.circle
                cx="14" cy="14" r="12"
                fill="none"
                stroke="#f472b6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 12}
                animate={{ strokeDashoffset: 2 * Math.PI * 12 * (1 - bandProgress) }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                transform="rotate(-90 14 14)"
              />
            </svg>
            <Heart className="w-3.5 h-3.5 text-pink-400 relative" fill="currentColor" />
          </span>
          <span className="flex flex-col items-start leading-tight text-white">
            <span className="text-[10px] uppercase tracking-wide text-white/60">Popularity</span>
            <span className="text-sm font-bold tabular-nums">
              Lv {popularity}
            </span>
          </span>
        </div>

        <span className="w-px h-7 bg-white/10" aria-hidden />

        {/* ── Coins ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 px-2 py-1">
          <span className="w-7 h-7 rounded-lg bg-yellow-500 border-b-[3px] border-yellow-700 flex items-center justify-center">
            <Coins className="w-4 h-4 text-white" />
          </span>
          <span className="flex flex-col items-start leading-tight text-white">
            <span className="text-[10px] uppercase tracking-wide text-white/60">Coins</span>
            <span className="text-sm font-bold tabular-nums">{stats.coins.toLocaleString()}</span>
          </span>
        </div>

        <span className="w-px h-7 bg-white/10 hidden sm:block" aria-hidden />

        {/* ── Streak (hidden on tightest widths to keep mobile clean) ── */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1">
          <span className="w-7 h-7 rounded-lg bg-rose-500 border-b-[3px] border-rose-700 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </span>
          <span className="flex flex-col items-start leading-tight text-white">
            <span className="text-[10px] uppercase tracking-wide text-white/60">Streak</span>
            <span className="text-sm font-bold tabular-nums">
              {stats.streak}<span className="text-white/40 text-xs">d</span>
            </span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
