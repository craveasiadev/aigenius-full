import { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

/**
 * Per Kenney's "importing models" docs, every kit uses one of:
 *   • a tiny `Textures/colormap.png` palette (city/road/character kits) —
 *     each pixel is a colour, mesh UVs land on the pixel they want.
 *   • per-vertex colours baked into the mesh (furniture kit).
 *
 * Both share two requirements:
 *   1. The palette texture must use NearestFilter — bilinear blends the
 *      colour squares together and turns reds into pinks.
 *   2. Materials must be unlit-equivalent (tonemapping off) so high
 *      ambient light doesn't blow the colours to white. We render with
 *      ACES tonemapping disabled at the canvas level, plus toneMapped=false
 *      on every material as belt-and-suspenders.
 *
 * This helper normalises a single cloned material so every Kenney mesh
 * we draw renders with the colours Kenney shipped.
 */
function prepKenneyMaterial(
  mat: THREE.Material,
  tint?: string,
  opacity = 1,
): THREE.Material {
  const m = mat as THREE.MeshStandardMaterial;
  if ('toneMapped' in m) m.toneMapped = false;

  // Palette textures must use nearest-neighbour filtering — Kenney's
  // colourmap is ~64×64 pixels where each pixel is one colour. Bilinear
  // filtering bleeds neighbours together.
  if (m.map) {
    m.map.magFilter = THREE.NearestFilter;
    m.map.minFilter = THREE.NearestFilter;
    m.map.generateMipmaps = false;
    m.map.colorSpace = THREE.SRGBColorSpace;
    m.map.needsUpdate = true;
  }

  // Furniture kit uses vertex colours instead of a palette texture; the
  // GLTFLoader already sets material.vertexColors=true on those, so we
  // don't need to touch the flag here. Forcing it on for textured packs
  // (commercial/character) would multiply the texture by white per-vertex
  // and dim the model.

  if (tint && 'color' in m) m.color.set(tint);
  if (opacity < 1) {
    m.transparent = true;
    m.opacity = opacity;
    m.depthWrite = false;
  }
  return m;
}

/**
 * Wrapper around `useGLTF` for Kenney static (non-rigged) models.
 *
 * Why this exists:
 *   • Each `useGLTF(path)` call returns the SAME `THREE.Group` instance —
 *     placing it directly with `<primitive object={scene}>` works for
 *     ONE call site, but rendering the same model twice (e.g. two
 *     buildings of the same type at different cells) reparents the
 *     single group and only the last call site sees it. So we clone.
 *   • Kenney static GLBs don't have skinned meshes, so a deep
 *     `scene.clone(true)` is enough — no need for `SkeletonUtils.clone`
 *     here, which is what the player avatar uses.
 *   • This is the place to globally tweak materials (disable shadow
 *     casting on backdrop buildings to save fillrate, force
 *     `frustumCulled = true`, etc.) without touching the rest of the
 *     scene.
 */

// Module-scope WeakSet tracking which GLB scenes have had their materials
// prepped (toneMapped=false, NearestFilter, SRGB colourspace). Lets us
// run the expensive `prepKenneyMaterial` walk exactly once per GLB
// instead of once per placement.
const PREPPED_SCENES = new WeakSet<THREE.Object3D>();

interface KenneyModelProps {
  path: string;
  /** Uniform scale applied to the cloned model. Kenney city tiles are 1×1
   *  in their native units; pass 2 to fit our 2-unit tile grid. */
  scale?: number;
  position?: [number, number, number];
  /** Rotation around Y in radians. Useful for facing a road tile the right way. */
  rotationY?: number;
  /** Tinted overlay on the materials. Multiplied with the model's existing
   *  baseColor, so default `#ffffff` (no tint) preserves Kenney's textures. */
  tint?: string;
  /** Makes the model semi-transparent (used for the move-mode "ghost"). */
  opacity?: number;
  /** When false, the model's meshes are excluded from raycasting. Used
   *  for decor (trees, cars, lamps, cones) so they never intercept clicks
   *  destined for the shop buildings behind them. Defaults to true. */
  interactive?: boolean;
  /** When set, render ONLY the sub-node with this name from the loaded
   *  GLB instead of the whole scene. Used to split mega-meshes (e.g. the
   *  53 MB modular_gym.glb that ships every piece of equipment together)
   *  into individually placeable furniture. The matched sub-tree is
   *  recentred at the origin so the layout's (x, z) places it correctly. */
  nodeName?: string;
  /** Like `nodeName` but renders MULTIPLE named sub-nodes together as a
   *  single composite piece, preserving their relative world positions
   *  from the source GLB. Used for furniture authored as separate pieces
   *  in one scene (e.g. a coffee-shop table = `Table Base` + `Table top`
   *  sitting on top of each other). The combined group is recentred on
   *  its own XZ bbox so layout (x, z) places it correctly. */
  nodeNames?: string[];
}

export function KenneyModel({
  path,
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
  tint,
  opacity = 1,
  interactive = true,
  nodeName,
  nodeNames,
}: KenneyModelProps) {
  const { scene } = useGLTF(path);

  // Track which scene's materials we've already prepped (toneMapped,
  // filtering, colourspace). Without this, every clone re-runs the
  // material prep, which is the bulk of the per-instance cost for decor.
  // A WeakSet keyed on the SHARED gltf scene means we touch each GLB's
  // materials exactly once across the lifetime of the app.
  // (Lives at module scope below the component — see PREPPED_SCENES.)

  const cloned = useMemo(() => {
    // 1. Prep the shared scene's materials in place — once per GLB.
    //    Subsequent users of the same GLB skip this work entirely.
    if (!PREPPED_SCENES.has(scene)) {
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => prepKenneyMaterial(m));
        else if (mat) prepKenneyMaterial(mat);
      });
      PREPPED_SCENES.add(scene);
    }

    // 2. Decide whether this instance needs its own materials. Sharing
    //    materials with the source scene is fine for "default" decor —
    //    it saves a clone per placement, the main perf win for cities
    //    with many trees / lamps / road tiles.
    const needsOwnMaterials = tint !== undefined || opacity < 1;

    // Determine what we're cloning:
    //   • `nodeNames` (multi) → wrap each named sub-node in a fresh
    //     group, preserving each piece's WORLD transform so their
    //     relative positions (e.g. table top sitting on the table base)
    //     survive the extraction.
    //   • `nodeName`  (single) → clone that sub-tree only.
    //   • default → clone the whole scene.
    let c: THREE.Object3D;

    if ((nodeNames && nodeNames.length > 0) || nodeName) {
      const wanted = nodeNames && nodeNames.length > 0 ? nodeNames : [nodeName!];
      const group = new THREE.Group();
      scene.updateMatrixWorld(true);
      let any = false;
      for (const nm of wanted) {
        const found = scene.getObjectByName(nm);
        if (!found) {
          console.warn(`[KenneyModel] node "${nm}" not found in ${path}`);
          continue;
        }
        // Just clone the sub-tree. The clone keeps the source node's
        // own LOCAL transform (translation + rotation + scale), which
        // is exactly what we want for both:
        //   • Kenney leaf meshes with identity transforms
        //   • Coffee Shop pack leaves whose ~100× scale is baked into
        //     the node TRS (needed so 0.02-unit geometry renders at
        //     real-world size)
        // All packs we ship have identity-ancestor scene graphs, so
        // the source node's LOCAL transform IS its world transform,
        // and we never need to bake ancestor matrices.
        const piece = found.clone(true);
        group.add(piece);
        any = true;
      }
      if (!any) return new THREE.Group();
      // Recentre the composite on its own XZ bbox + drop to floor so
      // the layout's (x, z) places the piece where the kid expects.
      group.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(group);
      const centre = new THREE.Vector3();
      box.getCenter(centre);
      group.position.set(-centre.x, -box.min.y, -centre.z);
      c = group;
    } else {
      c = scene.clone(true);
    }

    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Decor (interactive=false) opts out of raycasting entirely so it
      // can never sit between the user's tap and a shop behind it.
      if (!interactive) mesh.raycast = () => {};
      if (!needsOwnMaterials) return;

      const mat = mesh.material;
      if (Array.isArray(mat)) {
        mesh.material = mat.map((m) => prepKenneyMaterial(m.clone(), tint, opacity));
      } else if (mat) {
        mesh.material = prepKenneyMaterial(mat.clone(), tint, opacity);
      }
    });
    return c;
  }, [scene, tint, opacity, interactive, nodeName, nodeNames, path]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
