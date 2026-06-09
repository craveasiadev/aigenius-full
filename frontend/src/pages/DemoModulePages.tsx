/**
 * Interactive demo pages for the 6 game modules.
 *
 * Each page is a self-contained walkthrough that shows a visitor what
 * the corresponding live module on /s/aipreneur/* lets a student do —
 * but every action is bound to localStorage-backed demo slices in
 * `lib/demoState.ts`, never to the real `useAIpreneur` data layer.
 *
 * Routes (added in App.tsx):
 *   /demo/decorate    — wall / floor / furniture editor
 *   /demo/product     — pick a product idea, "AI-generate", add to demo shop
 *   /demo/operation   — hire pretend staff
 *   /demo/marketing   — run campaigns, watch popularity bump
 *   /demo/innovation  — research tech projects
 *   /demo/csr         — donate to causes
 *
 * Each page links back to `/demo` so the visitor returns to the iso
 * world (or to the globe hub if they navigated directly to a module).
 * No live API calls are made anywhere in this file.
 */
import { ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import {
  ArrowLeft, Plus, Trash2, RotateCcw, Sparkles, Lightbulb,
  Paintbrush, Cog, Megaphone, Heart, Lock, Star, Zap,
  TrendingUp, Coffee, ShoppingBag, Package, Wifi, Cpu,
  Users, BarChart3, Leaf, BookOpen, Stethoscope, Home,
  Coins, Calculator, Check,
} from 'lucide-react';
import {
  FLOOR_STYLES, FURNITURE_CATALOG, FURNITURE_CATEGORIES, WALL_COLORS,
  makeUid, type FloorStyle, type FurnitureCategory, type FurnitureId,
  type IsoInteriorLayout,
} from '../components/iso/interiorLayout';
import { IsoShopInterior } from '../components/iso/IsoShopInterior';
import { SHOPS } from '../components/iso/cityMap';
import {
  DEMO_CSR_EVENT, DEMO_FINANCE_EVENT, DEMO_INNOVATION_EVENT, DEMO_INTERIOR_EVENT,
  DEMO_MARKETING_EVENT, DEMO_PRODUCTS_EVENT, DEMO_STAFF_EVENT,
  getDemoCSR, getDemoFinance, getDemoInnovation, getDemoInterior, getDemoMarketing,
  getDemoProducts, getDemoStaff, resetDemoInterior, setDemoCSR, setDemoFinance,
  setDemoInnovation, setDemoInterior, setDemoMarketing,
  setDemoProducts, setDemoStaff,
  type DemoCampaign, type DemoCauseId, type DemoInnovationId,
  type DemoLedgerEntry, type DemoProduct, type DemoStaff,
} from '../lib/demoState';

// ── Shared shell ─────────────────────────────────────────────────────

interface DemoModuleShellProps {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string; // tailwind classes for the icon tile
  ctaLabel?: string;
  children: ReactNode;
}

function DemoModuleShell({
  title, subtitle, icon: Icon, accentClass, ctaLabel, children,
}: DemoModuleShellProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/demo"
            aria-label="Back to demo"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-md ${accentClass}`}>
            <Icon className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-base sm:text-lg leading-tight truncate">
              {title}
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight truncate">
              {subtitle}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5 pb-24">
        {children}

        <div className="pt-2">
          <div className="rounded-2xl bg-gradient-to-br from-violet-900/60 to-fuchsia-900/60 border border-violet-500/30 p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-violet-200" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold">Ready for the real thing?</p>
              <p className="text-[11px] text-slate-300 leading-tight">
                {ctaLabel || 'Sign up to play with the real module — AI tokens, leaderboard, the works.'}
              </p>
            </div>
            <Link
              to="/register"
              className="px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold shrink-0"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
      {children}
    </p>
  );
}

// ── Inline 3D preview ────────────────────────────────────────────────
//
// Renders the demo shop interior in an iso Canvas so the visitor can
// see their wall / floor / furniture choices land in 3D the moment
// they tap them. Read-only — no drag, no selection. The live
// DecorateModule uses the same `IsoShopInterior` component with the
// edit-mode controls on; this preview drops them for a calmer feel.

function DemoIsoPreview({ layout }: { layout: IsoInteriorLayout }) {
  const playerShop = useMemo(() => SHOPS.find((s) => s.isPlayer) ?? SHOPS[0], []);
  return (
    <Canvas
      orthographic
      // Pull the camera back a touch and angle it at 35° / 45° so the
      // whole room fits in the preview pane on phones too.
      camera={{ position: [12, 14, 12], zoom: 32, near: 0.1, far: 100 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      dpr={[0.75, 1.25]}
      frameloop="demand"
      onCreated={({ camera }) => camera.lookAt(0, 0.5, 0)}
    >
      <color attach="background" args={['#0f172a']} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#fff7d1', '#3a6b22', 0.4]} />
      <directionalLight position={[12, 18, 8]} intensity={1.0} color="#fff8e0" />
      <Suspense fallback={null}>
        <IsoShopInterior shop={playerShop} layout={layout} />
      </Suspense>
    </Canvas>
  );
}

// ════════════════════════════════════════════════════════════════════
// 1. DECORATE
// ════════════════════════════════════════════════════════════════════

export function DemoDecoratePage() {
  const [layout, setLayout] = useState<IsoInteriorLayout>(getDemoInterior);
  const [tab, setTab] = useState<FurnitureCategory>('seating');

  useEffect(() => {
    const refresh = () => setLayout(getDemoInterior());
    window.addEventListener(DEMO_INTERIOR_EVENT, refresh);
    return () => window.removeEventListener(DEMO_INTERIOR_EVENT, refresh);
  }, []);

  const commit = (next: IsoInteriorLayout) => {
    setLayout(next);
    setDemoInterior(next);
  };

  const addFurniture = (type: FurnitureId) => {
    const i = layout.items.length;
    const angle = (i % 12) * (Math.PI / 6);
    const radius = 1.2 + (i % 3) * 0.6;
    const x = Math.max(-5, Math.min(5, Math.cos(angle) * radius));
    const z = Math.max(-4, Math.min(4, Math.sin(angle) * radius));
    commit({ ...layout, items: [...layout.items, { uid: makeUid(), type, x, z, rot: 0 }] });
  };

  const palette = (Object.values(FURNITURE_CATALOG) as Array<typeof FURNITURE_CATALOG[FurnitureId]>)
    .filter((meta) => meta.category === tab);

  return (
    <DemoModuleShell
      title="Decorate Shop"
      subtitle={`${layout.items.length} pieces inside`}
      icon={Paintbrush}
      accentClass="bg-gradient-to-br from-pink-400 to-fuchsia-500"
      ctaLabel="Sign up to save your decorations and unlock 100+ furniture pieces."
    >
      {/* Live 3D preview — updates the moment you tap a swatch or
       *  add a piece. Same `IsoShopInterior` the live game uses, just
       *  in read-only mode. */}
      <section className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
        <div className="relative h-64 sm:h-80">
          <DemoIsoPreview layout={layout} />
          <div className="pointer-events-none absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/40 backdrop-blur text-[10px] uppercase tracking-wider font-bold text-white/80">
            Live preview
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Wall colour</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          {WALL_COLORS.map((c) => {
            const active = c.id === layout.wallColorId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => commit({ ...layout, wallColorId: c.id })}
                aria-label={c.name}
                className={[
                  'h-12 rounded-xl border-2 transition-all flex items-center justify-center',
                  active ? 'border-violet-400 scale-105 shadow-lg' : 'border-white/10 hover:border-white/30',
                ].join(' ')}
                style={{ background: c.hex }}
              >
                {active && <Star className="w-4 h-4 text-slate-900/70" fill="currentColor" />}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Floor style</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {FLOOR_STYLES.map((f) => {
            const active = f.id === layout.floorStyle;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => commit({ ...layout, floorStyle: f.id as FloorStyle })}
                className={[
                  'p-3 rounded-xl border-2 transition-all flex items-center gap-2 text-left',
                  active ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 hover:border-white/20',
                ].join(' ')}
              >
                <span className="w-7 h-7 rounded-md shrink-0" style={{ background: f.swatch }} />
                <span className="text-[11px] font-bold text-slate-200 truncate">{f.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Add furniture</SectionLabel>
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {FURNITURE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTab(cat.id)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
                cat.id === tab
                  ? 'bg-violet-500 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10',
              ].join(' ')}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {palette.map((meta) => (
            <button
              key={meta.id}
              type="button"
              onClick={() => addFurniture(meta.id)}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-2 text-left transition-colors"
            >
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </span>
              <span className="text-xs font-bold text-slate-200 truncate">{meta.name}</span>
            </button>
          ))}
        </div>
      </section>

      {layout.items.length > 0 && (
        <section>
          <SectionLabel>In your room ({layout.items.length})</SectionLabel>
          <ul className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5 max-h-64 overflow-y-auto">
            {layout.items.map((it) => {
              const meta = FURNITURE_CATALOG[it.type];
              return (
                <li key={it.uid} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200 truncate">
                    {meta?.name ?? it.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => commit({ ...layout, items: layout.items.filter((i) => i.uid !== it.uid) })}
                    aria-label="Remove"
                    className="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => setLayout(resetDemoInterior())}
        className="w-full min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold inline-flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Reset to default
      </button>
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 2. CREATE PRODUCT
// ════════════════════════════════════════════════════════════════════

const PRODUCT_IDEAS = [
  { emoji: '🧋', name: 'Brown Sugar Boba',  category: 'Drinks',  basePrice: 5 },
  { emoji: '🍪', name: 'Choco Chip Cookie',  category: 'Snacks',  basePrice: 3 },
  { emoji: '🍰', name: 'Strawberry Cake',    category: 'Bakery',  basePrice: 8 },
  { emoji: '🎨', name: 'Sticker Pack',       category: 'Stationery', basePrice: 4 },
  { emoji: '📚', name: 'Pop-Up Comic Zine',  category: 'Books',   basePrice: 6 },
  { emoji: '🧸', name: 'Plushie Charm',      category: 'Toys',    basePrice: 10 },
] as const;

export function DemoProductPage() {
  const [products, setProducts] = useState<DemoProduct[]>(getDemoProducts);
  const [generating, setGenerating] = useState<string | null>(null);
  // "Sparkle" overlay shown briefly after a successful generate.
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setProducts(getDemoProducts());
    window.addEventListener(DEMO_PRODUCTS_EVENT, refresh);
    return () => window.removeEventListener(DEMO_PRODUCTS_EVENT, refresh);
  }, []);

  const generate = (idea: typeof PRODUCT_IDEAS[number]) => {
    if (generating) return;
    setGenerating(idea.name);
    window.setTimeout(() => {
      const fresh: DemoProduct = {
        id: makeUid(),
        name: idea.name,
        emoji: idea.emoji,
        price: idea.basePrice + Math.floor(Math.random() * 4),
        category: idea.category,
      };
      const next = [fresh, ...products];
      setProducts(next);
      setDemoProducts(next);
      setGenerating(null);
      setJustAdded(fresh.id);
      window.setTimeout(() => setJustAdded(null), 1200);
    }, 850);
  };

  const remove = (id: string) => {
    const next = products.filter((p) => p.id !== id);
    setProducts(next);
    setDemoProducts(next);
  };

  const totalRevenue = products.reduce((sum, p) => sum + p.price, 0);

  return (
    <DemoModuleShell
      title="Product Studio"
      subtitle="Design + price your goods with AI"
      icon={Lightbulb}
      accentClass="bg-gradient-to-br from-blue-400 to-indigo-500"
      ctaLabel="Sign up to generate real AI product images + descriptions with your photos."
    >
      {/* Stat row — mirrors the live Product Studio's top dashboard. */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Products</p>
          <p className="text-2xl font-black mt-0.5">{products.length}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Catalog value</p>
          <p className="text-2xl font-black mt-0.5">${totalRevenue}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Avg price</p>
          <p className="text-2xl font-black mt-0.5">
            ${products.length ? Math.round(totalRevenue / products.length) : 0}
          </p>
        </div>
      </div>

      {/* Hero "AI generate" CTA card — sets the wizard mood without
       *  actually running a wizard. Tapping any idea below kicks off
       *  the mock generation. */}
      <section className="rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 p-4">
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-200">
              Step 1 · Pick an idea
            </p>
            <p className="text-sm text-slate-100 mt-1 leading-snug">
              We'll mock an AI-generated product card with name + price + an
              emoji stand-in for the photo. In the live game your phone camera
              kicks off a real AI image.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Product ideas</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRODUCT_IDEAS.map((idea) => {
            const busy = generating === idea.name;
            return (
              <button
                key={idea.name}
                type="button"
                disabled={!!generating}
                onClick={() => generate(idea)}
                className={[
                  'relative p-3 rounded-2xl border-2 text-center transition-all overflow-hidden',
                  busy
                    ? 'bg-blue-500/20 border-blue-400'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-blue-400/40',
                ].join(' ')}
              >
                <div className="text-4xl leading-none mb-1.5">{idea.emoji}</div>
                <p className="text-xs font-extrabold leading-tight">{idea.name}</p>
                <p className="text-[10px] text-slate-400">{idea.category} · ~${idea.basePrice}</p>
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30 backdrop-blur-sm">
                    <div className="text-center">
                      <Sparkles className="w-5 h-5 text-blue-200 animate-pulse mx-auto" />
                      <p className="text-[10px] text-blue-100 mt-1 font-extrabold">Generating…</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Your demo shop ({products.length})</SectionLabel>
        {products.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center text-xs text-slate-400">
            Pick an idea above to add your first demo product.
          </div>
        ) : (
          // 2-column grid of square cards — same shape as the live
          // Product Studio's product grid.
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {products.map((p) => {
              const sparkle = justAdded === p.id;
              return (
                <motion.div
                  key={p.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className={[
                    'relative aspect-square p-3 rounded-2xl border flex flex-col items-center justify-center text-center',
                    sparkle
                      ? 'bg-blue-500/20 border-blue-400'
                      : 'bg-white/5 border-white/10',
                  ].join(' ')}
                >
                  <span className="text-5xl">{p.emoji}</span>
                  <p className="text-xs font-extrabold mt-1.5 truncate w-full">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.category}</p>
                  <p className="text-sm font-black text-blue-300 mt-1">${p.price}</p>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    aria-label="Remove"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {sparkle && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0, 0.7, 0] }}
                      transition={{ duration: 1.2 }}
                    >
                      <Sparkles className="w-10 h-10 text-blue-300" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 3. OPERATIONS — hire staff
// ════════════════════════════════════════════════════════════════════

const STAFF_CANDIDATES: Array<{
  name: string; role: DemoStaff['role']; speed: number; friendliness: number; icon: typeof Coffee;
}> = [
  { name: 'Mia',  role: 'cashier', speed: 8, friendliness: 9, icon: ShoppingBag },
  { name: 'Leo',  role: 'barista', speed: 9, friendliness: 7, icon: Coffee },
  { name: 'Ava',  role: 'manager', speed: 6, friendliness: 8, icon: BarChart3 },
  { name: 'Theo', role: 'cleaner', speed: 7, friendliness: 6, icon: Package },
];

export function DemoOperationPage() {
  const [staff, setStaff] = useState<DemoStaff[]>(getDemoStaff);

  useEffect(() => {
    const refresh = () => setStaff(getDemoStaff());
    window.addEventListener(DEMO_STAFF_EVENT, refresh);
    return () => window.removeEventListener(DEMO_STAFF_EVENT, refresh);
  }, []);

  const hire = (c: typeof STAFF_CANDIDATES[number]) => {
    const fresh: DemoStaff = {
      id: makeUid(), name: c.name, role: c.role, speed: c.speed,
      friendliness: c.friendliness, morale: 80,
    };
    const next = [fresh, ...staff];
    setStaff(next);
    setDemoStaff(next);
  };

  const fire = (id: string) => {
    const next = staff.filter((s) => s.id !== id);
    setStaff(next);
    setDemoStaff(next);
  };

  return (
    <DemoModuleShell
      title="Operations"
      subtitle="Hire staff, keep the shop running"
      icon={Cog}
      accentClass="bg-gradient-to-br from-emerald-400 to-teal-500"
      ctaLabel="Sign up to manage real staff schedules + payroll."
    >
      <section>
        <SectionLabel>Available staff</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STAFF_CANDIDATES.map((c) => {
            const Icon = c.icon;
            const hired = staff.some((s) => s.name === c.name);
            return (
              <div
                key={c.name}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3"
              >
                <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {c.role} · spd {c.speed} · friend {c.friendliness}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={hired}
                  onClick={() => hire(c)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0',
                    hired
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-white',
                  ].join(' ')}
                >
                  {hired ? 'Hired' : 'Hire'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Your team ({staff.length})</SectionLabel>
        {staff.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-dashed border-white/15 text-center text-xs text-slate-400">
            Hire someone to start running your shop.
          </div>
        ) : (
          <ul className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
            {staff.map((s) => (
              <li key={s.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/40 to-teal-500/40 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-emerald-200" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{s.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize">{s.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fire(s.id)}
                    aria-label="Let go"
                    className="w-8 h-8 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                    style={{ width: `${s.morale}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">morale {s.morale}%</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 4. MARKETING
// ════════════════════════════════════════════════════════════════════

const CHANNELS: Array<{ id: DemoCampaign['channel']; label: string; cost: number; icon: typeof Megaphone }> = [
  { id: 'social',     label: 'Social Post',  cost: 20, icon: Sparkles },
  { id: 'billboard',  label: 'Billboard',    cost: 80, icon: TrendingUp },
  { id: 'influencer', label: 'Influencer',   cost: 50, icon: Star },
  { id: 'flyer',      label: 'Flyer',        cost: 10, icon: BookOpen },
];

const AUDIENCES: Array<{ id: DemoCampaign['audience']; label: string }> = [
  { id: 'kids',     label: 'Kids 6–9' },
  { id: 'teens',    label: 'Teens 10–14' },
  { id: 'families', label: 'Families' },
  { id: 'students', label: 'Students' },
];

export function DemoMarketingPage() {
  const [state, setState] = useState(getDemoMarketing);
  const [pickedChannel, setPickedChannel] = useState<DemoCampaign['channel']>('social');
  const [pickedAudience, setPickedAudience] = useState<DemoCampaign['audience']>('kids');

  useEffect(() => {
    const refresh = () => setState(getDemoMarketing());
    window.addEventListener(DEMO_MARKETING_EVENT, refresh);
    return () => window.removeEventListener(DEMO_MARKETING_EVENT, refresh);
  }, []);

  const run = () => {
    const channel = CHANNELS.find((c) => c.id === pickedChannel)!;
    const reach = channel.cost * 20 + Math.floor(Math.random() * 80);
    const fresh: DemoCampaign = {
      id: makeUid(), channel: pickedChannel, audience: pickedAudience,
      reach, startedAt: Date.now(),
    };
    const next = {
      campaigns: [fresh, ...state.campaigns].slice(0, 8),
      popularityBoost: state.popularityBoost + Math.ceil(reach / 200),
    };
    setState(next);
    setDemoMarketing(next);
  };

  return (
    <DemoModuleShell
      title="Marketing"
      subtitle="Run campaigns, grow popularity"
      icon={Megaphone}
      accentClass="bg-gradient-to-br from-orange-400 to-red-500"
      ctaLabel="Sign up to run real influencer + billboard campaigns."
    >
      <section className="rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-orange-200">
          Popularity boost
        </p>
        <p className="text-3xl font-black mt-0.5">+{state.popularityBoost}</p>
        <p className="text-[11px] text-orange-100/80 mt-1">
          {state.campaigns.length} campaigns in your demo history
        </p>
      </section>

      <section>
        <SectionLabel>1 · Channel</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {CHANNELS.map((c) => {
            const active = c.id === pickedChannel;
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setPickedChannel(c.id)}
                className={[
                  'p-3 rounded-2xl border-2 flex items-center gap-2 text-left transition-colors',
                  active
                    ? 'border-orange-400 bg-orange-500/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10',
                ].join(' ')}
              >
                <Icon className="w-5 h-5 text-orange-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-extrabold truncate">{c.label}</p>
                  <p className="text-[10px] text-slate-400">{c.cost} tokens</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>2 · Audience</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {AUDIENCES.map((a) => {
            const active = a.id === pickedAudience;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setPickedAudience(a.id)}
                className={[
                  'p-2.5 rounded-xl border-2 text-xs font-bold transition-colors',
                  active
                    ? 'border-orange-400 bg-orange-500/10 text-white'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300',
                ].join(' ')}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={run}
        className="w-full min-h-[48px] rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-md"
      >
        <Megaphone className="w-4 h-4" />
        Run campaign
      </button>

      {state.campaigns.length > 0 && (
        <section>
          <SectionLabel>Recent campaigns</SectionLabel>
          <ul className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5">
            {state.campaigns.map((c) => {
              const ch = CHANNELS.find((x) => x.id === c.channel);
              return (
                <li key={c.id} className="px-3 py-2 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center shrink-0">
                    {ch?.icon && <ch.icon className="w-4 h-4 text-orange-300" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{ch?.label} · {c.audience}</p>
                    <p className="text-[11px] text-slate-400">reach {c.reach.toLocaleString()}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 5. INNOVATION
// ════════════════════════════════════════════════════════════════════

const TECH: Array<{
  id: DemoInnovationId; name: string; tagline: string; cost: number; perk: string;
  icon: typeof Cpu;
  /** Tailwind gradient classes for the hero card, matching the live
   *  InnovationModule's neon palette. */
  gradient: string;
  border: string;
}> = [
  {
    id: 'ai_kiosk', name: 'AI Kiosk', tagline: 'Self-serve checkout',
    cost: 120, perk: '+15% checkout speed · −20% queue time', icon: Cpu,
    gradient: 'from-cyan-400 to-sky-500',
    border: 'border-cyan-400/60',
  },
  {
    id: 'smart_queue', name: 'Smart Queue', tagline: 'Display + alerts',
    cost: 80, perk: 'No queue rage · auto-notifies waiters', icon: Wifi,
    gradient: 'from-emerald-400 to-teal-500',
    border: 'border-emerald-400/60',
  },
  {
    id: 'targeting_ai', name: 'Targeting AI', tagline: 'Smarter ads',
    cost: 150, perk: '+20% campaign reach · audience auto-tune', icon: TrendingUp,
    gradient: 'from-amber-400 to-orange-500',
    border: 'border-amber-400/60',
  },
  {
    id: 'robo_cleaner', name: 'Robo-Cleaner', tagline: 'Always-on shine',
    cost: 60, perk: '24/7 spotless shop · saves staff hours', icon: Cog,
    gradient: 'from-fuchsia-400 to-pink-500',
    border: 'border-fuchsia-400/60',
  },
  {
    id: 'analytics_hub', name: 'Analytics Hub', tagline: 'Live dashboard',
    cost: 100, perk: 'Sales + traffic graphs · forecast tomorrow', icon: BarChart3,
    gradient: 'from-violet-400 to-purple-500',
    border: 'border-violet-400/60',
  },
];

// ── Innovation quiz bank ─────────────────────────────────────────────
// 4 multiple-choice questions, mirroring the live Innovation Lab's
// "solve a puzzle to unlock the tech" pattern. We pick one at random
// per unlock attempt. Wrong → swap to a different question + nudge.
interface QuizQuestion {
  q: string;
  options: string[];
  correctIdx: number;
  explain: string;
}
const INNOVATION_QUIZ: QuizQuestion[] = [
  {
    q: 'Which loop runs as long as a condition stays true?',
    options: ['for', 'while', 'switch', 'try'],
    correctIdx: 1,
    explain: '`while` keeps looping until the condition turns false.',
  },
  {
    q: 'What does an AI Kiosk do for a shop?',
    options: [
      'Cleans the floor',
      'Lets customers self-checkout',
      'Generates ads',
      'Trains the staff',
    ],
    correctIdx: 1,
    explain: 'A kiosk is a self-serve terminal — faster checkout for the customer.',
  },
  {
    q: 'Which of these is most useful for analysing sales trends?',
    options: ['Robotics', 'Analytics dashboard', 'Wallpaper', 'Lighting'],
    correctIdx: 1,
    explain: 'Dashboards visualise data so you can spot patterns.',
  },
  {
    q: 'A "smart queue" system is best at:',
    options: [
      'Cooking food',
      'Notifying waiting customers',
      'Designing logos',
      'Doing taxes',
    ],
    correctIdx: 1,
    explain: 'It manages waiting lists and sends alerts when it\'s their turn.',
  },
];

export function DemoInnovationPage() {
  const [state, setState] = useState(getDemoInnovation);
  // The quiz overlay state — when set, the page renders the quiz modal
  // and blocks immediate unlock. `wrongStreak` shows a fresh question
  // on a miss so the visitor doesn't memorise + click through.
  const [quiz, setQuiz] = useState<null | {
    techId: DemoInnovationId; question: QuizQuestion; result?: 'right' | 'wrong';
  }>(null);

  useEffect(() => {
    const refresh = () => setState(getDemoInnovation());
    window.addEventListener(DEMO_INNOVATION_EVENT, refresh);
    return () => window.removeEventListener(DEMO_INNOVATION_EVENT, refresh);
  }, []);

  const pickQuestion = (): QuizQuestion =>
    INNOVATION_QUIZ[Math.floor(Math.random() * INNOVATION_QUIZ.length)];

  const research = (id: DemoInnovationId) => {
    if (state.unlocked.includes(id)) return;
    // Open the puzzle modal — actual unlock only fires on a correct
    // answer in handleAnswer.
    setQuiz({ techId: id, question: pickQuestion() });
  };

  const handleAnswer = (idx: number) => {
    if (!quiz) return;
    if (idx === quiz.question.correctIdx) {
      setQuiz({ ...quiz, result: 'right' });
      const next = { unlocked: [...state.unlocked, quiz.techId] };
      setState(next);
      setDemoInnovation(next);
      window.setTimeout(() => setQuiz(null), 900);
    } else {
      setQuiz({ ...quiz, result: 'wrong' });
      window.setTimeout(() => setQuiz({ techId: quiz.techId, question: pickQuestion() }), 900);
    }
  };
  const lock = (id: DemoInnovationId) => {
    const next = { unlocked: state.unlocked.filter((x) => x !== id) };
    setState(next);
    setDemoInnovation(next);
  };

  const totalSpent = TECH
    .filter((t) => state.unlocked.includes(t.id))
    .reduce((sum, t) => sum + t.cost, 0);

  return (
    <DemoModuleShell
      title="Innovation Lab"
      subtitle="Research tech to boost your shop"
      icon={Sparkles}
      accentClass="bg-gradient-to-br from-violet-400 to-purple-500"
      ctaLabel="Sign up to unlock the real tech tree with research points + level-ups."
    >
      {/* Stats row — mirrors the live module's "Lab status" pills. */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Unlocked</p>
          <p className="text-2xl font-black mt-0.5">{state.unlocked.length}<span className="text-sm text-slate-500">/{TECH.length}</span></p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Spent</p>
          <p className="text-2xl font-black mt-0.5 inline-flex items-center justify-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />{totalSpent}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Level</p>
          <p className="text-2xl font-black mt-0.5">
            {state.unlocked.length === 0 ? 'Trainee' : state.unlocked.length < 3 ? 'Pro' : 'Master'}
          </p>
        </div>
      </div>

      {/* Hero tech cards — taller, gradient borders, matches the live
       *  Innovation Lab's 4px-border + cost-pill layout. */}
      <section>
        <SectionLabel>Tech projects</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TECH.map((t) => {
            const unlocked = state.unlocked.includes(t.id);
            const Icon = t.icon;
            return (
              <motion.div
                key={t.id}
                whileHover={{ y: -2 }}
                className={[
                  'relative rounded-2xl p-4 border-4 transition-all overflow-hidden',
                  unlocked ? t.border : 'border-white/10',
                  unlocked ? 'bg-white/5' : 'bg-white/[0.02]',
                ].join(' ')}
              >
                {/* Gradient bloom in corner — like the live cards. */}
                <div className={[
                  'absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl opacity-20 bg-gradient-to-br',
                  unlocked ? t.gradient : 'from-slate-700 to-slate-800',
                ].join(' ')} />
                {unlocked && (
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-widest font-black text-white bg-gradient-to-r ${t.gradient}`}>
                    Owned
                  </span>
                )}
                <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${t.gradient} shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </span>
                <h3 className="relative mt-3 text-lg font-extrabold">{t.name}</h3>
                <p className="relative text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                  {t.tagline}
                </p>
                <p className="relative text-xs text-slate-300 mt-1.5 leading-snug">
                  {t.perk}
                </p>
                <div className="relative mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-amber-300 font-extrabold">
                    <Zap className="w-4 h-4" />
                    <span className="text-lg">{t.cost}</span>
                    <span className="text-[10px] text-slate-400 ml-0.5">tokens</span>
                  </span>
                  {unlocked ? (
                    <button
                      type="button"
                      onClick={() => lock(t.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => research(t.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-md bg-gradient-to-r ${t.gradient} hover:brightness-110`}
                    >
                      Unlock now
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Unlock puzzle overlay ───────────────────────────────────
          Mirrors the live Innovation Lab's "solve to unlock" loop.
          Right answer triggers the actual state write; wrong answer
          swaps in a fresh question so the visitor can't brute-force. */}
      {quiz && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur"
          onClick={() => setQuiz(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-violet-500/40 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-violet-300 mb-1">
              Research puzzle
            </p>
            <h3 className="text-lg font-extrabold text-white">
              {quiz.question.q}
            </h3>
            <div className="mt-4 space-y-2">
              {quiz.question.options.map((opt, idx) => {
                const isCorrect = idx === quiz.question.correctIdx;
                const showRight = quiz.result === 'right' && isCorrect;
                const showWrong = quiz.result === 'wrong' && isCorrect;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={quiz.result !== undefined}
                    onClick={() => handleAnswer(idx)}
                    className={[
                      'w-full text-left px-4 py-3 rounded-xl border-2 transition-all text-sm font-bold',
                      showRight
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : showWrong
                          ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {quiz.result === 'wrong' && (
              <p className="mt-3 text-xs text-rose-300 text-center">
                Not quite — here's a new one.
              </p>
            )}
            {quiz.result === 'right' && (
              <p className="mt-3 text-xs text-emerald-300 text-center">
                {quiz.question.explain}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 6. CSR
// ════════════════════════════════════════════════════════════════════

const CAUSES: Array<{ id: DemoCauseId; name: string; icon: typeof Heart; tint: string }> = [
  { id: 'education',   name: 'Education',   icon: BookOpen,     tint: 'from-amber-400 to-orange-500' },
  { id: 'environment', name: 'Environment', icon: Leaf,         tint: 'from-emerald-400 to-green-500' },
  { id: 'health',      name: 'Health',      icon: Stethoscope,  tint: 'from-rose-400 to-pink-500' },
  { id: 'community',   name: 'Community',   icon: Home,         tint: 'from-sky-400 to-blue-500' },
];

const DONATION_TIERS = [10, 50, 100];

// CSR bonus memory-match — same shape as the live CSR module's
// `BONUS_PUZZLES` collection. 4 emoji pairs face-down; flip two at a
// time, match all four to bank a social-good bonus.
const MEMORY_EMOJI_POOL = ['🌱', '📚', '❤️', '🏥', '🤝', '🎓', '🌍', '🍎'];
type MemoryCard = { id: number; emoji: string; flipped: boolean; matched: boolean };

function buildMemoryDeck(): MemoryCard[] {
  const picks = [...MEMORY_EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, 4);
  const deck = picks.flatMap((emoji, i) => [
    { id: i * 2,     emoji, flipped: false, matched: false },
    { id: i * 2 + 1, emoji, flipped: false, matched: false },
  ]);
  return deck.sort(() => Math.random() - 0.5);
}

export function DemoCSRPage() {
  const [state, setState] = useState(getDemoCSR);
  // Bonus game state — opens when a donation is made. Memory match:
  // flip two cards, match → cards stay face-up, mismatch → flip back
  // after a beat. Clear all 4 pairs to bank a +5 social-good bonus.
  const [bonus, setBonus] = useState<null | {
    cause: DemoCauseId; amount: number; deck: MemoryCard[]; flipped: number[]; won: boolean;
  }>(null);

  useEffect(() => {
    const refresh = () => setState(getDemoCSR());
    window.addEventListener(DEMO_CSR_EVENT, refresh);
    return () => window.removeEventListener(DEMO_CSR_EVENT, refresh);
  }, []);

  const donate = (cause: DemoCauseId, amount: number) => {
    const byCause = { ...state.byCause, [cause]: (state.byCause[cause] ?? 0) + amount };
    const totalDonated = state.totalDonated + amount;
    const socialGoodScore = Math.min(100, Math.floor(totalDonated / 5));
    const next = { byCause, totalDonated, socialGoodScore };
    setState(next);
    setDemoCSR(next);
    // Launch the bonus puzzle. Solving it adds an extra +5 to social
    // good, mirroring the live module's "moral choice → puzzle →
    // donation multiplier" loop.
    setBonus({ cause, amount, deck: buildMemoryDeck(), flipped: [], won: false });
  };

  const handleCardFlip = (cardId: number) => {
    if (!bonus || bonus.won) return;
    const card = bonus.deck.find((c) => c.id === cardId);
    if (!card || card.matched || card.flipped) return;
    if (bonus.flipped.length >= 2) return;
    const nextDeck = bonus.deck.map((c) => c.id === cardId ? { ...c, flipped: true } : c);
    const nextFlipped = [...bonus.flipped, cardId];
    if (nextFlipped.length === 2) {
      const [aId, bId] = nextFlipped;
      const a = nextDeck.find((c) => c.id === aId)!;
      const b = nextDeck.find((c) => c.id === bId)!;
      if (a.emoji === b.emoji) {
        // Match → bake in immediately.
        const matchedDeck = nextDeck.map((c) =>
          c.id === aId || c.id === bId ? { ...c, matched: true } : c,
        );
        const allMatched = matchedDeck.every((c) => c.matched);
        if (allMatched) {
          const bonusScore = Math.min(100, state.socialGoodScore + 5);
          const fresh = { ...state, socialGoodScore: bonusScore };
          setState(fresh);
          setDemoCSR(fresh);
          setBonus({ ...bonus, deck: matchedDeck, flipped: [], won: true });
        } else {
          setBonus({ ...bonus, deck: matchedDeck, flipped: [] });
        }
      } else {
        // Miss → flip both back after a beat.
        setBonus({ ...bonus, deck: nextDeck, flipped: nextFlipped });
        window.setTimeout(() => {
          setBonus((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              deck: prev.deck.map((c) =>
                c.id === aId || c.id === bId ? { ...c, flipped: false } : c,
              ),
              flipped: [],
            };
          });
        }, 700);
      }
    } else {
      setBonus({ ...bonus, deck: nextDeck, flipped: nextFlipped });
    }
  };

  return (
    <DemoModuleShell
      title="CSR"
      subtitle="Donate to causes, earn community trust"
      icon={Heart}
      accentClass="bg-gradient-to-br from-rose-400 to-pink-500"
      ctaLabel="Sign up to make real CSR commitments and unlock community badges."
    >
      <section className="rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 p-4">
        <p className="text-[10px] uppercase tracking-wider font-bold text-rose-200">
          Social good
        </p>
        <p className="text-3xl font-black mt-0.5">{state.socialGoodScore}/100</p>
        <p className="text-[11px] text-rose-100/80 mt-1">
          ${state.totalDonated} donated across {Object.keys(state.byCause).length} cause{Object.keys(state.byCause).length === 1 ? '' : 's'}
        </p>
        <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={false}
            animate={{ width: `${state.socialGoodScore}%` }}
            transition={{ type: 'spring', damping: 22 }}
            className="h-full bg-gradient-to-r from-rose-400 to-pink-300"
          />
        </div>
      </section>

      <section className="space-y-2">
        {CAUSES.map((c) => {
          const Icon = c.icon;
          const totalThis = state.byCause[c.id] ?? 0;
          return (
            <div key={c.id} className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.tint} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{c.name}</p>
                  <p className="text-[11px] text-slate-400">
                    ${totalThis} donated to this cause
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DONATION_TIERS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => donate(c.id, amount)}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold inline-flex items-center justify-center gap-1"
                  >
                    <Heart className="w-3 h-3 text-rose-300" />
                    ${amount}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── Bonus memory-match puzzle ──────────────────────────────
          Mirrors the live CSR module's bonus puzzle gate. Solve to
          add +5 to social-good on top of the donation effect. */}
      {bonus && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur"
          onClick={() => setBonus(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-rose-500/40 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-rose-300 mb-1">
              Bonus puzzle · match the pairs
            </p>
            <h3 className="text-base font-extrabold text-white">
              {bonus.won ? 'Sweet! +5 social good' : 'Flip cards to find 4 pairs'}
            </h3>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {bonus.deck.map((card) => {
                const face = card.flipped || card.matched;
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={face || bonus.won}
                    onClick={() => handleCardFlip(card.id)}
                    className={[
                      'aspect-square rounded-xl text-2xl font-extrabold transition-all',
                      face
                        ? card.matched
                          ? 'bg-emerald-500/25 border-2 border-emerald-400'
                          : 'bg-white/10 border-2 border-white/20'
                        : 'bg-gradient-to-br from-rose-500 to-pink-500 hover:brightness-110 border-2 border-rose-300/30 text-white/30',
                    ].join(' ')}
                  >
                    {face ? card.emoji : '?'}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setBonus(null)}
              className="mt-4 w-full min-h-[40px] rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
            >
              {bonus.won ? 'Close' : 'Skip puzzle'}
            </button>
          </motion.div>
        </div>
      )}
    </DemoModuleShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// 7. FINANCE — vault + today's report + math game + chart
// ════════════════════════════════════════════════════════════════════

interface MathPuzzle {
  prompt: string;
  prices: number[];
  correct: number;
  options: number[];
}

function buildMathPuzzle(): MathPuzzle {
  // Three random prices between 3 and 19 — what's the total?
  const prices = Array.from({ length: 3 }, () => 3 + Math.floor(Math.random() * 17));
  const correct = prices.reduce((s, p) => s + p, 0);
  // Three plausible-but-wrong distractors near the correct answer.
  const distractorPool = new Set<number>();
  while (distractorPool.size < 3) {
    const offset = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 6));
    const cand = correct + offset;
    if (cand !== correct && cand > 0) distractorPool.add(cand);
  }
  const options = [correct, ...Array.from(distractorPool)].sort(() => Math.random() - 0.5);
  return {
    prompt: 'A customer buys three items. What\'s the total?',
    prices, correct, options,
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function DemoFinancePage() {
  const [state, setState] = useState(getDemoFinance);
  const [math, setMath] = useState<null | { puzzle: MathPuzzle; result?: 'right' | 'wrong' }>(null);

  useEffect(() => {
    const refresh = () => setState(getDemoFinance());
    window.addEventListener(DEMO_FINANCE_EVENT, refresh);
    return () => window.removeEventListener(DEMO_FINANCE_EVENT, refresh);
  }, []);

  // Auto-roll the day stamp so the today's report resets at midnight.
  useEffect(() => {
    const today = todayKey();
    if (state.dayStamp !== today) {
      // Push yesterday's revenue into the 7-day chart and zero out today.
      const nextWeekly = [...state.weeklyRevenue.slice(-6), state.todayRevenue];
      const next: typeof state = {
        ...state,
        dayStamp: today,
        todayRevenue: 0, todayVisitors: 0, todayProfit: 0, todaySales: 0,
        weeklyRevenue: nextWeekly,
      };
      setState(next);
      setDemoFinance(next);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordSale = () => {
    // Synthesise a single random sale to bump the dashboard numbers.
    const revenue = 5 + Math.floor(Math.random() * 24);
    const profit = Math.floor(revenue * 0.45);
    const visitors = 1 + Math.floor(Math.random() * 3);
    const emojiPool = ['🧋', '🍪', '🍰', '🎨', '📚', '🧸'];
    const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)];
    const entry: DemoLedgerEntry = {
      id: makeUid(), emoji, label: 'Sale', amount: revenue, ts: Date.now(),
    };
    const next: typeof state = {
      ...state,
      balance: state.balance + profit,
      todayRevenue: state.todayRevenue + revenue,
      todayVisitors: state.todayVisitors + visitors,
      todayProfit: state.todayProfit + profit,
      todaySales: state.todaySales + 1,
      totalRevenue: state.totalRevenue + revenue,
      totalProfit: state.totalProfit + profit,
      totalVisitors: state.totalVisitors + visitors,
      ledger: [entry, ...state.ledger].slice(0, 20),
    };
    setState(next);
    setDemoFinance(next);
  };

  const startMathGame = () => {
    setMath({ puzzle: buildMathPuzzle() });
  };

  const answerMath = (value: number) => {
    if (!math) return;
    if (value === math.puzzle.correct) {
      setMath({ ...math, result: 'right' });
      const reward = 25;
      const entry: DemoLedgerEntry = {
        id: makeUid(), emoji: '🧮', label: 'Math game win', amount: reward, ts: Date.now(),
      };
      const next: typeof state = {
        ...state,
        balance: state.balance + reward,
        mathGameLastPlayed: todayKey(),
        ledger: [entry, ...state.ledger].slice(0, 20),
      };
      setState(next);
      setDemoFinance(next);
      window.setTimeout(() => setMath(null), 1200);
    } else {
      setMath({ ...math, result: 'wrong' });
      window.setTimeout(() => setMath({ puzzle: buildMathPuzzle() }), 900);
    }
  };

  const playedToday = state.mathGameLastPlayed === todayKey();
  const maxWeekly = Math.max(1, ...state.weeklyRevenue);

  return (
    <DemoModuleShell
      title="My Vault"
      subtitle="Track sales, profits, and play math challenges"
      icon={Coins}
      accentClass="bg-gradient-to-br from-amber-400 to-orange-500"
      ctaLabel="Sign up to bank real profit coins and unlock daily math games."
    >
      {/* Main balance — mirrors the live FinancePage's hero orange card. */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 shadow-xl shadow-orange-500/30 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-5 h-5" />
          <p className="text-xs font-semibold opacity-90 uppercase tracking-wider">
            Profit coins
          </p>
        </div>
        <p className="text-5xl font-black tabular-nums">{state.balance.toLocaleString()}</p>
        <p className="text-xs text-white/85 mt-1">
          Banked from {state.todaySales} sale{state.todaySales === 1 ? '' : 's'} today
        </p>
      </section>

      {/* Today's report — 4 stat cards. */}
      <section>
        <SectionLabel>Today's report</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={TrendingUp} label="Revenue" value={`$${state.todayRevenue}`} tint="emerald" />
          <StatTile icon={Users} label="Visitors" value={state.todayVisitors} tint="cyan" />
          <StatTile icon={Coins} label="Profit" value={`$${state.todayProfit}`} tint="amber" />
          <StatTile icon={ShoppingBag} label="Sales" value={state.todaySales} tint="violet" />
        </div>
        <button
          type="button"
          onClick={recordSale}
          className="mt-2 w-full min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          Simulate a sale
        </button>
      </section>

      {/* Math mini-game — same daily-play cadence as live ShopMathGames. */}
      <section className="rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/30 p-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow shrink-0">
            <Calculator className="w-5 h-5 text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold">Cashier Challenge</p>
            <p className="text-[11px] text-slate-300 leading-tight">
              Solve a quick add-up to bank a +25 coin bonus. One game per day in
              the real app — demo lets you replay.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={startMathGame}
          className="mt-3 w-full min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2"
        >
          {playedToday ? 'Play again' : 'Start math game'}
          <Calculator className="w-4 h-4" />
        </button>
      </section>

      {/* Weekly bar chart — custom DOM, same shape as live FinancePage. */}
      <section>
        <SectionLabel>Weekly revenue</SectionLabel>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-end gap-1.5 h-32">
            {state.weeklyRevenue.map((v, i) => {
              const pct = (v / maxWeekly) * 100;
              const isToday = i === state.weeklyRevenue.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(2, pct)}%` }}
                      transition={{ delay: i * 0.05, type: 'spring', damping: 22 }}
                      className={[
                        'w-full rounded-t-md',
                        isToday
                          ? 'bg-gradient-to-t from-amber-400 to-orange-500'
                          : 'bg-white/15',
                      ].join(' ')}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500">
                    {i === state.weeklyRevenue.length - 1 ? 'Today' : `D-${state.weeklyRevenue.length - 1 - i}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ledger — recent transactions, mirrors the live Transactions tab. */}
      {state.ledger.length > 0 && (
        <section>
          <SectionLabel>Recent transactions ({state.ledger.length})</SectionLabel>
          <ul className="rounded-2xl bg-white/5 border border-white/10 divide-y divide-white/5 max-h-64 overflow-y-auto">
            {state.ledger.map((e) => (
              <li key={e.id} className="px-3 py-2 flex items-center gap-3">
                <span className="text-xl">{e.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{e.label}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(e.ts).toLocaleTimeString(undefined, {
                      hour: 'numeric', minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={[
                  'text-sm font-extrabold tabular-nums',
                  e.amount >= 0 ? 'text-emerald-300' : 'text-rose-300',
                ].join(' ')}>
                  {e.amount >= 0 ? '+' : ''}${Math.abs(e.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* All-time roll-up. */}
      <section>
        <SectionLabel>All-time</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          <StatTile icon={TrendingUp} label="Revenue" value={`$${state.totalRevenue}`} tint="emerald" />
          <StatTile icon={Coins} label="Profit" value={`$${state.totalProfit}`} tint="amber" />
          <StatTile icon={Users} label="Visitors" value={state.totalVisitors} tint="cyan" />
        </div>
      </section>

      {/* Math game overlay */}
      {math && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-slate-950/85 backdrop-blur"
          onClick={() => setMath(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-cyan-300 mb-1">
              Cashier challenge · +25 on win
            </p>
            <h3 className="text-base font-extrabold text-white mb-3">
              {math.puzzle.prompt}
            </h3>
            <div className="rounded-xl bg-slate-950/60 border border-white/10 p-3 mb-4">
              {math.puzzle.prices.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm font-mono">
                  <span className="text-slate-400">Item {i + 1}</span>
                  <span className="text-white tabular-nums">${p}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-sm font-mono">
                <span className="text-cyan-300">Total</span>
                <span className="text-cyan-200 tabular-nums">?</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {math.puzzle.options.map((opt) => {
                const isCorrect = opt === math.puzzle.correct;
                const right = math.result === 'right' && isCorrect;
                const wrong = math.result === 'wrong' && isCorrect;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={math.result !== undefined}
                    onClick={() => answerMath(opt)}
                    className={[
                      'min-h-[48px] rounded-xl border-2 text-base font-extrabold tabular-nums transition-all',
                      right
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100'
                        : wrong
                          ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                          : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-100',
                    ].join(' ')}
                  >
                    ${opt}
                  </button>
                );
              })}
            </div>
            {math.result === 'right' && (
              <p className="mt-3 text-xs text-emerald-300 text-center inline-flex items-center justify-center gap-1 w-full">
                <Check className="w-3.5 h-3.5" />
                +25 banked
              </p>
            )}
            {math.result === 'wrong' && (
              <p className="mt-3 text-xs text-rose-300 text-center">
                Not quite — try this one.
              </p>
            )}
          </motion.div>
        </div>
      )}
    </DemoModuleShell>
  );
}

// ── StatTile helper ───────────────────────────────────────────────────
function StatTile({
  icon: Icon, label, value, tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tint: 'emerald' | 'cyan' | 'amber' | 'violet';
}) {
  const tintMap = {
    emerald: 'text-emerald-300 bg-emerald-500/15',
    cyan:    'text-cyan-300 bg-cyan-500/15',
    amber:   'text-amber-300 bg-amber-500/15',
    violet:  'text-violet-300 bg-violet-500/15',
  } as const;
  return (
    <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tintMap[tint]}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
        <p className="text-lg font-black tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}
