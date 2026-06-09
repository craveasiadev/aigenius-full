import { useMemo } from 'react';
import * as THREE from 'three';
import { Billboard, Html, Text, useGLTF } from '@react-three/drei';
import { RotateCw, Trash2, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ShopDef } from './cityMap';
import { KenneyModel } from './KenneyModel';
import { KenneyCharacter } from './KenneyCharacter';
import { KENNEY_CHARACTERS, type CharacterId } from './kenneyCatalog';
import { InteriorNPCs } from './InteriorNPCs';
import { ShopWorkSim } from './ShopWorkSim';
import { InteriorAmbience } from './InteriorAmbience';
import { getFloorTexture, getWallpaperTexture } from './interiorTextures';
import {
  ROOM_W,
  ROOM_D,
  WALL_H,
  FURNITURE_CATALOG,
  WALL_FRAME_HEIGHT,
  WALL_FRAME_DEPTH,
  WALL_FRAME_WIDTH,
  WALL_FRAME_TALL,
  getWallHex,
  makeDefaultLayout,
  isWallItem,
  type IsoInteriorLayout,
  type IsoInteriorItem,
} from './interiorLayout';

/**
 * Shop interior — data-driven Sims-style cutaway room.
 *
 * The whole layout (wall colour, floor texture, every piece of furniture
 * and where it sits) is read from the `layout` prop. When no layout is
 * passed we fall back to the same hand-tuned default as before so
 * existing shops look identical until the player decides to decorate.
 *
 * When `editMode` is on:
 *   • Selecting a furniture item fires `onItemSelect(uid)`.
 *   • The currently selected item gets a soft yellow halo so the user
 *     can see what's about to be moved/rotated/deleted.
 *   • The shopkeeper character + ceiling-mounted lamps still render
 *     non-interactively so the room reads as a room, not a void.
 *
 * Render performance notes:
 *   • Floor and walls are flat planes / box meshes — one each.
 *   • Furniture GLBs are shared instances; each placement is just a
 *     `<KenneyModel>` with its own transform.
 *   • Wall/floor texture lookups are cached in `interiorTextures.ts`,
 *     so swapping floor styles in edit mode is near-instant.
 */

const WALL_T = 0.18;
const FURNITURE_SCALE = 1.4;

// Base 12×10 m geometry — reused for every preset EXCEPT the bigger-base
// ones (factory at 1.55×) which build their own scaled geometry per
// render in a useMemo below. We keep these statics for the common path
// so the default room isn't re-allocating every frame.
const FLOOR_GEOM = new THREE.PlaneGeometry(ROOM_W, ROOM_D);
const WALL_BACK_GEOM = new THREE.BoxGeometry(ROOM_W, WALL_H, WALL_T);
const WALL_SIDE_GEOM = new THREE.BoxGeometry(WALL_T, WALL_H, ROOM_D);
const ACCENT_GEOM = new THREE.BoxGeometry(ROOM_W - 0.4, 0.18, 0.02);
const SELECTION_GEOM = new THREE.RingGeometry(0.55, 0.78, 32);

interface IsoShopInteriorProps {
  shop: ShopDef;
  /** Layout to render. When omitted we render the original default
   *  arrangement so non-edit views in the iso scene keep working. */
  layout?: IsoInteriorLayout;
  /** When true, furniture clicks bubble up via onItemSelect and the
   *  selected item draws a highlight ring. */
  editMode?: boolean;
  /** The currently-selected item uid (for the highlight ring). */
  selectedUid?: string | null;
  /** Called with the uid of the clicked furniture in edit mode. Pass
   *  null when the user clicks the floor (deselect). */
  onItemSelect?: (uid: string | null) => void;
  /** Called when the player presses a pointer down on a furniture
   *  piece in edit mode. The DecorateModule uses this to start a
   *  raycast-driven drag and to lock the camera pan. */
  onItemDragStart?: (uid: string, pointerId: number) => void;
  /** When true (the player's own shop, non-edit), run the live work
   *  simulation: Wei serves a queue of customers who enter, get served,
   *  and leave, with furniture as solid obstacles. Other shops keep the
   *  static keeper + ambient wanderers. */
  liveSim?: boolean;
  /** Hired staff member's name shown above the keeper during work mode. */
  keeperName?: string;
  /** In edit mode: called when the player taps the Rotate button on the
   *  in-canvas popover that floats next to the selected item. */
  onRotateSelected?: () => void;
  /** In edit mode: called when the player taps the Delete button. */
  onDeleteSelected?: () => void;
  /** In edit mode: nudges the selected piece by (dx, dz) world units —
   *  drives the 4 arrow buttons on the floating action bar. */
  onNudgeSelected?: (dx: number, dz: number) => void;
}

export function IsoShopInterior({
  shop,
  layout,
  editMode = false,
  selectedUid = null,
  onItemSelect,
  onItemDragStart,
  liveSim = false,
  keeperName,
  onRotateSelected,
  onDeleteSelected,
  onNudgeSelected,
}: IsoShopInteriorProps) {
  const activeLayout = layout ?? DEFAULT_LAYOUT;
  const keeperCharacter: CharacterId = shop.keeperId ?? 'femaleA';
  const wallHex = getWallHex(activeLayout.wallColorId);

  // Layout-aware room scale — factory preset uses 1.55× so the heavy
  // industrial pieces fit. Falls back to 1.0 for every other preset so
  // the standard 12×10 m geometry stays as-is.
  const floorScale = activeLayout.floorScale && activeLayout.floorScale > 0
    ? activeLayout.floorScale
    : 1;
  const roomW = ROOM_W * floorScale;
  const roomD = ROOM_D * floorScale;
  const scaledFloorGeom = useMemo(
    () => (floorScale === 1 ? FLOOR_GEOM : new THREE.PlaneGeometry(roomW, roomD)),
    [floorScale, roomW, roomD],
  );
  const scaledWallBackGeom = useMemo(
    () => (floorScale === 1 ? WALL_BACK_GEOM : new THREE.BoxGeometry(roomW, WALL_H, WALL_T)),
    [floorScale, roomW],
  );
  const scaledWallSideGeom = useMemo(
    () => (floorScale === 1 ? WALL_SIDE_GEOM : new THREE.BoxGeometry(WALL_T, WALL_H, roomD)),
    [floorScale, roomD],
  );
  const scaledAccentGeom = useMemo(
    () => (floorScale === 1 ? ACCENT_GEOM : new THREE.BoxGeometry(roomW - 0.4, 0.18, 0.02)),
    [floorScale, roomW],
  );

  // Wall material: shop's chosen wall colour, tinted by the wallpaper map.
  const wallMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: wallHex,
      map: getWallpaperTexture(),
      toneMapped: false,
    });
    if (m.map) m.map.repeat.set(roomW / 4, WALL_H / 2);
    return m;
  }, [wallHex, roomW]);

  const accentMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: shop.roofColor, toneMapped: false }),
    [shop.roofColor],
  );

  const floorMat = useMemo(() => {
    const tex = getFloorTexture(activeLayout.floorStyle).clone();
    tex.needsUpdate = true;
    // Wood-plank textures look natural at ~3 metres per tile. Tile floors
    // are denser, but the same repeat keeps them in scale with the room.
    tex.repeat.set(roomW / 3, roomD / 3);
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  }, [activeLayout.floorStyle, roomW, roomD]);

  const keeperPath = useMemo(
    () => KENNEY_CHARACTERS[shop.keeperId ?? 'femaleA'],
    [shop.keeperId],
  );

  const handleFloorClick = (e: any) => {
    if (!editMode || !onItemSelect) return;
    e.stopPropagation();
    onItemSelect(null);
  };

  return (
    <group>
      {/* ── Ambient atmosphere — grounding glow stage, drifting orbs +
            sparkles so the room feels alive instead of floating in a
            flat void. Skipped in edit mode so the Decorate view stays
            clean while positioning furniture. ── */}
      {!editMode && <InteriorAmbience />}

      {/* ── Floor ────────────────────────────────────────────────── */}
      <mesh
        geometry={scaledFloorGeom}
        material={floorMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={handleFloorClick}
      />

      {/* ── Walls ─────────────────────────────────────────────────
            Sims-style cutaway: only the two BACK walls (back + left)
            stay visible. The right wall is removed so every shop —
            regardless of preset — reads as the open L-shape the iso
            camera was built for (matches the reference room: two walls
            meeting at the back-left corner, room open to camera). */}
      <mesh geometry={scaledWallBackGeom} material={wallMat} position={[0, WALL_H / 2, -roomD / 2]} />
      <mesh geometry={scaledWallSideGeom} material={wallMat} position={[-roomW / 2, WALL_H / 2, 0]} />

      {/* Accent stripe near top of back wall — picks up roofColor. */}
      <mesh
        geometry={scaledAccentGeom}
        material={accentMat}
        position={[0, WALL_H - 0.4, -roomD / 2 + 0.1]}
      />

      {/* ── Shop sign ──────────────────────────────────────────── */}
      <Billboard position={[0, WALL_H + 0.45, -roomD / 2 + 0.3]}>
        <mesh>
          <planeGeometry args={[Math.max(shop.name.length * 0.21 + 0.6, 2.2), 0.7]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <Text
          fontSize={0.35}
          color="#ffffff"
          outlineWidth={0.02}
          outlineColor={shop.signColor ?? '#0f172a'}
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.01]}
        >
          {shop.name}
        </Text>
      </Billboard>

      {/* ── Layout items ──────────────────────────────────────── */}
      {activeLayout.items.map((item) => (
        <FurnitureItem
          key={item.uid}
          item={item}
          editMode={editMode}
          selected={selectedUid === item.uid}
          onSelect={onItemSelect}
          onDragStart={onItemDragStart}
        />
      ))}

      {/* ── Keeper + customers ─────────────────────────────────
          Player's own shop, not decorating → the LIVE work simulation:
          Wei serves a queue of customers (enter → line up → served →
          exit → replaced), moving naturally behind the counter, with all
          furniture acting as solid obstacles.

          Other shops (or while decorating) keep the lightweight static
          keeper + aimless ambient wanderers so those views are unchanged. */}
      {liveSim && !editMode ? (
        <ShopWorkSim
          layout={activeLayout}
          keeperCharacter={keeperCharacter}
          keeperName={keeperName}
        />
      ) : (
        <>
          <KenneyCharacter
            path={keeperPath}
            clip="idle"
            scale={1.0}
            position={[0, 0, -3.8]}
            rotationY={Math.PI}
          />
          {!editMode && <InteriorNPCs count={4} />}
        </>
      )}

      {/* Selection halo + floating action bar — both anchored to the
          picked item's world position so the bar TRACKS the piece as
          it moves (drag or arrow-button nudge). The <Html> projects
          the 3D anchor to screen coords every frame, so the bar slides
          with the chair instead of staying parked at the bottom of
          the screen. Wall items skip the floor halo (the frame draws
          its own outline) but still get the floating bar above the
          frame. */}
      {editMode && selectedUid &&
        (() => {
          const sel = activeLayout.items.find((it) => it.uid === selectedUid);
          if (!sel) return null;
          const isWall = isWallItem(sel.type);
          const meta = FURNITURE_CATALOG[sel.type];
          // Anchor the action bar ~2.4 m above the item so it sits
          // clearly above a chair/table silhouette. Wall items anchor
          // a bit above the frame instead.
          const barAnchor: [number, number, number] = isWall
            ? [sel.x, WALL_FRAME_HEIGHT + 1.2, WALL_FRAME_DEPTH]
            : [sel.x, 1.5, sel.z];
          return (
            <group key="selection-overlay">
              {!isWall && (
                <mesh
                  geometry={SELECTION_GEOM}
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[sel.x, 0.1, sel.z]}
                >
                  <meshBasicMaterial
                    color="#fbbf24"
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                  />
                </mesh>
              )}
              <Html
                position={barAnchor}
                center
                zIndexRange={[100, 0]}
                style={{ pointerEvents: 'auto' }}
              >
                <FloatingActionBar
                  name={meta?.name ?? ''}
                  isWall={isWall}
                  onNudge={onNudgeSelected}
                  onRotate={onRotateSelected}
                  onDelete={onDeleteSelected}
                  onClose={() => onItemSelect?.(null)}
                />
              </Html>
            </group>
          );
        })()}
    </group>
  );
}

/**
 * In-canvas action bar that floats above the currently-selected piece.
 * Lives inside drei's `<Html>` so it tracks the item as the camera
 * pans/zooms AND as the item moves via the arrow buttons / drag — the
 * bar literally follows the chair around the room.
 *
 * Contains: name tag · 3×3 directional pad (0.25 m per tap) · Rotate ·
 * Delete · ×. Wall items get the up/down arrows greyed out since their
 * z is locked to the wall plane.
 */
const NUDGE_STEP = 0.25;
function FloatingActionBar({
  name, isWall, onNudge, onRotate, onDelete, onClose,
}: {
  name: string;
  isWall: boolean;
  onNudge?: (dx: number, dz: number) => void;
  onRotate?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  // Block pointer events from bubbling to the canvas — otherwise a tap
  // on the arrows would also be picked up by DragController and try to
  // drag the underlying furniture across the room.
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation();
  return (
    <div
      onPointerDown={stop}
      onPointerUp={stop}
      onClick={stop}
      // `inline-flex` + `w-auto` lets the bar shrink to fit its contents
      // instead of stretching to the parent. Tight gaps + slim padding so
      // the panel reads as one compact tool strip.
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-lg shadow-slate-900/40 whitespace-nowrap select-none w-auto"
    >
      <span className="pl-1 pr-0.5 text-[11px] font-bold text-white max-w-[88px] truncate">
        {name}
      </span>
      {/* Move controls — four arrows in a single inline row, no 3×3
          grid (which used to stretch the bar to ~3× its needed width).
          Order: ← ↑ ↓ → so the up/down sit together visually. */}
      {onNudge && (
        <>
          <NudgeIconBtn onClick={() => onNudge(-NUDGE_STEP, 0)} label="Move left">
            <ChevronLeft className="w-4 h-4" />
          </NudgeIconBtn>
          <NudgeIconBtn onClick={() => onNudge(0, -NUDGE_STEP)} disabled={isWall} label="Move back">
            <ChevronUp className="w-4 h-4" />
          </NudgeIconBtn>
          <NudgeIconBtn onClick={() => onNudge(0, NUDGE_STEP)} disabled={isWall} label="Move forward">
            <ChevronDown className="w-4 h-4" />
          </NudgeIconBtn>
          <NudgeIconBtn onClick={() => onNudge(NUDGE_STEP, 0)} label="Move right">
            <ChevronRight className="w-4 h-4" />
          </NudgeIconBtn>
        </>
      )}
      {onRotate && (
        <button
          type="button"
          onClick={onRotate}
          aria-label="Rotate 90°"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white active:translate-y-[1px] transition-[transform,background-color] duration-100"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-500 hover:bg-rose-400 text-white active:translate-y-[1px] transition-[transform,background-color] duration-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Deselect"
        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/** One arrow button inside the floating action bar's 3×3 nudge pad. */
function NudgeIconBtn({
  children, onClick, disabled, label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'w-8 h-8 inline-flex items-center justify-center rounded-lg transition-[transform,background-color] duration-100',
        disabled
          ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/50'
          : 'bg-white/10 border border-white/10 hover:bg-violet-500/30 text-white active:translate-y-[1px] touch-manipulation',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

const DEFAULT_LAYOUT = makeDefaultLayout();

interface FurnitureItemProps {
  item: IsoInteriorItem;
  editMode: boolean;
  selected: boolean;
  onSelect?: (uid: string | null) => void;
  onDragStart?: (uid: string, pointerId: number) => void;
}

function FurnitureItem({ item, editMode, selected, onSelect, onDragStart }: FurnitureItemProps) {
  const meta = FURNITURE_CATALOG[item.type];
  if (!meta) return null;

  const handlePointerDown = editMode
    ? (e: any) => {
        e.stopPropagation();
        onSelect?.(item.uid);
        onDragStart?.(item.uid, e.pointerId ?? 0);
      }
    : undefined;

  // Wall-mounted frame: render a coloured rectangle flush to the back
  // wall instead of loading a Kenney GLB. Position uses the layout's
  // x; y is fixed (at eye level) and z is locked to the wall.
  if (meta.mount === 'wall') {
    return (
      <group
        position={[item.x, WALL_FRAME_HEIGHT, WALL_FRAME_DEPTH]}
        onPointerDown={handlePointerDown}
      >
        {/* Outer frame */}
        <mesh>
          <planeGeometry args={[WALL_FRAME_WIDTH, WALL_FRAME_TALL]} />
          <meshBasicMaterial
            color={meta.frameBorderHex ?? '#1f2937'}
            toneMapped={false}
          />
        </mesh>
        {/* Inner fill (slightly inset + slightly forward so it z-passes the border). */}
        <mesh position={[0, 0, 0.005]}>
          <planeGeometry args={[WALL_FRAME_WIDTH - 0.16, WALL_FRAME_TALL - 0.16]} />
          <meshBasicMaterial
            color={meta.frameFillHex ?? '#f8fafc'}
            toneMapped={false}
          />
        </mesh>
        {/* Selection highlight border — sits in front of the frame
            so it's clearly visible against any wall colour. */}
        {selected && (
          <mesh position={[0, 0, 0.01]}>
            <ringGeometry
              args={[Math.SQRT2 * 0.46, Math.SQRT2 * 0.55, 32]}
            />
            <meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    );
  }

  const scale = meta.scale ?? FURNITURE_SCALE;
  const y = meta.y ?? 0;
  const rotationY = (item.rot * Math.PI) / 2;
  return (
    <group
      position={[item.x, y, item.z]}
      onPointerDown={handlePointerDown}
    >
      <KenneyModel
        path={meta.path}
        scale={scale * (selected ? 1.04 : 1)}
        rotationY={rotationY}
        // Edit mode needs the mesh to be raycast-able so taps + drags
        // hit the group's onPointerDown handler. Outside edit mode we
        // keep raycast off so taps fall through to the shop building
        // behind the interior — same behaviour as before.
        interactive={editMode}
        // When the catalog entry targets a specific sub-node (gym pack
        // pieces split out of modular_gym.glb), extract just that node.
        nodeName={meta.nodeName}
        // Coffee-shop pack pieces (Table = Base + top) render multiple
        // nodes together, preserving their relative world positions.
        nodeNames={meta.nodeNames}
      />
    </group>
  );
}

// ── Preload the full furniture set so first-render is smooth ─────────
Object.values(FURNITURE_CATALOG).forEach((meta) => useGLTF.preload(meta.path));
