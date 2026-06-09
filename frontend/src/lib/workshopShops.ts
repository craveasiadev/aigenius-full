/**
 * Workshop shops catalog + per-student unlock state.
 *
 * A "workshop shop" is a real-world business that runs an entrepreneurship
 * workshop for AIpreneur students (e.g. Zus Coffee, Mamee, Jungle Gym,
 * AirAsia). When a student attends one of these workshops, the host shop
 * scans the student's QR code, and the shop appears on the student's
 * globe hub as a new playable destination.
 *
 * Phase-1 storage:
 *   • The catalog is a static TypeScript constant. Eventually an admin
 *     UI will let staff register new workshop shops; that will turn this
 *     module into a thin client around `/api/admin/workshop-shops`.
 *   • Per-student unlock state lives in `localStorage` under the key
 *     `aipreneur_unlocked_shops_<studentId>`. Same migration path —
 *     once the backend has the table we'll move reads + writes to
 *     `/api/workshop-shops/unlocked` and replace this module's body.
 *
 * Why localStorage now: the student's globe + scanner flow can be demoed
 * and tested end-to-end without any backend changes. The shape we
 * persist here (a string array of shop IDs) matches what a future
 * `student_unlocked_shops` table would return, so the swap is a one-file
 * change.
 */

export type WorkshopShopId = 'zus' | 'mamee' | 'junglegym' | 'airasia';

export interface WorkshopShop {
  id: WorkshopShopId;
  /** Display name on the globe label + scanner UI. */
  name: string;
  /** Public asset path for the building art (carousel + iso). */
  imagePath: string;
  /** Plain-English description of the business. Surfaced on the entry
   *  card and in the admin registry table. */
  businessNature: string;
  /** Which iso-world business modules unlock for the student after
   *  they enter this shop (cafe, retail, etc.). Reserved for Phase 4 —
   *  for now the iso scene treats every shop the same. */
  modules: string[];
}

export const WORKSHOP_SHOPS: WorkshopShop[] = [
  {
    id: 'zus',
    name: 'Zus Coffee',
    imagePath: '/assets/World/Zus.png',
    businessNature: 'Specialty coffee chain — café service, barista skills, loyalty programs.',
    modules: ['cafe', 'marketing'],
  },
  {
    id: 'mamee',
    name: 'Mamee',
    imagePath: '/assets/World/Mamee.png',
    businessNature: 'Snack manufacturer — production lines, FMCG distribution, brand mascots.',
    modules: ['factory', 'marketing'],
  },
  {
    id: 'junglegym',
    name: 'Jungle Gym',
    imagePath: '/assets/World/junglegym.png',
    businessNature: 'Kids fitness centre — class scheduling, instructor coaching, membership.',
    modules: ['service', 'operations'],
  },
  {
    id: 'airasia',
    name: 'AirAsia',
    imagePath: '/assets/World/airport.png',
    businessNature: 'Budget airline — flight ops, customer service, dynamic pricing.',
    modules: ['logistics', 'operations'],
  },
];

export function findWorkshopShop(id: string): WorkshopShop | undefined {
  return WORKSHOP_SHOPS.find((s) => s.id === id);
}

// ── Per-student unlock state ────────────────────────────────────────

const STORAGE_PREFIX = 'aipreneur_unlocked_shops_';

function storageKey(studentId: string): string {
  return `${STORAGE_PREFIX}${studentId}`;
}

/** Read unlocked shop IDs for a student. Always returns a fresh array. */
export function getUnlockedShopIds(studentId: string): WorkshopShopId[] {
  if (typeof window === 'undefined' || !studentId) return [];
  try {
    const raw = localStorage.getItem(storageKey(studentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Drop any IDs that no longer match the catalog (e.g. removed shop).
    return parsed.filter((id): id is WorkshopShopId =>
      WORKSHOP_SHOPS.some((s) => s.id === id),
    );
  } catch {
    return [];
  }
}

/** Resolve unlocked IDs into the full WorkshopShop records. */
export function getUnlockedShops(studentId: string): WorkshopShop[] {
  const ids = getUnlockedShopIds(studentId);
  return ids
    .map((id) => WORKSHOP_SHOPS.find((s) => s.id === id))
    .filter((s): s is WorkshopShop => s !== undefined);
}

/**
 * Add a workshop shop to a student's unlocked list. Returns true when
 * the shop was newly added (i.e. the caller should show a celebratory
 * toast); false if the student already had it.
 */
export function unlockShopForStudent(
  studentId: string,
  shopId: WorkshopShopId,
): boolean {
  if (typeof window === 'undefined' || !studentId) return false;
  const current = getUnlockedShopIds(studentId);
  if (current.includes(shopId)) return false;
  const next = [...current, shopId];
  localStorage.setItem(storageKey(studentId), JSON.stringify(next));
  // Custom event so any open dashboard tab can refetch without a full
  // navigation — handy when the student watches their globe in one tab
  // while the workshop staff scans in another.
  window.dispatchEvent(
    new CustomEvent('aipreneur:shop-unlocked', {
      detail: { studentId, shopId },
    }),
  );
  return true;
}

// ── Student QR payload ─────────────────────────────────────────────

export interface StudentQRPayload {
  /** Magic string so a scanner can sanity-check the QR is one of ours. */
  kind: 'aipreneur-student';
  studentId: string;
  /** Display name shown to the scanner staff before confirming. */
  name?: string;
  /** Wall-clock at generation — lets us reject ancient screenshots. */
  ts: number;
}

export function buildStudentQRPayload(
  studentId: string,
  name?: string,
): string {
  const payload: StudentQRPayload = {
    kind: 'aipreneur-student',
    studentId,
    name,
    ts: Date.now(),
  };
  return JSON.stringify(payload);
}

export function parseStudentQRPayload(raw: string): StudentQRPayload | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind !== 'aipreneur-student') return null;
    if (typeof parsed.studentId !== 'string' || !parsed.studentId) return null;
    return parsed as StudentQRPayload;
  } catch {
    return null;
  }
}
