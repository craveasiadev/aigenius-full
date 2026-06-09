import { starterPetIds } from '../data/pets';

/**
 * collection.ts — tiny localStorage store for the magical-layer collectibles.
 *
 * One source of truth for "what has the kid actually unlocked": pets,
 * invention cards, hidden-spot secrets, the festival quests they've finished,
 * and which pet is currently active. Kept dumb on purpose — every reader uses
 * the same helpers so we don't get N copies of localStorage typos in pages.
 *
 * Storage is shared across the device (not per-genius) so collectibles
 * survive sign-out + sign-in on the same machine. Each helper subscribes
 * via a tiny event bus so the UI updates the moment anything changes.
 */

const KEY = {
  pets:        'aigenius_owned_pets_v1',
  activePet:   'aigenius_active_pet_v1',
  inventions:  'aigenius_inventions_v1',
  secrets:     'aigenius_secrets_v1',
  questDate:   'aigenius_quest_date_v1',
  questDone:   'aigenius_quest_done_v1',
  sfxOn:       'aigenius_sfx_v1',
} as const;

export interface InventionCard {
  id: string;          // generated client-side
  name: string;
  emoji: string;
  blurb: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  createdAt: number;   // epoch ms
}

type SetListener = () => void;
const listeners = new Set<SetListener>();
function emit() { for (const l of listeners) l(); }

/** Subscribe to any collection change (pet/invention/secret/quest). Returns
 *  an unsubscribe fn. Used by `useCollection()` for live UI updates. */
export function subscribe(fn: SetListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Generic list helpers ────────────────────────────────────────────────

function readList<T = string>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeList(key: string, list: unknown[]) {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* ignore */ }
  emit();
}

// ── Pets ────────────────────────────────────────────────────────────────

export function getOwnedPets(): string[] {
  // Starter pets are granted implicitly the first time the list is
  // read — keeps the kid from staring at an empty shelf on day one.
  // We do this lazily so the catalog can evolve without a migration.
  let owned = readList<string>(KEY.pets);
  let added = false;
  for (const id of getStarterPetIdsLazy()) {
    if (!owned.includes(id)) {
      owned = [...owned, id];
      added = true;
    }
  }
  if (added) {
    try { localStorage.setItem(KEY.pets, JSON.stringify(owned)); } catch { /* ignore */ }
    if (!getActivePet() && owned.length > 0) {
      try { localStorage.setItem(KEY.activePet, owned[0]); } catch { /* ignore */ }
    }
  }
  return owned;
}
export function ownsPet(id: string): boolean { return getOwnedPets().includes(id); }
/** Returns true if this was a NEW unlock (so the caller can fire a burst). */
export function grantPet(id: string): boolean {
  const owned = getOwnedPets();
  if (owned.includes(id)) return false;
  writeList(KEY.pets, [...owned, id]);
  // First pet unlocked? Auto-activate it.
  if (!getActivePet()) setActivePet(id);
  return true;
}

// Static import — pets.ts doesn't import collection.ts so this is
// safe (no circular dep). Cached to a local so the helper stays
// allocation-free on hot paths.
let _starterCache: string[] | null = null;
function getStarterPetIdsLazy(): string[] {
  if (_starterCache) return _starterCache;
  _starterCache = starterPetIds();
  return _starterCache;
}

export function getActivePet(): string | null {
  try { return localStorage.getItem(KEY.activePet); } catch { return null; }
}
export function setActivePet(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY.activePet, id);
    else localStorage.removeItem(KEY.activePet);
  } catch { /* ignore */ }
  emit();
}

// ── Inventions ──────────────────────────────────────────────────────────

export function getInventions(): InventionCard[] { return readList<InventionCard>(KEY.inventions); }
export function addInvention(card: InventionCard) {
  const all = getInventions();
  // Cap at 40 so the localStorage blob never grows without bound; oldest wins.
  const next = [card, ...all].slice(0, 40);
  writeList(KEY.inventions, next);
}

// ── Hidden secrets ──────────────────────────────────────────────────────

export function getSecrets(): string[] { return readList<string>(KEY.secrets); }
export function ownsSecret(id: string): boolean { return getSecrets().includes(id); }
export function grantSecret(id: string): boolean {
  const owned = getSecrets();
  if (owned.includes(id)) return false;
  writeList(KEY.secrets, [...owned, id]);
  return true;
}

// ── Daily quest persistence ─────────────────────────────────────────────

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getQuestDateStamp(): string | null {
  try { return localStorage.getItem(KEY.questDate); } catch { return null; }
}
export function setQuestDateStamp(stamp: string) {
  try { localStorage.setItem(KEY.questDate, stamp); } catch { /* ignore */ }
  emit();
}
export function isQuestDoneToday(): boolean {
  try {
    return localStorage.getItem(KEY.questDone) === todayStamp();
  } catch { return false; }
}
export function markQuestDoneToday() {
  try { localStorage.setItem(KEY.questDone, todayStamp()); } catch { /* ignore */ }
  emit();
}

// ── SFX setting ─────────────────────────────────────────────────────────

export function isSfxOn(): boolean {
  try {
    const v = localStorage.getItem(KEY.sfxOn);
    return v === null ? true : v === '1';   // default ON
  } catch { return true; }
}
export function setSfxOn(on: boolean) {
  try { localStorage.setItem(KEY.sfxOn, on ? '1' : '0'); } catch { /* ignore */ }
  emit();
}
