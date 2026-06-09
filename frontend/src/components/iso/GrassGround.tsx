import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Big grass plane behind the city tile grid.
 *
 * Instead of a solid colour fill (which reads as a flat green sheet), we
 * paint a 256×256 procedural texture in a `<canvas>` once at mount time
 * and use it as the plane's diffuse map, tiled repeatedly across the
 * plane. The canvas paints:
 *
 *   1. A blend of three close greens for base variation.
 *   2. Random dark + light blade strokes that read as grass tufts from
 *      the iso angle.
 *   3. A subtle vignette so the centre of each tile is slightly brighter,
 *      which prevents seams from being visible when the texture repeats.
 *
 * This is the same trick a lot of stylised iso games use to avoid
 * shipping a 2 MB grass PNG. The canvas-baked texture is GPU-uploaded
 * once and costs nothing after that.
 */

const TEX_SIZE = 256;

function buildGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // ── Layer 1: base green wash ──────────────────────────────────────
  // Use a small grid of slightly-different green squares so the plane
  // never reads as one uniform colour.
  const baseGreens = ['#5a9f3a', '#62a83e', '#6dac46', '#75b34c'];
  const CELL = 8; // px per random-green cell
  for (let y = 0; y < TEX_SIZE; y += CELL) {
    for (let x = 0; x < TEX_SIZE; x += CELL) {
      ctx.fillStyle = baseGreens[(x + y * 31) % baseGreens.length];
      ctx.fillRect(x, y, CELL, CELL);
    }
  }

  // ── Layer 2: speckle noise ────────────────────────────────────────
  // Per-pixel jitter to break up the cells and make the result look
  // organic at distance.
  const img = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const jitter = (Math.random() - 0.5) * 24;
    img.data[i] = clamp8(img.data[i] + jitter * 0.6);
    img.data[i + 1] = clamp8(img.data[i + 1] + jitter);
    img.data[i + 2] = clamp8(img.data[i + 2] + jitter * 0.6);
  }
  ctx.putImageData(img, 0, 0);

  // ── Layer 3: grass blade strokes ──────────────────────────────────
  // Short hairline strokes — dark green for shadow side, light green for
  // lit side. Random angles so blades look like they grow in all directions.
  ctx.lineWidth = 1;
  for (let i = 0; i < 700; i++) {
    const x = Math.random() * TEX_SIZE;
    const y = Math.random() * TEX_SIZE;
    const len = 2 + Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    ctx.strokeStyle = Math.random() > 0.5 ? '#3a7320' : '#9bc962';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  // Anisotropic filter so the texture stays crisp at grazing iso angles
  // instead of blurring into a single colour in the far corners.
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

interface GrassGroundProps {
  /** Half-extent of the plane in world units. Default 200 → 400×400. */
  size?: number;
  /** Texture tiling factor — repeats the 256×256 canvas this many times
   *  across each side of the plane. Higher = finer detail per metre. */
  repeats?: number;
  /** Y offset of the plane. Negative values sink it slightly so other
   *  ground meshes (sidewalk, road) layer cleanly on top. */
  y?: number;
}

export function GrassGround({ size = 200, repeats = 40, y = -0.05 }: GrassGroundProps) {
  const texture = useMemo(buildGrassTexture, []);

  // Apply repeat factor on each mount so different GrassGround instances
  // can have different tiling without sharing state.
  const finalTex = useMemo(() => {
    texture.repeat.set(repeats, repeats);
    return texture;
  }, [texture, repeats]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[size * 2, size * 2]} />
      <meshBasicMaterial map={finalTex} toneMapped={false} />
    </mesh>
  );
}
