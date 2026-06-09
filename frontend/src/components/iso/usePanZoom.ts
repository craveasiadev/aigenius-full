import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Pan + zoom controller for an orthographic iso camera.
 *
 * Design: instead of moving the camera in screen-space pixels, we track
 * **the world point under the user's finger/cursor**. On every pointer
 * move, we adjust the camera target so that the originally-grabbed world
 * point ends up exactly under the current cursor position. This makes
 * panning feel "physical" — the map slides with your finger regardless
 * of zoom level or screen size.
 *
 * Same idea as how Google Maps, Roblox studio, and every other 2D map
 * drag works. The maths is just "raycast pointer onto y=0 plane, diff
 * before/after, apply".
 *
 * Touch pinch-zoom: two-finger gesture where the camera's `zoom` scales
 * with the ratio between current finger-distance and start finger-distance.
 *
 * Mouse-wheel zoom: scroll wheel multiplies zoom by 1 ± wheelDelta * speed.
 *
 * All inputs are bound to a target ref + zoom ref instead of state, so
 * pointer-move never triggers a React re-render — the camera updates each
 * frame via `useFrame`, lerping toward the targets.
 */

const ISO_OFFSET = new THREE.Vector3(14, 18, 14);
const CAM_LOOK_Y = 0.4;

export interface PanZoomBounds {
  /** Allowed XZ rectangle the camera target can roam inside. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PanZoomOptions {
  bounds: PanZoomBounds;
  /** Initial target position (camera centres here on first frame). */
  initial?: [number, number, number];
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  /** How fast the camera position lerps toward the target (1 = snap). */
  follow?: number;
  /** When `current` is `true`, all pan/zoom gestures are ignored. Used
   *  by the iso decorate editor so dragging a furniture piece never
   *  also slides the camera under it. The caller flips this on at the
   *  start of an item drag and off again on pointerup. */
  lockRef?: { current: boolean };
}

/**
 * Raycast pointer (screen-space px) onto the y=0 plane and return the world
 * point under it. Works for any rotated orthographic camera — three.js
 * handles the projection maths for us.
 */
export function pointerToWorld(
  camera: THREE.OrthographicCamera,
  px: number,
  py: number,
  el: HTMLElement,
): THREE.Vector3 {
  const rect = el.getBoundingClientRect();
  const ndcX = ((px - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((py - rect.top) / rect.height) * 2 + 1;
  // For an orthographic camera, unprojecting gives the world-space ray
  // origin on the near plane. Direction is the camera's forward vector.
  const origin = new THREE.Vector3(ndcX, ndcY, -1).unproject(camera);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  // Intersect the ray with y = 0.
  // origin + t * forward intersects y=0 when t = -origin.y / forward.y.
  if (Math.abs(forward.y) < 1e-5) return new THREE.Vector3(origin.x, 0, origin.z);
  const t = -origin.y / forward.y;
  return origin.clone().add(forward.clone().multiplyScalar(t));
}

export function usePanZoom({
  bounds,
  initial = [0, 0, 0],
  // Zoom = pixels per world unit. Defaults sized for a ~15×11-tile city map:
  //   • minZoom 22  → ~58 world units across a 1280 px canvas (whole map + margin)
  //   • maxZoom 90  → ~14 world units across (~5 tiles, good for inspecting one shop)
  //   • initialZoom 42  → ~30 world units across (city centred with shops in frame)
  minZoom = 22,
  maxZoom = 90,
  initialZoom = 42,
  follow = 0.22,
  lockRef,
}: PanZoomOptions) {
  const { camera, gl, size } = useThree();

  // Target the camera is trying to centre on (lerped each frame).
  const target = useRef(new THREE.Vector3(...initial));
  // Settled (snapped) target for camera lerp.
  const settled = useRef(new THREE.Vector3(...initial));
  // Zoom in CSS pixels per world unit (Three.js OrthographicCamera.zoom).
  const zoom = useRef(initialZoom);

  // Refs for in-flight gestures.
  // `startScreen` is the raw clientX/Y at pointerdown — we only promote a
  // press into a real drag (and pointer-capture) once the user moves past
  // `DRAG_THRESHOLD_PX`. That keeps stationary taps reaching the R3F
  // onClick handlers on buildings — pointer-capture is sticky and was
  // swallowing the click event on My Shop and other shops at iso angles.
  const drag = useRef<{
    pointerId: number;
    startTarget: THREE.Vector3;
    pickedWorld: THREE.Vector3;
    startScreen: { x: number; y: number };
    active: boolean;
  } | null>(null);
  const pinch = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    startDist: number;
    startZoom: number;
  } | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  // Pixels of movement before a press is promoted to a drag. Below this
  // threshold, taps reach R3F's click handler on buildings normally.
  const DRAG_THRESHOLD_PX = 6;

  // Set up the camera frustum + zoom whenever the viewport changes.
  //
  // We use a PIXEL-based frustum (left/right/top/bottom in canvas pixels)
  // so `zoom` reads as "pixels per world unit". With this convention:
  //
  //     visible world width  = canvas_width_px  / zoom
  //     visible world height = canvas_height_px / zoom
  //
  // Concretely, a 1280×800 canvas at zoom=40 shows 32×20 world units,
  // which fits the whole city comfortably with a margin. The earlier
  // setup used a normalised [-aspect, aspect] frustum then divided by
  // zoom, which collapsed the visible area down to ~0.1 world units —
  // one plaza tile blew up to fill the screen.
  useEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.left = -size.width / 2;
    camera.right = size.width / 2;
    camera.top = size.height / 2;
    camera.bottom = -size.height / 2;
    camera.near = -1000;
    camera.far = 1000;
    camera.zoom = zoom.current;
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  // ── Pointer handlers ──────────────────────────────────────────────
  useEffect(() => {
    const el = gl.domElement;
    if (!(camera instanceof THREE.OrthographicCamera)) return;

    // Without `touch-action: none`, mobile browsers (and the Capacitor
    // WebView) intercept single-finger drag as a page-scroll gesture
    // BEFORE pointermove fires here, so the camera never pans. The
    // parent <div> already sets this, but pinning it on the canvas
    // itself defends against ancestor styles being overridden.
    const prevTouchAction = el.style.touchAction;
    el.style.touchAction = 'none';

    const onPointerDown = (e: PointerEvent) => {
      // Skip everything while a child consumer (e.g. the decorate
      // editor's furniture drag) has the gesture locked.
      if (lockRef?.current) return;
      // Two-finger touch → pinch-zoom mode.
      if (e.pointerType === 'touch') {
        if (!pinch.current) {
          pinch.current = { pointers: new Map(), startDist: 0, startZoom: zoom.current };
        }
        pinch.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.current.pointers.size === 2) {
          const [a, b] = Array.from(pinch.current.pointers.values());
          pinch.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
          pinch.current.startZoom = zoom.current;
          drag.current = null; // cancel any single-finger drag
          return;
        }
        if (pinch.current.pointers.size > 2) return;
      }

      if (e.button !== undefined && e.button > 0) return; // primary only
      // Record the press but DON'T capture the pointer or activate drag
      // yet — that would swallow click events on shops. We promote to a
      // real drag the first time the pointer moves past DRAG_THRESHOLD_PX.
      drag.current = {
        pointerId: e.pointerId,
        startTarget: target.current.clone(),
        pickedWorld: pointerToWorld(camera, e.clientX, e.clientY, el),
        startScreen: { x: e.clientX, y: e.clientY },
        active: false,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (lockRef?.current) return;
      // Pinch zoom only takes priority when 2+ fingers are actually
      // down. With a single finger, `pinch.current` still exists from
      // `pointerdown` (so we can promote to pinch as soon as a second
      // finger lands), but the move event should fall through to the
      // single-finger pan path below. The previous version returned
      // early whenever `pinch.current.pointers.has(e.pointerId)` was
      // true — which is always true on touch — so mobile pan never
      // ran.
      if (
        pinch.current &&
        pinch.current.pointers.size >= 2 &&
        pinch.current.pointers.has(e.pointerId)
      ) {
        pinch.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch.current.startDist > 0) {
          const [a, b] = Array.from(pinch.current.pointers.values());
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const ratio = d / pinch.current.startDist;
          zoom.current = clamp(pinch.current.startZoom * ratio, minZoom, maxZoom);
          camera.zoom = zoom.current;
          camera.updateProjectionMatrix();
        }
        return;
      }

      // Keep the tracker for this finger up to date even when only one
      // finger is down — so the moment a second finger lands, the
      // start-distance calculation has the correct current positions.
      if (pinch.current?.pointers.has(e.pointerId)) {
        pinch.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (!drag.current || drag.current.pointerId !== e.pointerId) return;

      // Promote to a real drag once the pointer travels past the threshold.
      // Before that, ignore movement so R3F's click handler can still fire
      // on pointerup.
      if (!drag.current.active) {
        const dx = e.clientX - drag.current.startScreen.x;
        const dy = e.clientY - drag.current.startScreen.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        drag.current.active = true;
        try { el.setPointerCapture(e.pointerId); } catch {}
      }

      const now = pointerToWorld(camera, e.clientX, e.clientY, el);
      const delta = drag.current.pickedWorld.clone().sub(now);
      const nx = clamp(drag.current.startTarget.x + delta.x, bounds.minX, bounds.maxX);
      const nz = clamp(drag.current.startTarget.z + delta.z, bounds.minZ, bounds.maxZ);
      target.current.set(nx, drag.current.startTarget.y, nz);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pinch.current?.pointers.has(e.pointerId)) {
        pinch.current.pointers.delete(e.pointerId);
        if (pinch.current.pointers.size === 0) pinch.current = null;
      }
      if (drag.current?.pointerId === e.pointerId) {
        // Only release capture if we ever captured. For tap-without-drag,
        // we never captured, so there's nothing to release.
        if (drag.current.active) {
          try { el.releasePointerCapture(e.pointerId); } catch {}
        }
        drag.current = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      // Negative deltaY = wheel up = zoom in. Touchpad pinch also reports
      // here on most browsers (with ctrlKey true on Mac touchpad zoom).
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoom.current = clamp(zoom.current * factor, minZoom, maxZoom);
      camera.zoom = zoom.current;
      camera.updateProjectionMatrix();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('wheel', onWheel as any);
      el.style.touchAction = prevTouchAction;
    };
  }, [camera, gl, bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ, minZoom, maxZoom]);

  // ── Per-frame camera follow ────────────────────────────────────────
  useFrame((_, dt) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    settled.current.lerp(target.current, Math.min(1, dt * 60 * follow));
    camera.position.set(
      settled.current.x + ISO_OFFSET.x,
      ISO_OFFSET.y,
      settled.current.z + ISO_OFFSET.z,
    );
    camera.lookAt(settled.current.x, CAM_LOOK_Y, settled.current.z);
  });

  // Imperative API for parents (e.g. focus on a tapped shop, or recentre
  // on the spawn after a scene swap). Default behaviour is a SMOOTH pan
  // — it only updates the `target`, letting the per-frame follow lerp
  // ease the camera in. Pass `snap: true` to skip the easing (used when
  // the camera should appear already-centred, e.g. on first mount of a
  // new interior scene).
  const recentre = useMemo(
    () => (x: number, z: number, snap = false) => {
      target.current.set(
        clamp(x, bounds.minX, bounds.maxX),
        0,
        clamp(z, bounds.minZ, bounds.maxZ),
      );
      if (snap) settled.current.copy(target.current);
    },
    [bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ],
  );

  return { recentre };
}
