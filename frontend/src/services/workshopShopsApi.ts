/**
 * Event-workshop shops API.
 *
 * Two responsibilities:
 *   1. Admin CRUD against the Laravel `workshop_shops` table —
 *      `GET / POST / PUT / DELETE /api/admin/event-workshops/*`.
 *   2. Student-side read of the live catalog + per-student unlocked
 *      list — `GET /api/workshop-shops`, `GET /api/workshop-shops/
 *      unlocked`, `POST /api/workshop-shops/{id}/unlock`.
 *
 * Phase-1 dual-mode:
 *   Every call goes through `tryApi(...)`. On any network error or
 *   non-2xx response we fall back to `localStorage` so the admin UI
 *   stays usable while the backend endpoints are still being built.
 *   When the Laravel migrations + controllers ship, the fallback
 *   becomes dead code — no callsite changes required.
 *
 * Cache:
 *   Reads are cached in-memory with a short TTL so the admin table,
 *   the globe carousel, and the scanner page don't slam the same
 *   endpoint three times per render. `invalidate()` is called after
 *   every write.
 */
import { api, ApiError } from '../lib/api';

export interface WorkshopShop {
  id: string;
  /** Display name on the globe carousel + admin table. */
  name: string;
  /** Sponsoring company (KitKat, AirAsia, Zus Holdings, etc.). */
  companyName: string;
  /** Plain-English description of the workshop / business focus. */
  businessNature: string;
  /** Absolute URL to the optimised PNG / JPG that becomes the
   *  globe building's billboard texture. */
  shopImageUrl: string;
  /** Which business modules unlock for the student post-scan.
   *  Reserved for Phase 4 — defaults to `['cafe']`. */
  modules: string[];
  /** Soft-delete flag. When false the shop is hidden from scanners
   *  and from any student who hasn't already unlocked it. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkshopShopUnlock {
  id: string;
  studentId: string;
  workshopShopId: string;
  scannedByUserId: string | null;
  scannedAt: string;
}

export interface CreateWorkshopShopInput {
  name: string;
  companyName: string;
  businessNature: string;
  shopImageDataUrl: string; // base64; backend decodes + stores
  modules?: string[];
  isActive?: boolean;
}

export type UpdateWorkshopShopInput = Partial<CreateWorkshopShopInput> & { id: string };

// ── Local-storage fallback ───────────────────────────────────────

const LS_CATALOG = 'aipreneur_ws_catalog_v1';
const LS_UNLOCK_PREFIX = 'aipreneur_unlocked_shops_';

interface CatalogShape {
  shops: WorkshopShop[];
}

function readLocalCatalog(): WorkshopShop[] {
  if (typeof window === 'undefined') return SEED_SHOPS;
  try {
    const raw = localStorage.getItem(LS_CATALOG);
    if (!raw) return SEED_SHOPS;
    const parsed = JSON.parse(raw) as CatalogShape;
    if (!parsed?.shops?.length) return SEED_SHOPS;
    return parsed.shops;
  } catch {
    return SEED_SHOPS;
  }
}

function writeLocalCatalog(shops: WorkshopShop[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_CATALOG, JSON.stringify({ shops } satisfies CatalogShape));
  } catch { /* quota — ignore, page-level state still works */ }
}

function nowIso(): string { return new Date().toISOString(); }
function makeLocalId(): string {
  return `ws_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Seeds = the original hard-coded `WORKSHOP_SHOPS` catalogue so an
// upgrade from the previous build keeps a working set on day one.
const SEED_SHOPS: WorkshopShop[] = [
  {
    id: 'zus',
    name: 'Zus Coffee',
    companyName: 'Zus Holdings',
    businessNature: 'Specialty coffee chain — café service, barista skills, loyalty programs.',
    shopImageUrl: '/assets/World/Zus.png',
    modules: ['cafe', 'marketing'],
    isActive: true,
    createdAt: nowIso(), updatedAt: nowIso(),
  },
  {
    id: 'mamee',
    name: 'Mamee',
    companyName: 'Mamee-Double Decker',
    businessNature: 'Snack manufacturer — production lines, FMCG distribution, brand mascots.',
    shopImageUrl: '/assets/World/Mamee.png',
    modules: ['factory', 'marketing'],
    isActive: true,
    createdAt: nowIso(), updatedAt: nowIso(),
  },
  {
    id: 'junglegym',
    name: 'Jungle Gym',
    companyName: 'Jungle Gym Sdn Bhd',
    businessNature: 'Kids fitness centre — class scheduling, instructor coaching, membership.',
    shopImageUrl: '/assets/World/junglegym.png',
    modules: ['service', 'operations'],
    isActive: true,
    createdAt: nowIso(), updatedAt: nowIso(),
  },
  {
    id: 'airasia',
    name: 'AirAsia',
    companyName: 'AirAsia Group',
    businessNature: 'Budget airline — flight ops, customer service, dynamic pricing.',
    shopImageUrl: '/assets/World/airport.png',
    modules: ['logistics', 'operations'],
    isActive: true,
    createdAt: nowIso(), updatedAt: nowIso(),
  },
];

// ── Tiny in-memory cache ─────────────────────────────────────────

interface CacheEntry<T> { at: number; data: T; }
const CACHE_TTL_MS = 15_000;
const cache = new Map<string, CacheEntry<unknown>>();

function fromCache<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}
function toCache<T>(key: string, data: T): void {
  cache.set(key, { at: Date.now(), data });
}
function invalidate(prefix: string): void {
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

// ── Public API ───────────────────────────────────────────────────

export const workshopShopsApi = {
  /** Admin + public list. Backend should support `?activeOnly=1`
   *  so non-admins only see live shops. */
  async list(opts: { activeOnly?: boolean } = {}): Promise<WorkshopShop[]> {
    const cacheKey = `list:${opts.activeOnly ? '1' : '0'}`;
    const cached = fromCache<WorkshopShop[]>(cacheKey);
    if (cached) return cached;

    const path = opts.activeOnly ? '/workshop-shops' : '/admin/event-workshops';
    try {
      const res = await api.get<{ shops: WorkshopShop[] }>(path);
      const shops = res?.shops ?? [];
      toCache(cacheKey, shops);
      return shops;
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] list fallback:', err);
      const shops = readLocalCatalog().filter((s) => !opts.activeOnly || s.isActive);
      toCache(cacheKey, shops);
      return shops;
    }
  },

  async create(input: CreateWorkshopShopInput): Promise<WorkshopShop> {
    try {
      const res = await api.post<{ shop: WorkshopShop }>(
        '/admin/event-workshops', input,
      );
      invalidate('list:');
      return res.shop;
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] create fallback:', err);
      // localStorage fallback — pretend the upload succeeded and
      // stash the data URL on the record itself. The admin UI shows
      // the same preview either way.
      const fresh: WorkshopShop = {
        id: makeLocalId(),
        name: input.name,
        companyName: input.companyName,
        businessNature: input.businessNature,
        shopImageUrl: input.shopImageDataUrl,
        modules: input.modules ?? ['cafe'],
        isActive: input.isActive ?? true,
        createdAt: nowIso(), updatedAt: nowIso(),
      };
      const current = readLocalCatalog();
      writeLocalCatalog([fresh, ...current]);
      invalidate('list:');
      return fresh;
    }
  },

  async update(input: UpdateWorkshopShopInput): Promise<WorkshopShop> {
    try {
      const res = await api.put<{ shop: WorkshopShop }>(
        `/admin/event-workshops/${input.id}`, input,
      );
      invalidate('list:');
      return res.shop;
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] update fallback:', err);
      const current = readLocalCatalog();
      const next = current.map((s) =>
        s.id === input.id ? {
          ...s,
          name: input.name ?? s.name,
          companyName: input.companyName ?? s.companyName,
          businessNature: input.businessNature ?? s.businessNature,
          shopImageUrl: input.shopImageDataUrl ?? s.shopImageUrl,
          modules: input.modules ?? s.modules,
          isActive: input.isActive ?? s.isActive,
          updatedAt: nowIso(),
        } : s,
      );
      writeLocalCatalog(next);
      invalidate('list:');
      return next.find((s) => s.id === input.id)!;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await api.delete<void>(`/admin/event-workshops/${id}`);
      invalidate('list:');
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] delete fallback:', err);
      const current = readLocalCatalog();
      writeLocalCatalog(current.filter((s) => s.id !== id));
      invalidate('list:');
    }
  },

  /** Per-student unlock list. */
  async listUnlockedForStudent(studentId: string): Promise<WorkshopShopUnlock[]> {
    if (!studentId) return [];
    try {
      const res = await api.get<{ unlocks: WorkshopShopUnlock[] }>(
        `/students/${studentId}/workshop-unlocks`,
      );
      return res.unlocks ?? [];
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] unlocks fallback:', err);
      return readLocalUnlocks(studentId);
    }
  },

  /** Scan-time unlock. Called by the staff scanner. */
  async unlock(studentId: string, workshopShopId: string): Promise<WorkshopShopUnlock> {
    try {
      const res = await api.post<{ unlock: WorkshopShopUnlock }>(
        `/workshop-shops/${workshopShopId}/unlock`,
        { studentId },
      );
      // Local mirror so the student's UI updates instantly even
      // before the next /list call.
      addLocalUnlock(studentId, workshopShopId);
      return res.unlock;
    } catch (err) {
      if (!(err instanceof ApiError)) console.warn('[workshopShopsApi] unlock fallback:', err);
      const fresh: WorkshopShopUnlock = {
        id: makeLocalId(),
        studentId,
        workshopShopId,
        scannedByUserId: null,
        scannedAt: nowIso(),
      };
      addLocalUnlock(studentId, workshopShopId);
      return fresh;
    }
  },
};

// ── Per-student local unlocks (mirrors the legacy key shape) ────

function readLocalUnlocks(studentId: string): WorkshopShopUnlock[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LS_UNLOCK_PREFIX}${studentId}`);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    return ids.map((shopId, i) => ({
      id: `local_${i}`,
      studentId,
      workshopShopId: shopId,
      scannedByUserId: null,
      scannedAt: nowIso(),
    }));
  } catch {
    return [];
  }
}

function addLocalUnlock(studentId: string, shopId: string): void {
  if (typeof window === 'undefined' || !studentId) return;
  const key = `${LS_UNLOCK_PREFIX}${studentId}`;
  try {
    const raw = localStorage.getItem(key);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    if (!ids.includes(shopId)) ids.push(shopId);
    localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent('aipreneur:shop-unlocked', {
      detail: { studentId, shopId },
    }));
  } catch { /* ignore */ }
}
