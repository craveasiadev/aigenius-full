/**
 * Finance Module Component
 *
 * Displays coin balances, transaction history,
 * financial overview, and daily stats reports with date filtering.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  History,
  PiggyBank,
  RefreshCw,
  X,
  Calendar,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Filter,
} from 'lucide-react';
import { financeApi, FinanceData, Transaction } from '../../services/onboardingApi';
import { simulatorApi, DailyStatsResponse } from '../../services/aipreneurApi';

interface FinanceModuleProps {
  studentId?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

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
  coin_purchase: 'Coin Purchase',
  token_purchase: 'Coin Purchase',
  ai_generation: 'AI Creation',
};

// Category icons
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'product_sale':
      return '🛒';
    case 'campaign_reward':
      return '📢';
    case 'quest_reward':
      return '🎯';
    case 'daily_bonus':
      return '📅';
    case 'achievement_bonus':
      return '🏆';
    case 'starting_bonus':
      return '🎁';
    case 'staff_salary':
      return '👥';
    case 'decoration':
      return '🎨';
    case 'marketing':
      return '📣';
    case 'innovation':
      return '💡';
    case 'coin_purchase':
    case 'token_purchase':
      return '🪙';
    case 'ai_generation':
      return '✨';
    default:
      return '💰';
  }
};

type ReportTab = 'overview' | 'profit' | 'visitors' | 'transactions';

export const FinanceModule = ({ studentId, isExpanded = false, onToggle }: FinanceModuleProps) => {
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Load finance data
  const loadFinanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [financeResponse, statsResponse] = await Promise.all([
        financeApi.getFinance(),
        simulatorApi.getDailyStats(),
      ]);
      if (financeResponse.success) {
        setFinanceData(financeResponse);
      }
      if (statsResponse.success) {
        setDailyStats(statsResponse);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
      setError('Failed to load finance data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // Calculate filtered totals
  const getFilteredStats = () => {
    if (!dailyStats) return { profit: 0, visitors: 0, customers: 0, revenue: 0 };

    if (dateFilter === 'today') {
      return {
        profit: dailyStats.today.profit,
        visitors: dailyStats.today.visitors,
        customers: dailyStats.today.customers,
        revenue: dailyStats.today.revenue,
      };
    } else if (dateFilter === 'week') {
      return {
        profit: dailyStats.week.profit,
        visitors: dailyStats.week.visitors,
        customers: dailyStats.week.customers,
        revenue: dailyStats.week.revenue,
      };
    } else if (dateFilter === 'all') {
      return {
        profit: dailyStats.all_time.total_profit,
        visitors: dailyStats.all_time.store_visitors,
        customers: dailyStats.week.customers, // Approximation
        revenue: dailyStats.all_time.total_sales,
      };
    }
    // Month - use week * 4 as approximation
    return {
      profit: dailyStats.week.profit * 4,
      visitors: dailyStats.week.visitors * 4,
      customers: dailyStats.week.customers * 4,
      revenue: dailyStats.week.revenue * 4,
    };
  };

  if (isLoading) {
    return (
      <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-700 rounded mb-4" />
        <div className="h-4 bg-gray-700 rounded w-2/3" />
      </div>
    );
  }

  if (error || !financeData) {
    return (
      <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
        <p className="text-red-400 text-center">{error || 'No data available'}</p>
        <button
          onClick={loadFinanceData}
          className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-white"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const { balances, summary, transactions } = financeData;
  const filteredStats = getFilteredStats();

  return (
    <>
      {/* Module Card */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg text-white cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg">Finance</h3>
          </div>
          <ArrowUpRight className="w-5 h-5 opacity-70" />
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Coins */}
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-yellow-300" />
              <span className="text-xs opacity-80">Coins</span>
            </div>
            <div className="text-2xl font-bold">{balances.coins.toLocaleString()}</div>
          </div>

          {/* Today's Profit */}
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-300" />
              <span className="text-xs opacity-80">Today</span>
            </div>
            <div className="text-2xl font-bold">RM{(dailyStats?.today.profit || 0).toFixed(0)}</div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex items-center justify-between text-sm">
          <span className="opacity-80">Weekly Profit</span>
          <div className={`flex items-center gap-1 ${(dailyStats?.week.profit || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
            {(dailyStats?.week.profit || 0) >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-bold">RM{(dailyStats?.week.profit || 0).toFixed(0)}</span>
          </div>
        </div>
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a10] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="w-6 h-6" />
                    <h2 className="font-bold text-xl">Financial Reports</h2>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4">
                  {[
                    { id: 'overview', label: 'Overview', icon: BarChart3 },
                    { id: 'profit', label: 'Profit', icon: DollarSign },
                    { id: 'visitors', label: 'Visitors', icon: Users },
                    { id: 'transactions', label: 'History', icon: History },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as ReportTab)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-white text-emerald-600'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                {/* Date Filter */}
                {(activeTab === 'profit' || activeTab === 'visitors') && (
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm">Filter by:</span>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'week', label: 'This Week' },
                        { id: 'month', label: 'This Month' },
                        { id: 'all', label: 'All Time' },
                      ].map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => setDateFilter(filter.id as typeof dateFilter)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            dateFilter === filter.id
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Balance Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="w-5 h-5 text-yellow-400" />
                          <span className="text-gray-400 font-medium">Coins</span>
                        </div>
                        <div className="text-3xl font-bold text-white">{balances.coins.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mt-1">Business currency</div>
                      </div>
                    </div>

                    {/* Today's Stats */}
                    {dailyStats && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-cyan-400" />
                          Today ({dailyStats.today.date})
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">RM{dailyStats.today.profit.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Profit</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{dailyStats.today.visitors}</div>
                            <div className="text-xs text-gray-500">Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">{dailyStats.today.customers}</div>
                            <div className="text-xs text-gray-500">Sales</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">RM{dailyStats.today.revenue.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Revenue</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Weekly Summary */}
                    {dailyStats && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          This Week
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">RM{dailyStats.week.profit.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Profit</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">{dailyStats.week.visitors}</div>
                            <div className="text-xs text-gray-500">Visitors</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">{dailyStats.week.customers}</div>
                            <div className="text-xs text-gray-500">Sales</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">RM{dailyStats.week.revenue.toFixed(0)}</div>
                            <div className="text-xs text-gray-500">Revenue</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Daily History Chart */}
                    {dailyStats && dailyStats.history && dailyStats.history.length > 0 && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-cyan-400" />
                          Daily Performance (Last 7 Days)
                        </h3>
                        <div className="flex items-end gap-2 h-32">
                          {dailyStats.history.slice(0, 7).reverse().map((day, i) => {
                            const maxRevenue = Math.max(...dailyStats.history.map(d => d.revenue), 1);
                            const height = (day.revenue / maxRevenue) * 100;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                  className="w-full bg-gradient-to-t from-emerald-500 to-cyan-500 rounded-t-lg transition-all hover:from-emerald-400 hover:to-cyan-400"
                                  style={{ height: `${Math.max(height, 5)}%` }}
                                  title={`RM${day.revenue.toFixed(0)}`}
                                />
                                <span className="text-[10px] text-gray-500">
                                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Profit Tab */}
                {activeTab === 'profit' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6 text-center">
                      <DollarSign className="w-12 h-12 mx-auto text-green-400 mb-2" />
                      <div className="text-4xl font-bold text-white mb-1">
                        RM{filteredStats.profit.toFixed(2)}
                      </div>
                      <div className="text-gray-400">
                        {dateFilter === 'today' ? "Today's" : dateFilter === 'week' ? 'This Week' : dateFilter === 'month' ? 'This Month' : 'All Time'} Profit
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                          RM{filteredStats.revenue.toFixed(0)}
                        </div>
                        <div className="text-xs text-gray-500">Total Revenue</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {filteredStats.customers}
                        </div>
                        <div className="text-xs text-gray-500">Total Sales</div>
                      </div>
                    </div>

                    {/* Daily Breakdown */}
                    {dailyStats && dailyStats.history && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="font-bold text-white mb-3">Daily Breakdown</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dailyStats.history.map((day, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
                              <span className="text-gray-400 text-sm">{day.date}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-green-400 font-bold">RM{day.profit.toFixed(0)}</span>
                                <span className="text-gray-500 text-sm">{day.customers} sales</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visitors Tab */}
                {activeTab === 'visitors' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6 text-center">
                      <Users className="w-12 h-12 mx-auto text-blue-400 mb-2" />
                      <div className="text-4xl font-bold text-white mb-1">
                        {filteredStats.visitors}
                      </div>
                      <div className="text-gray-400">
                        {dateFilter === 'today' ? "Today's" : dateFilter === 'week' ? 'This Week' : dateFilter === 'month' ? 'This Month' : 'All Time'} Visitors
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {filteredStats.customers}
                        </div>
                        <div className="text-xs text-gray-500">Made Purchases</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                          {filteredStats.visitors > 0 ? ((filteredStats.customers / filteredStats.visitors) * 100).toFixed(1) : 0}%
                        </div>
                        <div className="text-xs text-gray-500">Conversion Rate</div>
                      </div>
                    </div>

                    {/* Daily Breakdown */}
                    {dailyStats && dailyStats.history && (
                      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <h3 className="font-bold text-white mb-3">Daily Breakdown</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {dailyStats.history.map((day, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-gray-900/50 rounded-lg">
                              <span className="text-gray-400 text-sm">{day.date}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-blue-400 font-bold">{day.visitors} visitors</span>
                                <span className="text-gray-500 text-sm">{day.customers} bought</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                  <div>
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-400" />
                      Recent Transactions
                    </h3>
                    {transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No transactions yet</p>
                    ) : (
                      <div className="space-y-2">
                        {transactions.slice(0, 20).map((tx) => (
                          <TransactionItem key={tx.id} transaction={tx} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Transaction Item Component
const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
  const isIncome = transaction.type === 'income';
  const icon = getCategoryIcon(transaction.category);
  const label = CATEGORY_LABELS[transaction.category] || transaction.category;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`text-2xl`}>{icon}</div>
        <div>
          <div className="font-medium text-white">{label}</div>
          <div className="text-xs text-gray-500">{transaction.description}</div>
        </div>
      </div>
      <div className="text-right">
        {transaction.amount > 0 && (
          <div className={`font-bold flex items-center gap-1 ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
            {isIncome ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {isIncome ? '+' : '-'}{transaction.amount.toLocaleString()}
            <Coins className="w-3 h-3 text-yellow-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceModule;
