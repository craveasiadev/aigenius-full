/**
 * /demo — public demo of the AIpreneur world.
 *
 * Flow:
 *   1. WorldGlobeHub — full-screen "Hello, Demo!" greeting + a 3D
 *      Earth globe with the city's shops sitting on the equator. The
 *      player swipes/clicks to spin the globe and pick a shop.
 *   2. IsoScene — once a shop is picked, the iso world mounts and the
 *      camera focuses on that shop. From there it's the same demo
 *      experience as before.
 *
 * The hub adds a "real game-style" gateway in front of the iso scene,
 * so the demo doesn't drop the visitor straight onto an unfamiliar
 * isometric map.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { IsoScene } from '../components/iso';
import { WorldGlobeHub, type GlobeBuilding } from '../components/iso/WorldGlobeHub';
import { SHOPS } from '../components/iso/cityMap';
import {
  DEMO_INTERIOR_EVENT,
  getDemoInterior,
  setDemoInterior,
} from '../lib/demoState';
import type { IsoInteriorLayout } from '../components/iso/interiorLayout';

// Demo carousel — the two real-brand PNG shops the user supplied in
// `public/assets/World/`. Each entry sets `imagePath`, so the globe
// hub renders them as billboard planes + 3D pedestals instead of
// Kenney commercial GLBs.
//
// (When more PNG shop art is added we can plug them in here; the
// hub also still supports `buildingId` for the Kenney fallback.)
const HUB_BUILDINGS: GlobeBuilding[] = [
  { id: 'zus',        name: 'Zus',        imagePath: '/assets/World/Zus.png' },
  { id: 'mamee',      name: 'Mamee',      imagePath: '/assets/World/Mamee.png' },
  { id: 'junglegym',  name: 'Jungle Gym', imagePath: '/assets/World/junglegym.png' },
  { id: 'airasia',    name: 'AirAsia',    imagePath: '/assets/World/airport.png' },
];

// Suppress an "unused import" warning if we later want the Kenney
// fallback list back. Keep the catalogue in scope without referencing
// it on the hot path.
void SHOPS;

// Pre-warm the boot loader as soon as a client-side nav to /demo starts.
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
  window.__shopBootClaimed = true;
  window.__shopBootLabel?.('Spinning up the world…');
  window.__shopBootHint?.('Pick a shop on the globe');
  window.__shopBootProgress?.(40);
}

// sessionStorage key that survives navigation to /demo/<module> and
// back. Cleared automatically when the tab closes — which is the
// right "fresh session" behaviour for a marketing demo. The value is
// the string 'iso' or 'hub' (no JSON parsing) so the read path is
// trivially fast on mount.
const DEMO_STAGE_KEY = 'aipreneur_demo_stage';

export function DemoPage() {
  // 'hub' shows the globe carousel; 'iso' shows the iso world after a
  // shop is picked. Restored from sessionStorage so navigating into a
  // demo module page (/demo/decorate, /demo/product, …) and back
  // doesn't kick the visitor out of the iso world they were in. Tab
  // close still resets to hub — that's intentional.
  const [stage, setStage] = useState<'hub' | 'iso'>(() => {
    if (typeof window === 'undefined') return 'hub';
    return sessionStorage.getItem(DEMO_STAGE_KEY) === 'iso' ? 'iso' : 'hub';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { sessionStorage.setItem(DEMO_STAGE_KEY, stage); } catch { /* ignore */ }
  }, [stage]);

  // Demo-only shop interior. Persisted in localStorage under a key
  // that's intentionally distinct from anything `useAIpreneur` reads,
  // so a visitor's tinkering on /demo never overwrites a logged-in
  // student's saved `business.interior_config`. The iso scene picks
  // it up via the `playerInteriorLayout` prop.
  const [demoInterior, setDemoInteriorState] = useState<IsoInteriorLayout>(getDemoInterior);

  // Listen for changes the modal-side Decorate sheet writes. Same-tab
  // updates fire `DEMO_INTERIOR_EVENT`; cross-tab updates fire the
  // browser's native `storage` event.
  useEffect(() => {
    const refresh = () => setDemoInteriorState(getDemoInterior());
    window.addEventListener(DEMO_INTERIOR_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(DEMO_INTERIOR_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  // Wrapper passed to the iso scene's Decorate flow so any save it
  // does goes through our localStorage helper (and broadcasts the
  // change event). Used by the DemoModal decorate panel.
  const updateDemoInterior = (next: IsoInteriorLayout) => {
    setDemoInterior(next);
    setDemoInteriorState(next);
  };
  // Suppress an "unused" warning when the modal-decorate integration
  // is reading via prop drilling — kept as part of the public API of
  // this page even when the current branch doesn't reach it.
  void updateDemoInterior;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.__shopBootClaimed) {
      window.__shopBootClaimed = true;
      window.__shopBootShow?.('Spinning up the world…', 'Pick a shop on the globe');
    }
    window.__shopBootProgress?.(70);
    // The hub renders quickly — dismiss the boot loader once we're
    // about to paint.
    window.__shopBootDone?.();
  }, []);

  if (stage === 'hub') {
    return (
      <div className="relative w-screen h-screen overflow-hidden">
        <WorldGlobeHub
          name="Demo User"
          buildings={HUB_BUILDINGS}
          onEnter={() => setStage('iso')}
          onBack={undefined}
        />

        {/* Back to landing — sits over the hub's own top bar. */}
        <Link
          to="/"
          aria-label="Back to home"
          className="fixed z-50 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full bg-slate-900/85 backdrop-blur-md text-white text-xs font-semibold border border-white/10 active:scale-95 transition-all touch-manipulation"
          style={{
            top: 'max(env(safe-area-inset-top), 12px)',
            left: 'max(env(safe-area-inset-left), 12px)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Home</span>
        </Link>

        {/* Sign-up CTA — top-right, mirrors the iso view. */}
        <div
          className="fixed z-50"
          style={{
            top: 'max(env(safe-area-inset-top), 12px)',
            right: 'max(env(safe-area-inset-right), 12px)',
          }}
        >
          <Link
            to="/register"
            className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-violet-600 text-white text-xs font-bold shadow-md border-b-[3px] border-violet-800 active:translate-y-[2px] active:border-b-[1px] transition-[transform,border-bottom-width] duration-100 touch-manipulation"
          >
            <span className="hidden sm:inline">Create account</span>
            <span className="sm:hidden">Sign up</span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Iso world ─────────────────────────────────────────────────────
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      <IsoScene playerInteriorLayout={demoInterior} />

      {/* Back to hub — replaces the previous "back to landing" link so
       *  the user can return to the globe carousel without leaving the
       *  demo entirely. */}
      <button
        type="button"
        onClick={() => setStage('hub')}
        className="fixed z-50 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full bg-slate-900/75 backdrop-blur-md text-white text-xs font-semibold border border-white/10 active:scale-95 transition-all touch-manipulation"
        style={{
          top: 'max(env(safe-area-inset-top), 12px)',
          left: 'max(env(safe-area-inset-left), 12px)',
        }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Back to globe</span>
      </button>

      {/* Sign-up CTA — top-right. */}
      <div
        className="fixed z-50"
        style={{
          top: 'max(env(safe-area-inset-top), 12px)',
          right: 'max(env(safe-area-inset-right), 12px)',
        }}
      >
        <Link
          to="/register"
          className="inline-flex items-center min-h-[40px] px-4 rounded-full bg-white text-slate-900 text-xs font-bold shadow-md active:scale-95 transition-transform touch-manipulation"
        >
          <span className="hidden sm:inline">Create account</span>
          <span className="sm:hidden">Sign up</span>
        </Link>
      </div>

    </div>
  );
}
