/**
 * Student Dashboard — "Adventure HQ" for AIpreneur learners.
 *
 * Designed for kids aged 9–12: every panel is framed as a quest, badge
 * collection, or shop empire stat. Stays theme-aware (light/dark) and
 * mobile-first, with a sticky bottom nav.
 *
 * All upstream hooks (`useGeniusAuth`, `useAIpreneur`), navigation
 * targets, and the PersonaQuizModal are preserved exactly so existing
 * routing + data flows continue to work.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Trophy,
  TrendingUp,
  Crown,
  Flame,
  Coins,
  ChevronRight,
  Store,
  Brain,
  Sparkles,
  Target,
  Star,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import { ProgressRing } from '../components/ProgressRing';
import { PersonaQuizModal } from '../components/PersonaQuizModal';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { StatTile } from '../components/ui/StatTile';
import { QuestCard } from '../components/ui/QuestCard';
import { XPBar } from '../components/ui/XPBar';
import {
  GLASS,
  PAGE,
  BTN_3D_PRIMARY,
  GAME_ACCENTS,
  RARITY_CHIP,
} from '../lib/uiTokens';

export const StudentDashboard = () => {
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const {
    business,
    rewards,
    products,
    staff,
    overallProgress,
    isLoading: dataLoading,
  } = useAIpreneur();
  const navigate = useNavigate();
  const [showPersonaQuiz, setShowPersonaQuiz] = useState(false);

  const isLoading = authLoading || dataLoading;

  if (isLoading) {
    return (
      <div className={`${PAGE} flex items-center justify-center`}>
        <StarfieldBackground />
        <DottedBackground />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center relative z-10"
        >
          <span className="text-7xl block mb-4">🚀</span>
          <p className="text-slate-700 dark:text-slate-200 text-xl font-black">
            Loading your adventure...
          </p>
        </motion.div>
      </div>
    );
  }

  if (!geniusProfile) {
    return (
      <div className={`${PAGE} flex items-center justify-center px-4`}>
        <StarfieldBackground />
        <DottedBackground />
        <div className={`${GLASS} relative z-10 text-center rounded-3xl p-8 max-w-sm`}>
          <span className="text-6xl block mb-4">🔐</span>
          <p className="text-slate-700 dark:text-slate-200 text-lg mb-4 font-bold">
            Please log in to view your dashboard
          </p>
          <button onClick={() => navigate('/login')} className={`${BTN_3D_PRIMARY} px-6 py-3`}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ─── Student data (unchanged shape) ──────────────────────────
  // Cast — `aipreneur_shop_name` / `passion_category` are present on the
  // API payload but missing from the AIpreneurBusiness TS interface.
  // Matches the access pattern used elsewhere in the codebase.
  const biz = business as
    | (typeof business & { aipreneur_shop_name?: string | null; passion_category?: string | null })
    | null;
  const studentName = `${geniusProfile.first_name || ''} ${geniusProfile.last_name || ''}`.trim() || 'Adventurer';
  const shopName = biz?.aipreneur_shop_name || 'Your Shop';
  const isLaunched = business?.shop_launched || false;

  const currentAiTokens = rewards?.ai_tokens || 0;
  const currentXP = rewards?.xp || 0;
  const currentLevel = rewards?.level || 1;
  const currentStreak = rewards?.current_streak || 0;
  const badges = rewards?.badges || [];

  const productsCount = products?.length || 0;
  const staffCount = staff?.length || 0;
  const totalSales = Number(business?.total_sales) || 0;
  const storeVisitors = Number(business?.store_visitors) || 0;

  // XP to next level — simple curve: each level needs 100 * level XP.
  const xpToNext = currentLevel * 100;
  const xpThisLevel = currentXP % xpToNext;
  const xpPct = (xpThisLevel / xpToNext) * 100;

  // ─── Daily tip text — same logic as before ───────────────────
  const dailyTip =
    productsCount === 0
      ? "Start by creating your first product in the AIpreneur Hub. Think about what you're passionate about and create something unique! 🎨"
      : staffCount === 0
        ? "You've created products! Now hire some staff in the Operation module to help run your shop. 👥"
        : !isLaunched
          ? "You're making great progress! Complete more modules to unlock your shop's grand opening. 🎉"
          : 'Your shop is live! Keep creating products and running marketing campaigns to attract more customers. 🚀';

  return (
    <div className={`${PAGE} pb-24 overflow-x-hidden`}>
      <StarfieldBackground />
      <DottedBackground />

      <TopNav />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-20 md:pt-24 space-y-5 sm:space-y-6">
        {/* ── Hero welcome banner ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS} rounded-3xl p-5 sm:p-7 ring-2 ring-inset ring-violet-300/60 dark:ring-violet-500/40 relative overflow-hidden`}
        >
          <div
            aria-hidden
            className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-pink-300 via-violet-300 to-cyan-300 opacity-30 blur-3xl"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-3xl sm:text-4xl shadow-lg shadow-violet-500/30 shrink-0"
            >
              👋
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 text-[10px] font-black uppercase tracking-widest mb-1.5">
                <Sparkles className="w-3 h-3" />
                Adventure HQ · Lv {currentLevel}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Hey, {studentName}!
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                You're on a <span className="font-bold text-orange-600 dark:text-orange-300">{currentStreak}-day streak</span> 🔥 — let's keep building.
              </p>
              <div className="mt-3">
                <XPBar
                  percent={xpPct}
                  accent="violet"
                  height="md"
                  label={`Level ${currentLevel} → ${currentLevel + 1}`}
                  caption={`${xpThisLevel}/${xpToNext} XP`}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick-stat collectibles ───────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatTile
            icon={Coins}
            label="AI Tokens"
            value={currentAiTokens}
            emoji="🪙"
            accent="amber"
            onClick={() => navigate('/s/rewards')}
            delay={0.05}
          />
          <StatTile
            icon={Crown}
            label="Level"
            value={currentLevel}
            emoji="👑"
            accent="violet"
            progress={xpPct}
            onClick={() => navigate('/s/rewards')}
            delay={0.1}
          />
          <StatTile
            icon={Flame}
            label="Streak"
            value={currentStreak}
            suffix=" days"
            emoji="🔥"
            accent="orange"
            onClick={() => navigate('/s/rewards')}
            delay={0.15}
          />
          <StatTile
            icon={TrendingUp}
            label="XP"
            value={currentXP}
            emoji="⚡"
            accent="lime"
            onClick={() => navigate('/s/rewards')}
            delay={0.2}
          />
        </div>

        {/* ── Hero shop / business card ─────────────────────────── */}
        {business && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate('/s/aipreneur')}
            className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ring-cyan-300/60 dark:ring-cyan-500/40 cursor-pointer group relative overflow-hidden touch-manipulation`}
          >
            <div
              aria-hidden
              className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-gradient-to-br from-cyan-300 via-blue-300 to-violet-300 opacity-25 blur-3xl"
            />

            <div className="relative">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-3xl shrink-0 shadow-lg shadow-cyan-500/30">
                    🚀
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                      {shopName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span
                        className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isLaunched ? RARITY_CHIP.legendary : RARITY_CHIP.epic}`}
                      >
                        {isLaunched ? '🚀 Launched' : '🏗️ Building'}
                      </span>
                      {biz?.passion_category && (
                        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full capitalize bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 border border-violet-200 dark:border-violet-500/40">
                          {biz.passion_category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-violet-500 dark:text-violet-300 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>

              <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6">
                <div className="relative w-28 h-28 shrink-0">
                  <ProgressRing current={overallProgress} total={100} size={112} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {overallProgress}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Complete
                    </span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
                  {[
                    { emoji: '📦', value: productsCount, label: 'Products', accent: 'cyan' as const },
                    { emoji: '👥', value: staffCount, label: 'Staff', accent: 'lime' as const },
                    { emoji: '💰', value: `RM${totalSales.toFixed(0)}`, label: 'Sales', accent: 'amber' as const },
                    { emoji: '👀', value: storeVisitors, label: 'Visitors', accent: 'pink' as const },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-2xl p-3 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 ring-1 ring-inset ${GAME_ACCENTS[item.accent].ring}`}
                    >
                      <span className="text-2xl block mb-0.5">{item.emoji}</span>
                      <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {item.value}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`${BTN_3D_PRIMARY} w-full mt-5 py-3.5 text-sm sm:text-base`}>
                <Rocket className="w-4 h-4" />
                Continue Your Adventure
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Quick-access quest grid ───────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Target className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Quick Quests
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <QuestCard
              icon={Rocket}
              title="AIpreneur Hub"
              subtitle="Build & manage your business"
              body={`${productsCount} products · ${staffCount} staff · ${overallProgress}% done`}
              accent="violet"
              rarity="epic"
              progress={overallProgress}
              onClick={() => navigate('/s/aipreneur')}
              cta="Enter Hub"
              delay={0.05}
            />
            <QuestCard
              icon={Store}
              title="My Online Store"
              subtitle="See what shoppers see"
              body={`${productsCount} products · RM${totalSales.toFixed(0)} sales · ${storeVisitors} visitors`}
              accent="cyan"
              rarity="rare"
              onClick={() => navigate('/s/aipreneur/store')}
              cta="Visit store"
              delay={0.1}
            />
            <QuestCard
              icon={Trophy}
              title="Trophy Room"
              subtitle="Badges & rewards"
              body={`${badges.length} badges · ${currentAiTokens} tokens · Lv ${currentLevel}`}
              accent="amber"
              rarity="legendary"
              onClick={() => navigate('/s/rewards')}
              cta="See trophies"
              delay={0.15}
            />
          </div>
        </div>

        {/* ── Persona quiz call-out ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`${GLASS} rounded-3xl p-5 ring-2 ring-inset ring-pink-300/60 dark:ring-pink-500/40`}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1">
              <div className="w-12 h-12 rounded-2xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-pink-600 dark:text-pink-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Persona Quiz
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${RARITY_CHIP.rare}`}>
                    +50 XP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Answer fun questions so we can personalize your AI and business learning.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPersonaQuiz(true)}
              className={`${BTN_3D_PRIMARY} px-5 py-3 text-sm sm:text-base shrink-0 w-full md:w-auto`}
            >
              <Sparkles className="w-4 h-4" />
              Start Quiz
            </button>
          </div>
        </motion.div>

        {/* ── Badges showcase ───────────────────────────────────── */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`${GLASS} rounded-3xl p-5 ring-2 ring-inset ring-amber-300/60 dark:ring-amber-500/40`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-300" />
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Trophy Case
                </h3>
              </div>
              <button
                onClick={() => navigate('/s/rewards')}
                className="text-xs sm:text-sm text-violet-600 dark:text-violet-300 font-bold flex items-center gap-1 hover:underline"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {badges.slice(0, 6).map((_, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.1, rotate: -4 }}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-300 via-orange-300 to-pink-300 dark:from-amber-500/40 dark:via-orange-500/40 dark:to-pink-500/40 flex items-center justify-center text-2xl sm:text-3xl shadow-md ring-2 ring-amber-200 dark:ring-amber-500/30"
                >
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 text-amber-700 dark:text-amber-200 fill-amber-400/60" />
                </motion.div>
              ))}
              {badges.length > 6 && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-sm font-black text-slate-600 dark:text-slate-300">
                  +{badges.length - 6}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Daily tip ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`${GLASS} rounded-3xl p-5 ring-2 ring-inset ring-lime-300/60 dark:ring-lime-500/40`}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-lime-100 dark:bg-lime-500/20 flex items-center justify-center shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Today's Tip
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {dailyTip}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <PersonaQuizModal
        isOpen={showPersonaQuiz}
        onClose={() => setShowPersonaQuiz(false)}
        onComplete={() => {
          setShowPersonaQuiz(false);
          navigate('/s/persona');
        }}
      />

      <BottomNav />
    </div>
  );
};
