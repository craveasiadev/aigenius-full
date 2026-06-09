import { useCallback, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import { cellToWorld, TILE_SIZE, type ShopDef } from './cityMap';
import { KenneyModel } from './KenneyModel';
import { KENNEY_BUILDINGS_COMMERCIAL } from './kenneyCatalog';

/**
 * One shop building on the iso city.
 *
 * Renders a Kenney City-Kit-Commercial GLB picked per-shop via
 * `shop.buildingId`. The building's natural Kenney scale (1×1 tile) is
 * multiplied by `BUILDING_SCALE` so it fills our 2-unit tile grid. The
 * model is rotated 0° / 90° / 180° / 270° depending on the shop's door
 * direction so the entrance faces outward toward the road.
 *
 * State render variants:
 *   • `selected`  → pulsing yellow ring on the ground beneath the shop.
 *   • `moveMode`  → semi-transparent ghost + purple footprint.
 *
 * Interaction is a single `onClick` on the parent group — `e.stopPropagation`
 * keeps the camera pan-zoom handler from treating the tap as a drag.
 */

// Kenney city tiles model at 1×1 units. Our grid is 2-unit. The 1.9 scale
// gives a small visual gap between adjacent tiles so the buildings don't
// touch — looks cleaner.
const BUILDING_SCALE = 1.9;

// Pre-allocated geometries for the selection/move rings.
const FOOTPRINT_GEOM = new THREE.RingGeometry(TILE_SIZE * 0.55, TILE_SIZE * 0.62, 24);

// Invisible click-capture box matching the building's tile footprint.
// Sized 1.2× tile so any tap that's clearly "on this shop" registers,
// regardless of whether it lands on the Kenney mesh, a pill, or empty
// space inside the footprint. Sits taller than the building so taps on
// the upper sign also count.
const CLICK_BOX_GEOM = new THREE.BoxGeometry(TILE_SIZE * 1.2, 4, TILE_SIZE * 1.2);

/**
 * Door direction → Y rotation in radians. Kenney commercial buildings
 * face +Z by default (the entrance points "south" on our grid).
 */
function doorRotationY(dir: ShopDef['door']): number {
  switch (dir) {
    case 'south': return 0;
    case 'east':  return -Math.PI / 2;
    case 'north': return Math.PI;
    case 'west':  return Math.PI / 2;
  }
}

interface IsoShopProps {
  shop: ShopDef;
  selected?: boolean;
  moveMode?: boolean;
  onTap?: () => void;
  /** Suppress the floating name/MY-SHOP label above this building.
   *  Used on the real student dashboard where the AI-generated shop
   *  image is displayed in a richer initial popout bubble (see
   *  PlayerShopBubble) and a second gold pill on top would compete
   *  for attention with the bubble. */
  suppressLabel?: boolean;
}

export function IsoShop({
  shop,
  selected = false,
  moveMode = false,
  onTap,
  suppressLabel = false,
}: IsoShopProps) {
  const [x0, , z0] = useMemo(() => cellToWorld(shop.cell.row, shop.cell.col), [shop]);
  const rotY = useMemo(() => doorRotationY(shop.door), [shop.door]);
  const buildingPath = useMemo(
    () => KENNEY_BUILDINGS_COMMERCIAL[shop.buildingId ?? 'a'],
    [shop.buildingId],
  );

  // Pulse the selection ring around 3 Hz.
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current || !selected) return;
    const t = clock.getElapsedTime();
    ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    (ringRef.current.material as THREE.MeshBasicMaterial).opacity =
      0.55 + Math.sin(t * 3) * 0.2;
  });

  // Custom hover: swap document cursor + lift a little. The native R3F
  // hover style is "auto" which gives no feedback that buildings are
  // interactive — bumping the cursor to a hand makes the affordance
  // obvious even before the user taps.
  const [hovered, setHovered] = useState(false);
  const handleOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);
  const handleOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  // Hover offset & ring scale — slight visual lift and a stronger ring
  // when the user is over the shop. The player's shop gets a more
  // prominent lift since it's the "primary" CTA.
  const hoverLift = hovered ? (shop.isPlayer ? 0.18 : 0.08) : 0;

  return (
    <group
      position={[x0, hoverLift, z0]}
      onClick={(e) => {
        // Stop bubbling — the camera-pan handler should not treat this
        // click as the tail end of a drag, or it'd cancel the action menu
        // before the menu has even rendered.
        e.stopPropagation();
        onTap?.();
      }}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    >
      {/* Yellow pulsing selection ring (when this shop is the active one). */}
      {selected && (
        <mesh
          ref={ringRef}
          geometry={FOOTPRINT_GEOM}
          position={[0, 0.21, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="#facc15" transparent opacity={0.65} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Hover halo — subtle ring that appears when the cursor is over
       *  the building. Replaces the browser's default cursor change with
       *  an in-world affordance the user can see at the iso angle. */}
      {hovered && !selected && (
        <mesh
          geometry={FOOTPRINT_GEOM}
          position={[0, 0.205, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={1.1}
        >
          <meshBasicMaterial
            color={shop.isPlayer ? '#fbbf24' : '#94a3b8'}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Purple ghost footprint during move-mode */}
      {moveMode && (
        <mesh
          geometry={FOOTPRINT_GEOM}
          position={[0, 0.22, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial color="#a855f7" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* The Kenney building model. Player-owned shops get a warm yellow
       *  tint so they stand out from the AI shops without us needing a
       *  bespoke GLB just for the player. The tint multiplies with the
       *  Kenney colourmap, so the building reads as "gold variant of
       *  the same model" rather than fully overwritten. */}
      <KenneyModel
        path={buildingPath}
        scale={BUILDING_SCALE}
        rotationY={rotY}
        opacity={moveMode ? 0.55 : 1}
        tint={shop.isPlayer ? '#fbbf24' : undefined}
      />

      {/* Invisible click-capture box. The Kenney GLBs have concave shapes
       *  (recessed doorways, balconies) so raycasts sometimes miss the
       *  geometry when the user taps near the door. This wider box is
       *  invisible (transparent material, opacity 0) but still raycasts,
       *  so the shop is reliably tappable across its whole footprint. We
       *  can't use `visible={false}` because that also disables raycasting. */}
      <mesh geometry={CLICK_BOX_GEOM} position={[0, 2, 0]}>
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Floating camera-facing sign with the shop name. Skipped when
       *  `suppressLabel` is true — that's the case for the player's
       *  shop on the real dashboard, where the richer PlayerShopBubble
       *  with the generated image acts as the label instead. */}
      {!suppressLabel && (
        <Billboard position={[0, 3.6, 0]}>
          {shop.isPlayer ? (
            <group>
              {/* Soft glow halo behind the pill */}
              <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[2.5, 0.8]} />
                <meshBasicMaterial color="#fde047" transparent opacity={0.55} />
              </mesh>
              {/* Yellow pill body */}
              <mesh>
                <planeGeometry args={[2.2, 0.6]} />
                <meshBasicMaterial color="#facc15" />
              </mesh>
              <Text
                fontSize={0.3}
                color="#422006"
                outlineWidth={0.02}
                outlineColor="#fde047"
                anchorX="center"
                anchorY="middle"
                position={[0, 0, 0.01]}
              >
                ⭐ MY SHOP
              </Text>
            </group>
          ) : (
            <group>
              <mesh>
                <planeGeometry args={[Math.max(shop.name.length * 0.16 + 0.6, 1.6), 0.5]} />
                <meshBasicMaterial color="#0f172a" transparent opacity={0.85} />
              </mesh>
              <Text
                fontSize={0.26}
                color="#ffffff"
                outlineWidth={0.02}
                outlineColor={shop.signColor ?? '#0f172a'}
                anchorX="center"
                anchorY="middle"
                position={[0, 0, 0.01]}
              >
                {shop.name}
              </Text>
            </group>
          )}
        </Billboard>
      )}
    </group>
  );
}

// Preload every commercial building so the GLBs are warm in drei's GLTF
// cache by the time the city mounts.
Object.values(KENNEY_BUILDINGS_COMMERCIAL).forEach((p) => useGLTF.preload(p));
