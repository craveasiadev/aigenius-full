import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Rigged Kenney mini-character (NPC or shopkeeper).
 *
 * Kenney characters are skinned meshes with built-in animation clips
 * ("idle", "walk", "run", "wave", "sit", …). A plain `scene.clone(true)`
 * keeps the SkinnedMesh pointing at the original skeleton — so the second
 * instance plays the same animation as the first. `SkeletonUtils.clone`
 * duplicates the skeleton too, which is what we need.
 *
 * Pick an animation by passing `clip`. We default to "idle" so a static
 * character isn't stuck in a T-pose. NPCs override to "walk".
 *
 * Sizes: Kenney mini-characters are ~1.7 m tall in their native units.
 * Our iso tile is 2 units, so the default `scale={1}` already reads
 * sensibly next to a 1.9-scaled building. Tweak via the `scale` prop.
 */

interface KenneyCharacterProps {
  path: string;
  /** Animation clip name. Falls back to the model's first clip if missing. */
  clip?: string;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
}

export function KenneyCharacter({
  path,
  clip = 'idle',
  scale = 1,
  position = [0, 0, 0],
  rotationY = 0,
}: KenneyCharacterProps) {
  const gltf = useGLTF(path);

  // Deep-clone with a fresh skeleton so each NPC plays its own animation
  // independently of every other NPC using the same source GLB.
  const cloned = useMemo(() => {
    const c = cloneWithSkeleton(gltf.scene) as THREE.Group;
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      // NPCs and shopkeepers are decorative — they should never intercept
      // a tap meant for the shop building behind them. Disabling raycast
      // also cuts the per-frame skinned-mesh raycast cost.
      mesh.raycast = () => {};
      // Same colourmap fix as KenneyModel:
      //   • toneMapped=false so ACES doesn't blow the palette to white.
      //   • map.magFilter=NearestFilter so the 64×64 colour grid doesn't
      //     bilinear-blend into mush (every character pixel is one of
      //     16 hand-picked palette swatches).
      const apply = (m: THREE.Material) => {
        const sm = m as THREE.MeshStandardMaterial;
        if ('toneMapped' in sm) sm.toneMapped = false;
        if (sm.map) {
          sm.map.magFilter = THREE.NearestFilter;
          sm.map.minFilter = THREE.NearestFilter;
          sm.map.generateMipmaps = false;
          sm.map.colorSpace = THREE.SRGBColorSpace;
          sm.map.needsUpdate = true;
        }
      };
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach(apply);
      else if (mat) apply(mat);
    });
    return c;
  }, [gltf.scene]);

  // Run animations off the cloned group, not the shared one.
  const { actions, names } = useAnimations(gltf.animations, cloned);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!actions || names.length === 0) return;
    // Try the requested clip, fall back to the first one if Kenney didn't
    // ship that label for this character.
    const wanted = actions[clip] ?? actions[names[0]];
    if (!wanted) return;
    wanted.reset().fadeIn(0.2).play();
    return () => {
      wanted.fadeOut(0.2);
    };
  }, [actions, names, clip]);

  return (
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
