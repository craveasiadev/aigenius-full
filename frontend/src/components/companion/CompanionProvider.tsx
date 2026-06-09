/**
 * CompanionProvider — the global "Spark" mood + speech bus.
 *
 * Any component can:
 *   • Read Spark's current mood / message via `useSpark()`.
 *   • Call `cheer(text)` to make Spark celebrate (a one-line popup over the
 *     mascot, auto-clearing after a beat).
 *   • Call `say(text)` for a plain speech-bubble line.
 *   • Call `celebrate(badgeName)` for the louder reward-burst pathway
 *     (consumed by RewardBurst — provider just stores the latest event).
 *
 * Decoupling rationale: pages don't need to know whether Spark is on-screen
 * or what skin she has — they just announce intent and the mascot / burst
 * components render the result. Keeps celebration logic out of every page.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { getQuickCheer } from '../../services/sparkService';

export type SparkMood = 'idle' | 'thinking' | 'excited' | 'celebrating';

export interface BadgeAward {
  /** Unique key per award so RewardBurst can re-render on re-claims. */
  id: number;
  badgeId: string;        // e.g. "first_steps"
  prettyName: string;     // e.g. "First Steps"
  xp: number;
  coins: number;
}

interface SparkContextValue {
  mood: SparkMood;
  /** The current speech-bubble line shown over Spark, if any. */
  message: string | null;
  /** Most recent achievement (consumed by RewardBurst). */
  latestAward: BadgeAward | null;
  /** Show a short popup over Spark and bump mood to 'excited'. */
  cheer: (text?: string) => void;
  /** Plain speech-bubble line (no mood bump). */
  say: (text: string) => void;
  /** Fire the louder reward-burst pathway. */
  celebrate: (badge: Omit<BadgeAward, 'id'>) => void;
  /** Acknowledge the award (RewardBurst calls this when it dismisses). */
  clearAward: () => void;
  /** Whether the mascot should hide right now (e.g. during fullscreen edit). */
  hidden: boolean;
  setHidden: (h: boolean) => void;
}

const SparkContext = createContext<SparkContextValue | null>(null);

const MESSAGE_DURATION_MS = 3200;
const EXCITED_DURATION_MS = 2000;

export function CompanionProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<SparkMood>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [latestAward, setLatestAward] = useState<BadgeAward | null>(null);
  const [hidden, setHidden] = useState(false);

  // Timers — refs so React strict-mode double-mounting doesn't double-fire.
  const msgTimerRef = useRef<number | null>(null);
  const moodTimerRef = useRef<number | null>(null);
  const awardIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (msgTimerRef.current) { window.clearTimeout(msgTimerRef.current); msgTimerRef.current = null; }
    if (moodTimerRef.current) { window.clearTimeout(moodTimerRef.current); moodTimerRef.current = null; }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const say = useCallback((text: string) => {
    setMessage(text);
    if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    msgTimerRef.current = window.setTimeout(() => setMessage(null), MESSAGE_DURATION_MS);
  }, []);

  const cheer = useCallback((text?: string) => {
    const line = text ?? getQuickCheer();
    setMood('excited');
    say(line);
    if (moodTimerRef.current) window.clearTimeout(moodTimerRef.current);
    moodTimerRef.current = window.setTimeout(() => setMood('idle'), EXCITED_DURATION_MS);
  }, [say]);

  const celebrate = useCallback((badge: Omit<BadgeAward, 'id'>) => {
    awardIdRef.current += 1;
    setLatestAward({ id: awardIdRef.current, ...badge });
    setMood('celebrating');
    // Spark cheers alongside the burst; RewardBurst owns the big visuals.
    say(getQuickCheer());
    if (moodTimerRef.current) window.clearTimeout(moodTimerRef.current);
    moodTimerRef.current = window.setTimeout(() => setMood('idle'), EXCITED_DURATION_MS + 1500);
  }, [say]);

  const clearAward = useCallback(() => setLatestAward(null), []);

  const value = useMemo<SparkContextValue>(() => ({
    mood, message, latestAward,
    cheer, say, celebrate, clearAward,
    hidden, setHidden,
  }), [mood, message, latestAward, cheer, say, celebrate, clearAward, hidden]);

  return <SparkContext.Provider value={value}>{children}</SparkContext.Provider>;
}

/** Read + control Spark from anywhere under <CompanionProvider>. Throws if
 *  used outside the provider so we catch wiring mistakes loudly. */
export function useSpark(): SparkContextValue {
  const ctx = useContext(SparkContext);
  if (!ctx) {
    throw new Error('useSpark() must be used inside <CompanionProvider>');
  }
  return ctx;
}

/** Safe variant — returns null if the provider isn't mounted. Used by
 *  optional callers (e.g. ShopWorkSim that may be tested in isolation). */
export function useSparkOptional(): SparkContextValue | null {
  return useContext(SparkContext);
}
