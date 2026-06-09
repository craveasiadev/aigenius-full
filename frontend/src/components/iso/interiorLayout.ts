/**
 * Data model for the iso shop interior — replaces the previous
 * hard-coded furniture layout in `IsoShopInterior.tsx` with a serialisable
 * array of items so the player can decorate their own room.
 *
 *   • `IsoInteriorLayout` lives on `business.interior_config.iso_layout`
 *     (Laravel JSON blob). On first visit we hydrate from the default
 *     factory below so existing shops look identical to before.
 *   • `IsoInteriorItem` is one piece of furniture — type id, position
 *     on the (12 × 10) floor, and rotation in quarter-turns.
 *   • `FURNITURE_CATALOG` is the picker dictionary the editor reads to
 *     draw the "Add furniture" palette + look up the GLB path for each
 *     placed item id. Keep this in lock-step with `KENNEY_FURNITURE`.
 *
 * The world coordinate system inside the room:
 *
 *      −Z (back wall)
 *        ↑
 *   −X ← → +X
 *        ↓
 *      +Z (storefront edge / camera side)
 *
 * Item positions are clamped to (±5, ±4) so they stay inside the walls
 * with a small margin. Floor is at y=0; tall items (microwave / coffee
 * machine) take an explicit `y` override.
 */
import { KENNEY_FURNITURE } from './kenneyCatalog';

// ── Room dimensions (must match IsoShopInterior) ───────────────────────
export const ROOM_W = 12;
export const ROOM_D = 10;
export const WALL_H = 3;

// Editable bounds — half-extents with a 0.6 margin so items don't clip
// into the walls. Used for clamping during move + place actions.
export const FLOOR_BOUNDS = {
  minX: -ROOM_W / 2 + 0.6,
  maxX:  ROOM_W / 2 - 0.6,
  minZ: -ROOM_D / 2 + 0.6,
  maxZ:  ROOM_D / 2 - 0.6,
};

// ── Furniture catalog ──────────────────────────────────────────────────
// Each entry: the GLB path, a friendly display name, the category tab
// it appears under, and an optional y/scale override.
//
// Keep ids stable — they're stored in the layout JSON. Don't rename
// existing keys without a migration.
export type FurnitureId =
  | 'kitchenBar'
  | 'kitchenBarEnd'
  | 'kitchenFridge'
  | 'kitchenCoffeeMachine'
  | 'kitchenMicrowave'
  | 'kitchenStove'
  | 'desk'
  | 'deskCorner'
  | 'bookcaseOpen'
  | 'bookcaseOpenLow'
  | 'bookcaseClosed'
  | 'bookcaseClosedDoors'
  | 'cabinetTelevision'
  | 'chair'
  | 'chairCushion'
  | 'chairRounded'
  | 'chairDesk'
  | 'table'
  | 'tableCoffee'
  | 'tableCloth'
  | 'pottedPlant'
  | 'plantSmall1'
  | 'plantSmall2'
  | 'plantSmall3'
  | 'lampRoundTable'
  | 'lampSquareCeiling'
  | 'rugDoormat'
  | 'books'
  // Wall art — mounts on the back wall, can slide left/right.
  | 'frameViolet'
  | 'frameAmber'
  | 'frameEmerald'
  | 'frameRose'
  // ── Supermarket pack — placeable props for kids running a grocery shop ──
  | 'superCashRegister'
  | 'superBottleReturn'
  | 'superDisplayBread'
  | 'superDisplayFruit'
  | 'superFreezer'
  | 'superFreezersStanding'
  | 'superShelfBags'
  | 'superShelfBoxes'
  | 'superShelfEnd'
  | 'superShoppingBasket'
  | 'superShoppingCart'
  | 'superColumn'
  // ── Factory pack — machines, conveyors, robot arms, hoppers, crates ─
  | 'factMachine'
  | 'factMachineFortified'
  | 'factHopperRound'
  | 'factHopperSquare'
  | 'factHopperHighRound'
  | 'factConveyorLong'
  | 'factConveyorCorner'
  | 'factConveyorStripe'
  | 'factConveyorCross'
  | 'factRobotArmA'
  | 'factRobotArmB'
  | 'factCrane'
  | 'factCraneLift'
  | 'factCraneMagnet'
  | 'factBoxLarge'
  | 'factBoxLong'
  | 'factBoxSmall'
  | 'factBoxWide'
  | 'factScreenHangingWide'
  | 'factScreenFlat'
  | 'factPipeLarge'
  | 'factPipeBend'
  | 'factScannerHigh'
  | 'factScannerLow'
  | 'factWarningOrange'
  | 'factCogA'
  | 'factCogB'
  // ── Mini-Arcade pack — cabinets + prize machines ────────────────────
  | 'arcadeMachine'
  | 'arcadeAirHockey'
  | 'arcadeBasketball'
  | 'arcadeClawMachine'
  | 'arcadeDanceMachine'
  | 'arcadePinball'
  | 'arcadePrizeWheel'
  | 'arcadePrizes'
  | 'arcadeTicketMachine'
  | 'arcadeVending'
  | 'arcadeGamblingMachine'
  | 'arcadeCashRegister'
  | 'arcadeColumn'
  // ── Restaurant pack — asian-themed decor (.gltf) ────────────────────
  | 'restBamboo'
  | 'restBell'
  | 'restCarpet'
  | 'restFish'
  | 'restLight'
  | 'restPainting'
  | 'restPaintingSmall'
  | 'restPlant1'
  | 'restPlant2'
  | 'restSakuraFlower'
  | 'restSakuraTree'
  | 'restSign'
  | 'restSign2'
  | 'restSign3'
  | 'restWallLight'
  // ── Gym Environment pack — pieces extracted from the modular_gym
  //    mega-mesh by sub-node name. All share the same .glb load so
  //    placing N pieces still only downloads the file once.
  | 'gymTreadmill'
  | 'gymTreadmill2'
  | 'gymBike'
  | 'gymBike2'
  | 'gymBench'
  | 'gymLegMachine'
  | 'gymWeightRack'
  | 'gymWeightBar'
  | 'gymMat'
  | 'gymMat2'
  | 'gymBall'
  | 'gymTV'
  | 'gymScale'
  // ── Coffee Shop pack — sub-nodes extracted from coffee.glb. Each
  //    piece is one or more named sub-nodes from the same source
  //    scene so the .glb downloads exactly once per session.
  | 'coffeeTable'
  | 'coffeeStool'
  | 'coffeeCounter'
  | 'coffeeCounterSlab'
  | 'coffeeMenuTV'
  | 'coffeeWallPainting'
  | 'coffeeCeilingLight'
  | 'coffeeDecoLight'
  | 'coffeePC'
  | 'coffeeCup';

export type FurnitureCategory =
  | 'seating' | 'tables' | 'storage' | 'kitchen' | 'decor' | 'wall'
  | 'supermarket' | 'factory' | 'arcade' | 'restaurant' | 'gym' | 'coffee';

export interface FurnitureMeta {
  id: FurnitureId;
  path: string;
  name: string;
  category: FurnitureCategory;
  /** Optional y override (e.g. items that sit on a counter). */
  y?: number;
  /** Optional scale override; default is 1.4. */
  scale?: number;
  /** Surface this item attaches to. `'floor'` (default) sits on the
   *  ground. `'wall'` is rendered as a flat decorative plane on the
   *  back wall — z is locked to the wall, the item slides along x. */
  mount?: 'floor' | 'wall';
  /** Wall-mount colour pair (border + interior). Only honoured when
   *  `mount === 'wall'`. */
  frameBorderHex?: string;
  frameFillHex?: string;
  /** When set, render ONLY the sub-node with this name from the loaded
   *  GLB instead of the whole scene. Lets us split a mega-mesh (e.g.
   *  the 53 MB modular_gym.glb) into individually placeable pieces
   *  WITHOUT pre-splitting the file. KenneyModel handles the recentre. */
  nodeName?: string;
  /** Render multiple named sub-nodes together as one composite piece —
   *  used for furniture that ships as separate sibling nodes in the
   *  source scene (Coffee Shop pack's `Table Base` + `Table top`). The
   *  pieces' relative world positions are preserved, then the whole
   *  group is recentred at the origin. */
  nodeNames?: string[];
}

export const FURNITURE_CATALOG: Record<FurnitureId, FurnitureMeta> = {
  // — Seating —
  chair:         { id: 'chair',         path: KENNEY_FURNITURE.chair,         name: 'Chair',          category: 'seating' },
  chairCushion:  { id: 'chairCushion',  path: KENNEY_FURNITURE.chairCushion,  name: 'Cushion chair',  category: 'seating' },
  chairRounded:  { id: 'chairRounded',  path: KENNEY_FURNITURE.chairRounded,  name: 'Round chair',    category: 'seating' },
  chairDesk:     { id: 'chairDesk',     path: KENNEY_FURNITURE.chairDesk,     name: 'Office chair',   category: 'seating' },
  // — Tables —
  table:         { id: 'table',         path: KENNEY_FURNITURE.table,         name: 'Table',          category: 'tables' },
  tableCoffee:   { id: 'tableCoffee',   path: KENNEY_FURNITURE.tableCoffee,   name: 'Coffee table',   category: 'tables' },
  tableCloth:    { id: 'tableCloth',    path: KENNEY_FURNITURE.tableCloth,    name: 'Cloth table',    category: 'tables' },
  desk:          { id: 'desk',          path: KENNEY_FURNITURE.desk,          name: 'Desk',           category: 'tables' },
  deskCorner:    { id: 'deskCorner',    path: KENNEY_FURNITURE.deskCorner,    name: 'Corner desk',    category: 'tables' },
  // — Storage / Display —
  bookcaseOpen:        { id: 'bookcaseOpen',        path: KENNEY_FURNITURE.bookcaseOpen,        name: 'Open shelf',      category: 'storage' },
  bookcaseOpenLow:     { id: 'bookcaseOpenLow',     path: KENNEY_FURNITURE.bookcaseOpenLow,     name: 'Low shelf',       category: 'storage' },
  bookcaseClosed:      { id: 'bookcaseClosed',      path: KENNEY_FURNITURE.bookcaseClosed,      name: 'Closed shelf',    category: 'storage' },
  bookcaseClosedDoors: { id: 'bookcaseClosedDoors', path: KENNEY_FURNITURE.bookcaseClosedDoors, name: 'Cabinet',         category: 'storage' },
  cabinetTelevision:   { id: 'cabinetTelevision',   path: KENNEY_FURNITURE.cabinetTelevision,   name: 'TV cabinet',      category: 'storage' },
  // — Kitchen / Counter —
  kitchenBar:           { id: 'kitchenBar',           path: KENNEY_FURNITURE.kitchenBar,           name: 'Bar counter',     category: 'kitchen' },
  kitchenBarEnd:        { id: 'kitchenBarEnd',        path: KENNEY_FURNITURE.kitchenBarEnd,        name: 'Bar end',         category: 'kitchen' },
  kitchenFridge:        { id: 'kitchenFridge',        path: KENNEY_FURNITURE.kitchenFridge,        name: 'Fridge',          category: 'kitchen' },
  kitchenCoffeeMachine: { id: 'kitchenCoffeeMachine', path: KENNEY_FURNITURE.kitchenCoffeeMachine, name: 'Coffee machine',  category: 'kitchen', y: 1.3 },
  kitchenMicrowave:     { id: 'kitchenMicrowave',     path: KENNEY_FURNITURE.kitchenMicrowave,     name: 'Microwave',       category: 'kitchen', y: 1.3 },
  kitchenStove:         { id: 'kitchenStove',         path: KENNEY_FURNITURE.kitchenStove,         name: 'Stove',           category: 'kitchen' },
  // — Decor —
  pottedPlant:       { id: 'pottedPlant',       path: KENNEY_FURNITURE.pottedPlant,       name: 'Potted plant',  category: 'decor' },
  plantSmall1:       { id: 'plantSmall1',       path: KENNEY_FURNITURE.plantSmall1,       name: 'Small plant',   category: 'decor' },
  plantSmall2:       { id: 'plantSmall2',       path: KENNEY_FURNITURE.plantSmall2,       name: 'Tiny plant',    category: 'decor' },
  plantSmall3:       { id: 'plantSmall3',       path: KENNEY_FURNITURE.plantSmall3,       name: 'Leaf plant',    category: 'decor' },
  lampRoundTable:    { id: 'lampRoundTable',    path: KENNEY_FURNITURE.lampRoundTable,    name: 'Table lamp',    category: 'decor' },
  lampSquareCeiling: { id: 'lampSquareCeiling', path: KENNEY_FURNITURE.lampSquareCeiling, name: 'Ceiling lamp',  category: 'decor', y: WALL_H - 0.1 },
  rugDoormat:        { id: 'rugDoormat',        path: KENNEY_FURNITURE.rugDoormat,        name: 'Rug',           category: 'decor', scale: 1.95 },
  books:             { id: 'books',             path: KENNEY_FURNITURE.books,             name: 'Books',         category: 'decor' },
  // — Wall art frames — flat coloured planes mounted on the back wall.
  //   The `path` is set to the books model just for type compatibility;
  //   it's never actually loaded for `mount: 'wall'` items.
  frameViolet:  { id: 'frameViolet',  path: KENNEY_FURNITURE.books, name: 'Violet frame',  category: 'wall', mount: 'wall', frameBorderHex: '#7c3aed', frameFillHex: '#ede9fe' },
  frameAmber:   { id: 'frameAmber',   path: KENNEY_FURNITURE.books, name: 'Amber frame',   category: 'wall', mount: 'wall', frameBorderHex: '#d97706', frameFillHex: '#fef3c7' },
  frameEmerald: { id: 'frameEmerald', path: KENNEY_FURNITURE.books, name: 'Emerald frame', category: 'wall', mount: 'wall', frameBorderHex: '#059669', frameFillHex: '#d1fae5' },
  frameRose:    { id: 'frameRose',    path: KENNEY_FURNITURE.books, name: 'Rose frame',    category: 'wall', mount: 'wall', frameBorderHex: '#e11d48', frameFillHex: '#ffe4e6' },

  // — Supermarket pack — checkout, displays, shelves, carts, freezers —
  // All floor-mounted, default scale. Footprints set in
  // FURNITURE_FOOTPRINT below so NPCs walk around them.
  superCashRegister:      { id: 'superCashRegister',      path: KENNEY_FURNITURE.superCashRegister,      name: 'Cash register',     category: 'supermarket' },
  superBottleReturn:      { id: 'superBottleReturn',      path: KENNEY_FURNITURE.superBottleReturn,      name: 'Bottle return',     category: 'supermarket' },
  superDisplayBread:      { id: 'superDisplayBread',      path: KENNEY_FURNITURE.superDisplayBread,      name: 'Bread display',     category: 'supermarket' },
  superDisplayFruit:      { id: 'superDisplayFruit',      path: KENNEY_FURNITURE.superDisplayFruit,      name: 'Fruit display',     category: 'supermarket' },
  superFreezer:           { id: 'superFreezer',           path: KENNEY_FURNITURE.superFreezer,           name: 'Freezer chest',     category: 'supermarket' },
  superFreezersStanding:  { id: 'superFreezersStanding',  path: KENNEY_FURNITURE.superFreezersStanding,  name: 'Tall freezer',      category: 'supermarket' },
  superShelfBags:         { id: 'superShelfBags',         path: KENNEY_FURNITURE.superShelfBags,         name: 'Bag shelf',         category: 'supermarket' },
  superShelfBoxes:        { id: 'superShelfBoxes',        path: KENNEY_FURNITURE.superShelfBoxes,        name: 'Box shelf',         category: 'supermarket' },
  superShelfEnd:          { id: 'superShelfEnd',          path: KENNEY_FURNITURE.superShelfEnd,          name: 'Shelf end-cap',     category: 'supermarket' },
  superShoppingBasket:    { id: 'superShoppingBasket',    path: KENNEY_FURNITURE.superShoppingBasket,    name: 'Shopping basket',   category: 'supermarket' },
  superShoppingCart:      { id: 'superShoppingCart',      path: KENNEY_FURNITURE.superShoppingCart,      name: 'Shopping cart',     category: 'supermarket' },
  superColumn:            { id: 'superColumn',            path: KENNEY_FURNITURE.superColumn,            name: 'Column',            category: 'supermarket' },

  // ── Factory pack ────────────────────────────────────────────────────
  // Factory meshes are authored at 1m world units — vastly larger than
  // the Kenney furniture set we use as baseline. We override `scale` per
  // entry so machines fit inside the room, while the FACTORY PRESET also
  // expands the room itself (see makeFactoryLayout's floorScale). Items
  // that should still feel massive (cranes, big screens) keep a higher
  // scale; small props (boxes, cogs, scanners) scale further down.
  factMachine:          { id: 'factMachine',          path: KENNEY_FURNITURE.factMachine,          name: 'Machine',         category: 'factory', scale: 0.95 },
  factMachineFortified: { id: 'factMachineFortified', path: KENNEY_FURNITURE.factMachineFortified, name: 'Big machine',     category: 'factory', scale: 1.05 },
  factHopperRound:      { id: 'factHopperRound',      path: KENNEY_FURNITURE.factHopperRound,      name: 'Hopper',          category: 'factory', scale: 0.95 },
  factHopperSquare:     { id: 'factHopperSquare',     path: KENNEY_FURNITURE.factHopperSquare,     name: 'Square hopper',   category: 'factory', scale: 0.95 },
  factHopperHighRound:  { id: 'factHopperHighRound',  path: KENNEY_FURNITURE.factHopperHighRound,  name: 'Tall hopper',     category: 'factory', scale: 1.1 },
  factConveyorLong:     { id: 'factConveyorLong',     path: KENNEY_FURNITURE.factConveyorLong,     name: 'Conveyor',        category: 'factory', scale: 1.0 },
  factConveyorCorner:   { id: 'factConveyorCorner',   path: KENNEY_FURNITURE.factConveyorCorner,   name: 'Conveyor turn',   category: 'factory', scale: 1.0 },
  factConveyorStripe:   { id: 'factConveyorStripe',   path: KENNEY_FURNITURE.factConveyorStripe,   name: 'Striped belt',    category: 'factory', scale: 1.0 },
  factConveyorCross:    { id: 'factConveyorCross',    path: KENNEY_FURNITURE.factConveyorCross,    name: 'Belt junction',   category: 'factory', scale: 1.0 },
  factRobotArmA:        { id: 'factRobotArmA',        path: KENNEY_FURNITURE.factRobotArmA,        name: 'Robot arm',       category: 'factory', scale: 1.0 },
  factRobotArmB:        { id: 'factRobotArmB',        path: KENNEY_FURNITURE.factRobotArmB,        name: 'Heavy robot arm', category: 'factory', scale: 1.0 },
  factCrane:            { id: 'factCrane',            path: KENNEY_FURNITURE.factCrane,            name: 'Crane',           category: 'factory', scale: 1.15 },
  factCraneLift:        { id: 'factCraneLift',        path: KENNEY_FURNITURE.factCraneLift,        name: 'Crane lift',      category: 'factory', scale: 1.15 },
  factCraneMagnet:      { id: 'factCraneMagnet',      path: KENNEY_FURNITURE.factCraneMagnet,      name: 'Magnet crane',    category: 'factory', scale: 1.15 },
  factBoxLarge:         { id: 'factBoxLarge',         path: KENNEY_FURNITURE.factBoxLarge,         name: 'Crate (large)',   category: 'factory', scale: 0.8 },
  factBoxLong:          { id: 'factBoxLong',          path: KENNEY_FURNITURE.factBoxLong,          name: 'Crate (long)',    category: 'factory', scale: 0.8 },
  factBoxSmall:         { id: 'factBoxSmall',         path: KENNEY_FURNITURE.factBoxSmall,         name: 'Crate',           category: 'factory', scale: 0.7 },
  factBoxWide:          { id: 'factBoxWide',          path: KENNEY_FURNITURE.factBoxWide,          name: 'Crate (wide)',    category: 'factory', scale: 0.8 },
  factScreenHangingWide:{ id: 'factScreenHangingWide',path: KENNEY_FURNITURE.factScreenHangingWide,name: 'Status screen',   category: 'factory', scale: 1.0, y: WALL_H - 0.4 },
  factScreenFlat:       { id: 'factScreenFlat',       path: KENNEY_FURNITURE.factScreenFlat,       name: 'Wall screen',     category: 'factory', scale: 1.0 },
  factPipeLarge:        { id: 'factPipeLarge',        path: KENNEY_FURNITURE.factPipeLarge,        name: 'Pipe',            category: 'factory', scale: 0.95 },
  factPipeBend:         { id: 'factPipeBend',         path: KENNEY_FURNITURE.factPipeBend,         name: 'Pipe bend',       category: 'factory', scale: 0.95 },
  factScannerHigh:      { id: 'factScannerHigh',      path: KENNEY_FURNITURE.factScannerHigh,      name: 'Tall scanner',    category: 'factory', scale: 1.0 },
  factScannerLow:       { id: 'factScannerLow',       path: KENNEY_FURNITURE.factScannerLow,       name: 'Scanner',         category: 'factory', scale: 1.0 },
  factWarningOrange:    { id: 'factWarningOrange',    path: KENNEY_FURNITURE.factWarningOrange,    name: 'Warning sign',    category: 'factory', scale: 0.85 },
  factCogA:             { id: 'factCogA',             path: KENNEY_FURNITURE.factCogA,             name: 'Cog (small)',     category: 'factory', scale: 0.85 },
  factCogB:             { id: 'factCogB',             path: KENNEY_FURNITURE.factCogB,             name: 'Cog (large)',     category: 'factory', scale: 0.95 },

  // ── Mini-Arcade pack ────────────────────────────────────────────────
  arcadeMachine:         { id: 'arcadeMachine',         path: KENNEY_FURNITURE.arcadeMachine,         name: 'Arcade cabinet',     category: 'arcade' },
  arcadeAirHockey:       { id: 'arcadeAirHockey',       path: KENNEY_FURNITURE.arcadeAirHockey,       name: 'Air hockey',         category: 'arcade' },
  arcadeBasketball:      { id: 'arcadeBasketball',      path: KENNEY_FURNITURE.arcadeBasketball,      name: 'Basketball game',    category: 'arcade' },
  arcadeClawMachine:     { id: 'arcadeClawMachine',     path: KENNEY_FURNITURE.arcadeClawMachine,     name: 'Claw machine',       category: 'arcade' },
  arcadeDanceMachine:    { id: 'arcadeDanceMachine',    path: KENNEY_FURNITURE.arcadeDanceMachine,    name: 'Dance machine',      category: 'arcade' },
  arcadePinball:         { id: 'arcadePinball',         path: KENNEY_FURNITURE.arcadePinball,         name: 'Pinball',            category: 'arcade' },
  arcadePrizeWheel:      { id: 'arcadePrizeWheel',      path: KENNEY_FURNITURE.arcadePrizeWheel,      name: 'Prize wheel',        category: 'arcade' },
  arcadePrizes:          { id: 'arcadePrizes',          path: KENNEY_FURNITURE.arcadePrizes,          name: 'Prize shelf',        category: 'arcade' },
  arcadeTicketMachine:   { id: 'arcadeTicketMachine',   path: KENNEY_FURNITURE.arcadeTicketMachine,   name: 'Ticket machine',     category: 'arcade' },
  arcadeVending:         { id: 'arcadeVending',         path: KENNEY_FURNITURE.arcadeVending,         name: 'Vending machine',    category: 'arcade' },
  arcadeGamblingMachine: { id: 'arcadeGamblingMachine', path: KENNEY_FURNITURE.arcadeGamblingMachine, name: 'Coin pusher',        category: 'arcade' },
  arcadeCashRegister:    { id: 'arcadeCashRegister',    path: KENNEY_FURNITURE.arcadeCashRegister,    name: 'Token counter',      category: 'arcade' },
  arcadeColumn:          { id: 'arcadeColumn',          path: KENNEY_FURNITURE.arcadeColumn,          name: 'Column',             category: 'arcade' },

  // ── Restaurant pack (.gltf) — asian-themed decor ───────────────────
  // The Restaurant .gltf source meshes are authored at a much larger
  // base unit scale than the Kenney furniture pack. At the catalog
  // default (1.4) they render ~2× too big and clip through walls /
  // ceiling. The values below are tuned by eye against the 12×10 m
  // room so each piece reads as a normal prop next to a customer.
  restBamboo:        { id: 'restBamboo',        path: KENNEY_FURNITURE.restBamboo,        name: 'Bamboo plant',  category: 'restaurant', scale: 0.55 },
  restBell:          { id: 'restBell',          path: KENNEY_FURNITURE.restBell,          name: 'Temple bell',   category: 'restaurant', scale: 0.5 },
  restCarpet:        { id: 'restCarpet',        path: KENNEY_FURNITURE.restCarpet,        name: 'Carpet',        category: 'restaurant', scale: 0.85 },
  // restFish — the koi-pond mesh has its pivot at the water surface, so
  // y = 0 buries the basin below the floor. Lifting by 0.35 m parks the
  // pond rim ~floor level so the bowl reads as resting on the planks
  // instead of half-sinking through them.
  restFish:          { id: 'restFish',          path: KENNEY_FURNITURE.restFish,          name: 'Fish pond',     category: 'restaurant', scale: 0.6,  y: 2 },
  restLight:         { id: 'restLight',         path: KENNEY_FURNITURE.restLight,         name: 'Paper lantern', category: 'restaurant', scale: 0.45, y: WALL_H - 0.4 },
  // Paintings have the same hanging-pivot quirk as restSign2/3 — the
  // mesh origin is at the top hook so y = 0 dumps the canvas below the
  // floor. Lift them to eye-level so they read as mounted on the back
  // wall. (Tuned a touch lower than the signs so the canvas frames sit
  // around 1.5 m above the floor, not under the ceiling.)
  restPainting:      { id: 'restPainting',      path: KENNEY_FURNITURE.restPainting,      name: 'Painting',      category: 'restaurant', scale: 0.5,  y: 2.3 },
  restPaintingSmall: { id: 'restPaintingSmall', path: KENNEY_FURNITURE.restPaintingSmall, name: 'Small painting',category: 'restaurant', scale: 0.45, y: 2.0 },
  restPlant1:        { id: 'restPlant1',        path: KENNEY_FURNITURE.restPlant1,        name: 'Floor plant',   category: 'restaurant', scale: 0.55 },
  restPlant2:        { id: 'restPlant2',        path: KENNEY_FURNITURE.restPlant2,        name: 'Bonsai',        category: 'restaurant', scale: 0.55 },
  restSakuraFlower:  { id: 'restSakuraFlower',  path: KENNEY_FURNITURE.restSakuraFlower,  name: 'Sakura branch', category: 'restaurant', scale: 0.5 },
  restSakuraTree:    { id: 'restSakuraTree',    path: KENNEY_FURNITURE.restSakuraTree,    name: 'Sakura tree',   category: 'restaurant', scale: 0.7 },
  // restSign sits on the floor naturally (wooden a-frame); restSign2 and
  // restSign3 are noren/banner-style hanging signs — their model pivot
  // sits at the TOP crossbar, so without a y override they dangle below
  // the floor plane. y = 2.2 puts the crossbar near ceiling height so
  // the banner is fully visible between ~2.2 m and ~0.5 m above floor.
  restSign:          { id: 'restSign',          path: KENNEY_FURNITURE.restSign,          name: 'Wooden sign',    category: 'restaurant', scale: 0.45 },
  restSign2:         { id: 'restSign2',         path: KENNEY_FURNITURE.restSign2,         name: 'Hanging sign',   category: 'restaurant', scale: 0.45, y: 2.5 },
  restSign3:         { id: 'restSign3',         path: KENNEY_FURNITURE.restSign3,         name: 'Hanging banner', category: 'restaurant', scale: 0.5,  y: 2.2 },
  restWallLight:     { id: 'restWallLight',     path: KENNEY_FURNITURE.restWallLight,     name: 'Wall lantern',  category: 'restaurant', scale: 0.45, y: WALL_H - 0.6 },

  // ── Gym Environment pack ────────────────────────────────────────────
  // The pack ships ONE 53 MB modular_gym.glb that contains the whole
  // gym (treadmills, weight rack, bench, mats, bike, etc.) as one
  // mesh. Each entry below points at the SAME .glb but extracts a
  // different sub-node by name (`nodeName`), so the file downloads
  // once and we get individually placeable pieces. Scales are tuned
  // by eye against a standard 12×10 room — the source meshes are
  // authored at roughly real-world size so they need shrinking to
  // sit next to a Kenney chair.
  // Scale 0.35 sits each gym piece at roughly the same screen footprint
  // as a customer character (≈1.6 m tall) — treadmill reads as
  // person-sized, not skyscraper-sized. Smaller props (mat, ball,
  // scale) shrink another notch.
  gymTreadmill:   { id: 'gymTreadmill',   path: KENNEY_FURNITURE.gymEnvironment, name: 'Treadmill',     category: 'gym', scale: 0.35, nodeName: 'treadmill1' },
  gymTreadmill2:  { id: 'gymTreadmill2',  path: KENNEY_FURNITURE.gymEnvironment, name: 'Treadmill 2',   category: 'gym', scale: 0.35, nodeName: 'treadmill2' },
  gymBike:        { id: 'gymBike',        path: KENNEY_FURNITURE.gymEnvironment, name: 'Indoor bike',   category: 'gym', scale: 0.35, nodeName: 'Indoor_Bike' },
  gymBike2:       { id: 'gymBike2',       path: KENNEY_FURNITURE.gymEnvironment, name: 'Indoor bike 2', category: 'gym', scale: 0.35, nodeName: 'Indoor_Bike1' },
  gymBench:       { id: 'gymBench',       path: KENNEY_FURNITURE.gymEnvironment, name: 'Weight bench',  category: 'gym', scale: 0.35, nodeName: 'bench2' },
  gymLegMachine:  { id: 'gymLegMachine',  path: KENNEY_FURNITURE.gymEnvironment, name: 'Leg machine',   category: 'gym', scale: 0.4,  nodeName: 'Leg_Machine' },
  gymWeightRack:  { id: 'gymWeightRack',  path: KENNEY_FURNITURE.gymEnvironment, name: 'Weight rack',   category: 'gym', scale: 0.4,  nodeName: 'weightrackreplacment2:pCylinder55' },
  gymWeightBar:   { id: 'gymWeightBar',   path: KENNEY_FURNITURE.gymEnvironment, name: 'Barbell',       category: 'gym', scale: 0.35, nodeName: 'Weight_Bar1' },
  gymMat:         { id: 'gymMat',         path: KENNEY_FURNITURE.gymEnvironment, name: 'Yoga mat',      category: 'gym', scale: 0.35, nodeName: 'Mat' },
  gymMat2:        { id: 'gymMat2',        path: KENNEY_FURNITURE.gymEnvironment, name: 'Mat 2',         category: 'gym', scale: 0.35, nodeName: 'Mat3' },
  gymBall:        { id: 'gymBall',        path: KENNEY_FURNITURE.gymEnvironment, name: 'Exercise ball', category: 'gym', scale: 0.35, nodeName: 'ball12' },
  gymTV:          { id: 'gymTV',          path: KENNEY_FURNITURE.gymEnvironment, name: 'Wall TV',       category: 'gym', scale: 0.4,  nodeName: 'TV', y: 1.8 },
  gymScale:       { id: 'gymScale',       path: KENNEY_FURNITURE.gymEnvironment, name: 'Weight scale',  category: 'gym', scale: 0.35, nodeName: 'weightScale1' },

  // ── Coffee Shop pack ────────────────────────────────────────────────
  // Each entry pulls one or more named sub-nodes out of the same
  // coffee.glb so the .glb downloads once. Tables / stools use
  // `nodeNames` (composite) because the source authored each as two
  // sibling nodes — base + top sitting on top.
  //
  // IMPORTANT: source nodes were authored at WIDELY different scales
  // (counter ~10 m wide, ceiling light ~29 m, tables ~2.3 m, cup
  // ~0.3 m). Each scale below is tuned so the rendered piece sits at a
  // sensible café size in our 12×10 m room — DO NOT replace with a
  // single shared scale, the pieces will be unreadable.
  coffeeTable:       { id: 'coffeeTable',       path: KENNEY_FURNITURE.coffeeShop, name: 'Café table',     category: 'coffee', scale: 0.8,  nodeNames: ['Table Base', 'Table top'] },
  coffeeStool:       { id: 'coffeeStool',       path: KENNEY_FURNITURE.coffeeShop, name: 'Café stool',     category: 'coffee', scale: 0.7,  nodeNames: ['Stool Base', 'Stool top'] },
  // Counter source is ~10 m wide → scale 0.25 lands ~2.5 m, fitting
  // the back-wall run between the side walls with room for the slab.
  coffeeCounter:     { id: 'coffeeCounter',     path: KENNEY_FURNITURE.coffeeShop, name: 'Café counter',   category: 'coffee', scale: 0.25, nodeName: 'Counter' },
  coffeeCounterSlab: { id: 'coffeeCounterSlab', path: KENNEY_FURNITURE.coffeeShop, name: 'Counter slab',   category: 'coffee', scale: 0.25, nodeName: 'CounterSlab_#1' },
  // Menu TV source is 1.6×2.9 m. scale 0.55 → 0.9×1.6, mounted high.
  coffeeMenuTV:      { id: 'coffeeMenuTV',      path: KENNEY_FURNITURE.coffeeShop, name: 'Menu board',     category: 'coffee', scale: 0.55, nodeName: 'Menu_TV#1', y: 2.2 },
  coffeeWallPainting:{ id: 'coffeeWallPainting',path: KENNEY_FURNITURE.coffeeShop, name: 'Wall art',       category: 'coffee', scale: 0.4,  nodeName: 'Wall_Painting#1', y: 2.0 },
  // Ceiling fixture is a 29 m beast — scale 0.06 → ~1.7 m, a single
  // pendant cluster. Lift to ceiling and let it hang.
  coffeeCeilingLight:{ id: 'coffeeCeilingLight',path: KENNEY_FURNITURE.coffeeShop, name: 'Ceiling lights', category: 'coffee', scale: 0.06, nodeName: 'Ceiling light',   y: WALL_H - 0.3 },
  coffeeDecoLight:   { id: 'coffeeDecoLight',   path: KENNEY_FURNITURE.coffeeShop, name: 'Pendant light',  category: 'coffee', scale: 1.4,  nodeName: 'Deco_Light#1',    y: 2.6 },
  coffeePC:          { id: 'coffeePC',          path: KENNEY_FURNITURE.coffeeShop, name: 'Register PC',    category: 'coffee', scale: 0.6,  nodeName: 'PC_#1' },
  coffeeCup:         { id: 'coffeeCup',         path: KENNEY_FURNITURE.coffeeShop, name: 'Coffee cup',     category: 'coffee', scale: 1.4,  nodeName: 'cup' },
};

export const ALL_FURNITURE_IDS = Object.keys(FURNITURE_CATALOG) as FurnitureId[];

export const FURNITURE_CATEGORIES: Array<{ id: FurnitureCategory; label: string }> = [
  { id: 'seating',     label: 'Seating' },
  { id: 'tables',      label: 'Tables' },
  { id: 'storage',     label: 'Shelves' },
  { id: 'kitchen',     label: 'Counter' },
  { id: 'decor',       label: 'Decor' },
  { id: 'wall',        label: 'Wall art' },
  { id: 'supermarket', label: 'Market' },
  { id: 'factory',     label: 'Factory' },
  { id: 'arcade',      label: 'Arcade' },
  { id: 'restaurant',  label: 'Restaurant' },
  { id: 'gym',         label: 'Gym' },
  { id: 'coffee',      label: 'Café' },
];

// Wall-art constants — frames are flush against the back wall at a
// nice eye-level height. The drag handler clamps wall items to this z
// position so they always slide along the wall instead of being
// dropped on the floor.
export const WALL_FRAME_HEIGHT = 1.6;
export const WALL_FRAME_DEPTH = -ROOM_D / 2 + 0.06;
export const WALL_FRAME_WIDTH = 1.4;
export const WALL_FRAME_TALL = 1.0;
export const WALL_BOUNDS = {
  minX: -ROOM_W / 2 + WALL_FRAME_WIDTH / 2 + 0.2,
  maxX:  ROOM_W / 2 - WALL_FRAME_WIDTH / 2 - 0.2,
};

export function isWallItem(type: FurnitureId): boolean {
  return FURNITURE_CATALOG[type]?.mount === 'wall';
}

// ── Wall + floor palettes ──────────────────────────────────────────────
export interface WallColorOption {
  id: string;
  name: string;
  hex: string;
}

export const WALL_COLORS: WallColorOption[] = [
  { id: 'cream',     name: 'Soft cream',    hex: '#f0ece8' },
  { id: 'white',     name: 'Gallery white', hex: '#f5f1ea' },
  { id: 'blush',     name: 'Cherry blush',  hex: '#f9c8d9' },
  { id: 'mint',      name: 'Mint leaf',     hex: '#d9f5e5' },
  { id: 'sky',       name: 'Sky dream',     hex: '#d9ecff' },
  { id: 'lavender',  name: 'Lavender',      hex: '#efe0ff' },
  { id: 'sunset',    name: 'Sunset wash',   hex: '#fbb775' },
  { id: 'charcoal',  name: 'Charcoal',      hex: '#3b4658' },
];

export type FloorStyle = 'wood' | 'marble' | 'tileBlue' | 'concrete' | 'parquet' | 'galaxy';

export interface FloorStyleOption {
  id: FloorStyle;
  name: string;
  /** Approximate dominant colour — used for the picker preview tile. */
  swatch: string;
}

export const FLOOR_STYLES: FloorStyleOption[] = [
  { id: 'wood',     name: 'Oak planks',   swatch: '#b9844c' },
  { id: 'parquet',  name: 'Dark walnut',  swatch: '#5c3a1e' },
  { id: 'marble',   name: 'White marble', swatch: '#e8e5e0' },
  { id: 'tileBlue', name: 'Blue tile',    swatch: '#60a5fa' },
  { id: 'concrete', name: 'Modern grey',  swatch: '#9ca3af' },
  { id: 'galaxy',   name: 'Galaxy',       swatch: '#1e1b4b' },
];

// ── Layout type ────────────────────────────────────────────────────────

export interface IsoInteriorItem {
  /** Unique within a layout so the renderer can key on it stably. */
  uid: string;
  /** Which furniture catalog entry to instantiate. */
  type: FurnitureId;
  /** World X (−5.4 … +5.4). */
  x: number;
  /** World Z (−4.4 … +4.4). Negative = back wall. */
  z: number;
  /** Rotation in quarter-turns: 0 / 1 / 2 / 3 (multiplied by 90°). */
  rot: 0 | 1 | 2 | 3;
}

export interface IsoInteriorLayout {
  version: 1;
  wallColorId: string;
  floorStyle: FloorStyle;
  items: IsoInteriorItem[];
  /** Floor-area multiplier (default 1.0). The factory preset uses 1.55 so
   *  the big industrial machines have room to spread — the floor mesh and
   *  the placement bounds both grow by this factor, while the walls are
   *  pushed outward to match. Other room geometry (camera bounds, ceiling
   *  height) stays the same so the iso framing still works. */
  floorScale?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

let uidCounter = 0;
export function makeUid(): string {
  uidCounter += 1;
  return `i${Date.now().toString(36)}${uidCounter}`;
}

export function clampToFloor(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(FLOOR_BOUNDS.minX, Math.min(FLOOR_BOUNDS.maxX, x)),
    z: Math.max(FLOOR_BOUNDS.minZ, Math.min(FLOOR_BOUNDS.maxZ, z)),
  };
}

/** Resolve the effective floor bounds for a layout — base bounds for
 *  most presets, scaled outward when `floorScale > 1` (factory). The
 *  0.6 wall-margin is preserved at the scaled edge so items still don't
 *  clip the walls. */
export function getFloorBounds(layout: IsoInteriorLayout) {
  const s = layout.floorScale && layout.floorScale > 0 ? layout.floorScale : 1;
  const halfW = (ROOM_W * s) / 2 - 0.6;
  const halfD = (ROOM_D * s) / 2 - 0.6;
  return { minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD };
}

/**
 * Default layout — mirrors the original hardcoded `IsoShopInterior` so
 * existing players see no change until they actually decorate. New
 * accounts start here too.
 */
export function makeDefaultLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    // Doormat
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // Service counter (5 bar segments behind the seating area)
    { uid: makeUid(), type: 'kitchenBarEnd', x: -2.6, z: -3, rot: 2 },
    { uid: makeUid(), type: 'kitchenBar',    x: -1.3, z: -3, rot: 0 },
    { uid: makeUid(), type: 'kitchenBar',    x:  0,   z: -3, rot: 0 },
    { uid: makeUid(), type: 'kitchenBar',    x:  1.3, z: -3, rot: 0 },
    { uid: makeUid(), type: 'kitchenBarEnd', x:  2.6, z: -3, rot: 0 },

    // Kitchen appliances behind counter
    { uid: makeUid(), type: 'kitchenFridge',        x: -4.2, z: -4, rot: 0 },
    { uid: makeUid(), type: 'kitchenCoffeeMachine', x: -1,   z: -3.5, rot: 0 },
    { uid: makeUid(), type: 'kitchenMicrowave',     x:  1,   z: -3.5, rot: 0 },
    { uid: makeUid(), type: 'kitchenStove',         x:  4.2, z: -4,   rot: 0 },

    // Side-wall shelving
    { uid: makeUid(), type: 'bookcaseOpen',    x: -ROOM_W / 2 + 0.5, z: -0.8, rot: 1 },
    { uid: makeUid(), type: 'bookcaseOpenLow', x: -ROOM_W / 2 + 0.5, z:  1.2, rot: 1 },
    { uid: makeUid(), type: 'bookcaseOpen',    x:  ROOM_W / 2 - 0.5, z: -0.8, rot: 3 },
    { uid: makeUid(), type: 'bookcaseOpenLow', x:  ROOM_W / 2 - 0.5, z:  1.2, rot: 3 },

    // Coffee-table clusters with chairs
    { uid: makeUid(), type: 'tableCoffee',  x: -2.5, z: 1.2, rot: 0 },
    { uid: makeUid(), type: 'chairCushion', x: -3.6, z: 1.2, rot: 1 },
    { uid: makeUid(), type: 'chairCushion', x: -1.4, z: 1.2, rot: 3 },
    { uid: makeUid(), type: 'tableCoffee',  x:  2.5, z: 1.2, rot: 0 },
    { uid: makeUid(), type: 'chairCushion', x:  1.4, z: 1.2, rot: 1 },
    { uid: makeUid(), type: 'chairCushion', x:  3.6, z: 1.2, rot: 3 },

    // Corner plants
    { uid: makeUid(), type: 'pottedPlant', x: -ROOM_W / 2 + 0.6, z: -ROOM_D / 2 + 0.6, rot: 0 },
    { uid: makeUid(), type: 'pottedPlant', x:  ROOM_W / 2 - 0.6, z: -ROOM_D / 2 + 0.6, rot: 0 },
    { uid: makeUid(), type: 'plantSmall1', x: -ROOM_W / 2 + 0.6, z:  ROOM_D / 2 - 0.6, rot: 0 },
    { uid: makeUid(), type: 'plantSmall2', x:  ROOM_W / 2 - 0.6, z:  ROOM_D / 2 - 0.6, rot: 0 },

    // Ceiling lamps
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z: 1.2, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0,   z: 1.2, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z: 1.2, rot: 0 },
  ];

  return {
    version: 1,
    wallColorId: 'cream',
    floorStyle: 'wood',
    items,
  };
}

/**
 * Supermarket preset — a full grocery-store layout using the new pack.
 *
 *   • Back wall: a long shelf-bags + shelf-boxes run with end-caps,
 *     mimicking the dry-goods aisle.
 *   • Two parallel mid-room aisles: bag shelves on one side, box shelves
 *     on the other so customers can walk between them.
 *   • Right-front: tall + chest freezers (the frozen aisle).
 *   • Left-front: produce — bread + fruit displays.
 *   • Front-right: cash register at checkout + bottle return next to it.
 *   • A shopping cart + basket parked near the door so it reads "grocery".
 *   • Bright tile-blue floor, gallery-white walls — feels like an IRL
 *     supermarket. Floor radii (set in FURNITURE_FOOTPRINT) keep NPCs
 *     walking the aisles, not through the shelves.
 *
 *  NOTE: the back wall sits at z = −ROOM_D/2 = −5; the front (door) at
 *  z = +5. Items facing the customer have rot = 0 (face +Z). Aisles
 *  rotated to face the player's path are rot = 1 or 3.
 */
export function makeSupermarketLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    // ── Doormat ──
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // ── Checkout zone (front-right) ──
    { uid: makeUid(), type: 'superCashRegister', x:  3.2, z:  2.8, rot: 2 },
    { uid: makeUid(), type: 'superBottleReturn', x:  4.5, z:  2.8, rot: 2 },

    // ── Shopping vehicles parked by the door ──
    { uid: makeUid(), type: 'superShoppingCart',   x: -3.8, z:  3.6, rot: 0 },
    { uid: makeUid(), type: 'superShoppingBasket', x: -4.7, z:  3.6, rot: 0 },

    // ── Back wall: dry-goods aisle ──
    { uid: makeUid(), type: 'superShelfEnd',   x: -4.8, z: -4.2, rot: 1 },
    { uid: makeUid(), type: 'superShelfBoxes', x: -3.3, z: -4.2, rot: 0 },
    { uid: makeUid(), type: 'superShelfBags',  x: -1.0, z: -4.2, rot: 0 },
    { uid: makeUid(), type: 'superShelfBoxes', x:  1.3, z: -4.2, rot: 0 },
    { uid: makeUid(), type: 'superShelfBags',  x:  3.6, z: -4.2, rot: 0 },
    { uid: makeUid(), type: 'superShelfEnd',   x:  4.8, z: -4.2, rot: 3 },

    // ── Mid-room aisle A (left): bags ──
    { uid: makeUid(), type: 'superShelfBags',  x: -2.2, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'superShelfBags',  x:  0.3, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'superShelfBags',  x:  2.8, z: -1.5, rot: 0 },

    // ── Produce row (left-front): bread + fruit ──
    { uid: makeUid(), type: 'superDisplayFruit', x: -4.2, z:  0.4, rot: 0 },
    { uid: makeUid(), type: 'superDisplayBread', x: -4.2, z:  2.2, rot: 0 },

    // ── Frozen aisle (right) ──
    { uid: makeUid(), type: 'superFreezersStanding', x:  4.6, z:  0.4, rot: 3 },
    { uid: makeUid(), type: 'superFreezer',          x:  4.6, z: -1.4, rot: 3 },

    // ── Structural column near middle (a real supermarket touch) ──
    { uid: makeUid(), type: 'superColumn', x:  0,   z:  1.4, rot: 0 },

    // ── Decor + ambience ──
    { uid: makeUid(), type: 'plantSmall1', x: -4.9, z: -2.8, rot: 0 },
    { uid: makeUid(), type: 'plantSmall2', x:  4.9, z:  2.8, rot: 0 },

    // ── Ceiling lamps along the aisle ──
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0,   z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z:  2.0, rot: 0 },
  ];

  return {
    version: 1,
    wallColorId: 'white',
    floorStyle: 'tileBlue',
    items,
  };
}

/**
 * Factory preset — uses the new industrial pack. The base floor is
 * SCALED UP (floorScale 1.55) because factory items are big — the user
 * asked for a roomier base specifically so machines, conveyors, and
 * cranes have breathing room. A double conveyor line runs through the
 * middle, robot arms work either side, hoppers + machines line the
 * back wall, crates stack in the front corner, signage + screens above.
 */
export function makeFactoryLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    // ── Two parallel conveyor lines down the middle ──
    { uid: makeUid(), type: 'factConveyorStripe', x: -4.2, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'factConveyorStripe', x: -2.6, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'factConveyorCross',  x: -1.0, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'factConveyorStripe', x:  0.6, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'factConveyorStripe', x:  2.2, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'factConveyorCorner', x:  3.8, z: -0.6, rot: 1 },

    { uid: makeUid(), type: 'factConveyorLong',   x: -4.2, z:  1.0, rot: 1 },
    { uid: makeUid(), type: 'factConveyorLong',   x: -2.6, z:  1.0, rot: 1 },
    { uid: makeUid(), type: 'factConveyorLong',   x: -1.0, z:  1.0, rot: 1 },
    { uid: makeUid(), type: 'factConveyorLong',   x:  0.6, z:  1.0, rot: 1 },
    { uid: makeUid(), type: 'factConveyorLong',   x:  2.2, z:  1.0, rot: 1 },

    // ── Back-wall machinery line ──
    { uid: makeUid(), type: 'factMachineFortified', x: -5.8, z: -5.2, rot: 0 },
    { uid: makeUid(), type: 'factMachine',          x: -3.5, z: -5.4, rot: 0 },
    { uid: makeUid(), type: 'factHopperHighRound',  x: -1.6, z: -5.6, rot: 0 },
    { uid: makeUid(), type: 'factHopperSquare',     x:  0.2, z: -5.5, rot: 0 },
    { uid: makeUid(), type: 'factMachine',          x:  2.2, z: -5.4, rot: 0 },
    { uid: makeUid(), type: 'factMachineFortified', x:  4.6, z: -5.2, rot: 0 },

    // ── Robot arms working the conveyor ──
    { uid: makeUid(), type: 'factRobotArmA', x: -3.4, z: -2.2, rot: 2 },
    { uid: makeUid(), type: 'factRobotArmB', x:  1.4, z: -2.2, rot: 2 },
    { uid: makeUid(), type: 'factRobotArmA', x: -2.0, z:  2.6, rot: 0 },
    { uid: makeUid(), type: 'factRobotArmB', x:  2.4, z:  2.6, rot: 0 },

    // ── Cranes anchor the far back corners ──
    { uid: makeUid(), type: 'factCraneMagnet', x: -7.2, z: -3.2, rot: 1 },
    { uid: makeUid(), type: 'factCrane',       x:  6.8, z: -3.2, rot: 3 },

    // ── Quality scanners ──
    { uid: makeUid(), type: 'factScannerHigh', x:  4.8, z:  0.2, rot: 1 },
    { uid: makeUid(), type: 'factScannerLow',  x: -5.2, z:  0.2, rot: 3 },

    // ── Crate stacks in the front corners ──
    { uid: makeUid(), type: 'factBoxLarge', x: -6.6, z:  4.8, rot: 0 },
    { uid: makeUid(), type: 'factBoxWide',  x: -5.4, z:  5.2, rot: 0 },
    { uid: makeUid(), type: 'factBoxLong',  x: -7.1, z:  3.4, rot: 0 },
    { uid: makeUid(), type: 'factBoxLarge', x:  6.6, z:  4.8, rot: 0 },
    { uid: makeUid(), type: 'factBoxSmall', x:  7.4, z:  5.4, rot: 0 },
    { uid: makeUid(), type: 'factBoxWide',  x:  5.4, z:  5.2, rot: 0 },

    // ── Pipework + warning signage ──
    { uid: makeUid(), type: 'factPipeLarge', x: -8.0, z: -1.4, rot: 1 },
    { uid: makeUid(), type: 'factPipeBend',  x: -8.0, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'factWarningOrange', x:  0.0, z:  5.1, rot: 0 },
    { uid: makeUid(), type: 'factCogB',           x: -0.4, z:  3.4, rot: 0 },

    // ── Overhead status screens ──
    { uid: makeUid(), type: 'factScreenHangingWide', x:  0.0, z: -7.0, rot: 0 },
    { uid: makeUid(), type: 'factScreenFlat',        x: -3.0, z: -6.8, rot: 0 },
    { uid: makeUid(), type: 'factScreenFlat',        x:  3.0, z: -6.8, rot: 0 },

    // ── Ceiling lamps across the bigger floor ──
    { uid: makeUid(), type: 'lampSquareCeiling', x: -4.0, z: -1.6, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0.0, z: -1.6, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  4.0, z: -1.6, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x: -4.0, z:  2.4, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0.0, z:  2.4, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  4.0, z:  2.4, rot: 0 },
  ];

  return {
    version: 1,
    wallColorId: 'charcoal',
    floorStyle: 'concrete',
    items,
    floorScale: 1.55,
  };
}

/**
 * Themepark / arcade preset — uses the Mini-Arcade pack. Arcade cabinets
 * line both walls, big-floor games (air hockey, dance, basketball) take
 * the middle, ticket counter + prize wheel + claw machine cluster near
 * the front (where the kid will see them on arrival).
 */
export function makeArcadeLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // ── Counter / prize area — front-right ──
    { uid: makeUid(), type: 'arcadeCashRegister',   x:  3.3, z:  3.0, rot: 2 },
    { uid: makeUid(), type: 'arcadeTicketMachine',  x:  4.6, z:  3.0, rot: 2 },
    { uid: makeUid(), type: 'arcadePrizes',         x:  4.6, z:  1.6, rot: 3 },
    { uid: makeUid(), type: 'arcadePrizeWheel',     x:  4.6, z:  0.0, rot: 3 },

    // ── Claw machine on the front-left ──
    { uid: makeUid(), type: 'arcadeClawMachine',  x: -4.5, z:  3.2, rot: 0 },
    { uid: makeUid(), type: 'arcadeVending',      x: -4.5, z:  1.8, rot: 1 },

    // ── Cabinet wall — left side ──
    { uid: makeUid(), type: 'arcadeMachine',         x: -5.0, z: -0.6, rot: 1 },
    { uid: makeUid(), type: 'arcadeMachine',         x: -5.0, z: -1.9, rot: 1 },
    { uid: makeUid(), type: 'arcadeMachine',         x: -5.0, z: -3.2, rot: 1 },
    { uid: makeUid(), type: 'arcadeGamblingMachine', x: -5.0, z: -4.4, rot: 1 },

    // ── Cabinet wall — right side (extra arcade cabinets) ──
    { uid: makeUid(), type: 'arcadeMachine',  x:  5.0, z: -1.9, rot: 3 },
    { uid: makeUid(), type: 'arcadeMachine',  x:  5.0, z: -3.2, rot: 3 },
    { uid: makeUid(), type: 'arcadePinball',  x:  5.0, z: -4.4, rot: 3 },

    // ── Big floor games — middle ──
    { uid: makeUid(), type: 'arcadeAirHockey',    x: -1.5, z: -2.0, rot: 0 },
    { uid: makeUid(), type: 'arcadeBasketball',   x:  1.8, z: -3.4, rot: 0 },
    { uid: makeUid(), type: 'arcadeDanceMachine', x:  1.8, z: -0.6, rot: 0 },

    // ── Columns + ceiling lights ──
    { uid: makeUid(), type: 'arcadeColumn', x: -2.5, z:  3.8, rot: 0 },
    { uid: makeUid(), type: 'arcadeColumn', x:  2.5, z:  3.8, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0.0, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z: -1.5, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z:  1.8, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z:  1.8, rot: 0 },
  ];
  return { version: 1, wallColorId: 'charcoal', floorStyle: 'galaxy', items };
}

/**
 * Restaurant preset — uses the asian-themed Restaurant pack (.gltf
 * decoration set) mixed with Kenney tables/chairs. Sakura trees in the
 * back corners, paintings + lanterns along the walls, a bell at the
 * entry, a pond, three dining tables out front.
 */
export function makeRestaurantLayout(): IsoInteriorLayout {
  // Bumped to 1.3× floor — restaurant decor (sakura trees, paintings,
  // lanterns) breathes better on a slightly larger floor without making
  // the camera feel zoomed out. The scaled floor goes from ±7.8 × ±6.5,
  // safe placement bounds are ±7.2 × ±5.9 (0.6 m wall margin).
  //
  // Layout zones (back → front):
  //    z -5.6 …      sakura trees in back corners, paintings on wall
  //    z -4.6 …      sushi counter (5 segments, centred)
  //    z -3.0 …      sakura branches flanking
  //    z -1.4 …      fish pond on the left
  //    z  0.0 …      bamboo + plants either side
  //    z  1.4 …      3 dining tables with chairs + hanging lanterns
  //    z  3.6 …      entry carpet + side ornaments (bell, lantern post)
  const items: IsoInteriorItem[] = [
    // ── Sushi counter — 5 segments at the back ──
    { uid: makeUid(), type: 'kitchenBarEnd', x: -2.6, z: -4.6, rot: 2 },
    { uid: makeUid(), type: 'kitchenBar',    x: -1.3, z: -4.6, rot: 0 },
    { uid: makeUid(), type: 'kitchenBar',    x:  0.0, z: -4.6, rot: 0 },
    { uid: makeUid(), type: 'kitchenBar',    x:  1.3, z: -4.6, rot: 0 },
    { uid: makeUid(), type: 'kitchenBarEnd', x:  2.6, z: -4.6, rot: 0 },

    // ── Sakura trees — back corners, well inside the room ──
    { uid: makeUid(), type: 'restSakuraTree', x: -6.0, z: -5.4, rot: 0 },
    { uid: makeUid(), type: 'restSakuraTree', x:  6.0, z: -5.4, rot: 0 },

    // ── Back-wall paintings + wall lanterns over the counter ──
    { uid: makeUid(), type: 'restPainting',  x:  0.0, z: -5.8, rot: 0 },
    { uid: makeUid(), type: 'restWallLight', x: -3.4, z: -5.8, rot: 0 },
    { uid: makeUid(), type: 'restWallLight', x:  3.4, z: -5.8, rot: 0 },

    // ── Fish pond on the left, bamboo on the right (pulled inward
    //    from the floor edge so the basin sits fully on the planks) ──
    { uid: makeUid(), type: 'restFish',   x: -5.8, z: -2.0, rot: 0 },
    { uid: makeUid(), type: 'restBamboo', x:  6.2, z: -2.0, rot: 0 },

    // ── Plants flanking the dining area ──
    { uid: makeUid(), type: 'restPlant1', x: -6.6, z:  0.4, rot: 0 },
    { uid: makeUid(), type: 'restPlant2', x:  6.6, z:  0.4, rot: 0 },

    // ── 3 dining tables with chairs ──
    { uid: makeUid(), type: 'table',         x: -3.6, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'chairRounded',  x: -4.7, z:  1.4, rot: 1 },
    { uid: makeUid(), type: 'chairRounded',  x: -2.5, z:  1.4, rot: 3 },

    { uid: makeUid(), type: 'table',         x:  0.0, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'chairRounded',  x: -1.1, z:  1.4, rot: 1 },
    { uid: makeUid(), type: 'chairRounded',  x:  1.1, z:  1.4, rot: 3 },

    { uid: makeUid(), type: 'table',         x:  3.6, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'chairRounded',  x:  2.5, z:  1.4, rot: 1 },
    { uid: makeUid(), type: 'chairRounded',  x:  4.7, z:  1.4, rot: 3 },

    // ── Hanging lanterns over each table ──
    { uid: makeUid(), type: 'restLight', x: -3.6, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'restLight', x:  0.0, z:  1.4, rot: 0 },
    { uid: makeUid(), type: 'restLight', x:  3.6, z:  1.4, rot: 0 },

    // ── Entry zone — carpet centred at the door, ornaments INSIDE the
    //    room (not at the edge). The temple bell sits on the floor on
    //    the left, the hanging banner (Sign 3) hangs above the right
    //    side near the side wall — its catalog y = 2.2 lifts it to
    //    ceiling height so the body dangles down toward eye level.
    { uid: makeUid(), type: 'restCarpet', x:  0.0, z:  4.4, rot: 0 },
    { uid: makeUid(), type: 'restBell',   x: -5.4, z:  3.6, rot: 0 },
    { uid: makeUid(), type: 'restSign3',  x:  5.4, z:  3.6, rot: 0 },

    // ── Ceiling lamps for general lighting (overhead, walkable) ──
    { uid: makeUid(), type: 'lampSquareCeiling', x: -3.6, z: -2.6, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0.0, z: -2.6, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  3.6, z: -2.6, rot: 0 },
  ];
  return { version: 1, wallColorId: 'blush', floorStyle: 'parquet', items, floorScale: 1.3 };
}

/**
 * Fashion retail preset — bookcase rows used as display racks, central
 * mannequin-island (cabinetTelevision repurposed), checkout desk near
 * the door, plants for warmth. Uses the existing Kenney furniture
 * set — when a dedicated fashion pack ships we'll swap the racks for
 * proper clothing rails.
 */
export function makeFashionLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // ── Display rack rows (back) ──
    { uid: makeUid(), type: 'bookcaseClosedDoors', x: -3.8, z: -3.8, rot: 0 },
    { uid: makeUid(), type: 'bookcaseClosedDoors', x: -1.3, z: -3.8, rot: 0 },
    { uid: makeUid(), type: 'bookcaseClosedDoors', x:  1.3, z: -3.8, rot: 0 },
    { uid: makeUid(), type: 'bookcaseClosedDoors', x:  3.8, z: -3.8, rot: 0 },

    // ── Open displays — side walls ──
    { uid: makeUid(), type: 'bookcaseOpen',    x: -5.1, z: -1.2, rot: 1 },
    { uid: makeUid(), type: 'bookcaseOpenLow', x: -5.1, z:  1.0, rot: 1 },
    { uid: makeUid(), type: 'bookcaseOpen',    x:  5.1, z: -1.2, rot: 3 },
    { uid: makeUid(), type: 'bookcaseOpenLow', x:  5.1, z:  1.0, rot: 3 },

    // ── Central display island (stand-in for mannequin/clothing rack) ──
    { uid: makeUid(), type: 'cabinetTelevision', x: -1.5, z: -1.0, rot: 0 },
    { uid: makeUid(), type: 'cabinetTelevision', x:  1.5, z: -1.0, rot: 0 },

    // ── Tables for accessories ──
    { uid: makeUid(), type: 'tableCloth', x: -3.0, z:  1.5, rot: 0 },
    { uid: makeUid(), type: 'tableCloth', x:  3.0, z:  1.5, rot: 0 },

    // ── Checkout desk near the door ──
    { uid: makeUid(), type: 'desk',      x: -3.0, z:  3.2, rot: 0 },
    { uid: makeUid(), type: 'chairDesk', x: -3.0, z:  3.8, rot: 0 },

    // ── Wall art frames ──
    { uid: makeUid(), type: 'frameRose',    x: -2.4, z: WALL_FRAME_DEPTH, rot: 0 },
    { uid: makeUid(), type: 'frameViolet',  x:  0.0, z: WALL_FRAME_DEPTH, rot: 0 },
    { uid: makeUid(), type: 'frameAmber',   x:  2.4, z: WALL_FRAME_DEPTH, rot: 0 },

    // ── Plants + lamps ──
    { uid: makeUid(), type: 'pottedPlant', x: -5.1, z:  3.3, rot: 0 },
    { uid: makeUid(), type: 'pottedPlant', x:  5.1, z:  3.3, rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x: -2.5, z:  0,   rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  0,   z:  0,   rot: 0 },
    { uid: makeUid(), type: 'lampSquareCeiling', x:  2.5, z:  0,   rot: 0 },
  ];
  return { version: 1, wallColorId: 'lavender', floorStyle: 'marble', items };
}

/**
 * Gym preset — uses individual pieces extracted by sub-node name from
 * the modular_gym.glb mega-mesh. Same 53 MB .glb downloads once, then
 * each FurnitureMeta with a `nodeName` extracts that piece. Kids can
 * drag/rotate/delete each treadmill, bike, bench, etc. independently
 * — same UX as the supermarket / restaurant packs.
 *
 * Layout (back → front, standard 12×10 room — NO floorScale):
 *    z -3.6       wall TV mounted on back wall, weight rack, weight bar
 *    z -2.0       leg machine + bench in a row
 *    z  0         2 treadmills facing the back wall
 *    z  1.8       2 indoor bikes facing the back wall
 *    z  3.2       yoga mats + ball on the front area
 *
 * Gym-only — no doormat, no ceiling lamps, no Kenney furniture. Walls
 * stay gallery white, floor stays marble for the fitness-studio vibe.
 */
export function makeGymLayout(): IsoInteriorLayout {
  // Layout tuned to the user's reference screenshot:
  //   • Charcoal walls + blue-tile floor — sporty, modern gym vibe.
  //   • Wall TV mounted ON THE BACK WALL, right of centre.
  //   • Two treadmills clustered in the back-centre area, facing back
  //     (so a runner would look at the TV).
  //   • Flat bench off to the left of the treadmills.
  //   • Weight rack hugs the left wall, weight scale in front of it.
  //   • Two indoor bikes in the centre-front, facing the back wall.
  //   • Leg machine pushed up to the right wall, facing left.
  //   • Yoga mat at the front, just inside the door.
  //   • Barbell + ball as smaller accents tucked in spare spaces.
  //
  // Standard 12×10 room. Bounds: x ∈ ±5.4, z ∈ ±4.4.
  const items: IsoInteriorItem[] = [
    // Doormat at the door
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // ── Back wall: TV mounted right of centre ──
    { uid: makeUid(), type: 'gymTV',         x:  3.5, z: -4.7, rot: 0 },

    // ── Back-centre cardio cluster: 2 treadmills + bench ──
    //   Treadmills point INTO the back wall (rot 0) so the runner
    //   faces the TV.
    { uid: makeUid(), type: 'gymTreadmill',  x:  1.6, z: -2.5, rot: 0 },
    { uid: makeUid(), type: 'gymTreadmill2', x: -0.4, z: -2.5, rot: 0 },
    { uid: makeUid(), type: 'gymBench',      x: -2.6, z: -2.9, rot: 1 },

    // ── Left wall: weight rack + barbell behind it + scale in front ──
    { uid: makeUid(), type: 'gymWeightRack', x: -4.6, z: -0.5, rot: 1 },
    { uid: makeUid(), type: 'gymWeightBar',  x: -4.6, z: -3.0, rot: 1 },
    { uid: makeUid(), type: 'gymScale',      x: -3.4, z:  0.6, rot: 0 },

    // ── Centre-front: 2 indoor bikes facing the back wall ──
    { uid: makeUid(), type: 'gymBike',       x:  1.0, z:  1.2, rot: 0 },
    { uid: makeUid(), type: 'gymBike2',      x: -0.8, z:  1.8, rot: 0 },

    // ── Right wall: leg machine facing left (toward the bikes) ──
    { uid: makeUid(), type: 'gymLegMachine', x:  4.3, z:  0.4, rot: 3 },

    // ── Front zone: yoga mat at the door + ball as accent ──
    { uid: makeUid(), type: 'gymMat',        x:  0.0, z:  3.4, rot: 0 },
    { uid: makeUid(), type: 'gymMat2',       x: -3.6, z:  3.4, rot: 0 },
    { uid: makeUid(), type: 'gymBall',       x: -3.8, z:  2.2, rot: 0 },
  ];
  return {
    version: 1,
    wallColorId: 'charcoal',
    floorStyle: 'tileBlue',
    items,
  };
}

/**
 * Coffee-shop preset — uses sub-nodes extracted from the converted
 * coffee.glb (a 92 MB FBX shrunk to ~1.9 MB by keeping only furniture
 * nodes). One counter run along the back with the menu boards mounted
 * above, four café tables with stool pairs in the seating area, soft
 * pendant lights and wall art. Standard 12×10 room — no floorScale.
 */
export function makeCoffeeShopLayout(): IsoInteriorLayout {
  const items: IsoInteriorItem[] = [
    // Doormat at the door
    { uid: makeUid(), type: 'rugDoormat', x: 0, z: ROOM_D / 2 - 1.2, rot: 0 },

    // ── Service counter — counter + slab side-by-side on back wall ──
    //   Counter source is ~10 m wide so at scale 0.25 each piece is
    //   ~2.5 m; the two adjacent pieces fill the back-wall service area.
    { uid: makeUid(), type: 'coffeeCounter',     x: -1.5, z: -3.8, rot: 0 },
    { uid: makeUid(), type: 'coffeeCounterSlab', x:  1.5, z: -3.8, rot: 0 },
    { uid: makeUid(), type: 'coffeePC',          x: -3.5, z: -3.9, rot: 0 },
    { uid: makeUid(), type: 'coffeeCup',         x:  0.0, z: -3.4, rot: 0 },

    // ── Menu boards mounted above the counter ────────────────────────
    { uid: makeUid(), type: 'coffeeMenuTV',      x:  0.0, z: -4.8, rot: 0 },
    { uid: makeUid(), type: 'coffeeMenuTV',      x:  2.5, z: -4.8, rot: 0 },

    // ── Wall art on the side walls (back corners) ────────────────────
    { uid: makeUid(), type: 'coffeeWallPainting', x: -4.5, z: -4.8, rot: 0 },
    { uid: makeUid(), type: 'coffeeWallPainting', x:  4.5, z: -4.8, rot: 0 },

    // ── Overhead pendant lights along the seating area ───────────────
    { uid: makeUid(), type: 'coffeeDecoLight',    x: -2.5, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeDecoLight',    x:  2.5, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeDecoLight',    x: -2.5, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'coffeeDecoLight',    x:  2.5, z:  2.0, rot: 0 },

    // ── Seating zone — 4 tables, each with 2 stools, in 2 rows ───────
    //   Table is ~1.8 m wide at scale 0.8; stool is ~0.5 m at scale 0.7.
    //   Stools sit ~1.4 m off the table centre so they don't clip into it.
    { uid: makeUid(), type: 'coffeeTable', x: -3.0, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x: -4.4, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x: -1.6, z: -0.6, rot: 0 },

    { uid: makeUid(), type: 'coffeeTable', x:  3.0, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x:  1.6, z: -0.6, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x:  4.4, z: -0.6, rot: 0 },

    { uid: makeUid(), type: 'coffeeTable', x: -3.0, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x: -4.4, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x: -1.6, z:  2.0, rot: 0 },

    { uid: makeUid(), type: 'coffeeTable', x:  3.0, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x:  1.6, z:  2.0, rot: 0 },
    { uid: makeUid(), type: 'coffeeStool', x:  4.4, z:  2.0, rot: 0 },

    // ── Potted plants by the door for warmth ─────────────────────────
    { uid: makeUid(), type: 'pottedPlant', x: -ROOM_W / 2 + 0.6, z:  ROOM_D / 2 - 0.6, rot: 0 },
    { uid: makeUid(), type: 'pottedPlant', x:  ROOM_W / 2 - 0.6, z:  ROOM_D / 2 - 0.6, rot: 0 },
  ];
  return {
    version: 1,
    wallColorId: 'cream',
    floorStyle: 'wood',
    items,
  };
}

/**
 * Preset directory — one ready-to-apply layout per passion_category.
 * The DecorateModule offers these as "Quick Presets" so a kid can fast-
 * forward to a themed shop without manually placing every piece.
 */
export const SHOP_TYPE_PRESETS: Record<string, () => IsoInteriorLayout> = {
  factory:     makeFactoryLayout,
  themepark:   makeArcadeLayout,
  fashion:     makeFashionLayout,
  gym:         makeGymLayout,
  restaurant:  makeRestaurantLayout,
  supermarket: makeSupermarketLayout,
};

/** Convenience: returns the preset factory for a passion_category id, or
 *  null when no themed preset exists yet. */
export function getPresetForCategory(category: string | null | undefined): (() => IsoInteriorLayout) | null {
  if (!category) return null;
  return SHOP_TYPE_PRESETS[category] ?? null;
}

/**
 * Heuristic: does this layout look like a supermarket? Used by the live
 * shop sim to decide whether to spin the customer dial up (busy market
 * vibe — more shoppers, faster spawns) without having to thread the
 * passion_category through every render. Triggers when the layout has
 * 3+ pieces from the supermarket pack.
 */
export function isSupermarketLayout(layout: IsoInteriorLayout): boolean {
  return dominantCategory(layout, 'supermarket', 3);
}

/** Same heuristic — generic over any themed-pack category. Returns true
 *  when the layout has `threshold` or more items belonging to `category`. */
export function dominantCategory(
  layout: IsoInteriorLayout,
  category: FurnitureCategory,
  threshold = 3,
): boolean {
  let count = 0;
  for (const it of layout.items) {
    if (FURNITURE_CATALOG[it.type]?.category === category) {
      count += 1;
      if (count >= threshold) return true;
    }
  }
  return false;
}

/** Detects which themed-pack layout we're looking at (factory / arcade /
 *  restaurant / supermarket) so the live sim can tailor NPC density and
 *  the mini-game can pick a themed product pool. Returns null when the
 *  layout uses mostly the generic Kenney furniture set. */
export function detectShopFlavor(layout: IsoInteriorLayout):
  'supermarket' | 'factory' | 'arcade' | 'restaurant' | 'gym' | 'coffee' | null {
  if (dominantCategory(layout, 'supermarket', 3)) return 'supermarket';
  if (dominantCategory(layout, 'factory', 4))     return 'factory';
  if (dominantCategory(layout, 'arcade', 3))      return 'arcade';
  if (dominantCategory(layout, 'restaurant', 4))  return 'restaurant';
  if (dominantCategory(layout, 'gym', 4))         return 'gym';
  if (dominantCategory(layout, 'coffee', 4))      return 'coffee';
  return null;
}

/**
 * Best-effort hydration from whatever is on `business.interior_config`.
 * Falls back to defaults whenever a field is missing or malformed so a
 * partial blob from an older release never crashes the renderer.
 */
export function hydrateLayout(blob: unknown): IsoInteriorLayout {
  const fallback = makeDefaultLayout();
  if (!blob || typeof blob !== 'object') return fallback;
  const raw = blob as Record<string, unknown>;
  const rawLayout = (raw.iso_layout ?? raw) as Record<string, unknown>;

  const validWallId = WALL_COLORS.some((c) => c.id === rawLayout.wallColorId)
    ? (rawLayout.wallColorId as string)
    : fallback.wallColorId;
  const validFloor = FLOOR_STYLES.some((f) => f.id === rawLayout.floorStyle)
    ? (rawLayout.floorStyle as FloorStyle)
    : fallback.floorStyle;
  // Preserve floor-scale (factory preset uses 1.55) so items placed
  // outside the base ±5.4 bounds don't get clamped back inwards.
  const rawScale = Number(rawLayout.floorScale);
  const floorScale = Number.isFinite(rawScale) && rawScale > 0 && rawScale <= 3 ? rawScale : undefined;
  const sx = floorScale ?? 1;
  const boundsX = (ROOM_W * sx) / 2 - 0.6;
  const boundsZ = (ROOM_D * sx) / 2 - 0.6;
  const rawItems = Array.isArray(rawLayout.items) ? rawLayout.items : null;
  const items: IsoInteriorItem[] = rawItems
    ? rawItems
        .map((it: any): IsoInteriorItem | null => {
          if (!it || typeof it !== 'object') return null;
          const type = it.type as FurnitureId;
          if (!FURNITURE_CATALOG[type]) return null;
          const x = Math.max(-boundsX, Math.min(boundsX, Number(it.x) || 0));
          const z = Math.max(-boundsZ, Math.min(boundsZ, Number(it.z) || 0));
          const rot = (((Number(it.rot) || 0) % 4) + 4) % 4;
          return {
            uid: typeof it.uid === 'string' ? it.uid : makeUid(),
            type,
            x,
            z,
            rot: rot as 0 | 1 | 2 | 3,
          };
        })
        .filter((x): x is IsoInteriorItem => x !== null)
    : fallback.items;

  return {
    version: 1,
    wallColorId: validWallId,
    floorStyle: validFloor,
    items,
    ...(floorScale !== undefined ? { floorScale } : {}),
  };
}

export function getWallHex(wallColorId: string): string {
  const found = WALL_COLORS.find((c) => c.id === wallColorId);
  return found ? found.hex : WALL_COLORS[0].hex;
}

// ── Collision footprints ────────────────────────────────────────────────
// Approximate floor radius (world units) each furniture type occupies, so
// walking characters treat them as solid obstacles instead of clipping
// through. Tuned by eye to roughly match the rendered GLB footprints at the
// default 1.4 scale. Items NOT listed here (flat / overhead / decorative —
// rug, wall frames, ceiling lamps, books) are intentionally absent and
// produce no obstacle.
// All floor furniture is solid — customers (and Wei) walk around it,
// never through it. Radii are tuned by eye to roughly match each GLB's
// visible footprint at the default 1.4 scale, with a small extra margin
// so a kid's brain reads "I bumped into the chair" not "I'm clipping".
// Items intentionally NOT listed are flat or overhead (rug, wall art,
// ceiling lamp) and produce no obstacle.
const FURNITURE_FOOTPRINT: Partial<Record<FurnitureId, number>> = {
  kitchenBar: 0.5,
  kitchenBarEnd: 0.5,
  kitchenFridge: 0.5,
  kitchenCoffeeMachine: 0.55,
  kitchenMicrowave: 0.55,
  kitchenStove: 0.5,
  desk: 0.5,
  deskCorner: 0.5,
  bookcaseOpen: 0.65,
  bookcaseOpenLow: 0.65,
  bookcaseClosed: 0.65,
  bookcaseClosedDoors: 0.65,
  cabinetTelevision: 0.5,
  chair: 0.5,
  chairCushion: 0.5,
  chairRounded: 0.5,
  chairDesk: 0.5,
  table: 0.5,
  tableCoffee: 0.5,
  tableCloth: 0.5,
  pottedPlant: 0.5,
  plantSmall1: 0.4,
  plantSmall2: 0.4,
  plantSmall3: 0.4,
  lampRoundTable: 0.35,
  // Small floor decorations — still solid so a customer can't walk
  // through a stack of books mid-floor.
  books: 0.35,

  // ── Supermarket pack — radii by approximate visible footprint ──
  superCashRegister:     0.55,
  superBottleReturn:     0.55,
  superDisplayBread:     0.7,
  superDisplayFruit:     0.7,
  superFreezer:          0.6,
  superFreezersStanding: 0.55,
  superShelfBags:        0.8,    // long shelves cover most of a row
  superShelfBoxes:       0.8,
  superShelfEnd:         0.4,    // smaller end-cap
  superShoppingBasket:   0.25,   // small enough to step around
  superShoppingCart:     0.4,
  superColumn:           0.4,

  // ── Factory pack — heavy industrial pieces. Footprints sized for the
  // SCALED-DOWN catalog values above (machines at ~0.95–1.15 of default
  // 1.4), so radii are tuned to what the player actually sees in-room.
  factMachine:           0.9,
  factMachineFortified:  1.05,
  factHopperRound:       0.85,
  factHopperSquare:      0.9,
  factHopperHighRound:   0.95,
  factConveyorLong:      0.85,
  factConveyorCorner:    0.85,
  factConveyorStripe:    0.85,
  factConveyorCross:     0.95,
  factRobotArmA:         0.8,
  factRobotArmB:         0.85,
  factCrane:             1.05,
  factCraneLift:         1.05,
  factCraneMagnet:       1.05,
  factBoxLarge:          0.55,
  factBoxLong:           0.65,
  factBoxSmall:          0.4,
  factBoxWide:           0.65,
  factScreenFlat:        0.45,
  factPipeLarge:         0.55,
  factPipeBend:          0.55,
  factScannerHigh:       0.7,
  factScannerLow:        0.6,
  factWarningOrange:     0.4,
  factCogA:              0.5,
  factCogB:              0.7,
  // factScreenHangingWide: NOT listed — it's a wall-mount overhead screen, walkable

  // ── Arcade pack — cabinets average ~0.5–0.7 m footprint.
  arcadeMachine:         0.55,
  arcadeAirHockey:       0.85,
  arcadeBasketball:      0.7,
  arcadeClawMachine:     0.6,
  arcadeDanceMachine:    0.85,
  arcadePinball:         0.65,
  arcadePrizeWheel:      0.65,
  arcadePrizes:          0.7,
  arcadeTicketMachine:   0.5,
  arcadeVending:         0.5,
  arcadeGamblingMachine: 0.55,
  arcadeCashRegister:    0.55,
  arcadeColumn:          0.4,

  // ── Restaurant pack — all scaled down to ~0.45-0.7 of default, so
  //    footprints get correspondingly tighter.
  restBamboo:        0.25,
  restBell:          0.3,
  // restCarpet:     — flat, walkable (intentionally absent)
  restFish:          0.4,
  // restLight:      — overhead lantern, walkable (absent)
  restPainting:      0.25,
  restPaintingSmall: 0.22,
  restPlant1:        0.3,
  restPlant2:        0.3,
  restSakuraFlower:  0.3,
  restSakuraTree:    0.55,   // canopy is wider than the trunk — give it room
  restSign:          0.25,
  restSign2:         0.25,
  restSign3:         0.3,
  // restWallLight:  — wall-mounted, walkable (absent)

  // ── Gym Environment — per-piece footprints so customers walk
  //    around treadmills + bikes + benches. TV is wall-mounted so it
  //    has no footprint. Mat / ball are walkable. Yoga mats sit flat.
  //    Tightened to match the new 0.35-scale equipment — values that
  //    were tuned for 0.55-scale would block paths customers can now
  //    physically walk through.
  gymTreadmill:   0.4,
  gymTreadmill2:  0.4,
  gymBike:        0.32,
  gymBike2:       0.32,
  gymBench:       0.38,
  gymLegMachine:  0.45,
  gymWeightRack:  0.42,
  gymWeightBar:   0.32,
  // gymMat / gymMat2 / gymBall / gymScale: walkable
  // gymTV: wall-mounted, walkable

  // ── Coffee Shop pack — café tables wider than stools because the
  //    composite mesh covers seats + table; stool is one footprint.
  coffeeTable:       0.85,
  coffeeStool:       0.32,
  coffeeCounter:     1.3,
  coffeeCounterSlab: 1.3,
  coffeePC:          0.3,
  // coffeeMenuTV / coffeeWallPainting / coffeeCeilingLight /
  // coffeeDecoLight / coffeeCup: walkable (overhead / wall / tiny prop)
};

/** A solid circular obstacle on the floor that characters must walk around. */
export interface InteriorObstacle {
  x: number;
  z: number;
  /** Collision radius in world units. */
  r: number;
  /** Optional identity tag — used by the shop sim to skip self-collision
   *  when a moving agent is itself an entry in the obstacle list. */
  id?: string;
}

/**
 * Build the obstacle list for a layout — one circle per solid furniture
 * piece. Wall-mounted, overhead and flat decorative items are skipped (they
 * don't block the floor). Consumed by the shop work simulation so Wei and
 * the customers can't pass through furniture.
 */
export function getInteriorObstacles(layout: IsoInteriorLayout): InteriorObstacle[] {
  const out: InteriorObstacle[] = [];
  for (const item of layout.items) {
    if (isWallItem(item.type)) continue;          // flat wall art / frames
    if (item.type === 'lampSquareCeiling') continue; // overhead
    const r = FURNITURE_FOOTPRINT[item.type];
    if (!r) continue;                              // rug, books, etc. — walkable
    out.push({ x: item.x, z: item.z, r });
  }
  return out;
}
