/**
 * AvatarWardrobe - Hero selection style avatar picker
 * Layout inspired by action RPG character select screens
 */
import { useState, useMemo, useRef, Suspense, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, ContactShadows } from '@react-three/drei';
import { clone as cloneWithSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { X, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react';
import { resolvePublicAssetUrl } from './assetPath';

// ============================================================================
// AVATAR DEFINITIONS
// ============================================================================
const AVATAR_LIST = [
  { id: 'casual', name: 'Casual', path: resolvePublicAssetUrl('assets/dassets/Casual Character.glb'), color: 'from-blue-400 to-cyan-500', previewScale: 1 },
  { id: 'adventurer', name: 'Adventurer', path: resolvePublicAssetUrl('assets/dassets/avatar/Adventurer.glb'), color: 'from-green-400 to-emerald-500', previewScale: 1 },
  { id: 'astronaut', name: 'Astronaut', path: resolvePublicAssetUrl('assets/dassets/avatar/Astronaut.glb'), color: 'from-indigo-400 to-purple-500', previewScale: 1 },
  { id: 'businessman', name: 'Business', path: resolvePublicAssetUrl('assets/dassets/avatar/Business Man.glb'), color: 'from-slate-400 to-gray-600', previewScale: 1 },
  { id: 'king', name: 'King', path: resolvePublicAssetUrl('assets/dassets/avatar/King.glb'), color: 'from-yellow-400 to-amber-500', previewScale: 1 },
  { id: 'swat', name: 'SWAT', path: resolvePublicAssetUrl('assets/dassets/avatar/SWAT.glb'), color: 'from-gray-500 to-slate-700', previewScale: 1 },
  { id: 'witch', name: 'Witch', path: resolvePublicAssetUrl('assets/dassets/avatar/Witch.glb'), color: 'from-purple-400 to-violet-600', previewScale: 1 },
  { id: 'worker', name: 'Worker', path: resolvePublicAssetUrl('assets/dassets/avatar/Worker.glb'), color: 'from-orange-400 to-red-500', previewScale: 1 },
  { id: 'woman1', name: 'Woman', path: resolvePublicAssetUrl('assets/dassets/avatar/Animated Woman.glb'), color: 'from-pink-400 to-rose-500', previewScale: 1 },
  { id: 'man', name: 'Man', path: resolvePublicAssetUrl('assets/dassets/avatar/Man.glb'), color: 'from-teal-400 to-cyan-600', previewScale: 0.75 },
];

// Storage key — scoped per user account
const AVATAR_STORAGE_KEY_PREFIX = 'wonderstar_avatar_id';

function getStorageKey(userId?: string | number | null): string {
  return userId ? `${AVATAR_STORAGE_KEY_PREFIX}_${userId}` : AVATAR_STORAGE_KEY_PREFIX;
}

export function getSelectedAvatarPath(userId?: string | number | null): string {
  if (typeof window === 'undefined') return AVATAR_LIST[0].path;
  const savedId = localStorage.getItem(getStorageKey(userId));
  const found = AVATAR_LIST.find(a => a.id === savedId);
  return found ? found.path : AVATAR_LIST[0].path;
}

export function getSelectedAvatarId(userId?: string | number | null): string {
  if (typeof window === 'undefined') return AVATAR_LIST[0].id;
  return localStorage.getItem(getStorageKey(userId)) || AVATAR_LIST[0].id;
}

// ============================================================================
// 3D AVATAR PREVIEW (spins on platform)
// ============================================================================
function AvatarPreview3D({ modelPath, previewScale = 1 }: { modelPath: string; previewScale?: number }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(modelPath);

  // Clone the scene for independent skeleton
  const cloned = useMemo(() => {
    const c = cloneWithSkeleton(scene);
    c.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  useEffect(() => {
    const idle = actions['CharacterArmature|Idle'] || Object.values(actions)[0];
    if (idle) idle.reset().play();
    return () => { mixer.stopAllAction(); };
  }, [actions, mixer]);

  // Slow auto-rotate
  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  // Use same scale as in-game (0.75) with per-avatar adjustment
  const finalScale = 0.75 * previewScale;

  return (
    <group ref={group}>
      <primitive object={cloned} scale={finalScale} position={[0, -1.0, 0]} />
    </group>
  );
}

// ============================================================================
// MAIN WARDROBE COMPONENT
// ============================================================================
interface AvatarWardrobeProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarChange: (avatarPath: string) => void;
  userId?: string | number | null;
}

export function AvatarWardrobe({ isOpen, onClose, onAvatarChange, userId }: AvatarWardrobeProps) {
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const savedId = getSelectedAvatarId(userId);
    const idx = AVATAR_LIST.findIndex(a => a.id === savedId);
    return idx >= 0 ? idx : 0;
  });
  const [confirmedIdx, setConfirmedIdx] = useState(selectedIdx);

  const selected = AVATAR_LIST[selectedIdx];

  const handleConfirm = useCallback(() => {
    const avatar = AVATAR_LIST[selectedIdx];
    localStorage.setItem(getStorageKey(userId), avatar.id);
    setConfirmedIdx(selectedIdx);
    onAvatarChange(avatar.path);
    onClose();
  }, [selectedIdx, onAvatarChange, onClose, userId]);

  const handlePrev = () => setSelectedIdx(i => (i - 1 + AVATAR_LIST.length) % AVATAR_LIST.length);
  const handleNext = () => setSelectedIdx(i => (i + 1) % AVATAR_LIST.length);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

        {/* Main Panel */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
        >
          <div className="bg-gradient-to-b from-[#0f1029] to-[#1a1040] rounded-3xl border border-violet-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <h2 className="text-white font-bold text-lg">Change Avatar</h2>
                <p className="text-violet-300/60 text-xs">Select your character</p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* 3D Preview Area */}
            <div className="relative h-72 sm:h-80 bg-gradient-to-b from-violet-900/20 to-transparent flex-shrink-0">
              {/* Platform glow */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-8 bg-violet-500/20 rounded-full blur-xl" />

              <Canvas
                camera={{ position: [0, 0.2, 2.2], fov: 45 }}
                className="touch-none"
              >
                <ambientLight intensity={1.5} />
                <directionalLight position={[3, 5, 3]} intensity={2} />
                <directionalLight position={[-3, 3, -3]} intensity={0.5} />
                <Suspense fallback={null}>
                  <AvatarPreview3D key={selected.id} modelPath={selected.path} previewScale={selected.previewScale} />
                  <ContactShadows position={[0, -1.05, 0]} opacity={0.4} scale={4} blur={2} />
                </Suspense>
                <OrbitControls
                  enableZoom={false}
                  enablePan={false}
                  minPolarAngle={Math.PI / 3}
                  maxPolarAngle={Math.PI / 2.2}
                  target={[0, 0, 0]}
                />
              </Canvas>

              {/* Name Badge */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-r ${selected.color} px-5 py-1.5 rounded-full shadow-lg`}
                >
                  <span className="text-white font-bold text-sm">{selected.name}</span>
                </motion.div>
              </div>

              {/* Nav arrows */}
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Avatar Grid (scrollable) */}
            <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_LIST.map((avatar, idx) => (
                  <motion.button
                    key={avatar.id}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedIdx(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      idx === selectedIdx
                        ? 'border-violet-400 shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/50'
                        : idx === confirmedIdx
                        ? 'border-green-400/50'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className={`w-full h-full bg-gradient-to-br ${avatar.color} flex items-center justify-center`}>
                      <span className="text-white font-bold text-[10px] sm:text-xs text-center leading-tight px-1">
                        {avatar.name}
                      </span>
                    </div>
                    {/* Currently equipped indicator */}
                    {idx === confirmedIdx && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    {/* Selection highlight */}
                    {idx === selectedIdx && (
                      <motion.div
                        layoutId="avatarSelect"
                        className="absolute inset-0 border-2 border-violet-400 rounded-xl"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-4 pb-4 pt-2 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setSelectedIdx(confirmedIdx)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 font-bold text-sm hover:bg-white/15 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
              <button
                onClick={handleConfirm}
                className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Equip Avatar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { AVATAR_LIST };
export default AvatarWardrobe;
