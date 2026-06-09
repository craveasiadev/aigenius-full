/**
 * Isometric scene engine — public exports.
 *
 * Clash-of-Clans-style: a pannable / zoomable iso map of the city. Tapping
 * a building opens an Enter/Move action menu; entering crossfades to a
 * scrollable interior view; moving relocates the building to a new tile.
 * No walking player — the camera is the only thing the user controls.
 *
 * Files:
 *   • cityMap.ts          — pure data: tile grid, shop list, NPC paths.
 *   • IsoScene.tsx        — top-level Canvas + state machine + dock + menu.
 *   • IsoCity.tsx         — instanced tile-grid renderer.
 *   • IsoShop.tsx         — one shop building, clickable, selectable, move-able.
 *   • IsoShopInterior.tsx — scrollable interior with furniture + NPCs.
 *   • IsoNPC.tsx          — ambient walking NPCs (waypoint loop).
 *   • ShopActionMenu.tsx  — Enter/Move popover anchored to a world point.
 *   • MobileDock.tsx      — bottom-of-screen module navigation.
 *   • usePanZoom.ts       — drag-to-pan + pinch/wheel-zoom for ortho camera.
 */
export { IsoScene } from './IsoScene';
export { IsoCity } from './IsoCity';
export { IsoShop } from './IsoShop';
export { IsoShopInterior } from './IsoShopInterior';
export { IsoNPC, IsoNPCSwarm } from './IsoNPC';
export { ShopActionMenu } from './ShopActionMenu';
export { MobileDock, DEFAULT_DOCK_ITEMS } from './MobileDock';
export { usePanZoom } from './usePanZoom';
export {
  TILE_SIZE,
  ROWS,
  COLS,
  PLAYER_SPAWN,
  SHOPS,
  NPC_PATHS,
  cellToWorld,
  worldToCell,
  tileAt,
  type TileType,
  type ShopDef,
} from './cityMap';
