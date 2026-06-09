import { useMemo } from 'react';
import * as THREE from 'three';
import { ROWS, COLS, TILE_SIZE, tileAt } from './cityMap';

/**
 * Scatters small dark-green tufts across the grass tiles + the outer
 * grass plane so the background reads as "grassy" instead of a flat
 * green sheet.
 *
 * Everything is drawn with two `InstancedMesh`es (one for tufts inside
 * the city grid, one for tufts in the surrounding green plane) so the
 * GPU only has to process two draw calls regardless of how many tufts.
 *
 * Deterministic placement — we seed the RNG so the tuft pattern is the
 * same every time the city loads, which avoids visual flicker between
 * dev reloads and keeps screenshots stable.
 */

// Two flat plane tufts crossed at 90° per instance would feel more like
// real grass, but a single cone-flattened-mesh is enough for the iso look
// at this zoom and costs half the instances. A `CircleGeometry` slightly
// raised off the floor reads as a colour patch from the iso angle.
const TUFT_GEOM = new THREE.CircleGeometry(0.18, 6);

const TUFT_MAT_DARK = new THREE.MeshBasicMaterial({ color: '#3f7a23' });
const TUFT_MAT_LIGHT = new THREE.MeshBasicMaterial({ color: '#9bc962' });

// Mulberry32 PRNG — small, deterministic, no deps. Enough randomness for
// scattering tufts.
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

interface GrassDetailProps {
  /** How many tufts to scatter inside the city grid grass tiles. */
  insideCount?: number;
  /** How many tufts to scatter on the outer green plane (the area
   *  outside the city grid but within the camera's pan bounds). */
  outsideCount?: number;
  /** Half-side of the outer scatter square in world units. */
  outsideRadius?: number;
}

export function GrassDetail({
  // Halved from the original counts (220 / 360) — the textured
  // GrassGround beneath these tufts already carries most of the visual
  // weight, so we don't need a tuft per square metre. Saves a lot of
  // instance matrices on low-end devices.
  insideCount = 110,
  outsideCount = 160,
  outsideRadius = 60,
}: GrassDetailProps) {
  // Find every grass cell inside the city grid so we only scatter inside
  // grass tiles (never on the sidewalk / road / shop slots).
  const grassCells = useMemo(() => {
    const out: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (tileAt(r, c) === 'grass') out.push([r, c]);
      }
    }
    return out;
  }, []);

  // Build the two InstancedMeshes once. We blend the dark + light tufts
  // by writing both to the same mesh: every other instance gets the
  // alternate material via a second mesh with the same matrix data.
  const { darkInside, lightInside, outsideMesh } = useMemo(() => {
    const rng = mulberry32(1337);
    const dummy = new THREE.Object3D();

    // Tufts on grass tiles inside the playable map.
    const insideDark = new THREE.InstancedMesh(TUFT_GEOM, TUFT_MAT_DARK, Math.floor(insideCount / 2));
    const insideLight = new THREE.InstancedMesh(TUFT_GEOM, TUFT_MAT_LIGHT, Math.floor(insideCount / 2));
    insideDark.frustumCulled = false;
    insideLight.frustumCulled = false;

    if (grassCells.length === 0) {
      // Fallback — no grass tiles, scatter inside count of 0 just makes
      // the two meshes empty placeholders.
      insideDark.count = 0;
      insideLight.count = 0;
    } else {
      for (let i = 0; i < insideCount; i++) {
        const [r, c] = grassCells[Math.floor(rng() * grassCells.length)];
        const cx = (c - (COLS - 1) / 2) * TILE_SIZE;
        const cz = (r - (ROWS - 1) / 2) * TILE_SIZE;
        // Jitter within the tile.
        const x = cx + (rng() - 0.5) * (TILE_SIZE * 0.85);
        const z = cz + (rng() - 0.5) * (TILE_SIZE * 0.85);
        const yaw = rng() * Math.PI * 2;
        const scale = 0.65 + rng() * 0.7;
        dummy.position.set(x, 0.2, z);
        dummy.rotation.set(-Math.PI / 2, 0, yaw);
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        if (i % 2 === 0) insideDark.setMatrixAt(i / 2, dummy.matrix);
        else insideLight.setMatrixAt((i - 1) / 2, dummy.matrix);
      }
      insideDark.instanceMatrix.needsUpdate = true;
      insideLight.instanceMatrix.needsUpdate = true;
    }

    // Tufts on the outer green plane — outside the map bounds.
    // Scatter random points then reject any point that falls inside the
    // city footprint (so the tufts don't stack on top of the inside layer).
    const halfMapW = (COLS * TILE_SIZE) / 2;
    const halfMapD = (ROWS * TILE_SIZE) / 2;
    const outside = new THREE.InstancedMesh(TUFT_GEOM, TUFT_MAT_DARK, outsideCount);
    outside.frustumCulled = false;
    let placed = 0;
    let tries = 0;
    while (placed < outsideCount && tries < outsideCount * 4) {
      tries++;
      const x = (rng() - 0.5) * outsideRadius * 2;
      const z = (rng() - 0.5) * outsideRadius * 2;
      if (Math.abs(x) < halfMapW && Math.abs(z) < halfMapD) continue;
      const yaw = rng() * Math.PI * 2;
      const scale = 0.7 + rng() * 0.9;
      dummy.position.set(x, 0.0, z);
      dummy.rotation.set(-Math.PI / 2, 0, yaw);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      outside.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    outside.count = placed;
    outside.instanceMatrix.needsUpdate = true;

    return { darkInside: insideDark, lightInside: insideLight, outsideMesh: outside };
  }, [grassCells, insideCount, outsideCount, outsideRadius]);

  return (
    <group>
      <primitive object={darkInside} />
      <primitive object={lightInside} />
      <primitive object={outsideMesh} />
    </group>
  );
}
