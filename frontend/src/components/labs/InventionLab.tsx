/**
 * InventionLab — modal where the kid types an idea seed and Spark answers
 * with a funny invention card. Saved cards land in the localStorage
 * collection and show up on the trophy shelf.
 *
 * Built as a self-contained `<dialog>`-style overlay (own backdrop, own
 * dismiss), so any page that wants the lab just mounts <InventionLab open
 * onClose={…} />. Powered by `sparkService.generateInvention()` which
 * always returns SOMETHING (network or local fallback).
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Loader2, Wand2 } from 'lucide-react';
import { generateInvention, type InventionDraft } from '../../services/sparkService';
import { addInvention, type InventionCard } from '../../lib/collection';
import { useSpark } from '../companion/CompanionProvider';
import { Confetti } from '../Confetti';
import { sfxReward, sfxWhoosh } from '../../lib/sfx';
import { COZY_GRADIENT, COZY_GLOW, SPRING_BOUNCY } from '../../lib/uiTokens';

const RARITY_STYLE: Record<InventionDraft['rarity'], { ring: string; chip: string; label: string }> = {
  common:    { ring: 'ring-slate-300/60',  chip: 'bg-slate-200 text-slate-700',    label: 'Common'    },
  rare:      { ring: 'ring-sky-300',       chip: 'bg-sky-200 text-sky-800',        label: 'Rare'      },
  epic:      { ring: 'ring-violet-400',    chip: 'bg-violet-200 text-violet-800',  label: 'Epic'      },
  legendary: { ring: 'ring-amber-400',     chip: 'bg-gradient-to-r from-amber-200 to-rose-200 text-orange-800', label: 'Legendary' },
};

interface InventionLabProps {
  open: boolean;
  onClose: () => void;
}

export function InventionLab({ open, onClose }: InventionLabProps) {
  const spark = useSpark();
  const [seed, setSeed] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<InventionDraft | null>(null);
  const [confetti, setConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when re-opening so a stale card doesn't linger.
  useEffect(() => {
    if (open) {
      setDraft(null); setSeed(''); setBusy(false);
      // Whoosh chime on entry — feels like opening a magical lab.
      sfxWhoosh();
      // Focus the seed input on the next tick so iOS pops the keyboard.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function handleBrew() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await generateInvention(seed);
      setDraft(result);
      setConfetti(true);
      sfxReward();
      // Tell Spark to cheer with a quick line — keeps the companion in the loop.
      spark.cheer(`Ohhh — "${result.name}" — I love it!`);
    } finally {
      setBusy(false);
    }
  }

  function handleSave() {
    if (!draft) return;
    const card: InventionCard = {
      id: `inv-${Date.now().toString(36)}`,
      name: draft.name,
      emoji: draft.emoji,
      blurb: draft.blurb,
      rarity: draft.rarity,
      createdAt: Date.now(),
    };
    addInvention(card);
    spark.say('Saved to your collection! 📚');
    setDraft(null); setSeed('');
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[55] flex items-center justify-center px-4 pointer-events-auto"
          role="dialog"
          aria-label="Invention Lab"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm cursor-default"
          />

          <Confetti show={confetti} onComplete={() => setConfetti(false)} />

          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.92 }}
            transition={SPRING_BOUNCY}
            className={`${COZY_GRADIENT} ${COZY_GLOW} relative z-10 w-full max-w-md rounded-3xl p-5 border-2 border-white/60 dark:border-white/15`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <Wand2 className="w-5 h-5 text-amber-600 dark:text-amber-200" />
                Invention Lab
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white/60 dark:bg-black/30 hover:bg-white/80 flex items-center justify-center text-slate-700 dark:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-bold text-slate-800/90 dark:text-slate-100/90 mb-2">
              Whisper an idea — Spark turns it into something silly + special.
            </p>

            <div className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value.slice(0, 80))}
                placeholder="e.g. rainy day, a hat for cats…"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/70 dark:bg-black/30 placeholder:text-slate-500/70 text-slate-900 dark:text-white border border-white/60 dark:border-white/10 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                onKeyDown={(e) => { if (e.key === 'Enter') void handleBrew(); }}
              />
              <button
                type="button"
                onClick={handleBrew}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 text-white font-extrabold border-b-[4px] border-amber-700 active:translate-y-[2px] active:border-b-[1px] disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? '…' : 'Brew!'}
              </button>
            </div>

            {/* Result card */}
            <AnimatePresence mode="wait">
              {draft && (
                <motion.div
                  key={draft.name + draft.blurb}
                  initial={{ y: 16, opacity: 0, scale: 0.95, rotate: -1 }}
                  animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={SPRING_BOUNCY}
                  className={`relative rounded-2xl p-4 bg-white/85 dark:bg-slate-900/70 ring-2 ${RARITY_STYLE[draft.rarity].ring}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-4xl drop-shadow-sm">{draft.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{draft.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${RARITY_STYLE[draft.rarity].chip}`}>
                          {RARITY_STYLE[draft.rarity].label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{draft.blurb}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600 text-white font-extrabold border-b-[3px] border-violet-800 active:translate-y-[2px] active:border-b-[1px]"
                    >
                      <Sparkles className="w-4 h-4" /> Save to collection
                    </button>
                    <button
                      type="button"
                      onClick={handleBrew}
                      className="px-3 py-2 rounded-xl bg-white/80 dark:bg-black/30 text-slate-700 dark:text-slate-100 font-bold border border-white/60 dark:border-white/10 active:translate-y-[2px]"
                    >
                      Another
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!draft && !busy && (
              <p className="text-xs italic text-slate-700 dark:text-slate-200/70 mt-1">
                Tip: small weird ideas make the best inventions.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InventionLab;
