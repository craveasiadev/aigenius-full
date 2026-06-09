import * as THREE from 'three';

/**
 * Procedural textures for the shop interior — baked once on first use
 * and cached so re-entering shops never repaints them.
 *
 * Two textures:
 *   • Wood-plank floor — horizontal planks with subtle grain noise and
 *     dark joint lines. Works for any shop style without re-baking per
 *     shop colour.
 *   • Vertical wallpaper stripes — a soft repeating pattern that gives
 *     the walls texture without overpowering the shop's wallColor (the
 *     wallpaper is rendered white-on-alpha; the colour comes from the
 *     wall material it sits on).
 */

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// ── Floor ────────────────────────────────────────────────────────────

export type FloorStyleId = 'wood' | 'marble' | 'tileBlue' | 'concrete' | 'parquet' | 'galaxy';

const floorCache = new Map<FloorStyleId, THREE.CanvasTexture>();

function finalizeTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function woodPlankTexture(planks: string[], jointColour: string, seamAlpha: number): HTMLCanvasElement {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const plankH = SIZE / planks.length;
  planks.forEach((colour, i) => {
    ctx.fillStyle = colour;
    ctx.fillRect(0, i * plankH, SIZE, plankH);
  });
  for (let i = 0; i < 1400; i++) {
    const px = Math.random() * SIZE;
    const py = Math.random() * SIZE;
    const len = 4 + Math.random() * 10;
    ctx.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + len, py);
    ctx.stroke();
  }
  ctx.strokeStyle = jointColour;
  ctx.lineWidth = 2;
  for (let i = 1; i < planks.length; i++) {
    const y = i * plankH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(SIZE, y);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(0,0,0,${seamAlpha})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < planks.length; i++) {
    const y = i * plankH;
    const seamX = (i % 2 === 0) ? SIZE * 0.3 : SIZE * 0.6;
    ctx.beginPath();
    ctx.moveTo(seamX, y);
    ctx.lineTo(seamX, y + plankH);
    ctx.stroke();
  }
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 12;
    img.data[i] = clamp8(img.data[i] + j);
    img.data[i + 1] = clamp8(img.data[i + 1] + j * 0.8);
    img.data[i + 2] = clamp8(img.data[i + 2] + j * 0.6);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function marbleTexture(): HTMLCanvasElement {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ece8e2';
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Veining
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(150,140,130,${0.18 + Math.random() * 0.2})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.6;
    ctx.beginPath();
    const sx = Math.random() * SIZE;
    const sy = Math.random() * SIZE;
    ctx.moveTo(sx, sy);
    for (let s = 0; s < 6; s++) {
      ctx.bezierCurveTo(
        sx + Math.random() * 80 - 40, sy + Math.random() * 80 - 40,
        sx + Math.random() * 80 - 40, sy + Math.random() * 80 - 40,
        sx + Math.random() * 80 - 40, sy + Math.random() * 80 - 40,
      );
    }
    ctx.stroke();
  }
  return c;
}

function tileTexture(tileColour: string, groutColour: string, tileSize = 64): HTMLCanvasElement {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = groutColour;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let y = 0; y < SIZE; y += tileSize) {
    for (let x = 0; x < SIZE; x += tileSize) {
      ctx.fillStyle = tileColour;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
      // Highlight + shadow
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + tileSize - 2, y + 2);
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + 2, y + tileSize - 2);
      ctx.stroke();
    }
  }
  return c;
}

function concreteTexture(): HTMLCanvasElement {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#a3a8af';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 28;
    img.data[i] = clamp8(img.data[i] + j);
    img.data[i + 1] = clamp8(img.data[i + 1] + j);
    img.data[i + 2] = clamp8(img.data[i + 2] + j);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function galaxyTexture(): HTMLCanvasElement {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 10, SIZE / 2, SIZE / 2, SIZE * 0.7);
  grad.addColorStop(0, '#3b2d8e');
  grad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  // Stars
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const r = Math.random() * 1.4 + 0.4;
    ctx.fillStyle = i % 4 === 0 ? '#e0d0ff' : i % 3 === 0 ? '#a0c0ff' : '#fff';
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return c;
}

export function getFloorTexture(style: FloorStyleId = 'wood'): THREE.CanvasTexture {
  const cached = floorCache.get(style);
  if (cached) return cached;
  let canvas: HTMLCanvasElement;
  switch (style) {
    case 'parquet':
      canvas = woodPlankTexture(
        ['#5c3a1e', '#4e3018', '#6b4628', '#3f2a12'],
        '#2d1d0a', 0.45,
      );
      break;
    case 'marble':
      canvas = marbleTexture();
      break;
    case 'tileBlue':
      canvas = tileTexture('#60a5fa', '#2563eb');
      break;
    case 'concrete':
      canvas = concreteTexture();
      break;
    case 'galaxy':
      canvas = galaxyTexture();
      break;
    case 'wood':
    default:
      canvas = woodPlankTexture(
        ['#b9844c', '#a87338', '#c79053', '#9c6a30'],
        '#5b3712', 0.4,
      );
      break;
  }
  const tex = finalizeTexture(canvas);
  floorCache.set(style, tex);
  return tex;
}

// ── Wallpaper ────────────────────────────────────────────────────────

let cachedWallpaper: THREE.CanvasTexture | null = null;

export function getWallpaperTexture(): THREE.CanvasTexture {
  if (cachedWallpaper) return cachedWallpaper;
  const SIZE = 128;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;

  // Light translucent base — lets the shop's wallColor show through when
  // applied as a map on top of a coloured material.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Vertical stripes — 4 per texture tile.
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(i * (SIZE / 4), 0, 4, SIZE);
  }

  // Horizontal "wainscoting" line at the bottom 25% — adds dado-rail
  // detail to read as an interior wall.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, SIZE * 0.74, SIZE, 2);

  // Speckle for paint texture.
  const img = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < img.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 8;
    img.data[i] = clamp8(img.data[i] + j);
    img.data[i + 1] = clamp8(img.data[i + 1] + j);
    img.data[i + 2] = clamp8(img.data[i + 2] + j);
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  cachedWallpaper = tex;
  return tex;
}
