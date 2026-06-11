/**
 * Token usage history — AIpreneur design language.
 *
 * Real backend data only. Shows total spent + last-7-day spend at the
 * top, and a chronological list of token operations below.
 *
 * Visuals follow the shared design tokens (glass cards, 3D plastic-key
 * buttons, theme-aware solid colours, faint dotted background).
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSmartBack, withFrom } from '../lib/smartBack';
import {
  ArrowLeft, Gem, History, RefreshCw, Sparkles, Sun, Moon, Loader2,
  TrendingDown, Calendar, Zap,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { tokensApi } from '../services/aipreneurApi';
import { BottomNav } from '../components/BottomNav';
import { useTheme } from '../contexts/ThemeContext';
import {
  GLASS, GLASS_HOVER, BTN_3D_PRIMARY, BTN_3D_SECONDARY, PAGE,
} from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { AppLoader } from '../components/ui/AppLoader';

interface TokenHistoryItem {
  id: string;
  operation: string;
  tokens_used: number;
  reason: string;
  created_at: string;
}

const OPERATION_LABELS: Record<string, string> = {
  product_image:   'Product Image Generation',
  interior_item:   'Interior Customization',
  marketing_asset: 'Marketing Asset Generation',
  shop_exterior:   'Shop Exterior Generation',
  ai_chat:         'AI Chat Usage',
};

const formatDateTime = (value: string) => {
  try { return new Date(value).toLocaleString(); } catch { return value; }
};
const normalizeOperation = (operation: string) =>
  OPERATION_LABELS[operation] ||
  operation.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const TokenHistoryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { geniusProfile, isLoading: authLoading } = useGeniusAuth();
  const { rewards } = useAIpreneur();
  const { theme, toggleTheme } = useTheme();

  const [history, setHistory] = useState<TokenHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const smartBack = useSmartBack();
  const handleBack = () => smartBack();

  const currentTokens = rewards?.ai_tokens || 0;

  const totalSpent = useMemo(
    () => history.reduce((sum, e) => sum + Math.max(0, Number(e.tokens_used) || 0), 0),
    [history],
  );
  const spentLast7Days = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return history.reduce((sum, e) => {
      const t = new Date(e.created_at).getTime();
      if (Number.isNaN(t) || t < sevenDaysAgo) return sum;
      return sum + Math.max(0, Number(e.tokens_used) || 0);
    }, 0);
  }, [history]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await tokensApi.getHistory(60);
      if (response.success) setHistory(response.history || []);
      else setHistoryError('Unable to load token history right now.');
    } catch (e) {
      console.error('Failed to load token history:', e);
      setHistoryError('Unable to load token history right now.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!geniusProfile) return;
    void loadHistory();
  }, [geniusProfile?.id]);

  if (authLoading) {
    return (
      <AppLoader
        title="Loading token history…"
        icon={History}
        hints={['Adding up your spend', 'Sorting by date', 'Almost ready']}
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
              <History className="w-8 h-8 text-white" />
            </span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Sign in to view token history
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
            <History className="w-5 h-5 text-violet-500 dark:text-violet-300" />
            Token History
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

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-32 space-y-4">
        {/* ── Balance card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS} rounded-3xl p-5`}
        >
          <div className="flex items-center gap-4">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-amber-500 border-b-[5px] border-amber-700 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
                Current balance
              </p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-tight">
                {currentTokens.toLocaleString()}
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1.5">
                  AI tokens
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/s/aipreneur/ai-tokens', withFrom(location))}
              className={`${BTN_3D_PRIMARY} shrink-0 min-h-[40px] px-3 text-sm`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              Top up
            </button>
          </div>
        </motion.div>

        {/* ── Stats summary ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className={`${GLASS} rounded-2xl p-4`}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-rose-500 border-b-[3px] border-rose-700 mb-2">
              <TrendingDown className="w-4 h-4 text-white" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              Total spent
            </p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {totalSpent.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">all time</p>
          </div>

          <div className={`${GLASS} rounded-2xl p-4`}>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 mb-2">
              <Calendar className="w-4 h-4 text-white" />
            </span>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">
              Spent (7 days)
            </p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {spentLast7Days.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">recent activity</p>
          </div>
        </motion.section>

        {/* ── Timeline ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${GLASS} rounded-2xl p-4`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-violet-500 dark:text-violet-300" />
              Usage Timeline
            </h2>
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={historyLoading}
              className={`${BTN_3D_SECONDARY} min-h-[36px] px-3 text-xs`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              {historyLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {historyError && (
            <div className="mb-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              {historyError}
            </div>
          )}

          {history.length === 0 && !historyLoading ? (
            <div className="text-center py-8 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-200 dark:border-white/10">
              <Sparkles className="w-7 h-7 text-violet-500 dark:text-violet-300 mx-auto mb-2" />
              <p className="font-bold text-slate-900 dark:text-white">No token usage yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Your activity will appear here after AI actions.
              </p>
              <button
                type="button"
                onClick={() => navigate('/s/aipreneur/ai-tokens', withFrom(location))}
                className={`${BTN_3D_PRIMARY} min-h-[44px] px-5 text-sm`}
              >
                <Gem className="w-4 h-4" />
                Top up tokens
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {normalizeOperation(entry.operation)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {entry.reason || 'AI operation'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatDateTime(entry.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-extrabold text-rose-600 dark:text-rose-300 tabular-nums">
                      −{entry.tokens_used}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">tokens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
};

export default TokenHistoryPage;
