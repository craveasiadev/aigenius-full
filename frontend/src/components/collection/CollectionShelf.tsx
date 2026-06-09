/**
 * CollectionShelf — read-only trophy room embedded as a tab inside
 * RewardsPage. Shows three rows of the player's unlocked goodies:
 *
 *   • PETS — all pets in the catalog, with locked ones greyed out so the
 *     kid can SEE what's still possible. Tapping an owned pet sets it as
 *     the active companion (the one that follows Wei in the shop).
 *   • INVENTIONS — every invention card the kid saved from the lab.
 *   • SECRETS — hidden tap-spots they discovered (just badges with
 *     names — no spoilers for the ones they haven't found).
 *
 * Everything reads from the live `useCollection()` hook, so unlocks done
 * elsewhere reflect instantly without a refresh.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, Check, EyeOff, Backpack } from 'lucide-react';
import { PETS } from '../../data/pets';
import { useCollection } from '../../lib/useCollection';
import { setActivePet } from '../../lib/collection';
import { sfxTap } from '../../lib/sfx';
import { InventoryPanel } from '../inventory/InventoryPanel';

// Friendly labels for any secrets we know about. Unknown ones just show
// as "Secret #N" so the kid still feels the unlocked count growing.
const SECRET_LABEL: Record<string, string> = {
  secret_corner_tl: 'Top-left whisper',
  secret_corner_tr: 'Top-right twinkle',
  secret_corner_br: 'Back-right hum',
};

export function CollectionShelf() {
  const { pets, activePet, inventions, secrets } = useCollection();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Bigger fancier view — opens the Roblox-style InventoryPanel for the
          full grid + search + Decor catalog. The inline shelf below stays
          as a quick scan, but the CTA is the primary path now. */}
      <button
        type="button"
        onClick={() => { sfxTap(); setPanelOpen(true); }}
        className="w-full rounded-2xl px-4 py-3 bg-gradient-to-r from-sky-400 to-sky-500 text-white font-extrabold inline-flex items-center justify-between border-b-[4px] border-sky-700 active:translate-y-[2px] active:border-b-[1px] shadow-md"
      >
        <span className="inline-flex items-center gap-2">
          <Backpack className="w-5 h-5" />
          Open full Inventory
        </span>
        <span className="text-xs font-bold bg-white/25 px-2 py-0.5 rounded-full">
          Search · Tabs · Decor
        </span>
      </button>

      <InventoryPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      {/* ── Pets ──────────────────────────────────────────────── */}
      <section>
        <header className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
            Pets ({pets.length}/{PETS.length})
          </h3>
          {activePet && (
            <span className="text-[11px] font-bold text-violet-700 dark:text-violet-200">
              Active: {PETS.find((p) => p.id === activePet)?.name ?? '—'}
            </span>
          )}
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PETS.map((p) => {
            const owned = pets.includes(p.id);
            const active = activePet === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={!owned}
                onClick={() => { sfxTap(); setActivePet(p.id); }}
                className={[
                  'relative rounded-2xl p-3 text-left border',
                  owned
                    ? `bg-gradient-to-br ${p.gradient} border-white/60 dark:border-white/15`
                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-white/5 opacity-70 cursor-default',
                  active ? 'ring-4 ring-amber-400/60' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-3xl">{owned ? p.emoji : '❔'}</span>
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {owned ? p.name : '???'}
                    </p>
                    <p className="text-[10px] text-slate-700 dark:text-slate-200/80">
                      {owned ? 'Tap to set active' : 'Locked'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-200/90 leading-snug min-h-[28px]">
                  {owned ? p.blurb : 'Earn a related badge to unlock.'}
                </p>
                {!owned && (
                  <Lock className="absolute top-2 right-2 w-3.5 h-3.5 text-slate-500" />
                )}
                {active && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-extrabold">
                    <Check className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── Inventions ────────────────────────────────────────── */}
      <section>
        <header className="mb-2">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
            Inventions ({inventions.length})
          </h3>
        </header>
        {inventions.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-300/80 italic">
            Visit the Invention Lab to brew your first one. ✨
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inventions.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl p-3 bg-white/90 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10"
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-2xl shrink-0">{card.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{card.name}</p>
                    <p className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-200">{card.rarity}</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug">{card.blurb}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Secrets ───────────────────────────────────────────── */}
      <section>
        <header className="mb-2">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-300">
            Hidden Secrets ({secrets.length})
          </h3>
        </header>
        {secrets.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-300/80 italic inline-flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5" /> Nothing yet — try tapping mysterious corners…
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {secrets.map((id) => (
              <span key={id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200 text-xs font-extrabold border border-amber-200 dark:border-amber-400/40">
                <Sparkles className="w-3 h-3" /> {SECRET_LABEL[id] ?? id}
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CollectionShelf;
