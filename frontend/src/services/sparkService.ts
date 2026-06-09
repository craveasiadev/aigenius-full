/**
 * sparkService — playful creative prompts for the AI companion ("Spark").
 *
 * Tries the existing OpenAI client first (kid-safe system prompt, tiny
 * response budget) and gracefully falls back to a rich local bank so the
 * companion ALWAYS has something fun to say — even offline, with no API
 * key, or when the kid is out of `ai_chat` tokens. The local bank is
 * deliberately large + varied so the fallback never feels stale.
 *
 * Daily prompts are cached in localStorage so a re-ask returns instantly
 * and costs nothing. The cache invalidates at midnight (per local date).
 */
import OpenAI from 'openai';
import { api } from '../lib/api';

// Self-contained OpenAI client init — same pattern as openaiService.ts but
// scoped to Spark so a missing key / network blip just falls back to the
// local bank silently. We don't import from openaiService because its
// init helper isn't exported and we'd rather not perturb that file.
let _client: OpenAI | null = null;
let _clientTried = false;
async function getSparkClient(): Promise<OpenAI | null> {
  if (_client) return _client;
  if (_clientTried) return null; // don't re-try a known-failed init every call
  _clientTried = true;
  try {
    let apiKey: string | null = null;
    try {
      const r = await api.get<{ success: boolean; api_key?: string }>('/aipreneur/system/openai-key');
      if (r.success && r.api_key) apiKey = r.api_key;
    } catch { /* backend endpoint not available — fine, try env */ }
    if (!apiKey) {
      const fromEnv = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_OPENAI_API_KEY;
      if (fromEnv) apiKey = fromEnv;
    }
    if (!apiKey) return null;
    _client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
    return _client;
  } catch {
    return null;
  }
}

export type SparkPromptKind = 'idea' | 'cheer' | 'invent' | 'wonder';

interface SparkPrompt {
  kind: SparkPromptKind;
  text: string;
}

// ── Local prompt bank ────────────────────────────────────────────────
// Hand-picked, kid-friendly, age-appropriate. Each entry is a complete
// playful nudge — short enough for a speech bubble (~80 chars max).

const IDEAS: string[] = [
  "What if your shop only sold things that GLOW in the dark? ✨",
  "Try making a product that's the color of your favorite mood!",
  "What if customers paid with high-fives instead of coins? 🙌",
  "Design a shop where every item has a tiny face. 😊",
  "Imagine a product that smells like a rainy Sunday morning!",
  "What if your shop floated in the clouds? ☁️ How would you decorate?",
  "Build a corner just for shy customers — what would it look like?",
  "Invent a product that helps people remember their dreams. 💭",
  "What if your shelves were also tiny gardens? 🌱",
  "Make something that's useless but makes people SMILE.",
  "Design a Monday-only product that makes Mondays better!",
  "What if the ceiling was a sky that changed with the weather?",
  "Try a 'mystery item' — customers buy it without knowing what it is!",
  "What's a snack that would only exist in space? 🚀",
  "Build a 'quiet hour' display for cozy afternoons.",
  "Make a product that purrs when someone hugs it. 🐈",
  "What if every customer left with a tiny gift? What would it be?",
  "Design a shop sign you'd want to see from the moon. 🌙",
  "Invent a doodad that helps homework finish itself. 📚",
  "What if your shop had a secret room? Where would the door be?",
];

const CHEERS: string[] = [
  "Look at you go! 🎉",
  "That was super creative!",
  "Yay! You're on a roll!",
  "Wow, the shop is glowing because of you ✨",
  "I knew you could do it!",
  "Big-brain moment 🧠💡",
  "That's the spirit!",
  "Confetti for you! 🎊",
  "You're making this place magical!",
  "Tiny dance, big win 💃",
  "Five sparkly stars ⭐⭐⭐⭐⭐",
  "Genius alert! 🚨",
];

const INVENTS: string[] = [
  "Quick! Invent a snack that's also a pet. What's it called?",
  "Make up a tool that helps plants tell jokes 🌿",
  "What's something a robot would buy as a gift? 🤖",
  "Invent shoes that leave glitter footprints. ✨👟",
  "Make a hat that gives advice. What does it say first?",
  "Design a backpack that ALSO is a friend.",
  "What's a homework helper made of clouds?",
  "Invent a coin that turns into something when flipped.",
];

const WONDERS: string[] = [
  "Psst — did you know shops with plants make people feel calmer? 🌿",
  "Fun fact: bright colors near the door make customers feel welcome!",
  "Cozy lighting = happy people. Try a warm corner today.",
  "A name above the door makes a shop feel like a friend!",
  "Tiny details (a little plant, a fun sign) mean a LOT.",
  "Asking 'what's missing?' is how the best inventors think.",
];

function pickFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function localPrompt(kind: SparkPromptKind): SparkPrompt {
  const text =
    kind === 'cheer'  ? pickFrom(CHEERS)  :
    kind === 'invent' ? pickFrom(INVENTS) :
    kind === 'wonder' ? pickFrom(WONDERS) :
                        pickFrom(IDEAS);
  return { kind, text };
}

// ── Daily cache ──────────────────────────────────────────────────────
// Keyed by date so the kid gets a fresh "prompt of the day" feel without
// paying for repeat LLM calls when they reopen the bubble.

const CACHE_PREFIX = 'spark_prompt_v1';

function todayKey(kind: SparkPromptKind): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return `${CACHE_PREFIX}:${kind}:${dateStr}`;
}

function readCache(kind: SparkPromptKind): string | null {
  try {
    return localStorage.getItem(todayKey(kind));
  } catch { return null; }
}

function writeCache(kind: SparkPromptKind, text: string) {
  try { localStorage.setItem(todayKey(kind), text); } catch { /* ignore */ }
}

// ── Public API ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = [
  "You are Spark, a playful magical AI companion in a kids' creativity game.",
  "Audience is 9-12 year olds. Always positive, encouraging, never scary or sad.",
  "Reply in ONE short sentence, max 18 words, with an emoji or two if it fits.",
  "Never ask for personal info. Never mention being an AI/model.",
  "Tone: warm, curious, slightly silly. Like a friendly older sibling.",
].join(' ');

const KIND_PROMPTS: Record<SparkPromptKind, string> = {
  idea:   "Give the kid a playful creative shop-idea nudge.",
  cheer:  "Cheer the kid on for a small win — short, warm, with an emoji.",
  invent: "Invite the kid to invent something silly and impossible.",
  wonder: "Share one short, age-appropriate cozy fun-fact about creativity or shops.",
};

/**
 * Get a fresh playful prompt. Tries the LLM (1 token-light call), falls back
 * to the local bank on any failure. Result is cached per-day per-kind so
 * subsequent calls are instant and free.
 *
 * `fresh: true` bypasses today's cache (used by the "give me another!" button).
 */
export async function getSparkPrompt(
  kind: SparkPromptKind = 'idea',
  opts: { fresh?: boolean } = {},
): Promise<SparkPrompt> {
  if (!opts.fresh) {
    const cached = readCache(kind);
    if (cached) return { kind, text: cached };
  }

  // Try the LLM. Wrapped so any failure (no key, network, quota, parse)
  // silently falls back to the local bank — the kid never sees an error.
  try {
    const client = await getSparkClient();
    if (client) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 60,
        temperature: 0.95,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: KIND_PROMPTS[kind] },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text && text.length > 4 && text.length <= 160) {
        writeCache(kind, text);
        return { kind, text };
      }
    }
  } catch {
    // Fall through to the local bank — by design.
  }

  const fallback = localPrompt(kind);
  writeCache(kind, fallback.text);
  return fallback;
}

/** Pick a cheer line synchronously — used for instant celebration bursts
 *  where waiting on the LLM would feel laggy. */
export function getQuickCheer(): string {
  return pickFrom(CHEERS);
}

// ── Invention generator ─────────────────────────────────────────────
// Turns a kid's free-text "idea seed" into a funny invention card. Same
// LLM-with-local-fallback shape as `getSparkPrompt`. Output is parsed from a
// strict JSON contract; if the model returns anything weird we fall through
// to the local cheeky template.

export interface InventionDraft {
  name: string;
  emoji: string;
  blurb: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const INVENTION_SYSTEM = [
  "You invent silly, kid-safe gadgets for a creativity game.",
  "Audience is 9-12 year olds. Never scary, sad, or rude.",
  "Reply ONLY with strict JSON of shape:",
  '{"name":"string (3-5 words, playful)", "emoji":"one emoji", "blurb":"<=15 word silly description", "rarity":"common|rare|epic|legendary"}',
  "No code fences, no extra prose.",
].join(' ');

// Local fallback templates so the lab is fun even with no network.
const INVENT_EMOJIS = ['🪄', '🧪', '🛠️', '🎀', '🎈', '🍩', '🐙', '🚀', '🪞', '🦄', '🎷', '🧦'];
const INVENT_ADJECTIVES = ['Cosmic', 'Dreamy', 'Wobbly', 'Lucky', 'Mystery', 'Tiny', 'Snug', 'Bouncy', 'Sparkle', 'Cloud'];
const INVENT_NOUNS = ['Whistle', 'Mitten', 'Lantern', 'Cookie', 'Compass', 'Backpack', 'Hat', 'Slipper', 'Bell', 'Wand'];
const INVENT_QUIRKS = [
  'and it giggles when wet',
  'that runs on hugs',
  'that smells like Saturday',
  'that humms back at birds',
  'that only works on Tuesdays',
  'and it knits tiny scarves',
  'that whispers compliments',
  'that turns shadows into songs',
];
const RARITIES: InventionDraft['rarity'][] = ['common', 'rare', 'epic', 'legendary'];
function localInvention(seed: string): InventionDraft {
  const cleanSeed = seed.trim().slice(0, 24);
  const adj = pickFrom(INVENT_ADJECTIVES);
  const noun = pickFrom(INVENT_NOUNS);
  const quirk = pickFrom(INVENT_QUIRKS);
  const namePieces = cleanSeed ? [adj, cleanSeed] : [adj, noun];
  return {
    name: namePieces.join(' ').replace(/\s+/g, ' ').trim() || `${adj} ${noun}`,
    emoji: pickFrom(INVENT_EMOJIS),
    blurb: `${cleanSeed ? `Spins ${cleanSeed.toLowerCase()}` : `Spins ${noun.toLowerCase()}s`} ${quirk}.`,
    // Bias toward common, sprinkle of rares — keeps "epic/legendary" special.
    rarity: RARITIES[Math.min(3, Math.floor(Math.pow(Math.random(), 2.2) * 4))],
  };
}

/** Generate one invention card from a free-text seed. Network-fast on
 *  success, but always returns SOMETHING — never throws. */
export async function generateInvention(seed: string): Promise<InventionDraft> {
  try {
    const client = await getSparkClient();
    if (client) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 120,
        temperature: 1.05,
        messages: [
          { role: 'system', content: INVENTION_SYSTEM },
          { role: 'user',   content: `Idea seed: "${seed.slice(0, 80) || 'something fun'}". Give me one invention.` },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      const draft = safeParseInvention(text);
      if (draft) return draft;
    }
  } catch { /* fall through */ }
  return localInvention(seed);
}

function safeParseInvention(s: string): InventionDraft | null {
  try {
    // Strip stray code fences just in case the model added them.
    const cleaned = s.replace(/^```(?:json)?|```$/g, '').trim();
    const obj = JSON.parse(cleaned);
    if (typeof obj?.name !== 'string' || typeof obj?.blurb !== 'string') return null;
    const emoji = typeof obj?.emoji === 'string' && obj.emoji.length <= 4 ? obj.emoji : '🪄';
    const rarity: InventionDraft['rarity'] =
      obj?.rarity === 'rare' || obj?.rarity === 'epic' || obj?.rarity === 'legendary'
        ? obj.rarity : 'common';
    return {
      name: String(obj.name).slice(0, 36),
      emoji,
      blurb: String(obj.blurb).slice(0, 120),
      rarity,
    };
  } catch { return null; }
}

// ── Daily Creative Quest ────────────────────────────────────────────

export interface DailyQuestDraft {
  title: string;     // <= 60 chars
  hint: string;      // 1 short line of guidance
}

const DAILY_SYSTEM = [
  "You write one playful daily creative challenge for a kids' shop-building game.",
  "Audience 9-12. Always positive, safe, doable in a few minutes.",
  "Reply ONLY with JSON: {\"title\":\"<=60 chars, fun and specific\", \"hint\":\"<=80 chars supportive nudge\"}",
].join(' ');

const LOCAL_QUESTS: DailyQuestDraft[] = [
  { title: 'Design a shop where everything is BLUE 💙', hint: 'Even the floor! Bonus points if your sign matches.' },
  { title: 'Invent something that doesn\'t exist yet ✨', hint: 'Make it up in the Invention Lab and save the card.' },
  { title: 'Add a cozy reading nook to your shop 📚', hint: 'A chair + a plant + a warm lamp does the trick.' },
  { title: 'Make your shop sound like rain 🌧️', hint: 'Pick blues, greys, soft greens — calm vibes only.' },
  { title: 'Give Wei a new helper today 🤝', hint: 'Visit Operations to hire a teammate.' },
  { title: 'Decorate using only ROUND things 🔵', hint: 'Tables, pots, lamps — circles all the way down.' },
  { title: 'Make a shop a tiny bunny would love 🐰', hint: 'Soft colors, low furniture, a little garden corner.' },
  { title: 'Build a "future bakery" 🥖🚀', hint: 'Imagine cookies that float. What would the counter look like?' },
];

export async function generateDailyQuest(): Promise<DailyQuestDraft> {
  try {
    const client = await getSparkClient();
    if (client) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 80,
        temperature: 0.9,
        messages: [
          { role: 'system', content: DAILY_SYSTEM },
          { role: 'user',   content: 'One quest for today, please.' },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? '';
      try {
        const cleaned = text.replace(/^```(?:json)?|```$/g, '').trim();
        const obj = JSON.parse(cleaned);
        if (typeof obj?.title === 'string' && typeof obj?.hint === 'string') {
          return { title: String(obj.title).slice(0, 80), hint: String(obj.hint).slice(0, 100) };
        }
      } catch { /* fall through */ }
    }
  } catch { /* fall through */ }
  return pickFrom(LOCAL_QUESTS);
}

const REVIEW_LINES = [
  'That\'s SO creative! ⭐',
  'I want to live in this shop. 🌟',
  'You leveled up your imagination! 🎉',
  'Honestly, perfect. 🥳',
  'My favorite one this week! 💖',
];

/** Short upbeat review when the kid marks a quest done. */
export async function reviewQuest(): Promise<string> {
  try {
    const client = await getSparkClient();
    if (client) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 40,
        temperature: 1.0,
        messages: [
          { role: 'system', content: "Reply with ONE warm 1-sentence reaction to a kid finishing a creative challenge. Max 14 words. Add an emoji." },
          { role: 'user',   content: 'They did it!' },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text && text.length > 4 && text.length <= 100) return text;
    }
  } catch { /* fall through */ }
  return pickFrom(REVIEW_LINES);
}
