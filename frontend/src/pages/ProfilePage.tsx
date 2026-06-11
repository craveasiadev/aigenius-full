/**
 * Profile page — AIpreneur design language.
 *
 * Real backend data only (no dummy). Shows the student's:
 *   • Genius name + level + streak (header card)
 *   • 4 stat tiles: Level / Tokens / Progress / Products
 *   • Boss selfie + bare shop image (downloadable)
 *   • Business stats (profit, sales, products, staff)
 *   • Menu rows for Rewards, Token history, Analytics, Settings
 *   • Quick actions: Top up tokens, Redeem rewards
 *   • Theme toggle in the header, logout pill on the right
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background). No
 * gradient surfaces, no coloured glow shadows.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut, Download, Loader2, Trophy, Star, TrendingUp, Package,
  ChevronRight, ArrowLeft, Flame, Coins, Zap, Sparkles,
  BarChart3, Settings, Gift, Sun, Moon, ShoppingBag,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartBack, withFrom } from '../lib/smartBack';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import {
  GLASS, GLASS_HOVER, ICON_TILE, BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { getAssetUrl, getShopImageUrl } from '../lib/api';
import { AppLoader } from '../components/ui/AppLoader';

export const ProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const smartBack = useSmartBack();
  const { geniusProfile, logout, isLoading: authLoading } = useGeniusAuth();
  const { business, rewards, overallProgress, isLoading: dataLoading } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const [downloading, setDownloading] = useState<string | null>(null);

  const isLoading = authLoading || dataLoading;

  // ── Loading state ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLoader
        title="Loading your profile…"
        hints={['Reading your stats', 'Polishing your avatar', 'Almost ready']}
      />
    );
  }

  // ── Auth gate ───────────────────────────────────────────────────
  if (!geniusProfile) {
    return (
      <div className={PAGE}>
        <StarfieldBackground /><DottedBackground />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className={`${GLASS} rounded-3xl px-6 py-8 text-center max-w-sm w-full`}>
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 mb-3">
              <Trophy className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to view your profile
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Your stats, shop images, and progress all live here.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base`}
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived stats (all from backend, no dummies) ────────────────
  const currentAiTokens = rewards?.ai_tokens ?? 0;
  const currentLevel = rewards?.level ?? 1;
  const currentStreak = rewards?.current_streak ?? 0;
  const totalSales = Number(business?.total_sales) || 0;
  const totalProfit = Number(business?.total_profit) || 0;
  const productsCount = business?.products?.length ?? 0;
  const staffCount = business?.staff?.length ?? 0;
  const popularityLevel = Math.max(1, business?.popularity_level ?? 1);

  const stats = [
    { Icon: Trophy, label: 'Level',    value: currentLevel,                tone: 'text-amber-500' },
    { Icon: Zap,    label: 'Tokens',   value: currentAiTokens.toLocaleString(), tone: 'text-orange-500' },
    { Icon: TrendingUp, label: 'Progress', value: `${overallProgress ?? 0}%`, tone: 'text-emerald-500' },
    { Icon: Package, label: 'Products', value: productsCount,              tone: 'text-blue-500' },
  ];

  const menuItems = [
    { id: 'rewards',   name: 'Rewards & achievements', Icon: Gift,       tone: 'text-pink-500',    path: '/s/aipreneur/rewards' },
    { id: 'tokens',    name: 'Token history',           Icon: Coins,      tone: 'text-amber-500',   path: '/s/aipreneur/tokens' },
    { id: 'analytics', name: 'Shop analytics',          Icon: BarChart3,  tone: 'text-sky-500',     path: '/s/aipreneur/analytics' },
    { id: 'settings',  name: 'Settings',                Icon: Settings,   tone: 'text-slate-500',   path: '/s/settings' },
  ];

  const shopImages: Array<{
    type: 'shop' | 'scene';
    url: string;
    title: string;
    subtitle: string;
  }> = [];

  // Use getShopImageUrl (not getAssetUrl) so backend `/storage/shops/...`
  // URLs get rewritten to the `/aipreneur/shop-image/...` controller
  // endpoint. The controller serves with CORS + cache headers required
  // by the Capacitor WebView's <img> loader; without the rewrite the
  // images stay broken inside the APK while working in dev.
  const sceneUrl = getShopImageUrl(business?.shop_scene_image_url);
  const shopUrl = getShopImageUrl(business?.shop_image_url);
  if (sceneUrl) {
    shopImages.push({
      type: 'scene',
      url: sceneUrl,
      title: 'Boss + shop',
      subtitle: 'Your selfie standing with your AI-generated shop',
    });
  }
  if (shopUrl) {
    shopImages.push({
      type: 'shop',
      url: shopUrl,
      title: 'Shop only',
      subtitle: 'The AI-generated shop exterior',
    });
  }

  const handleDownload = async (imageUrl: string, type: 'shop' | 'scene') => {
    if (!imageUrl) return;
    setDownloading(type);
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `my-shop-${type}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      {/* Top bar — back / theme toggle / logout */}
      <div
        className="relative z-10 px-3 sm:px-4 pt-3 sm:pt-4 flex items-center justify-between gap-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <button
          type="button"
          onClick={() => smartBack()}
          aria-label="Back"
          className={`${GLASS} min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-slate-700 dark:text-slate-200 active:scale-95 transition-transform touch-manipulation`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors touch-manipulation"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={dark ? 'moon' : 'sun'}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                {dark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </motion.span>
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={logout}
            className="min-h-[40px] px-3 inline-flex items-center gap-1.5 rounded-full text-sm font-bold text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25 active:scale-95 transition-all touch-manipulation"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="relative z-10 px-4 pt-4 pb-28 max-w-md mx-auto space-y-5">
        {/* ── Profile header card ──────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`${GLASS} rounded-3xl p-5 sm:p-6`}
        >
          {/* Avatar — solid violet square with first letter; 3D-bordered */}
          <div className="flex flex-col items-center w-full min-w-0">
            <span className="w-20 h-20 rounded-2xl bg-violet-600 border-b-[5px] border-violet-800 flex items-center justify-center text-white text-4xl font-extrabold uppercase">
              {geniusProfile?.genius_name?.[0] ?? 'P'}
            </span>

            <h1 className="mt-3 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-full truncate text-center">
              {geniusProfile?.genius_name}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {geniusProfile?.first_name ?? ''} · Aipreneur
            </p>

            {/* Level + streak pills */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-200 text-xs font-bold">
                <Star className="w-3.5 h-3.5" />
                Level {currentLevel}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200 text-xs font-bold">
                <Flame className="w-3.5 h-3.5" />
                {currentStreak}d streak
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-500/15 border border-pink-200 dark:border-pink-500/30 text-pink-700 dark:text-pink-200 text-xs font-bold">
                Popularity Lv {popularityLevel}
              </span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-4 gap-2">
            {stats.map(({ Icon, label, value, tone }) => (
              <div
                key={label}
                className="flex flex-col items-center text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 p-2 min-w-0"
              >
                <span className={`${ICON_TILE} w-9 h-9 mb-1.5`}>
                  <Icon className={`w-4 h-4 ${tone}`} />
                </span>
                <p className="w-full text-sm font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
                  {value}
                </p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Shop images ───────────────────────────────────────── */}
        {shopImages.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="px-1 mb-2 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShoppingBag className="w-4 h-4 text-violet-500" />
              My shop images
            </h2>
            <div className="space-y-3">
              {shopImages.map((image) => (
                <div
                  key={image.type}
                  className={`${GLASS} rounded-2xl overflow-hidden`}
                >
                  <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                    <img
                      src={image.url}
                      alt={image.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleDownload(image.url, image.type)}
                      disabled={downloading === image.type}
                      aria-label={`Download ${image.title}`}
                      className="absolute top-2 right-2 w-10 h-10 inline-flex items-center justify-center rounded-full bg-slate-900/70 backdrop-blur-md text-white border border-white/15 hover:bg-slate-900/85 active:scale-95 transition-all touch-manipulation"
                    >
                      {downloading === image.type ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="px-3.5 py-2.5">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{image.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{image.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Business stats ────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`${GLASS} rounded-3xl p-4 sm:p-5`}
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white mb-3">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Business stats
          </h2>
          <div className="divide-y divide-slate-200/60 dark:divide-white/10">
            <StatRow label="Total profit" value={`${totalProfit.toFixed(0)} coins`} />
            <StatRow label="Total sales"  value={`${totalSales.toFixed(0)} coins`} />
            <StatRow label="Products"     value={productsCount} />
            <StatRow label="Staff members" value={staffCount} />
          </div>
        </motion.section>

        {/* ── Menu rows ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path, { state: { from: '/s/aipreneur/profile' } })}
              className={`${GLASS} ${GLASS_HOVER} w-full rounded-2xl p-3.5 flex items-center gap-3 touch-manipulation active:scale-[0.99] transition-transform`}
            >
              <span className={`${ICON_TILE} w-11 h-11 flex-shrink-0`}>
                <item.Icon className={`w-5 h-5 ${item.tone}`} />
              </span>
              <p className="flex-1 min-w-0 text-left text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {item.name}
              </p>
              <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
            </button>
          ))}
        </motion.section>

        {/* ── Quick actions ─────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            onClick={() => navigate('/s/aipreneur/ai-tokens', withFrom(location))}
            className={`${BTN_3D_PRIMARY} min-h-[60px] px-3 flex-col gap-0.5 text-sm`}
          >
            <Sparkles className="w-5 h-5" />
            Top up tokens
          </button>
          <button
            type="button"
            onClick={() => navigate('/s/aipreneur/rewards', withFrom(location))}
            className={`${BTN_3D_SECONDARY} min-h-[60px] px-3 flex-col gap-0.5 text-sm`}
          >
            <Gift className="w-5 h-5 text-rose-500" />
            Redeem rewards
          </button>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
// StatRow — one labelled row inside the business-stats card.
// ─────────────────────────────────────────────────────────────────────
function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-extrabold tabular-nums text-slate-900 dark:text-white text-right shrink-0">{value}</span>
    </div>
  );
}

export default ProfilePage;
