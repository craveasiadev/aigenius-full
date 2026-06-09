/**
 * MysteryBazaar — a rotating limited-time market of weird wonderful items.
 *
 * Pure cosmetic feature: the bazaar is *deterministic per-day* (a tiny
 * seeded shuffle on the current date) so every kid who opens it on the same
 * day sees the same line-up, which is the "fair / shared / today only"
 * feeling. Tapping an item adds a flavored line to Spark + chimes; we don't
 * actually deduct coins (no backend reward economy wired into the bazaar
 * yet — this slice ships the *feeling* of a magical secret shop).
 */
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Lock, Coins, Check } from 'lucide-react';
import { useSpark } from '../companion/CompanionProvider';
import { sfxCoin, sfxWhoosh, sfxReward } from '../../lib/sfx';
import { useEffect } from 'react';
import { COZY_GRADIENT, COZY_GLOW, SPRING_BOUNCY } from '../../lib/uiTokens';
import { purchasablePets, type Pet } from '../../data/pets';
import { grantPet, ownsPet } from '../../lib/collection';
import { useCollection } from '../../lib/useCollection';

interface BazaarItem {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  cost: number;       // shown only; no backend spend yet
  rarity: 'rare' | 'epic' | 'legendary';
}

// Master catalog — each day we pick a deterministic subset of 4.
const CATALOG: BazaarItem[] = [
  { id: 'lantern_lamp',  name: 'Lantern Lamp',    emoji: '🏮', blurb: 'Glows softer when someone reads near it.',   cost: 120, rarity: 'rare' },
  { id: 'cloud_cushion', name: 'Cloud Cushion',   emoji: '☁️', blurb: 'Naps on it last 3 minutes longer.',           cost: 150, rarity: 'rare' },
  { id: 'echo_jar',      name: 'Echo Jar',        emoji: '🫙', blurb: 'Keeps your favorite laughs for later.',       cost: 240, rarity: 'epic' },
  { id: 'paint_petal',   name: 'Paint Petal',     emoji: '🌸', blurb: 'Touch a wall — wall is now the petal\'s color.', cost: 180, rarity: 'rare' },
  { id: 'tiny_postcard', name: 'Tiny Postcard',   emoji: '✉️', blurb: 'Mails itself when you smile twice.',           cost: 90,  rarity: 'rare' },
  { id: 'spark_compass', name: 'Spark Compass',   emoji: '🧭', blurb: 'Points at whatever feels playful.',           cost: 320, rarity: 'epic' },
  { id: 'starbottle',    name: 'Bottled Star',    emoji: '🌟', blurb: 'Only opens on the kindest days.',             cost: 600, rarity: 'legendary' },
  { id: 'whisper_shell', name: 'Whisper Shell',   emoji: '🐚', blurb: 'Tells one good secret per week.',             cost: 200, rarity: 'epic' },
  { id: 'cozy_quilt',    name: 'Cozy Quilt',      emoji: '🧣', blurb: 'Knit by sleepy clouds.',                      cost: 280, rarity: 'epic' },
];

const RARITY_STYLE: Record<BazaarItem['rarity'], { ring: string; chip: string }> = {
  rare:      { ring: 'ring-sky-400/70',    chip: 'bg-sky-200 text-sky-800'       },
  epic:      { ring: 'ring-violet-400/70', chip: 'bg-violet-200 text-violet-800' },
  legendary: { ring: 'ring-amber-400/70',  chip: 'bg-gradient-to-r from-amber-200 to-rose-200 text-orange-800' },
};

function todaySeed(): number {
  const d = new Date();
  // Deterministic 32-bit-ish int from the local date.
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function todaysLineup(): BazaarItem[] {
  let s = todaySeed();
  // Lehmer-style PRNG so the same day always returns the same shuffle.
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const picks = [...CATALOG].sort(() => rand() - 0.5).slice(0, 4);
  return picks;
}

/** Three buyable pets — different shuffle seed than the goods so it
 *  rotates independently. Same date = same lineup for every player. */
function todaysPetLineup(): Pet[] {
  let s = todaySeed() * 37; // different seed than the goods shuffle
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return [...purchasablePets()].sort(() => rand() - 0.5).slice(0, 3);
}

interface MysteryBazaarProps {
  open: boolean;
  onClose: () => void;
}

export function MysteryBazaar({ open, onClose }: MysteryBazaarProps) {
  const spark = useSpark();
  // Re-render whenever the player buys a pet so the cards flip to
  // "Owned ✓" without needing to close + reopen the modal.
  useCollection();
  useEffect(() => { if (open) sfxWhoosh(); }, [open]);

  function handlePeek(item: BazaarItem) {
    sfxCoin();
    spark.cheer(`Whoa — a ${item.name}! Maybe tomorrow.`);
  }

  // Buying a pet:
  //   1. Grants the pet (visible immediately in the shop + inventory).
  //   2. Dispatches a global `aigenius:spend-coins` event so the
  //      dashboard's coin tracker can subtract the cost from the
  //      authoritative backend balance. We don't gate the grant on
  //      coin balance here — that's the dashboard's job; the bazaar's
  //      job is to look generous.
  function handleBuyPet(pet: Pet) {
    if (ownsPet(pet.id)) return;
    if (pet.unlock.type !== 'coins') return;
    if (grantPet(pet.id)) {
      sfxReward();
      window.dispatchEvent(new CustomEvent('aigenius:spend-coins', {
        detail: { amount: pet.unlock.cost, reason: `pet:${pet.id}` },
      }));
      spark.cheer(`New friend! Say hi to ${pet.name} ${pet.emoji}`);
    }
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
          aria-label="Mystery Bazaar"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/45 backdrop-blur-sm cursor-default"
          />

          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.92 }}
            transition={SPRING_BOUNCY}
            className={`${COZY_GRADIENT} ${COZY_GLOW} relative z-10 w-full max-w-lg rounded-3xl p-5 border-2 border-white/60 dark:border-white/15`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-200" />
                Mystery Bazaar
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

            <p className="text-xs font-bold text-slate-800/90 dark:text-slate-100/90 mb-3">
              Today's wonders. Tomorrow's are different. 🕰️
            </p>

            <div className="grid grid-cols-2 gap-3">
              {todaysLineup().map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePeek(item)}
                  className={`text-left rounded-2xl p-3 bg-white/80 dark:bg-slate-900/70 ring-2 ${RARITY_STYLE[item.rarity].ring} active:scale-[0.97] transition`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-3xl leading-none">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{item.name}</p>
                      <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${RARITY_STYLE[item.rarity].chip}`}>
                        {item.rarity}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug min-h-[28px]">
                    {item.blurb}
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 dark:text-amber-200">
                    <Lock className="w-3 h-3" /> {item.cost} coins (preview)
                  </p>
                </button>
              ))}
            </div>

            {/* ── Pet Stall ──────────────────────────────────────────
                Three pets up for adoption every day (deterministic by
                date — same lineup for everyone). Each card shows the
                cost, the rarity, and a Buy button. Bought pets switch
                to "Owned ✓" and the player can set them active from
                the Inventory panel. */}
            <div className="mt-5 pt-4 border-t-2 border-white/40 dark:border-white/10">
              <h3 className="inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900 dark:text-white mb-2">
                <Sparkles className="w-4 h-4 text-pink-600 dark:text-pink-200" />
                Pet Stall
              </h3>
              <p className="text-[11px] font-bold text-slate-800/90 dark:text-slate-100/90 mb-3">
                New friends rotate every day. Buy them with coins.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {todaysPetLineup().map((pet) => {
                  const owned = ownsPet(pet.id);
                  const cost = pet.unlock.type === 'coins' ? pet.unlock.cost : 0;
                  return (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => handleBuyPet(pet)}
                      disabled={owned}
                      className={[
                        'relative text-center rounded-2xl p-2 transition',
                        'bg-white/85 dark:bg-slate-900/70',
                        owned
                          ? 'ring-2 ring-emerald-400/70 opacity-90'
                          : 'ring-2 ring-amber-300/70 hover:ring-amber-400 active:scale-[0.97]',
                      ].join(' ')}
                    >
                      <div className="text-3xl leading-none mb-1">{pet.emoji}</div>
                      <p className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                        {pet.name}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-300 mb-1">
                        {pet.tier}
                      </p>
                      {owned ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-extrabold">
                          <Check className="w-3 h-3" /> Owned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold">
                          <Coins className="w-3 h-3" /> {cost}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-[11px] italic text-slate-700 dark:text-slate-200/70">
              Tip: the bazaar rotates at midnight. Worth a peek every day.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MysteryBazaar;
