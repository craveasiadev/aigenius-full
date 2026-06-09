import React, { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Billboard, KeyboardControls, Text, useGLTF, useAnimations, useProgress } from '@react-three/drei';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Physics, RigidBody } from '@react-three/rapier';
import Ecctrl, { EcctrlJoystick, useGame } from 'ecctrl';
import {
  LitePhysicsProvider,
  MaybeRigidBody,
  LitePlayer as LiteKinematicPlayer,
  LiteJoystick,
  useLiteInputRef,
} from './lite-physics';
import { TabletMenu } from './TabletMenu';
import { ShopFurniture } from './InteriorFurniture';
import { getSelectedAvatarPath } from './AvatarWardrobe';
import { resolvePublicAssetUrl } from './assetPath';
import {
  isLowEndDevice,
  isSlowNetwork,
  useLiteScene,
  isVeryLowEndDevice,
  isTouchDevice,
  SCENE_BUDGET,
} from './performance';
import { getWallTexture, getFloorTexture } from './textureCache';
import {
  DEFAULT_CHARACTER_MODEL,
  CAR_MODELS,
  NPC_MODELS,
  ACTIVE_CAR_MODELS,
  ACTIVE_NPC_MODELS,
  EXTERIOR_MODELS,
  preloadCriticalModels,
  preloadIdleModels,
} from './modelCache';
// LoadingProgress (React overlay) was removed — the HTML boot loader in
// index.html is now the sole loading UI. CSS animations there are immune to
// the main-thread freeze that the React loader suffered during WASM init.
import { Star, X, Flame, Gift, CheckCircle, Users, TrendingUp, Zap, Eye, DollarSign, Trophy, Info, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

import confetti from 'canvas-confetti';

/**
 * Master toggle for "lite physics" mode.
 *
 *   • `true`  → Rapier `<Physics>` is NOT mounted and Ecctrl is replaced
 *               by a custom kinematic controller. No WASM compile = no
 *               main-thread freeze. ~2.2 MB less JS / WASM to download.
 *               Walls become visual-only with rectangular bounds clamping
 *               the player; NPCs and cars remain visual-only animations.
 *
 *   • `false` → Original behaviour. Rapier + Ecctrl + RigidBody colliders.
 *
 * Default: TRUE. Flip locally to test the old Rapier path.
 */
const USE_LITE_PHYSICS = true;

// Kick off the player-avatar fetch the moment this chunk parses, before the
// React tree even mounts. Uses the saved avatar id so the HTTP request goes
// out for the exact model the player will see first.
try {
  preloadCriticalModels(getSelectedAvatarPath());
} catch {
  preloadCriticalModels();
}

// Boot-loader milestone: the heavy 3D chunk has finished parsing. The next
// big step is Rapier WASM compile + scene mount, which can lock the main
// thread for ~1-2s — but the CSS-driven bar/spinner keep animating because
// they live in the boot-loader, not in React.
if (typeof window !== 'undefined') {
  window.__shopBootProgress?.(65);
}

// Re-exports to keep existing call sites working
void isSlowNetwork;
void isVeryLowEndDevice;

// ============================================================================
// SHOP EXIT CONTROL — set to true to allow characters to walk outside
// ============================================================================
const ALLOW_EXIT_SHOP = false;

const formatPhoneClockTime = (date: Date): string => {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// ============================================================================
// PROCEDURAL TEXTURE GENERATORS — moved to ./textureCache.ts (module-level cache)
// ============================================================================
// Local helpers preserved for call-site compatibility; they delegate to the
// shared cache so identical (color, style) pairs reuse the same GPU texture.
const createWallTexture = (baseColor: string, styleId?: string) => getWallTexture(baseColor, styleId);
const createFloorTexture = (baseColor: string, styleId?: string) => getFloorTexture(baseColor, styleId);


// ============================================================================
// PERFORMANCE COMPONENTS (Commented for future use)
// ============================================================================

/*
// LOD wrapper for meshes - shows simpler geometry at distance
function LODMesh({ 
  children, 
  detailed = true,
  ...props 
}: { 
  children: React.ReactNode; 
  detailed?: boolean;
  [key: string]: any;
}) {
  const ref = useRef<THREE.Group>(null);
  const [visible, setVisible] = useState(true);
  
  useFrame(({ camera }) => {
    if (!ref.current) return;
    const distance = camera.position.distanceTo(ref.current.position);
    // Hide if too far for low-end devices
    if (isLowEndDevice && distance > 50) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  });
  
  if (!visible) return null;
  
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}

// Simple shadow plane - cheaper than real shadows on low-end
function SimpleShadow({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  if (!isLowEndDevice) return null;
  
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[scale, scale]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.2} />
    </mesh>
  );
}
*/


// ============================================================================
// ERROR BOUNDARY
// ============================================================================
class Scene3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  componentDidCatch(err: Error) {
    console.error('[ShopGame3D] scene error:', err);
  }
  render() {
    if (this.state.error) {
      return (
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[4, 2, 0.1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

/**
 * In-canvas fallback shown while `<Physics>` (and any inner Suspense-suspending
 * components) are still resolving. Critically, Rapier's WASM compile happens
 * inside the Physics component's suspend, so this fallback is what the
 * browser actually paints for ~0.5–2 s on slower devices.
 *
 * Previously this returned null, leaving the canvas as a solid sky-blue
 * during the wait. That made it look like the entire app was frozen, and
 * Chrome's "page is unresponsive" warning would fire because the user had
 * nothing to look at. Now we paint a cheap procedural preview — flat
 * ground, sky-tinted ambient light, a faint shop-shaped silhouette — so the
 * Canvas has SOMETHING on screen the instant it mounts. When Physics
 * resolves, this gets replaced by the real WorldScene in the same frame.
 *
 * All meshes here use `meshBasicMaterial` (no lighting calc) and pre-baked
 * geometry instances at module scope, so the preview itself costs almost
 * nothing to render.
 */
const PREVIEW_FLOOR_GEO = new THREE.PlaneGeometry(80, 80);
const PREVIEW_FLOOR_MAT = new THREE.MeshBasicMaterial({ color: '#dde4ec' });
const PREVIEW_WALL_GEO = new THREE.BoxGeometry(20, 5, 0.3);
const PREVIEW_WALL_MAT = new THREE.MeshBasicMaterial({ color: '#f1ebe0' });
const PREVIEW_PLAYER_GEO = new THREE.CapsuleGeometry(0.32, 0.7, 6, 12);
const PREVIEW_PLAYER_MAT = new THREE.MeshBasicMaterial({ color: '#94a3b8' });

function LoadingScene() {
  return (
    <group>
      {/* Cheap flat ground so the user doesn't stare at sky color. */}
      <mesh
        geometry={PREVIEW_FLOOR_GEO}
        material={PREVIEW_FLOOR_MAT}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Back wall — a vague silhouette of "your shop is here". */}
      <mesh
        geometry={PREVIEW_WALL_GEO}
        material={PREVIEW_WALL_MAT}
        position={[0, 2.5, -6]}
      />
      {/* Player placeholder — appears where the real player will spawn. */}
      <mesh
        geometry={PREVIEW_PLAYER_GEO}
        material={PREVIEW_PLAYER_MAT}
        position={[0, 0.85, 0]}
      />
    </group>
  );
}

// ============================================================================
// TYPES
// ============================================================================
interface Product {
  id: string;
  product_name: string;
  price: number;
  image_url?: string | null;
}

interface ActiveInfluencer {
  id: string;
  name: string;
  tier: string;
  avatarUrl?: string;
}

interface ActiveInnovation {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  x?: number;
  y?: number;
}

interface ShopGame3DProps {
  shopTheme: string;
  shopName: string;
  products: Array<Product>;
  staff: Array<unknown>;
  demoWalkOnly?: boolean;
  isShopLaunched?: boolean;
  trafficMultiplier?: number;
  userStats?: {
    aiTokens: number;
    level: number;
    streak: number;
    popularity?: number;
  };
  activeInfluencers?: ActiveInfluencer[];
  activeInnovations?: ActiveInnovation[];
  initialStats?: {
    totalSales: number;
    totalProfit: number;
    visitors: number;
    likes: number;
  };
  dailyRewardLastClaimDate?: string | null;
  onClaimDailyReward?: () => Promise<boolean>;
  interiorFloorColor?: string;
  interiorFloorStyleId?: string;
  interiorWallColor?: string;
  interiorWallStyleId?: string;
  remainingDailyVisitors?: number;
  storageScopeId?: string | number | null;
  csrBadges?: string[];
  shelfStyle?: string;
  counterStyle?: string;
  shopImageUrl?: string;
  layoutPositions?: Record<string, { x: number; y: number; rotation?: number }> | null;
  tvPosterUrl?: string;
  wallPosters?: (string | null)[];
  onWallPosterRemove?: (slotIndex: number) => void;
  onInnovationMove?: (id: string, x: number, y: number) => void;
  onLaunchShop?: () => void;
}

interface ThemeConfig {
  exterior: { wall: string; roof: string; door: string; accent: string; ground: string };
  interior: { floor: string; walls: string; accent: string; ceiling: string };
}

// ============================================================================
// CONSTANTS
// ============================================================================
const THEME_CONFIGS: Record<string, ThemeConfig> = {
  fun_colorful: {
    exterior: { wall: '#FFB6C1', roof: '#FF69B4', door: '#8B4513', accent: '#FF1493', ground: '#7ec850' },
    interior: { floor: '#f5e6d3', walls: '#FFF0F5', accent: '#FF69B4', ceiling: '#FFFFFF' },
  },
  modern_clean: {
    exterior: { wall: '#e8e0d8', roof: '#5a6e7f', door: '#3d2b1f', accent: '#4169E1', ground: '#7ec850' },
    interior: { floor: '#d4c5b2', walls: '#f0ece8', accent: '#4169E1', ceiling: '#f5f2ef' },
  },
};

// Shelf style visual configs – mapped from DecorateModule shelf IDs
const SHELF_STYLES: Record<string, {
  backPanel: string;
  shelfPlate: string;
  legs: string;
  shelfOpacity: number;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
}> = {
  shelf_basic: {
    backPanel: '#b8d4e8', shelfPlate: '#d4eaf5', legs: '#c0d0e0',
    shelfOpacity: 0.35, metalness: 0.6, roughness: 0.05,
    emissive: '#88ccff', emissiveIntensity: 0.08,
  },
  shelf_wood: {
    backPanel: '#5c3a21', shelfPlate: '#8b6f47', legs: '#3d2b1f',
    shelfOpacity: 1.0, metalness: 0.0, roughness: 0.8,
  },
  shelf_glass: {
    backPanel: '#1a1a2e', shelfPlate: '#a8d4e6', legs: '#c0c0c0',
    shelfOpacity: 0.5, metalness: 0.2, roughness: 0.1,
  },
  shelf_neon: {
    backPanel: '#1a0a2e', shelfPlate: '#e8e0d4', legs: '#8a2be2',
    shelfOpacity: 0.85, metalness: 0.3, roughness: 0.2,
    emissive: '#8a2be2', emissiveIntensity: 0.3,
  },
};

const COUNTER_STYLES: Record<string, {
  base: string; front: string; trim: string; top: string;
  baseRoughness: number; topMetalness: number; topRoughness: number;
  emissive?: string; emissiveIntensity?: number;
}> = {
  table_basic: {
    base: '#3d2b1f', front: '#5c4033', trim: '#c9a84c', top: '#e8e0d4',
    baseRoughness: 0.8, topMetalness: 0.05, topRoughness: 0.2,
  },
  table_tech: {
    base: '#2c2c3a', front: '#404050', trim: '#60a5fa', top: '#e0e0e8',
    baseRoughness: 0.3, topMetalness: 0.6, topRoughness: 0.1,
    emissive: '#60a5fa', emissiveIntensity: 0.15,
  },
  table_glass: {
    base: '#1a1a2e', front: '#2a3a4a', trim: '#c0c0c0', top: '#c8dce8',
    baseRoughness: 0.2, topMetalness: 0.3, topRoughness: 0.05,
  },
  table_wood: {
    base: '#5c3a21', front: '#7a5235', trim: '#8a7554', top: '#b8956a',
    baseRoughness: 0.9, topMetalness: 0.0, topRoughness: 0.7,
  },
};

const KEYBOARD_MAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['Shift'] },
];

const PLAYER_CAPSULE_HALF_HEIGHT = 0.35;
const PLAYER_CAPSULE_RADIUS = 0.3;
const PLAYER_FLOAT_HEIGHT = 0.3;
const PLAYER_RAY_HIT_FORGIVENESS = 0.1;
// Keep the ground ray longer than the target floating distance so the player
// stays grounded instead of repeatedly dropping in and out of "air" state.
const PLAYER_RAY_LENGTH =
  PLAYER_CAPSULE_RADIUS + PLAYER_FLOAT_HEIGHT + PLAYER_RAY_HIT_FORGIVENESS + 0.35;
const PLAYER_MODEL_Y_OFFSET = -(
  PLAYER_CAPSULE_HALF_HEIGHT +
  PLAYER_CAPSULE_RADIUS +
  PLAYER_FLOAT_HEIGHT
);
const PLAYER_SPAWN: [number, number, number] = [0, 2, -3];

const PRODUCT_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
  '#ff6f61', '#6c5ce7',
];

// Model paths + active lists moved to ./modelCache.ts.
// CAR_MODELS / NPC_MODELS imported for type-compat with external consumers.
void CAR_MODELS; void NPC_MODELS; void DEFAULT_CHARACTER_MODEL;

const ANIMATION_SET = {
  idle: 'CharacterArmature|Idle',
  walk: 'CharacterArmature|Walk',
  run: 'CharacterArmature|Run',
  jump: 'CharacterArmature|Roll',
  jumpIdle: 'CharacterArmature|Idle_Neutral',
  jumpLand: 'CharacterArmature|HitRecieve',
  fall: 'CharacterArmature|Idle_Neutral',
  action1: 'CharacterArmature|Wave',
  action2: 'CharacterArmature|Interact',
  action3: 'CharacterArmature|Punch_Left',
  action4: 'CharacterArmature|Kick_Right',
};

// ============================================================================
// CHARACTER MODEL (player avatar)
// ============================================================================
function CharacterModel({ modelPath = DEFAULT_CHARACTER_MODEL }: { modelPath?: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Clone scene so each avatar swap gets its own skeleton + meshes
  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
        (child as THREE.Mesh).frustumCulled = isLowEndDevice;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);
  const curAnimation = useGame((state: any) => state.curAnimation);
  const resetAnimation = useGame((state: any) => state.reset);
  const initializeAnimationSet = useGame((state: any) => state.initializeAnimationSet);

  // Re-initialize animation set every time the model changes
  useEffect(() => {
    initializeAnimationSet(ANIMATION_SET);
  }, [modelPath]);

  const activeActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const key = curAnimation ?? ANIMATION_SET.idle;
    const action = key ? actions[key] : null;
    if (!action) return;

    activeActionRef.current = action;

    const isOneShot =
      curAnimation === ANIMATION_SET.jump ||
      curAnimation === ANIMATION_SET.jumpLand ||
      curAnimation === ANIMATION_SET.action1 ||
      curAnimation === ANIMATION_SET.action2 ||
      curAnimation === ANIMATION_SET.action3 ||
      curAnimation === ANIMATION_SET.action4;

    try {
      if (isOneShot) {
        action.reset().fadeIn(0.2).setLoop(THREE.LoopOnce, 0).play();
        action.clampWhenFinished = true;
      } else {
        action.reset().fadeIn(0.2).play();
      }
    } catch (err) {
      console.warn('[CharacterModel] animation play error:', err);
      return;
    }

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === activeActionRef.current) resetAnimation();
    };
    mixer.addEventListener('finished', onFinished as any);

    return () => {
      try { action.fadeOut(0.2); } catch (_) { /* ignore */ }
      mixer.removeEventListener('finished', onFinished as any);
    };
  }, [curAnimation, actions]);

  return (
    <group ref={group} dispose={null} userData={{ camExcludeCollision: true }}>
      <primitive object={clone} scale={0.75} position={[0, PLAYER_MODEL_Y_OFFSET, 0]} />
    </group>
  );
}

useGLTF.preload(DEFAULT_CHARACTER_MODEL);

// ============================================================================
// PLAYER READY SIGNAL – fired from inside Canvas once the avatar GLB has
// resolved its Suspense. The parent <ShopGame3D> listens to hide the loader
// the instant the player is actually visible, instead of polling drei's
// progress meter (which can lag a frame or two behind).
// ============================================================================
const playerReadyListeners = new Set<() => void>();
function PlayerReadySignal() {
  useEffect(() => {
    // The player's Suspense has resolved — bump the bar visibly to 95% so
    // the user can see the load is almost done. The final 95 → 100 jump
    // happens in __shopBootDone() once the first frame paints.
    window.__shopBootProgress?.(95);
    // Defer one frame so the player's first paint happens before we tell
    // the parent to fade the loader. Otherwise the loader unmounts during
    // the same task as the player's first commit, which the user perceives
    // as a single frozen frame.
    const raf = requestAnimationFrame(() => {
      playerReadyListeners.forEach((fn) => fn());
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}

// ============================================================================
// PLAYER FALL GUARD – respawns player if they fall through the world
// ============================================================================
function PlayerFallGuard() {
  useFrame(({ scene }) => {
    // Find the Ecctrl rigid body group (it's the player's parent)
    const ecctrlGroup = scene.getObjectByProperty('name', 'yourCharacter')
      || scene.children.find((c: any) => c.userData?.ecctrl);
    if (!ecctrlGroup) return;
    // If below Y=-10, teleport back to spawn
    if (ecctrlGroup.position.y < -10) {
      ecctrlGroup.position.set(PLAYER_SPAWN[0], PLAYER_SPAWN[1] + 2, PLAYER_SPAWN[2]);
    }
  });
  return null;
}

// ============================================================================
// SHARED EMOTE TRIGGER – bridge between HUD (outside Canvas) and scene (inside)
// ============================================================================
const emoteStore = { pending: null as string | null };

// ============================================================================
// EMOTE TRIGGER – runs inside Canvas, reads emoteStore and fires useGame action
// ============================================================================
function EmoteTrigger() {
  const action1 = useGame((s: any) => s.action1);
  const action2 = useGame((s: any) => s.action2);
  const action3 = useGame((s: any) => s.action3);
  const action4 = useGame((s: any) => s.action4);

  useFrame(() => {
    const e = emoteStore.pending;
    if (!e) return;
    emoteStore.pending = null;
    if (e === 'wave') action1?.();
    else if (e === 'interact') action2?.();
    else if (e === 'punch') action3?.();
    else if (e === 'kick') action4?.();
  });

  return null;
}

// ============================================================================
// NPC – animated pedestrian (loops forever on sidewalk, clickable with HP)
// ============================================================================
type Vec3 = [number, number, number];

const NPC_MAX_HP = 3;

function PedestrianNPC({
  modelPath,
  waypoints,
  speed = 2,
  scale = 0.7,
}: {
  modelPath: string;
  waypoints: Vec3[];
  speed?: number;
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const isHit = useRef(false);
  const isDead = useRef(false);
  const hitTimer = useRef(0);
  const hp = useRef(NPC_MAX_HP);
  const originalSpeed = useRef(speed);
  const [showHp, setShowHp] = useState(false);
  const [curHp, setCurHp] = useState(NPC_MAX_HP);
  const hpHideTimer = useRef(0);
  const [visible, setVisible] = useState(true);

  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).frustumCulled = isLowEndDevice;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const walkAction = actions['CharacterArmature|Walk'];
    if (walkAction) {
      walkAction.reset().setEffectiveTimeScale(1).play();
    }
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer]);

  const wpIdx = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (isHit.current || isDead.current) return;
    const cam = e.camera?.position;
    if (cam && group.current) {
      const pos = group.current.position;
      const d = Math.sqrt((cam.x - pos.x) ** 2 + (cam.z - pos.z) ** 2);
      if (d > 12) return;
    }
    isHit.current = true;
    hitTimer.current = 1.0;
    hp.current -= 1;
    setCurHp(hp.current);
    setShowHp(true);
    hpHideTimer.current = 4;
    emoteStore.pending = 'punch';
    if (hp.current <= 0) {
      isDead.current = true;
      mixer.stopAllAction();
      const death = actions['CharacterArmature|Death'] || actions['CharacterArmature|HitRecieve'];
      if (death) { death.reset().setLoop(THREE.LoopOnce, 0).play(); death.clampWhenFinished = true; }
    } else {
      mixer.stopAllAction();
      const hit = actions['CharacterArmature|HitRecieve'];
      if (hit) { hit.reset().setLoop(THREE.LoopOnce, 0).play(); hit.clampWhenFinished = true; }
    }
  }, [actions, mixer]);

  useFrame((_, delta) => {
    if (!group.current || waypoints.length < 2) return;
    if (hpHideTimer.current > 0) {
      hpHideTimer.current -= delta;
      if (hpHideTimer.current <= 0 && !isDead.current) setShowHp(false);
    }
    if (isDead.current) {
      hitTimer.current -= delta;
      if (hitTimer.current <= -2 && visible) setVisible(false);
      if (hitTimer.current <= -10) {
        isDead.current = false; isHit.current = false;
        hp.current = NPC_MAX_HP; setCurHp(NPC_MAX_HP); setShowHp(false); setVisible(true);
        wpIdx.current = 0;
        group.current.position.set(waypoints[0][0], waypoints[0][1], waypoints[0][2]);
        mixer.stopAllAction();
        const walk = actions['CharacterArmature|Walk'];
        if (walk) walk.reset().play();
      }
      return;
    }
    if (isHit.current) {
      hitTimer.current -= delta;
      if (hitTimer.current <= 0) {
        isHit.current = false; mixer.stopAllAction();
        const walk = actions['CharacterArmature|Walk'];
        if (walk) walk.reset().play();
      }
      return;
    }
    const target = waypoints[wpIdx.current];
    const pos = group.current.position;
    dir.set(target[0] - pos.x, 0, target[2] - pos.z);
    const dist = dir.length();
    if (dist < 0.5) {
      wpIdx.current = (wpIdx.current + 1) % waypoints.length;
    } else {
      dir.normalize();
      pos.x += dir.x * originalSpeed.current * delta;
      pos.z += dir.z * originalSpeed.current * delta;
      group.current.rotation.y = Math.atan2(dir.x, dir.z);
    }
  });

  return (
    <group
      ref={group}
      position={[waypoints[0][0], waypoints[0][1], waypoints[0][2]]}
      visible={visible}
      onClick={handleClick}
      onPointerOver={() => { if (!isDead.current) document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <primitive object={clone} scale={scale} />
      {showHp && (
        <Billboard position={[0, 1.8, 0]}>
          <mesh>
            <planeGeometry args={[1.0, 0.12]} />
            <meshBasicMaterial color="#1a1a1a" transparent opacity={0.85} />
          </mesh>
          <mesh position={[((curHp / NPC_MAX_HP) - 1) * 0.45, 0, 0.01]}>
            <planeGeometry args={[0.9 * (curHp / NPC_MAX_HP), 0.08]} />
            <meshBasicMaterial color={curHp > 1 ? '#22c55e' : '#ef4444'} />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

// ============================================================================
// SHOPPER NPC – walks in → browses shelf → pays at cashier → walks out
// ============================================================================
function ShopperNPC({
  modelPath,
  waypoints,
  speed = 1.2,
  scale = 0.65,
  onVisit,
  onPurchase,
}: {
  modelPath: string;
  waypoints: Vec3[];
  speed?: number;
  scale?: number;
  onVisit?: () => void;
  onPurchase?: (position: Vec3) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const originalSpeed = useRef(speed);
  const [visible, setVisible] = useState(true);
  const visitCounted = useRef(false);
  const SHOP_DOOR_Z = 7;

  // 5 phases: entering → browsing_shelf → walking_to_cashier → paying → leaving → done
  const phase = useRef<'entering' | 'browsing_shelf' | 'walking_to_cashier' | 'paying' | 'leaving' | 'done'>('entering');
  const browseTimer = useRef(0);
  const payTimer = useRef(0);

  // Waypoint indices for phase transitions (paths have ~8-10 waypoints)
  // shelfWP: the waypoint where NPC reaches the shelf (about 40% through)
  // cashierWP: waypoint at the cashier (about 50% through)
  // exitStart: where exit walk begins (about 60% through)
  const totalWPs = waypoints.length;
  const shelfWP = Math.floor(totalWPs * 0.4);
  const cashierWP = Math.floor(totalWPs * 0.5);
  const exitStartWP = Math.floor(totalWPs * 0.6);

  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).frustumCulled = isLowEndDevice;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const walkAction = actions['CharacterArmature|Walk'];
    if (walkAction) walkAction.reset().setEffectiveTimeScale(1).play();
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer]);

  const wpIdx = useRef(0);
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!group.current || !visible || phase.current === 'done') return;

    const pos = group.current.position;

    // BROWSING SHELF phase — idle near shelf
    if (phase.current === 'browsing_shelf') {
      browseTimer.current -= delta;
      if (browseTimer.current <= 0) {
        phase.current = 'walking_to_cashier';
        wpIdx.current = shelfWP;
        mixer.stopAllAction();
        const walk = actions['CharacterArmature|Walk'];
        if (walk) walk.reset().play();
      }
      return;
    }

    // PAYING phase — idle at cashier
    if (phase.current === 'paying') {
      payTimer.current -= delta;
      if (payTimer.current <= 0) {
        // Trigger dollar sign effect
        onPurchase?.([pos.x, pos.y + 2.5, pos.z]);
        phase.current = 'leaving';
        wpIdx.current = exitStartWP;
        mixer.stopAllAction();
        const walk = actions['CharacterArmature|Walk'];
        if (walk) walk.reset().play();
      }
      return;
    }

    const target = waypoints[wpIdx.current];
    if (!target) { phase.current = 'done'; setVisible(false); return; }

    dir.set(target[0] - pos.x, 0, target[2] - pos.z);
    const dist = dir.length();

    if (dist < 0.5) {
      // Count visit when first cross into shop
      if (!visitCounted.current && pos.z < SHOP_DOOR_Z) {
        visitCounted.current = true;
        onVisit?.();
      }

      const nextIdx = wpIdx.current + 1;

      // Transition: entering → browsing_shelf
      if (phase.current === 'entering' && nextIdx >= shelfWP) {
        phase.current = 'browsing_shelf';
        browseTimer.current = 3 + Math.random() * 4;
        mixer.stopAllAction();
        const idle = actions['CharacterArmature|Idle'];
        if (idle) idle.reset().play();
        return;
      }

      // Transition: walking_to_cashier → paying
      if (phase.current === 'walking_to_cashier' && nextIdx >= cashierWP) {
        phase.current = 'paying';
        payTimer.current = 2 + Math.random() * 1;
        mixer.stopAllAction();
        const idle = actions['CharacterArmature|Idle'];
        if (idle) idle.reset().play();
        return;
      }

      // Transition: leaving → done
      if (phase.current === 'leaving' && nextIdx >= totalWPs) {
        phase.current = 'done';
        setVisible(false);
        return;
      }

      wpIdx.current = nextIdx;
    } else {
      dir.normalize();
      pos.x += dir.x * originalSpeed.current * delta;
      pos.z += dir.z * originalSpeed.current * delta;
      group.current.rotation.y = Math.atan2(dir.x, dir.z);
    }
  });

  if (!visible) return null;

  return (
    <group
      ref={group}
      position={[waypoints[0][0], waypoints[0][1], waypoints[0][2]]}
    >
      <primitive object={clone} scale={scale} />
    </group>
  );
}

// NPC models load lazily via useGLTF() inside <Suspense> boundaries below.
// Upfront preload would split bandwidth with the player avatar and stall
// the main loader. Background prefetch is handled by modelCache.preloadIdleModels.

// ============================================================================
// CAR – kinematic rigid body that collides and sends things flying
// ============================================================================
function Car({
  modelPath,
  startX,
  speed,
  z,
  scale = 0.05,
  rotY = Math.PI / 2,
}: {
  modelPath: string;
  startX: number;
  speed: number;
  z: number;
  scale?: number;
  rotY?: number;
}) {
  const rbRef = useRef<any>(null);
  const posRef = useRef(startX);
  const { scene } = useGLTF(modelPath);
  const clone = useMemo(() => scene.clone(), [scene]);

  // Auto-compute Y and size for collider
  const { yOffset, carSize } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const yOff = -box.min.y * scale;
    const w = (box.max.x - box.min.x) * scale;
    const h = (box.max.y - box.min.y) * scale;
    const d = (box.max.z - box.min.z) * scale;
    return { yOffset: yOff, carSize: [Math.max(w, 2), Math.max(h, 1.5), Math.max(d, 1)] as Vec3 };
  }, [clone, scale]);

  useFrame((_, delta) => {
    posRef.current += speed * delta;
    if (speed > 0 && posRef.current > 100) posRef.current = -100;
    if (speed < 0 && posRef.current < -100) posRef.current = 100;

    if (rbRef.current) {
      rbRef.current.setNextKinematicTranslation({
        x: posRef.current,
        y: yOffset + carSize[1] / 2,
        z: z,
      });
    }
  });

  return (
    <MaybeRigidBody
      ref={rbRef}
      type="kinematicPosition"
      position={[startX, yOffset + carSize[1] / 2, z]}
      colliders="cuboid"
      mass={5000}
    >
      <group rotation={[0, rotY, 0]} position={[0, -carSize[1] / 2, 0]}>
        <primitive object={clone} scale={scale} />
      </group>
    </MaybeRigidBody>
  );
}

// Car models load lazily on first <Car> mount.

// ============================================================================
// ROAD
// ============================================================================
function Road() {
  return (
    <group>
      {/* Main road surface */}
      <mesh receiveShadow position={[0, 0.01, 38]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 10]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.9} />
      </mesh>
      {/* Center dashed line */}
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} position={[-87 + i * 6, 0.02, 38]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3, 0.2]} />
          <meshStandardMaterial color="#f0d050" />
        </mesh>
      ))}
      {/* Road edges */}
      <mesh position={[0, 0.02, 33]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.02, 43]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 0.15]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Sidewalk near side */}
      <mesh receiveShadow position={[0, 0.03, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 5]} />
        <meshStandardMaterial color="#b0a898" roughness={0.95} />
      </mesh>
      {/* Sidewalk far side */}
      <mesh receiveShadow position={[0, 0.03, 46]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 3]} />
        <meshStandardMaterial color="#b0a898" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ============================================================================
// NPC MANAGER – spawns pedestrians (loop) and shoppers (one-trip, staggered)
// Shoppers spawn one at a time with delays, capped by popularity.
// Each shopper entering the shop increments the visitor count.
// ============================================================================
function NPCManager({
  popularity = 1,
  trafficMultiplier = 1,
  remainingDailyVisitors,
  shopReady = false,
  onNPCVisit,
  onNPCSale,
}: {
  popularity: number;
  trafficMultiplier?: number;
  remainingDailyVisitors?: number;
  shopReady?: boolean;
  onNPCVisit?: () => void;
  onNPCSale?: () => void;
}) {
  // Pedestrian waypoints – loop along sidewalk (background ambiance)
  const pedestrianPaths: Vec3[][] = useMemo(() => [
    [[-50, 0, 29], [50, 0, 29], [50, 0, 29.5], [-50, 0, 29.5]],
    [[60, 0, 31], [-60, 0, 31], [-60, 0, 30.5], [60, 0, 30.5]],
    [[-40, 0, 28], [40, 0, 28], [40, 0, 28.5], [-40, 0, 28.5]],
    [[-55, 0, 27], [45, 0, 27], [45, 0, 27.5], [-55, 0, 27.5]],
    [[50, 0, 30], [-50, 0, 30], [-50, 0, 30.5], [50, 0, 30.5]],
  ], []);

  // Shopper waypoints – walk from sidewalk → shelf → cashier → exit
  // Each path has phases: enter(to shelf) → cashier → exit
  // shelfIdx marks where shelf browsing happens, cashierIdx marks cashier
  const shopperPaths: Vec3[][] = useMemo(() => [
    // Path 0: approach right, visit left shelf, pay, exit right
    [[15,0,28], [10,0,20], [3,0,10], [1,0,3], [-4,0,-1.5], [-1,0,-4.5], [-1,0,3], [3,0,10], [10,0,20], [15,0,28]],
    // Path 1: approach left, visit right shelf, pay, exit left
    [[-15,0,28], [-8,0,18], [-2,0,10], [-1,0,3], [4,0,-1.5], [1,0,-4.5], [-1,0,3], [-2,0,10], [-8,0,18], [-15,0,28]],
    // Path 2: center approach, visit left shelf, pay, exit
    [[25,0,28], [12,0,15], [0,0,8], [-3,0,-1.5], [0,0,-4.5], [0,0,8], [12,0,15], [25,0,28]],
    // Path 3: left approach, visit right shelf, pay, exit left
    [[-20,0,28], [-10,0,16], [-3,0,9], [5,0,-1.5], [1,0,-4.5], [-3,0,9], [-10,0,16], [-20,0,28]],
    // Path 4: far right approach, visit left shelf, pay, exit right
    [[30,0,28], [15,0,14], [5,0,9], [-5,0,-1.5], [-1,0,-4.5], [5,0,9], [15,0,14], [30,0,28]],
    // Path 5: far left approach, visit right shelf, pay, exit left
    [[-25,0,28], [-12,0,17], [-4,0,10], [5,0,-1.5], [0,0,-4.5], [-4,0,10], [-12,0,17], [-25,0,28]],
  ], []);

  // Daily visitor budget — tiered by popularity (visual NPCs match server-side logic)
  //   Pop  1-5  → 2     Pop  6-10 → 3     Pop 11-15 → 4
  //   Pop 16-20 → 5     Pop 21-25 → 6     Pop 26-30 → 7
  //   Every 5 levels adds 1 more visitor/day
  const maxVisitorsPerSession = useMemo(() => {
    // If dashboard tells us remaining budget, use it directly
    if (typeof remainingDailyVisitors === 'number') return remainingDailyVisitors;
    // Fallback: 5-level tiers matching dashboard budget
    const p = Math.max(1, Math.round(popularity));
    const tier = Math.ceil(p / 5);
    const budget = Math.min(50, tier + 1);
    return budget;
  }, [popularity, remainingDailyVisitors]);

  // Pedestrian count (background walkers — cosmetic only)
  const pedestrianCount = useMemo(() => {
    if (useLiteScene) return 1;
    return Math.min(5, Math.max(1, Math.floor(popularity / 20) + 1));
  }, [popularity]);
  const maxActiveShoppers = useLiteScene ? 2 : 5;

  // Spawn delay between shoppers (seconds) — spread across the session
  // With budget 5 → one every ~600s (10 min). Budget 10 → one every ~300s (5 min).
  const spawnIntervalMultiplier = useLiteScene ? 1.35 : 1;
  const spawnIntervalRef = useRef(
    maxVisitorsPerSession <= 0
      ? 9999
      : Math.min(600, Math.max(60, (50 * 60) / maxVisitorsPerSession)) * spawnIntervalMultiplier
  );
  const spawnInterval = spawnIntervalRef.current;

  // Track spawned shoppers: each gets a unique key & spawn time
  const [shopperSlots, setShopperSlots] = useState<Array<{ id: number; pathIdx: number; modelIdx: number }>>([]);
  const shopperSlotsRef = useRef(0);
  const visitorsSpawned = useRef(0);
  const nextSpawnTimer = useRef(5); // first shopper after 5s
  const idCounter = useRef(0);
  useEffect(() => {
    shopperSlotsRef.current = shopperSlots.length;
  }, [shopperSlots.length]);

  // Capture the initial session budget ONCE at mount — don't reset when remaining changes
  const sessionBudget = useRef(maxVisitorsPerSession);
  // Only allow the budget to DECREASE (never re-inflate when remaining drops)
  useEffect(() => {
    if (maxVisitorsPerSession < sessionBudget.current) {
      sessionBudget.current = maxVisitorsPerSession;
    }
  }, [maxVisitorsPerSession]);

  // Spawn shoppers over time — capped by sessionBudget (set once at mount)
  const spawnFrame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  useEffect(() => {
    let lastTime = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (shopReady && visitorsSpawned.current < sessionBudget.current && shopperSlotsRef.current < maxActiveShoppers) {
        nextSpawnTimer.current -= delta;
        if (nextSpawnTimer.current <= 0) {
          const newId = idCounter.current++;
          const pathIdx = visitorsSpawned.current % shopperPaths.length;
          const modelIdx = (visitorsSpawned.current + 1) % ACTIVE_NPC_MODELS.length;
          visitorsSpawned.current += 1;
          nextSpawnTimer.current = spawnInterval + (Math.random() * 5 - 2.5);
          setShopperSlots(prev => [...prev, { id: newId, pathIdx, modelIdx }]);
        }
      }

      spawnFrame.current = requestAnimationFrame(tick);
    };
    spawnFrame.current = requestAnimationFrame(tick);
    return () => { if (spawnFrame.current) cancelAnimationFrame(spawnFrame.current); };
  }, [maxActiveShoppers, shopReady, shopperPaths.length, spawnInterval]);

  const pedestrianSpeeds = [1.8, 1.5, 2.0, 1.6, 1.9];
  const shopperSpeeds = [1.3, 1.1, 1.4, 1.2, 1.0, 1.5];

  // Dollar sign effects from NPC purchases
  const [dollarEffects, setDollarEffects] = useState<Array<{ id: number; position: Vec3 }>>([]);
  const dollarIdRef = useRef(0);
  const handlePurchase = useCallback((position: Vec3) => {
    const id = dollarIdRef.current++;
    setDollarEffects(prev => [...prev, { id, position }]);
    setTimeout(() => {
      setDollarEffects(prev => prev.filter(d => d.id !== id));
    }, 2000);
    onNPCSale?.();
  }, [onNPCSale]);

  return (
    <group>
      {/* Pedestrians – loop forever on sidewalk */}
      {Array.from({ length: pedestrianCount }, (_, i) => (
        <PedestrianNPC
          key={`ped-${i}`}
          modelPath={ACTIVE_NPC_MODELS[i % ACTIVE_NPC_MODELS.length]}
          waypoints={pedestrianPaths[i % pedestrianPaths.length]}
          speed={pedestrianSpeeds[i % pedestrianSpeeds.length]}
          scale={0.65 + (i % 3) * 0.03}
        />
      ))}

      {/* Shoppers – walk in, browse shelf, pay at cashier, exit */}
      {shopperSlots.map((slot) => (
        <ShopperNPC
          key={`shopper-${slot.id}`}
          modelPath={ACTIVE_NPC_MODELS[slot.modelIdx]}
          waypoints={shopperPaths[slot.pathIdx]}
          speed={shopperSpeeds[slot.id % shopperSpeeds.length]}
          scale={0.65}
          onVisit={onNPCVisit}
          onPurchase={handlePurchase}
        />
      ))}

      {/* Dollar sign effects from purchases */}
      {dollarEffects.map(fx => (
        <DollarSignEffect key={fx.id} position={fx.position} />
      ))}
    </group>
  );
}

// ============================================================================
// INFLUENCER NPC – stands outside shop promoting with speech bubble
// ============================================================================
function InfluencerNPC({
  influencer,
  position,
  shopName,
}: {
  influencer: ActiveInfluencer;
  position: Vec3;
  shopName: string;
}) {
  const group = useRef<THREE.Group>(null);
  // Pick a model based on tier
  const modelIdx = useMemo(() => {
    const tierMap: Record<string, number> = { Nano: 0, Micro: 1, Macro: 2, Mega: 3 };
    return tierMap[influencer.tier] ?? 0;
  }, [influencer.tier]);
  const modelPath = ACTIVE_NPC_MODELS[modelIdx % ACTIVE_NPC_MODELS.length];

  const { scene, animations } = useGLTF(modelPath);
  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).frustumCulled = isLowEndDevice;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    // Play wave animation if available, otherwise idle
    const waveAction = actions['CharacterArmature|Wave'] || actions['CharacterArmature|Idle'] || Object.values(actions)[0];
    if (waveAction) waveAction.reset().play();
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer]);

  // Promo messages rotate
  const promoMessages = useMemo(() => [
    `Check out ${shopName}!`,
    `${shopName} is amazing!`,
    `Visit ${shopName} now!`,
    `Love ${shopName}!`,
  ], [shopName]);
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setMsgIdx(i => (i + 1) % promoMessages.length), 4000);
    return () => clearInterval(interval);
  }, [promoMessages.length]);

  // Tier-based glow color
  const tierColor = useMemo(() => {
    const colors: Record<string, string> = { Nano: '#60a5fa', Micro: '#a78bfa', Macro: '#f472b6', Mega: '#fbbf24' };
    return colors[influencer.tier] || '#60a5fa';
  }, [influencer.tier]);

  // Face toward the cashier counter at [0, 0, -5.5]
  const rotationY = useMemo(() => {
    return Math.atan2(0 - position[0], -5.5 - position[2]);
  }, [position]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]} scale={0.7}>
      <primitive object={clone} />
      {/* Promo speech bubble */}
      <Billboard position={[0, 3.5, 0]}>
        <mesh>
          <planeGeometry args={[3.5, 0.8]} />
          <meshBasicMaterial color={tierColor} transparent opacity={0.9} />
        </mesh>
        <Text position={[0, 0.05, 0.01]} fontSize={0.25} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {promoMessages[msgIdx]}
        </Text>
        <Text position={[0, -0.25, 0.01]} fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle">
          {`- ${influencer.name} (${influencer.tier})`}
        </Text>
      </Billboard>
      {/* Glow ring at feet */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 24]} />
        <meshBasicMaterial color={tierColor} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

// ============================================================================
// INFLUENCER MANAGER – places influencers inside the shop, near the cashier
// ============================================================================
function InfluencerManager({ influencers, shopName }: { influencers: ActiveInfluencer[]; shopName: string }) {
  // Position influencers in front of the cashier counter
  const positions: Vec3[] = useMemo(() => [
    [-3, 0, -3.5],
    [3, 0, -3.5],
    [-2, 0, -4],
    [2, 0, -4],
  ], []);

  if (!influencers.length) return null;

  return (
    <group>
      {influencers.slice(0, 4).map((inf, i) => (
        <InfluencerNPC key={inf.id} influencer={inf} position={positions[i]} shopName={shopName} />
      ))}
    </group>
  );
}

// ============================================================================
// INNOVATION ITEMS – tech upgrades visible inside the shop (draggable)
// ============================================================================
function InnovationItem({ innovation, position, onMove }: { innovation: ActiveInnovation; position: Vec3; onMove?: (id: string, x: number, z: number) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const spinGroupRef = useRef<THREE.Group>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffset = useRef(new THREE.Vector3());
  const intersection = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.5;
    }
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y = clock.getElapsedTime() * 0.8;
    }
    if (groupRef.current && hovered && !dragging) {
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 3) * 0.05;
    } else if (groupRef.current && !dragging) {
      groupRef.current.position.y = 0;
    }
  });

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    if (groupRef.current) {
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);
      dragPlane.current.set(new THREE.Vector3(0, 1, 0), -worldPos.y);
      e.ray.intersectPlane(dragPlane.current, intersection.current);
      dragOffset.current.copy(worldPos).sub(intersection.current);
    }
  }, []);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!dragging || !groupRef.current) return;
    e.stopPropagation();
    e.ray.intersectPlane(dragPlane.current, intersection.current);
    const newX = intersection.current.x + dragOffset.current.x;
    const newZ = intersection.current.z + dragOffset.current.z;
    groupRef.current.position.x = Math.max(-7, Math.min(7, newX));
    groupRef.current.position.z = Math.max(-6, Math.min(7, newZ));
  }, [dragging]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    if (groupRef.current && onMove) {
      onMove(innovation.id, groupRef.current.position.x, groupRef.current.position.z);
    }
  }, [dragging, onMove, innovation.id]);

  const labelHeight = useMemo(() => {
    switch (innovation.id) {
      case 'ai_kiosk': return 2.4;
      case 'smart_qds': return 2.2;
      case 'targeting_ai': return 1.8;
      case 'robotic_cleaner': return 1.2;
      case 'analytics_hub': return 2.6;
      default: return 2.0;
    }
  }, [innovation.id]);

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'grab'; }}
      onPointerOut={() => { setHovered(false); if (!dragging) document.body.style.cursor = 'auto'; }}
    >
      {/* Base platform with metallic rim */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.1, 24]} />
        <meshStandardMaterial color={dragging ? '#f59e0b' : hovered ? '#555' : '#2a2a2a'} metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.55, 0.02, 8, 32]} />
        <meshStandardMaterial color={dragging ? '#fbbf24' : '#4a4a4a'} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Drag indicator ring */}
      {(hovered || dragging) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.72, 32]} />
          <meshStandardMaterial color={dragging ? '#f59e0b' : '#60a5fa'} emissive={dragging ? '#f59e0b' : '#60a5fa'} emissiveIntensity={0.6} transparent opacity={0.7} />
        </mesh>
      )}

      {/* ===== AI KIOSK – Self-service touchscreen kiosk ===== */}
      {innovation.id === 'ai_kiosk' && (
        <group>
          {/* Main body – brushed metal cabinet */}
          <mesh position={[0, 0.65, 0]} castShadow>
            <boxGeometry args={[0.65, 1.1, 0.35]} />
            <meshStandardMaterial color="#c0c0c8" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Upper head with screen housing */}
          <mesh position={[0, 1.55, -0.02]} castShadow>
            <boxGeometry args={[0.6, 0.7, 0.3]} />
            <meshStandardMaterial color="#1e1e2e" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Main touchscreen */}
          <mesh position={[0, 1.55, 0.14]}>
            <boxGeometry args={[0.5, 0.55, 0.02]} />
            <meshStandardMaterial color="#0a1628" emissive="#4f46e5" emissiveIntensity={0.6} />
          </mesh>
          {/* Screen UI lines */}
          {[0.15, 0.05, -0.05, -0.15].map((yy, ii) => (
            <mesh key={ii} position={[0, 1.55 + yy, 0.155]}>
              <boxGeometry args={[0.35, 0.04, 0.005]} />
              <meshStandardMaterial color="#6366f1" emissive="#818cf8" emissiveIntensity={0.8} transparent opacity={0.9 - ii * 0.15} />
            </mesh>
          ))}
          {/* Header accent strip */}
          <mesh position={[0, 1.92, 0.14]}>
            <boxGeometry args={[0.5, 0.04, 0.025]} />
            <meshStandardMaterial color="#4f46e5" emissive="#4f46e5" emissiveIntensity={0.8} />
          </mesh>
          {/* Card reader slot */}
          <mesh position={[0.15, 0.35, 0.18]}>
            <boxGeometry args={[0.12, 0.04, 0.02]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Receipt printer slot */}
          <mesh position={[-0.15, 0.35, 0.18]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Status LED */}
          <mesh position={[0.25, 1.92, 0.16]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
          </mesh>
          {/* Side ventilation grills */}
          {[-0.33, 0.33].map((xx) => (
            <group key={xx}>
              {[0.5, 0.6, 0.7, 0.8].map((yy) => (
                <mesh key={yy} position={[xx, yy, 0]}>
                  <boxGeometry args={[0.01, 0.03, 0.2]} />
                  <meshStandardMaterial color="#888" metalness={0.8} />
                </mesh>
              ))}
            </group>
          ))}
          <pointLight position={[0, 1.55, 0.3]} intensity={0.3} color="#4f46e5" distance={1.5} />
        </group>
      )}

      {/* ===== SMART QUEUE DISPLAY – Digital signage board on stand ===== */}
      {innovation.id === 'smart_qds' && (
        <group>
          {/* Floor stand pole */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 1.0, 12]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Mount bracket */}
          <mesh position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[0.2, 0.08, 0.15]} />
            <meshStandardMaterial color="#666" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Screen bezel */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[1.0, 0.7, 0.06]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.5} />
          </mesh>
          {/* Screen panel */}
          <mesh position={[0, 1.6, 0.035]}>
            <boxGeometry args={[0.9, 0.58, 0.01]} />
            <meshStandardMaterial color="#051020" emissive="#0891b2" emissiveIntensity={0.3} />
          </mesh>
          {/* Queue number display */}
          <mesh position={[0.25, 1.68, 0.042]}>
            <boxGeometry args={[0.3, 0.3, 0.005]} />
            <meshStandardMaterial color="#0e7490" emissive="#22d3ee" emissiveIntensity={0.9} />
          </mesh>
          {/* "NOW SERVING" header bar */}
          <mesh position={[0, 1.85, 0.042]}>
            <boxGeometry args={[0.85, 0.06, 0.005]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.7} />
          </mesh>
          {/* Queue list rows */}
          {[-0.25, -0.15, -0.05, 0.05].map((xx, ii) => (
            <mesh key={ii} position={[xx - 0.1, 1.55, 0.042]}>
              <boxGeometry args={[0.15, 0.06, 0.005]} />
              <meshStandardMaterial color="#0891b2" emissive="#67e8f9" emissiveIntensity={0.5} transparent opacity={0.8 - ii * 0.1} />
            </mesh>
          ))}
          {/* Status indicator dots */}
          {[0.35, 0.4, 0.45].map((xx, ii) => (
            <mesh key={ii} position={[xx, 1.42, 0.042]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color={ii === 0 ? '#22c55e' : '#facc15'} emissive={ii === 0 ? '#22c55e' : '#facc15'} emissiveIntensity={1} />
            </mesh>
          ))}
          <pointLight position={[0, 1.6, 0.3]} intensity={0.3} color="#0891b2" distance={1.5} />
        </group>
      )}

      {/* ===== TARGETING AI – Smart camera/scanner tower ===== */}
      {innovation.id === 'targeting_ai' && (
        <group>
          {/* Base pedestal */}
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.25, 12]} />
            <meshStandardMaterial color="#2d1b69" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Central column */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
            <meshStandardMaterial color="#555" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* Camera dome housing */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <sphereGeometry args={[0.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1e1e2e" metalness={0.4} roughness={0.3} />
          </mesh>
          {/* Camera lens ring */}
          <mesh position={[0, 0.82, 0.12]} rotation={[Math.PI / 6, 0, 0]}>
            <torusGeometry args={[0.06, 0.015, 8, 16]} />
            <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.8} />
          </mesh>
          {/* Camera lens glass */}
          <mesh position={[0, 0.82, 0.13]} rotation={[Math.PI / 6, 0, 0]}>
            <circleGeometry args={[0.05, 16]} />
            <meshStandardMaterial color="#1e1b4b" emissive="#a78bfa" emissiveIntensity={0.4} />
          </mesh>
          {/* Rotating scanner dish */}
          <group ref={spinGroupRef} position={[0, 1.05, 0]}>
            <mesh>
              <ringGeometry args={[0.02, 0.18, 24]} />
              <meshStandardMaterial color="#7c3aed" emissive="#a78bfa" emissiveIntensity={0.5} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            {/* Scanning beam arm */}
            <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.15, 0.03, 8]} />
              <meshStandardMaterial color="#a78bfa" emissive="#c4b5fd" emissiveIntensity={1} transparent opacity={0.5} />
            </mesh>
          </group>
          {/* Side indicator lights */}
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, ii) => (
            <mesh key={ii} position={[Math.cos(angle) * 0.26, 0.2, Math.sin(angle) * 0.26]}>
              <sphereGeometry args={[0.015, 6, 6]} />
              <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={1.2} />
            </mesh>
          ))}
          <pointLight position={[0, 1.0, 0.3]} intensity={0.25} color="#7c3aed" distance={1.5} />
        </group>
      )}

      {/* ===== ROBOTIC CLEANER – Roomba-style floor robot ===== */}
      {innovation.id === 'robotic_cleaner' && (
        <group>
          {/* Main disc body */}
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 0.12, 24]} />
            <meshStandardMaterial color="#059669" metalness={0.5} roughness={0.3} />
          </mesh>
          {/* Top dome shell */}
          <mesh position={[0, 0.23, 0]}>
            <sphereGeometry args={[0.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
            <meshStandardMaterial color="#047857" metalness={0.4} roughness={0.4} />
          </mesh>
          {/* Bumper ring */}
          <mesh position={[0, 0.15, 0]}>
            <torusGeometry args={[0.41, 0.025, 8, 32]} />
            <meshStandardMaterial color="#333" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* Top sensor turret */}
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.08, 12]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* LIDAR sensor dome */}
          <mesh ref={meshRef} position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.06, 12, 8]} />
            <meshStandardMaterial color="#10b981" emissive="#34d399" emissiveIntensity={0.8} />
          </mesh>
          {/* Front LED strip */}
          {[-0.12, -0.04, 0.04, 0.12].map((xx) => (
            <mesh key={xx} position={[xx, 0.22, 0.35]}>
              <boxGeometry args={[0.05, 0.02, 0.01]} />
              <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.2} />
            </mesh>
          ))}
          {/* Side brush assemblies */}
          {[[-0.3, 0.08, 0.25], [0.3, 0.08, 0.25]].map(([bx, by, bz], ii) => (
            <group key={ii} position={[bx, by, bz]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.08, 0.08, 0.01, 12]} />
                <meshStandardMaterial color="#444" metalness={0.4} />
              </mesh>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.06, 0.01, 4, 8]} />
                <meshStandardMaterial color="#888" />
              </mesh>
            </group>
          ))}
          {/* Rear dust bin */}
          <mesh position={[0, 0.12, -0.32]}>
            <boxGeometry args={[0.2, 0.06, 0.08]} />
            <meshStandardMaterial color="#065f46" metalness={0.3} />
          </mesh>
          {/* Side wheels */}
          {[-0.32, 0.32].map((xx) => (
            <mesh key={xx} position={[xx, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
              <meshStandardMaterial color="#222" metalness={0.3} roughness={0.6} />
            </mesh>
          ))}
          <pointLight position={[0, 0.5, 0.3]} intensity={0.2} color="#10b981" distance={1} />
        </group>
      )}

      {/* ===== ANALYTICS HUB – Server rack command center ===== */}
      {innovation.id === 'analytics_hub' && (
        <group>
          {/* Server cabinet body */}
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[0.7, 1.8, 0.5]} />
            <meshStandardMaterial color="#1e1e2e" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* Front panel inset */}
          <mesh position={[0, 1.0, 0.26]}>
            <boxGeometry args={[0.62, 1.7, 0.01]} />
            <meshStandardMaterial color="#111827" metalness={0.3} roughness={0.6} />
          </mesh>
          {/* Top display screen */}
          <mesh position={[0, 1.6, 0.27]}>
            <boxGeometry args={[0.55, 0.45, 0.01]} />
            <meshStandardMaterial color="#0a0a1a" emissive="#dc2626" emissiveIntensity={0.2} />
          </mesh>
          {/* Chart bars on screen */}
          {[-0.18, -0.09, 0, 0.09, 0.18].map((xx, ii) => {
            const h = [0.2, 0.32, 0.15, 0.28, 0.22][ii];
            return (
              <mesh key={ii} position={[xx, 1.4 + h / 2, 0.28]}>
                <boxGeometry args={[0.06, h, 0.005]} />
                <meshStandardMaterial color={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][ii]} emissive={['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][ii]} emissiveIntensity={0.8} />
              </mesh>
            );
          })}
          {/* Server rack bays with LEDs */}
          {[0.5, 0.7, 0.9, 1.1].map((yy, ii) => (
            <group key={ii}>
              <mesh position={[0, yy, 0.27]}>
                <boxGeometry args={[0.55, 0.12, 0.01]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
              </mesh>
              {/* Drive bay slots */}
              {[-0.2, -0.1, 0, 0.1, 0.2].map((xx, jj) => (
                <mesh key={jj} position={[xx, yy, 0.28]}>
                  <boxGeometry args={[0.06, 0.08, 0.005]} />
                  <meshStandardMaterial color="#374151" metalness={0.6} />
                </mesh>
              ))}
              {/* Status LED */}
              <mesh position={[0.27, yy, 0.28]}>
                <sphereGeometry args={[0.012, 6, 6]} />
                <meshStandardMaterial color={ii % 2 === 0 ? '#22c55e' : '#3b82f6'} emissive={ii % 2 === 0 ? '#22c55e' : '#3b82f6'} emissiveIntensity={1.5} />
              </mesh>
            </group>
          ))}
          {/* Top ventilation */}
          {[-0.15, 0, 0.15].map((xx) => (
            <mesh key={xx} position={[xx, 1.9, 0]}>
              <boxGeometry args={[0.1, 0.01, 0.3]} />
              <meshStandardMaterial color="#374151" metalness={0.6} />
            </mesh>
          ))}
          {/* Side accent strips */}
          {[-0.36, 0.36].map((xx) => (
            <mesh key={xx} position={[xx, 1.0, 0.2]}>
              <boxGeometry args={[0.01, 1.6, 0.02]} />
              <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} />
            </mesh>
          ))}
          {/* Power indicator */}
          <mesh position={[0, 0.15, 0.27]}>
            <circleGeometry args={[0.025, 12]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
          </mesh>
          <pointLight position={[0, 1.6, 0.5]} intensity={0.25} color="#dc2626" distance={1.5} />
        </group>
      )}

      {/* ===== DEFAULT – Generic tech device ===== */}
      {!['ai_kiosk', 'smart_qds', 'targeting_ai', 'robotic_cleaner', 'analytics_hub'].includes(innovation.id) && (
        <group>
          <mesh position={[0, 0.8, 0]} castShadow>
            <boxGeometry args={[0.5, 1.4, 0.35]} />
            <meshStandardMaterial color="#6366f1" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.1, 0.19]}>
            <boxGeometry args={[0.4, 0.4, 0.02]} />
            <meshStandardMaterial color="#1e293b" emissive="#6366f1" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}

      {/* Name label */}
      <Billboard position={[0, labelHeight, 0]}>
        <Text fontSize={0.15} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {innovation.name}
        </Text>
      </Billboard>

      {/* Drag hint */}
      {hovered && !dragging && (
        <Billboard position={[0, labelHeight + 0.35, 0]}>
          <Text fontSize={0.1} color="#fbbf24" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000000">
            Drag to move
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// Default positions near shop entrance area (Y=0.1 = floor surface)
const INNOVATION_DEFAULT_POSITIONS: Vec3[] = [
  [3, 0.1, 5.5],    // near entrance right
  [-3, 0.1, 5.5],   // near entrance left
  [5, 0.1, 4],      // right side near entrance
  [-5, 0.1, 4],     // left side near entrance
  [0, 0.1, 5],      // center near entrance
];

function InnovationManager({ innovations, onMove }: { innovations: ActiveInnovation[]; onMove?: (id: string, x: number, z: number) => void }) {
  if (!innovations.length) return null;

  return (
    <group>
      {innovations.slice(0, 5).map((inn, i) => {
        const pos: Vec3 = (inn.x != null && inn.y != null)
          ? [inn.x, 0.1, inn.y]
          : INNOVATION_DEFAULT_POSITIONS[i % INNOVATION_DEFAULT_POSITIONS.length];
        return (
          <InnovationItem key={inn.id} innovation={inn} position={pos} onMove={onMove} />
        );
      })}
    </group>
  );
}

// ============================================================================
// CAR TRAFFIC
// ============================================================================
function CarTraffic() {
  if (useLiteScene) {
    return (
      <group>
        <Car modelPath={ACTIVE_CAR_MODELS[0]} startX={-70} speed={8} z={36} scale={0.05} rotY={Math.PI / 2} />
        <Car modelPath={ACTIVE_CAR_MODELS[0]} startX={70} speed={-8} z={40} scale={0.05} rotY={-Math.PI / 2} />
      </group>
    );
  }

  return (
    <group>
      {/* Cars moving left to right (near lane) — reduced from 4 to 2 */}
      <Car modelPath={ACTIVE_CAR_MODELS[0]} startX={-80} speed={12} z={36} scale={0.05} rotY={Math.PI / 2} />
      <Car modelPath={ACTIVE_CAR_MODELS[1]} startX={-30} speed={10} z={36} scale={1.5} rotY={Math.PI / 2} />
      {/* Cars moving right to left (far lane) — reduced from 4 to 2 */}
      <Car modelPath={ACTIVE_CAR_MODELS[2]} startX={70} speed={-11} z={40} scale={0.01} rotY={-Math.PI / 2} />
      <Car modelPath={ACTIVE_CAR_MODELS[0]} startX={30} speed={-10} z={40} scale={0.05} rotY={-Math.PI / 2} />
    </group>
  );
}

// ============================================================================
// WORLD: GROUND + DECORATIONS
// ============================================================================
function Ground({ color }: { color: string }) {
  return (
    <MaybeRigidBody type="fixed" userData={{}}>
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[300, 1, 300]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </MaybeRigidBody>
  );
}

function Tree({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <MaybeRigidBody type="fixed" userData={{}}>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 4, 0]} castShadow receiveShadow>
          <sphereGeometry args={[2, 8, 6]} />
          <meshStandardMaterial color="#32CD32" />
        </mesh>
      </MaybeRigidBody>
    </group>
  );
}

// ============================================================================
// LAMP POST – street lights outside the shop
// ============================================================================
function LampPost({ position, color = '#ffeebb' }: { position: Vec3; color?: string }) {
  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 5, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.1, 8]} />
        <meshStandardMaterial color="#222222" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Arm */}
      <mesh position={[0.4, 4.8, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Lamp head */}
      <mesh position={[0.7, 5.1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.35, 0.4, 8]} />
        <meshStandardMaterial color="#444444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Lamp bulb glow */}
      <mesh position={[0.7, 4.85, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
      {/* Actual light */}
      <pointLight position={[0.7, 4.7, 0]} color={color} intensity={4} distance={18} castShadow={false} />
    </group>
  );
}

// ============================================================================
// GLB MODEL – generic loader for flowers, grass, buildings
// ============================================================================
function GLBModel({
  path,
  position,
  scale = 1,
  rotation = [0, 0, 0],
}: {
  path: string;
  position: Vec3;
  scale?: number | Vec3;
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone();
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const s = typeof scale === 'number' ? [scale, scale, scale] as Vec3 : scale;

  return (
    <group position={position} rotation={rotation} scale={s}>
      <primitive object={cloned} />
    </group>
  );
}

// Exterior decor models load lazily inside <Suspense> below.

// ============================================================================
// GRASS PATCHES – textured grass planes around the shop
// ============================================================================
const GRASS_PATCH_DATA = [
  [-6, 12], [6, 12], [-12, 5], [12, 5], [-8, -4], [8, -4],
  [-15, 10], [15, 10], [0, 16], [-20, 0], [20, 0],
  [-10, -8], [10, -8], [0, -10], [-16, -5], [16, -5],
].map(([x, z], i) => ({
  x, z,
  rotZ: (i * 0.7 + 0.3) * Math.PI % Math.PI,
  radius: 1.5 + (i * 0.37 % 1) * 1.5,
  color: i % 2 === 0 ? '#5a9e3e' : '#4a8e30',
}));

function GrassPatches() {
  return (
    <group>
      {GRASS_PATCH_DATA.map((g, i) => (
        <mesh key={`gp-${i}`} position={[g.x, 0.02, g.z]} rotation={[-Math.PI / 2, 0, g.rotZ]}>
          <circleGeometry args={[g.radius, 8]} />
          <meshStandardMaterial color={g.color} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

// ============================================================================
// FLOWER BED – clusters of tulip GLBs
// ============================================================================
function FlowerBed({ center, count = 5, radius = 2 }: { center: Vec3; count?: number; radius?: number }) {
  const flowers = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = radius * (0.3 + Math.random() * 0.7);
      return {
        x: center[0] + Math.cos(angle) * r,
        z: center[2] + Math.sin(angle) * r,
        rotY: Math.random() * Math.PI * 2,
        s: 0.4 + Math.random() * 0.25,
      };
    });
  }, [center, count, radius]);

  return (
    <group>
      {flowers.map((f, i) => (
        <GLBModel
          key={`flower-${i}`}
          path={EXTERIOR_MODELS.tulip}
          position={[f.x, 0, f.z]}
          scale={f.s}
          rotation={[0, f.rotY, 0]}
        />
      ))}
    </group>
  );
}

// ============================================================================
// EXTERIOR BUILDINGS – Large + Small building GLBs
// ============================================================================
function ExteriorBuildings() {
  return (
    <group>
      {/* Large building – far left across the road */}
      <GLBModel
        path={EXTERIOR_MODELS.largeBldg}
        position={[-30, 0, 55]}
        scale={12}
        rotation={[0, Math.PI * 0.1, 0]}
      />
      {/* Small building – far right across the road */}
      <GLBModel
        path={EXTERIOR_MODELS.smallBldg}
        position={[30, 0, 55]}
        scale={10}
        rotation={[0, -Math.PI * 0.15, 0]}
      />
    </group>
  );
}

function DoorIndicator() {
  const ringRef = useRef<THREE.Mesh>(null);
  const arrowRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 3) * 0.12;

    if (ringRef.current) {
      ringRef.current.scale.set(pulse, pulse, pulse);
    }

    if (arrowRef.current) {
      arrowRef.current.position.y = 2.25 + Math.sin(t * 2.8) * 0.14;
    }

    if (beamRef.current) {
      beamRef.current.scale.y = 1 + Math.sin(t * 2.2) * 0.06;
    }
  });

  return (
    <group position={[0, 0, 8.25]}>
      <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.25, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.95} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 24]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.75} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh ref={beamRef} position={[0, 1.95, 0]} renderOrder={180}>
        <cylinderGeometry args={[0.24, 0.54, 3.7, 24, 1, true]} />
        <meshBasicMaterial
          color="#22d3ee"
          transparent
          opacity={0.24}
          side={THREE.DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={arrowRef} position={[0, 2.25, 0]} rotation={[Math.PI, 0, 0]} renderOrder={220}>
        <coneGeometry args={[0.28, 0.6, 20]} />
        <meshBasicMaterial color="#facc15" depthTest={false} depthWrite={false} />
      </mesh>
      <Text
        position={[0, 3.15, 0]}
        fontSize={0.36}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.045}
        outlineColor="#0f172a"
      >
        GO IN HERE
      </Text>
      <pointLight position={[0, 1.8, 0]} color="#22d3ee" intensity={1.6} distance={8} />
    </group>
  );
}

// ============================================================================
// SHOP BUILDING - With Textured Walls
// ============================================================================
function ShopStructure({
  int,
  shopName,
  floorStyleId,
  wallStyleId,
}: {
  ext: ThemeConfig['exterior'];
  int: ThemeConfig['interior'];
  shopName: string;
  floorStyleId?: string;
  wallStyleId?: string;
}) {
  // Auto-capitalize first letter of each word in the shop name
  const displayName = (shopName || 'My Shop').replace(/\b\w/g, c => c.toUpperCase());
  const facadeColor = '#9e9689';
  const facadeLighter = '#b5ad9e';
  const facadeDark = '#7a746b';
  const goldAccent = '#c8a96e';
  const glassColor = '#a8d4e6';
  const marbleBase = '#e8e0d4';

  // Wall + floor procedural textures. Generating these on mount blocks the
  // main thread for ~100–300 ms per texture (a 512×512 Canvas2D draw with
  // up to 30 path operations). We start with `null` so the first frame
  // renders a flat-colour material — cheap — then upgrade to the textured
  // material once requestIdleCallback fires. The visual swap is barely
  // perceptible because the base colour is the texture's dominant tone.
  const [wallTexture, setWallTexture] = useState<THREE.Texture | null>(null);
  const [floorTexture, setFloorTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const ric = (typeof window !== 'undefined' && (window as any).requestIdleCallback)
      || ((cb: () => void) => window.setTimeout(cb, 32));
    const h1 = ric(() => setWallTexture(createWallTexture(int.walls, wallStyleId)), { timeout: 1500 });
    const h2 = ric(() => setFloorTexture(createFloorTexture(int.floor, floorStyleId)), { timeout: 1500 });
    return () => {
      const cic = (typeof window !== 'undefined' && (window as any).cancelIdleCallback)
        || ((id: number) => window.clearTimeout(id));
      cic(h1); cic(h2);
    };
  }, [int.walls, int.floor, wallStyleId, floorStyleId]);

  // Reduced lights for low-end devices
  const showExtraLights = !useLiteScene;

  return (
    <group>
      <MaybeRigidBody type="fixed" userData={{}}>
        <mesh position={[0, 2.5, -7]} castShadow receiveShadow><boxGeometry args={[18, 5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[-9, 2.5, 0]} castShadow receiveShadow><boxGeometry args={[0.5, 5, 14]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[9, 2.5, 0]} castShadow receiveShadow><boxGeometry args={[0.5, 5, 14]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[-7.75, 2.5, 7]} castShadow receiveShadow><boxGeometry args={[2.5, 5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[7.75, 2.5, 7]} castShadow receiveShadow><boxGeometry args={[2.5, 5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[0, 4.25, 7]} castShadow receiveShadow><boxGeometry args={[4, 1.5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[-3.5, 2.5, 7]} castShadow receiveShadow><boxGeometry args={[1, 5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[3.5, 2.5, 7]} castShadow receiveShadow><boxGeometry args={[1, 5, 0.5]} /><meshStandardMaterial color={facadeColor} /></mesh>
        <mesh position={[0, 5.1, 0]} castShadow receiveShadow><boxGeometry args={[18.5, 0.2, 15]} /><meshStandardMaterial color={facadeDark} /></mesh>
        {/* Floor — fallback `color` ensures it isn't flat white during the
            ~1 frame before the procedural texture finishes generating. */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[17.5, 0.1, 13.5]} />
          <meshStandardMaterial map={floorTexture} color={int.floor} roughness={0.4} />
        </mesh>
        <mesh position={[0, 5, 0]} receiveShadow userData={{ camExcludeCollision: true }}>
          <boxGeometry args={[17.5, 0.2, 13.5]} />
          <meshStandardMaterial map={wallTexture} color={int.walls} roughness={0.9} />
        </mesh>
      </MaybeRigidBody>

      {/* Interior wall panels — same color fallback while textures load. */}
      <mesh position={[0, 2.5, -6.7]} receiveShadow>
        <planeGeometry args={[17.5, 5]} />
        <meshStandardMaterial map={wallTexture} color={int.walls} roughness={0.9} />
      </mesh>
      <mesh position={[-8.7, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[13.5, 5]} />
        <meshStandardMaterial map={wallTexture} color={int.walls} roughness={0.9} />
      </mesh>
      <mesh position={[8.7, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[13.5, 5]} />
        <meshStandardMaterial map={wallTexture} color={int.walls} roughness={0.9} />
      </mesh>
      
      {/* Wall trim/molding */}
      <mesh position={[0, 1, -6.65]}>
        <boxGeometry args={[17.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#e0d8d0" roughness={0.5} />
      </mesh>
      <mesh position={[-8.65, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[13.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#e0d8d0" roughness={0.5} />
      </mesh>
      <mesh position={[8.65, 1, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[13.5, 0.1, 0.02]} />
        <meshStandardMaterial color="#e0d8d0" roughness={0.5} />
      </mesh>

      {/* ============ FUTURISTIC SHOP SIGN ============ */}
      {/* Main parapet backing – sleek dark surface */}
      <mesh position={[0, 6.3, 7]} castShadow receiveShadow>
        <boxGeometry args={[18.5, 2.4, 0.6]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Glowing neon top edge strip */}
      <mesh position={[0, 7.55, 7.1]}>
        <boxGeometry args={[18.8, 0.08, 0.6]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Glowing neon bottom edge strip */}
      <mesh position={[0, 5.15, 7.1]}>
        <boxGeometry args={[18.8, 0.06, 0.6]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={1.8} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Inner sign panel – gradient dark with glow backing */}
      <mesh position={[0, 6.35, 7.35]} castShadow>
        <boxGeometry args={[14.5, 1.8, 0.12]} />
        <meshStandardMaterial color="#0f0f23" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Inner neon border – cyan glow frame */}
      <mesh position={[0, 6.35, 7.42]}>
        <boxGeometry args={[14.8, 1.95, 0.02]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.2} metalness={0.8} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Inner panel face */}
      <mesh position={[0, 6.35, 7.44]}>
        <boxGeometry args={[14.2, 1.6, 0.02]} />
        <meshStandardMaterial color="#16162a" metalness={0.4} roughness={0.3} emissive="#1a1a3e" emissiveIntensity={0.3} />
      </mesh>

      {/* Shop name – main glowing text */}
      <Text
        position={[0, 6.45, 7.5]}
        fontSize={displayName.length > 14 ? 0.55 : 0.72}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#7c3aed"
        maxWidth={13}
        font={undefined}
      >
        {displayName}
      </Text>
      {/* Subtitle tagline */}
      <Text
        position={[0, 5.85, 7.5]}
        fontSize={0.18}
        color="#00d4ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#0f0f23"
        font={undefined}
      >
        {'OPEN NOW'}
      </Text>

      {/* Decorative star accents on sign – left & right */}
      {[-6.2, 6.2].map((sx, i) => (
        <group key={`sign-star-${i}`} position={[sx, 6.35, 7.48]}>
          {/* Diamond shape */}
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.35, 0.35, 0.04]} />
            <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={1.5} metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Inner glow */}
          <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 0, 0.03]}>
            <boxGeometry args={[0.2, 0.2, 0.02]} />
            <meshStandardMaterial color="#fff" emissive="#fff5b0" emissiveIntensity={2} />
          </mesh>
          <pointLight color="#facc15" intensity={1} distance={3} />
        </group>
      ))}

      {/* Side accent bars – vertical neon strips */}
      {[-7.25, 7.25].map((sx, i) => (
        <mesh key={`sign-vbar-${i}`} position={[sx, 6.35, 7.46]}>
          <boxGeometry args={[0.08, 1.5, 0.03]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* Sign spotlights – modern recessed downlights */}
      {[-5, -2.5, 0, 2.5, 5].map((x) => (
        <group key={`sign-light-${x}`} position={[x, 7.5, 7.5]}>
          {/* Flush-mount housing */}
          <mesh>
            <cylinderGeometry args={[0.1, 0.12, 0.06, 12]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* LED ring */}
          <mesh position={[0, -0.04, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={3} />
          </mesh>
          <pointLight position={[0, -0.3, 0.1]} color="#e0f0ff" intensity={2} distance={5} />
        </group>
      ))}

      {/* Holographic glow plane behind sign text */}
      <mesh position={[0, 6.35, 7.43]}>
        <planeGeometry args={[12, 1.2]} />
        <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.4} transparent opacity={0.15} side={THREE.FrontSide} />
      </mesh>

      {/* Display windows — glassmorphism see-through */}
      {[[-5.75, 7.15], [5.75, 7.15]].map(([wx, wz], wi) => (
        <group key={`dw-${wi}`} position={[wx, 2.2, wz]}>
          {/* Thin frame border (top/bottom/left/right) instead of solid dark backing */}
          <mesh castShadow position={[0, 1.93, 0.06]}><boxGeometry args={[3.5, 0.08, 0.1]} /><meshStandardMaterial color={facadeDark} metalness={0.5} roughness={0.3} /></mesh>
          <mesh castShadow position={[0, -1.93, 0.06]}><boxGeometry args={[3.5, 0.08, 0.1]} /><meshStandardMaterial color={facadeDark} metalness={0.5} roughness={0.3} /></mesh>
          <mesh castShadow position={[-1.75, 0, 0.06]}><boxGeometry args={[0.08, 3.8, 0.1]} /><meshStandardMaterial color={facadeDark} metalness={0.5} roughness={0.3} /></mesh>
          <mesh castShadow position={[1.75, 0, 0.06]}><boxGeometry args={[0.08, 3.8, 0.1]} /><meshStandardMaterial color={facadeDark} metalness={0.5} roughness={0.3} /></mesh>
          {/* Glass panel — transparent with transmission for see-through */}
          <mesh position={[0, 0, 0.08]}><boxGeometry args={[3.2, 3.5, 0.04]} /><meshPhysicalMaterial color="#dbeafe" transparent opacity={0.35} transmission={0.85} thickness={0.3} roughness={0.08} ior={1.45} metalness={0.05} envMapIntensity={0.5} /></mesh>
          {/* Dividers */}
          <mesh position={[0, 0, 0.1]}><boxGeometry args={[0.06, 3.5, 0.02]} /><meshStandardMaterial color={facadeDark} metalness={0.5} /></mesh>
          <mesh position={[0, 0.5, 0.1]}><boxGeometry args={[3.2, 0.06, 0.02]} /><meshStandardMaterial color={facadeDark} metalness={0.5} /></mesh>
        </group>
      ))}
      <pointLight position={[-5.75, 2.2, 6.5]} color="#fff5e0" intensity={3} distance={5} />
      <pointLight position={[5.75, 2.2, 6.5]} color="#fff5e0" intensity={3} distance={5} />

      {/* Pillar columns */}
      {[
        { pos: [-9, 2.5, 7.2] as [number,number,number], s: 0.6, b: 0.8 },
        { pos: [-3.5, 2.5, 7.2] as [number,number,number], s: 0.5, b: 0.7 },
        { pos: [3.5, 2.5, 7.2] as [number,number,number], s: 0.5, b: 0.7 },
        { pos: [9, 2.5, 7.2] as [number,number,number], s: 0.6, b: 0.8 },
      ].map(({ pos, s, b }, i) => (
        <group key={`pillar-${i}`} position={pos}>
          <mesh castShadow><boxGeometry args={[s, 5, s]} /><meshStandardMaterial color={facadeLighter} metalness={0.4} roughness={0.5} /></mesh>
          <mesh position={[0, -2.3, 0]} castShadow><boxGeometry args={[b, 0.4, b]} /><meshStandardMaterial color={marbleBase} metalness={0.2} roughness={0.4} /></mesh>
          <mesh position={[0, 2.3, 0]} castShadow><boxGeometry args={[b, 0.3, b]} /><meshStandardMaterial color={goldAccent} metalness={0.6} roughness={0.3} /></mesh>
        </group>
      ))}

      {/* Marble base strip */}
      <mesh position={[0, 0.2, 7.35]} castShadow><boxGeometry args={[18.5, 0.4, 0.3]} /><meshStandardMaterial color={marbleBase} metalness={0.15} roughness={0.5} /></mesh>

      {/* Front canopy */}
      <mesh position={[0, 4.9, 8.5]} castShadow><boxGeometry args={[18.5, 0.12, 2.5]} /><meshStandardMaterial color={facadeDark} metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[0, 4.8, 9.7]} castShadow><boxGeometry args={[18.5, 0.35, 0.08]} /><meshStandardMaterial color={goldAccent} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 4.82, 8.5]}><boxGeometry args={[18.3, 0.02, 2.3]} /><meshStandardMaterial color={facadeLighter} emissive={facadeLighter} emissiveIntensity={0.1} /></mesh>
      {[-7, -4.5, -2, 0, 2, 4.5, 7].map((x) => (
        <group key={`canopy-dl-${x}`} position={[x, 4.75, 8.0]}>
          <mesh><cylinderGeometry args={[0.06, 0.08, 0.05, 8]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffe8b0" emissiveIntensity={4} /></mesh>
          <pointLight position={[0, -0.3, 0]} color="#fff5e0" intensity={2} distance={5} />
        </group>
      ))}

      {/* Door frame + glass doors */}
      <mesh position={[-2, 1.75, 7.3]} castShadow><boxGeometry args={[0.15, 3.5, 0.15]} /><meshStandardMaterial color={goldAccent} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[2, 1.75, 7.3]} castShadow><boxGeometry args={[0.15, 3.5, 0.15]} /><meshStandardMaterial color={goldAccent} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 3.55, 7.3]} castShadow><boxGeometry args={[4.15, 0.15, 0.15]} /><meshStandardMaterial color={goldAccent} metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[-0.95, 1.75, 7.28]}><boxGeometry args={[1.7, 3.3, 0.04]} /><meshPhysicalMaterial color="#dbeafe" transparent opacity={0.3} transmission={0.9} thickness={0.2} roughness={0.05} ior={1.45} metalness={0.05} envMapIntensity={0.4} /></mesh>
      <mesh position={[0.95, 1.75, 7.28]}><boxGeometry args={[1.7, 3.3, 0.04]} /><meshPhysicalMaterial color="#dbeafe" transparent opacity={0.3} transmission={0.9} thickness={0.2} roughness={0.05} ior={1.45} metalness={0.05} envMapIntensity={0.4} /></mesh>
      <mesh position={[-0.2, 1.75, 7.35]} castShadow><boxGeometry args={[0.04, 0.8, 0.04]} /><meshStandardMaterial color={goldAccent} metalness={0.8} roughness={0.15} /></mesh>
      <mesh position={[0.2, 1.75, 7.35]} castShadow><boxGeometry args={[0.04, 0.8, 0.04]} /><meshStandardMaterial color={goldAccent} metalness={0.8} roughness={0.15} /></mesh>

      {/* ===== ENTRANCE BLOCKER — invisible physics wall when ALLOW_EXIT_SHOP is false ===== */}
      {!ALLOW_EXIT_SHOP && (
        <MaybeRigidBody type="fixed" userData={{}}>
          {/* Solid invisible wall spanning the entire front opening */}
          <mesh position={[0, 2.5, 7.25]}>
            <boxGeometry args={[18.5, 5, 0.5]} />
            <meshStandardMaterial transparent opacity={0} />
          </mesh>
        </MaybeRigidBody>
      )}

      {/* ===== INTERIOR FUTURISTIC SHOP SIGN — above door, facing inward ===== */}
      <group position={[0, 4.35, 6.7]}>
        {/* Dark backing panel */}
        <mesh>
          <boxGeometry args={[7, 1.1, 0.1]} />
          <meshStandardMaterial color="#0a0a1a" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Cyan neon border frame */}
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[7.2, 1.25, 0.02]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.5} metalness={0.9} roughness={0.1} transparent opacity={0.6} />
        </mesh>
        {/* Inner glowing panel */}
        <mesh position={[0, 0, -0.02]}>
          <boxGeometry args={[6.6, 0.85, 0.02]} />
          <meshStandardMaterial color="#12122a" metalness={0.4} roughness={0.3} emissive="#1e1e4a" emissiveIntensity={0.4} />
        </mesh>
        {/* Holographic glow behind text */}
        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[6, 0.7]} />
          <meshStandardMaterial color="#7c3aed" emissive="#7c3aed" emissiveIntensity={0.5} transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>

        {/* Shop name text – facing inside the shop */}
        <Text
          position={[0, 0.08, -0.06]}
          rotation={[0, Math.PI, 0]}
          fontSize={displayName.length > 14 ? 0.32 : 0.42}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#7c3aed"
          maxWidth={6}
          font={undefined}
        >
          {displayName}
        </Text>
        {/* Tagline */}
        <Text
          position={[0, -0.25, -0.06]}
          rotation={[0, Math.PI, 0]}
          fontSize={0.12}
          color="#00d4ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#0a0a1a"
          font={undefined}
        >
          {'WELCOME'}
        </Text>

        {/* Left & right star decorations */}
        {[-3.2, 3.2].map((sx, i) => (
          <group key={`isign-star-${i}`} position={[sx, 0, -0.06]}>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.2, 0.2, 0.03]} />
              <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={2} metalness={0.9} roughness={0.1} />
            </mesh>
            <pointLight color="#facc15" intensity={0.6} distance={2} />
          </group>
        ))}
        {/* Side neon accent bars */}
        {[-3.45, 3.45].map((sx, i) => (
          <mesh key={`isign-bar-${i}`} position={[sx, 0, -0.04]}>
            <boxGeometry args={[0.06, 0.9, 0.03]} />
            <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.5} metalness={0.9} roughness={0.1} />
          </mesh>
        ))}
        {/* Top neon strip */}
        <mesh position={[0, 0.55, -0.04]}>
          <boxGeometry args={[7, 0.04, 0.03]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2.5} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Bottom neon strip */}
        <mesh position={[0, -0.55, -0.04]}>
          <boxGeometry args={[7, 0.04, 0.03]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Downlights for the sign */}
        {[-2, 0, 2].map((lx) => (
          <pointLight key={`isign-dl-${lx}`} position={[lx, -0.6, -0.2]} color="#e0f0ff" intensity={1.2} distance={3} />
        ))}
      </group>

      {/* Secondary fascia */}
      <mesh position={[0, 4.5, 7.32]}><boxGeometry args={[18, 0.5, 0.06]} /><meshStandardMaterial color={facadeLighter} metalness={0.3} roughness={0.5} /></mesh>
      <mesh position={[0, 4.72, 7.36]}><boxGeometry args={[18, 0.04, 0.02]} /><meshStandardMaterial color={goldAccent} metalness={0.7} roughness={0.2} /></mesh>
      <mesh position={[0, 4.28, 7.36]}><boxGeometry args={[18, 0.04, 0.02]} /><meshStandardMaterial color={goldAccent} metalness={0.7} roughness={0.2} /></mesh>

      {/* Side wall windows */}
      {[-3, 3].map((z) => (
        <group key={`win-l-${z}`} position={[-9.3, 2.5, z]}>
          <mesh castShadow><boxGeometry args={[0.08, 2.2, 1.6]} /><meshStandardMaterial color={facadeDark} metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0.01, 0, 0]}><boxGeometry args={[0.04, 1.9, 1.3]} /><meshStandardMaterial color={glassColor} transparent opacity={0.35} metalness={0.9} roughness={0.05} /></mesh>
        </group>
      ))}
      {[-3, 3].map((z) => (
        <group key={`win-r-${z}`} position={[9.3, 2.5, z]}>
          <mesh castShadow><boxGeometry args={[0.08, 2.2, 1.6]} /><meshStandardMaterial color={facadeDark} metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[-0.01, 0, 0]}><boxGeometry args={[0.04, 1.9, 1.3]} /><meshStandardMaterial color={glassColor} transparent opacity={0.35} metalness={0.9} roughness={0.05} /></mesh>
        </group>
      ))}

      {/* Facade lighting - reduced on low-end devices */}
      {(showExtraLights ? [-7, -3.5, 0, 3.5, 7] : [0]).map((x) => (
        <group key={`uplight-${x}`} position={[x, 0.15, 7.8]}>
          <mesh><boxGeometry args={[0.3, 0.08, 0.15]} /><meshStandardMaterial color="#222" metalness={0.6} /></mesh>
          <pointLight position={[0, 0.5, -0.2]} color="#fff5e0" intensity={showExtraLights ? 1.5 : 2} distance={showExtraLights ? 5 : 10} />
        </group>
      ))}
      {showExtraLights && [-3, 3].map((z) => (
        <group key={`sconce-l-${z}`} position={[-9.35, 3.5, z]}>
          <mesh castShadow><boxGeometry args={[0.15, 0.35, 0.2]} /><meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[-0.08, -0.05, 0]}><sphereGeometry args={[0.08, isLowEndDevice ? 6 : 8, isLowEndDevice ? 6 : 8]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffe8b0" emissiveIntensity={3} /></mesh>
          <pointLight position={[-0.3, 0, 0]} color="#ffe8b0" intensity={1.5} distance={6} />
        </group>
      ))}
      {showExtraLights && [-3, 3].map((z) => (
        <group key={`sconce-r-${z}`} position={[9.35, 3.5, z]}>
          <mesh castShadow><boxGeometry args={[0.15, 0.35, 0.2]} /><meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0.08, -0.05, 0]}><sphereGeometry args={[0.08, isLowEndDevice ? 6 : 8, isLowEndDevice ? 6 : 8]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffe8b0" emissiveIntensity={3} /></mesh>
          <pointLight position={[0.3, 0, 0]} color="#ffe8b0" intensity={1.5} distance={6} />
        </group>
      ))}

      {/* LED strips */}
      <mesh position={[0, 5.22, 7.35]}><boxGeometry args={[18.3, 0.04, 0.04]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffe8b0" emissiveIntensity={2} /></mesh>
      <mesh position={[0, 7.38, 7.35]}><boxGeometry args={[18.3, 0.04, 0.04]} /><meshStandardMaterial color="#ffe8b0" emissive="#ffe8b0" emissiveIntensity={2} /></mesh>
    </group>
  );
}

// ============================================================================
// INTERIOR
// ============================================================================
// ============================================================================
// PRODUCT DISPLAY - single product box with image label
// ============================================================================
/** Rewrite external product image URLs to go through Vite proxy to avoid CORS */
function proxyProductImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Route artventure.test or aigenius.com.my through /api proxy
    if (parsed.hostname.includes('artventure') || parsed.hostname.includes('aigenius')) {
      return `/api${parsed.pathname}`;
    }
  } catch {
    // relative URL — already same-origin, fine as-is
  }
  return url;
}

function useProductTexture(imageUrl?: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const proxied = proxyProductImageUrl(imageUrl);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      proxied,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => { /* CORS or network error — just skip the image */ },
    );
    return () => { cancelled = true; };
  }, [imageUrl]);
  return texture;
}

function ProductBox({
  product,
  position,
  color,
  onSelect,
}: {
  product: Product;
  position: Vec3;
  color: string;
  onSelect: (p: Product) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const texture = useProductTexture(product.image_url);

  return (
    <group position={position}>
      {/* Product cube */}
      <mesh
        scale={hovered ? 1.15 : 1}
        onClick={(e) => { e.stopPropagation(); onSelect(product); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        castShadow
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : '#000000'}
          emissiveIntensity={hovered ? 0.4 : 0}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>
      {/* Product image on front face of box */}
      {texture && (
        <mesh position={[0, 0, 0.26]} rotation={[0, 0, 0]}>
          <planeGeometry args={[0.44, 0.44]} />
          <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Price tag */}
      <Text
        position={[0, -0.05, 0.3]}
        fontSize={0.1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {`$${Number(product.price || 0).toFixed(0)}`}
      </Text>
      {/* Product name */}
      <Text
        position={[0, 0.95, 0]}
        fontSize={0.08}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.8}
      >
        {product.product_name}
      </Text>
    </group>
  );
}

// ============================================================================
// SHELF HINT – subtle arrow + text hint on empty shelves
// ============================================================================
function ShelfHint({ position }: { position: Vec3 }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Smooth gentle float — slow sine for bob, subtle scale pulse
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5) * 0.06;
    const s = 1 + Math.sin(t * 2) * 0.03;
    groupRef.current.scale.set(s, s, s);
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <Billboard>
        {/* Hand + text together so they move as one */}
        <Text
          position={[0, 0.12, 0]}
          fontSize={0.24}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
        >
          {'👇'}
        </Text>
        <Text
          position={[0, -0.06, 0]}
          fontSize={0.16}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#78350f"
          fontWeight="bold"
        >
          {'Create Product here!'}
        </Text>
      </Billboard>
    </group>
  );
}

// ============================================================================
// DOLLAR SIGN EFFECT – floats up and fades when NPC pays at cashier
// ============================================================================
function DollarSignEffect({ position }: { position: Vec3 }) {
  const [visible, setVisible] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current || !visible) return;
    elapsed.current += delta;
    groupRef.current.position.y += delta * 1.5;
    if (elapsed.current > 1.5) setVisible(false);
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <Billboard>
        <Text
          fontSize={0.4}
          color="#4ade80"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
          fillOpacity={Math.max(0, 1 - elapsed.current / 1.5)}
        >
          $
        </Text>
      </Billboard>
    </group>
  );
}

// ============================================================================
// HALL OF FAME BADGE WALL – Modern showcase of ALL Quest & CSR badges
// ============================================================================

const HALL_OF_FAME_BADGES: { id: string; name: string; emoji: string; category: 'quest' | 'csr'; gradient: [string, string] }[] = [
  // Quest badges (row 1)
  { id: 'first_steps',      name: 'First Steps',      emoji: '🎯', category: 'quest', gradient: ['#4ade80', '#10b981'] },
  { id: 'product_master',   name: 'Product Master',   emoji: '📦', category: 'quest', gradient: ['#60a5fa', '#06b6d4'] },
  { id: 'team_builder',     name: 'Team Builder',     emoji: '👥', category: 'quest', gradient: ['#a78bfa', '#8b5cf6'] },
  { id: 'week_champion',    name: 'Week Champion',    emoji: '🔥', category: 'quest', gradient: ['#fb923c', '#ef4444'] },
  { id: 'grand_opening',    name: 'Grand Opening',    emoji: '🚀', category: 'quest', gradient: ['#f472b6', '#e11d48'] },
  { id: 'money_maker',      name: 'Money Maker',      emoji: '💰', category: 'quest', gradient: ['#fbbf24', '#f59e0b'] },
  { id: 'level_master',     name: 'Level Master',     emoji: '👑', category: 'quest', gradient: ['#818cf8', '#3b82f6'] },
  { id: 'token_collector',  name: 'Token Collector',  emoji: '💎', category: 'quest', gradient: ['#22d3ee', '#14b8a6'] },
  // Quest badges (row 2)
  { id: 'marketing_guru',   name: 'Marketing Guru',   emoji: '📣', category: 'quest', gradient: ['#fb7185', '#f97316'] },
  { id: 'tech_innovator',   name: 'Tech Innovator',   emoji: '⚡', category: 'quest', gradient: ['#60a5fa', '#7c3aed'] },
  { id: 'decorator_pro',    name: 'Decorator Pro',    emoji: '🎨', category: 'quest', gradient: ['#e879f9', '#ec4899'] },
  { id: 'influencer_king',  name: 'Influencer King',  emoji: '🤳', category: 'quest', gradient: ['#a855f7', '#6366f1'] },
  { id: 'daily_warrior',    name: 'Daily Warrior',    emoji: '⚔️', category: 'quest', gradient: ['#fbbf24', '#f97316'] },
  // CSR badges (row 2 continued)
  { id: 'community_hero',   name: 'Community Hero',   emoji: '🌟', category: 'csr',   gradient: ['#34d399', '#22c55e'] },
  { id: 'green_champion',   name: 'Green Champion',   emoji: '🌱', category: 'csr',   gradient: ['#a3e635', '#10b981'] },
  { id: 'charity_star',     name: 'Charity Star',     emoji: '💝', category: 'csr',   gradient: ['#f472b6', '#d946ef'] },
];

// Pre-create badge textures with canvas (cached per session)
const badgeTextureCache = new Map<string, THREE.CanvasTexture>();

function createBadgeMedalTexture(emoji: string, isEarned: boolean, gradient: [string, string], badgeId: string): THREE.CanvasTexture {
  const cacheKey = `${badgeId}_${isEarned}`;
  if (badgeTextureCache.has(cacheKey)) return badgeTextureCache.get(cacheKey)!;

  const size = 512;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // Outer ring
  ctx.beginPath();
  ctx.arc(half, half, 236, 0, Math.PI * 2);
  if (isEarned) {
    const ringGrad = ctx.createLinearGradient(0, 0, size, size);
    ringGrad.addColorStop(0, '#ffd700');
    ringGrad.addColorStop(0.5, '#ffec8b');
    ringGrad.addColorStop(1, '#daa520');
    ctx.fillStyle = ringGrad;
  } else {
    ctx.fillStyle = '#2a2a3a';
  }
  ctx.fill();

  // Inner circle
  ctx.beginPath();
  ctx.arc(half, half, 208, 0, Math.PI * 2);
  if (isEarned) {
    const grad = ctx.createRadialGradient(half, half - 40, 0, half, half, 208);
    grad.addColorStop(0, gradient[0]);
    grad.addColorStop(1, gradient[1]);
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createRadialGradient(half, half - 40, 0, half, half, 208);
    grad.addColorStop(0, '#252535');
    grad.addColorStop(1, '#18182a');
    ctx.fillStyle = grad;
  }
  ctx.fill();

  // Inner ring highlight
  ctx.beginPath();
  ctx.arc(half, half, 208, 0, Math.PI * 2);
  ctx.strokeStyle = isEarned ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Star accent behind emoji (earned only)
  if (isEarned) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const starPoints = 8;
    const outerR = 140;
    const innerR = 80;
    ctx.beginPath();
    for (let i = 0; i < starPoints * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / starPoints - Math.PI / 2;
      ctx.lineTo(half + r * Math.cos(angle), half + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  // Emoji — large, crisp
  ctx.font = '144px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (isEarned) {
    ctx.fillText(emoji, half, half);
  } else {
    ctx.globalAlpha = 0.2;
    ctx.fillText(emoji, half, half);
    ctx.globalAlpha = 1.0;
    ctx.font = '72px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillText('🔒', half, half + 4);
  }

  // Decorative dots around edge (earned only)
  if (isEarned) {
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.arc(half + 222 * Math.cos(angle), half + 222 * Math.sin(angle), 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  badgeTextureCache.set(cacheKey, texture);
  return texture;
}

// Create the dark glass backdrop texture
function createHallOfFameBackdropTexture(): THREE.CanvasTexture {
  if (badgeTextureCache.has('_backdrop')) return badgeTextureCache.get('_backdrop')!;

  const w = 2048;
  const h = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a0a1a');
  bg.addColorStop(0.3, '#0f0f2a');
  bg.addColorStop(0.7, '#0d0d24');
  bg.addColorStop(1, '#080818');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(100, 100, 180, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Top glow accent
  const topGlow = ctx.createLinearGradient(0, 0, 0, 100);
  topGlow.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
  topGlow.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, w, 100);

  // Bottom glow accent
  const bottomGlow = ctx.createLinearGradient(0, h - 60, 0, h);
  bottomGlow.addColorStop(0, 'rgba(212, 175, 55, 0)');
  bottomGlow.addColorStop(1, 'rgba(212, 175, 55, 0.1)');
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, h - 60, w, 60);

  // Corner decorations
  const drawCorner = (cx: number, cy: number, sx: number, sy: number) => {
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy + 50 * sy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 50 * sx, cy);
    ctx.stroke();
  };
  drawCorner(20, 20, 1, 1);
  drawCorner(w - 20, 20, -1, 1);
  drawCorner(20, h - 20, 1, -1);
  drawCorner(w - 20, h - 20, -1, -1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  badgeTextureCache.set('_backdrop', texture);
  return texture;
}

function HallOfFameBadgeWall({ earnedBadges, position = [0, 2.2, 0] as Vec3, rotation = [0, 0, 0] as Vec3 }: {
  earnedBadges: string[];
  position?: Vec3;
  rotation?: Vec3;
}) {
  // Normalize earned badge IDs for matching
  const earnedSet = useMemo(() => {
    const set = new Set<string>();
    (earnedBadges || []).forEach((b: any) => {
      if (typeof b === 'string') {
        set.add(b.toLowerCase().replace(/\s+/g, '_'));
        set.add(b.toLowerCase());
        set.add(b);
      } else if (b && typeof b === 'object') {
        if (b.id) set.add(b.id.toLowerCase());
        if (b.label) set.add(b.label.toLowerCase());
        if (b.name) set.add(b.name.toLowerCase());
      }
    });
    return set;
  }, [earnedBadges]);

  const isBadgeEarned = useCallback((badge: typeof HALL_OF_FAME_BADGES[0]) => {
    return earnedSet.has(badge.id) ||
      earnedSet.has(badge.name.toLowerCase()) ||
      earnedSet.has(badge.name.toLowerCase().replace(/\s+/g, '_'));
  }, [earnedSet]);

  // Pagination: show first 10 badges only
  const PAGE_SIZE = 10;
  const visibleBadges = HALL_OF_FAME_BADGES.slice(0, PAGE_SIZE);
  const remainingCount = HALL_OF_FAME_BADGES.length - PAGE_SIZE;

  // Create badge textures only for visible badges
  const badgeTextures = useMemo(() => {
    return visibleBadges.map(badge => {
      const earned = isBadgeEarned(badge);
      return createBadgeMedalTexture(badge.emoji, earned, badge.gradient, badge.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBadgeEarned]);

  // Backdrop texture
  const backdropTex = useMemo(() => createHallOfFameBackdropTexture(), []);

  // Layout: 2 rows x 5 columns
  const cols = 5;
  const rows = 2;
  const cellW = 0.98;
  const cellH = 1.05;
  const medalRadius = 0.32;
  const gridW = cols * cellW;
  const gridH = rows * cellH;
  const panelW = gridW + 0.8;
  const panelH = gridH + 1.45;

  const earnedCount = HALL_OF_FAME_BADGES.filter(b => isBadgeEarned(b)).length;

  return (
    <group position={position} rotation={rotation}>
      {/* ===== BACKDROP PANEL — z=0 base layer ===== */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[panelW, panelH, 0.06]} />
        <meshStandardMaterial
          map={backdropTex}
          roughness={0.3}
          metalness={0.05}
        />
      </mesh>

      {/* ===== GOLD FRAME BORDER — z=0.04 ===== */}
      {/* Top */}
      <mesh position={[0, panelH / 2, 0.04]}>
        <boxGeometry args={[panelW + 0.06, 0.05, 0.07]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Bottom */}
      <mesh position={[0, -panelH / 2, 0.04]}>
        <boxGeometry args={[panelW + 0.06, 0.05, 0.07]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Left */}
      <mesh position={[-panelW / 2, 0, 0.04]}>
        <boxGeometry args={[0.05, panelH + 0.06, 0.07]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Right */}
      <mesh position={[panelW / 2, 0, 0.04]}>
        <boxGeometry args={[0.05, panelH + 0.06, 0.07]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.7} roughness={0.25} />
      </mesh>

      {/* ===== TITLE SECTION — z=0.06+ ===== */}
      {/* Title backing plaque */}
      <mesh position={[0, panelH / 2 - 0.38, 0.06]}>
        <boxGeometry args={[3.6, 0.44, 0.04]} />
        <meshStandardMaterial color="#1a1028" metalness={0.2} roughness={0.4} />
      </mesh>
      {/* Gold accent line under title */}
      <mesh position={[0, panelH / 2 - 0.63, 0.09]}>
        <boxGeometry args={[panelW - 0.5, 0.03, 0.02]} />
        <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.2} emissive="#c9a84c" emissiveIntensity={0.15} />
      </mesh>
      {/* Title text */}
      <Text
        position={[0, panelH / 2 - 0.36, 0.1]}
        fontSize={0.22}
        color="#ffd700"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        letterSpacing={0.12}
      >
        {'HALL OF FAME'}
      </Text>
      {/* Subtitle — progress counter */}
      <Text
        position={[0, panelH / 2 - 0.76, 0.1]}
        fontSize={0.1}
        color="#9999bb"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {`${earnedCount} / ${HALL_OF_FAME_BADGES.length} Badges Unlocked`}
      </Text>

      {/* ===== BADGE GRID (first 10) — z=0.08+ ===== */}
      {visibleBadges.map((badge, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const earned = isBadgeEarned(badge);

        const x = (col - (cols - 1) / 2) * cellW;
        const y = panelH / 2 - 1.2 - row * cellH;

        return (
          <group key={badge.id} position={[x, y, 0.08]}>
            {/* Badge medallion — single plane, no overlapping ring */}
            <mesh>
              <circleGeometry args={[medalRadius, 32]} />
              <meshStandardMaterial
                map={badgeTextures[index]}
                metalness={earned ? 0.2 : 0.0}
                roughness={earned ? 0.5 : 0.8}
              />
            </mesh>

            {/* CSR badge accent marker */}
            {badge.category === 'csr' && (
              <mesh position={[medalRadius - 0.04, -medalRadius + 0.04, 0.04]}>
                <circleGeometry args={[0.045, 16]} />
                <meshStandardMaterial
                  color={earned ? '#34d399' : '#1a3a2a'}
                  emissive={earned ? '#34d399' : '#000000'}
                  emissiveIntensity={earned ? 0.3 : 0}
                />
              </mesh>
            )}

            {/* Badge name */}
            <Text
              position={[0, -medalRadius - 0.13, 0.02]}
              fontSize={0.075}
              color={earned ? '#e0e0f0' : '#555577'}
              anchorX="center"
              anchorY="middle"
              maxWidth={cellW - 0.1}
              font={undefined}
            >
              {badge.name}
            </Text>
          </group>
        );
      })}

      {/* ===== "SEE MORE" INDICATOR ===== */}
      {remainingCount > 0 && (
        <group position={[0, -panelH / 2 + 0.28, 0.08]}>
          <mesh>
            <boxGeometry args={[2.2, 0.28, 0.04]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.1} roughness={0.5} />
          </mesh>
          <Text
            position={[0, 0, 0.04]}
            fontSize={0.1}
            color="#c9a84c"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            {`+${remainingCount} more badges`}
          </Text>
        </group>
      )}

      {/* ===== DECORATIVE CORNER STARS ===== */}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy], i) => (
        <mesh key={`star-${i}`} position={[sx * (panelW / 2 - 0.15), sy * (panelH / 2 - 0.15), 0.06]}>
          <circleGeometry args={[0.03, 4]} />
          <meshStandardMaterial color="#c9a84c" metalness={0.8} roughness={0.2} emissive="#c9a84c" emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Accent light */}
      <pointLight position={[0, 0.3, 0.5]} intensity={0.3} color="#ffd700" distance={3} decay={2} />
    </group>
  );
}

// ============================================================================
// STAFF NPC – stands in place with "Hi Boss" bubble when player nearby
// ============================================================================
const STAFF_MODELS = [
  resolvePublicAssetUrl('assets/dassets/avatar/Animated Woman.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Business Man.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Worker.glb'),
  resolvePublicAssetUrl('assets/dassets/avatar/Adventurer.glb'),
];

// Staff models load lazily when StaffNPC is rendered inside its Suspense boundary.

function StaffNPC({
  modelPath,
  position,
  rotation = [0, 0, 0],
  scale = 0.7,
}: {
  modelPath: string;
  position: Vec3;
  rotation?: [number, number, number];
  scale?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);
  const isHit = useRef(false);
  const hitTimer = useRef(0);

  const clone = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).frustumCulled = isLowEndDevice;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const idleAction = actions['CharacterArmature|Idle'];
    if (idleAction) idleAction.reset().play();
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer]);

  const handleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (isHit.current) return;

    // Distance check
    const cam = e.camera?.position;
    if (cam && group.current) {
      const pos = group.current.position;
      const d = Math.sqrt((cam.x - pos.x) ** 2 + (cam.z - pos.z) ** 2);
      if (d > 12) return;
    }

    isHit.current = true;
    hitTimer.current = 1.5;
    emoteStore.pending = 'punch';

    mixer.stopAllAction();
    const hitAction = actions['CharacterArmature|HitRecieve'] || actions['CharacterArmature|HitReact'];
    if (hitAction) {
      hitAction.reset().setLoop(THREE.LoopOnce, 0).play();
      hitAction.clampWhenFinished = true;
    }
  }, [actions, mixer]);

  // Check player distance + handle hit recovery
  useFrame((state, delta) => {
    if (!group.current) return;

    // Hit recovery
    if (isHit.current) {
      hitTimer.current -= delta;
      if (hitTimer.current <= 0) {
        isHit.current = false;
        mixer.stopAllAction();
        const idleAction = actions['CharacterArmature|Idle'];
        if (idleAction) idleAction.reset().play();
      }
    }

  });

  return (
    <group
      ref={group}
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={handleClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <primitive object={clone} />
    </group>
  );
}

// ============================================================================
// SHOP INTERIOR - single product display + cashier counter + staff
// ============================================================================
function ShopInteriorDetails({
  theme,
  products,
  onSelectProduct,
  staffCount = 2,
  onShelfClick,
  onAddProduct,
  onModuleClick,
  shelfStyle,
  counterStyle,
  csrBadges,
  shopImageUrl,
  layoutPositions,
  shopName,
}: {
  theme: ThemeConfig['interior'];
  products: Product[];
  onSelectProduct: (p: Product) => void;
  staffCount?: number;
  onShelfClick?: (side: 'left' | 'right') => void;
  onAddProduct?: () => void;
  onModuleClick?: (moduleId: string) => void;
  shelfStyle?: string;
  counterStyle?: string;
  csrBadges?: string[];
  shopImageUrl?: string;
  layoutPositions?: Record<string, { x: number; y: number; rotation?: number }> | null;
  shopName?: string;
}) {
  const displayName = (shopName || 'My Shop').replace(/\b\w/g, c => c.toUpperCase());
  const leftProducts = useMemo(() => products.filter((_, i) => i % 2 === 0), [products]);
  const rightProducts = useMemo(() => products.filter((_, i) => i % 2 === 1), [products]);
  const sStyle = SHELF_STYLES[shelfStyle || 'shelf_basic'] || SHELF_STYLES.shelf_basic;
  const cStyle = COUNTER_STYLES[counterStyle || 'table_basic'] || COUNTER_STYLES.table_basic;

  // Compute 3D positions from floor plan layout (floor plan % → 3D world coords)
  const pos = useMemo(() => {
    // Defaults match hardcoded 3D positions; rotY in radians (floor plan degrees → Y-axis rotation)
    const def = { lsX: -5, lsZ: -2.55, lsRotY: 0, rsX: 5, rsZ: -2.55, rsRotY: 0, cX: 0, cZ: -5.5, cRotY: 0 };
    if (!layoutPositions || !(layoutPositions as any)?._v) return def;

    const convert = (xPct: number, yPct: number, w: number, h: number): [number, number] => {
      const cx = xPct + w / 2;
      const cy = yPct + h / 2;
      return [((cx - 3) / 94) * 17.4 - 8.7, ((cy - 3) / 94) * 13.4 - 6.7];
    };
    const degToRad = (d: number) => (d || 0) * Math.PI / 180;

    const lp = layoutPositions as any;
    if (lp.leftShelf?.x != null) { const [x, z] = convert(lp.leftShelf.x, lp.leftShelf.y, 23, 6); def.lsX = x; def.lsZ = z; def.lsRotY = degToRad(lp.leftShelf.rotation); }
    if (lp.rightShelf?.x != null) { const [x, z] = convert(lp.rightShelf.x, lp.rightShelf.y, 23, 6); def.rsX = x; def.rsZ = z; def.rsRotY = degToRad(lp.rightShelf.rotation); }
    if (lp.counter?.x != null) { const [x, z] = convert(lp.counter.x, lp.counter.y, 32, 8); def.cX = x; def.cZ = z; def.cRotY = degToRad(lp.counter.rotation); }
    // (office removed — ignore any lp.office position from saved layouts)
    return def;
  }, [layoutPositions]);

  return (
    <group>
      {/* ===== AMBIENT & ACCENT LIGHTING ===== */}
      <pointLight position={[0, 4.8, 0]} intensity={4} distance={18} color="#fff8f0" />
      <pointLight position={[-5, 4.5, -4]} intensity={2} distance={14} color="#ffecd2" />
      <pointLight position={[5, 4.5, -4]} intensity={2} distance={14} color="#ffecd2" />
      <pointLight position={[0, 4.5, 3]} intensity={2} distance={14} color="#ffecd2" />
      {/* Spot lights on product displays */}
      <spotLight position={[pos.lsX, 4.8, pos.lsZ + 0.55]} angle={0.5} penumbra={0.8} intensity={3} distance={8} color="#fff5e6" target-position={[pos.lsX, 0, pos.lsZ + 0.55]} castShadow />
      <spotLight position={[pos.rsX, 4.8, pos.rsZ + 0.55]} angle={0.5} penumbra={0.8} intensity={3} distance={8} color="#fff5e6" target-position={[pos.rsX, 0, pos.rsZ + 0.55]} castShadow />

      {/* ===== PENDANT CEILING LIGHTS ===== */}
      {[[-3, 0], [0, 0], [3, 0]].map(([px, pz], i) => (
        <group key={`pendant-${i}`} position={[px, 4.9, pz]}>
          {/* Rod */}
          <mesh castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshStandardMaterial color="#2c2c2c" metalness={0.8} />
          </mesh>
          {/* Shade */}
          <mesh position={[0, -0.35, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.35, 0.3, 12]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.4} roughness={0.6} />
          </mesh>
          {/* Bulb glow */}
          <mesh position={[0, -0.42, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#fff5e0" emissive="#fff5e0" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[0, -0.5, 0]} intensity={1.5} distance={6} color="#fff5e0" />
        </group>
      ))}

      {/* ===== PREMIUM CASHIER COUNTER ===== */}
      <MaybeRigidBody type="fixed" userData={{}}>
        {/* Counter base */}
        <mesh position={[pos.cX, 0.35, pos.cZ]} castShadow receiveShadow>
          <boxGeometry args={[6, 0.7, 1.2]} />
          <meshStandardMaterial color={cStyle.base} roughness={cStyle.baseRoughness} />
        </mesh>
        {/* Front panel */}
        <mesh position={[pos.cX, 0.35, pos.cZ + 0.61]} castShadow>
          <boxGeometry args={[6.02, 0.72, 0.02]} />
          <meshStandardMaterial color={cStyle.front} roughness={0.6} emissive={cStyle.emissive || '#000000'} emissiveIntensity={cStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Trim strip */}
        <mesh position={[pos.cX, 0.72, pos.cZ + 0.61]} castShadow>
          <boxGeometry args={[6.04, 0.04, 0.03]} />
          <meshStandardMaterial color={cStyle.trim} metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Countertop */}
        <mesh position={[pos.cX, 0.88, pos.cZ]} receiveShadow castShadow>
          <boxGeometry args={[6.3, 0.08, 1.5]} />
          <meshStandardMaterial color={cStyle.top} metalness={cStyle.topMetalness} roughness={cStyle.topRoughness} />
        </mesh>
      </MaybeRigidBody>

      {/* Decorated shop name sign board */}
      <group position={[pos.cX, 2.6, pos.cZ]}>
        {/* Golden chains */}
        <mesh position={[-1.1, 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
          <meshStandardMaterial color="#d4a545" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[1.1, 0.35, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
          <meshStandardMaterial color="#d4a545" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Chain hooks at ceiling */}
        {[-1.1, 1.1].map((hx, i) => (
          <mesh key={`hook-${i}`} position={[hx, 0.72, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#d4a545" metalness={0.9} roughness={0.1} />
          </mesh>
        ))}

        {/* Main sign board - gradient dark wood */}
        <mesh castShadow>
          <boxGeometry args={[2.8, 0.7, 0.1]} />
          <meshStandardMaterial color="#3b1f0e" roughness={0.85} />
        </mesh>
        {/* Inner panel - slightly lighter */}
        <mesh position={[0, 0, 0.051]}>
          <boxGeometry args={[2.5, 0.52, 0.01]} />
          <meshStandardMaterial color="#4a2814" roughness={0.8} />
        </mesh>

        {/* Gold border frame */}
        {/* Top trim */}
        <mesh position={[0, 0.32, 0.06]} castShadow>
          <boxGeometry args={[2.7, 0.04, 0.03]} />
          <meshStandardMaterial color="#d4a545" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Bottom trim */}
        <mesh position={[0, -0.32, 0.06]} castShadow>
          <boxGeometry args={[2.7, 0.04, 0.03]} />
          <meshStandardMaterial color="#d4a545" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Left trim */}
        <mesh position={[-1.33, 0, 0.06]} castShadow>
          <boxGeometry args={[0.04, 0.68, 0.03]} />
          <meshStandardMaterial color="#d4a545" metalness={0.85} roughness={0.15} />
        </mesh>
        {/* Right trim */}
        <mesh position={[1.33, 0, 0.06]} castShadow>
          <boxGeometry args={[0.04, 0.68, 0.03]} />
          <meshStandardMaterial color="#d4a545" metalness={0.85} roughness={0.15} />
        </mesh>

        {/* Corner decorations - gold diamonds */}
        {[[-1.25, 0.25], [1.25, 0.25], [-1.25, -0.25], [1.25, -0.25]].map(([cx, cy], i) => (
          <mesh key={`corner-${i}`} position={[cx, cy, 0.07]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.08, 0.02]} />
            <meshStandardMaterial color="#f0c060" metalness={0.9} roughness={0.1} emissive="#f0c060" emissiveIntensity={0.15} />
          </mesh>
        ))}

        {/* Side star decorations */}
        {[-1.05, 1.05].map((sx, i) => (
          <mesh key={`star-${i}`} position={[sx, 0, 0.07]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} emissive="#ffd700" emissiveIntensity={0.3} />
          </mesh>
        ))}

        {/* Warm glow light behind sign */}
        <pointLight position={[0, 0, 0.3]} intensity={0.8} distance={3} color="#ffecd2" />

        {/* Shop name text */}
        <Text
          position={[0, 0.04, 0.07]}
          fontSize={displayName.length > 12 ? 0.16 : 0.22}
          color="#ffecd2"
          anchorX="center"
          anchorY="middle"
          font={undefined}
          maxWidth={2.2}
        >
          {displayName}
        </Text>
        {/* Small subtitle */}
        <Text
          position={[0, -0.17, 0.07]}
          fontSize={0.08}
          color="#d4a545"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {'~ Welcome ~'}
        </Text>
      </group>

      {/* Cash register + POS monitor */}
      <group position={[pos.cX, 0.92, pos.cZ]}>
        {/* Register body */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.3, 0.45]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* POS screen */}
        <mesh position={[0, 0.35, -0.1]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.45, 0.3, 0.025]} />
          <meshStandardMaterial color="#111" metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.355, -0.09]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.4, 0.25, 0.026]} />
          <meshStandardMaterial color="#1e90ff" emissive="#1e90ff" emissiveIntensity={0.4} />
        </mesh>
        {/* Cash drawer */}
        <mesh position={[0, 0.02, 0.26]} castShadow>
          <boxGeometry args={[0.55, 0.06, 0.08]} />
          <meshStandardMaterial color="#333" metalness={0.5} roughness={0.4} />
        </mesh>
      </group>

      {/* Bar stools at cashier front */}
      {[-1.8, 1.8].map((sx, i) => (
        <group key={`stool-${i}`} position={[pos.cX + sx, 0, pos.cZ + 1.0]}>
          {/* Seat - round cushion */}
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
          {/* Pedestal */}
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Base ring */}
          <mesh position={[0, 0.02, 0]} castShadow>
            <torusGeometry args={[0.2, 0.025, 6, 12]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}

      {/* Staff behind cashier */}
      {staffCount >= 1 && (
        <StaffNPC modelPath={STAFF_MODELS[0]} position={[pos.cX - 1.5, 0, pos.cZ - 0.7]} rotation={[0, 0, 0]} />
      )}
      {staffCount >= 2 && (
        <StaffNPC modelPath={STAFF_MODELS[1]} position={[pos.cX + 1.5, 0, pos.cZ - 0.7]} rotation={[0, 0, 0]} />
      )}
      {staffCount >= 3 && (
        <StaffNPC modelPath={STAFF_MODELS[2]} position={[pos.cX - 2, 0, pos.cZ + 1.5]} rotation={[0, 0, 0]} />
      )}
      {staffCount >= 4 && (
        <StaffNPC modelPath={STAFF_MODELS[3]} position={[pos.cX + 2, 0, pos.cZ + 1.5]} rotation={[0, 0, 0]} />
      )}

      {/* ===== MODERN DISPLAY SHELF - LEFT ===== */}
      <group position={[pos.lsX, 0, pos.lsZ]} rotation={[0, pos.lsRotY, 0]}>
      <MaybeRigidBody type="fixed" userData={{}}>
        {/* Back panel – clickable */}
        <mesh
          position={[0, 0.9, 0]}
          castShadow receiveShadow
          onClick={(e) => { e.stopPropagation(); onShelfClick?.('left'); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <boxGeometry args={[4.2, 1.8, 0.06]} />
          <meshStandardMaterial color={sStyle.backPanel} roughness={0.1} metalness={0.4} transparent opacity={0.45} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Bottom shelf */}
        <mesh position={[0, 0.35, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.06, 0.9]} />
          <meshStandardMaterial color={sStyle.shelfPlate} metalness={sStyle.metalness} roughness={sStyle.roughness} transparent opacity={sStyle.shelfOpacity} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Top shelf */}
        <mesh position={[0, 1.15, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.06, 0.9]} />
          <meshStandardMaterial color={sStyle.shelfPlate} metalness={sStyle.metalness} roughness={sStyle.roughness} transparent opacity={sStyle.shelfOpacity} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Frame legs – left and right only */}
        {[-2, 2].map((lx, li) => (
          <mesh key={`ll-${li}`} position={[lx, 0.9, 0.95]} castShadow>
            <boxGeometry args={[0.05, 1.8, 0.05]} />
            <meshStandardMaterial color={sStyle.legs} metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        {/* Under-shelf accent lights */}
        <pointLight position={[-1, 0.3, 0.45]} intensity={0.5} distance={2} color={sStyle.emissive || '#ffd700'} />
        <pointLight position={[1, 0.3, 0.45]} intensity={0.5} distance={2} color={sStyle.emissive || '#ffd700'} />
      </MaybeRigidBody>
      {leftProducts.map((product, i) => {
        const spacing = 0.7;
        const total = leftProducts.length;
        const startX = -((total - 1) * spacing) / 2;
        return (
          <ProductBox key={product.id} product={product} position={[startX + i * spacing, 0.65, 0.45]} color={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} onSelect={onSelectProduct} />
        );
      })}
      {/* Subtle hint on left shelf when there's room for products */}
      {onAddProduct && leftProducts.length < 6 && (
        <ShelfHint position={[0, 1.5, 0.45]} />
      )}
      </group>

      {/* ===== MODERN DISPLAY SHELF - RIGHT ===== */}
      <group position={[pos.rsX, 0, pos.rsZ]} rotation={[0, pos.rsRotY, 0]}>
      <MaybeRigidBody type="fixed" userData={{}}>
        {/* Back panel – clickable */}
        <mesh
          position={[0, 0.9, 0]}
          castShadow receiveShadow
          onClick={(e) => { e.stopPropagation(); onShelfClick?.('right'); }}
          onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'default'; }}
        >
          <boxGeometry args={[4.2, 1.8, 0.06]} />
          <meshStandardMaterial color={sStyle.backPanel} roughness={0.1} metalness={0.4} transparent opacity={0.45} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Bottom shelf */}
        <mesh position={[0, 0.35, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.06, 0.9]} />
          <meshStandardMaterial color={sStyle.shelfPlate} metalness={sStyle.metalness} roughness={sStyle.roughness} transparent opacity={sStyle.shelfOpacity} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Top shelf */}
        <mesh position={[0, 1.15, 0.45]} castShadow receiveShadow>
          <boxGeometry args={[4.4, 0.06, 0.9]} />
          <meshStandardMaterial color={sStyle.shelfPlate} metalness={sStyle.metalness} roughness={sStyle.roughness} transparent opacity={sStyle.shelfOpacity} emissive={sStyle.emissive || '#000000'} emissiveIntensity={sStyle.emissiveIntensity || 0} />
        </mesh>
        {/* Frame legs – left and right only */}
        {[-2, 2].map((lx, li) => (
          <mesh key={`rl-${li}`} position={[lx, 0.9, 0.95]} castShadow>
            <boxGeometry args={[0.05, 1.8, 0.05]} />
            <meshStandardMaterial color={sStyle.legs} metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
        {/* Under-shelf accent lights */}
        <pointLight position={[-1, 0.3, 0.45]} intensity={0.5} distance={2} color={sStyle.emissive || '#ffd700'} />
        <pointLight position={[1, 0.3, 0.45]} intensity={0.5} distance={2} color={sStyle.emissive || '#ffd700'} />
      </MaybeRigidBody>
      {rightProducts.map((product, i) => {
        const spacing = 0.7;
        const total = rightProducts.length;
        const startX = -((total - 1) * spacing) / 2;
        return (
          <ProductBox key={product.id} product={product} position={[startX + i * spacing, 0.65, 0.45]} color={PRODUCT_COLORS[(i + 6) % PRODUCT_COLORS.length]} onSelect={onSelectProduct} />
        );
      })}
      {/* Subtle hint on right shelf when there's room for products */}
      {onAddProduct && rightProducts.length < 6 && (
        <ShelfHint position={[0, 1.5, 0.45]} />
      )}
      </group>

      {/* Cafe seating area removed */}

      {/* ===== ENTRANCE FLOOR TILES ===== */}
      {Array.from({ length: 5 }).map((_, col) =>
        Array.from({ length: 3 }).map((_, row) => (
          <mesh
            key={`tile-${col}-${row}`}
            position={[-2.8 + col * 1.4, 0.02, 4.5 + row * 1.0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[1.3, 0.9]} />
            <meshStandardMaterial
              color={(col + row) % 2 === 0 ? '#e8e0d4' : '#d4c5b2'}
              metalness={0.05}
              roughness={0.3}
            />
          </mesh>
        )),
      )}

      {/* ===== WELCOME MAT ===== */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 6.2]}>
        <planeGeometry args={[3, 1.5]} />
        <meshStandardMaterial color="#5c3a21" transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 6.2]}>
        <planeGeometry args={[2.6, 1.1]} />
        <meshStandardMaterial color={theme.accent} transparent opacity={0.35} />
      </mesh>

      {/* ===== HALL OF FAME – All badges on LEFT wall ===== */}
      <HallOfFameBadgeWall
        earnedBadges={csrBadges || []}
        position={[-8.5, 2.1, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* OFFICE REMOVED for perf — ~270 lines of meshes (walls, desk, chair, sign, module buttons, lights) cut. */}
    </group>
  );
}

// ============================================================================
// SCENE
// ============================================================================
function WorldScene({
  theme,
  products,
  onSelectProduct,
  popularity,
  staffCount,
  trafficMultiplier,
  activeInfluencers,
  activeInnovations,
  shopName,
  avatarPath,
  remainingDailyVisitors,
  onShelfClick,
  onAddProduct,
  onModuleClick,
  shelfStyle,
  counterStyle,
  csrBadges,
  shopImageUrl,
  layoutPositions,
  floorStyleId,
  wallStyleId,
  onTVClick,
  tvPosterUrl,
  wallPosters,
  onWallPosterClickEmpty,
  onWallPosterClickFilled,
  onInnovationMove,
  shopReady = false,
  onNPCVisit,
  onNPCSale,
  liteInput,
}: {
  theme: ThemeConfig;
  products: Product[];
  onSelectProduct: (p: Product) => void;
  popularity: number;
  staffCount: number;
  trafficMultiplier: number;
  activeInfluencers: ActiveInfluencer[];
  activeInnovations: ActiveInnovation[];
  shopName: string;
  avatarPath: string;
  remainingDailyVisitors?: number;
  onShelfClick?: (side: 'left' | 'right') => void;
  onAddProduct?: () => void;
  onModuleClick?: (moduleId: string) => void;
  shelfStyle?: string;
  counterStyle?: string;
  csrBadges?: string[];
  shopImageUrl?: string;
  layoutPositions?: Record<string, { x: number; y: number; rotation?: number }> | null;
  floorStyleId?: string;
  wallStyleId?: string;
  onTVClick?: () => void;
  tvPosterUrl?: string;
  wallPosters?: (string | null)[];
  onWallPosterClickEmpty?: (slotIndex: number) => void;
  onWallPosterClickFilled?: (slotIndex: number) => void;
  onInnovationMove?: (id: string, x: number, z: number) => void;
  shopReady?: boolean;
  onNPCVisit?: () => void;
  onNPCSale?: () => void;
  /** Shared input ref (joystick in DOM + LitePlayer in Canvas read this). */
  liteInput?: React.MutableRefObject<import('./lite-physics').LiteInputState>;
}) {
  const [pausedPhysics, setPausedPhysics] = useState(true);
  // Progressive scene mounting: structure + player first, then NPCs, cars
  // and decor stream in over the next ~3 seconds. This keeps initial
  // interactivity fast even on slow phones.
  //
  // Stage upgrades wait for the browser to be idle (requestIdleCallback)
  // AFTER the timeout elapses. That way a stage upgrade can't hijack a
  // frame the player movement also needed — the user never sees a stutter
  // when NPCs/cars/decor pop in.
  const [sceneStage, setSceneStage] = useState<'core' | 'crowd' | 'full'>('core');

  useEffect(() => {
    const t = setTimeout(() => setPausedPhysics(false), useLiteScene ? 1800 : 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const ric: (cb: () => void, opts?: { timeout?: number }) => number =
      (typeof window !== 'undefined' && (window as any).requestIdleCallback)
        ? (cb, opts) => (window as any).requestIdleCallback(cb, opts)
        : (cb) => window.setTimeout(cb, 16);

    const scheduleStage = (stage: 'crowd' | 'full', delay: number) =>
      setTimeout(() => {
        ric(() => startTransition(() => setSceneStage(stage)), { timeout: 800 });
      }, delay);

    const t1 = scheduleStage('crowd', useLiteScene ? 2200 : 1500);
    const t2 = scheduleStage('full', useLiteScene ? 4500 : 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const showCrowd = sceneStage !== 'core';
  const showFull = sceneStage === 'full';

  // Body of the scene tree. Lives inside <Physics> when full physics is on,
  // and at the top level (no Physics parent) when USE_LITE_PHYSICS is true.
  // <MaybeRigidBody> children gracefully degrade to <group> in lite mode.
  const sceneBody = (
    <LitePhysicsProvider enabled={USE_LITE_PHYSICS}>
      <Ground color={theme.exterior.ground} />
      <ShopStructure ext={theme.exterior} int={theme.interior} shopName={shopName} floorStyleId={floorStyleId} wallStyleId={wallStyleId} />

      {/* ShopInteriorDetails contains ~60 meshes + 12 procedural badge
          textures + pendant lights. Deferring it past first paint lets the
          ground/walls/player land in under a frame, then the interior fills
          in 1.5s later. Wrapped in startTransition via the parent state. */}
      {showCrowd && (
        <Suspense fallback={null}>
          <ShopInteriorDetails theme={theme.interior} products={products} onSelectProduct={onSelectProduct} staffCount={staffCount} onShelfClick={onShelfClick} onAddProduct={onAddProduct} onModuleClick={onModuleClick} shelfStyle={shelfStyle} counterStyle={counterStyle} csrBadges={csrBadges} shopImageUrl={shopImageUrl} layoutPositions={layoutPositions} shopName={shopName} />
        </Suspense>
      )}

      {/* Furniture (ATM, vending, robots, TV) — own Suspense so a slow
          .glb fetch can't block the rest of the scene from rendering. */}
      {showCrowd && (
        <Suspense fallback={null}>
          <ShopFurniture shopImageUrl={shopImageUrl} layoutPositions={layoutPositions} onTVClick={onTVClick} tvPosterUrl={tvPosterUrl} wallPosters={wallPosters} onWallPosterClickEmpty={onWallPosterClickEmpty} onWallPosterClickFilled={onWallPosterClickFilled} />
        </Suspense>
      )}

      {showFull && (
        <Suspense fallback={null}>
          <InnovationManager innovations={activeInnovations} onMove={onInnovationMove} />
        </Suspense>
      )}

      {showFull && (
        <Suspense fallback={null}>
          <InfluencerManager influencers={activeInfluencers} shopName={shopName} />
        </Suspense>
      )}

      {/* Static procedural decor — no .glb fetch, render immediately. */}
      <Tree position={[-18, 0, -8]} />
      <Tree position={[18, 0, -8]} />
      <Tree position={[-14, 0, 16]} scale={1.2} />
      <Tree position={[14, 0, 16]} scale={0.9} />
      {!useLiteScene && showCrowd && (
        <>
          <Tree position={[-25, 0, 5]} scale={1.3} />
          <Tree position={[25, 0, 5]} scale={1.1} />
          <Tree position={[-30, 0, 25]} />
          <Tree position={[30, 0, 25]} scale={1.1} />
        </>
      )}

      <LampPost position={[-12, 0, 27]} />
      <LampPost position={[12, 0, 27]} />
      {!useLiteScene && showCrowd && (
        <>
          <LampPost position={[-28, 0, 27]} />
          <LampPost position={[28, 0, 27]} />
        </>
      )}

      {!useLiteScene && showFull && <GrassPatches />}

      {!useLiteScene && showFull && (
        <Suspense fallback={null}>
          <GLBModel path={EXTERIOR_MODELS.grass} position={[-11, 0, 10]} scale={0.04} rotation={[0, 0.5, 0]} />
          <GLBModel path={EXTERIOR_MODELS.grass} position={[11, 0, 12]} scale={0.05} rotation={[0, 2.1, 0]} />
          <GLBModel path={EXTERIOR_MODELS.grass} position={[-16, 0, -3]} scale={0.035} rotation={[0, 1.2, 0]} />
          <GLBModel path={EXTERIOR_MODELS.grass} position={[16, 0, -3]} scale={0.045} rotation={[0, 3.8, 0]} />
        </Suspense>
      )}

      <FlowerBed center={[-12, 0, 9]} count={useLiteScene ? 2 : 4} radius={2} />
      <FlowerBed center={[12, 0, 9]} count={useLiteScene ? 2 : 4} radius={2} />
      {!useLiteScene && showFull && (
        <FlowerBed center={[0, 0, 14]} count={3} radius={1.8} />
      )}

      {!useLiteScene && showFull && (
        <Suspense fallback={null}>
          <ExteriorBuildings />
        </Suspense>
      )}

      <Road />
      {!useLiteScene && showFull && (
        <Suspense fallback={null}>
          <CarTraffic />
        </Suspense>
      )}

      {showCrowd && (
        <Suspense fallback={null}>
          <NPCManager popularity={popularity} trafficMultiplier={trafficMultiplier} remainingDailyVisitors={remainingDailyVisitors} shopReady={shopReady} onNPCVisit={onNPCVisit} onNPCSale={onNPCSale} />
        </Suspense>
      )}

      {/* Player — own Suspense so the scene structure renders even while the
          avatar GLB is still parsing. Otherwise a 200 ms parse blocks the
          entire WorldScene and the user sees an empty sky.

          Camera tuning (matches the AAA third-person standard):
            • camInitDis    = -4.2  →  slightly closer than the old -5, so the
              character fills more of the frame and feels "near" the player.
            • camMaxDis     = -6.5  →  zoom-out limit when scrolling mouse wheel.
            • camMinDis     = -1.5  →  zoom-in limit; keeps the character
              visible (the old -0.7 let the camera punch through the model).
            • camInitDir    = { x: -0.25, y: π }  →  slight downward tilt so
              you see the player's shoulders + the ground ahead (industry-
              standard 15° pitch).
            • camUpLimit    = 1.0   →  prevents over-the-top pitch.
            • camLowLimit   = -0.65 →  allows a steeper look-down for
              navigation, without flipping under the floor.
            • springK / dampingC →  tighter spring, less damping → camera
              feels responsive rather than spongy.
          Movement tuning:
            • maxVelLimit ↑ slightly so sprint feels punchy.
            • turnSpeed ↑   character rotates faster to match cam yaw. */}
      {USE_LITE_PHYSICS ? (
        /* Lite kinematic controller — no Rapier, no Ecctrl, no WASM.
           Spawn is a Lite-mode-specific position: (0, 0, 1) — feet on the
           floor, just inside the shop's front so the third-person camera
           (which sits 4.5 units behind the player at +Z) lands at z≈5.5,
           comfortably inside the shop. Using the legacy PLAYER_SPAWN of
           (0, 2, -3) put the camera behind the back wall at z=-7. */
        <Suspense fallback={null}>
          {liteInput && (
            <LiteKinematicPlayer
              modelPath={avatarPath}
              input={liteInput}
              spawn={[0, 0, 1]}
              onReady={() => playerReadyListeners.forEach((fn) => fn())}
            />
          )}
        </Suspense>
      ) : (
        <KeyboardControls map={KEYBOARD_MAP}>
          <Ecctrl
            animated
            camCollision={false}
            autoBalance={false}
            position={PLAYER_SPAWN}
            capsuleHalfHeight={PLAYER_CAPSULE_HALF_HEIGHT}
            capsuleRadius={PLAYER_CAPSULE_RADIUS}
            camInitDis={-4.2}
            camMaxDis={-6.5}
            camMinDis={-1.5}
            camInitDir={{ x: -0.25, y: Math.PI }}
            camUpLimit={1.0}
            camLowLimit={-0.65}
            camMoveSpeed={1.6}
            camZoomSpeed={1.0}
            springK={useLiteScene ? 1.8 : 1.5}
            dampingC={useLiteScene ? 0.18 : 0.14}
            rayHitForgiveness={PLAYER_RAY_HIT_FORGIVENESS}
            rayLength={PLAYER_RAY_LENGTH}
            floatHeight={PLAYER_FLOAT_HEIGHT}
            maxVelLimit={useLiteScene ? 4 : 5.5}
            turnSpeed={useLiteScene ? 12 : 16}
            sprintMult={1.6}
          >
            <Suspense fallback={null}>
              <CharacterModel key={avatarPath} modelPath={avatarPath} />
              <PlayerReadySignal />
            </Suspense>
          </Ecctrl>
        </KeyboardControls>
      )}

      {/* EmoteTrigger uses Ecctrl's useGame store, which only works when
          Ecctrl is mounted. Skipped in lite mode. */}
      {!USE_LITE_PHYSICS && <EmoteTrigger />}
      {/* PlayerFallGuard reads ecctrl's "yourCharacter" group — also only
          meaningful with Ecctrl. */}
      {!USE_LITE_PHYSICS && <PlayerFallGuard />}
    </LitePhysicsProvider>
  );

  return USE_LITE_PHYSICS
    ? sceneBody
    : (
      <Physics
        gravity={[0, -9.81, 0]}
        timeStep={useLiteScene ? 'vary' : 1 / 60}
        maxStabilizationIterations={useLiteScene ? 1 : 4}
        maxVelocityIterations={useLiteScene ? 1 : 4}
        paused={pausedPhysics}
      >
        {sceneBody}
      </Physics>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ShopGame3D({
  shopTheme = 'modern_clean',
  shopName = 'My Shop',
  products = [],
  staff = [],
  demoWalkOnly = false,
  userStats,
  isShopLaunched = false,
  trafficMultiplier = 1,
  activeInfluencers = [],
  activeInnovations = [],
  initialStats,
  dailyRewardLastClaimDate,
  onClaimDailyReward,
  interiorFloorColor,
  interiorFloorStyleId,
  interiorWallColor,
  interiorWallStyleId,
  remainingDailyVisitors,
  storageScopeId,
  csrBadges,
  shelfStyle,
  counterStyle,
  shopImageUrl,
  layoutPositions,
  tvPosterUrl,
  wallPosters,
  onWallPosterRemove,
  onInnovationMove,
  onLaunchShop,
}: ShopGame3DProps) {
  const navigate = useNavigate();
  const [showPhoneMenu, setShowPhoneMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [touchInput, setTouchInput] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shelfActionMenu, setShelfActionMenu] = useState<{ side: 'left' | 'right' } | null>(null);
  const [avatarPath, setAvatarPath] = useState(() => getSelectedAvatarPath(storageScopeId));

  // Shared input ref for the lite-physics controller. Joystick (DOM) writes to
  // `.move` / `.jumpPressed`, keyboard listeners write the same fields, and
  // <LiteKinematicPlayer> reads them each frame inside the Canvas.
  const liteInputRef = useLiteInputRef();
  const [showEmoteMenu, setShowEmoteMenu] = useState(false);
  const [showContextHint, setShowContextHint] = useState(true);
  const [contextHintText, setContextHintText] = useState('');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [showCompanion, setShowCompanion] = useState(true);
  const [companionMessage, setCompanionMessage] = useState('');
  const [companionHighlight, setCompanionHighlight] = useState<'tablet' | 'shelf' | 'dashboard' | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakClaimed, setStreakClaimed] = useState(false);
  const [streakClaiming, setStreakClaiming] = useState(false);
  const [showDecorateTutorial, setShowDecorateTutorial] = useState(false);
  const [wallPosterActionSlot, setWallPosterActionSlot] = useState<number | null>(null);
  const [hudInfoModal, setHudInfoModal] = useState<string | null>(null);
  const [showDemoLoginModal, setShowDemoLoginModal] = useState(false);
  const [demoLoginReason, setDemoLoginReason] = useState('Login to unlock all simulator actions.');
  const [decorateTutorialStep, setDecorateTutorialStep] = useState(0);
  const [phoneClockTime, setPhoneClockTime] = useState(() => formatPhoneClockTime(new Date()));
  const DECORATE_TUTORIAL_KEY = `shop3d_decorate_tutorial_${storageScopeId}`;

  const requireLoginForAction = useCallback((reason: string) => {
    if (!demoWalkOnly) return false;
    setDemoLoginReason(reason);
    setShowDemoLoginModal(true);
    return true;
  }, [demoWalkOnly]);

  // Auto-capitalize first letter of each word in shop name
  const displayShopName = (shopName || 'My Shop').replace(/\b\w/g, c => c.toUpperCase());

  // Live totals — start from backend values, increment in real-time as NPCs visit/buy
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [liveProfit, setLiveProfit] = useState(0);

  // Sync from initialStats on load
  useEffect(() => {
    setLiveVisitors(Number(initialStats?.visitors) || 0);
    setLiveProfit(Number(initialStats?.totalProfit) || 0);
  }, [initialStats?.visitors, initialStats?.totalProfit]);

  // NPC visit handler — update local HUD only (passive tick in dashboard handles backend recording)
  const handleNPCVisit = useCallback(() => {
    setLiveVisitors(prev => prev + 1);
  }, []);

  // NPC purchase handler — update local HUD only (passive tick in dashboard handles backend recording)
  const handleNPCSale = useCallback(() => {
    const randomProduct = products.length > 0 ? products[Math.floor(Math.random() * products.length)] : null;
    const salePrice = randomProduct?.price || 5;
    setLiveProfit(prev => prev + Number(salePrice));
  }, [products]);

  const theme = useMemo(() => {
    const base = THEME_CONFIGS[shopTheme] || THEME_CONFIGS.modern_clean;
    return {
      ...base,
      interior: {
        ...base.interior,
        ...(interiorFloorColor ? { floor: interiorFloorColor } : {}),
        ...(interiorWallColor ? { walls: interiorWallColor } : {}),
      },
    };
  }, [shopTheme, interiorFloorColor, interiorWallColor]);
  // User has decorated if interior_config was ever saved with style changes.
  const hasDecorated = !!(interiorFloorStyleId || interiorWallStyleId);

  const popularity = userStats?.popularity ?? 1;
  const staffCount = Math.min(staff.length, 4);

  // Defer the heavy <Canvas> mount one frame so the loading screen actually
  // paints BEFORE the main thread is stuck parsing GLB + building meshes.
  // Without this, the user clicks /demo and the browser freezes for ~2 s
  // because the chunk-parse, Canvas init, and player-glb parse all stack
  // up in a single task with no chance to repaint the loader.
  const [readyToMount, setReadyToMount] = useState(false);
  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      // Two rAFs in a row guarantees the loading frame is visible before we
      // start the heavy work — even on devices where the first rAF runs
      // before paint.
      raf2 = requestAnimationFrame(() => setReadyToMount(true));
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, []);

  // Loading completes when the player avatar has been fetched + parsed AND
  // drei reports no other active loads. The overlay also hides as soon as
  // the player suspense resolves (signal from <PlayerReadySignal/> below).
  const { active: progressActive, loaded: progressLoaded } = useProgress();
  const [playerReady, setPlayerReady] = useState(false);
  useEffect(() => {
    if (!isLoading) return;
    // Player avatar is the only critical asset. Once drei has seen at least
    // one model finish AND nothing is currently loading, we're good.
    if ((progressLoaded > 0 && !progressActive) || playerReady) {
      // Small grace so the bar visibly fills to 100% before the fade.
      const t = setTimeout(() => setIsLoading(false), 250);
      return () => clearTimeout(t);
    }
  }, [isLoading, progressActive, progressLoaded, playerReady]);
  // Safety: never hold the overlay longer than 15 s — on a truly stalled
  // connection we'd rather drop the user into the scene than wait forever.
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 15000);
    return () => clearTimeout(t);
  }, []);

  // Listen for the in-Canvas PlayerReadySignal — fired the frame after the
  // player avatar's Suspense resolves. Treats this as the canonical "scene
  // is visible" event, independent of drei's progress meter.
  useEffect(() => {
    const fn = () => setPlayerReady(true);
    playerReadyListeners.add(fn);
    return () => { playerReadyListeners.delete(fn); };
  }, []);

  // Claim the HTML boot loader as ours so main.tsx doesn't dismiss it.
  // The boot loader is the SOLE loading UI here: a React overlay would
  // freeze at 0% while Rapier's WASM compiles on the main thread, but the
  // boot loader is pure CSS (GPU-composited) so it animates smoothly even
  // during the worst stalls.
  useEffect(() => {
    (window as any).__shopBootClaimed = true;
  }, []);

  // Dismiss the HTML boot loader the moment isLoading flips false (player
  // is in + the scene first-frame has painted).
  useEffect(() => {
    if (!isLoading) {
      // Give the scene one more frame to paint before fading out, so the
      // user never sees a flash of un-styled canvas.
      const raf = requestAnimationFrame(() => {
        window.__shopBootDone?.();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isLoading]);

  // Track the WebGL renderer so we can bump DPR + kick idle prefetch after
  // the loader fades out.
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  useEffect(() => {
    if (isLoading) return;
    const gl = rendererRef.current;
    if (gl) {
      // Restore the full target DPR now that the heavy load is done.
      gl.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_BUDGET.dprMax));
    }
    // Background-prefetch the non-critical models so they're cached when their
    // Suspense boundaries mount a moment later.
    preloadIdleModels();
  }, [isLoading]);

  useEffect(() => {
    const updateClock = () => setPhoneClockTime(formatPhoneClockTime(new Date()));
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const update = () => setTouchInput(isTouchDevice());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // First-time decoration tutorial — show after loading if not completed
  useEffect(() => {
    if (isLoading || demoWalkOnly) return;
    const done = localStorage.getItem(DECORATE_TUTORIAL_KEY);
    if (done) return;
    const t = setTimeout(() => setShowDecorateTutorial(true), 800);
    return () => clearTimeout(t);
  }, [isLoading, DECORATE_TUTORIAL_KEY, demoWalkOnly]);

  const dismissDecorateTutorial = useCallback(() => {
    localStorage.setItem(DECORATE_TUTORIAL_KEY, JSON.stringify({ completed: true, at: Date.now() }));
    setShowDecorateTutorial(false);
  }, [DECORATE_TUTORIAL_KEY]);

  const handleGoDecorate = useCallback(() => {
    if (requireLoginForAction('Login to decorate your shop and save your design.')) return;
    dismissDecorateTutorial();
    navigate('/s/aipreneur/decorate');
  }, [dismissDecorateTutorial, navigate, requireLoginForAction]);

  // AI Companion – step-by-step guidance based on game state
  useEffect(() => {
    if (demoWalkOnly) {
      setCompanionMessage('Demo mode: walk around freely. Login to manage products, marketing, and rewards.');
      setShowCompanion(true);
      setCompanionHighlight(null);
      setShowContextHint(false);
      return;
    }

    let msg = '';
    let highlight: 'tablet' | 'shelf' | 'dashboard' | null = null;
    if (products.length === 0 && staff.length === 0) {
      msg = "Hey there! Your shop is empty! Let's add some products first. Tap your phone to open the menu!";
      highlight = 'tablet';
    } else if (products.length < 2) {
      msg = `You have ${products.length} product! Add at least 2 so customers have choices. Tap your phone!`;
      highlight = 'tablet';
    } else if (staff.length < 2) {
      msg = `You need at least 2 staff to run your shop! You have ${staff.length}. Hire more from your phone!`;
      highlight = 'tablet';
    } else if (!isShopLaunched) {
      msg = "You're all set! Time for the Grand Opening! Cut the ribbon to open your shop! 🎊";
      highlight = null;
    } else if (isShopLaunched) {
      msg = "Your shop is open! Customers are on their way. Check your phone for quests and rewards!";
      highlight = null;
    }
    setCompanionMessage(msg);
    setShowCompanion(!!msg);
    setCompanionHighlight(highlight);
    // Also update old hint system for the top bar
    if (products.length === 0) {
      setContextHintText('Add your first product! Tap the tablet to get started');
      setShowContextHint(true);
    } else if (staff.length === 0) {
      setContextHintText('Hire staff to serve your customers!');
      setShowContextHint(true);
    } else if (!isShopLaunched) {
      setContextHintText('Launch your shop to start getting visitors!');
      setShowContextHint(true);
    } else {
      setShowContextHint(false);
    }
  }, [products.length, staff.length, isShopLaunched, demoWalkOnly]);

  // Auto-show streak modal when game loads if reward not claimed today
  useEffect(() => {
    if (!onClaimDailyReward) return;
    const today = new Date().toDateString();
    const lastClaim = dailyRewardLastClaimDate ? new Date(dailyRewardLastClaimDate).toDateString() : null;
    if (lastClaim === today) {
      setStreakClaimed(true);
    } else {
      // Show after loading finishes
      const t = setTimeout(() => setShowStreakModal(true), 2000);
      return () => clearTimeout(t);
    }
  }, [dailyRewardLastClaimDate, onClaimDailyReward]);

  const handleClaimStreak = useCallback(async () => {
    if (!onClaimDailyReward || streakClaiming) return;
    setStreakClaiming(true);
    try {
      const ok = await onClaimDailyReward();
      if (ok) {
        setStreakClaimed(true);
        // Fire confetti celebration
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => {
          confetti({ particleCount: 80, spread: 100, origin: { y: 0.5, x: 0.3 } });
          confetti({ particleCount: 80, spread: 100, origin: { y: 0.5, x: 0.7 } });
        }, 300);
        setTimeout(() => setShowStreakModal(false), 1800);
      }
    } catch { /* ignore */ }
    setStreakClaiming(false);
  }, [onClaimDailyReward, streakClaiming]);

  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct((prev) => (prev?.id === product.id ? null : product));
  }, []);

  const handleAddProduct = useCallback(() => {
    if (requireLoginForAction('Login to add products and run your own shop.')) return;
    navigate('/s/aipreneur/product');
  }, [navigate, requireLoginForAction]);

  const handleShelfClick = useCallback((side: 'left' | 'right') => {
    if (requireLoginForAction('Login to manage shelf items and decorate.')) return;
    setShelfActionMenu({ side });
    setSelectedProduct(null);
  }, [requireLoginForAction]);

  const MODULE_ROUTES: Record<string, string> = {
    operations: '/s/aipreneur/operation',
    marketing: '/s/aipreneur/marketing',
    tech: '/s/aipreneur/innovation',
    csr: '/s/aipreneur/csr',
    finance: '/s/aipreneur/finance',
    products: '/s/aipreneur/product',
  };

  const handleModuleClick = useCallback((moduleId: string) => {
    if (requireLoginForAction('Login to open business modules from the command center.')) return;
    const route = MODULE_ROUTES[moduleId];
    if (route) navigate(route);
  }, [navigate, requireLoginForAction]);

  return (
    <div className="relative w-full h-screen overflow-hidden touch-none">
      {readyToMount && (
      <Canvas
        shadows={SCENE_BUDGET.shadows}
        className="touch-none"
        camera={{ position: [0, 8, 28], fov: 55, near: 0.5, far: SCENE_BUDGET.cameraFar }}
        // Start at quarter resolution while loading so WebGL fillrate doesn't
        // compete with the JS main thread that's busy parsing GLBs. After
        // the loader fades, the post-mount effect bumps DPR back to budget.
        dpr={isLoading ? [0.4, 0.55] : [SCENE_BUDGET.dprMin, SCENE_BUDGET.dprMax]}
        performance={{ min: SCENE_BUDGET.performanceMin }}
        frameloop="always"
        gl={{
          antialias: SCENE_BUDGET.antialias,
          powerPreference: useLiteScene ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true,
          alpha: false,
          // Discard back-buffer after present — saves VRAM on mobile GPUs
          preserveDrawingBuffer: false,
        }}
        onCreated={({ gl }) => {
          rendererRef.current = gl;
          if (SCENE_BUDGET.shadows) {
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = SCENE_BUDGET.shadowType;
          }
          // While loading, render at half resolution to give the CPU room to
          // parse GLBs without dropping frames on the loader. Bump up later.
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 0.65));
          // Boot milestone: WebGL context created. Rapier WASM + scene
          // mount still ahead, but the renderer is alive.
          window.__shopBootProgress?.(82);
        }}
      >
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
        <color attach="background" args={['#87ceeb']} />
        <fog attach="fog" args={['#87ceeb', SCENE_BUDGET.fogNear, SCENE_BUDGET.fogFar]} />

        <ambientLight intensity={useLiteScene ? 2.2 : 1.8} />
        {SCENE_BUDGET.hemisphereLight && <hemisphereLight intensity={0.5} color="#b1e1ff" groundColor="#4a7c59" />}
        <directionalLight
          position={[20, 40, 30]}
          intensity={useLiteScene ? 2 : 3}
          castShadow={SCENE_BUDGET.shadows}
          shadow-normalBias={0.06}
          shadow-mapSize-width={SCENE_BUDGET.shadowMapSize}
          shadow-mapSize-height={SCENE_BUDGET.shadowMapSize}
          shadow-camera-near={1}
          shadow-camera-far={50}
          shadow-camera-top={25}
          shadow-camera-right={25}
          shadow-camera-bottom={-25}
          shadow-camera-left={-25}
        />

        <Suspense fallback={<LoadingScene />}>
          <Scene3DErrorBoundary>
            <WorldScene
              theme={theme}
              products={products}
              onSelectProduct={handleSelectProduct}
              popularity={popularity}
              staffCount={staffCount}
              trafficMultiplier={trafficMultiplier}
              activeInfluencers={activeInfluencers}
              activeInnovations={activeInnovations}
              shopName={shopName}
              avatarPath={avatarPath}
              remainingDailyVisitors={remainingDailyVisitors}
              onShelfClick={handleShelfClick}
              onAddProduct={handleAddProduct}
              onModuleClick={handleModuleClick}
              shelfStyle={shelfStyle}
              counterStyle={counterStyle}
              csrBadges={csrBadges}
              shopImageUrl={shopImageUrl}
              layoutPositions={layoutPositions}
              floorStyleId={interiorFloorStyleId}
              wallStyleId={interiorWallStyleId}
              onTVClick={() => {
                if (requireLoginForAction('Login to create TV posters and marketing assets.')) return;
                navigate('/s/aipreneur/marketing?poster=tv');
              }}
              tvPosterUrl={tvPosterUrl}
              wallPosters={wallPosters}
              onWallPosterClickEmpty={(slot: number) => {
                if (requireLoginForAction('Login to design wall posters and campaigns.')) return;
                navigate(`/s/aipreneur/marketing?poster=wall&slot=${slot}`);
              }}
              onWallPosterClickFilled={(slot: number) => {
                if (requireLoginForAction('Login to replace or remove wall posters.')) return;
                setWallPosterActionSlot(slot);
              }}
              onInnovationMove={onInnovationMove}
              shopReady={isShopLaunched && products.length > 0 && staff.length > 0}
              onNPCVisit={handleNPCVisit}
              onNPCSale={handleNPCSale}
              liteInput={liteInputRef}
            />
          </Scene3DErrorBoundary>
        </Suspense>
      </Canvas>
      )}

      {/* Lite-physics input UI lives in the DOM (outside the Canvas) so it
          gets touch events the Canvas would otherwise consume. */}
      {USE_LITE_PHYSICS && <LiteJoystick input={liteInputRef} />}

      {!USE_LITE_PHYSICS && touchInput && !showPhoneMenu && (
        <EcctrlJoystick
          buttonNumber={1}
          joystickPositionLeft={20}
          joystickPositionBottom={20}
          buttonPositionRight={20}
          buttonPositionBottom={120}
          joystickHeightAndWidth={140}
          buttonHeightAndWidth={70}
        />
      )}

      {/* Loading UI is the HTML boot loader (see index.html). React-based
          loaders freeze at 0% during the Rapier WASM compile; the HTML one
          uses pure CSS animations that never stall. */}

      {/* HUD – Futuristic Stats Board */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none w-[calc(100%-12px)] max-w-xl">
        <div className="relative bg-gradient-to-r from-[#0d0b1a]/90 via-[#13102a]/90 to-[#0d0b1a]/90 backdrop-blur-2xl rounded-2xl border border-cyan-500/20 overflow-hidden">
          {/* Glowing top edge accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60" />

          {/* Shop name header — tap to collapse/expand on mobile */}
          <button
            onClick={() => setHudCollapsed(prev => !prev)}
            className="pointer-events-auto flex items-center justify-center gap-2 px-3 pt-2 pb-1 w-full sm:cursor-default"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isShopLaunched ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400 shadow-[0_0_8px_#f87171]'}`} />
            <span className="text-white/90 text-[11px] sm:text-sm font-bold tracking-wide truncate">{displayShopName}</span>
            <Sparkles className="w-3 h-3 text-cyan-400/60 flex-shrink-0 hidden sm:block" />
            {hudCollapsed
              ? <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0 sm:hidden" />
              : <ChevronUp className="w-3.5 h-3.5 text-white/40 flex-shrink-0 sm:hidden" />}
          </button>

          {/* Stats grid - collapsible on mobile, always visible on sm+ */}
          <div className={`grid grid-cols-3 sm:grid-cols-6 gap-1 px-2 pb-2 transition-all duration-200 origin-top ${hudCollapsed ? 'max-h-0 opacity-0 overflow-hidden pb-0 sm:max-h-none sm:opacity-100 sm:overflow-visible sm:pb-2' : 'max-h-40 opacity-100'}`}>
            {userStats && (
              <>
                {/* Level */}
                <button
                  onClick={() => {
                    if (requireLoginForAction('Login to access detailed HUD stats and progression.')) return;
                    setHudInfoModal('level');
                  }}
                  className="pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-violet-600/30 to-purple-700/20 border border-violet-500/30 hover:border-violet-400/50 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                >
                  <Star className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  <span className="text-white text-[11px] sm:text-xs font-extrabold">{userStats.level}</span>
                </button>

                {/* AI Tokens */}
                <button
                  onClick={() => {
                    if (requireLoginForAction('Login to access detailed HUD stats and progression.')) return;
                    setHudInfoModal('tokens');
                  }}
                  className="pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-yellow-600/30 to-amber-700/20 border border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-[0_0_12px_rgba(234,179,8,0.3)]"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="text-white text-[11px] sm:text-xs font-extrabold">{userStats.aiTokens?.toLocaleString()}</span>
                </button>

                {/* Popularity */}
                {typeof userStats.popularity === 'number' && (
                  <button
                    onClick={() => {
                      if (requireLoginForAction('Login to access detailed HUD stats and progression.')) return;
                      setHudInfoModal('popularity');
                    }}
                    className="pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-cyan-600/30 to-teal-700/20 border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                    <span className="text-white text-[11px] sm:text-xs font-extrabold">{Math.round(userStats.popularity)}</span>
                  </button>
                )}

                {/* Visitors */}
                <button
                  onClick={() => {
                    if (requireLoginForAction('Login to access detailed HUD stats and progression.')) return;
                    setHudInfoModal('visitors');
                  }}
                  className="pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-emerald-600/30 to-green-700/20 border border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                  <span className="text-white text-[11px] sm:text-xs font-extrabold">{liveVisitors}</span>
                </button>
              </>
            )}

            {/* Profit */}
            <button
              onClick={() => {
                if (requireLoginForAction('Login to access detailed HUD stats and progression.')) return;
                setHudInfoModal('profit');
              }}
              className="pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-green-600/30 to-lime-700/20 border border-green-500/30 hover:border-green-400/50 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]"
            >
              <DollarSign className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
              <span className="text-white text-[11px] sm:text-xs font-extrabold">{liveProfit.toFixed(2)}</span>
            </button>

            {/* Streak */}
            {userStats && (
              <button
                onClick={() => {
                  if (requireLoginForAction('Login to claim streak rewards and bonuses.')) return;
                  setShowStreakModal(true);
                }}
                className={`pointer-events-auto group relative flex items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 border ${
                  streakClaimed
                    ? 'bg-gradient-to-br from-orange-600/30 to-amber-700/20 border-orange-500/30 hover:border-orange-400/50'
                    : 'bg-gradient-to-br from-orange-600/40 to-amber-600/30 border-orange-400/40 animate-pulse hover:border-orange-400/60'
                } hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                <span className="text-white text-[11px] sm:text-xs font-extrabold">{userStats.streak || 0}</span>
                {!streakClaimed && <span className="text-orange-300 text-[8px] font-extrabold ml-[-2px]">!</span>}
              </button>
            )}
          </div>

          {/* Glowing bottom edge accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
        </div>
      </div>

      {/* HUD STAT INFO MODAL */}
      <AnimatePresence>
        {hudInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setHudInfoModal(null)} />
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 24, stiffness: 350 }}
              className="relative w-full max-w-xs"
            >
              {(() => {
                const infoMap: Record<string, { icon: React.ReactNode; color: string; glow: string; title: string; label: string; value: string; desc: string }> = {
                  level: {
                    icon: <Star className="w-7 h-7 text-white" />,
                    color: 'from-violet-500 to-purple-600',
                    glow: 'bg-violet-500/20',
                    title: 'Level',
                    label: 'Your Business Level',
                    value: `Level ${userStats?.level || 1}`,
                    desc: 'Your shop level shows how experienced you are as an AIpreneur! Level up by completing quests, earning profit, and growing your shop.',
                  },
                  tokens: {
                    icon: <Zap className="w-7 h-7 text-white" />,
                    color: 'from-yellow-500 to-amber-600',
                    glow: 'bg-yellow-500/20',
                    title: 'AI Tokens',
                    label: 'AI Power Tokens',
                    value: `${userStats?.aiTokens?.toLocaleString() || 0} Tokens`,
                    desc: 'AI Tokens are your creative fuel! Use them to generate marketing posters, product designs, and other AI-powered content for your shop.',
                  },
                  popularity: {
                    icon: <Eye className="w-7 h-7 text-white" />,
                    color: 'from-cyan-500 to-teal-600',
                    glow: 'bg-cyan-500/20',
                    title: 'Popularity',
                    label: 'Popularity Level',
                    value: `${Math.round(userStats?.popularity || 0)} Points`,
                    desc: 'Popularity shows how well-known your shop is! Higher popularity attracts more visitors and customers. Boost it with marketing and great products.',
                  },
                  visitors: {
                    icon: <Users className="w-7 h-7 text-white" />,
                    color: 'from-emerald-500 to-green-600',
                    glow: 'bg-emerald-500/20',
                    title: 'Visitors',
                    label: 'Total Visitors',
                    value: `${liveVisitors} Visitors`,
                    desc: 'This is how many customers have visited your shop! More visitors means more chances to make sales. Boost with ads and social media.',
                  },
                  profit: {
                    icon: <DollarSign className="w-7 h-7 text-white" />,
                    color: 'from-green-500 to-lime-600',
                    glow: 'bg-green-500/20',
                    title: 'Profit',
                    label: 'Total Profit',
                    value: `$${liveProfit.toFixed(2)}`,
                    desc: 'Your total earnings from shop sales! Increase profit by adding more products, setting smart prices, and attracting more customers.',
                  },
                };
                const info = infoMap[hudInfoModal];
                if (!info) return null;
                return (
                  <>
                    <div className={`absolute inset-0 ${info.glow} blur-[50px] rounded-full`} />
                    <div className="relative bg-gradient-to-b from-[#1a1028] to-[#0f0a1a] rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
                      {/* Close */}
                      <button
                        onClick={() => setHudInfoModal(null)}
                        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <X className="w-4 h-4 text-white/70" />
                      </button>

                      {/* Icon + Title */}
                      <div className="pt-7 pb-3 text-center">
                        <div className={`w-14 h-14 mx-auto mb-3 bg-gradient-to-br ${info.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                          {info.icon}
                        </div>
                        <h3 className="text-white font-bold text-lg">{info.label}</h3>
                      </div>

                      {/* Value */}
                      <div className="px-5 pb-3">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
                          <span className="text-white font-extrabold text-2xl">{info.value}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="px-5 pb-5">
                        <p className="text-white/60 text-sm leading-relaxed text-center">{info.desc}</p>
                      </div>

                      {/* Got It button */}
                      <div className="px-5 pb-5">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setHudInfoModal(null)}
                          className={`w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r ${info.color} shadow-lg flex items-center justify-center gap-2`}
                        >
                          <Trophy className="w-4 h-4" />
                          Got It!
                        </motion.button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Companion Guide */}
      <AnimatePresence>
        {showCompanion && companionMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed bottom-44 left-3 sm:bottom-24 sm:left-5 z-50 max-w-[280px] sm:max-w-[320px]"
          >
            <div className="flex items-start gap-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-3 sm:p-4 shadow-xl border-2 border-white/20">
              {/* Robot avatar */}
              <div className="flex-shrink-0 w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                🤖
              </div>
              {/* Message */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs sm:text-sm font-bold leading-snug drop-shadow-sm">{companionMessage}</p>
                {/* Directional arrow pointing to highlighted element */}
                {companionHighlight === 'tablet' && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="text-yellow-300 text-[10px] font-extrabold animate-pulse">Look over there!</span>
                    <span className="text-yellow-300 text-sm animate-bounce inline-block" style={{ animationDuration: '0.8s' }}>👉</span>
                  </div>
                )}
                {/* Grand Opening button when shop ready but not launched */}
                {!isShopLaunched && products.length >= 2 && staff.length >= 2 && onLaunchShop ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setShowCompanion(false); onLaunchShop(); }}
                    className="mt-2 w-full py-2.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl font-black text-sm text-white uppercase tracking-wider shadow-lg shadow-orange-500/40 flex items-center justify-center gap-2"
                  >
                    🎊 OPEN YOUR SHOP! 🎊
                  </motion.button>
                ) : (
                  <button
                    onClick={() => { setShowCompanion(false); setCompanionHighlight(null); }}
                    className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-[10px] sm:text-xs text-white font-black uppercase tracking-wider transition-colors"
                  >
                    Got it!
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STREAK CLAIM MODAL */}
      <AnimatePresence>
        {showStreakModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStreakModal(false)} />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="relative w-full max-w-sm"
            >
              <div className="absolute inset-0 bg-orange-500/20 blur-[60px] rounded-full" />
              <div className="relative bg-gradient-to-b from-[#1a1020] to-[#0f0a1a] rounded-3xl border border-orange-500/30 shadow-2xl overflow-hidden">
                {/* Close */}
                <button
                  onClick={() => setShowStreakModal(false)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>

                {/* Header */}
                <div className="pt-8 pb-4 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30"
                  >
                    <Flame className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-white font-bold text-xl">Daily Streak</h3>
                  <p className="text-orange-300/70 text-sm mt-1">Keep your streak alive!</p>
                </div>

                {/* Streak Info */}
                <div className="px-6 pb-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60 text-sm">Current Streak</span>
                      <span className="text-orange-400 font-bold text-2xl">{userStats?.streak || 0} Days</span>
                    </div>
                    <div className="flex gap-1.5 justify-center">
                      {Array.from({ length: 7 }, (_, i) => {
                        const day = i + 1;
                        const streak = userStats?.streak || 0;
                        const completed = day <= (streak % 7 || (streak > 0 ? 7 : 0));
                        return (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                              completed
                                ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-orange-400 text-white'
                                : 'bg-white/5 border-white/10 text-white/30'
                            }`}>
                              {completed ? <CheckCircle className="w-4 h-4" /> : day}
                            </div>
                            <span className="text-[9px] text-white/40">D{day}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-amber-400/80 text-xs">Bonus: +{Math.min((userStats?.streak || 0) * 5, 50)} coins</span>
                    </div>
                  </div>
                </div>

                {/* Claim Button */}
                <div className="px-6 pb-6">
                  {streakClaimed ? (
                    <div className="w-full py-3.5 rounded-xl font-bold text-center text-green-400 bg-green-500/10 border border-green-500/20 flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Claimed Today!
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleClaimStreak}
                      disabled={streakClaiming}
                      className="w-full py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Gift className="w-5 h-5" />
                      {streakClaiming ? 'Claiming...' : (userStats?.streak || 0) > 0 ? 'Claim Daily Reward!' : 'Start Your Streak!'}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context hint removed – AI companion handles guidance */}


      {/* Product info panel */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-black/80 backdrop-blur-xl rounded-2xl p-5 text-white min-w-[260px] max-w-sm shadow-2xl border border-white/10"
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-3 right-3 w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0"
                style={{ backgroundColor: PRODUCT_COLORS[products.indexOf(selectedProduct) % PRODUCT_COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate pr-6">{selectedProduct.product_name}</h3>
                <p className="text-green-400 text-lg font-bold mt-0.5">${Number(selectedProduct.price || 0).toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shelf Action Menu – floating buttons when shelf is clicked */}
      <AnimatePresence>
        {shelfActionMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            onClick={() => setShelfActionMenu(null)}
          >
            {/* Dimmed backdrop */}
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

            {/* Buttons container */}
            <motion.div
              initial={{ scale: 0.5, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 40 }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              className="relative flex gap-4 sm:gap-5 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: 'Add Items', emoji: '📦', action: () => { if (requireLoginForAction('Login to add and manage products.')) return; navigate('/s/aipreneur/product'); setShelfActionMenu(null); }, color: 'from-blue-400 to-cyan-500', glow: 'shadow-blue-500/40' },
                { label: 'Decorate', emoji: '🎨', action: () => { if (requireLoginForAction('Login to decorate your shop.')) return; navigate('/s/aipreneur/decorate'); setShelfActionMenu(null); }, color: 'from-pink-400 to-rose-500', glow: 'shadow-pink-500/40' },
                { label: 'Close', emoji: '✖️', action: () => setShelfActionMenu(null), color: 'from-slate-400 to-slate-500', glow: 'shadow-slate-500/30' },
              ].map((btn, i) => (
                <motion.button
                  key={btn.label}
                  initial={{ opacity: 0, y: 30, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                  whileHover={{ scale: 1.12, y: -6 }}
                  whileTap={{ scale: 0.88, rotate: -5 }}
                  onClick={btn.action}
                  className={`flex flex-col items-center gap-2 px-5 py-4 sm:px-7 sm:py-5 bg-gradient-to-br ${btn.color} rounded-3xl shadow-xl ${btn.glow} border-2 border-white/30 text-white`}
                >
                  <motion.span
                    className="text-3xl sm:text-4xl"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                  >
                    {btn.emoji}
                  </motion.span>
                  <span className="text-xs sm:text-sm font-black tracking-wide">{btn.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== WALL POSTER ACTION OVERLAY ===== */}
      <AnimatePresence>
        {wallPosterActionSlot !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            onClick={() => setWallPosterActionSlot(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 border border-white/10 shadow-2xl max-w-xs w-full mx-4"
            >
              <h3 className="text-white font-bold text-lg mb-1 text-center">Wall Poster</h3>
              <p className="text-white/60 text-sm mb-4 text-center">Slot {wallPosterActionSlot + 1}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (requireLoginForAction('Login to edit your wall poster campaigns.')) return;
                    navigate(`/s/aipreneur/marketing?poster=wall&slot=${wallPosterActionSlot}`);
                    setWallPosterActionSlot(null);
                  }}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  Replace Poster
                </button>
                <button
                  onClick={() => {
                    if (requireLoginForAction('Login to manage wall posters.')) return;
                    onWallPosterRemove?.(wallPosterActionSlot);
                    setWallPosterActionSlot(null);
                  }}
                  className="w-full py-3 rounded-2xl text-red-400 font-bold text-sm border border-red-500/30 hover:bg-red-500/10 transition-all"
                >
                  Remove Poster
                </button>
                <button
                  onClick={() => setWallPosterActionSlot(null)}
                  className="w-full py-2 text-white/50 text-sm hover:text-white/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Office Command Center dashboard removed (was a modal opened from the
          in-world "ENTER OFFICE" billboard, which has also been removed). */}

      {/* Emote Floating Button - positioned mid-right to avoid joystick overlap on mobile */}
      <div className="fixed bottom-[45%] right-3 z-50">
        <AnimatePresence>
          {showEmoteMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute bottom-14 right-0 flex flex-col gap-2 items-end"
            >
              {[
                { id: 'wave', label: 'Wave', emoji: '👋', color: 'from-yellow-400 to-amber-500' },
                { id: 'interact', label: 'Dance', emoji: '💃', color: 'from-pink-400 to-rose-500' },
                { id: 'punch', label: 'Punch', emoji: '👊', color: 'from-red-400 to-red-600' },
                { id: 'kick', label: 'Kick', emoji: '🦶', color: 'from-orange-400 to-red-500' },
              ].map((emote, i) => (
                <motion.button
                  key={emote.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    emoteStore.pending = emote.id;
                    setShowEmoteMenu(false);
                  }}
                  className={`flex items-center gap-2 bg-gradient-to-r ${emote.color} rounded-full pl-2 pr-3 py-1.5 shadow-lg border border-white/20 hover:scale-105 transition-transform`}
                >
                  <span className="text-lg">{emote.emoji}</span>
                  <span className="text-white text-xs font-bold">{emote.label}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (requireLoginForAction('Login to use emotes and character actions.')) return;
            setShowEmoteMenu(v => !v);
          }}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-2xl border-2 border-white/30 flex items-center justify-center"
        >
          <span className="text-lg sm:text-xl">{showEmoteMenu ? '✕' : '😄'}</span>
        </motion.button>
      </div>

      {/* Bottom-right action buttons */}
      <div className="fixed bottom-2 right-2 z-50 flex flex-col items-center gap-2">
        {/* Decorate button — only shown until the user has made decoration changes */}
        {!hasDecorated && (
          <button
            onClick={handleGoDecorate}
            className="relative hover:scale-105 active:scale-95 transition-transform group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 rounded-2xl blur-md opacity-75 animate-pulse group-hover:opacity-100" />
            <div className="relative w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 rounded-2xl border-[2.5px] border-yellow-300 shadow-2xl flex flex-col items-center justify-center gap-0.5">
              <span className="text-xl sm:text-2xl">🎨</span>
              <span className="text-[8px] sm:text-[9px] font-extrabold text-white tracking-wide drop-shadow">DECORATE</span>
            </div>
            <div className="absolute -top-1 -right-1 w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] bg-yellow-400 rounded-full animate-bounce flex items-center justify-center z-20 shadow-md">
              <span className="text-[10px]">✨</span>
            </div>
          </button>
        )}

        {/* iPhone menu button */}
        <button
          onClick={() => {
            if (requireLoginForAction('Login to use your phone and open modules.')) return;
            setShowPhoneMenu(true);
            setCompanionHighlight(null);
          }}
          className="hover:scale-105 active:scale-95 transition-transform relative"
        >
          {/* Companion highlight ring */}
          {companionHighlight === 'tablet' && showCompanion && (
            <>
              <div className="absolute -inset-4 rounded-[22px] border-[3px] border-yellow-400 animate-ping opacity-60 z-30 pointer-events-none" />
              <div className="absolute -inset-3 rounded-[20px] border-[2px] border-yellow-300 opacity-90 z-30 pointer-events-none shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
              <div className="absolute -top-[58px] left-1/2 -translate-x-1/2 z-30 pointer-events-none whitespace-nowrap">
                <span className="bg-yellow-400 text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-lg">AI Learning!</span>
              </div>
              <div className="absolute -top-[34px] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce text-2xl">
                👇
              </div>
            </>
          )}
          <div className="relative w-[62px] h-[118px] sm:w-[72px] sm:h-[136px]">
            {/* iPhone body - titanium frame */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#2a2a2e] via-[#1c1c1e] to-[#0a0a0a] rounded-[14px] sm:rounded-[16px] border-[2px] border-[#4a4a4e] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset] overflow-hidden">
              {/* Side button accents */}
              <div className="absolute -left-[2.5px] top-[22px] w-[2px] h-[10px] bg-[#4a4a4e] rounded-l-sm" />
              <div className="absolute -left-[2.5px] top-[38px] w-[2px] h-[16px] bg-[#4a4a4e] rounded-l-sm" />
              <div className="absolute -left-[2.5px] top-[56px] w-[2px] h-[16px] bg-[#4a4a4e] rounded-l-sm" />
              <div className="absolute -right-[2.5px] top-[34px] w-[2px] h-[20px] bg-[#4a4a4e] rounded-r-sm" />
              {/* Dynamic Island */}
              <div className="absolute top-[6px] sm:top-[7px] left-1/2 -translate-x-1/2 w-[26px] sm:w-[30px] h-[8px] sm:h-[9px] bg-black rounded-full flex items-center justify-center">
                <div className="w-[4px] h-[4px] rounded-full bg-[#1a1a2e] ring-1 ring-[#2a2a3e]" />
              </div>
              {/* Screen */}
              <div className="absolute inset-[3px] top-[17px] sm:top-[19px] bottom-[12px] sm:bottom-[14px] bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] rounded-[10px] sm:rounded-[12px] overflow-hidden">
                {/* Wallpaper subtle pattern */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
                {/* Status bar */}
                <div className="flex items-center justify-between px-[5px] pt-[2px]">
                  <span className="text-white/80 text-[6px] sm:text-[7px] font-semibold">{phoneClockTime}</span>
                  <div className="flex items-center gap-[2px]">
                    <div className="flex gap-[1px]">
                      <div className="w-[2px] h-[5px] bg-white/70 rounded-[0.5px]" />
                      <div className="w-[2px] h-[6px] bg-white/70 rounded-[0.5px]" />
                      <div className="w-[2px] h-[7px] bg-white/70 rounded-[0.5px]" />
                      <div className="w-[2px] h-[8px] bg-white/40 rounded-[0.5px]" />
                    </div>
                    <div className="w-[12px] h-[6px] border border-white/60 rounded-[1px] flex items-center p-[0.5px]">
                      <div className="w-[60%] h-full bg-green-400 rounded-[0.5px]" />
                    </div>
                  </div>
                </div>
                {/* App grid */}
                <div className="grid grid-cols-3 gap-[4px] sm:gap-[5px] px-[5px] sm:px-[6px] pt-[5px] sm:pt-[6px]">
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm" />
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-sm" />
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm" />
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-pink-400 to-rose-600 shadow-sm" />
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-violet-400 to-purple-600 shadow-sm" />
                  <div className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] rounded-[4px] bg-gradient-to-br from-red-400 to-red-600 shadow-sm" />
                </div>
                {/* Dock bar */}
                <div className="absolute bottom-[3px] left-[5px] right-[5px] h-[16px] sm:h-[18px] bg-white/15 backdrop-blur-sm rounded-[5px] flex items-center justify-center gap-[4px] px-[4px]">
                  <div className="w-[11px] h-[11px] sm:w-[12px] sm:h-[12px] rounded-[3px] bg-gradient-to-br from-green-400 to-green-600" />
                  <div className="w-[11px] h-[11px] sm:w-[12px] sm:h-[12px] rounded-[3px] bg-gradient-to-br from-blue-400 to-blue-600" />
                  <div className="w-[11px] h-[11px] sm:w-[12px] sm:h-[12px] rounded-[3px] bg-gradient-to-br from-white/90 to-gray-200" />
                </div>
              </div>
              {/* Home indicator bar */}
              <div className="absolute bottom-[4px] sm:bottom-[5px] left-1/2 -translate-x-1/2 w-[24px] sm:w-[28px] h-[3px] bg-white/30 rounded-full" />
            </div>
            {/* Notification badge */}
            <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] sm:w-[20px] sm:h-[20px] bg-red-500 rounded-full animate-pulse flex items-center justify-center z-20 shadow-lg border border-red-400/50">
              <span className="text-white text-[8px] sm:text-[9px] font-bold">!</span>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-2 bg-purple-500/15 rounded-[20px] blur-lg -z-10 animate-pulse" style={{ animationDuration: '3s' }} />
          </div>
        </button>
      </div>

      {/* First-time decoration tutorial overlay */}
      <AnimatePresence>
        {showDecorateTutorial && (
          <motion.div
            key="decorate-tutorial"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[300] flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Skip button */}
            <button
              onClick={dismissDecorateTutorial}
              className="absolute top-4 right-4 z-10 px-4 py-2 rounded-full text-sm font-medium transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Skip
            </button>

            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative z-10 w-full max-w-sm"
            >
              <div
                className="rounded-3xl p-6 text-center"
                style={{
                  background: 'rgba(15, 15, 30, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* Step 1: Welcome */}
                {decorateTutorialStep === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-5xl"
                      style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.2))' }}
                    >
                      🏪
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Welcome to Your Shop!</h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      This is your 3D store. Let's make it truly yours by decorating the interior first!
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDecorateTutorialStep(1)}
                      className="w-full py-3 rounded-xl font-bold text-white text-base"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                      }}
                    >
                      Next →
                    </motion.button>
                  </motion.div>
                )}

                {/* Step 2: Go Decorate */}
                {decorateTutorialStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center text-5xl"
                      style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(244,114,182,0.2))' }}
                    >
                      🎨
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Decorate Your Store</h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      Choose your walls, floors, shelves & more. Make your shop stand out from the rest!
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGoDecorate}
                      className="w-full py-3 rounded-xl font-bold text-white text-base mb-3"
                      style={{
                        background: 'linear-gradient(135deg, #ec4899, #f472b6)',
                        boxShadow: '0 8px 24px rgba(236,72,153,0.3)',
                      }}
                    >
                      Let's Decorate! 🎨
                    </motion.button>
                    <button
                      onClick={() => setDecorateTutorialStep(0)}
                      className="text-sm font-medium transition-colors hover:text-white/80"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      ← Back
                    </button>
                  </motion.div>
                )}

                {/* Step dots */}
                <div className="flex justify-center gap-2 mt-5">
                  {[0, 1].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-all"
                      style={{
                        background: i === decorateTutorialStep ? '#8b5cf6' : 'rgba(255,255,255,0.15)',
                        width: i === decorateTutorialStep ? '20px' : '8px',
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo login-required modal */}
      <AnimatePresence>
        {showDemoLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[320] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDemoLoginModal(false)}
            />
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              className="relative z-10 w-full max-w-sm rounded-3xl p-6 text-center"
              style={{
                background: 'rgba(15, 15, 30, 0.96)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
              }}
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(139,92,246,0.28))' }}
              >
                🔐
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Login Required</h3>
              <p className="text-white/65 text-sm mb-5">{demoLoginReason}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowDemoLoginModal(false);
                    navigate('/login');
                  }}
                  className="py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setShowDemoLoginModal(false);
                    navigate('/register');
                  }}
                  className="py-3 rounded-xl text-sm font-bold text-white border border-white/20 hover:bg-white/10 transition-colors"
                >
                  Register
                </button>
              </div>
              <button
                onClick={() => setShowDemoLoginModal(false)}
                className="mt-4 text-xs text-white/45 hover:text-white/75 transition-colors"
              >
                Continue walk-only demo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TabletMenu isOpen={showPhoneMenu} onClose={() => setShowPhoneMenu(false)} onAvatarChange={setAvatarPath} />
    </div>
  );
}
