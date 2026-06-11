/**
 * Manage Shop (Command Center) — AIpreneur design language.
 *
 * Real backend data only. Pulls from businessApi, productsApi, staffApi,
 * campaignsApi. The Simulate Order action calls the same
 * OrderSimulationService used in the dashboard.
 *
 * Layout:
 *   • Header: back, shop name, Visit Shop, theme toggle
 *   • 4-card hero stats (Profit, Visitors, Likes, Streak)
 *   • Quick actions row (Simulate / Marketing / Operations)
 *   • Recent orders (live)
 *   • Campaign performance
 *   • Team morale + per-staff mood rows
 *   • Product inventory preview
 *   • Social impact card (when a cause is set)
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartBack, withFrom } from '../lib/smartBack';
import {
  ArrowLeft, Store, TrendingUp, Users, Heart, DollarSign, Package,
  Eye, ShoppingCart, Sparkles, ExternalLink, Zap, Rocket, Activity,
  Sun, Moon, Loader2,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import {
  businessApi, productsApi, staffApi, campaignsApi,
} from '../services/aipreneurApi';
import { OrderSimulationService } from '../services/orderSimulationService';
import { Confetti } from '../components/Confetti';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import { getAssetUrl } from '../lib/api';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

interface ShopData {
  shop_name: string;
  shop_url_slug: string;
  shop_theme: string;
  shop_launched: boolean;
  total_sales: number;
  total_costs: number;
  total_profit: number;
  store_visitors: number;
  store_likes: number;
  staff_overall_mood: number;
  selected_cause: string | null;
  charity_percentage: number;
  total_donated: number;
  streak_days: number;
}

export const ManageShopPage = () => {
  const { geniusProfile } = useGeniusAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();

  const [loading, setLoading] = useState(true);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [simulatingOrder, setSimulatingOrder] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (geniusProfile) loadShopData();
  }, [geniusProfile]);

  const handleSimulateOrder = async () => {
    if (!geniusProfile || simulatingOrder) return;
    setSimulatingOrder(true);
    try {
      const result = await OrderSimulationService.generateOrderLocally();
      if (result.success && result.order) {
        const simulatedOrder = {
          id: `${Date.now()}`,
          customer_name: result.order.customer_name,
          order_total: result.order.order_total,
          fulfillment_status: 'processing',
          created_at: new Date().toISOString(),
        };
        setRecentOrders((prev) => [simulatedOrder, ...prev].slice(0, 5));
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    } catch (e) {
      console.error('Error simulating order:', e);
    } finally {
      setSimulatingOrder(false);
    }
  };

  const loadShopData = async () => {
    if (!geniusProfile) return;
    try {
      const [businessRes, productsRes, staffRes, campaignsRes] = await Promise.all([
        businessApi.get(),
        productsApi.getAll(),
        staffApi.getAll(),
        campaignsApi.getAll(),
      ]);
      if (businessRes.success) {
        setShopData({
          shop_name: geniusProfile.aipreneur_shop_name || 'My Shop',
          ...(businessRes.business as Record<string, any>),
        } as ShopData);
      }
      setProducts(productsRes.products || []);
      setStaff(staffRes.staff || []);
      setCampaigns(campaignsRes.campaigns || []);
    } catch (e) {
      console.error('Error loading shop data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!geniusProfile) return null;

  const dark = theme === 'dark';

  if (loading) {
    return (
      <AppLoader
        title="Loading shop HQ…"
        icon={Sparkles}
        hints={['Pulling orders', 'Checking the team', 'Almost ready']}
      />
    );
  }

  if (!shopData?.shop_launched) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${GLASS} rounded-3xl px-6 py-8 text-center max-w-md w-full`}>
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
              <Store className="w-10 h-10 text-white" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
              Shop not launched yet
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Finish the setup modules from the dashboard to launch your shop.
            </p>
            <button
              type="button"
              onClick={() => smartBack()}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const avgStaffMood = staff.length > 0
    ? Math.round(staff.reduce((sum, s) => sum + (s.mood || 0), 0) / staff.length)
    : 0;

  const heroStats = [
    { label: 'Total Profit', value: `RM ${shopData.total_profit.toFixed(0)}`, icon: DollarSign, tone: 'bg-emerald-500 border-emerald-700' },
    { label: 'Visitors',     value: shopData.store_visitors,                  icon: Eye,        tone: 'bg-sky-500 border-sky-700' },
    { label: 'Likes',        value: shopData.store_likes,                     icon: Heart,      tone: 'bg-rose-500 border-rose-700' },
    { label: 'Day Streak',   value: `${shopData.streak_days}d`,               icon: Zap,        tone: 'bg-amber-500 border-amber-700' },
  ];

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />
      {showConfetti && <Confetti />}

      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => smartBack()}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate flex-1 min-w-0">
            <Store className="w-5 h-5 text-violet-500 dark:text-violet-300 shrink-0" />
            <span className="truncate">{shopData.shop_name}</span>
          </h1>
          <a
            href={`/shop/${shopData.shop_url_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN_3D_SECONDARY} hidden sm:inline-flex min-h-[36px] px-3 text-xs`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
          >
            {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6 pb-32">
        {/* ── Hero stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {heroStats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`${GLASS} rounded-2xl p-4 text-center`}
              >
                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border-b-[3px] mb-2 ${s.tone}`}>
                  <Icon className="w-5 h-5 text-white" />
                </span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {s.value}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  {s.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left column ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleSimulateOrder}
                disabled={simulatingOrder}
                className={`${BTN_3D_PRIMARY} flex-col h-24 px-2 text-sm gap-1`}
              >
                {simulatingOrder
                  ? <Activity className="w-6 h-6 animate-spin" />
                  : <Sparkles className="w-6 h-6" />}
                <span className="text-xs">{simulatingOrder ? 'Simulating…' : 'Simulate Order'}</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/s/aipreneur/marketing', withFrom(location))}
                className={`${BTN_3D_SECONDARY} flex-col h-24 px-2 text-sm gap-1`}
              >
                <Rocket className="w-6 h-6 text-amber-500" />
                <span className="text-xs">New Campaign</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/s/aipreneur/operation', withFrom(location))}
                className={`${BTN_3D_SECONDARY} flex-col h-24 px-2 text-sm gap-1`}
              >
                <Users className="w-6 h-6 text-sky-500" />
                <span className="text-xs">Manage Staff</span>
              </button>
            </div>

            {/* Live orders */}
            <section className={`${GLASS} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-500" />
                  Live Orders
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              <div className="space-y-2">
                <AnimatePresence>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 16 }}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="w-9 h-9 rounded-full bg-violet-600 border-b-[3px] border-violet-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                            {order.customer_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{order.customer_name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400">RM {order.order_total.toFixed(2)}</p>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">{order.fulfillment_status}</p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold">No orders yet — try simulating one.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Campaign performance */}
            <section className={`${GLASS} rounded-2xl p-4`}>
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Campaign Performance
              </h2>
              {campaigns.length > 0 ? (
                <div className="space-y-2">
                  {campaigns.slice(0, 3).map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate min-w-0 flex-1">{c.campaign_name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                          Active
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <KV label="Reach"    value={c.reach} />
                        <KV label="Visitors" value={`+${c.new_visitors}`} tone="sky" />
                        <KV label="ROI"      value={`${c.roi}%`} tone="emerald" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No active campaigns. Launch one to boost sales.
                </p>
              )}
            </section>
          </div>

          {/* ── Right column ────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Team morale */}
            <section className={`${GLASS} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-500" />
                  Team Vibe
                </h2>
                <span className="font-extrabold text-rose-600 dark:text-rose-300 tabular-nums">{avgStaffMood}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${avgStaffMood}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="h-full bg-rose-500"
                />
              </div>
              <div className="space-y-2">
                {staff.slice(0, 4).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                        {(m.name?.charAt(0) || 'S').toUpperCase()}
                      </span>
                      <span className="font-bold text-sm capitalize text-slate-900 dark:text-white truncate">{m.staff_role}</span>
                    </div>
                    <span
                      className={[
                        'text-sm font-bold tabular-nums shrink-0',
                        m.mood > 70 ? 'text-emerald-600 dark:text-emerald-400'
                          : m.mood > 40 ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400',
                      ].join(' ')}
                    >
                      {m.mood}%
                    </span>
                  </div>
                ))}
                {staff.length === 0 && (
                  <p className="text-center py-2 text-sm text-slate-500 dark:text-slate-400">No staff yet.</p>
                )}
              </div>
            </section>

            {/* Inventory preview */}
            <section className={`${GLASS} rounded-2xl p-4 max-h-[400px] overflow-y-auto`}>
              <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3 sticky top-0 bg-white/80 dark:bg-slate-900/80 -mx-1 px-1 py-1">
                <Package className="w-4 h-4 text-sky-500" />
                Inventory
              </h2>
              <div className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-900 flex items-center justify-center shrink-0">
                        {p.image_url ? (
                          <img src={getAssetUrl(p.image_url)} alt={p.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.product_name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{p.positioning_strategy}</p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 shrink-0">RM {p.price}</span>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-center py-4 text-sm font-medium text-slate-500 dark:text-slate-400">No products. Go create some!</p>
                )}
              </div>
            </section>

            {/* Social impact */}
            {shopData.selected_cause && (
              <section className={`${GLASS} rounded-2xl p-5 text-center`}>
                <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500 border-b-[5px] border-rose-700 mx-auto mb-3">
                  <Heart className="w-7 h-7 text-white" />
                </span>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-bold">Impact Made</p>
                <p className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  RM {shopData.total_donated.toFixed(0)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Supporting <strong className="text-slate-900 dark:text-white capitalize">{shopData.selected_cause.replace(/_/g, ' ')}</strong>
                </p>
              </section>
            )}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

function KV({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'sky' | 'emerald' }) {
  const valueClass =
    tone === 'sky'     ? 'text-sky-600 dark:text-sky-400'
    : tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-slate-900 dark:text-white';
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 py-1.5">
      <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`font-bold text-sm ${valueClass}`}>{value}</p>
    </div>
  );
}

export default ManageShopPage;
