import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { LiteInputState } from './useLiteInput';

const MOVE_SPEED = 3.6;
const RUN_SPEED = 6.4;
const ROT_LERP = 14;
const GRAVITY = -14;
const JUMP_VEL = 5.5;
const CAM_DISTANCE = 4.5;
const CAM_HEIGHT = 1.9;
const CAM_LOOK_HEIGHT = 1.1;
const CAM_FOLLOW_LERP = 4.8;
// Pitch clamp narrower than before — wide open pitch lets the camera punch
// through the shop ceiling. Keeping the camera between -0.2 (just-below-flat)
// and 0.55 rad (≈30° downward tilt) means it never goes above ~y=4.0 with
// CAM_DISTANCE=4.5 — comfortably below the y=5 ceiling.
const PITCH_MIN = -0.2;
const PITCH_MAX = 0.55;
const YAW_SENSITIVITY_MOUSE = 0.0035;
const YAW_SENSITIVITY_TOUCH = 0.005;
const PITCH_SENSITIVITY = 0.003;
// Hard ceiling for the camera — never let it punch through the roof of the
// shop. The shop's ceiling mesh sits at y=5.1; we leave a 1.0 unit safety
// gap because the lerp can overshoot the desired position briefly.
const CAM_Y_MAX = 4.0;
const CAM_Y_MIN = 0.4;

interface LitePlayerProps {
  modelPath: string;
  input: React.MutableRefObject<LiteInputState>;
  spawn?: [number, number, number];
  bounds?: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** Optional callback fired the frame the player avatar mounts. */
  onReady?: () => void;
}

/**
 * Custom kinematic player — no Rapier, no Ecctrl, no WASM.
 *
 * Mounted in lite-physics mode. Roughly equivalent to Ecctrl for our
 * use case (walk + run + jump + camera-relative movement + orbit cam),
 * but with zero physics-engine cost.
 *
 * Camera is a classic third-person orbit rig: drag (mouse or touch) to
 * rotate around the player, scroll wheel / pinch to zoom (zoom not yet
 * wired). Pitch is clamped so the user can't flip under the floor.
 *
 * Collisions: clamped to `bounds` (a rectangle of the shop floor) so the
 * player can't walk through walls. Not pixel-perfect, but fine for a
 * shop simulator where the shop is a single rectangular room.
 */
export function LitePlayer({
  modelPath,
  input,
  spawn = [0, 0, 1],
  // Shop interior in ShopStructure: back wall at z=-6.7, front opening
  // at z=+7, side walls at x=±8.5. Bounds clamp the player to that
  // rectangle. (Slightly inset so the player avatar doesn't clip the wall.)
  bounds = { minX: -7.8, maxX: 7.8, minZ: -6, maxZ: 6.4 },
  onReady,
}: LitePlayerProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  // Independent skeleton clone so the player avatar's animation state isn't
  // shared with any NPC using the same GLB.
  const cloned = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
      }
    });
    return c;
  }, [scene]);

  const { actions } = useAnimations(animations, group);
  const activeAction = useRef<THREE.AnimationAction | null>(null);

  // Player state (mutated each frame, never causes React re-render).
  // Force spawn.y to 0 (ground) regardless of what the caller passed —
  // some legacy spawn constants used y=2 (Ecctrl's convention for "drop
  // from above"), which made my camera initial Y land above the shop's
  // 5.1 ceiling.
  const pos = useRef(new THREE.Vector3(spawn[0], 0, spawn[2]));
  const velY = useRef(0);
  const grounded = useRef(true);
  const targetYaw = useRef(0);
  const yaw = useRef(0);

  // Camera state — yaw/pitch around the player.
  //   • camYaw = 0  →  camera sits at +Z relative to player, looking toward
  //     -Z. With our default spawn of (0, 0, 1) the camera lands at z=5.5
  //     (inside the shop, between player at z=1 and door at z=7). Looking
  //     toward -Z means the camera sees the player + the back wall + the
  //     shop sign behind the player. Classic over-the-shoulder view.
  //   • camPitch = 0.18  →  ~10° downward tilt.
  const camYaw = useRef(0);
  const camPitch = useRef(0.18);
  const camInitialised = useRef(false);

  // First-mount: signal ready (used by ShopGame3D to hide the boot loader).
  useEffect(() => {
    if (onReady) {
      const raf = requestAnimationFrame(onReady);
      return () => cancelAnimationFrame(raf);
    }
  }, [onReady]);

  // Animation crossfade helper.
  const switchAction = (key: string, fade = 0.18) => {
    const next = actions[key];
    const prev = activeAction.current;
    if (!next || next === prev) return;
    prev?.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    activeAction.current = next;
  };
  useEffect(() => {
    const idle = actions['CharacterArmature|Idle'] || Object.values(actions)[0];
    if (idle) { idle.reset().fadeIn(0.2).play(); activeAction.current = idle; }
  }, [actions]);

  // ── Pointer drag handlers ─────────────────────────────────────────────
  // The canvas element handles mouse / touch drag for camera rotation.
  useEffect(() => {
    const el = gl.domElement;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let startedFromInteractive = false;

    const isOverlayUI = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      // Anything in the DOM UI overlay should NOT rotate the camera. Joystick,
      // HUD buttons, modals etc. all live in elements with `pointer-events`
      // enabled and are NOT the canvas itself.
      return target !== el;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== undefined && e.button !== 0) return; // primary only
      if (isOverlayUI(e.target)) { startedFromInteractive = true; return; }
      startedFromInteractive = false;
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const isTouch = e.pointerType === 'touch';
      camYaw.current -= dx * (isTouch ? YAW_SENSITIVITY_TOUCH : YAW_SENSITIVITY_MOUSE);
      camPitch.current = Math.max(
        PITCH_MIN,
        Math.min(PITCH_MAX, camPitch.current + dy * PITCH_SENSITIVITY),
      );
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pointerId !== e.pointerId) return;
      pointerId = null;
      try { el.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    };
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      void startedFromInteractive; // silence unused — kept for future logic
    };
  }, [gl]);

  // ── Per-frame update ──────────────────────────────────────────────────
  useFrame((_, dt) => {
    if (!group.current) return;
    const inp = input.current;

    // Camera-relative basis from the orbit yaw.
    //
    // `camForward` = unit vector from camera toward player (the direction
    // pushing the joystick "up" / pressing W should travel).
    // `camRight`   = forward × up — points to the camera's right edge in
    // screen space, so pressing D walks the character that way.
    //
    // BUGFIX: my original camRight was `(-fZ, 0, fX)` which is the
    // negation of the correct right vector (forward × up). That swapped
    // A and D — pressing A walked right, D walked left — and looked like
    // "movement isn't accordingly".  Verified by cross product:
    //   forward × up = ((-fX,0,-fZ) × (0,1,0)) = (fZ, 0, -fX)
    const fX = Math.sin(camYaw.current);
    const fZ = Math.cos(camYaw.current);
    const camForward = new THREE.Vector3(-fX, 0, -fZ);
    const camRight = new THREE.Vector3(fZ, 0, -fX);

    // Build the move vector.
    const mag = Math.min(1, Math.hypot(inp.move.x, inp.move.z));
    let moveX = 0, moveZ = 0;
    if (mag > 0.04) {
      const speed = inp.running ? RUN_SPEED : MOVE_SPEED;
      const step = speed * dt;
      const vx = camRight.x * inp.move.x + camForward.x * -inp.move.z;
      const vz = camRight.z * inp.move.x + camForward.z * -inp.move.z;
      const len = Math.hypot(vx, vz) || 1;
      moveX = (vx / len) * step * mag;
      moveZ = (vz / len) * step * mag;
      targetYaw.current = Math.atan2(vx, vz);
      switchAction(inp.running ? 'CharacterArmature|Run' : 'CharacterArmature|Walk');
    } else {
      switchAction('CharacterArmature|Idle');
    }

    // Apply movement with bounds clamping (cheap "wall" collision).
    pos.current.x = Math.max(bounds.minX, Math.min(bounds.maxX, pos.current.x + moveX));
    pos.current.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.current.z + moveZ));

    // Gravity + jump.
    if (inp.jumpPressed && grounded.current) {
      velY.current = JUMP_VEL;
      grounded.current = false;
      inp.jumpPressed = false;
    } else if (inp.jumpPressed) {
      inp.jumpPressed = false; // consume even if not grounded
    }
    velY.current += GRAVITY * dt;
    pos.current.y += velY.current * dt;
    if (pos.current.y <= 0) {
      pos.current.y = 0;
      velY.current = 0;
      grounded.current = true;
    }

    // Shortest-arc rotation interpolation.
    let rotDelta = targetYaw.current - yaw.current;
    while (rotDelta > Math.PI) rotDelta -= Math.PI * 2;
    while (rotDelta < -Math.PI) rotDelta += Math.PI * 2;
    yaw.current += rotDelta * Math.min(1, dt * ROT_LERP);
    group.current.position.copy(pos.current);
    group.current.rotation.y = yaw.current;

    // Orbit camera around player at distance + height + pitch. The result
    // is clamped to keep the camera inside the shop's bounds (X/Z) and
    // below the ceiling (Y) — otherwise an over-zealous mouse drag can put
    // the camera through a wall and the user just sees brown facade.
    const cosP = Math.cos(camPitch.current);
    const sinP = Math.sin(camPitch.current);
    const rawX = pos.current.x + Math.sin(camYaw.current) * CAM_DISTANCE * cosP;
    const rawY = pos.current.y + CAM_HEIGHT + sinP * CAM_DISTANCE;
    const rawZ = pos.current.z + Math.cos(camYaw.current) * CAM_DISTANCE * cosP;
    const desired = new THREE.Vector3(
      Math.max(bounds.minX + 0.4, Math.min(bounds.maxX - 0.4, rawX)),
      Math.max(CAM_Y_MIN, Math.min(CAM_Y_MAX, rawY)),
      Math.max(bounds.minZ + 0.4, Math.min(bounds.maxZ + 1.2, rawZ)),
    );
    if (!camInitialised.current) {
      camera.position.copy(desired);
      camInitialised.current = true;
    } else {
      camera.position.lerp(desired, Math.min(1, dt * CAM_FOLLOW_LERP));
    }
    camera.lookAt(pos.current.x, pos.current.y + CAM_LOOK_HEIGHT, pos.current.z);
  });

  return (
    <group ref={group} position={[spawn[0], 0, spawn[2]]} dispose={null}>
      <primitive object={cloned} scale={0.85} />
    </group>
  );
}
