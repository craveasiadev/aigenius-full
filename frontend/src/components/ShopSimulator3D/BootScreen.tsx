import { useEffect, useState } from 'react';

interface BootScreenProps {
  hint?: string;
}

/**
 * Lightweight DOM-only loading screen with NO drei / three.js dependency.
 *
 * Used as the Suspense fallback for the lazy-loaded 3D simulator chunk,
 * so a loading view paints on the very first frame — before any of the
 * 3D engine code has even been parsed. Once the chunk has finished loading,
 * the heavier `LoadingProgress` (with real asset progress) takes over.
 *
 * Bundle cost: <1 KB. Visual style matches LoadingProgress so the swap
 * between the two is seamless.
 */
export function BootScreen({ hint = 'Preparing the 3D world…' }: BootScreenProps) {
  // Animated "fake" progress for the chunk-download phase. The browser
  // doesn't expose JS chunk download progress, so we creep the bar forward
  // at a believable rate and let it ease out asymptotically toward ~95%.
  const [pct, setPct] = useState(2);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      setPct((p) => {
        if (p >= 95) return 95;
        // Slows down as it approaches 95% so it doesn't reach 100 before the
        // chunk actually finishes.
        const speed = 8 + (95 - p) * 0.6;
        return Math.min(95, p + speed * dt);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const displayPct = Math.round(pct);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-gradient-to-br from-sky-400 via-cyan-500 to-teal-500 flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Loading 3D simulator"
    >
      {/* CSS-only animated blobs — no JS, no extra paints */}
      <div
        aria-hidden
        className="absolute top-10 left-10 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-pulse"
        style={{ animationDuration: '6s' }}
      />
      <div
        aria-hidden
        className="absolute bottom-20 right-16 w-96 h-96 rounded-full bg-emerald-300/20 blur-3xl animate-pulse"
        style={{ animationDuration: '7s' }}
      />

      <div className="relative flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" style={{ animationDuration: '1.2s' }} />
        <p className="text-white font-bold mt-5 text-xl tracking-wide">Loading your shop…</p>

        <div className="w-72 max-w-[80vw] h-2.5 mt-5 rounded-full bg-white/15 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-white to-cyan-100 rounded-full transition-[width] duration-150 ease-out"
            style={{ width: `${displayPct}%` }}
          />
        </div>
        <p className="text-white/95 text-xs mt-2 font-mono tabular-nums">{displayPct}%</p>

        <p className="text-white/85 text-sm mt-4 max-w-xs text-center px-4 leading-relaxed">{hint}</p>
      </div>
    </div>
  );
}
