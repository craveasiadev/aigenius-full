/**
 * Client-side image optimisation.
 *
 * Why client-side: a workshop event uploads a 3-5 MB phone photo per
 * shop. Sending that to Laravel uncompressed wastes bandwidth, queues
 * up image-processing workers, and bloats S3 storage. Doing a
 * conservative resize + JPEG re-encode in the browser knocks ~85-95 %
 * off the byte count before the upload even leaves the device — the
 * backend can still apply its own polish (intervention/image at q=85,
 * thumbnail variants, EXIF strip) but starts from a much smaller
 * blob.
 *
 * Defaults are tuned for "globe building art" — a square-ish PNG
 * showing a shop's storefront. Max dimension 1280 px keeps it crisp
 * on the WorldGlobeHub billboard plane at every zoom level the
 * carousel offers. JPEG quality 0.82 is the sweet spot where the eye
 * stops noticing artefacts on stylised cartoon shop art.
 */

export interface OptimiseImageOptions {
  /** Longest edge after resize. Default 1280. */
  maxDim?: number;
  /** JPEG quality 0–1. Default 0.82 (≈ 85% storage saved vs source). */
  quality?: number;
  /** Output mime — `image/jpeg` (default) or `image/webp` if the
   *  caller knows the backend accepts WebP. */
  mime?: 'image/jpeg' | 'image/webp';
}

export interface OptimisedImage {
  /** Base-64 data URL — drop this straight into JSON / FormData. */
  dataUrl: string;
  /** Final blob (e.g. for FormData upload). */
  blob: Blob;
  /** Original byte size. */
  originalBytes: number;
  /** Optimised byte size. */
  optimisedBytes: number;
  /** Resulting longest edge after resize. */
  outputDim: { width: number; height: number };
}

/**
 * Read a File / Blob → resize on a canvas → re-encode at the chosen
 * quality → return both a data URL (handy for previews + JSON APIs)
 * and the underlying Blob (handy for FormData uploads).
 *
 * Falls back to passing the source through untouched if the runtime
 * has no canvas or fails to decode — caller still gets a `dataUrl`,
 * just at the original size. That keeps the upload path simple: one
 * code path whether the browser cooperates or not.
 */
export async function optimiseImage(
  source: File | Blob,
  opts: OptimiseImageOptions = {},
): Promise<OptimisedImage> {
  const maxDim = opts.maxDim ?? 1280;
  const quality = opts.quality ?? 0.82;
  const mime = opts.mime ?? 'image/jpeg';
  const originalBytes = source.size;

  if (typeof document === 'undefined' || typeof createImageBitmap === 'undefined') {
    // SSR or a really old browser. Pass-through.
    const dataUrl = await blobToDataUrl(source);
    return {
      dataUrl, blob: source, originalBytes,
      optimisedBytes: source.size,
      outputDim: { width: 0, height: 0 },
    };
  }

  // Decode → canvas → re-encode. We use createImageBitmap because
  // it's the only widely-supported async decoder that respects EXIF
  // orientation, so portrait phone photos don't end up sideways.
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source, { imageOrientation: 'from-image' });
  } catch {
    // Decoding failed — degrade to pass-through.
    const dataUrl = await blobToDataUrl(source);
    return {
      dataUrl, blob: source, originalBytes,
      optimisedBytes: source.size,
      outputDim: { width: 0, height: 0 },
    };
  }

  const { width: srcW, height: srcH } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    const dataUrl = await blobToDataUrl(source);
    return {
      dataUrl, blob: source, originalBytes,
      optimisedBytes: source.size,
      outputDim: { width: srcW, height: srcH },
    };
  }
  // imageSmoothingEnabled high gives noticeably nicer downscales —
  // worth the extra ms on a phone given we're saving ~90 % bytes.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas.toBlob returned null'))),
      mime, quality,
    );
  });
  const dataUrl = await blobToDataUrl(blob);

  return {
    dataUrl, blob, originalBytes,
    optimisedBytes: blob.size,
    outputDim: { width: w, height: h },
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Pretty-print the savings — handy for upload UIs. */
export function formatSavings(o: OptimisedImage): string {
  const saved = 1 - o.optimisedBytes / Math.max(1, o.originalBytes);
  const pct = Math.round(saved * 100);
  const fromKb = Math.round(o.originalBytes / 1024);
  const toKb = Math.round(o.optimisedBytes / 1024);
  return `${pct}% smaller (${fromKb} KB → ${toKb} KB)`;
}
