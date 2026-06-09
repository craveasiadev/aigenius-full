/**
 * Iso city map — pure data. No React, no Three.js, no runtime cost.
 *
 * The city is a 2D grid of tile cells. Each cell is `TILE_SIZE` world units
 * across. The map is stored as a string grid because that's the easiest
 * thing for a human to eyeball at design time:
 *
 *   G = grass
 *   S = sidewalk
 *   R = road
 *   P = plaza (tan paving)
 *   .  = nothing (skipped; lets us cut non-rectangular shapes)
 *
 * Shops live in a separate `SHOPS` table because each one is more than just
 * a tile — it has a name, a door direction, an interior style, etc. The
 * shop's `cell` field references a (row, col) on the grid that gets
 * overridden as a "shop occupies this tile" cell when the city renders.
 *
 * The map is intentionally small (~15×11 tiles) so the camera can show most
 * of it at once on a phone. Bigger maps come later if the design needs
 * them — the engine doesn't care about size.
 */

export const TILE_SIZE = 2; // world units per tile

// World origin sits at the centre of the map so the player spawn point is
// near (0, 0, 0).
//
// The map is built in two pieces:
//   • INNER_MAP — the 19×15 downtown grid (shops + crossroads). Its
//     coordinate system is preserved EXACTLY so existing shop cells,
//     PLAYER_SPAWN and the rest of the engine continue to work after
//     the world is expanded around it.
//   • The full MAP is generated below by stamping INNER_MAP at row
//     offset 8 / col offset 10 inside a 39×31 outer grid containing
//     ring roads + industrial plots + grass.
//
// Symbols:
//   G = grass         S = sidewalk         R = road
//   M = my shop       I = industrial plot (auto-placed factory)
//   H = housing plot  (suburban building)
//   . = empty (gets rendered as grass-coloured floor for "between
//       buildings on a shop row" gaps in the downtown grid)
const INNER_MAP: string[] = [
  'GGGGGGGGGGGGGGGGGGG',  // 0  outer grass border
  'GSSSSSSSSSSSSSSSSSG',  // 1  sidewalk frame
  'GS..S....S....S..SG',  // 2
  'GS.S..S..S..S..S.SG',  // 3
  'GS..S....S....S..SG',  // 4
  'GSRRRRRRRRRRRRRRRSG',  // 5  horizontal road
  'GS..S....S....S..SG',  // 6
  'GS.S..S..M..S..S.SG',  // 7  centre row — M is player's shop
  'GS..S....S....S..SG',  // 8
  'GSRRRRRRRRRRRRRRRSG',  // 9  horizontal road
  'GS..S....S....S..SG',  // 10
  'GS.S..S..S..S..S.SG',  // 11
  'GS..S....S....S..SG',  // 12
  'GSSSSSSSSSSSSSSSSSG',  // 13 sidewalk frame
  'GGGGGGGGGGGGGGGGGGG',  // 14 outer grass border
];

const INNER_ROWS = INNER_MAP.length;     // 15
const INNER_COLS = INNER_MAP[0].length;  // 19

// Outer grid: 71 cols × 51 rows — the MEGA city. The downtown is
// stamped at the centre so the world origin (downtown's player shop)
// sits at (0, 0) and every existing shop's world coord stays the same
// as previous releases. The much bigger frame leaves room for:
//
//   • TWO concentric ring roads (inner + outer) with wide districts
//     between them — the iconic "downtown + ring-road + suburbs"
//     layout of a real city.
//   • Internal cross-streets cutting each outer district into real
//     city blocks separated by streets, not one packed mass.
//   • Bigger park gaps between districts.
//
// Centre-stamping math:
//   INNER_ROW_OFFSET = floor((OUTER_ROWS - INNER_ROWS) / 2) = 18
//   INNER_COL_OFFSET = floor((OUTER_COLS - INNER_COLS) / 2) = 26
const OUTER_ROWS = 51;
const OUTER_COLS = 71;
const INNER_ROW_OFFSET = 18;
const INNER_COL_OFFSET = 26;

/**
 * Build the full 39×31 grid: stamp INNER_MAP at the right offset, then
 * paint the outer ring with grass + roads + industrial / housing plots.
 *
 * The outer-ring design (a "big city" surrounding the downtown):
 *   • Two horizontal RING ROADS at rows 4 and 26 connect the city to
 *     its outskirts.
 *   • Two vertical RING ROADS at cols 5 and 33 connect them.
 *   • Four CONNECTOR ROADS leave each side of downtown (at the same X/Z
 *     as the internal cross-roads) and run to the outer ring.
 *   • Sidewalks line every outer ring road.
 *   • Buildings sit on plot tiles ('I' industrial, 'H' housing) facing
 *     the nearest road. Plots are 2 cells apart so each building has
 *     breathing room and the road network reads as a real grid.
 */
function buildFullMap(): string[] {
  const rows = Array.from({ length: OUTER_ROWS }, () => Array(OUTER_COLS).fill('G'));

  // Stamp the inner downtown.
  for (let r = 0; r < INNER_ROWS; r++) {
    for (let c = 0; c < INNER_COLS; c++) {
      rows[r + INNER_ROW_OFFSET][c + INNER_COL_OFFSET] = INNER_MAP[r][c];
    }
  }

  // Helper to paint a road tile (overwriting grass, never the downtown).
  const innerR0 = INNER_ROW_OFFSET;
  const innerR1 = INNER_ROW_OFFSET + INNER_ROWS - 1;
  const innerC0 = INNER_COL_OFFSET;
  const innerC1 = INNER_COL_OFFSET + INNER_COLS - 1;
  const isInsideInner = (r: number, c: number) =>
    r >= innerR0 && r <= innerR1 && c >= innerC0 && c <= innerC1;
  const paint = (r: number, c: number, ch: string) => {
    if (r < 0 || r >= OUTER_ROWS || c < 0 || c >= OUTER_COLS) return;
    if (isInsideInner(r, c)) return; // never trample the downtown
    // Don't downgrade a road to a sidewalk — when the sidewalk-painting
    // loop crosses a connector road that already snakes through the
    // ring's sidewalk band, the road must win or vehicles would have
    // to drive over pedestrian tiles. (Roads + grass freely overwrite
    // sidewalks; sidewalks freely overwrite grass.)
    if (rows[r][c] === 'R' && ch === 'S') return;
    rows[r][c] = ch;
  };

  // ── Ring roads ────────────────────────────────────────────────────
  //   • Inner ring (close to downtown) — the main artery
  //   • Outer ring (suburb perimeter)
  // Three concentric zones emerge: commercial inner band, residential
  // middle band, industrial/parkland outer band — real-city growth.
  const ringRowN  = 14, ringRowS  = 36;     // inner ring horizontals
  const ringColW  = 22, ringColE  = 48;     // inner ring verticals
  const ringRowN2 = 6,  ringRowS2 = 44;     // outer ring horizontals
  const ringColW2 = 12, ringColE2 = 58;     // outer ring verticals
  for (let c = ringColW; c <= ringColE; c++) {
    paint(ringRowN, c, 'R');
    paint(ringRowS, c, 'R');
  }
  for (let r = ringRowN; r <= ringRowS; r++) {
    paint(r, ringColW, 'R');
    paint(r, ringColE, 'R');
  }
  for (let c = ringColW2; c <= ringColE2; c++) {
    paint(ringRowN2, c, 'R');
    paint(ringRowS2, c, 'R');
  }
  for (let r = ringRowN2; r <= ringRowS2; r++) {
    paint(r, ringColW2, 'R');
    paint(r, ringColE2, 'R');
  }

  // ── Connector roads from downtown to the inner ring ──────────────
  // Inner downtown roads at inner rows 5 + 9 → outer rows 18, 22.
  // Centre vertical at inner col 9 → outer col 25.
  const innerRoadRowsOuter = [INNER_ROW_OFFSET + 5, INNER_ROW_OFFSET + 9]; // 18, 22
  const innerRoadColsOuter = [INNER_COL_OFFSET + 9]; // 25
  for (const rr of innerRoadRowsOuter) {
    for (let c = ringColW; c < innerC0; c++) paint(rr, c, 'R');
    for (let c = innerC1 + 1; c <= ringColE; c++) paint(rr, c, 'R');
  }
  for (const cc of innerRoadColsOuter) {
    for (let r = ringRowN; r < innerR0; r++) paint(r, cc, 'R');
    for (let r = innerR1 + 1; r <= ringRowS; r++) paint(r, cc, 'R');
  }

  // ── Internal block streets between the two rings ─────────────────
  // Cross-streets break the strip between inner+outer rings into real
  // city blocks. With the bigger grid we space them ~8 cells apart so
  // every block is roughly 6-7 cells wide — comfortable walking
  // distance in real cities.
  for (const cc of [ringColW + 8, ringColW + 16, ringColW + 26 - 8, ringColE - 8]) {
    if (cc <= ringColW || cc >= ringColE) continue;
    for (let r = ringRowN2; r < ringRowN; r++) paint(r, cc, 'R');
    for (let r = ringRowS + 1; r <= ringRowS2; r++) paint(r, cc, 'R');
  }
  for (const rr of [ringRowN + 7, ringRowN + 15]) {
    if (rr <= ringRowN || rr >= ringRowS) continue;
    for (let c = ringColW2; c < ringColW; c++) paint(rr, c, 'R');
    for (let c = ringColE + 1; c <= ringColE2; c++) paint(rr, c, 'R');
  }

  // ── External block streets beyond the outer ring ─────────────────
  // Smaller suburban grid in the parkland between the outer ring and
  // the world edge — gives the outermost housing zone its own street
  // network instead of buildings butting up against grass.
  for (const cc of [ringColW2 + 10, ringColW2 + 22, ringColE2 - 22, ringColE2 - 10]) {
    if (cc < ringColW2 || cc > ringColE2) continue;
    for (let r = 1; r < ringRowN2; r++) paint(r, cc, 'R');
    for (let r = ringRowS2 + 1; r < OUTER_ROWS - 1; r++) paint(r, cc, 'R');
  }
  for (const rr of [ringRowN2 + 8, ringRowS2 - 8]) {
    if (rr < ringRowN2 || rr > ringRowS2) continue;
    for (let c = 1; c < ringColW2; c++) paint(rr, c, 'R');
    for (let c = ringColE2 + 1; c < OUTER_COLS - 1; c++) paint(rr, c, 'R');
  }

  // ── Sidewalks lining every road ──────────────────────────────────
  // After all roads are painted, walk the grid and paint a sidewalk on
  // every grass tile that's orthogonally adjacent to a road. This
  // gives every street a sidewalk on both sides automatically —
  // simpler than per-road sidewalk math and matches the reference
  // cities where every road has a paved edge for pedestrians.
  const SW_OFFSET = 1;
  void SW_OFFSET;  // kept for plot placement below
  const ROAD_SW_PASSES = 1;  // 1 tile of sidewalk on each side
  for (let pass = 0; pass < ROAD_SW_PASSES; pass++) {
    const next: string[][] = rows.map((row) => row.slice());
    for (let r = 0; r < OUTER_ROWS; r++) {
      for (let c = 0; c < OUTER_COLS; c++) {
        if (rows[r][c] !== 'G') continue;
        if (isInsideInner(r, c)) continue;
        const adjacentToRoad =
          rows[r - 1]?.[c] === 'R' ||
          rows[r + 1]?.[c] === 'R' ||
          rows[r]?.[c - 1] === 'R' ||
          rows[r]?.[c + 1] === 'R';
        if (adjacentToRoad) next[r][c] = 'S';
      }
    }
    for (let r = 0; r < OUTER_ROWS; r++) rows[r] = next[r];
  }

  // Bridge connector roads into the downtown across the inner map's
  // own grass border. The connector painting stops at innerC0-1 / innerC1+1
  // because paint() refuses to touch inner tiles, but the downtown's
  // outermost column/row is grass (G), not real downtown content — and
  // without bridging, cars on the connector road would visually drive
  // onto grass before reaching the downtown's internal road. We
  // overwrite directly (bypassing paint()) so the inner-guard doesn't
  // block it.
  function bridge(r: number, c: number) {
    if (r < 0 || r >= OUTER_ROWS || c < 0 || c >= OUTER_COLS) return;
    rows[r][c] = 'R';
  }
  // Downtown horizontal roads at inner rows 5 + 9 → outer rows 18, 22.
  // Their first/last road tile is at inner cols 2/16 → outer cols 18/32.
  // The grass-border tiles between the inbound connector and the
  // downtown road are at outer cols 16-17 (left) and 33-34 (right).
  for (const rr of innerRoadRowsOuter) {
    bridge(rr, innerC0); bridge(rr, innerC0 + 1);
    bridge(rr, innerC1 - 1); bridge(rr, innerC1);
  }
  // Vertical: inner col 9 → outer col 25. Bridge into grass borders at
  // outer rows 13 (innerR0) and 27 (innerR1).
  for (const cc of innerRoadColsOuter) {
    bridge(innerR0, cc); bridge(innerR1, cc);
  }

  // ── Building plots — REAL CITY BLOCKS ────────────────────────────
  //
  // A grass tile becomes a building plot if it borders a SIDEWALK that
  // borders a road. That puts every building exactly one tile back
  // from the asphalt — fronts facing the street, backs to an interior
  // courtyard — exactly how a real city block works. Cells deeper
  // inside a block stay grass (the "garden" / "courtyard" interior),
  // which is what gives a real city its breathing room.
  //
  // Type per plot is decided by ZONE:
  //   • Inside the inner ring  → 'C' commercial skyscrapers
  //   • Between inner + outer rings → 'H' housing (brownstones)
  //   • Outside the outer ring → 'H' / 'I' housing+industrial mix
  function adjacentToSidewalk(r: number, c: number): boolean {
    return (
      rows[r - 1]?.[c] === 'S' ||
      rows[r + 1]?.[c] === 'S' ||
      rows[r]?.[c - 1] === 'S' ||
      rows[r]?.[c + 1] === 'S'
    );
  }
  function inInnerRing(r: number, c: number): boolean {
    return r > ringRowN && r < ringRowS && c > ringColW && c < ringColE;
  }
  function inMiddleRing(r: number, c: number): boolean {
    return (
      r > ringRowN2 && r < ringRowS2 && c > ringColW2 && c < ringColE2 &&
      !inInnerRing(r, c) && r !== ringRowN && r !== ringRowS &&
      c !== ringColW && c !== ringColE
    );
  }

  for (let r = 1; r < OUTER_ROWS - 1; r++) {
    for (let c = 1; c < OUTER_COLS - 1; c++) {
      if (rows[r][c] !== 'G') continue;
      if (isInsideInner(r, c)) continue;
      if (!adjacentToSidewalk(r, c)) continue;
      let ch: 'C' | 'H' | 'I';
      if (inInnerRing(r, c)) {
        ch = 'C';
      } else if (inMiddleRing(r, c)) {
        ch = 'H';
      } else {
        const hash = (r * 73856093) ^ (c * 19349663);
        ch = (hash & 0xff) < 100 ? 'I' : 'H';   // ~40 % industrial in the outer rim
      }
      rows[r][c] = ch;
    }
  }

  return rows.map((r) => r.join(''));
}

export const MAP: string[] = buildFullMap();
export const ROWS = MAP.length;
export const COLS = MAP[0].length;

/**
 * Authoritative ring-road positions on the expanded grid. Exported so
 * downstream code (CityProps / Traffic) doesn't duplicate the magic
 * numbers — vehicles stay BOUNDED to actual road extents instead of
 * driving across grass to the world edge.
 */
export const RING_ROADS = {
  /** Inner ring road grid coords (rows + cols). */
  inner: { rowN: 14, rowS: 36, colW: 22, colE: 48 },
  /** Outer ring road grid coords. */
  outer: { rowN: 6,  rowS: 44, colW: 12, colE: 58 },
  /** Downtown horizontal roads (in outer-grid rows). */
  downtownH: [INNER_ROW_OFFSET + 5, INNER_ROW_OFFSET + 9] as const, // 23, 27
  /** Downtown vertical road (centre column of the downtown). */
  downtownV: INNER_COL_OFFSET + 9, // 35
} as const;

export type TileType = 'grass' | 'sidewalk' | 'road' | 'plaza' | 'shopSlot' | 'empty'
  | 'industrialPlot' | 'housingPlot' | 'commercialPlot';

export function tileAt(row: number, col: number): TileType {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 'empty';
  const ch = MAP[row][col];
  switch (ch) {
    case 'G': return 'grass';
    case 'S': return 'sidewalk';
    case 'R': return 'road';
    case 'P': return 'plaza';
    // 'M' is the player's shop plot — rendered as sidewalk under the
    // building so the surrounding tiles are visually consistent.
    case 'M': return 'sidewalk';
    // Industrial / housing plots sit on grass; CityProps drops a
    // building model onto them. Visually they're grass underfoot.
    case 'I': return 'industrialPlot';
    case 'H': return 'housingPlot';
    case 'C': return 'commercialPlot';
    case '.': return 'empty';
    default:  return 'empty';
  }
}

/**
 * Convert a (row, col) cell to its world centre point. The grid is
 * centred on the origin so that the player spawn ends up near (0, y, 0)
 * regardless of map dimensions.
 */
export function cellToWorld(row: number, col: number): [number, number, number] {
  const x = (col - (COLS - 1) / 2) * TILE_SIZE;
  const z = (row - (ROWS - 1) / 2) * TILE_SIZE;
  return [x, 0, z];
}

/** Reverse: snap a world XZ position back to the nearest grid cell. */
export function worldToCell(x: number, z: number): { row: number; col: number } {
  const col = Math.round(x / TILE_SIZE + (COLS - 1) / 2);
  const row = Math.round(z / TILE_SIZE + (ROWS - 1) / 2);
  return { row, col };
}

/**
 * Fast lookup set of all road cells in the map, keyed as `"row,col"`.
 * Built ONCE at module load by scanning every cell. Used by traffic
 * code to validate vehicle lanes — a lane that crosses a non-road
 * tile gets skipped instead of letting cars drive through buildings.
 */
export const ROAD_KEYS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tileAt(r, c) === 'road') out.add(`${r},${c}`);
    }
  }
  return out;
})();

/** True iff (row, col) is an actually-painted road tile. */
export function isRoadCell(row: number, col: number): boolean {
  return ROAD_KEYS.has(`${row},${col}`);
}

/**
 * Validate that every cell along a horizontal or vertical span is a
 * road tile. Used by the traffic system to refuse rendering a lane
 * whose underlying tiles aren't all roads — without this guard a lane
 * defined between two ring-road extents can cut across whatever lies
 * between those extents (e.g. the "downtown vertical" lane at col 35
 * runs through the player's shop and the Toy Store, because there's
 * no actual continuous road there — only crossings at rows 23 and 27).
 */
export function roadLaneIsContinuous(
  axis: 'horizontal' | 'vertical',
  fixed: number,
  start: number,
  end: number,
): boolean {
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  for (let i = lo; i <= hi; i++) {
    const row = axis === 'horizontal' ? fixed : i;
    const col = axis === 'horizontal' ? i     : fixed;
    if (!isRoadCell(row, col)) return false;
  }
  return true;
}

export interface ShopDef {
  id: string;
  name: string;
  /** Grid cell the shop body sits on. */
  cell: { row: number; col: number };
  /** Wall colour for the building exterior (legacy procedural path; now
   *  also used as a tint on the Kenney GLB and as the interior wall
   *  colour). */
  wallColor: string;
  /** Roof colour — same dual use as `wallColor`. */
  roofColor: string;
  /** Door direction. Used to orient the Kenney building so its entrance
   *  faces the right way + to pick the interior layout's door wall. */
  door: 'north' | 'south' | 'east' | 'west';
  /** Optional player-facing label colour. */
  signColor?: string;
  /** Which Kenney commercial-building variant this shop uses on the map.
   *  Maps to a key of `KENNEY_BUILDINGS_COMMERCIAL` in kenneyCatalog.ts.
   *  Defaults to 'a' if omitted. */
  buildingId?: 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n';
  /** Optional shopkeeper character ID (from KENNEY_CHARACTERS). The
   *  character stands behind the counter inside this shop's interior. */
  keeperId?:
    | 'femaleA' | 'femaleB' | 'femaleC' | 'femaleD' | 'femaleE' | 'femaleF'
    | 'maleA'   | 'maleB'   | 'maleC'   | 'maleD'   | 'maleE'   | 'maleF';
  /** Marks this as the player's own shop. A "My Shop" pill floats above
   *  the building, the selection ring is gold instead of yellow, and the
   *  action menu has only one option (Enter). */
  isPlayer?: boolean;
}

/**
 * The shop list. Two demo shops for now — more can be appended without any
 * engine changes. The `cell` row/col must point at one of the 'S' positions
 * inside the city grid so the road/sidewalk pattern stays coherent.
 */
// Shop cells use the EXPANDED grid coordinates (row + 8, col + 10). The
// world position they map to via cellToWorld stays identical to the
// pre-expansion layout, so every consumer continues to render the
// downtown in the same place.
export const SHOPS: ShopDef[] = [
  // ── Top row (north side, facing the upper road) ──────────────────
  {
    id: 'boba',
    name: 'Boba Bar',
    cell: { row: 20, col: 30 },
    wallColor: '#fde68a',
    roofColor: '#f59e0b',
    door: 'south',
    signColor: '#92400e',
    buildingId: 'a',
    keeperId: 'femaleA',
  },
  {
    id: 'bakery',
    name: 'Sweet Bakery',
    cell: { row: 20, col: 35 },
    wallColor: '#fed7aa',
    roofColor: '#ea580c',
    door: 'south',
    signColor: '#9a3412',
    buildingId: 'b',
    keeperId: 'femaleE',
  },
  {
    id: 'pets',
    name: 'Pet Cafe',
    cell: { row: 20, col: 40 },
    wallColor: '#c7d2fe',
    roofColor: '#6366f1',
    door: 'south',
    signColor: '#3730a3',
    buildingId: 'd',
    keeperId: 'maleC',
  },

  // ── Middle row (centre = player's own shop) ──────────────────────
  {
    id: 'smoothie',
    name: 'Smoothie Bar',
    cell: { row: 25, col: 29 },
    wallColor: '#bbf7d0',
    roofColor: '#16a34a',
    door: 'east',
    signColor: '#14532d',
    buildingId: 'c',
    keeperId: 'femaleB',
  },
  {
    id: 'myshop',
    name: 'My Shop',
    cell: { row: 25, col: 35 },
    wallColor: '#fef08a',
    roofColor: '#eab308',
    door: 'south',
    signColor: '#854d0e',
    buildingId: 'f',
    keeperId: 'femaleC',
    isPlayer: true,
  },
  {
    id: 'comics',
    name: 'Comic Books',
    cell: { row: 25, col: 41 },
    wallColor: '#fecdd3',
    roofColor: '#e11d48',
    door: 'west',
    signColor: '#9f1239',
    buildingId: 'h',
    keeperId: 'maleE',
  },

  // ── Bottom row (south side, facing the lower road) ───────────────
  {
    id: 'cookies',
    name: 'Cookie Shop',
    cell: { row: 30, col: 30 },
    wallColor: '#fbcfe8',
    roofColor: '#db2777',
    door: 'north',
    signColor: '#9d174d',
    buildingId: 'g',
    keeperId: 'femaleD',
  },
  {
    id: 'toys',
    name: 'Toy Store',
    cell: { row: 30, col: 35 },
    wallColor: '#bae6fd',
    roofColor: '#0284c7',
    door: 'north',
    signColor: '#075985',
    buildingId: 'i',
    keeperId: 'maleA',
  },
  {
    id: 'gelato',
    name: 'Gelato Stand',
    cell: { row: 30, col: 40 },
    wallColor: '#ddd6fe',
    roofColor: '#7c3aed',
    door: 'north',
    signColor: '#5b21b6',
    buildingId: 'k',
    keeperId: 'femaleF',
  },
];

/** Default player spawn — the central plaza (downtown centre). */
export const PLAYER_SPAWN: [number, number, number] = cellToWorld(25, 35);

/**
 * Pre-computed waypoint loops for NPC walking. Each path is a list of
 * world positions the NPC walks between, then loops back to the first.
 * Routes stick to sidewalk tiles + cross-street paths so NPCs don't stand
 * in roads.
 */
// Pre-computed waypoint loops for NPC walking. Each path is a list of
// world positions the NPC walks between, then loops back to the first.
// Routes stick to sidewalk tiles + cross-street paths so NPCs don't stand
// in roads. All cell coords use the EXPANDED grid (downtown shifted by
// +8/+10 from the old layout) plus extra loops on the new ring road
// sidewalks for the outer districts.
// NPC paths use the EXPANDED 71×51 mega-grid. Downtown spans rows
// 18..32 cols 26..44; inner ring at rows 14/36 cols 22/48; outer ring
// at rows 6/44 cols 12/58.
export const NPC_PATHS: Array<Array<[number, number, number]>> = [
  // ── Downtown ──────────────────────────────────────────────────────
  // 1. Downtown perimeter (clockwise).
  [
    cellToWorld(19, 27), cellToWorld(19, 43),
    cellToWorld(31, 43), cellToWorld(31, 27),
  ],
  // 2. Top shop row sidewalk.
  [
    cellToWorld(22, 28), cellToWorld(22, 42),
    cellToWorld(24, 42), cellToWorld(24, 28),
  ],
  // 3. Centre crosswalk past My Shop.
  [
    cellToWorld(26, 28), cellToWorld(26, 42),
    cellToWorld(28, 42), cellToWorld(28, 28),
  ],
  // 4. Left downtown promenade.
  [
    cellToWorld(20, 28), cellToWorld(30, 28),
    cellToWorld(30, 31), cellToWorld(20, 31),
  ],
  // 5. Right downtown promenade.
  [
    cellToWorld(20, 42), cellToWorld(30, 42),
    cellToWorld(30, 39), cellToWorld(20, 39),
  ],

  // ── Inner ring road sidewalks ─────────────────────────────────────
  // 6. North inner ring.
  [
    cellToWorld(13, 23), cellToWorld(13, 47),
    cellToWorld(15, 47), cellToWorld(15, 23),
  ],
  // 7. South inner ring.
  [
    cellToWorld(35, 23), cellToWorld(35, 47),
    cellToWorld(37, 47), cellToWorld(37, 23),
  ],
  // 8. West inner ring.
  [
    cellToWorld(15, 21), cellToWorld(35, 21),
    cellToWorld(35, 23), cellToWorld(15, 23),
  ],
  // 9. East inner ring.
  [
    cellToWorld(15, 47), cellToWorld(35, 47),
    cellToWorld(35, 49), cellToWorld(15, 49),
  ],

  // ── Outer ring road sidewalks ─────────────────────────────────────
  // 10. North outer ring.
  [
    cellToWorld(5, 13), cellToWorld(5, 57),
    cellToWorld(7, 57), cellToWorld(7, 13),
  ],
  // 11. South outer ring.
  [
    cellToWorld(43, 13), cellToWorld(43, 57),
    cellToWorld(45, 57), cellToWorld(45, 13),
  ],
  // 12. West outer ring.
  [
    cellToWorld(7, 11), cellToWorld(43, 11),
    cellToWorld(43, 13), cellToWorld(7, 13),
  ],
  // 13. East outer ring.
  [
    cellToWorld(7, 57), cellToWorld(43, 57),
    cellToWorld(43, 59), cellToWorld(7, 59),
  ],
];
