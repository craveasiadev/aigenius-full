/**
 * DecorateModule — iso-world shop interior editor.
 *
 * Replaces the previous custom-3D RoomScene/FloorPlanEditor entirely.
 * The player is dropped into their My Shop interior (same iso camera +
 * Kenney furniture set as the rest of the game) and can:
 *
 *   • Pick a new wall colour from a palette.
 *   • Pick a new floor texture (wood / parquet / marble / tile / etc.).
 *   • Add any catalog furniture, which spawns at room centre.
 *   • Drag furniture across the floor — pointer-down on a piece picks
 *     it up; the camera pan stays locked until pointer-up so the room
 *     never slides out from under you. Pointer raycast onto y=0 gives
 *     true 2D drag in screen space at any zoom level.
 *   • Rotate by 90° / delete the selected piece via floating controls
 *     above the canvas.
 *   • Save — persists the full layout to `business.interior_config.iso_layout`.
 *
 * The whole thing is self-contained (it does NOT mount the wider iso
 * city scene) so we don't have to thread editor state through that
 * scene's state machine. When the user leaves we return to the dashboard
 * which renders the city as usual + reads the updated interior layout
 * the next time they enter their shop.
 */
import { Suspense, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Sun, Moon, Save, Loader2, Lightbulb,
  Plus, Palette, Square, Sofa, Sparkles, Check,
  X as XIcon, Scroll, Coins, Zap,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { useTheme } from '../contexts/ThemeContext';
import { Confetti } from '../components/Confetti';
import { SHOPS, type ShopDef } from '../components/iso/cityMap';
import { IsoShopInterior } from '../components/iso/IsoShopInterior';
import { usePanZoom, pointerToWorld } from '../components/iso/usePanZoom';
import {
  hydrateLayout,
  makeDefaultLayout,
  makeUid,
  getFloorBounds,
  isWallItem,
  WALL_BOUNDS,
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  WALL_COLORS,
  FLOOR_STYLES,
  ALL_FURNITURE_IDS,
  SHOP_TYPE_PRESETS,
  type FurnitureCategory,
  type FurnitureId,
  type FurnitureMeta,
  type IsoInteriorLayout,
  type IsoInteriorItem,
} from '../components/iso/interiorLayout';
import { getFurnitureThumbnail } from '../components/iso/furnitureThumbnails';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

const INTERIOR_PAN_BOUNDS = { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };

type Tab = 'walls' | 'floor' | 'furniture' | 'presets';

/** Preset entries displayed in the Presets tab. Keep this list in sync
 *  with SHOP_TYPE_PRESETS in interiorLayout.ts — only categories that
 *  have an actual preset factory should appear here. */
const PRESET_OPTIONS: Array<{ id: string; emoji: string; label: string; description: string }> = [
  { id: 'factory',     emoji: '🏭',  label: 'Factory',     description: 'Bigger floor, conveyors, robot arms' },
  { id: 'themepark',   emoji: '🎢',  label: 'Themepark',   description: 'Arcade cabinets, prize wheel, claw' },
  { id: 'fashion',     emoji: '👗',  label: 'Fashion',     description: 'Racks, mannequins, checkout' },
  { id: 'gym',         emoji: '🏋️', label: 'Gym',         description: 'Weights, benches, mats' },
  { id: 'restaurant',  emoji: '🍽️', label: 'Restaurant',  description: 'Sushi bar, dining tables, lanterns' },
  { id: 'supermarket', emoji: '🛒',  label: 'Supermarket', description: 'Aisles, freezers, checkout' },
];

/** Mounts the pan/zoom controller inside the Canvas. */
function CameraRig({ panLockRef }: { panLockRef: { current: boolean } }) {
  usePanZoom({
    bounds: INTERIOR_PAN_BOUNDS,
    initial: [0, 0, 0],
    minZoom: 30,
    maxZoom: 110,
    initialZoom: 50,
    lockRef: panLockRef,
  });
  return null;
}

/**
 * Listens to canvas-level pointer events to drive furniture drag.
 *
 * Lives inside the Canvas so it can read the live r3f camera + dom
 * element. The listeners are mounted ONCE and always-on; we gate them
 * with a ref (`activeDragRef.current`) instead of remounting the
 * effect each drag. That avoids a race where a very quick tap fires
 * `pointerup` before React has had a chance to re-render and attach a
 * listener — which would orphan the drag and leave the camera locked
 * forever.
 */
function DragController({
  activeDragRef,
  onDrag,
  onDrop,
}: {
  activeDragRef: React.MutableRefObject<string | null>;
  onDrag: (uid: string, x: number, z: number) => void;
  onDrop: () => void;
}) {
  const { camera, gl } = useThree();
  // Where the press started + whether we've crossed the drag threshold.
  // A pure tap (press + release without crossing the threshold) selects the
  // item only — it never moves it — so the Rotate/Delete controls appear on a
  // single press without needing to hold or drag.
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const el = gl.domElement;
    // px the finger must travel before a press becomes a drag. Generous
    // enough to absorb the wobble of a tap on a touchscreen.
    const DRAG_THRESHOLD = 8;

    const handleDown = (e: PointerEvent) => {
      startRef.current = { x: e.clientX, y: e.clientY };
      draggingRef.current = false;
    };
    const handleMove = (e: PointerEvent) => {
      const uid = activeDragRef.current;
      if (!uid) return;
      // Wait until the pointer clearly moves before relocating the piece.
      if (!draggingRef.current) {
        const start = startRef.current;
        if (start) {
          const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
          if (dist < DRAG_THRESHOLD) return; // still a tap, leave it put
        }
        draggingRef.current = true;
      }
      const world = pointerToWorld(camera, e.clientX, e.clientY, el);
      onDrag(uid, world.x, world.z);
    };
    const handleUp = () => {
      if (activeDragRef.current) onDrop();
      draggingRef.current = false;
      startRef.current = null;
    };

    // Listen at window level so a finger that drifts off the canvas
    // edge still gets the pointerup. Listeners are always mounted so
    // a sub-tick tap that fires pointerup before React re-renders
    // still reaches `handleUp` (and unlocks the camera).
    window.addEventListener('pointerdown', handleDown);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [camera, gl, onDrag, onDrop, activeDragRef]);

  return null;
}

export const DecorateModule = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { geniusProfile } = useGeniusAuth();
  const { business, updateBusiness } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();

  const playerShop: ShopDef = useMemo(() => {
    const base = SHOPS.find((s) => s.isPlayer) ?? SHOPS[0];
    const overrideName = geniusProfile?.aipreneur_shop_name;
    return overrideName ? { ...base, name: overrideName } : base;
  }, [geniusProfile?.aipreneur_shop_name]);

  const [layout, setLayout] = useState<IsoInteriorLayout>(() =>
    hydrateLayout(business?.interior_config),
  );
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory>('seating');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [dirty, setDirty] = useState(false);

  type ActiveQuest = {
    id: string;
    title: string;
    hint: string;
    emoji: string;
    route: string;
    reward: { xp: number; coins?: number; tokens?: number };
  };
  const [activeQuest, setActiveQuest] = useState<ActiveQuest | null>(() => {
    try {
      const raw = sessionStorage.getItem('aipreneur_active_quest');
      if (!raw) return null;
      const q = JSON.parse(raw) as ActiveQuest;
      return q && q.route === 'decorate' ? q : null;
    } catch {
      return null;
    }
  });
  const dismissQuest = useCallback(() => {
    try { sessionStorage.removeItem('aipreneur_active_quest'); } catch {}
    setActiveQuest(null);
  }, []);

  // Pan-lock ref shared with usePanZoom. While truthy, the camera
  // refuses pan/zoom gestures so a drag doesn't also slide the room.
  const panLockRef = useRef(false);
  // Currently-dragging item uid (kept as a ref, not state, so the
  // always-on DragController listeners can read it synchronously
  // without waiting for React to commit the next render).
  const activeDragRef = useRef<string | null>(null);
  // Timestamp of the most recent item selection. The floor's click
  // handler reads this and refuses to deselect if a piece was just
  // tapped — otherwise a tap-and-release on a piece propagates a
  // floor click that immediately clears the selection, leaving the
  // user unable to tap the new arrow pad / Rotate / Delete buttons.
  const lastSelectAtRef = useRef(0);
  // Wrapped setter that other code paths (FurnitureItem onSelect →
  // IsoShopInterior → here) call. When given a uid we mark the
  // timestamp so floor-click below can stay quiet for ~400ms.
  const selectItem = useCallback((uid: string | null) => {
    if (uid) lastSelectAtRef.current = Date.now();
    setSelectedUid(uid);
  }, []);
  // Floor-click deselect that respects the just-selected grace window
  // — passed in place of the raw setSelectedUid to IsoShopInterior's
  // floor `onItemSelect(null)` callback.
  const handleFloorDeselect = useCallback(() => {
    if (Date.now() - lastSelectAtRef.current < 400) return;
    setSelectedUid(null);
  }, []);
  const onItemSelectFromCanvas = useCallback((uid: string | null) => {
    if (uid === null) {
      handleFloorDeselect();
    } else {
      selectItem(uid);
    }
  }, [handleFloorDeselect, selectItem]);

  useEffect(() => {
    if (business?.interior_config) {
      setLayout(hydrateLayout(business.interior_config));
      setDirty(false);
    }
  }, [business?.interior_config]);

  const showToast = (msg: string, ms = 2200) => {
    setToast(msg);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), ms);
  };

  // The in-canvas <Html> popover floats above the tapped piece, but we
  // ALSO render a guaranteed-visible action bar just above the bottom
  // tab strip (see render block). This way, even if the in-canvas
  // bubble lands behind a chair / above the viewport / off-screen on a
  // weird zoom level, the kid always has a giant tappable Delete and
  // Rotate button somewhere on screen.
  const selectedItem = useMemo(
    () => (selectedUid ? layout.items.find((it) => it.uid === selectedUid) ?? null : null),
    [selectedUid, layout.items],
  );

  // ── Layout mutators ──────────────────────────────────────────────
  const setWallColor = useCallback((id: string) => {
    setLayout((prev) => ({ ...prev, wallColorId: id }));
    setDirty(true);
  }, []);

  const setFloorStyle = useCallback((id: typeof FLOOR_STYLES[number]['id']) => {
    setLayout((prev) => ({ ...prev, floorStyle: id }));
    setDirty(true);
  }, []);

  const addFurniture = useCallback((type: FurnitureId) => {
    const newItem: IsoInteriorItem = {
      uid: makeUid(),
      type,
      x: 0,
      z: 0,
      rot: 0,
    };
    setLayout((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedUid(newItem.uid);
    setDirty(true);
    showToast(`Added ${FURNITURE_CATALOG[type].name} — drag to move it`);
  }, []);

  const updateSelectedItem = useCallback((mut: (it: IsoInteriorItem) => IsoInteriorItem) => {
    if (!selectedUid) return;
    setLayout((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.uid === selectedUid ? mut(it) : it)),
    }));
    setDirty(true);
  }, [selectedUid]);

  const rotateSelected = useCallback(() => {
    updateSelectedItem((it) => ({ ...it, rot: (((it.rot + 1) % 4) as 0 | 1 | 2 | 3) }));
  }, [updateSelectedItem]);

  /** Precise one-step move for the selected piece — 0.25 m per tap on
   *  the on-screen directional pad. World-axis convention:
   *    +z = toward camera (front),  −z = toward back wall
   *    +x = right,                  −x = left
   *  So the UI arrows map: Up → −z, Down → +z, Left → −x, Right → +x.
   *  Wall items only move along x (z is locked to the back wall). All
   *  moves are clamped to the current layout's floor bounds. */
  const NUDGE_STEP = 0.25;
  const nudgeSelected = useCallback((dx: number, dz: number) => {
    if (!selectedUid) return;
    setLayout((prev) => {
      const b = getFloorBounds(prev);
      return {
        ...prev,
        items: prev.items.map((it) => {
          if (it.uid !== selectedUid) return it;
          if (isWallItem(it.type)) {
            // Wall art slides along x only.
            const nx = Math.max(WALL_BOUNDS.minX, Math.min(WALL_BOUNDS.maxX, it.x + dx));
            return { ...it, x: nx };
          }
          const nx = Math.max(b.minX, Math.min(b.maxX, it.x + dx));
          const nz = Math.max(b.minZ, Math.min(b.maxZ, it.z + dz));
          return { ...it, x: nx, z: nz };
        }),
      };
    });
    setDirty(true);
  }, [selectedUid]);

  const deleteSelected = useCallback(() => {
    if (!selectedUid) return;
    setLayout((prev) => ({ ...prev, items: prev.items.filter((it) => it.uid !== selectedUid) }));
    setSelectedUid(null);
    setDirty(true);
    showToast('Removed');
  }, [selectedUid]);

  const handleReset = useCallback(() => {
    if (!confirm('Reset to the default layout? Your changes will be lost.')) return;
    setLayout(makeDefaultLayout());
    setSelectedUid(null);
    setDirty(true);
    showToast('Reset to default layout');
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const factory = SHOP_TYPE_PRESETS[presetId];
    if (!factory) {
      showToast('That preset is not available yet', 2400);
      return;
    }
    if (!confirm(`Apply the ${presetId} preset? Your current layout will be replaced.`)) return;
    setLayout(factory());
    setSelectedUid(null);
    setDirty(true);
    showToast(`${presetId.charAt(0).toUpperCase()}${presetId.slice(1)} preset applied — Save to keep`);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await updateBusiness({
        interior_config: {
          ...(business?.interior_config || {}),
          iso_layout: layout,
        },
      });
      if (!ok) throw new Error('save failed');
      setDirty(false);
      setConfetti(true);
      showToast('Saved! Opening your shop…', 1500);
      if (activeQuest?.id === 'decorate-shop') {
        try { sessionStorage.removeItem('aipreneur_active_quest'); } catch {}
        setActiveQuest(null);
      }
      // After saving, hand the kid straight back into their shop
      // interior so they can SEE the layout they just designed. The
      // dashboard reads the `?enter=shop` query marker on mount and
      // auto-routes to the interior view of the player's shop.
      // 900ms delay lets the confetti pop play before the route swap.
      window.setTimeout(() => {
        setConfetti(false);
        navigate('/s/aipreneur?enter=shop', { state: { enterInterior: true } });
      }, 900);
    } catch (e) {
      console.error('Save failed', e);
      showToast('Save failed — try again.', 3000);
    } finally {
      setSaving(false);
    }
  }, [saving, updateBusiness, business?.interior_config, layout, activeQuest?.id, navigate]);

  // ── Drag handlers ────────────────────────────────────────────────
  const handleItemDragStart = useCallback((uid: string, _pointerId: number) => {
    panLockRef.current = true;
    activeDragRef.current = uid;
  }, []);

  const handleDragMove = useCallback((uid: string, x: number, z: number) => {
    setLayout((prev) => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.uid !== uid) return it;
        // Wall items slide along the back wall — clamp x to the wall
        // range, leave z alone so the renderer keeps them flush.
        if (isWallItem(it.type)) {
          const cx = Math.max(WALL_BOUNDS.minX, Math.min(WALL_BOUNDS.maxX, x));
          return { ...it, x: cx };
        }
        // Use the layout-aware bounds — factory preset's bigger floor
        // means items can move further out than ±5.4.
        const b = getFloorBounds(prev);
        const cx = Math.max(b.minX, Math.min(b.maxX, x));
        const cz = Math.max(b.minZ, Math.min(b.maxZ, z));
        return { ...it, x: cx, z: cz };
      }),
    }));
    setDirty(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    panLockRef.current = false;
    activeDragRef.current = null;
  }, []);

  const dark = theme === 'dark';

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className={`${PAGE} flex flex-col h-screen overflow-hidden touch-manipulation`}>
      <StarfieldBackground /><DottedBackground />
      {confetti && <Confetti show />}

      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-6xl mx-auto px-3 h-16 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (dirty && !confirm('You have unsaved changes. Leave anyway?')) return;
              smartBack();
            }}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <h1 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
            <Palette className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            <span className="truncate">Decorate</span>
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            >
              {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className={`${BTN_3D_PRIMARY} min-h-[40px] px-3 text-sm`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>
        </div>
      </header>

      {/* Active quest banner — shown when the player arrived here from
          the Today's Quests panel, so they don't forget what to do. */}
      <AnimatePresence>
        {activeQuest && (
          <motion.div
            key="active-quest"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="px-3 pt-3"
          >
            <div className="max-w-6xl mx-auto rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-300 dark:border-amber-400/40 px-3 py-2.5 flex items-start gap-2.5 shadow-sm">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 border-b-[3px] border-orange-600 shrink-0 text-base">
                {activeQuest.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-black text-amber-700 dark:text-amber-300">
                    <Scroll className="w-3 h-3" /> Current Quest
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200">
                    +{activeQuest.reward.xp} XP
                  </span>
                  {activeQuest.reward.coins && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-yellow-200/70 dark:bg-yellow-500/15 text-yellow-900 dark:text-yellow-200 text-[10px] font-bold">
                      <Coins className="w-3 h-3" />
                      {activeQuest.reward.coins}
                    </span>
                  )}
                  {activeQuest.reward.tokens && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-200/70 dark:bg-violet-500/15 text-violet-900 dark:text-violet-200 text-[10px] font-bold">
                      <Zap className="w-3 h-3" />
                      {activeQuest.reward.tokens}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-sm font-black text-slate-900 dark:text-white leading-tight">
                  {activeQuest.title}
                </div>
                <p className="text-xs text-slate-700 dark:text-amber-100/90 mt-0.5 leading-snug">
                  {activeQuest.hint} Tap <strong>Save</strong> when you're happy with your room
                  to finish this quest.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissQuest}
                aria-label="Dismiss quest reminder"
                className="shrink-0 w-7 h-7 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-slate-600 dark:text-white/70 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson banner */}
      <div className="px-3 pt-3">
        <div className="max-w-6xl mx-auto rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 px-3 py-2 flex items-start gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
            <Lightbulb className="w-3.5 h-3.5 text-white" />
          </span>
          <p className="text-xs text-violet-900 dark:text-violet-100">
            <strong>Drag a piece to move it.</strong> Tap to select it, then use the controls
            above the room to rotate or delete. Pick walls / floors / new furniture from the
            panels below.
          </p>
        </div>
      </div>

      {/* Iso scene */}
      <main className="flex-1 relative overflow-hidden">
        <Canvas
          orthographic
          dpr={[0.75, 1.25]}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: true,
            toneMapping: THREE.NoToneMapping,
          }}
          frameloop="always"
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.7} />
          <hemisphereLight args={['#fff7d1', '#3a6b22', 0.35]} />
          <directionalLight position={[12, 18, 8]} intensity={0.9} color="#fff8e0" />
          <CameraRig panLockRef={panLockRef} />
          <DragController
            activeDragRef={activeDragRef}
            onDrag={handleDragMove}
            onDrop={handleDragEnd}
          />
          <Suspense fallback={null}>
            <IsoShopInterior
              shop={playerShop}
              layout={layout}
              editMode
              selectedUid={selectedUid}
              onItemSelect={onItemSelectFromCanvas}
              onItemDragStart={handleItemDragStart}
              onNudgeSelected={nudgeSelected}
              onRotateSelected={rotateSelected}
              onDeleteSelected={deleteSelected}
            />
          </Suspense>
        </Canvas>

        {/* The selected-item action bar USED to live here as a fixed
            strip at the bottom of the screen. It's now an in-canvas
            <Html> popover (see IsoShopInterior's FloatingActionBar) so
            it tracks the piece in 3D — when the kid nudges a chair
            with the arrows or drags it, the bar slides with the
            chair. Rotate / Delete / arrow handlers are passed through
            via onRotateSelected / onDeleteSelected / onNudgeSelected. */}

        {/* ── Bottom editor sheet ───────────────────────────────────
            Tabs (Walls / Floor / Furniture / Presets) + any expanded
            palette below them. The whole sheet slides DOWN and fades
            out the moment a furniture piece is selected — the selected
            action bar above takes over the bottom screen real-estate
            so the kid isn't fighting overlapping UI while moving a
            chair. Re-appears as soon as nothing is selected. */}
        <AnimatePresence>
        {!selectedItem && (
        <motion.div
          key="bottom-editor-sheet"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="absolute left-0 right-0 bottom-0 z-10 pointer-events-none flex justify-center px-3"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          <div className="w-full max-w-3xl pointer-events-auto">
            {/* Tab pills */}
            <div className={`${GLASS} rounded-2xl p-1.5 flex gap-1 mb-2`}>
              <TabButton
                active={tab === 'walls'}
                icon={<Palette className="w-4 h-4" />}
                label="Walls"
                onClick={() => setTab(tab === 'walls' ? null : 'walls')}
              />
              <TabButton
                active={tab === 'floor'}
                icon={<Square className="w-4 h-4" />}
                label="Floor"
                onClick={() => setTab(tab === 'floor' ? null : 'floor')}
              />
              <TabButton
                active={tab === 'furniture'}
                icon={<Sofa className="w-4 h-4" />}
                label="Furniture"
                onClick={() => setTab(tab === 'furniture' ? null : 'furniture')}
              />
              <TabButton
                active={tab === 'presets'}
                icon={<Sparkles className="w-4 h-4" />}
                label="Presets"
                onClick={() => setTab(tab === 'presets' ? null : 'presets')}
              />
              <button
                type="button"
                onClick={handleReset}
                className={`${GLASS} ${GLASS_HOVER} ml-auto px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            <AnimatePresence>
              {tab && (
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 14 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                  className={`${GLASS} rounded-3xl p-3 max-h-[40vh] overflow-y-auto`}
                >
                  {tab === 'walls' && (
                    <WallPalette activeId={layout.wallColorId} onPick={setWallColor} />
                  )}
                  {tab === 'floor' && (
                    <FloorPalette
                      activeId={layout.floorStyle}
                      onPick={(id) => setFloorStyle(id)}
                    />
                  )}
                  {tab === 'furniture' && (
                    <FurniturePalette
                      activeCategory={furnitureCategory}
                      onCategory={setFurnitureCategory}
                      onAdd={addFurniture}
                    />
                  )}
                  {tab === 'presets' && (
                    <PresetPalette onApply={applyPreset} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-[8.5rem] z-[9999]"
          >
            <div className={`${GLASS} px-4 py-2.5 rounded-2xl flex items-center gap-2`}>
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-violet-600 border-b-[3px] border-violet-800">
                <Check className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────

function TabButton({ active, icon, label, onClick }: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl text-sm font-bold transition-colors',
        active
          ? 'bg-violet-600 text-white border-b-[3px] border-violet-800'
          : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

function WallPalette({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400 mb-2">
        Wall colour
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {WALL_COLORS.map((c) => {
          const active = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-label={c.name}
              title={c.name}
              className={[
                'aspect-square rounded-xl border-b-[3px] flex items-center justify-center transition-transform',
                active
                  ? 'ring-2 ring-violet-500 dark:ring-violet-400 scale-105'
                  : 'hover:scale-105 active:scale-95',
              ].join(' ')}
              style={{ background: c.hex, borderBottomColor: 'rgba(0,0,0,0.18)' }}
            >
              {active && <Check className="w-4 h-4 text-slate-900/70" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FloorPalette({ activeId, onPick }: {
  activeId: string;
  onPick: (id: typeof FLOOR_STYLES[number]['id']) => void;
}) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400 mb-2">
        Floor style
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {FLOOR_STYLES.map((f) => {
          const active = f.id === activeId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(f.id)}
              className={[
                'rounded-xl p-1.5 border border-slate-200 dark:border-white/10 transition-transform',
                active
                  ? 'ring-2 ring-violet-500 dark:ring-violet-400 bg-violet-50 dark:bg-violet-500/10'
                  : 'bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              <span
                className="block w-full aspect-square rounded-lg border-b-[3px] border-black/15"
                style={{ background: f.swatch }}
              />
              <p className="text-[10px] font-bold mt-1 text-slate-700 dark:text-slate-200 truncate">
                {f.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FurniturePalette({ activeCategory, onCategory, onAdd }: {
  activeCategory: FurnitureCategory;
  onCategory: (c: FurnitureCategory) => void;
  onAdd: (id: FurnitureId) => void;
}) {
  const items = ALL_FURNITURE_IDS
    .map((id) => FURNITURE_CATALOG[id])
    .filter((m) => m.category === activeCategory);
  return (
    <div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2">
        {FURNITURE_CATEGORIES.map((c) => {
          const active = c.id === activeCategory;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onCategory(c.id)}
              className={[
                'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors',
                active
                  ? 'bg-violet-600 text-white border-b-[2px] border-violet-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700',
              ].join(' ')}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {items.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onAdd(m.id)}
            className="group relative rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-500/40 p-2 transition-colors active:scale-95"
            title={`Add ${m.name}`}
          >
            <span className="block w-full aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700/50 dark:to-slate-800/60 overflow-hidden mb-1.5">
              <FurnitureThumb meta={m} />
            </span>
            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate text-center">
              {m.name}
            </p>
            {/* "Add" affordance — a small + badge that brightens on hover so
                it's obvious tapping a preview places that item. */}
            <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white shadow-md opacity-80 group-hover:opacity-100 group-active:scale-90 transition">
              <Plus className="w-3 h-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Quick-preset palette — one-tap apply of a themed full-shop layout.
 * Each preset replaces the current furniture with a curated arrangement
 * matching that shop type (supermarket aisles, etc.). The user still has
 * to tap Save to persist — the preset is a starting point, not a commit.
 */
function PresetPalette({ onApply }: { onApply: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
        Apply a ready-made layout for your shop type. You can still edit after.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PRESET_OPTIONS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p.id)}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 hover:bg-violet-50 dark:hover:bg-violet-500/15 hover:border-violet-400 dark:hover:border-violet-500/50 active:scale-[0.98] transition-all text-left touch-manipulation min-h-[64px]"
          >
            <span className="text-3xl flex-shrink-0" aria-hidden>{p.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {p.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {p.description}
              </div>
            </div>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-300 whitespace-nowrap">
              Apply →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 3D preview tile for a catalog item.
 *  • Real furniture → a rendered PNG of its GLB (so a Fridge actually looks
 *    like a fridge instead of a generic "+").
 *  • Wall-art frames → a coloured frame swatch, since those aren't GLB models
 *    (the scene draws them as flat planes from `frameBorderHex/frameFillHex`).
 */
function FurnitureThumb({ meta }: { meta: FurnitureMeta }) {
  const isFrame = meta.mount === 'wall' && !!meta.frameBorderHex;
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isFrame) return;
    let active = true;
    setSrc(null);
    setFailed(false);
    getFurnitureThumbnail(meta.path)
      .then((url) => { if (active) setSrc(url); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [meta.path, isFrame]);

  if (isFrame) {
    return (
      <span className="flex items-center justify-center w-full h-full">
        <span
          className="w-3/5 h-3/5 rounded-sm border-[3px]"
          style={{ borderColor: meta.frameBorderHex, backgroundColor: meta.frameFillHex }}
        />
      </span>
    );
  }

  if (failed) {
    // Last-resort fallback keeps the tile meaningful if a render fails.
    return (
      <span className="flex items-center justify-center w-full h-full text-violet-500 dark:text-violet-300">
        <Sofa className="w-5 h-5" />
      </span>
    );
  }

  if (!src) {
    return (
      <span className="flex items-center justify-center w-full h-full">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      </span>
    );
  }

  return <img src={src} alt={meta.name} className="w-full h-full object-contain" loading="lazy" />;
}

export default DecorateModule;
