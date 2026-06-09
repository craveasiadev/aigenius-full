/**
 * My Online Store — AIpreneur design language.
 *
 * Real backend data only. Shows the student's:
 *   • Shop header (name, live/draft badge, View/Add/Share actions)
 *   • Stats grid: Revenue, Sales, Visitors, Products
 *   • Inventory grid (with Add New tile)
 *   • Share modal with link + WhatsApp/Facebook
 *   • Tutorial modal (first-visit)
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartBack, withFrom } from '../lib/smartBack';
import {
  Store, Package, Plus, ShoppingCart, DollarSign, Eye, ExternalLink,
  Copy, Check, Share2, HelpCircle, Lightbulb, Rocket, ArrowRight,
  TrendingUp, ArrowLeft, Sun, Moon, Loader2,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { businessApi } from '../services/aipreneurApi';
import { BottomNav } from '../components/BottomNav';
import { useTheme } from '../contexts/ThemeContext';
import { getAssetUrl } from '../lib/api';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, BTN_3D_PRIMARY_SM,
  FIELD, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

const tutorialSteps = [
  { id: 'welcome',  title: 'Welcome, Boss!',  description: 'This is your shop control panel. From here you run the whole business.',           tip: 'Check this page every day to see how your shop is doing.' },
  { id: 'products', title: 'Your Inventory',  description: 'See everything you’re selling. Add new products or edit existing ones any time.',  tip: 'Aim for at least 3 products to make your shop look full.' },
  { id: 'stats',    title: 'Power Stats',     description: 'Track revenue, sales, visitors, and product count at a glance.',                   tip: 'Growing numbers mean you’re doing great!' },
  { id: 'share',    title: 'Go Global',       description: 'Share your shop link with friends and family to get real visitors.',                tip: 'The more visits, the more chances to sell.' },
];

export const MyOnlineStorePage = () => {
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const { business, products, isLoading: dataLoading, loadBusiness } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();

  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShopUnavailableModal, setShowShopUnavailableModal] = useState(false);
  const [shopUnavailableReason, setShopUnavailableReason] = useState<'not_launched' | 'no_products' | 'no_slug' | null>(null);

  useEffect(() => {
    const completed = localStorage.getItem('store_tutorial_completed');
    if (!completed && products && products.length > 0) setShowTutorial(true);
  }, [products]);

  const completeTutorial = () => {
    localStorage.setItem('store_tutorial_completed', 'true');
    setShowTutorial(false);
  };
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) setTutorialStep(tutorialStep + 1);
    else completeTutorial();
  };

  const copyStoreLink = () => {
    const shopSlug = business?.shop_url_slug;
    if (shopSlug) {
      const url = `${window.location.origin}/shop/${shopSlug}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleViewPublicShop = async () => {
    const isLaunched = business?.shop_launched || false;
    const totalProducts = products?.length || 0;
    if (!isLaunched) {
      setShopUnavailableReason('not_launched');
      setShowShopUnavailableModal(true);
      return;
    }
    if (totalProducts === 0) {
      setShopUnavailableReason('no_products');
      setShowShopUnavailableModal(true);
      return;
    }
    if (business?.shop_url_slug) {
      window.open(`/shop/${business.shop_url_slug}`, '_blank');
      return;
    }
    try {
      const response = await businessApi.get();
      if (response.success && response.business?.shop_url_slug) {
        window.open(`/shop/${response.business.shop_url_slug}`, '_blank');
        await loadBusiness();
      } else {
        setShopUnavailableReason('no_slug');
        setShowShopUnavailableModal(true);
      }
    } catch (e) {
      console.error('Error fetching shop slug', e);
      setShopUnavailableReason('no_slug');
      setShowShopUnavailableModal(true);
    }
  };

  const isLoading = authLoading || dataLoading;
  const dark = theme === 'dark';

  if (isLoading) {
    return (
      <AppLoader
        title="Loading your shop…"
        icon={Store}
        hints={['Counting today\'s sales', 'Stocking the shelves', 'Almost ready']}
      />
    );
  }

  if (!geniusProfile) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${GLASS} rounded-3xl px-6 py-8 text-center max-w-sm w-full`}>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
              <Store className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to manage your shop
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base mt-4`}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shopName = geniusProfile?.aipreneur_shop_name || 'My Shop';
  const isLaunched = business?.shop_launched || false;
  const totalProducts = products?.length || 0;
  const totalRevenue = products?.reduce((s, p) => s + (Number(p.revenue_generated) || 0), 0) || 0;
  const totalSales = products?.reduce((s, p) => s + (Number(p.units_sold) || 0), 0) || 0;
  const totalVisitors = Number(business?.store_visitors) || 0;

  const stats = [
    { label: 'Revenue',  value: `RM ${totalRevenue.toFixed(0)}`, icon: DollarSign,   tone: 'bg-emerald-500 border-emerald-700' },
    { label: 'Sales',    value: totalSales,                      icon: ShoppingCart, tone: 'bg-blue-500 border-blue-700' },
    { label: 'Visitors', value: totalVisitors,                   icon: Eye,          tone: 'bg-violet-600 border-violet-800' },
    { label: 'Products', value: totalProducts,                   icon: Package,      tone: 'bg-amber-500 border-amber-700' },
  ];

  // ── Empty state ──────────────────────────────────────────────────
  if (totalProducts === 0) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <header
          className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
        >
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <button
              type="button"
              onClick={() => smartBack()}
              className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
            <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
              <Store className="w-5 h-5 text-violet-500 dark:text-violet-300" />
              My Shop
            </h1>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            >
              {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 pt-10 pb-32 text-center">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-600 border-b-[5px] border-violet-800 mx-auto mb-5">
            <Store className="w-10 h-10 text-white" />
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
            Your shop is empty
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs mx-auto mb-6">
            A shop with no products has nothing to sell. Let’s create your first one.
          </p>
          <button
            type="button"
            onClick={() => navigate('/s/aipreneur/product', withFrom(location))}
            className={`${BTN_3D_PRIMARY} min-h-[52px] px-6 text-base mx-auto`}
          >
            <Plus className="w-5 h-5" />
            Create First Product
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      {/* ── Header (sticky) ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => smartBack()}
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <Store className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            My Shop
          </h1>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-32">
        {/* ── Shop header card ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS} rounded-3xl p-5 mb-5`}
        >
          <div className="flex items-center gap-4 mb-5">
            <span className="w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 flex items-center justify-center shrink-0">
              <Store className="w-8 h-8 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">{shopName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={[
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                    isLaunched
                      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-400/30'
                      : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-400/30',
                  ].join(' ')}
                >
                  {isLaunched ? 'Live' : 'Draft'}
                </span>
                <button
                  type="button"
                  onClick={() => { setTutorialStep(0); setShowTutorial(true); }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Help
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => navigate('/s/aipreneur/product', withFrom(location))}
              className={`${BTN_3D_SECONDARY} min-h-[44px] px-3 text-sm`}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
            <button
              type="button"
              onClick={handleViewPublicShop}
              className={`${BTN_3D_PRIMARY} min-h-[44px] px-3 text-sm`}
            >
              <ExternalLink className="w-4 h-4" />
              Visit Shop
            </button>
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className={`${BTN_3D_SECONDARY} min-h-[44px] px-3 text-sm col-span-2 sm:col-span-1`}
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </motion.div>

        {/* ── Stats grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${GLASS} rounded-2xl p-4`}>
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-b-[3px] mb-2 ${s.tone}`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  {s.label}
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {s.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Inventory ───────────────────────────────────────────── */}
        <section>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white mb-3">
            <Package className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Inventory
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ y: -2 }}
                className={`${GLASS} rounded-2xl overflow-hidden group flex flex-col`}
              >
                <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                  {product.image_url ? (
                    <img
                      src={getAssetUrl(product.image_url)}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-extrabold text-white bg-slate-900/85 border-b-[2px] border-slate-950">
                    RM {Number(product.price).toFixed(0)}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {product.product_name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {product.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {product.units_sold || 0}
                      </span>
                      sold
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/s/aipreneur/product?edit=${product.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-300"
                    >
                      Edit
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add new card */}
            <button
              type="button"
              onClick={() => navigate('/s/aipreneur/product', withFrom(location))}
              className="rounded-2xl border-2 border-dashed border-violet-300 dark:border-violet-400/40 bg-violet-50/50 dark:bg-violet-500/5 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors flex flex-col items-center justify-center text-violet-600 dark:text-violet-300 min-h-[260px] gap-3"
            >
              <span className="w-14 h-14 rounded-2xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center">
                <Plus className="w-7 h-7 text-white" />
              </span>
              <span className="font-bold text-sm">Add New Product</span>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />

      {/* ── Tutorial Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className={`${GLASS} max-w-md w-full rounded-3xl p-6 text-center`}
            >
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
                <Lightbulb className="w-7 h-7 text-white" />
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                {tutorialSteps[tutorialStep].title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {tutorialSteps[tutorialStep].description}
              </p>

              <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/30 px-3 py-3 mt-4 mb-5 text-sm text-amber-700 dark:text-amber-300 text-left flex items-start gap-2">
                <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                {tutorialSteps[tutorialStep].tip}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={completeTutorial}
                  className="text-sm font-bold text-slate-500 dark:text-slate-400 px-2 py-2"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={nextTutorialStep}
                  className={`${BTN_3D_PRIMARY} min-h-[48px] px-6 text-sm`}
                >
                  {tutorialStep === tutorialSteps.length - 1 ? 'Got it!' : 'Next'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Shop Unavailable Modal ──────────────────────────────── */}
        {showShopUnavailableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowShopUnavailableModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className={`${GLASS} max-w-md w-full rounded-3xl p-6 text-center`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 border-b-[5px] border-amber-700 mb-3">
                {shopUnavailableReason === 'not_launched'
                  ? <Rocket className="w-8 h-8 text-white" />
                  : <Package className="w-8 h-8 text-white" />}
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
                {shopUnavailableReason === 'not_launched' ? 'Not launched yet' : 'Shop is empty'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
                {shopUnavailableReason === 'not_launched'
                  ? 'Finish setup and hit “Grand Opening” on the dashboard to go live.'
                  : 'You need at least one product before customers can visit your shop.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowShopUnavailableModal(false);
                  navigate(shopUnavailableReason === 'not_launched' ? '/s/aipreneur' : '/s/aipreneur/product');
                }}
                className={`${BTN_3D_PRIMARY} w-full min-h-[48px] px-6 text-base`}
              >
                {shopUnavailableReason === 'not_launched' ? 'Go to Dashboard' : 'Create Product'}
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Share Modal ─────────────────────────────────────────── */}
        {showShareModal && business?.shop_url_slug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 16, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className={`${GLASS} max-w-md w-full rounded-3xl p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">
                Share your shop
              </h3>
              <div className="flex gap-2 mb-4">
                <input
                  readOnly
                  value={`${window.location.origin}/shop/${business.shop_url_slug}`}
                  className={`${FIELD} flex-1 px-3 py-3 text-sm`}
                />
                <button
                  type="button"
                  onClick={copyStoreLink}
                  className={`${BTN_3D_PRIMARY_SM} w-12 justify-center`}
                  aria-label="Copy link"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.open(`https://wa.me/?text=Check out my shop! ${window.location.origin}/shop/${business.shop_url_slug}`, '_blank')}
                  className={`${BTN_3D_SECONDARY} min-h-[44px] px-3 text-sm`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.origin}/shop/${business.shop_url_slug}`, '_blank')}
                  className={`${BTN_3D_SECONDARY} min-h-[44px] px-3 text-sm`}
                >
                  Facebook
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyOnlineStorePage;
