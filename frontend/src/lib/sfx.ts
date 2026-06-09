/**
 * sfx.ts — kid-friendly synthetic chimes via the Web Audio API.
 *
 * Zero asset files: each sound is a short oscillator + envelope, so we don't
 * ship any audio bytes and there's nothing to license. Tones are deliberately
 * soft (sine + triangle, low gain) so they don't startle. Honors the user's
 * SFX setting from `collection.ts` and silently no-ops on iOS Safari until
 * the first user gesture (the AudioContext stays suspended until then,
 * which is browser policy — we don't fight it).
 */
import { isSfxOn } from './collection';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch { return null; }
}

interface Note { freq: number; start: number; dur: number; type?: OscillatorType; vol?: number; }

function play(notes: Note[]) {
  if (!isSfxOn()) return;
  const ac = getContext();
  if (!ac) return;
  // Some browsers leave the context suspended until a user gesture — try to
  // resume on every call. Safe to call repeatedly.
  if (ac.state === 'suspended') void ac.resume().catch(() => {});

  const t0 = ac.currentTime;
  for (const n of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.freq;
    const peak = (n.vol ?? 0.18);
    // Quick attack → exponential-ish decay envelope.
    gain.gain.setValueAtTime(0.0001, t0 + n.start);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + n.start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0 + n.start);
    osc.stop(t0 + n.start + n.dur + 0.02);
  }
}

/** Short button-tap pop. Used on tap-feedback moments. */
export function sfxTap() {
  play([{ freq: 720, start: 0, dur: 0.07, type: 'triangle', vol: 0.12 }]);
}

/** Two-note rising "coin" chime. Used when coins fly into the balance. */
export function sfxCoin() {
  play([
    { freq: 880,  start: 0,    dur: 0.09, type: 'sine', vol: 0.16 },
    { freq: 1320, start: 0.06, dur: 0.10, type: 'sine', vol: 0.13 },
  ]);
}

/** Sparkly arpeggio for the big reward burst. */
export function sfxReward() {
  play([
    { freq: 660,  start: 0,    dur: 0.14, type: 'sine',     vol: 0.14 },
    { freq: 880,  start: 0.08, dur: 0.14, type: 'sine',     vol: 0.14 },
    { freq: 1175, start: 0.16, dur: 0.16, type: 'triangle', vol: 0.14 },
    { freq: 1570, start: 0.24, dur: 0.20, type: 'triangle', vol: 0.12 },
  ]);
}

/** Tiny mystery "ding" used when a secret hotspot is found. */
export function sfxSecret() {
  play([
    { freq: 1480, start: 0,    dur: 0.10, type: 'triangle', vol: 0.13 },
    { freq: 1976, start: 0.07, dur: 0.14, type: 'triangle', vol: 0.10 },
  ]);
}

/** Whoosh for portal / page-open moments — a low-to-high quick sweep. */
export function sfxWhoosh() {
  play([
    { freq: 220, start: 0, dur: 0.18, type: 'triangle', vol: 0.10 },
    { freq: 660, start: 0.05, dur: 0.16, type: 'sine',  vol: 0.10 },
  ]);
}
