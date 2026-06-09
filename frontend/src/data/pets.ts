/**
 * pets.ts — catalog of unlockable pet companions.
 *
 * Each pet has:
 *   • Visual identity (name, emoji, gradient + accent for the trophy
 *     shelf card, glb path for the 3D model in-shop).
 *   • Tier — `common` / `rare` / `legendary`. Tiers drive trophy
 *     styling and bazaar pricing.
 *   • Unlock method — exactly ONE of:
 *       - `starter`  : owned from day one (a couple of friendly faces)
 *       - `badge`    : earned by claiming an achievement (the existing
 *                      auto-award path keeps working — just expand the
 *                      badge → pet map by adding entries here)
 *       - `coins`    : bought in the Mystery Bazaar for in-game coins
 *       - `secret`   : awarded for finding a hidden secret in the shop
 *                      (legendary tier; rare reward for explorers)
 *
 * Adding a new pet: drop a `Pet` object below. The collection helpers
 * + InventoryPanel pick it up automatically.
 */

export type PetTier = 'common' | 'rare' | 'legendary';

export type PetUnlock =
  | { type: 'starter' }
  | { type: 'badge'; badge: string }
  | { type: 'coins'; cost: number }
  | { type: 'secret'; secretId: string };

export interface Pet {
  id: string;
  name: string;
  emoji: string;
  /** Tailwind background gradient for the trophy shelf card. */
  gradient: string;
  /** Path to the 3D GLB inside /public. */
  glbPath: string;
  /** Three.js color tint for the soft aura around the pet body. */
  auraHex: string;
  tier: PetTier;
  unlock: PetUnlock;
  /** Flavor line shown in the trophy shelf + on first unlock. */
  blurb: string;
}

const PETS_PATH = '/assets/Pets';

// ─── Catalog ─────────────────────────────────────────────────────────
// 24 animal GLB models + a tier/unlock plan that maps cleanly to the
// existing achievement & bazaar systems.

export const PETS: Pet[] = [
  // ── Starters (3) ─ owned from day one so every kid begins with a pet ──
  { id: 'bunny', name: 'Bunny', emoji: '🐰', tier: 'common',
    gradient: 'from-rose-200 via-pink-200 to-orange-200',
    glbPath: `${PETS_PATH}/animal-bunny.glb`, auraHex: '#fbcfe8',
    unlock: { type: 'starter' },
    blurb: 'Hops around the shop. Loves carrots and quiet corners.' },
  { id: 'chick', name: 'Chick', emoji: '🐤', tier: 'common',
    gradient: 'from-yellow-200 via-amber-200 to-orange-200',
    glbPath: `${PETS_PATH}/animal-chick.glb`, auraHex: '#fde68a',
    unlock: { type: 'starter' },
    blurb: 'A tiny fluff-ball who follows you everywhere.' },
  { id: 'bee', name: 'Bee', emoji: '🐝', tier: 'common',
    gradient: 'from-amber-200 via-yellow-200 to-lime-200',
    glbPath: `${PETS_PATH}/animal-bee.glb`, auraHex: '#fcd34d',
    unlock: { type: 'starter' },
    blurb: 'Buzzes happily near flowers. Surprisingly polite.' },

  // ── Badge unlocks (6) ─ tied to existing achievements ──
  { id: 'dog', name: 'Puppy', emoji: '🐶', tier: 'common',
    gradient: 'from-amber-200 via-orange-200 to-rose-200',
    glbPath: `${PETS_PATH}/animal-dog.glb`, auraHex: '#fdba74',
    unlock: { type: 'badge', badge: 'first_steps' },
    blurb: 'Your first best friend. Wags tail at every product you make.' },
  { id: 'cat', name: 'Kitty', emoji: '🐱', tier: 'common',
    gradient: 'from-violet-200 via-fuchsia-200 to-pink-200',
    glbPath: `${PETS_PATH}/animal-cat.glb`, auraHex: '#d8b4fe',
    unlock: { type: 'badge', badge: 'decorator_pro' },
    blurb: 'Naps on the nicest furniture. Purrs when you redecorate.' },
  { id: 'fox', name: 'Fox', emoji: '🦊', tier: 'rare',
    gradient: 'from-orange-200 via-red-200 to-rose-200',
    glbPath: `${PETS_PATH}/animal-fox.glb`, auraHex: '#fb923c',
    unlock: { type: 'badge', badge: 'tech_innovator' },
    blurb: 'Quick + clever. Spots opportunities you might have missed.' },
  { id: 'monkey', name: 'Monkey', emoji: '🐵', tier: 'common',
    gradient: 'from-amber-200 via-orange-200 to-yellow-200',
    glbPath: `${PETS_PATH}/animal-monkey.glb`, auraHex: '#fdba74',
    unlock: { type: 'badge', badge: 'team_builder' },
    blurb: 'Cheers loudly when your team grows. Excellent high-five form.' },
  { id: 'cow', name: 'Cow', emoji: '🐄', tier: 'common',
    gradient: 'from-slate-200 via-stone-200 to-amber-200',
    glbPath: `${PETS_PATH}/animal-cow.glb`, auraHex: '#e7e5e4',
    unlock: { type: 'badge', badge: 'money_maker' },
    blurb: 'Moo-ves around the shop chewing money grass. Lucky charm.' },
  { id: 'parrot', name: 'Parrot', emoji: '🦜', tier: 'rare',
    gradient: 'from-emerald-200 via-teal-200 to-sky-200',
    glbPath: `${PETS_PATH}/animal-parrot.glb`, auraHex: '#5eead4',
    unlock: { type: 'badge', badge: 'week_champion' },
    blurb: 'Repeats your best compliments back at you. Loyal beyond words.' },

  // ── Coin unlocks (12) ─ bought from Mystery Bazaar ──
  { id: 'pig', name: 'Pig', emoji: '🐷', tier: 'common',
    gradient: 'from-pink-200 via-rose-200 to-fuchsia-200',
    glbPath: `${PETS_PATH}/animal-pig.glb`, auraHex: '#fbcfe8',
    unlock: { type: 'coins', cost: 60 },
    blurb: 'Snorts when business is booming. Comically smart.' },
  { id: 'crab', name: 'Crab', emoji: '🦀', tier: 'common',
    gradient: 'from-rose-200 via-orange-200 to-amber-200',
    glbPath: `${PETS_PATH}/animal-crab.glb`, auraHex: '#fda4af',
    unlock: { type: 'coins', cost: 60 },
    blurb: 'Sideways walker. Pinches mean customers (lovingly).' },
  { id: 'fish', name: 'Fish', emoji: '🐟', tier: 'common',
    gradient: 'from-sky-200 via-cyan-200 to-blue-200',
    glbPath: `${PETS_PATH}/animal-fish.glb`, auraHex: '#7dd3fc',
    unlock: { type: 'coins', cost: 60 },
    blurb: 'Floats in mid-air like nothing weird is happening.' },
  { id: 'penguin', name: 'Penguin', emoji: '🐧', tier: 'common',
    gradient: 'from-sky-200 via-blue-200 to-slate-200',
    glbPath: `${PETS_PATH}/animal-penguin.glb`, auraHex: '#bae6fd',
    unlock: { type: 'coins', cost: 80 },
    blurb: 'Waddles between customers. Hands out cold ice cream.' },
  { id: 'beaver', name: 'Beaver', emoji: '🦫', tier: 'common',
    gradient: 'from-amber-200 via-orange-200 to-stone-200',
    glbPath: `${PETS_PATH}/animal-beaver.glb`, auraHex: '#fdba74',
    unlock: { type: 'coins', cost: 80 },
    blurb: 'Repairs furniture in their sleep. Builds tiny shop signs.' },
  { id: 'deer', name: 'Deer', emoji: '🦌', tier: 'rare',
    gradient: 'from-amber-200 via-orange-200 to-rose-200',
    glbPath: `${PETS_PATH}/animal-deer.glb`, auraHex: '#fbbf24',
    unlock: { type: 'coins', cost: 120 },
    blurb: 'Gentle and curious. Always finds the prettiest spot to stand.' },
  { id: 'koala', name: 'Koala', emoji: '🐨', tier: 'rare',
    gradient: 'from-slate-200 via-stone-200 to-zinc-200',
    glbPath: `${PETS_PATH}/animal-koala.glb`, auraHex: '#d4d4d8',
    unlock: { type: 'coins', cost: 120 },
    blurb: 'Naps on the nearest shelf. Wakes up only for snacks.' },
  { id: 'caterpillar', name: 'Caterpillar', emoji: '🐛', tier: 'common',
    gradient: 'from-lime-200 via-emerald-200 to-teal-200',
    glbPath: `${PETS_PATH}/animal-caterpillar.glb`, auraHex: '#86efac',
    unlock: { type: 'coins', cost: 60 },
    blurb: 'Inches along, totally unhurried. Excellent listener.' },
  { id: 'hog', name: 'Hedgehog', emoji: '🦔', tier: 'common',
    gradient: 'from-amber-200 via-orange-200 to-stone-200',
    glbPath: `${PETS_PATH}/animal-hog.glb`, auraHex: '#fcd34d',
    unlock: { type: 'coins', cost: 80 },
    blurb: 'Spiky on the outside, soft on the inside. Sleeps a lot.' },
  { id: 'giraffe', name: 'Giraffe', emoji: '🦒', tier: 'rare',
    gradient: 'from-yellow-200 via-amber-200 to-orange-200',
    glbPath: `${PETS_PATH}/animal-giraffe.glb`, auraHex: '#fcd34d',
    unlock: { type: 'coins', cost: 150 },
    blurb: 'Towers over the shop. Spots fresh customers from far away.' },
  { id: 'elephant', name: 'Elephant', emoji: '🐘', tier: 'rare',
    gradient: 'from-zinc-200 via-stone-200 to-slate-200',
    glbPath: `${PETS_PATH}/animal-elephant.glb`, auraHex: '#a8a29e',
    unlock: { type: 'coins', cost: 150 },
    blurb: 'Big heart, soft footsteps. Trumpets gently when happy.' },
  { id: 'panda', name: 'Panda', emoji: '🐼', tier: 'rare',
    gradient: 'from-white via-slate-100 to-stone-200',
    glbPath: `${PETS_PATH}/animal-panda.glb`, auraHex: '#e7e5e4',
    unlock: { type: 'coins', cost: 180 },
    blurb: 'Munches bamboo near the counter. Universally adored.' },

  // ── Legendary / Secret unlocks (3) — for explorers ──
  { id: 'tiger', name: 'Tiger', emoji: '🐯', tier: 'legendary',
    gradient: 'from-orange-300 via-amber-300 to-yellow-200',
    glbPath: `${PETS_PATH}/animal-tiger.glb`, auraHex: '#fb923c',
    unlock: { type: 'secret', secretId: 'secret_corner_tl' },
    blurb: 'Tap-spot trophy: the top-left whisper revealed a tiger cub.' },
  { id: 'lion', name: 'Lion', emoji: '🦁', tier: 'legendary',
    gradient: 'from-amber-300 via-orange-300 to-rose-300',
    glbPath: `${PETS_PATH}/animal-lion.glb`, auraHex: '#f59e0b',
    unlock: { type: 'secret', secretId: 'secret_corner_tr' },
    blurb: 'Roars softly at sunrise. The top-right twinkle was its mane.' },
  { id: 'polar', name: 'Polar Bear', emoji: '🐻‍❄️', tier: 'legendary',
    gradient: 'from-sky-100 via-cyan-100 to-blue-200',
    glbPath: `${PETS_PATH}/animal-polar.glb`, auraHex: '#bae6fd',
    unlock: { type: 'secret', secretId: 'secret_corner_br' },
    blurb: 'A snowy spirit from the back-right hum. Rare and majestic.' },
];

// ─── Lookups ─────────────────────────────────────────────────────────

export function findPet(id: string): Pet | undefined {
  return PETS.find((p) => p.id === id);
}

/** Pet awarded for claiming a specific achievement (auto-grant path). */
export function petForBadge(badgeId: string): Pet | undefined {
  return PETS.find((p) => p.unlock.type === 'badge' && p.unlock.badge === badgeId);
}

/** Pet awarded for discovering a specific hidden secret. */
export function petForSecret(secretId: string): Pet | undefined {
  return PETS.find((p) => p.unlock.type === 'secret' && p.unlock.secretId === secretId);
}

/** All pets that can be bought from the Mystery Bazaar. */
export function purchasablePets(): Pet[] {
  return PETS.filter((p) => p.unlock.type === 'coins');
}

/** Pets owned out of the box (no unlock action needed). */
export function starterPetIds(): string[] {
  return PETS.filter((p) => p.unlock.type === 'starter').map((p) => p.id);
}
