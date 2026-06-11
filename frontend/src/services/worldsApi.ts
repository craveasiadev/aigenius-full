/**
 * Multi-user shop "worlds" API.
 *
 * A world is a 3×3 grid: the logged-in player's shop sits at the centre
 * (position 5) and up to 8 other players' launched shops fill the
 * surrounding cells (positions 1-4, 6-9). When more than 8 other shops
 * exist they spill into additional worlds, which the left/right arrows
 * page through.
 *
 * Backend (Laravel, genius-authenticated):
 *   GET /aipreneur/worlds/count          → { totalWorlds, totalShops }
 *   GET /aipreneur/worlds/{worldNumber}  → { currentWorld, totalWorlds, buildings }
 *
 * Ordering is deterministic server-side (created_at, then id) so world N
 * always returns the same shops — that's what makes the arrows stable.
 */
import { geniusApi } from '../lib/api';

/** One building in a world. `position` is the 3×3 grid cell (1-9, 5 = centre). */
export interface WorldBuilding {
  position: number;
  userId: string;
  shopName: string;
  ownerName: string;
  /** Raw backend image URL/path — resolve with `getShopImageUrl` before use. */
  image: string | null;
  /** Public shop slug for the "Visit Shop" link (`/shop/:slug`). */
  slug: string | null;
  passionCategory: string | null;
  level: number;
  rating: number;
  isYourShop: boolean;
}

export interface WorldResponse {
  success: boolean;
  currentWorld: number;
  totalWorlds: number;
  buildings: WorldBuilding[];
}

export interface WorldCountResponse {
  success: boolean;
  totalWorlds: number;
  totalShops: number;
}

/** Fetch a single world's buildings. World number is clamped server-side. */
export async function fetchWorld(worldNumber: number): Promise<WorldResponse> {
  return geniusApi.get<WorldResponse>(`/aipreneur/worlds/${worldNumber}`);
}

/** Fetch how many worlds the current student can page through. */
export async function fetchWorldCount(): Promise<WorldCountResponse> {
  return geniusApi.get<WorldCountResponse>('/aipreneur/worlds/count');
}
