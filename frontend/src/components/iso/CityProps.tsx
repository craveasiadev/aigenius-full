import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import {
  ROWS,
  COLS,
  TILE_SIZE,
  cellToWorld,
  tileAt,
  SHOPS,
  RING_ROADS,
  roadLaneIsContinuous,
} from './cityMap';
import { KenneyModel } from './KenneyModel';
import { MovingVehicle, ParkedVehicle } from './Vehicles';
import {
  KENNEY_ROADS,
  KENNEY_STREET_PROPS,
  KENNEY_OUTDOOR,
  KENNEY_VEHICLES,
  KENNEY_BUILDINGS_INDUSTRIAL,
  KENNEY_BUILDINGS_SUBURBAN,
  KENNEY_BUILDINGS_COMMERCIAL,
} from './kenneyCatalog';

/**
 * Lays the Kenney prop GLBs over the tile grid:
 *
 *   • Every 'R' tile → real `road-straight.glb` (or `crossroad` / `crossing`
 *     at intersections we detect by looking at neighbours).
 *   • Streetlamps along the sidewalk in front of each shop row.
 *   • Trees scattered on grass tiles outside the city's sidewalk frame.
 *   • A handful of parked cars along the bottom road for ambient detail.
 *
 * All props are static, picked deterministically via a tiny seeded RNG so
 * the layout is identical between reloads (no flicker when the dev server
 * hot-reloads). One single React component to keep the prop-decoration
 * code in one place — easier to tweak than chasing it across files.
 */

const PROP_SCALE = 2; // Kenney tiles are 1×1, our grid is 2×2.

// Deterministic PRNG so a second mount paints the exact same layout.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────

interface PropPlacement {
  path: string;
  pos: [number, number, number];
  rotY: number;
  scale?: number;
}

function buildPlacements(): PropPlacement[] {
  const rng = mulberry32(20260519);
  const out: PropPlacement[] = [];

  // ── 1. Road tiles ─────────────────────────────────────────────────
  // Decide each road cell's variant by looking at its 4 neighbours: a
  // road cell with road on N+S only → vertical straight; E+W only →
  // horizontal straight; 3+ neighbours → crossroad. This produces a
  // visually-coherent road network from our string-grid map without us
  // having to author each tile's variant by hand.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tileAt(r, c) !== 'road') continue;
      const n = tileAt(r - 1, c) === 'road';
      const s = tileAt(r + 1, c) === 'road';
      const e = tileAt(r, c + 1) === 'road';
      const w = tileAt(r, c - 1) === 'road';
      const count = +n + +s + +e + +w;
      const [x, , z] = cellToWorld(r, c);
      let path = KENNEY_ROADS.straight;
      let rotY = 0;

      if (count >= 3) {
        path = KENNEY_ROADS.crossroad;
        rotY = 0;
      } else if (n && s && !e && !w) {
        path = KENNEY_ROADS.straight;
        rotY = Math.PI / 2; // vertical run
      } else if (e && w && !n && !s) {
        path = KENNEY_ROADS.straight;
        rotY = 0; // horizontal run (Kenney straight defaults E↔W)
      } else if (n && e) {
        path = KENNEY_ROADS.bend;
        rotY = Math.PI;
      } else if (n && w) {
        path = KENNEY_ROADS.bend;
        rotY = -Math.PI / 2;
      } else if (s && e) {
        path = KENNEY_ROADS.bend;
        rotY = Math.PI / 2;
      } else if (s && w) {
        path = KENNEY_ROADS.bend;
        rotY = 0;
      } else if (e || w) {
        path = KENNEY_ROADS.end;
        rotY = w ? Math.PI : 0;
      } else if (n || s) {
        path = KENNEY_ROADS.end;
        rotY = n ? -Math.PI / 2 : Math.PI / 2;
      }

      out.push({ path, pos: [x, 0, z], rotY, scale: PROP_SCALE });
    }
  }

  // ── 2. Streetlamps along every sidewalk row that runs alongside
  //    a road (downtown frame + the new outer ring sidewalks). ──
  // Scan all sidewalk tiles; place a lamp on every Nth one that has
  // at least one road neighbour, so we get lamps lining real roads and
  // skip stretches of pure pedestrian path.
  const lampStride = 4;
  const lampVariants = [KENNEY_STREET_PROPS.lampCurved, KENNEY_STREET_PROPS.lampSquare];
  let lampIdx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tileAt(r, c) !== 'sidewalk') continue;
      const adjRoadN = tileAt(r - 1, c) === 'road';
      const adjRoadS = tileAt(r + 1, c) === 'road';
      const adjRoadE = tileAt(r, c + 1) === 'road';
      const adjRoadW = tileAt(r, c - 1) === 'road';
      if (!adjRoadN && !adjRoadS && !adjRoadE && !adjRoadW) continue;
      if (lampIdx++ % lampStride !== 0) continue;
      const [x, , z] = cellToWorld(r, c);
      // Lamp faces the adjacent road so its arm reaches over the asphalt.
      let rotY = 0;
      if (adjRoadN) rotY = 0;
      else if (adjRoadS) rotY = Math.PI;
      else if (adjRoadE) rotY = Math.PI / 2;
      else if (adjRoadW) rotY = -Math.PI / 2;
      out.push({
        path: lampVariants[(r + c) % lampVariants.length],
        pos: [x, 0, z],
        rotY,
        scale: PROP_SCALE,
      });
    }
  }

  // ── 3. Trees on the DOWNTOWN grass border ────────────────────────
  // Just the inner-downtown grass ring (the 4 corner strips of the
  // 19×15 inner map). Outer grass gets handled by step 4b below so
  // it shares the seeded RNG with the building plots and doesn't
  // double-tree the same tiles. Inner downtown spans rows 18..32 and
  // cols 26..44 in the mega-grid.
  const treeChance = 0.28;
  for (let r = 18; r <= 32; r++) {
    for (let c = 26; c <= 44; c++) {
      if (tileAt(r, c) !== 'grass') continue;
      if (rng() > treeChance) continue;
      const [cx, , cz] = cellToWorld(r, c);
      const jitterX = (rng() - 0.5) * TILE_SIZE * 0.4;
      const jitterZ = (rng() - 0.5) * TILE_SIZE * 0.4;
      const big = rng() > 0.55;
      out.push({
        path: big ? KENNEY_OUTDOOR.treeLarge : KENNEY_OUTDOOR.treeSmall,
        pos: [cx + jitterX, 0, cz + jitterZ],
        rotY: rng() * Math.PI * 2,
        scale: PROP_SCALE * (0.8 + rng() * 0.4),
      });
    }
  }

  // ── 4. Outer-district buildings on dedicated grid plots ──────────
  // The expanded city map (39×31, see cityMap.ts) authors 'I' tiles for
  // industrial plots and 'H' tiles for housing plots on a structured
  // ring around the downtown. Reading from the grid keeps everything
  // aligned to the road network — no more scattered buildings on grass.
  //
  // Each plot picks deterministically from its pool and faces the
  // NEAREST RING ROAD so the front of the building reads from the
  // street, not the back of the next door neighbour.
  const industrialBuildings = Object.values(KENNEY_BUILDINGS_INDUSTRIAL).filter(
    (path) => path.includes('building-'),
  );
  const industrialChimneys = [
    KENNEY_BUILDINGS_INDUSTRIAL.chimneyBasic,
    KENNEY_BUILDINGS_INDUSTRIAL.chimneyLarge,
    KENNEY_BUILDINGS_INDUSTRIAL.chimneyMedium,
    KENNEY_BUILDINGS_INDUSTRIAL.chimneySmall,
  ];
  const housingPaths = [
    KENNEY_BUILDINGS_SUBURBAN.a,
    KENNEY_BUILDINGS_SUBURBAN.b,
    KENNEY_BUILDINGS_SUBURBAN.c,
    KENNEY_BUILDINGS_SUBURBAN.d,
    KENNEY_BUILDINGS_SUBURBAN.e,
    KENNEY_BUILDINGS_SUBURBAN.f,
    KENNEY_BUILDINGS_SUBURBAN.g,
    KENNEY_BUILDINGS_SUBURBAN.h,
  ];
  // Commercial pool — TALL buildings (skyscrapers) get the bulk weight
  // because the reference downtowns are dense skylines. We dedupe the
  // commercial buildings from the SHOPS keeper-assigned set so we don't
  // place a tower identical to an active shop. Mid-rise commercial
  // (a-n) fills in between the skyscrapers for the height-mix look in
  // the reference. Skyscrapers appear ~2× as often as mid-rises.
  const commercialMidRise = [
    KENNEY_BUILDINGS_COMMERCIAL.a, KENNEY_BUILDINGS_COMMERCIAL.b,
    KENNEY_BUILDINGS_COMMERCIAL.c, KENNEY_BUILDINGS_COMMERCIAL.d,
    KENNEY_BUILDINGS_COMMERCIAL.e, KENNEY_BUILDINGS_COMMERCIAL.f,
    KENNEY_BUILDINGS_COMMERCIAL.g, KENNEY_BUILDINGS_COMMERCIAL.h,
    KENNEY_BUILDINGS_COMMERCIAL.i, KENNEY_BUILDINGS_COMMERCIAL.j,
    KENNEY_BUILDINGS_COMMERCIAL.k, KENNEY_BUILDINGS_COMMERCIAL.l,
    KENNEY_BUILDINGS_COMMERCIAL.m, KENNEY_BUILDINGS_COMMERCIAL.n,
  ];
  const commercialSkyscrapers = [
    KENNEY_BUILDINGS_COMMERCIAL.skyA, KENNEY_BUILDINGS_COMMERCIAL.skyB,
    KENNEY_BUILDINGS_COMMERCIAL.skyC, KENNEY_BUILDINGS_COMMERCIAL.skyD,
    KENNEY_BUILDINGS_COMMERCIAL.skyE,
  ];

  // Walk the grid; for every 'I' or 'H' tile, drop a building. Rotation
  // is chosen to face the nearest road tile (lookup at the 4 neighbours).
  function nearestRoadFacing(r: number, c: number): number {
    // Returns a rotation around Y such that the building's "front" (its
    // -Z face by Kenney's convention) points at the road. Defaults to 0
    // if there's no road neighbour (rare — plots are placed adjacent to
    // ring roads by construction).
    if (tileAt(r - 1, c) === 'road') return 0;            // road to north → face -Z
    if (tileAt(r + 1, c) === 'road') return Math.PI;      // road to south → face +Z
    if (tileAt(r, c + 1) === 'road') return Math.PI / 2;  // road to east  → face +X
    if (tileAt(r, c - 1) === 'road') return -Math.PI / 2; // road to west  → face -X
    return 0;
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = tileAt(r, c);
      if (t !== 'industrialPlot' && t !== 'housingPlot' && t !== 'commercialPlot') continue;
      const [x, , z] = cellToWorld(r, c);
      const rotY = nearestRoadFacing(r, c);
      let path: string;
      let scale = PROP_SCALE;
      if (t === 'industrialPlot') {
        // ~15 % of industrial plots get a chimney instead of a building
        // for vertical variation in the industrial skyline.
        path = rng() < 0.15
          ? industrialChimneys[Math.floor(rng() * industrialChimneys.length)]
          : industrialBuildings[Math.floor(rng() * industrialBuildings.length)];
      } else if (t === 'commercialPlot') {
        // ~60 % chance of a skyscraper, 40 % chance of a mid-rise.
        // This biases the inner ring toward the dense-skyline look of
        // the reference images while still mixing heights.
        const pool = rng() < 0.6 ? commercialSkyscrapers : commercialMidRise;
        path = pool[Math.floor(rng() * pool.length)];
      } else {
        path = housingPaths[Math.floor(rng() * housingPaths.length)];
      }
      // Small scale jitter (±5 %) so adjacent same-model buildings
      // don't tile too perfectly.
      scale *= 0.95 + rng() * 0.1;
      out.push({ path, pos: [x, 0, z], rotY, scale });
    }
  }

  // ── 4b. Sidewalk trees — line trees along every sidewalk tile that
  //    sits next to a road. Reference cities all show street trees in
  //    a tight rhythm along the sidewalk strip, never just scattered
  //    on lawn — they're the green that makes a packed city feel
  //    welcoming. We use a stride so trees don't crowd the lamps. ──
  const sidewalkTreeStride = 3;
  let sidewalkTreeIdx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tileAt(r, c) !== 'sidewalk') continue;
      // Sidewalk-with-adjacent-road only, so the tree borders a real
      // street (rather than a pedestrian-only path inside the downtown).
      const adjRoad =
        tileAt(r - 1, c) === 'road' || tileAt(r + 1, c) === 'road' ||
        tileAt(r, c + 1) === 'road' || tileAt(r, c - 1) === 'road';
      if (!adjRoad) continue;
      if (sidewalkTreeIdx++ % sidewalkTreeStride !== 0) continue;
      // Skip if a lamp already lives here (lamp stride is 4 starting
      // from index 0; using stride 3 + offset 1 means we hit the
      // half-way slot most often). Cheap test: compare (r,c) parity.
      const [cx, , cz] = cellToWorld(r, c);
      const big = rng() > 0.6;
      out.push({
        path: big ? KENNEY_OUTDOOR.treeLarge : KENNEY_OUTDOOR.treeSmall,
        pos: [cx + (rng() - 0.5) * 0.3, 0, cz + (rng() - 0.5) * 0.3],
        rotY: rng() * Math.PI * 2,
        scale: PROP_SCALE * (0.7 + rng() * 0.3),
      });
    }
  }

  // ── 4c. A few remaining grass tiles get trees so the gaps between
  //    the dense outer building zone and the world edge still read as
  //    "parkland", not bare green. (Most outer cells are now I/H plots
  //    after the densification in cityMap.ts.) ──
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (tileAt(r, c) !== 'grass') continue;
      // Only the very-outer grass border — within the downtown's own
      // grass ring we already painted trees in step 3. Downtown is
      // rows 18..32 cols 26..44 in the mega-grid.
      if (r >= 18 && r <= 32 && c >= 26 && c <= 44) continue;
      if (rng() > 0.35) continue;
      const [cx, , cz] = cellToWorld(r, c);
      const jx = (rng() - 0.5) * TILE_SIZE * 0.4;
      const jz = (rng() - 0.5) * TILE_SIZE * 0.4;
      const big = rng() > 0.5;
      out.push({
        path: big ? KENNEY_OUTDOOR.treeLarge : KENNEY_OUTDOOR.treeSmall,
        pos: [cx + jx, 0, cz + jz],
        rotY: rng() * Math.PI * 2,
        scale: PROP_SCALE * (0.8 + rng() * 0.4),
      });
    }
  }

  // (Cars are added separately by the React component below — they use
  // their own animated subcomponent, so they don't sit in the placements
  // list which is rendered as static KenneyModels.)

  // ── 5. Cones on a single tile so the road feels lived-in ─────────
  const coneR = 9; // lower road
  const coneC = 11;
  if (tileAt(coneR, coneC) === 'road') {
    const [cx, , cz] = cellToWorld(coneR, coneC);
    for (let i = 0; i < 3; i++) {
      out.push({
        path: KENNEY_STREET_PROPS.cone,
        pos: [cx - 0.5 + i * 0.5, 0.02, cz - 0.3],
        rotY: 0,
        scale: PROP_SCALE,
      });
    }
  }

  return out;
}

/**
 * Random parked cars beside each shop.
 *
 * For each shop we pick one of its 4 adjacent cells that's NOT a road
 * (so the parked car never collides with the moving traffic) and not a
 * building. Rotation is derived from which side the car parks on so the
 * car visually faces the building. Deterministic — same parking layout
 * across reloads.
 */
function buildParkedCars(): Array<{
  path: string;
  pos: [number, number, number];
  rotY: number;
}> {
  const rng = mulberry32(99887766);
  const variants = [
    KENNEY_VEHICLES.sedan,
    KENNEY_VEHICLES.sedanSports,
    KENNEY_VEHICLES.hatchback,
    KENNEY_VEHICLES.suv,
    KENNEY_VEHICLES.suvLuxury,
    KENNEY_VEHICLES.van,
    KENNEY_VEHICLES.truck,
    KENNEY_VEHICLES.delivery,
  ];

  const out: Array<{ path: string; pos: [number, number, number]; rotY: number }> = [];

  for (const shop of SHOPS) {
    const { row, col } = shop.cell;
    // Candidate parking spots: 4 neighbours, with a target rotation that
    // makes the car nose face along the road parallel to the building.
    // (0 = facing south/+Z, π = facing north/-Z, π/2 = east/+X, -π/2 = west/-X.)
    const candidates: Array<{ r: number; c: number; rotY: number }> = [
      { r: row - 1, c: col, rotY: Math.PI / 2 },      // above
      { r: row + 1, c: col, rotY: -Math.PI / 2 },     // below
      { r: row, c: col - 1, rotY: 0 },                 // left
      { r: row, c: col + 1, rotY: Math.PI },           // right
    ].filter(({ r, c }) => {
      // Must be inside the map. Must be a SIDEWALK tile (cars park at the
      // curb). We reject roads (traffic lives there), grass, building
      // plots, AND 'empty' tiles — 'empty' renders as the grass floor
      // underneath the city, which made parked cars look like they were
      // sitting on the lawn next to the building. Sidewalk-only keeps
      // every parked car visibly on a paved tile.
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
      if (tileAt(r, c) !== 'sidewalk') return false;
      // Reject if any other shop occupies this cell.
      return !SHOPS.some((s) => s.cell.row === r && s.cell.col === c);
    });

    if (candidates.length === 0) continue;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    const [x, , z] = cellToWorld(pick.r, pick.c);
    // Tiny jitter inside the chosen cell so cars don't sit on the exact
    // centre — gives the row of parked cars a more lived-in look.
    const jitterX = (rng() - 0.5) * TILE_SIZE * 0.25;
    const jitterZ = (rng() - 0.5) * TILE_SIZE * 0.25;
    out.push({
      path: variants[Math.floor(rng() * variants.length)],
      pos: [x + jitterX, 0.02, z + jitterZ],
      rotY: pick.rotY,
    });
  }

  return out;
}

/**
 * Animated traffic with proper lane discipline.
 *
 * Each Kenney road tile is 2 units wide and has 2 lanes. Cars drive in
 * the right lane (relative to their facing direction) for "fast" traffic
 * and the left lane for "slow" — visually that means:
 *
 *   Upper road (row 5) — eastbound (+X). Driver's right is +Z (south).
 *      • Fast → south side of road  → z = z_centre + 0.5
 *      • Slow → north side of road  → z = z_centre - 0.5
 *
 *   Lower road (row 9) — westbound (-X). Driver's right is -Z (north).
 *      • Fast → north side of road  → z = z_centre - 0.5
 *      • Slow → south side of road  → z = z_centre + 0.5
 *
 * The two roads mirror each other on the same physical tile band, which
 * is exactly how real opposing traffic divides a road.
 */
function Traffic() {
  const LANE_OFFSET = 0.5;

  // Vehicle pool — picked sequentially so the same model doesn't show
  // up next to itself on the same road.
  const POOL = [
    KENNEY_VEHICLES.sedan, KENNEY_VEHICLES.sedanSports,
    KENNEY_VEHICLES.hatchback, KENNEY_VEHICLES.suv,
    KENNEY_VEHICLES.suvLuxury, KENNEY_VEHICLES.van,
    KENNEY_VEHICLES.truck, KENNEY_VEHICLES.delivery,
  ];
  let poolIdx = 0;
  const nextCar = () => POOL[poolIdx++ % POOL.length];

  // Each road is bounded to its OWN extent — vehicles loop start ↔ end
  // along the actual road segment instead of driving across grass to
  // the world edge. We pass startCol/endCol (or startRow/endRow) and
  // the helper resolves them to world X/Z via cellToWorld.
  //
  // Every lane is VALIDATED before rendering: if the underlying span
  // crosses a non-road cell anywhere between start and end, the lane
  // is skipped (returns []) and a console warning fires. This protects
  // against the downtown-vertical-lane class of bug where a lane was
  // defined between two intersection rows but the cells between those
  // intersections were sidewalk / building plots / empty, not roads.
  function horizontalLane(
    row: number, startCol: number, endCol: number,
    lane: 1 | -1,            // +1 = south lane (z + offset), -1 = north lane (z - offset)
    dir: 1 | -1,             // +1 = eastbound (col goes up), -1 = westbound
    n: number, speedBase: number,
  ) {
    if (!roadLaneIsContinuous('horizontal', row, startCol, endCol)) {
      console.warn(`[Traffic] skipping horizontal lane row=${row} cols ${startCol}..${endCol} — non-road cells in span`);
      return [];
    }
    const z = cellToWorld(row, 0)[2] + lane * LANE_OFFSET;
    const sxRaw = cellToWorld(0, startCol)[0];
    const exRaw = cellToWorld(0, endCol)[0];
    const startX = dir > 0 ? Math.min(sxRaw, exRaw) : Math.max(sxRaw, exRaw);
    const endX   = dir > 0 ? Math.max(sxRaw, exRaw) : Math.min(sxRaw, exRaw);
    return Array.from({ length: n }, (_, i) => (
      <MovingVehicle
        key={`hl-${row}-${lane}-${dir}-${i}`}
        path={nextCar()}
        start={[startX, 0, z]}
        end={[endX, 0, z]}
        speed={speedBase + (i % 3) * 0.4}
        phase={i / n}
      />
    ));
  }
  function verticalLane(
    col: number, startRow: number, endRow: number,
    lane: 1 | -1,            // +1 = east lane (x + offset), -1 = west lane
    dir: 1 | -1,             // +1 = southbound (row goes up), -1 = northbound
    n: number, speedBase: number,
  ) {
    if (!roadLaneIsContinuous('vertical', col, startRow, endRow)) {
      console.warn(`[Traffic] skipping vertical lane col=${col} rows ${startRow}..${endRow} — non-road cells in span`);
      return [];
    }
    const x = cellToWorld(0, col)[0] + lane * LANE_OFFSET;
    const szRaw = cellToWorld(startRow, 0)[2];
    const ezRaw = cellToWorld(endRow, 0)[2];
    const startZ = dir > 0 ? Math.min(szRaw, ezRaw) : Math.max(szRaw, ezRaw);
    const endZ   = dir > 0 ? Math.max(szRaw, ezRaw) : Math.min(szRaw, ezRaw);
    return Array.from({ length: n }, (_, i) => (
      <MovingVehicle
        key={`vl-${col}-${lane}-${dir}-${i}`}
        path={nextCar()}
        start={[x, 0, startZ]}
        end={[x, 0, endZ]}
        speed={speedBase + (i % 3) * 0.4}
        phase={i / n}
      />
    ));
  }

  const I = RING_ROADS.inner;     // {rowN, rowS, colW, colE}
  const O = RING_ROADS.outer;
  const [dhTop, dhBot] = RING_ROADS.downtownH;
  const dvCol = RING_ROADS.downtownV;

  return (
    <>
      {/* ── Downtown — upper horizontal road (bridges through inner ring) ── */}
      {horizontalLane(dhTop, I.colW, I.colE,  1,  1, 3, 2.8)}
      {horizontalLane(dhTop, I.colW, I.colE, -1, -1, 3, 2.4)}

      {/* ── Downtown — lower horizontal road ──────────────────── */}
      {horizontalLane(dhBot, I.colW, I.colE,  1, -1, 3, 2.6)}
      {horizontalLane(dhBot, I.colW, I.colE, -1,  1, 3, 2.2)}

      {/* ── Downtown — vertical centre connector ──────────────── */}
      {verticalLane(dvCol, I.rowN, I.rowS,  1,  1, 3, 2.6)}
      {verticalLane(dvCol, I.rowN, I.rowS, -1, -1, 3, 2.4)}

      {/* ── Inner ring — north road ───────────────────────────── */}
      {horizontalLane(I.rowN, I.colW, I.colE,  1,  1, 3, 3.0)}
      {horizontalLane(I.rowN, I.colW, I.colE, -1, -1, 3, 2.6)}

      {/* ── Inner ring — south road ───────────────────────────── */}
      {horizontalLane(I.rowS, I.colW, I.colE,  1, -1, 3, 3.0)}
      {horizontalLane(I.rowS, I.colW, I.colE, -1,  1, 3, 2.4)}

      {/* ── Inner ring — west road ────────────────────────────── */}
      {verticalLane(I.colW, I.rowN, I.rowS,  1,  1, 3, 2.8)}
      {verticalLane(I.colW, I.rowN, I.rowS, -1, -1, 3, 2.4)}

      {/* ── Inner ring — east road ────────────────────────────── */}
      {verticalLane(I.colE, I.rowN, I.rowS,  1, -1, 3, 2.6)}
      {verticalLane(I.colE, I.rowN, I.rowS, -1,  1, 3, 3.2)}

      {/* ── Outer ring — north road ───────────────────────────── */}
      {horizontalLane(O.rowN, O.colW, O.colE,  1,  1, 3, 3.4)}
      {horizontalLane(O.rowN, O.colW, O.colE, -1, -1, 3, 2.6)}

      {/* ── Outer ring — south road ───────────────────────────── */}
      {horizontalLane(O.rowS, O.colW, O.colE,  1, -1, 3, 3.0)}
      {horizontalLane(O.rowS, O.colW, O.colE, -1,  1, 3, 2.4)}

      {/* ── Outer ring — west road ────────────────────────────── */}
      {verticalLane(O.colW, O.rowN, O.rowS,  1,  1, 3, 2.8)}
      {verticalLane(O.colW, O.rowN, O.rowS, -1, -1, 3, 3.0)}

      {/* ── Outer ring — east road ────────────────────────────── */}
      {verticalLane(O.colE, O.rowN, O.rowS,  1, -1, 3, 3.2)}
      {verticalLane(O.colE, O.rowN, O.rowS, -1,  1, 3, 2.4)}
    </>
  );
}

export function CityProps() {
  const placements = useMemo(buildPlacements, []);
  const parkedCars = useMemo(buildParkedCars, []);

  // Trees / lamps / cones share `interactive={false}` so they don't
  // block shop click raycasts. Roads also opt out — the user shouldn't
  // be able to tap a road tile and have anything happen.
  return (
    <group>
      {placements.map((p, i) => (
        <KenneyModel
          key={i}
          path={p.path}
          position={p.pos}
          rotationY={p.rotY}
          scale={p.scale ?? PROP_SCALE}
          interactive={false}
        />
      ))}

      {/* Parked cars beside each shop. ParkedVehicle handles the
          smaller scale + non-interactive raycast for us. */}
      {parkedCars.map((p, i) => (
        <ParkedVehicle key={`parked-${i}`} path={p.path} position={p.pos} rotationY={p.rotY} />
      ))}

      <Traffic />
    </group>
  );
}

// Preload the full set so the city's first frame doesn't pop in piecemeal.
[
  ...Object.values(KENNEY_ROADS),
  ...Object.values(KENNEY_STREET_PROPS),
  ...Object.values(KENNEY_OUTDOOR),
  ...Object.values(KENNEY_BUILDINGS_INDUSTRIAL),
  ...Object.values(KENNEY_BUILDINGS_SUBURBAN),
  ...Object.values(KENNEY_BUILDINGS_COMMERCIAL),
  ...Object.values(KENNEY_VEHICLES),
].forEach((p) => useGLTF.preload(p));
