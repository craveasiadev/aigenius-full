/**
 * festivals.ts — date-driven world festival themes.
 *
 * Four kid-friendly, non-religious seasonal festivals cycle through the year
 * based on the local month. Each one carries an emoji, a palette accent
 * (drives the ambient-particle tint), a banner copy line, and a "doodad"
 * emoji that surprise events float across the screen during this season.
 *
 * `getCurrentFestival()` is pure — call it anywhere; nothing else maintains
 * "active festival" state. If we want to override for testing, the function
 * accepts an optional `now` Date.
 */
export type FestivalId = 'rainbow_rain' | 'sun_picnic' | 'lantern' | 'star_carnival';

export interface FestivalDef {
  id: FestivalId;
  name: string;          // display string, e.g. "Lantern Festival"
  emoji: string;         // headline emoji
  // Accent hex used for ambient tint + banner background. Kept warm so the
  // shop interior reads cozy even during cooler seasons.
  accentHex: string;
  banner: string;        // short flavor line for the banner widget
  doodad: string;        // emoji that surprise events float (lanterns, etc.)
  /** 1-based local month numbers this festival covers. */
  months: number[];
}

export const FESTIVALS: Record<FestivalId, FestivalDef> = {
  rainbow_rain: {
    id: 'rainbow_rain',
    name: 'Rainbow Rain',
    emoji: '🌈',
    accentHex: '#a78bfa',
    banner: "Rainbow Rain is here — paint your shop in every color!",
    doodad: '🌈',
    months: [3, 4, 5],
  },
  sun_picnic: {
    id: 'sun_picnic',
    name: 'Sun Picnic',
    emoji: '🧺',
    accentHex: '#fbbf24',
    banner: 'Sun Picnic season! Picnic vibes, picnic snacks, picnic dreams.',
    doodad: '🌻',
    months: [6, 7, 8],
  },
  lantern: {
    id: 'lantern',
    name: 'Lantern Festival',
    emoji: '🏮',
    accentHex: '#f97316',
    banner: 'Lanterns are floating tonight — make a wish!',
    doodad: '🏮',
    months: [9, 10, 11],
  },
  star_carnival: {
    id: 'star_carnival',
    name: 'Star Carnival',
    emoji: '🎡',
    accentHex: '#60a5fa',
    banner: 'Star Carnival! Sparkles in every corner of the city.',
    doodad: '⭐',
    months: [12, 1, 2],
  },
};

export function getCurrentFestival(now: Date = new Date()): FestivalDef {
  const m = now.getMonth() + 1;
  for (const f of Object.values(FESTIVALS)) {
    if (f.months.includes(m)) return f;
  }
  // Defensive fallback — unreachable while the months above cover 1..12.
  return FESTIVALS.sun_picnic;
}
