/**
 * Rewards page — AIpreneur design language.
 *
 * Two tabs:
 *   • Achievements — derived from real backend state (products, staff,
 *     streak, sales, level, total tokens earned).
 *   • Store — partner rewards loaded from `rewardsApi.getStoreItems()`.
 *     Tokens spent decrement the real balance via `rewardsApi.redeemStoreItem`.
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { useAutoAwardBadges, type BadgeCheckData } from '../hooks/useAutoAwardBadges';
import {
  Lock, Trophy, Target, Star, Sparkles, ArrowLeft, Sun, Moon,
  Zap, Gem, Loader2, Check, AlertCircle, Flame,
  Ticket, Utensils, Plane, Gift, HeartPulse, type LucideIcon,
} from 'lucide-react';
import { useSpark } from '../components/companion/CompanionProvider';
import { RewardBurst } from '../components/celebration/RewardBurst';
import { CollectionShelf } from '../components/collection/CollectionShelf';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import { useTheme } from '../contexts/ThemeContext';
import { BottomNav } from '../components/BottomNav';
import { rewardsApi, type AIpreneurRewardStoreItem } from '../services/aipreneurApi';
import { getAssetUrl } from '../lib/api';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

type Tab = 'achievements' | 'collection' | 'store';
type StoreCategory = 'all' | 'theme_park' | 'food' | 'beauty' | 'health' | 'travel' | 'more';

interface Achievement {
  id: number;
  name: string;
  emoji: string;
  desc: string;
  progress: number;
  req: number;
  reward: string;
}

type StoreItem = AIpreneurRewardStoreItem;

const STORE_CATEGORY_TABS: Array<{ id: StoreCategory; label: string }> = [
  { id: 'all',         label: 'All' },
  { id: 'theme_park',  label: 'Theme Park' },
  { id: 'food',        label: 'Food' },
  { id: 'beauty',      label: 'Beauty' },
  { id: 'health',      label: 'Health' },
  { id: 'travel',      label: 'Travel' },
  { id: 'more',        label: 'More' },
];

/** Per-category visual identity — drives the gradient artwork shown when a
 *  reward has no image (or its image fails to load). Keeps every card
 *  looking complete and on-brand instead of a blank grey box. */
const CATEGORY_META: Record<string, { icon: LucideIcon; emoji: string; gradient: string; label: string }> = {
  theme_park: { icon: Ticket,    emoji: '🎢', gradient: 'from-fuchsia-500 via-purple-500 to-indigo-600', label: 'Theme Park' },
  food:       { icon: Utensils,  emoji: '🍔', gradient: 'from-orange-400 via-amber-500 to-red-500',       label: 'Food' },
  beauty:     { icon: Sparkles,  emoji: '💄', gradient: 'from-pink-400 via-rose-500 to-fuchsia-500',      label: 'Beauty' },
  health:     { icon: HeartPulse,emoji: '🩺', gradient: 'from-emerald-400 via-teal-500 to-cyan-500',      label: 'Health' },
  travel:     { icon: Plane,     emoji: '✈️', gradient: 'from-sky-400 via-blue-500 to-indigo-500',        label: 'Travel' },
  more:       { icon: Gift,      emoji: '🎁', gradient: 'from-violet-400 via-indigo-500 to-purple-600',   label: 'More' },
};

const getCategoryMeta = (category: string) =>
  CATEGORY_META[category] ?? { icon: Gift, emoji: '🎁', gradient: 'from-slate-500 via-slate-600 to-slate-700', label: 'Reward' };

export const RewardsPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const {
    rewards, business, products, staff,
    decorations, innovations, influencerCampaigns, marketingAssets,
    loadRewards, isLoading: dataLoading,
  } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>('achievements');
  const [storeCategory, setStoreCategory] = useState<StoreCategory>('all');
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [storeLoading, setStoreLoading] = useState<boolean>(true);
  const [redeemingItemId, setRedeemingItemId] = useState<string | null>(null);
  const [redeemStatus, setRedeemStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Track reward images that failed to load so we can swap in the
  // category gradient artwork instead of leaving a blank box.
  const [erroredImages, setErroredImages] = useState<Set<string>>(new Set());

  // Celebrations route through the global companion bus — Spark cheers and
  // <RewardBurst> (mounted below) shows the wow-moment overlay.
  const spark = useSpark();

  const handleBack = () => smartBack();

  // ── Achievement auto-award ────────────────────────────────────────────
  // The same engine the dashboard uses. Wiring it here means an achievement
  // is actually CLAIMED (XP + coins granted, badge persisted) the moment its
  // condition is met — no matter where the student earned it or how they
  // reached this page. Without this, the bars below would show "done" while
  // the reward was never granted.
  const badgeCheckData = useMemo((): BadgeCheckData | null => {
    if (!business && !rewards) return null;
    const estimatedCsrActions = Math.max(
      business?.last_csr_action_date ? 1 : 0,
      Math.floor((business?.total_donated || 0) / 10),
    );
    return {
      productsCount: products?.length || 0,
      staffCount: staff?.length || 0,
      campaignsCount: (influencerCampaigns?.length || 0) + (marketingAssets?.length || 0),
      influencerCampaignsCount: influencerCampaigns?.length || 0,
      innovationsCount: innovations?.length || 0,
      decorationsSet: (decorations?.length || 0) > 0,
      interiorCustomized: !!(business?.interior_config && (
        (business.interior_config as any).floor > 0 ||
        (business.interior_config as any).wall > 0 ||
        (business.interior_config as any).cashier > 0 ||
        (business.interior_config as any).shelfLeft > 0 ||
        (business.interior_config as any).shelfRight > 0
      )),
      totalSales: business?.total_sales || 0,
      shopLaunched: business?.shop_launched || false,
      currentStreak: rewards?.current_streak || 0,
      currentLevel: rewards?.level || 1,
      totalAiTokensEarned: rewards?.total_coins_earned || rewards?.ai_tokens || 0,
      totalDonated: business?.total_donated || 0,
      selectedCause: business?.selected_cause || null,
      csrActionCount: estimatedCsrActions,
    };
  }, [products, staff, influencerCampaigns, marketingAssets, innovations, decorations, business, rewards]);

  useAutoAwardBadges({
    data: badgeCheckData,
    rewards,
    loadRewards,
    onBadgeAwarded: (badgeId, { xp, coins }) => {
      const prettyName = badgeId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      spark.celebrate({ badgeId, prettyName, xp, coins });
    },
  });

  useEffect(() => {
    if (!geniusProfile) {
      setStoreItems([]);
      setStoreLoading(false);
      return;
    }
    let active = true;
    const fetchStoreItems = async () => {
      setStoreLoading(true);
      try {
        const response = await rewardsApi.getStoreItems();
        if (active && response.success) setStoreItems(response.items ?? []);
      } catch (e) {
        console.error('Failed to load reward store items:', e);
        if (active) setStoreItems([]);
      } finally {
        if (active) setStoreLoading(false);
      }
    };
    void fetchStoreItems();
    return () => { active = false; };
  }, [geniusProfile?.id]);

  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return (
      <AppLoader
        title="Loading rewards…"
        icon={Trophy}
        hints={['Tallying achievements', 'Checking the store', 'Almost ready']}
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
              <Trophy className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to view rewards
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Achievements + the partner store live in your account.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`${BTN_3D_PRIMARY} w-full min-h-[52px] px-6 text-base`}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dark = theme === 'dark';
  const currentAiTokens = rewards?.ai_tokens || 0;
  const currentXP = rewards?.xp || 0;
  const currentLevel = rewards?.level || 1;
  const currentStreak = rewards?.current_streak || 0;
  const totalAiTokensEarned = rewards?.total_coins_earned || currentAiTokens;

  const productsCount = products?.length || 0;
  const staffCount = staff?.length || 0;
  const totalSales = Number(business?.total_sales) || 0;
  const shopLaunched = business?.shop_launched || false;

  const achievements: Achievement[] = [
    { id: 1, name: 'First Steps',     emoji: '🎯', desc: 'Create your first product!',  progress: productsCount,       req: 1,    reward: '+50 XP'  },
    { id: 2, name: 'Product Master',  emoji: '📦', desc: 'Make 5 awesome products!',    progress: productsCount,       req: 5,    reward: '+150 XP' },
    { id: 3, name: 'Team Builder',    emoji: '👥', desc: 'Hire your first helper!',     progress: staffCount,          req: 1,    reward: '+75 XP'  },
    { id: 4, name: 'Week Champion',   emoji: '🔥', desc: 'Play 7 days in a row!',       progress: currentStreak,       req: 7,    reward: '+200 XP' },
    { id: 5, name: 'Grand Opening',   emoji: '🚀', desc: 'Open your shop!',             progress: shopLaunched ? 1 : 0, req: 1,   reward: '+100 XP' },
    { id: 6, name: 'Money Maker',     emoji: '💰', desc: 'Earn 100 coins in sales!',    progress: Math.floor(totalSales), req: 100, reward: '+250 XP' },
    { id: 7, name: 'Level Master',    emoji: '👑', desc: 'Reach level 5!',              progress: currentLevel,        req: 5,    reward: '+300 XP' },
    { id: 8, name: 'Token Collector', emoji: '💎', desc: 'Get 1000 AI tokens!',         progress: totalAiTokensEarned, req: 1000, reward: 'Badge!'  },
  ];

  // Badges the backend has actually granted (normalised to snake_case ids so
  // they line up with each achievement's name → e.g. "First Steps" →
  // "first_steps"). Used to show "Claimed" vs "Ready" below.
  const earnedBadges = new Set<string>(
    (rewards?.badges || []).map((b: string) => b.toLowerCase().replace(/\s+/g, '_')),
  );
  const badgeSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '_');

  const filteredStoreItems = storeCategory === 'all'
    ? storeItems
    : storeItems.filter((item) => item.category === storeCategory);

  const completedCount = achievements.filter((a) => a.progress >= a.req).length;
  const xpInLevel = currentXP % 100;

  const handleRedeem = async (item: StoreItem) => {
    setRedeemStatus(null);
    if (item.stock <= 0) {
      setRedeemStatus({ type: 'error', message: `${item.name} is out of stock.` });
      return;
    }
    if (currentAiTokens < item.price) {
      setRedeemStatus({
        type: 'error',
        message: `Not enough AI tokens for ${item.name}. Need ${item.price}, you have ${currentAiTokens}.`,
      });
      return;
    }
    setRedeemingItemId(item.id);
    try {
      const response = await rewardsApi.redeemStoreItem(item.id);
      if (response.success) {
        await loadRewards();
        setStoreItems((prev) => prev.map((existing) => {
          if (existing.id !== item.id) return existing;
          return {
            ...existing,
            stock: typeof response.item?.stock === 'number'
              ? response.item.stock
              : Math.max(0, existing.stock - 1),
          };
        }));
        const redemptionCode = response.redemption?.code ? ` Claim code: ${response.redemption.code}.` : '';
        setRedeemStatus({
          type: 'success',
          message: `${item.name} redeemed for ${item.price} AI tokens.${redemptionCode}`,
        });
      } else {
        setRedeemStatus({
          type: 'error',
          message: response.message || `Unable to redeem ${item.name}. Please try again.`,
        });
      }
    } catch (err) {
      console.error('Failed to redeem reward:', err);
      const errorMessage = err instanceof Error ? err.message : 'Please try again.';
      setRedeemStatus({ type: 'error', message: `Unable to redeem ${item.name}. ${errorMessage}` });
    } finally {
      setRedeemingItemId(null);
    }
  };

  return (
    <div className={PAGE}>
      <StarfieldBackground /><DottedBackground />

      {/* Global "wow moment" overlay — fires through <CompanionProvider>
          whenever a badge is auto-claimed. Replaces the old inline toast. */}
      <RewardBurst />

      {/* ── Header (sticky) ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <Trophy className="w-5 h-5 text-amber-500" />
            Rewards
          </h1>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            {dark
              ? <Sun className="w-5 h-5 text-amber-300" />
              : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-32 lg:pb-12 relative">
        {/* ── Hero + Quick stats row (wider, side-by-side on desktop) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={`${GLASS} rounded-3xl p-5 sm:p-6 lg:col-span-2 relative overflow-hidden`}
          >
            {/* subtle brand glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
            <div className="relative flex items-center gap-4">
              <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500 border-b-[5px] border-amber-700 flex items-center justify-center shrink-0">
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  Level {currentLevel} progress
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {completedCount}
                  <span className="text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                    / {achievements.length} achievements
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 sm:mt-5 relative">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  XP {xpInLevel}/100
                </span>
                <span>Lv {currentLevel}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpInLevel}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, type: 'spring', stiffness: 260, damping: 26 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className={`${GLASS} rounded-2xl p-3 lg:p-4 text-center flex flex-col items-center justify-center`}>
              <span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center mb-1.5">
                <Star className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </span>
              <div className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white">{currentLevel}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Level</div>
            </div>
            <div className={`${GLASS} rounded-2xl p-3 lg:p-4 text-center flex flex-col items-center justify-center`}>
              <span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-rose-500 border-b-[3px] border-rose-700 flex items-center justify-center mb-1.5">
                <Flame className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </span>
              <div className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white">{currentStreak}<span className="text-sm text-slate-400">d</span></div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Streak</div>
            </div>
            <div className={`${GLASS} rounded-2xl p-3 lg:p-4 text-center flex flex-col items-center justify-center`}>
              <span className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl bg-amber-500 border-b-[3px] border-amber-700 flex items-center justify-center mb-1.5">
                <Zap className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </span>
              <div className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{currentAiTokens}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Tokens</div>
            </div>
          </motion.div>
        </div>

        {/* ── Tab switcher ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 26 }}
          className={`${GLASS} rounded-2xl p-1.5 mb-5 grid grid-cols-3 gap-1.5 sm:max-w-lg`}
        >
          {([
            { id: 'achievements', label: 'Achievements', icon: <Target className="w-4 h-4" /> },
            { id: 'collection',   label: 'Collection',   icon: <Trophy className="w-4 h-4" /> },
            { id: 'store',        label: 'Store',        icon: <Sparkles className="w-4 h-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors',
                  active
                    ? 'bg-violet-600 text-white border-b-[3px] border-violet-800'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'achievements' ? (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3"
            >
              {achievements.map((a) => {
                const done = a.progress >= a.req;
                const claimed = earnedBadges.has(badgeSlug(a.name));
                // Condition met but the reward hasn't landed yet (claim in
                // flight). The auto-award engine above will grant it shortly.
                const pendingClaim = done && !claimed;
                const pct = Math.min((a.progress / a.req) * 100, 100);
                return (
                  <div
                    key={a.id}
                    className={[
                      GLASS,
                      'rounded-2xl p-4',
                      done ? 'ring-2 ring-amber-400/40 dark:ring-amber-500/30' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          'w-12 h-12 rounded-2xl border-b-[3px] flex items-center justify-center text-2xl shrink-0',
                          done
                            ? 'bg-amber-500 border-amber-700'
                            : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-900',
                        ].join(' ')}
                      >
                        {done
                          ? <span>{a.emoji}</span>
                          : <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-slate-900 dark:text-white">{a.name}</h3>
                          {claimed && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          {claimed ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" /> Claimed
                            </span>
                          ) : pendingClaim ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <Loader2 className="w-3 h-3 animate-spin" /> Claiming…
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{a.desc}</p>

                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7, delay: 0.1 }}
                              className={[
                                'h-full rounded-full',
                                done ? 'bg-amber-500' : 'bg-violet-500',
                              ].join(' ')}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                            {a.progress}/{a.req}
                          </span>
                        </div>
                      </div>

                      <div className={[
                        'text-right text-xs font-bold shrink-0',
                        done ? 'text-amber-600 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500',
                      ].join(' ')}>
                        {a.reward}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : activeTab === 'collection' ? (
            <motion.div
              key="collection"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <CollectionShelf />
            </motion.div>
          ) : (
            <motion.div
              key="store"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              {/* Category chips */}
              <div className={`${GLASS} rounded-2xl p-2 overflow-x-auto`}>
                <div className="flex items-center gap-2 min-w-max">
                  {STORE_CATEGORY_TABS.map((c) => {
                    const active = storeCategory === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setStoreCategory(c.id)}
                        className={[
                          'px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap',
                          active
                            ? 'bg-violet-600 text-white border-b-[2px] border-violet-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                        ].join(' ')}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status banner */}
              {redeemStatus && (
                <div
                  className={[
                    'rounded-2xl p-3 text-sm border flex items-start gap-2',
                    redeemStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-400/30 text-rose-700 dark:text-rose-300',
                  ].join(' ')}
                >
                  {redeemStatus.type === 'success'
                    ? <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{redeemStatus.message}</span>
                </div>
              )}

              {storeLoading ? (
                <div className={`${GLASS} rounded-2xl p-5 text-sm text-center text-slate-500 dark:text-slate-400`}>
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Loading rewards store…
                </div>
              ) : filteredStoreItems.length === 0 ? (
                <div className={`${GLASS} rounded-2xl p-5 text-sm text-center text-slate-500 dark:text-slate-400`}>
                  No rewards available in this category yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {filteredStoreItems.map((item) => {
                    const isSoldOut = item.stock <= 0;
                    const canAfford = currentAiTokens >= item.price;
                    const isRedeeming = redeemingItemId === item.id;
                    const lowStock = !isSoldOut && item.stock <= 3;
                    const meta = getCategoryMeta(item.category);
                    const CatIcon = meta.icon;
                    const showImage = !!item.imageUrl && !erroredImages.has(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className={[
                          GLASS,
                          'rounded-2xl p-3 flex flex-col h-full',
                          'hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/40',
                          item.popular ? 'ring-2 ring-rose-400/50 dark:ring-rose-500/40' : '',
                        ].join(' ')}
                      >
                        {/* Artwork — real image when present, otherwise the
                            category gradient placeholder (never blank). */}
                        <div className="relative mb-3 rounded-xl overflow-hidden aspect-[4/3] border border-slate-200 dark:border-white/10">
                          {showImage ? (
                            <img
                              src={getAssetUrl(item.imageUrl)}
                              alt={item.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={() => setErroredImages((prev) => new Set(prev).add(item.id))}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${meta.gradient} flex flex-col items-center justify-center relative`}>
                              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0%, transparent 45%)' }} />
                              <span className="text-4xl drop-shadow-sm">{meta.emoji}</span>
                              <span className="mt-1 inline-flex items-center gap-1 text-white/90 text-[10px] font-bold uppercase tracking-wider">
                                <CatIcon className="w-3 h-3" />
                                {meta.label}
                              </span>
                            </div>
                          )}
                          {item.popular && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold border-b-[2px] border-rose-700 shadow-md">
                              <Star className="w-3 h-3 fill-white" />
                              Hot
                            </span>
                          )}
                          {lowStock && !item.popular && (
                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold border-b-[2px] border-amber-700 shadow-md">
                              <Flame className="w-3 h-3" />
                              {item.stock} left
                            </span>
                          )}
                          {item.partner && (
                            <span className="absolute left-2 bottom-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-sm">
                              {item.partner}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{item.name}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{item.desc}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-3 line-clamp-2 min-h-[30px]">{item.details}</p>

                        {/* Price + stock — pinned above button so cards align */}
                        <div className="mt-auto">
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-300">
                              <Gem className="w-4 h-4" />
                              <span className="tabular-nums text-base">{item.price}</span>
                              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 ml-0.5">tokens</span>
                            </div>
                            <span className={[
                              'text-[11px] font-semibold',
                              isSoldOut ? 'text-rose-500' : lowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400',
                            ].join(' ')}>
                              {isSoldOut ? 'Sold out' : `${item.stock} left`}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleRedeem(item)}
                            disabled={isRedeeming || isSoldOut || !canAfford}
                            className={[
                              (canAfford && !isSoldOut) ? BTN_3D_PRIMARY : BTN_3D_SECONDARY,
                              'w-full min-h-[44px] px-3 text-sm',
                              (isSoldOut || !canAfford) ? 'opacity-60 cursor-not-allowed' : '',
                            ].join(' ')}
                          >
                            {isRedeeming ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redeeming…
                              </>
                            ) : isSoldOut ? (
                              'Sold Out'
                            ) : canAfford ? (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Redeem
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                Need {item.price - currentAiTokens} more
                              </>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile dock only — on desktop the back button + sticky header
          cover navigation, so the floating dock (and its overlap risk)
          is hidden. */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
};

export default RewardsPage;
