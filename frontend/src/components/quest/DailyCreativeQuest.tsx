/**
 * DailyCreativeQuest — a floating widget that pins ONE playful AI-generated
 * creative quest per day. Lives on top of the iso scene; persists the day's
 * quest in localStorage (via `collection.ts`) so refreshing keeps it.
 *
 * Behavior:
 *   • On mount, looks for today's saved quest. If none → generates one
 *     (Spark service, with the same local-bank fallback).
 *   • The kid can tap "Done!" once per day; Spark cheers, a quick reward
 *     burst chime plays, and the widget collapses to "✓ Done — see you
 *     tomorrow!" so it's not nagging.
 *   • Generates fresh content at the LOCAL date rollover (next mount after
 *     midnight). No background timers — saves battery + complexity.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Check, Loader2, X, Sparkles } from 'lucide-react';
import { generateDailyQuest, reviewQuest, type DailyQuestDraft } from '../../services/sparkService';
import {
  getQuestDateStamp, setQuestDateStamp,
  isQuestDoneToday, markQuestDoneToday,
} from '../../lib/collection';
import { useSpark } from '../companion/CompanionProvider';
import { sfxReward, sfxTap } from '../../lib/sfx';
import { COZY_GRADIENT, COZY_GLOW } from '../../lib/uiTokens';

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const TODAY_QUEST_PREFIX = 'aigenius_quest_text_v1';
function readTodayQuest(): DailyQuestDraft | null {
  try {
    const raw = localStorage.getItem(TODAY_QUEST_PREFIX);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (typeof obj?.title === 'string' && typeof obj?.hint === 'string') {
      return { title: obj.title, hint: obj.hint };
    }
    return null;
  } catch { return null; }
}
function writeTodayQuest(q: DailyQuestDraft) {
  try { localStorage.setItem(TODAY_QUEST_PREFIX, JSON.stringify(q)); } catch { /* ignore */ }
}

export function DailyCreativeQuest() {
  const spark = useSpark();
  const [quest, setQuest] = useState<DailyQuestDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<boolean>(() => isQuestDoneToday());
  const [collapsed, setCollapsed] = useState(false);

  // Pull today's quest on mount; generate if missing or expired.
  useEffect(() => {
    const stamp = todayStamp();
    const sameDay = getQuestDateStamp() === stamp;
    const cached = sameDay ? readTodayQuest() : null;
    if (cached) { setQuest(cached); return; }
    let active = true;
    setBusy(true);
    generateDailyQuest()
      .then((q) => {
        if (!active) return;
        setQuest(q);
        writeTodayQuest(q);
        setQuestDateStamp(stamp);
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function handleDone() {
    if (done) return;
    markQuestDoneToday();
    setDone(true);
    sfxReward();
    const line = await reviewQuest();
    spark.cheer(line);
  }

  if (collapsed) return null;

  return (
    <motion.div
      initial={{ x: -8, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      // Sits below the top status HUD but above the iso scene. Left side
      // so it doesn't collide with the right-side floating action buttons.
      // z-50 keeps it ABOVE the ShopMiniGame in-shop HUD layer (z-40) so
      // the widget stays visible inside the player's shop too — without
      // it, the in-shop overlay would visually cover the quest card.
      className="fixed z-50 pointer-events-auto select-none w-full max-w-[280px]"
      style={{
        left: 'max(env(safe-area-inset-left), 10px)',
        // Tucked under the top HUD chips (COINS/LV on the world, and the
        // shop's vitals tray inside the shop) — a single offset works for
        // both because both HUDs live in the same top band.
        top:  'calc(env(safe-area-inset-top) + 96px)',
      }}
    >
      <div className={`${COZY_GRADIENT} ${COZY_GLOW} rounded-2xl p-3 border border-white/50 dark:border-white/10`}>
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-200">
            <Compass className="w-3.5 h-3.5" />
            Today's Creative Quest
          </span>
          <button
            type="button"
            onClick={() => { sfxTap(); setCollapsed(true); }}
            aria-label="Hide quest"
            className="w-6 h-6 rounded-md bg-white/40 dark:bg-black/20 hover:bg-white/60 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {busy && !quest && (
            <motion.p
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-bold text-slate-700 dark:text-slate-100 inline-flex items-center gap-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" /> Brewing today's quest…
            </motion.p>
          )}

          {quest && !done && (
            <motion.div key="active" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                {quest.title}
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-200/80 mt-0.5 mb-2 leading-snug">
                {quest.hint}
              </p>
              <button
                type="button"
                onClick={handleDone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-extrabold border-b-[3px] border-emerald-700 active:translate-y-[2px] active:border-b-[1px]"
              >
                <Check className="w-3.5 h-3.5" /> I did it!
              </button>
            </motion.div>
          )}

          {done && (
            <motion.p
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-extrabold text-emerald-700 dark:text-emerald-200 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Done! See you tomorrow ✨
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default DailyCreativeQuest;
