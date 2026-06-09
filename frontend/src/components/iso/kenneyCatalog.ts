/**
 * Kenney asset catalog.
 *
 * All Kenney `.glb` files live under `public/assets/iso/` so they're
 * served as static assets (no bundling, ETag-cached, gzipped by the dev
 * server). This module exposes typed path constants + groupings so the
 * iso scene can reference them without sprinkling magic strings.
 *
 * Asset packs (all © Kenney.nl, CC0 1.0 Universal):
 *   • City Kit Commercial   → 25 building variants for shops/offices
 *   • City Kit Suburban     → 21 house/residential variants + fences
 *   • City Kit Roads        → road tiles + lampposts + cones
 *   • Car Kit               → 11 vehicles + debris
 *   • Mini Characters       → 12 humans (6F + 6M) + accessibility props
 *   • Furniture Kit         → ~140 indoor items
 *   • Modular Buildings     → 108 wall/floor/door tiles
 *
 * Pixel sizes per pack vary: characters are ~270 KB each (bigger texture
 * atlases), city buildings ~110 KB, road tiles ~5 KB. Everything is
 * lazy-loaded by `useGLTF` on first reference and cached by drei's GLTF
 * loader, so total page weight only adds whatever's actually used.
 */
import { resolvePublicAssetUrl } from '../ShopSimulator3D/assetPath';

const base = (sub: string, file: string) =>
  resolvePublicAssetUrl(`assets/iso/${sub}/${file}.glb`);

// Supermarket pack lives outside the Kenney `iso/` tree (it was dropped
// in by the asset team verbatim from a different source pack), so it
// needs its own resolver. Same `.glb` extension expected.
const superMarket = (file: string) =>
  resolvePublicAssetUrl(`assets/Supermarket/${file}.glb`);

// ── New asset packs (added by the asset team after the Supermarket pack) ──
// Same pattern as `superMarket()`: each pack lives in its own
// `public/assets/<Name>/` folder. Mini-Arcade + Factory ship as `.glb`,
// the Restaurant pack is `.gltf` (with the binary embedded as base64
// data URIs so each file is self-contained — useGLTF loads either
// without code change).
const factory    = (file: string) => resolvePublicAssetUrl(`assets/Factory/${file}.glb`);
const arcade     = (file: string) => resolvePublicAssetUrl(`assets/Mini-Arcade/${file}.glb`);
const restaurant = (file: string) => resolvePublicAssetUrl(`assets/Restaurant/${file}.gltf`);
const cityInd    = (file: string) => resolvePublicAssetUrl(`assets/City industrial/${file}.glb`);
// Gym Environment pack ships a SINGLE 53 MB modular_gym.glb that
// contains the whole gym (treadmills, weights, racks, mirrors, floor)
// in one mesh. We treat it as one placeable "environment" piece that
// fills the room, rather than the pack-of-pieces pattern above. Loaded
// lazily by useGLTF — only downloaded when a kid actually applies the
// Gym preset / drops the tile.
const gymEnv     = (file: string) => resolvePublicAssetUrl(`assets/Gym Environment/${file}.glb`);
// Coffee Shop pack ships a single scene .glb (converted from the
// original 92 MB FBX) holding tables, stools, counter, menu boards,
// wall paintings, ceiling lights, etc. Each catalog entry below targets
// a specific sub-node so kids can place individual coffee-shop pieces.
const coffee     = (file: string) => resolvePublicAssetUrl(`assets/Coffee Shop/${file}.glb`);

// ─── Commercial buildings ────────────────────────────────────────────
// Per-shop building selection. Each shop in `cityMap.SHOPS` references
// one of these via `buildingId` — easy to swap a shop to a different
// building without editing geometry code.
export const KENNEY_BUILDINGS_COMMERCIAL = {
  a:  base('buildings-commercial', 'building-a'),
  b:  base('buildings-commercial', 'building-b'),
  c:  base('buildings-commercial', 'building-c'),
  d:  base('buildings-commercial', 'building-d'),
  e:  base('buildings-commercial', 'building-e'),
  f:  base('buildings-commercial', 'building-f'),
  g:  base('buildings-commercial', 'building-g'),
  h:  base('buildings-commercial', 'building-h'),
  i:  base('buildings-commercial', 'building-i'),
  j:  base('buildings-commercial', 'building-j'),
  k:  base('buildings-commercial', 'building-k'),
  l:  base('buildings-commercial', 'building-l'),
  m:  base('buildings-commercial', 'building-m'),
  n:  base('buildings-commercial', 'building-n'),
  skyA: base('buildings-commercial', 'building-skyscraper-a'),
  skyB: base('buildings-commercial', 'building-skyscraper-b'),
  skyC: base('buildings-commercial', 'building-skyscraper-c'),
  skyD: base('buildings-commercial', 'building-skyscraper-d'),
  skyE: base('buildings-commercial', 'building-skyscraper-e'),
} as const;

export type CommercialBuildingId = keyof typeof KENNEY_BUILDINGS_COMMERCIAL;

// ─── Residential buildings (for ambient city dressing) ───────────────
export const KENNEY_BUILDINGS_SUBURBAN = {
  a: base('buildings-suburban', 'building-type-a'),
  b: base('buildings-suburban', 'building-type-b'),
  c: base('buildings-suburban', 'building-type-c'),
  d: base('buildings-suburban', 'building-type-d'),
  e: base('buildings-suburban', 'building-type-e'),
  f: base('buildings-suburban', 'building-type-f'),
  g: base('buildings-suburban', 'building-type-g'),
  h: base('buildings-suburban', 'building-type-h'),
} as const;

// ─── Characters (NPCs + player avatar inside the shop) ───────────────
export const KENNEY_CHARACTERS = {
  femaleA: base('characters', 'character-female-a'),
  femaleB: base('characters', 'character-female-b'),
  femaleC: base('characters', 'character-female-c'),
  femaleD: base('characters', 'character-female-d'),
  femaleE: base('characters', 'character-female-e'),
  femaleF: base('characters', 'character-female-f'),
  maleA:   base('characters', 'character-male-a'),
  maleB:   base('characters', 'character-male-b'),
  maleC:   base('characters', 'character-male-c'),
  maleD:   base('characters', 'character-male-d'),
  maleE:   base('characters', 'character-male-e'),
  maleF:   base('characters', 'character-male-f'),
} as const;

export type CharacterId = keyof typeof KENNEY_CHARACTERS;

/** All 12 character paths in a tuple — handy for random selection. */
export const ALL_CHARACTER_PATHS = Object.values(KENNEY_CHARACTERS) as string[];

// ─── Vehicles (street ambient) ──────────────────────────────────────
export const KENNEY_VEHICLES = {
  sedan:        base('cars', 'sedan'),
  sedanSports:  base('cars', 'sedan-sports'),
  hatchback:    base('cars', 'hatchback-sports'),
  suv:          base('cars', 'suv'),
  suvLuxury:    base('cars', 'suv-luxury'),
  van:          base('cars', 'van'),
  truck:        base('cars', 'truck'),
  delivery:     base('cars', 'delivery'),
  ambulance:    base('cars', 'ambulance'),
  police:       base('cars', 'police'),
} as const;

// ─── Road tiles (city-kit-roads) ────────────────────────────────────
// Each entry is a 1×1 Kenney tile (same scale convention as buildings).
// We render at scale=2 to match our 2-unit TILE_SIZE grid.
export const KENNEY_ROADS = {
  straight:    base('roads', 'road-straight'),
  straightHalf: base('roads', 'road-straight-half'),
  bend:        base('roads', 'road-bend'),
  bendSidewalk: base('roads', 'road-bend-sidewalk'),
  crossroad:   base('roads', 'road-crossroad'),
  crossroadPath: base('roads', 'road-crossroad-path'),
  crossing:    base('roads', 'road-crossing'),
  curve:       base('roads', 'road-curve'),
  end:         base('roads', 'road-end'),
  intersection:base('roads', 'road-intersection'),
  intersectionLine: base('roads', 'road-intersection-line'),
} as const;

// ─── Street props (also in city-kit-roads) ───────────────────────────
// Lamps, traffic cones, highway signs — used to dress the city.
export const KENNEY_STREET_PROPS = {
  lampCurved:        base('roads', 'light-curved'),
  lampCurvedDouble:  base('roads', 'light-curved-double'),
  lampSquare:        base('roads', 'light-square'),
  lampSquareDouble:  base('roads', 'light-square-double'),
  cone:              base('roads', 'construction-cone'),
  constructionLight: base('roads', 'construction-light'),
  barrier:           base('roads', 'construction-barrier'),
  signHighway:       base('roads', 'sign-highway'),
} as const;

// ─── Outdoor decor (trees + fences from suburban pack) ──────────────
export const KENNEY_OUTDOOR = {
  treeLarge:  base('buildings-suburban', 'tree-large'),
  treeSmall:  base('buildings-suburban', 'tree-small'),
  fence:      base('buildings-suburban', 'fence'),
  fenceLow:   base('buildings-suburban', 'fence-low'),
} as const;

// ─── Furniture (used in the shop interior view) ──────────────────────
export const KENNEY_FURNITURE = {
  // Counter / cash desk
  kitchenBar:        base('furniture', 'kitchenBar'),
  kitchenBarEnd:     base('furniture', 'kitchenBarEnd'),
  desk:              base('furniture', 'desk'),
  deskCorner:        base('furniture', 'deskCorner'),
  // Display + storage
  bookcaseOpen:      base('furniture', 'bookcaseOpen'),
  bookcaseOpenLow:   base('furniture', 'bookcaseOpenLow'),
  bookcaseClosed:    base('furniture', 'bookcaseClosed'),
  bookcaseClosedDoors: base('furniture', 'bookcaseClosedDoors'),
  cabinetTelevision: base('furniture', 'cabinetTelevision'),
  // Seating
  chair:             base('furniture', 'chair'),
  chairCushion:      base('furniture', 'chairCushion'),
  chairRounded:      base('furniture', 'chairRounded'),
  chairDesk:         base('furniture', 'chairDesk'),
  // Tables
  table:             base('furniture', 'table'),
  tableCoffee:       base('furniture', 'tableCoffee'),
  tableCloth:        base('furniture', 'tableCloth'),
  // Plants + lights + decor
  plantSmall1:       base('furniture', 'plantSmall1'),
  plantSmall2:       base('furniture', 'plantSmall2'),
  plantSmall3:       base('furniture', 'plantSmall3'),
  pottedPlant:       base('furniture', 'pottedPlant'),
  lampRoundTable:    base('furniture', 'lampRoundTable'),
  lampSquareCeiling: base('furniture', 'lampSquareCeiling'),
  rugDoormat:        base('furniture', 'rugDoormat'),
  books:             base('furniture', 'books'),
  // Kitchen — for cafés / bakeries
  kitchenCoffeeMachine: base('furniture', 'kitchenCoffeeMachine'),
  kitchenFridge:        base('furniture', 'kitchenFridge'),
  kitchenStove:         base('furniture', 'kitchenStove'),
  kitchenMicrowave:     base('furniture', 'kitchenMicrowave'),

  // ── Supermarket pack ────────────────────────────────────────────────
  // 12 placeable supermarket props from public/assets/Supermarket/.
  // The structural pieces (floor, walls, wall-door, wall-window,
  // wall-corner, fence-door, column, character-employee) are excluded —
  // those are room-level pieces, not drop-in furniture.
  superCashRegister:    superMarket('cash-register'),
  superBottleReturn:    superMarket('bottle-return'),
  superDisplayBread:    superMarket('display-bread'),
  superDisplayFruit:    superMarket('display-fruit'),
  superFreezer:         superMarket('freezer'),
  superFreezersStanding: superMarket('freezers-standing'),
  superShelfBags:       superMarket('shelf-bags'),
  superShelfBoxes:      superMarket('shelf-boxes'),
  superShelfEnd:        superMarket('shelf-end'),
  superShoppingBasket:  superMarket('shopping-basket'),
  superShoppingCart:    superMarket('shopping-cart'),
  superColumn:          superMarket('column'),

  // ── Factory pack ────────────────────────────────────────────────────
  // The full pack ships 130+ pieces. We expose only the iconic "looks like
  // a factory" items — machines, conveyors, hoppers, robot arms, big
  // crates, screens, signage. The original meshes are large (authored at
  // 1m unit scale), so the catalog entries below set a smaller default
  // scale to keep them readable inside a standard 12×10 m shop room.
  factMachine:         factory('machine'),
  factMachineFortified:factory('machine-fortified'),
  factHopperRound:     factory('hopper-round'),
  factHopperSquare:    factory('hopper-square'),
  factHopperHighRound: factory('hopper-high-round'),
  factConveyorLong:    factory('conveyor-long'),
  factConveyorCorner:  factory('conveyor-corner'),
  factConveyorStripe:  factory('conveyor-stripe'),
  factConveyorCross:   factory('conveyor-cross'),
  factRobotArmA:       factory('robot-arm-a'),
  factRobotArmB:       factory('robot-arm-b'),
  factCrane:           factory('crane'),
  factCraneLift:       factory('crane-lift'),
  factCraneMagnet:     factory('crane-magnet'),
  factBoxLarge:        factory('box-large'),
  factBoxLong:         factory('box-long'),
  factBoxSmall:        factory('box-small'),
  factBoxWide:         factory('box-wide'),
  factScreenHangingWide: factory('screen-hanging-wide'),
  factScreenFlat:      factory('screen-flat'),
  factPipeLarge:       factory('pipe-large'),
  factPipeBend:        factory('pipe-large-bend'),
  factScannerHigh:     factory('scanner-high'),
  factScannerLow:      factory('scanner-low'),
  factWarningOrange:   factory('warning-orange'),
  factCogA:            factory('cog-a'),
  factCogB:            factory('cog-b'),

  // ── Mini-Arcade pack ────────────────────────────────────────────────
  // Cabinets + prize machines. Maps onto the "themepark" / arcade
  // category in the questionnaire so kids picking that build a real
  // arcade interior.
  arcadeMachine:       arcade('arcade-machine'),
  arcadeAirHockey:     arcade('air-hockey'),
  arcadeBasketball:    arcade('basketball-game'),
  arcadeClawMachine:   arcade('claw-machine'),
  arcadeDanceMachine:  arcade('dance-machine'),
  arcadePinball:       arcade('pinball'),
  arcadePrizeWheel:    arcade('prize-wheel'),
  arcadePrizes:        arcade('prizes'),
  arcadeTicketMachine: arcade('ticket-machine'),
  arcadeVending:       arcade('vending-machine'),
  arcadeGamblingMachine: arcade('gambling-machine'),
  arcadeCashRegister:  arcade('cash-register'),
  arcadeColumn:        arcade('column'),

  // ── Restaurant pack (.gltf with embedded base64 binary) ─────────────
  // Asian-themed restaurant decoration set. Paintings, lanterns,
  // sakura, plants, bell, fish, carpet, signs.
  restBamboo:        restaurant('Decoration_Bamboo'),
  restBell:          restaurant('Decoration_Bell'),
  restCarpet:        restaurant('Decoration_Carpet'),
  restFish:          restaurant('Decoration_Fish'),
  restLight:         restaurant('Decoration_Light'),
  restPainting:      restaurant('Decoration_Painting'),
  restPaintingSmall: restaurant('Decoration_Painting_Small'),
  restPlant1:        restaurant('Decoration_Plant1'),
  restPlant2:        restaurant('Decoration_Plant2'),
  restSakuraFlower:  restaurant('Decoration_SakuraFlower'),
  restSakuraTree:    restaurant('Decoration_SakuraTree'),
  restSign:          restaurant('Decoration_Sign'),
  restSign2:         restaurant('Decoration_Sign_2'),
  restSign3:         restaurant('Decoration_Sign_3'),
  restWallLight:     restaurant('Decoration_WallLight'),

  // ── Gym Environment pack ────────────────────────────────────────────
  // Single mega-mesh — the whole gym room (treadmills, weight stacks,
  // racks, mirrors, floor markings) in one 53 MB .glb. Placed as one
  // furniture piece, scaled to fit the room.
  gymEnvironment: gymEnv('modular_gym'),

  // ── Coffee Shop pack ────────────────────────────────────────────────
  // Single .glb (converted from a 92 MB FBX, pruned to ~1.9 MB by
  // keeping only the furniture nodes and dropping walls/ceiling/etc.).
  // Each catalog entry extracts a sub-node by name.
  coffeeShop: coffee('coffee'),
} as const;

// ── City Industrial pack (exterior buildings + chimneys) ──────────────
// 20 industrial building variants for the outdoor iso city. NOT shop-
// interior furniture — exposed here so the city map can pick from them
// when the player's shop is a factory.
export const KENNEY_BUILDINGS_INDUSTRIAL = {
  a: cityInd('building-a'),
  b: cityInd('building-b'),
  c: cityInd('building-c'),
  d: cityInd('building-d'),
  e: cityInd('building-e'),
  f: cityInd('building-f'),
  g: cityInd('building-g'),
  h: cityInd('building-h'),
  i: cityInd('building-i'),
  j: cityInd('building-j'),
  k: cityInd('building-k'),
  l: cityInd('building-l'),
  m: cityInd('building-m'),
  n: cityInd('building-n'),
  o: cityInd('building-o'),
  p: cityInd('building-p'),
  q: cityInd('building-q'),
  r: cityInd('building-r'),
  s: cityInd('building-s'),
  t: cityInd('building-t'),
  chimneyBasic:  cityInd('chimney-basic'),
  chimneyLarge:  cityInd('chimney-large'),
  chimneyMedium: cityInd('chimney-medium'),
  chimneySmall:  cityInd('chimney-small'),
  detailTank:    cityInd('detail-tank'),
} as const;

export type FurnitureId = keyof typeof KENNEY_FURNITURE;
