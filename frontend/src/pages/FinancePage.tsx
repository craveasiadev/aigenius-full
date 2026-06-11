import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
    Coins,
    History,
    RefreshCw,
    Calendar,
    BarChart3,
    ArrowRight,
    Wallet,
    PiggyBank,
    Lock,
    Package,
    Users,
    Heart,
    Megaphone,
} from 'lucide-react';
import { financeApi, FinanceData } from '../services/onboardingApi';
import { simulatorApi, DailyStatsResponse, conversionApi, financeGameApi } from '../services/aipreneurApi';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { ProfitConversionModal } from '../components/ProfitConversionModal';
import { Confetti } from '../components/Confetti';
import { ShopMathGames } from '../components/finance/ShopMathGames';
import { ModulePage } from '../components/modules/ModulePage';
import { ModuleHero3D } from '../components/modules/ModuleHero3D';
import { KidStat } from '../components/modules/KidStat';

// Category labels for display
const CATEGORY_LABELS: Record<string, string> = {
    product_sale: 'Product Sale',
    campaign_reward: 'Campaign Reward',
    quest_reward: 'Quest Reward',
    daily_bonus: 'Daily Bonus',
    achievement_bonus: 'Achievement Bonus',
    starting_bonus: 'Welcome Bonus',
    staff_salary: 'Staff Salary',
    decoration: 'Decoration',
    marketing: 'Marketing',
    innovation: 'Innovation',
    coin_purchase: 'Legacy Coin Purchase',
    token_purchase: 'AI Token Purchase',
    ai_generation: 'AI Creation',
};



// Category icons
const getCategoryEmoji = (category: string) => {
    switch (category) {
        case 'product_sale': return '🛒';
        case 'campaign_reward': return '📢';
        case 'quest_reward': return '🎯';
        case 'daily_bonus': return '📅';
        case 'achievement_bonus': return '🏆';
        case 'starting_bonus': return '🎁';
        case 'staff_salary': return '👥';
        case 'decoration': return '🎨';
        case 'marketing': return '📣';
        case 'innovation': return '💡';
        case 'coin_purchase': return '🪙';
        case 'token_purchase': return '🪙';
        case 'ai_generation': return '✨';
        default: return '💰';
    }
};

type TabType = 'overview' | 'history';

export const FinancePage = () => {
    const navigate = useNavigate();
    const smartBack = useSmartBack();
    const { geniusProfile } = useGeniusAuth();
    const { products, business, staff } = useAIpreneur();
    const [financeData, setFinanceData] = useState<FinanceData | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStatsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [showConversionModal, setShowConversionModal] = useState(false);
    const [availableProfit, setAvailableProfit] = useState(0);

    // ── Math Puzzle State ──
    const [financeGameStatus, setFinanceGameStatus] = useState<{
        can_play_today: boolean;
        last_played_date?: string | null;
        daily_limit: number;
    } | null>(null);
    const [puzzleAttemptsToday, setPuzzleAttemptsToday] = useState(0);
    const [isClaimingFinanceReward, setIsClaimingFinanceReward] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    // Default daily-challenge count when the backend doesn't pin one. We
    // bumped this from 1 → 3 so the Shop Math experience doesn't feel
    // "one-and-done" on first load — kids get three rewarded challenges
    // per day, then unlimited Practice Mode (free play, no coin reward).
    const DAILY_LIMIT = financeGameStatus?.daily_limit ?? 3;

    const handlePuzzleSolved = async (correct: boolean) => {
        if (isClaimingFinanceReward || puzzleAttemptsToday >= DAILY_LIMIT) {
            return;
        }

        try {
            setIsClaimingFinanceReward(true);
            const response = await financeGameApi.claim({
                completed: correct,
                score: correct ? 100 : 0,
            });

            if (response.success) {
                setPuzzleAttemptsToday(response.daily_limit);
                setFinanceGameStatus({
                    can_play_today: false,
                    last_played_date: new Date().toISOString().slice(0, 10),
                    daily_limit: response.daily_limit,
                });
                await loadFinanceData();
            }
        } catch (error) {
            console.error('Failed to claim finance game reward:', error);
            await loadFinanceData();
        } finally {
            setIsClaimingFinanceReward(false);
        }
    };

    // Load finance data - each call has its own catch so one failure doesn't block others
    const loadFinanceData = async () => {
        try {
            setIsLoading(true);

            const timeoutMs = 15000;
            const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
                Promise.race([
                    p,
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
                    ),
                ]);

            const [financeResponse, statsResponse, conversionRateResponse, financeGameStatusResponse] = await Promise.all([
                withTimeout(financeApi.getFinance()).catch((err) => {
                    console.error('Failed to load finance:', err);
                    return null;
                }),
                withTimeout(simulatorApi.getDailyStats()).catch((err) => {
                    console.error('Failed to load daily stats:', err);
                    return null;
                }),
                withTimeout(conversionApi.getRate()).catch((err) => {
                    console.error('Failed to load conversion rate:', err);
                    return null;
                }),
                withTimeout(financeGameApi.getStatus()).catch((err) => {
                    console.error('Failed to load finance game status:', err);
                    return null;
                }),
            ]);
            if (financeResponse?.success) {
                setFinanceData(financeResponse);
            }
            if (statsResponse?.success) {
                setDailyStats(statsResponse);
                setAvailableProfit(statsResponse.all_time?.total_profit || 0);
            }
            if (conversionRateResponse?.success && conversionRateResponse.available_profit !== undefined) {
                setAvailableProfit(conversionRateResponse.available_profit);
            }
            if (financeGameStatusResponse?.success) {
                setFinanceGameStatus({
                    can_play_today: financeGameStatusResponse.can_play_today,
                    last_played_date: financeGameStatusResponse.last_played_date ?? null,
                    daily_limit: financeGameStatusResponse.daily_limit,
                });
                setPuzzleAttemptsToday(
                    financeGameStatusResponse.can_play_today ? 0 : financeGameStatusResponse.daily_limit
                );
            }
        } catch (err) {
            console.error('Failed to load finance data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle profit-to-AI-token conversion
    const handleProfitConversion = async (profitAmount: number) => {
        try {
            const result = await conversionApi.convertProfitToCoins(profitAmount);
            if (result.success) {
                await loadFinanceData();
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
        } catch (error) {
            console.error('Failed to convert profit:', error);
            throw error;
        }
    };

    useEffect(() => {
        loadFinanceData();
    }, []);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="relative w-20 h-20"
                >
                    <div className="absolute inset-0 rounded-full" style={{ border: '4px solid rgba(6, 182, 212, 0.15)' }}></div>
                    <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full"></div>
                    <Coins className="absolute inset-0 m-auto text-cyan-400 w-8 h-8" />
                </motion.div>
            </div>
        );
    }

    const { balances, transactions } = financeData || { balances: { coins: 0, tokens: 0, tokens_used: 0 }, transactions: [] };

    // ── Real-data resolvers ────────────────────────────────────────
    // Prefer the live business row (same source the dashboard uses) and
    // fall back to dailyStats when business hasn't hydrated. This keeps
    // every number tied to a real persisted value — never a placeholder.
    const fmtMoney = (n: number | null | undefined): string => {
        const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
        return `RM${v.toFixed(0)}`;
    };
    const fmtNum = (n: number | null | undefined): number => {
        return typeof n === 'number' && Number.isFinite(n) ? n : 0;
    };
    const allTimeRevenue = business?.total_sales ?? dailyStats?.all_time.total_sales ?? 0;
    const allTimeProfit = business?.total_profit ?? dailyStats?.all_time.total_profit ?? 0;
    const allTimeVisitors = business?.store_visitors ?? dailyStats?.all_time.store_visitors ?? 0;
    const allTimeLikes = business?.store_likes ?? 0;
    const streakDays = business?.streak_days ?? 0;
    const popularityLevel = business?.popularity_level ?? 0;
    // Snapshot truly-empty state — used to surface the new-shop nudge so a
    // freshly-launched user understands the zeros are real (no sales yet)
    // rather than a broken page.
    const hasAnyActivity = allTimeRevenue > 0 || allTimeVisitors > 0 || transactions.length > 0;

    return (
        <ModulePage
            title="My Vault"
            subtitle="Financial Dashboard"
            icon={Wallet}
            tone="amber"
            onBack={() => smartBack()}
            hero={<ModuleHero3D kind="finance" caption="Watch your vault fill up" />}
            lesson={{
                title: 'Money tells your shop\'s story',
                body: "Track every coin in and out — it's how you spot what's working, what's draining the till, and when you've earned a real-world reward.",
            }}
            headerExtras={
                <button
                    onClick={loadFinanceData}
                    aria-label="Refresh"
                    className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-white/10 hover:brightness-110 active:translate-y-[1px] transition-all"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            }
        >
            {/* Decorative glow orbs — kept from the previous design as
                ambient accents over the standard PAGE background. */}
            <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 70%)' }} />
            <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }} />
            <div className="fixed top-[40%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)' }} />

            <Confetti show={showConfetti} />

            <div className="relative z-10">

                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    {/* Left Column: Stats Cards */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Main Balance Card */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="relative overflow-hidden rounded-3xl p-5 sm:p-8 shadow-2xl shadow-orange-500/20"
                            style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.85), rgba(234, 88, 12, 0.85))', backdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                        >
                            <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 p-24 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />

                            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                                <div className="min-w-0 text-center sm:text-left">
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-orange-100 font-bold mb-1 opacity-80">
                                        <PiggyBank className="w-5 h-5 shrink-0" />
                                        <span>Profit Coins Available</span>
                                    </div>
                                    <div className="text-4xl sm:text-6xl font-black text-white tracking-tight drop-shadow-md break-words">
                                        {balances.coins.toLocaleString()}
                                    </div>
                                    <div className="text-orange-100 font-bold mt-2 flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full w-fit mx-auto sm:mx-0 backdrop-blur-sm">
                                        <Coins className="w-4 h-4 shrink-0" /> Profit Coins
                                    </div>
                                </div>

                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 shadow-inner backdrop-blur-sm"
                                >
                                    <span className="text-5xl sm:text-7xl">🪙</span>
                                </motion.div>
                            </div>
                        </motion.div>

                        {/* Profit Conversion Card */}
                        <AnimatePresence>
                            {availableProfit > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-3xl p-1 shadow-lg shadow-emerald-500/10" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <div className="rounded-[20px] p-4 sm:p-6 relative overflow-hidden group" style={{ background: 'linear-gradient(to right, rgba(6, 78, 59, 0.3), rgba(22, 78, 99, 0.3))' }}>
                                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
                                                <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                                        <Lock className="w-7 h-7 text-white" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="text-lg sm:text-xl font-bold text-white">Unlock Your Profits!</h3>
                                                        <p className="text-sm sm:text-base text-white/40">Convert your shop profit coins into AI tokens.</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 sm:gap-4 p-2 rounded-2xl w-full md:w-auto" style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                    <div className="text-left md:text-right px-2 min-w-0 flex-1 md:flex-none">
                                                        <div className="text-xs text-white/40 uppercase font-bold">Available</div>
                                                        <div className="text-emerald-400 font-bold text-base sm:text-lg truncate">{availableProfit.toFixed(0)} Profit Coins</div>
                                                    </div>
                                                    <ArrowRight className="text-white/30 shrink-0" />
                                                    <button
                                                        onClick={() => setShowConversionModal(true)}
                                                        className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 sm:px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
                                                    >
                                                        Details <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Today's Report Row */}
                        <div className="rounded-3xl p-5 shadow-xl" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-cyan-400" />
                                    Today's Report
                                </h3>
                                <span className="text-xs text-white/30 font-mono px-2 py-1 rounded-md" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>{dailyStats?.today.date ?? new Date().toISOString().slice(0, 10)}</span>
                            </div>
                            {/* Kid-friendly stats — chunky tiles + emoji so the
                                "today" snapshot reads more like a scoreboard
                                than a finance dashboard. */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <KidStat
                                    emoji="💵"
                                    label="Revenue Today"
                                    value={fmtMoney(dailyStats?.today.revenue)}
                                    tone="emerald"
                                />
                                <KidStat
                                    emoji="👥"
                                    label="Visitors"
                                    value={fmtNum(dailyStats?.today.visitors)}
                                    tone="sky"
                                />
                                <KidStat
                                    emoji="📈"
                                    label="Profit"
                                    value={fmtMoney(dailyStats?.today.profit)}
                                    tone="emerald"
                                />
                                <KidStat
                                    emoji="🛒"
                                    label="Sales"
                                    value={fmtNum(dailyStats?.today.customers)}
                                    tone="amber"
                                />
                            </div>
                        </div>

                        {/* ── New-shop empty-state nudge ──
                            Surfaces ONLY when the shop genuinely has no
                            activity yet (all real backend numbers are 0).
                            Explains why every figure reads "0" and gives the
                            student the exact actions that will populate the
                            Vault with real numbers. */}
                        {!hasAnyActivity && (
                            <div className="rounded-3xl p-5 shadow-xl" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                                        <Wallet className="w-5 h-5 text-violet-300" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white">Your Vault is waiting for its first sale</h3>
                                        <p className="text-sm text-white/50 mt-1">
                                            The numbers above are real — they're just zero because no one has bought anything yet. Here's how to fill them in:
                                        </p>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/s/aipreneur/product', { state: { from: '/s/aipreneur/finance' } })}
                                        className="rounded-2xl p-4 text-left transition-colors hover:brightness-125"
                                        style={{ background: 'rgba(59, 130, 246, 0.10)', border: '1px solid rgba(59, 130, 246, 0.25)' }}
                                    >
                                        <Package className="w-5 h-5 text-blue-300 mb-2" />
                                        <div className="text-white font-bold text-sm">
                                            {products.length === 0 ? 'Create a product' : `${products.length} product${products.length === 1 ? '' : 's'} ready`}
                                        </div>
                                        <div className="text-xs text-white/40 mt-1">
                                            {products.length === 0 ? 'No products yet — without one, customers have nothing to buy.' : 'Add more to widen what shoppers can pick.'}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/s/aipreneur/operation', { state: { from: '/s/aipreneur/finance' } })}
                                        className="rounded-2xl p-4 text-left transition-colors hover:brightness-125"
                                        style={{ background: 'rgba(16, 185, 129, 0.10)', border: '1px solid rgba(16, 185, 129, 0.25)' }}
                                    >
                                        <Users className="w-5 h-5 text-emerald-300 mb-2" />
                                        <div className="text-white font-bold text-sm">
                                            {staff.length === 0 ? 'Hire your team' : `${staff.length} staff hired`}
                                        </div>
                                        <div className="text-xs text-white/40 mt-1">
                                            {staff.length === 0 ? 'Customers need someone serving them.' : 'Your shop is staffed — sales can happen.'}
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/s/aipreneur/marketing', { state: { from: '/s/aipreneur/finance' } })}
                                        className="rounded-2xl p-4 text-left transition-colors hover:brightness-125"
                                        style={{ background: 'rgba(245, 158, 11, 0.10)', border: '1px solid rgba(245, 158, 11, 0.25)' }}
                                    >
                                        <Megaphone className="w-5 h-5 text-amber-300 mb-2" />
                                        <div className="text-white font-bold text-sm">Run a campaign</div>
                                        <div className="text-xs text-white/40 mt-1">
                                            Marketing brings visitors — visitors become sales.
                                        </div>
                                    </button>
                                </div>
                                {business?.shop_launched ? (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-300/80">
                                        <Heart className="w-3.5 h-3.5" />
                                        <span>Shop is live{allTimeLikes > 0 ? ` · ${allTimeLikes} ${allTimeLikes === 1 ? 'like' : 'likes'}` : ''} — every visit is recorded right here.</span>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-amber-300/80">
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Shop hasn't launched yet — finish your setup modules to open the doors.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Shop Math Games ── */}
                        <ShopMathGames
                            products={products}
                            business={business}
                            staff={staff}
                            studentName={geniusProfile?.first_name || 'Boss'}
                            shopName={geniusProfile?.aipreneur_shop_name || null}
                            puzzleAttemptsToday={puzzleAttemptsToday}
                            dailyLimit={DAILY_LIMIT}
                            onPuzzleSolved={handlePuzzleSolved}
                            onShowConfetti={() => {
                                setShowConfetti(true);
                                setTimeout(() => setShowConfetti(false), 2500);
                            }}
                        />
                    </div>

                    {/* Right Column: History & Tabs */}
                    <div className="space-y-6">
                        <div className="rounded-3xl shadow-xl overflow-hidden flex flex-col h-[400px] sm:h-[600px]" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                            {/* Tabs Header */}
                            <div className="p-2 m-2 rounded-2xl flex" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                                {[
                                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                                    { id: 'history', label: 'Transactions', icon: History }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as TabType)}
                                        className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === tab.id
                                            ? 'text-white shadow-md'
                                            : 'text-white/30 hover:text-white/60'
                                            }`}
                                        style={activeTab === tab.id ? { background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.06)' } : {}}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'overview' ? (
                                        <motion.div
                                            key="overview"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-4"
                                        >
                                            <div className="rounded-2xl p-5" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                <h4 className="text-white/40 text-xs font-bold uppercase mb-4">Weekly Performance</h4>

                                                {/* Simple Chart Visualization */}
                                                <div className="h-40 flex items-end gap-2 mb-4">
                                                    {dailyStats?.history && dailyStats.history.length > 0 ? (
                                                        dailyStats.history.slice(0, 7).reverse().map((day, i) => {
                                                            const max = Math.max(...dailyStats.history.map(d => d.revenue), 10);
                                                            const h = (day.revenue / max) * 100;
                                                            return (
                                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                                                    <div
                                                                        className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 rounded-t-lg transition-all relative group-hover:shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                                                        style={{ height: `${Math.max(h, 5)}%` }}
                                                                    ></div>
                                                                    <span className="text-[9px] text-white/30 uppercase">{new Date(day.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}</span>
                                                                </div>
                                                            )
                                                        })
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-white/30 text-sm">No Data</div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-center text-sm pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                    <span className="text-white/40">Weekly Revenue</span>
                                                    <span className="text-emerald-400 font-bold">{fmtMoney(dailyStats?.week.revenue)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="text-xs font-bold text-white/30 uppercase px-1">All Time Stats</div>
                                                {[
                                                    { label: 'Total Revenue', value: fmtMoney(allTimeRevenue), color: 'text-white' },
                                                    { label: 'Total Profit', value: fmtMoney(allTimeProfit), color: 'text-emerald-400' },
                                                    { label: 'Total Visitors', value: fmtNum(allTimeVisitors).toLocaleString(), color: 'text-blue-400' },
                                                    { label: 'Shop Likes', value: fmtNum(allTimeLikes).toLocaleString(), color: 'text-rose-400' },
                                                    { label: 'Day Streak', value: `${fmtNum(streakDays)} day${streakDays === 1 ? '' : 's'}`, color: 'text-amber-400' },
                                                    { label: 'Popularity Lvl', value: fmtNum(popularityLevel).toString(), color: 'text-violet-400' },
                                                ].map((stat, i) => (
                                                    <div key={i} className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                        <span className="text-white/40 text-sm">{stat.label}</span>
                                                        <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="history"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-3"
                                        >
                                            {transactions.length === 0 ? (
                                                <div className="text-center py-20">
                                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                                                        <History className="w-8 h-8 text-white/20" />
                                                    </div>
                                                    <p className="text-white/30 font-medium">No transactions found</p>
                                                </div>
                                            ) : (
                                                transactions.slice(0, 20).map((tx) => (
                                                    <div key={tx.id} className="p-3 rounded-xl flex items-center justify-between gap-2 hover:brightness-125 transition-colors" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${tx.type === 'income' ? 'bg-green-500/10' : 'bg-red-500/10'
                                                                }`}>
                                                                {getCategoryEmoji(tx.category)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-white font-bold text-sm truncate">{CATEGORY_LABELS[tx.category] || tx.category}</div>
                                                                <div className="text-xs text-white/30 truncate">{tx.description}</div>
                                                            </div>
                                                        </div>
                                                        <div className={`font-bold text-sm flex items-center gap-1 shrink-0 ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'
                                                            }`}>
                                                            {tx.type === 'income' ? '+' : '-'}{tx.amount}
                                                            <Coins className="w-3 h-3 text-yellow-500" />
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ProfitConversionModal
                isOpen={showConversionModal}
                onClose={() => setShowConversionModal(false)}
                onConvert={handleProfitConversion}
                availableProfit={availableProfit}
            />
        </ModulePage>
    );
};

export default FinancePage;
