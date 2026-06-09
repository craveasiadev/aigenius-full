/**
 * InteractiveTutorial — first-run walkthrough for the AIpreneur dashboard.
 *
 * Design language matches the rest of the AIpreneur app:
 *   • Glass card (frosted blur + subtle neutral border)
 *   • 3D plastic-key buttons (chunky bottom border, presses on tap)
 *   • Solid colours throughout — no gradients, no coloured glow shadows
 *   • Theme-aware via the global ThemeProvider
 *   • Full-screen modal with backdrop, blocks the dashboard underneath
 *
 * Visuals: small Three.js scene at the top of the card that swaps
 * between a Kenney mini-character (waving / idling) and a Kenney
 * commercial building model depending on the step. Steps focused on
 * the dashboard UI itself use clean DOM mock-ups instead.
 *
 * PWA: safe-area insets, ≥48-px tap targets, `touch-manipulation`,
 * locks body scroll while open.
 */
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Sparkles, Store, Megaphone,
  Lightbulb, Paintbrush, Cog, Heart, Coins, Zap, Gift, User,
  Rocket, Users, Sun,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { KenneyCharacter } from './iso/KenneyCharacter';
import { KenneyModel } from './iso/KenneyModel';
import {
  KENNEY_CHARACTERS, KENNEY_BUILDINGS_COMMERCIAL,
} from './iso/kenneyCatalog';
import {
  GLASS, ICON_TILE, BTN_3D_PRIMARY, BTN_3D_SECONDARY,
} from '../lib/uiTokens';

// ─────────────────────────────────────────────────────────────────────
// Step content. Each step picks a `visual` that the TutorialVisual
// component knows how to render. Keep copy short — kids will skim.
// ─────────────────────────────────────────────────────────────────────

type StepVisual =
  | { kind: 'character' }
  | { kind: 'building' }
  | { kind: 'hud' }
  | { kind: 'menu_button' }
  | { kind: 'modules' }
  | { kind: 'product' }
  | { kind: 'quick_actions' }
  | { kind: 'celebration' };

interface StepDef {
  id: string;
  title: (name: string) => string;
  body: string;
  cta: string;
  visual: StepVisual;
}

const STEPS: StepDef[] = [
  {
    id: 'welcome',
    title: (n) => `Hi ${n}! I'm Buddy`,
    body:
      "I'm your AI helper. I'll show you around your business simulator — it only takes a minute.",
    cta: "Let's go",
    visual: { kind: 'character' },
  },
  {
    id: 'shop',
    title: () => 'This is your shop',
    body:
      'A 3D shop you design yourself. Customers walk in, browse, and buy. The more they like it, the more it grows.',
    cta: 'Nice!',
    visual: { kind: 'building' },
  },
  {
    id: 'hud',
    title: () => 'Track your numbers',
    body:
      'AI Tokens to power AI actions, Popularity for how famous you are, Coins for sales, and Day for streaks. Glance up here any time.',
    cta: 'Got it',
    visual: { kind: 'hud' },
  },
  {
    id: 'menu',
    title: () => 'One button opens everything',
    body:
      'The bottom dock holds every module. Tap it to manage products, marketing, decor, and more.',
    cta: 'Cool',
    visual: { kind: 'menu_button' },
  },
  {
    id: 'modules',
    title: () => 'Six modules to grow your shop',
    body:
      'Each module teaches one part of running a real business. Spend AI Tokens to level them up.',
    cta: 'Show me',
    visual: { kind: 'modules' },
  },
  {
    id: 'product',
    title: () => 'Create products with AI',
    body:
      'Pick a category, write a sentence about your idea, and AI sketches a product you can edit + price.',
    cta: 'Sweet',
    visual: { kind: 'product' },
  },
  {
    id: 'quick_actions',
    title: () => 'Quick actions, anywhere',
    body:
      'Top-up tokens, check rewards, peek at other shops, edit your profile. All one tap away.',
    cta: 'Perfect',
    visual: { kind: 'quick_actions' },
  },
  {
    id: 'finish',
    title: (n) => `You're ready, ${n}!`,
    body:
      "Tap Let's Play to start. I'll pop back up any time you need a tip.",
    cta: "Let's play",
    visual: { kind: 'celebration' },
  },
];

// ─────────────────────────────────────────────────────────────────────
// Top-level component
// ─────────────────────────────────────────────────────────────────────

interface InteractiveTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  // Kept for backward compatibility — props the old version had. The
  // new tutorial doesn't condition on these, but the dashboard still
  // passes them.
  isShopGenerated?: boolean;
  hasProducts?: boolean;
  hasStaff?: boolean;
  onOpenControlCenter?: () => void;
  onCloseControlCenter?: () => void;
}

export function InteractiveTutorial({ isOpen, onClose }: InteractiveTutorialProps) {
  const { geniusProfile } = useGeniusAuth();
  const firstName = geniusProfile?.first_name || 'Friend';
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to step 0 each time the tutorial opens so re-entry always
  // starts fresh.
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  // Lock body scroll while open so the dashboard underneath can't
  // scroll behind the modal on mobile.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Keyboard nav — left/right arrows step through; Esc closes.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
      else if (e.key === 'ArrowLeft') setCurrentStep((s) => Math.max(0, s - 1));
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleNext = useCallback(() => {
    setCurrentStep((s) => {
      if (s >= STEPS.length - 1) {
        onClose();
        return s;
      }
      return s + 1;
    });
  }, [onClose]);

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1));
  }, []);

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — opaque enough to block the dashboard underneath
              + dark enough that the glass card pops. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md"
            aria-hidden
          />

          {/* Skip button — top-right, glass pill */}
          <motion.button
            type="button"
            onClick={onClose}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${GLASS} fixed z-[110] top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-transform touch-manipulation`}
            style={{
              top: 'max(env(safe-area-inset-top), 12px)',
              right: 'max(env(safe-area-inset-right), 12px)',
            }}
          >
            <X className="w-4 h-4" />
            Skip tutorial
          </motion.button>

          {/* Main card */}
          <div
            className="fixed inset-0 z-[105] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 60px)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className={`${GLASS} pointer-events-auto w-full max-w-md rounded-3xl overflow-hidden flex flex-col max-h-full`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="tutorial-title"
            >
              {/* Visual area — height capped so the text stays visible
                  on short phones. */}
              <div className="relative h-44 sm:h-56 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0"
                  >
                    <TutorialVisual visual={step.visual} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Copy + actions */}
              <div className="p-5 sm:p-6 flex-1 overflow-y-auto flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 id="tutorial-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {step.title(firstName)}
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.body}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Progress dots */}
                <div className="mt-5 flex items-center gap-1.5 justify-center">
                  {STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`block h-1.5 rounded-full transition-all ${
                        i === currentStep
                          ? 'w-8 bg-violet-600 dark:bg-violet-400'
                          : 'w-2 bg-slate-300 dark:bg-white/15'
                      }`}
                      aria-hidden
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="mt-5 flex items-center gap-3">
                  {!isFirst && (
                    <button
                      type="button"
                      onClick={handleBack}
                      aria-label="Back"
                      className={`${BTN_3D_SECONDARY} min-h-[52px] w-12 sm:w-14 px-0`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className={`${BTN_3D_PRIMARY} min-h-[52px] flex-1 px-5 text-base`}
                  >
                    {step.cta}
                    {isLast ? <Rocket className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {/* Step counter for sr / power users */}
                <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TutorialVisual — switches visuals per step. Three.js scenes for the
// "shop" + "character" + "celebration" steps; clean DOM mock-ups for
// the steps that explain the dashboard UI itself.
// ─────────────────────────────────────────────────────────────────────

function TutorialVisual({ visual }: { visual: StepVisual }) {
  switch (visual.kind) {
    case 'character':
      return <CharacterScene clip="wave" />;
    case 'building':
      return <BuildingScene />;
    case 'celebration':
      return <CharacterScene clip="duck" celebrating />;
    case 'hud':
      return <HudMockup />;
    case 'menu_button':
      return <MenuButtonMockup />;
    case 'modules':
      return <ModulesMockup />;
    case 'product':
      return <ProductMockup />;
    case 'quick_actions':
      return <QuickActionsMockup />;
  }
}

// ── Three.js scenes ────────────────────────────────────────────────

const ORBIT_LIGHTS = () => (
  <>
    <ambientLight intensity={0.6} />
    <directionalLight position={[4, 6, 4]} intensity={0.9} />
    <directionalLight position={[-3, 3, -3]} intensity={0.35} />
  </>
);

function CharacterScene({ clip = 'idle', celebrating = false }: { clip?: string; celebrating?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.4, 3.2], fov: 38 }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0.9, 0);
        camera.updateProjectionMatrix();
      }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ORBIT_LIGHTS />
        <Float speed={1.4} rotationIntensity={0.1} floatIntensity={0.3}>
          <KenneyCharacter
            path={KENNEY_CHARACTERS.femaleA}
            clip={clip}
            scale={1}
          />
        </Float>
        {celebrating && <ConfettiPoints />}
      </Suspense>
    </Canvas>
  );
}

function BuildingScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 2.2, 4.5], fov: 35 }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0.8, 0);
        camera.updateProjectionMatrix();
      }}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <ORBIT_LIGHTS />
        <SpinningBuilding />
      </Suspense>
    </Canvas>
  );
}

function SpinningBuilding() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group ref={ref}>
      <KenneyModel
        path={KENNEY_BUILDINGS_COMMERCIAL.a}
        scale={1.4}
        interactive={false}
      />
    </group>
  );
}

/** Cheap "confetti" — 30 little spheres falling, no physics, no
 *  shaders. Just enough to give the finish step a celebratory feel. */
function ConfettiPoints() {
  const groupRef = useRef<THREE.Group>(null);
  const colors = ['#f87171', '#facc15', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
  const items = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      x: (Math.random() - 0.5) * 4,
      y: 2.5 + Math.random() * 1.5,
      z: (Math.random() - 0.5) * 1.5,
      speed: 0.6 + Math.random() * 0.6,
      color: colors[i % colors.length],
      key: i,
    })),
  );
  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const item = items.current[i];
      item.y -= item.speed * dt;
      if (item.y < -0.5) item.y = 3;
      child.position.set(item.x, item.y, item.z);
      child.rotation.x += dt * 2;
    });
  });
  return (
    <group ref={groupRef}>
      {items.current.map((item) => (
        <mesh key={item.key} position={[item.x, item.y, item.z]}>
          <boxGeometry args={[0.08, 0.08, 0.08]} />
          <meshStandardMaterial color={item.color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── DOM mock-ups ───────────────────────────────────────────────────

function HudMockup() {
  const cards = [
    { Icon: Zap, label: 'Tokens', value: '250', tone: 'text-amber-500' },
    { Icon: Heart, label: 'Calm', value: '32', tone: 'text-pink-500' },
    { Icon: Coins, label: 'Coins', value: '1,200', tone: 'text-yellow-500' },
    { Icon: Sun, label: 'Day', value: '3', tone: 'text-sky-500' },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className={`${GLASS} rounded-2xl px-3 py-2 flex items-center gap-1.5 sm:gap-2.5`}>
        {cards.map(({ Icon, label, value, tone }, i) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm`}>
              <Icon className={`w-3.5 h-3.5 ${tone}`} />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[8px] uppercase font-bold text-slate-500 dark:text-slate-400">{label}</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{value}</span>
            </div>
            {i < cards.length - 1 && (
              <span className="w-px h-6 bg-slate-200 dark:bg-white/10 ml-1" aria-hidden />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuButtonMockup() {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-6">
      <div className={`${GLASS} rounded-3xl px-2 py-2 flex gap-1`}>
        {[Sparkles, Zap, Store, Gift, User].map((Icon, i) => (
          <button
            key={i}
            type="button"
            disabled
            className={`relative min-w-[44px] min-h-[44px] rounded-2xl flex flex-col items-center justify-center gap-0.5 ${
              i === 0
                ? 'bg-violet-600 text-white border-b-[3px] border-violet-800'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ModulesMockup() {
  const modules = [
    { Icon: Lightbulb, label: 'Product', tone: 'text-blue-500' },
    { Icon: Paintbrush, label: 'Decorate', tone: 'text-pink-500' },
    { Icon: Cog, label: 'Operate', tone: 'text-emerald-500' },
    { Icon: Megaphone, label: 'Market', tone: 'text-orange-500' },
    { Icon: Sparkles, label: 'Innovate', tone: 'text-violet-500' },
    { Icon: Heart, label: 'CSR', tone: 'text-rose-500' },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {modules.map(({ Icon, label, tone }) => (
          <div
            key={label}
            className={`${GLASS} rounded-2xl px-2.5 py-2 flex flex-col items-center text-center gap-1 w-[78px] sm:w-[92px]`}
          >
            <span className={ICON_TILE.replace('w-12 h-12', 'w-8 h-8')}>
              <Icon className={`w-4 h-4 ${tone}`} />
            </span>
            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className={`${GLASS} rounded-2xl p-4 flex items-center gap-3 max-w-xs`}>
        <span className={`${ICON_TILE} w-14 h-14 flex-shrink-0`}>
          <Lightbulb className="w-6 h-6 text-blue-500" />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-bold tracking-wider text-violet-600 dark:text-violet-300">
            AI-generated
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            Strawberry Boba
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 font-bold">
              RM 6
            </span>
            <span className="text-slate-500 dark:text-slate-400">+ 12 sold today</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionsMockup() {
  const actions = [
    { Icon: Coins, label: 'Finance', tone: 'text-yellow-500' },
    { Icon: Store, label: 'Store', tone: 'text-violet-500' },
    { Icon: User, label: 'Profile', tone: 'text-sky-500' },
    { Icon: Gift, label: 'Rewards', tone: 'text-rose-500' },
    { Icon: Users, label: 'Browse', tone: 'text-emerald-500' },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex gap-2 sm:gap-3">
        {actions.map(({ Icon, label, tone }) => (
          <div
            key={label}
            className={`${GLASS} rounded-2xl px-2 py-2 flex flex-col items-center gap-1`}
          >
            <span className={`${ICON_TILE} w-10 h-10`}>
              <Icon className={`w-5 h-5 ${tone}`} />
            </span>
            <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InteractiveTutorial;
