import { useMemo } from 'react';
import * as THREE from 'three';
import {
  ROWS,
  COLS,
  TILE_SIZE,
  cellToWorld,
  tileAt,
  type TileType,
} from './cityMap';

/**
 * Build a concrete-tile texture for the sidewalk: a 2×2 grid of slightly
 * varied grey blocks separated by dark grout lines, plus per-pixel
 * speckle so the result reads as real concrete instead of a uniform
 * flat colour at iso angle.
 *
 * The texture is sized 128×128 — small enough to GPU-upload instantly,
 * big enough that the dark grout lines look crisp at our zoom levels.
 * One repeat per tile so each sidewalk square shows the full pattern.
 */
function buildSidewalkTexture(): THREE.CanvasTexture {
  const SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // Base concrete colour.
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 2×2 paving slabs with slight per-slab variance — keeps the texture
  // from looking like a flat solid.
  const half = SIZE / 2;
  const slabColours = ['#d6d3d1', '#cfccc9', '#dad7d4', '#ccc9c6'];
  for (let i = 0; i < 4; i++) {
    const sx = (i % 2) * half;
    const sy = Math.floor(i / 2) * half;
    ctx.fillStyle = slabColours[i];
    ctx.fillRect(sx + 2, sy + 2, half - 4, half - 4);
  }

  // Dark grout lines along the slab joints.
  ctx.strokeStyle = '#8b8987';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(half, 0); ctx.lineTo(half, SIZE);
  ctx.moveTo(0, half); ctx.lineTo(SIZE, half);
  ctx.stroke();
  // Outer border so adjacent sidewalk tiles read as separate paving slabs.
  ctx.strokeStyle = '#7a7775';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

  // Per-pixel concrete speckle.
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 18;
    img.data[i] = clamp8(img.data[i] + j);
    img.data[i + 1] = clamp8(img.data[i + 1] + j);
    img.data[i + 2] = clamp8(img.data[i + 2] + j);
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Tile-grid renderer.
 *
 * Every tile in the city is a flat box. We use `<instancedMesh>` (one
 * `BoxGeometry`, one `MeshBasicMaterial`, one draw call) for each tile
 * type. That keeps the entire 165-cell city down to ~5 draw calls
 * regardless of grid size — critical for mobile GPUs.
 *
 * Tile colours are hand-picked to read clearly in iso projection without
 * needing fancy lighting: high-contrast saturated greens for grass, mid-
 * grey for road, warm tan for plaza. No textures, no shadows.
 */

// Pre-computed once at module load — shared across every instance.
const TILE_GEOM = new THREE.BoxGeometry(TILE_SIZE, 0.18, TILE_SIZE);

const TILE_COLOURS: Record<TileType, string> = {
  grass: '#7ec850',
  sidewalk: '#d6d3d1',
  road: '#52525b',
  plaza: '#d6a973',
  shopSlot: '#cbd5e1', // placeholder under a building — usually invisible
  // Building plot tiles share the sidewalk concrete colour underfoot —
  // because in the reference city images, buildings sit on paved blocks
  // (not in the middle of lawns). The actual building model placed by
  // CityProps covers most of the tile anyway, but the slim exposed edge
  // reads as concrete plaza, not grass.
  industrialPlot:  '#a8a29e',
  housingPlot:     '#a8a29e',
  commercialPlot:  '#a8a29e',
  empty: '#000000',
};

/** Group a tile-type → list of cell positions for batch instancing.
 *
 *  Road tiles are now drawn by `CityProps` (real Kenney `road-straight`
 *  GLBs), so we skip them here. Plaza tiles too — none in the current
 *  map, but if we add them later they'd be props as well.
 */
function buckets() {
  const out = new Map<TileType, [number, number, number][]>();
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const type = tileAt(row, col);
      if (type === 'empty') continue;
      if (type === 'road') continue;
      const pos = cellToWorld(row, col);
      if (!out.has(type)) out.set(type, []);
      out.get(type)!.push(pos);
    }
  }
  return out;
}

interface TileLayerProps {
  positions: [number, number, number][];
  color: string;
  /** Optional diffuse map. Used to give sidewalks their paving-slab look. */
  map?: THREE.Texture;
}

function TileLayer({ positions, color, map }: TileLayerProps) {
  const material = useMemo(() => {
    // Three.js warns if `map` is passed as undefined in the params object,
    // so we only set it when actually provided. Sidewalk tiles get the
    // concrete-slab texture; grass / plaza tiles stay flat-coloured.
    const params: THREE.MeshBasicMaterialParameters = { color, toneMapped: false };
    if (map) params.map = map;
    return new THREE.MeshBasicMaterial(params);
  }, [color, map]);

  // Use refs so we can write transforms onto the InstancedMesh once.
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(TILE_GEOM, material, positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p[0], 0.09, p[2]);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
    return m;
  }, [positions, material]);

  return <primitive object={mesh} />;
}

/**
 * The full tile grid. Renders one InstancedMesh per tile type.
 * Shop buildings + NPCs + the player are rendered separately by their own
 * components; this is only the ground.
 */
export function IsoCity() {
  const layers = useMemo(buckets, []);
  // Build the sidewalk texture once at mount. Other tile types (grass,
  // plaza, shopSlot) stay as flat colours — only sidewalk gets the
  // concrete-slab pattern.
  const sidewalkMap = useMemo(buildSidewalkTexture, []);

  return (
    <group>
      {Array.from(layers.entries()).map(([type, positions]) => (
        <TileLayer
          key={type}
          positions={positions}
          // Sidewalk uses #ffffff so the texture's authored colours render
          // unmultiplied. Other tiles keep their solid colour.
          color={type === 'sidewalk' ? '#ffffff' : TILE_COLOURS[type]}
          map={type === 'sidewalk' ? sidewalkMap : undefined}
        />
      ))}
    </group>
  );
}
