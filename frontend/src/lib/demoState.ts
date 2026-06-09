/**
 * Demo-only state, isolated from the live `/s/aipreneur` data layer.
 *
 * Why it exists:
 *   `/demo` is a marketing-grade walkthrough of the game. Everything a
 *   visitor does there — placing furniture, changing wall colours,
 *   "running a campaign" — must be self-contained: no Laravel calls, no
 *   localStorage keys that overlap with a logged-in student's saved
 *   shop, no chance of demo edits ever bleeding into the real player's
 *   `business.interior_config`.
 *
 * Storage layout:
 *   • Key  `aipreneur_demo_interior_v1`  →  IsoInteriorLayout
 *   The `_v1` suffix lets us migrate (or just nuke + reseed) without
 *   pulling in old, possibly-broken records.
 *
 * Eventing:
 *   `setDemoInterior` dispatches the `demo:interior-changed` window
 *   event. The demo page listens for it so changes made in a modal
 *   (e.g. the Decorate sheet) refresh the iso scene live without a
 *   prop-drilled setter.
 */
import {
  hydrateLayout,
  makeDefaultLayout,
  type IsoInteriorLayout,
} from '../components/iso/interiorLayout';

const INTERIOR_KEY = 'aipreneur_demo_interior_v1';
export const DEMO_INTERIOR_EVENT = 'demo:interior-changed';

export function getDemoInterior(): IsoInteriorLayout {
  if (typeof window === 'undefined') return makeDefaultLayout();
  try {
    const raw = localStorage.getItem(INTERIOR_KEY);
    if (!raw) return makeDefaultLayout();
    return hydrateLayout(JSON.parse(raw));
  } catch {
    return makeDefaultLayout();
  }
}

export function setDemoInterior(next: IsoInteriorLayout): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTERIOR_KEY, JSON.stringify(next));
  } catch {
    /* Storage quota / private mode — best-effort, the in-memory state
       still updates so the demo stays playable for the rest of the
       session. */
  }
  window.dispatchEvent(new CustomEvent(DEMO_INTERIOR_EVENT));
}

export function resetDemoInterior(): IsoInteriorLayout {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(INTERIOR_KEY); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(DEMO_INTERIOR_EVENT));
  }
  return makeDefaultLayout();
}

// ── Module slices (products, staff, marketing, innovation, csr) ────
//
// Every module on /demo persists its own little blob under a key
// prefixed `aipreneur_demo_<slice>_v1`. Same isolation guarantee as
// the interior: never overlaps with anything the live `useAIpreneur`
// hook reads or writes. Each slice has its own change event so a
// reset on one doesn't churn the others.

function loadSlice<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveSlice<T>(key: string, value: T, eventName: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota or private mode — best effort */ }
  window.dispatchEvent(new CustomEvent(eventName));
}

// ── Products ─────────────────────────────────────────────────────
const PRODUCTS_KEY = 'aipreneur_demo_products_v1';
export const DEMO_PRODUCTS_EVENT = 'demo:products-changed';

export interface DemoProduct {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: string;
}

export const getDemoProducts = (): DemoProduct[] =>
  loadSlice<DemoProduct[]>(PRODUCTS_KEY, []);
export const setDemoProducts = (next: DemoProduct[]): void =>
  saveSlice(PRODUCTS_KEY, next, DEMO_PRODUCTS_EVENT);

// ── Staff ────────────────────────────────────────────────────────
const STAFF_KEY = 'aipreneur_demo_staff_v1';
export const DEMO_STAFF_EVENT = 'demo:staff-changed';

export interface DemoStaff {
  id: string;
  name: string;
  role: 'cashier' | 'barista' | 'manager' | 'cleaner';
  speed: number;     // 1–10
  friendliness: number; // 1–10
  morale: number;   // 0–100
}

export const getDemoStaff = (): DemoStaff[] =>
  loadSlice<DemoStaff[]>(STAFF_KEY, []);
export const setDemoStaff = (next: DemoStaff[]): void =>
  saveSlice(STAFF_KEY, next, DEMO_STAFF_EVENT);

// ── Marketing campaigns ──────────────────────────────────────────
const MARKETING_KEY = 'aipreneur_demo_marketing_v1';
export const DEMO_MARKETING_EVENT = 'demo:marketing-changed';

export interface DemoCampaign {
  id: string;
  channel: 'social' | 'billboard' | 'influencer' | 'flyer';
  audience: 'kids' | 'teens' | 'families' | 'students';
  reach: number;
  startedAt: number;
}

export interface DemoMarketingState {
  campaigns: DemoCampaign[];
  popularityBoost: number;
}

export const getDemoMarketing = (): DemoMarketingState =>
  loadSlice<DemoMarketingState>(MARKETING_KEY, { campaigns: [], popularityBoost: 0 });
export const setDemoMarketing = (next: DemoMarketingState): void =>
  saveSlice(MARKETING_KEY, next, DEMO_MARKETING_EVENT);

// ── Innovations ──────────────────────────────────────────────────
const INNOVATION_KEY = 'aipreneur_demo_innovation_v1';
export const DEMO_INNOVATION_EVENT = 'demo:innovation-changed';

export type DemoInnovationId =
  | 'ai_kiosk'
  | 'smart_queue'
  | 'targeting_ai'
  | 'robo_cleaner'
  | 'analytics_hub';

export interface DemoInnovationState {
  unlocked: DemoInnovationId[];
}

export const getDemoInnovation = (): DemoInnovationState =>
  loadSlice<DemoInnovationState>(INNOVATION_KEY, { unlocked: [] });
export const setDemoInnovation = (next: DemoInnovationState): void =>
  saveSlice(INNOVATION_KEY, next, DEMO_INNOVATION_EVENT);

// ── CSR ──────────────────────────────────────────────────────────
const CSR_KEY = 'aipreneur_demo_csr_v1';
export const DEMO_CSR_EVENT = 'demo:csr-changed';

export type DemoCauseId = 'education' | 'environment' | 'health' | 'community';

export interface DemoCSRState {
  totalDonated: number;
  byCause: Partial<Record<DemoCauseId, number>>;
  socialGoodScore: number; // 0–100
}

export const getDemoCSR = (): DemoCSRState =>
  loadSlice<DemoCSRState>(CSR_KEY, {
    totalDonated: 0, byCause: {}, socialGoodScore: 0,
  });
export const setDemoCSR = (next: DemoCSRState): void =>
  saveSlice(CSR_KEY, next, DEMO_CSR_EVENT);

// ── Finance ─────────────────────────────────────────────────────
//
// Vault balance + simulated daily sales. Mirrors the live FinancePage
// metrics (today's revenue, profit, visitors, sales) but synthesised
// from the demo products + a small RNG-driven ledger.
const FINANCE_KEY = 'aipreneur_demo_finance_v1';
export const DEMO_FINANCE_EVENT = 'demo:finance-changed';

export interface DemoLedgerEntry {
  id: string;
  emoji: string;
  label: string;
  amount: number;     // signed
  ts: number;
}

export interface DemoFinanceState {
  /** Profit coins available in the vault. */
  balance: number;
  /** Recorded today's totals — rotate via `dayStamp` so a new day
   *  resets the daily ticker. */
  dayStamp: string;
  todayRevenue: number;
  todayVisitors: number;
  todayProfit: number;
  todaySales: number;
  /** All-time aggregates. */
  totalRevenue: number;
  totalProfit: number;
  totalVisitors: number;
  /** 7 most-recent daily revenue numbers, oldest → newest. */
  weeklyRevenue: number[];
  /** Recent transactions (most-recent first, capped at 20). */
  ledger: DemoLedgerEntry[];
  /** Math-game win record. Daily play-once gate, like the live module. */
  mathGameLastPlayed: string;
}

export function getDemoFinance(): DemoFinanceState {
  return loadSlice<DemoFinanceState>(FINANCE_KEY, {
    balance: 250,
    dayStamp: '',
    todayRevenue: 0,
    todayVisitors: 0,
    todayProfit: 0,
    todaySales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalVisitors: 0,
    weeklyRevenue: [12, 28, 19, 41, 33, 58, 47],
    ledger: [],
    mathGameLastPlayed: '',
  });
}
export const setDemoFinance = (next: DemoFinanceState): void =>
  saveSlice(FINANCE_KEY, next, DEMO_FINANCE_EVENT);
