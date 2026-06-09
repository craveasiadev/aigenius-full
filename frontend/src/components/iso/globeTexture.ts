/**
 * Procedural Earth texture for the WorldGlobeHub.
 *
 * Painted into a single equirectangular canvas (2:1 aspect — the texture
 * wraps a sphere with no seam). The continents are hand-placed blob
 * silhouettes sized to roughly match the real world (Eurasia + Africa
 * spanning the central longitudes, Americas on the opposite hemisphere,
 * Australia + Antarctica filling the south).
 *
 * The result is intentionally stylised — flat-shaded greens and blues
 * with subtle noise — to match the Kenney low-poly buildings rather
 * than a photoreal satellite image. Cached the first time it's called.
 */
import * as THREE from 'three';

let cached: THREE.CanvasTexture | null = null;

function clamp8(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Soft-edged ellipse painted onto the canvas. We approximate "soft" by
 * drawing the shape twice — once with a wider radius at lower alpha,
 * then again at the actual radius — so the coastline feathers a few
 * pixels instead of pixel-perfect aliasing into the ocean.
 */
function paintBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  // Halo (acts as the coast fade).
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
  ctx.fill();
  // Solid centre.
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function getGlobeTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // ── Ocean ────────────────────────────────────────────────────────
  // Soft vertical gradient — slightly darker toward the poles (north +
  // south) so the sphere has a bit of latitudinal banding.
  const ocean = ctx.createLinearGradient(0, 0, 0, H);
  ocean.addColorStop(0,    '#1f3a8a'); // deep arctic
  ocean.addColorStop(0.35, '#2563eb'); // bright surface
  ocean.addColorStop(0.55, '#1d4ed8');
  ocean.addColorStop(0.75, '#2563eb');
  ocean.addColorStop(1,    '#1e3a8a'); // deep antarctic
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, W, H);

  // Latitudinal stipple — gives the ocean a tiny bit of texture.
  for (let i = 0; i < 600; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(x, y, 1.5, 1);
  }

  // ── Continents ───────────────────────────────────────────────────
  // The world wraps horizontally — x ∈ [0, W) maps to longitude
  // [-180°, +180°). Greenwich is at x = W/2. y ∈ [0, H) maps to
  // latitude [+90°, -90°] (top is north pole).
  //
  // We pick blob centres + sizes that match the real continents
  // roughly. This isn't accurate cartography — it just gives the
  // globe a recognisable Earth-ish silhouette.

  const land = '#22c55e';      // green-500
  const landDark = '#16a34a';  // green-600 (interior accent)
  const desert = '#facc15';    // amber (north Africa / Australia spots)
  const ice = '#f1f5f9';       // slate-100 (poles)

  // Eurasia + N. Africa — the long landmass straddling the central
  // longitudes from western Europe across to East Asia.
  paintBlob(ctx, W * 0.55, H * 0.32, 230, 80, -0.15, land);   // main mass
  paintBlob(ctx, W * 0.52, H * 0.30, 80,  35,  0.2,  landDark); // Europe accent
  paintBlob(ctx, W * 0.68, H * 0.38, 110, 55, -0.05, land);   // South Asia / India
  paintBlob(ctx, W * 0.78, H * 0.32, 95,  45,  0.1,  land);   // East Asia
  // Africa — south of Europe, slightly east.
  paintBlob(ctx, W * 0.55, H * 0.55, 90, 120, -0.05, land);
  paintBlob(ctx, W * 0.53, H * 0.45, 60, 45, 0,     desert); // Sahara
  // The Americas — opposite hemisphere from Eurasia.
  paintBlob(ctx, W * 0.22, H * 0.32, 110, 80,  0.1,  land);  // N. America
  paintBlob(ctx, W * 0.20, H * 0.28, 50, 35, -0.1,  landDark); // accent
  paintBlob(ctx, W * 0.26, H * 0.65, 70, 110, 0.2,  land);   // S. America
  // Australia + Oceania.
  paintBlob(ctx, W * 0.86, H * 0.62, 90, 50, 0,    land);
  paintBlob(ctx, W * 0.87, H * 0.62, 50, 25, 0,    desert); // central outback
  // Antarctica.
  ctx.fillStyle = ice;
  ctx.fillRect(0, H - 50, W, 50);
  // Greenland / Arctic.
  paintBlob(ctx, W * 0.35, H * 0.10, 70, 25, -0.1, ice);
  paintBlob(ctx, W * 0.50, H * 0.08, 90, 18, 0,    ice);

  // ── Per-pixel jitter ─────────────────────────────────────────────
  // Roughens edges and adds organic noise so the continents don't read
  // as a clip-art map. Small per-channel offset.
  const img = ctx.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const j = (Math.random() - 0.5) * 10;
    img.data[i]     = clamp8(img.data[i]     + j);
    img.data[i + 1] = clamp8(img.data[i + 1] + j);
    img.data[i + 2] = clamp8(img.data[i + 2] + j);
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
