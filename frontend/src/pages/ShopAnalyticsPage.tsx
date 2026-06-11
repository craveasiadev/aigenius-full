/**
 * Shop Analytics — AIpreneur design language.
 *
 * Real backend data only. Pulls daily + all-time stats from
 * simulatorApi.getDailyStats(), and displays:
 *   • Today's snapshot: visitors, conversion %, revenue, profit
 *   • Weekly revenue trend (bar list)
 *   • All-time snapshot: sales, profit, visitors, products/staff
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  BarChart3, ArrowLeft, RefreshCw, TrendingUp, Users, Wallet,
  Loader2, Sun, Moon, Eye, Percent, Coins,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { simulatorApi, DailyStatsResponse } from '../services/aipreneurApi';
import { BottomNav } from '../components/BottomNav';
import { useTheme } from '../contexts/ThemeContext';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

const formatNumber = (value: number) => (Number.isFinite(value) ? value.toLocaleString() : '0');

export const ShopAnalyticsPage = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { theme, toggleTheme } = useTheme();
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const { business, products, staff } = useAIpreneur();

  const [dailyStats, setDailyStats] = useState<DailyStatsResponse | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => smartBack();

  const loadDailyStats = async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const response = await simulatorApi.getDailyStats();
      if (response.success) setDailyStats(response);
      else setError('Unable to load analytics right now.');
    } catch (e) {
      console.error('Failed to load analytics:', e);
      setError('Unable to load analytics right now.');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!geniusProfile) return;
    void loadDailyStats();
  }, [geniusProfile?.id]);

  const todayVisitors  = dailyStats?.today.visitors  || 0;
  const todayCustomers = dailyStats?.today.customers || 0;
  const todayRevenue   = dailyStats?.today.revenue   || 0;
  const todayProfit    = dailyStats?.today.profit    || 0;
  const conversionRate = todayVisitors > 0 ? (todayCustomers / todayVisitors) * 100 : 0;

  const allTimeSales    = dailyStats?.all_time.total_sales    || Number(business?.total_sales)    || 0;
  const allTimeProfit   = dailyStats?.all_time.total_profit   || Number(business?.total_profit)   || 0;
  const allTimeVisitors = dailyStats?.all_time.store_visitors || Number(business?.store_visitors) || 0;

  const history = dailyStats?.history || [];
  const maxRevenue = useMemo(
    () => Math.max(1, ...history.map((d) => Number(d.revenue) || 0)),
    [history],
  );

  if (authLoading) {
    return (
      <AppLoader
        title="Loading analytics…"
        icon={BarChart3}
        hints={['Counting visitors', 'Crunching numbers', 'Almost ready']}
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
              <BarChart3 className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to view analytics
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

  const dark = theme === 'dark';

  const todayStats = [
    { label: 'Visitors today', value: formatNumber(todayVisitors), sub: `${formatNumber(todayCustomers)} customers`, icon: Eye,    tone: 'bg-sky-500 border-sky-700' },
    { label: 'Conversion',     value: `${conversionRate.toFixed(1)}%`, sub: 'today',                                   icon: Percent, tone: 'bg-violet-600 border-violet-800' },
    { label: 'Revenue today',  value: `${formatNumber(todayRevenue)}`, sub: 'coins',                                   icon: Coins,   tone: 'bg-amber-500 border-amber-700' },
    { label: 'Profit today',   value: `${formatNumber(todayProfit)}`,  sub: 'net gain',                                icon: TrendingUp, tone: 'bg-emerald-500 border-emerald-700' },
  ];

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
            onClick={handleBack}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
            <BarChart3 className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Analytics
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

      <main
        className="max-w-2xl mx-auto px-4 pt-6 pb-32 space-y-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 128px)' }}
      >
        {error && (
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void loadDailyStats()}
            disabled={loadingStats}
            className={`${BTN_3D_SECONDARY} min-h-[36px] px-3 text-xs`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            {loadingStats ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Today's stats grid ───────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {todayStats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`${GLASS} rounded-2xl p-4`}>
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-b-[3px] mb-2 ${s.tone}`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                  {s.label}
                </p>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">
                  {s.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.sub}</p>
              </div>
            );
          })}
        </motion.section>

        {/* ── Weekly revenue trend ─────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`${GLASS} rounded-2xl p-4`}
        >
          <h2 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-500 dark:text-violet-300" />
            Weekly Revenue Trend
          </h2>

          {history.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No weekly analytics yet. Come back after your shop gets more activity.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((day) => {
                const revenue = Number(day.revenue) || 0;
                const width = `${Math.max((revenue / maxRevenue) * 100, 2)}%`;
                return (
                  <div
                    key={day.date}
                    className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 px-3 py-2.5"
                  >
                    <div className="flex justify-between items-baseline gap-2 text-xs mb-1.5">
                      <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{day.date}</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                        {formatNumber(revenue)} coins
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-900 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full bg-violet-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* ── All-time snapshot ────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${GLASS} rounded-2xl p-4`}
        >
          <h2 className="font-bold text-slate-900 dark:text-white mb-3">All-Time Snapshot</h2>
          <div className="space-y-2 text-sm">
            <Row icon={<Wallet className="w-4 h-4 text-amber-500" />} label="Total Sales" value={`${formatNumber(allTimeSales)} coins`} />
            <Row icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} label="Total Profit" value={`${formatNumber(allTimeProfit)} coins`} />
            <Row icon={<Users className="w-4 h-4 text-sky-500" />} label="Total Visitors" value={formatNumber(allTimeVisitors)} />
            <Row icon={<BarChart3 className="w-4 h-4 text-violet-500" />} label="Products / Staff" value={`${products.length} / ${staff.length}`} />
          </div>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 px-3 py-2.5">
      <span className="flex items-center gap-2 min-w-0 text-slate-600 dark:text-slate-300">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">{value}</span>
    </div>
  );
}

export default ShopAnalyticsPage;
