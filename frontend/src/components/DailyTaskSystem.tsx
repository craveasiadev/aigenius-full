/**
 * DailyTaskSystem Component
 *
 * Shows daily random tasks for kids to complete and earn rewards.
 * Tasks change every day based on the date.
 * Includes streak tracking, bonus multipliers, and voucher rewards.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, CheckCircle, Gift, Flame, Star, Trophy,
  ShoppingBag, Palette, Users, Megaphone, Lightbulb, Heart,
  Coins, Zap, Clock, RefreshCw, Ticket, Sparkles, X
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { type AIpreneurReward } from '../services/aipreneurApi';

// Voucher definitions
export interface Voucher {
  id: string;
  name: string;
  description: string;
  cost: number; // Cost in vouchers
  reward: {
    type: 'coins' | 'xp' | 'special';
    amount: number;
    description?: string;
  };
  icon: string;
  gradient: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const VOUCHER_REWARDS: Voucher[] = [
  {
    id: 'coin_boost_small',
    name: 'Coin Pouch',
    description: 'A small pouch filled with coins',
    cost: 3,
    reward: { type: 'coins', amount: 100 },
    icon: '💰',
    gradient: 'from-amber-400 to-yellow-500',
    rarity: 'common',
  },
  {
    id: 'coin_boost_medium',
    name: 'Coin Chest',
    description: 'A treasure chest brimming with gold',
    cost: 7,
    reward: { type: 'coins', amount: 300 },
    icon: '🪙',
    gradient: 'from-yellow-400 to-amber-600',
    rarity: 'rare',
  },
  {
    id: 'xp_boost',
    name: 'XP Scroll',
    description: 'Ancient scroll of knowledge',
    cost: 5,
    reward: { type: 'xp', amount: 200 },
    icon: '📜',
    gradient: 'from-purple-400 to-violet-600',
    rarity: 'rare',
  },
  {
    id: 'mega_bundle',
    name: 'Mega Bundle',
    description: 'The ultimate reward package!',
    cost: 20,
    reward: { type: 'special', amount: 1, description: '500 Coins + 300 XP' },
    icon: '🎁',
    gradient: 'from-pink-400 via-purple-500 to-cyan-400',
    rarity: 'legendary',
  },
  {
    id: 'coin_boost_large',
    name: 'Coin Vault',
    description: 'A huge vault of coins for big ideas',
    cost: 10,
    reward: { type: 'coins', amount: 600 },
    icon: '🧰',
    gradient: 'from-amber-500 to-orange-600',
    rarity: 'epic',
  },
];

// Daily task definitions
interface DailyTask {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  emoji: string;
  coinsReward: number;
  xpReward: number;
  voucherReward?: number; // Voucher tickets earned
  moduleRoute?: string;
  checkCondition: (data: TaskCheckData) => boolean;
}

interface TaskCheckData {
  productsCount: number;
  staffCount: number;
  campaignsCount: number;
  innovationsCount: number;
  decorationsSet: boolean;
  interiorCustomized: boolean;
  totalSales: number;
  shopLaunched: boolean;
}

// All possible daily tasks
export const ALL_TASKS: DailyTask[] = [
  {
    id: 'create_product',
    title: 'Product Creator',
    description: 'Create a new product for your shop!',
    icon: ShoppingBag,
    gradient: 'from-blue-500 to-cyan-500',
    emoji: '📦',
    coinsReward: 50,
    xpReward: 25,
    voucherReward: 1,
    moduleRoute: '/s/aipreneur/product',
    checkCondition: (data) => data.productsCount > 0,
  },
  {
    id: 'decorate_shop',
    title: 'Interior Designer',
    description: 'Add some cool decorations to your shop!',
    icon: Palette,
    gradient: 'from-pink-500 to-rose-500',
    emoji: '🎨',
    coinsReward: 40,
    xpReward: 20,
    voucherReward: 1,
    moduleRoute: '/s/aipreneur/decorate',
    checkCondition: (data) => data.decorationsSet || data.interiorCustomized,
  },
  {
    id: 'hire_staff',
    title: 'Team Builder',
    description: 'Interview and hire a staff member!',
    icon: Users,
    gradient: 'from-violet-500 to-purple-500',
    emoji: '👥',
    coinsReward: 60,
    xpReward: 30,
    voucherReward: 1,
    moduleRoute: '/s/aipreneur/operation',
    checkCondition: (data) => data.staffCount > 0,
  },
  {
    id: 'run_campaign',
    title: 'Marketing Star',
    description: 'Launch a marketing campaign!',
    icon: Megaphone,
    gradient: 'from-amber-500 to-orange-500',
    emoji: '📣',
    coinsReward: 70,
    xpReward: 35,
    voucherReward: 2,
    moduleRoute: '/s/aipreneur/marketing',
    checkCondition: (data) => data.campaignsCount > 0,
  },
  {
    id: 'unlock_tech',
    title: 'Tech Genius',
    description: 'Unlock a new innovation for your shop!',
    icon: Lightbulb,
    gradient: 'from-emerald-500 to-green-500',
    emoji: '💡',
    coinsReward: 80,
    xpReward: 40,
    voucherReward: 2,
    moduleRoute: '/s/aipreneur/innovation',
    checkCondition: (data) => data.innovationsCount > 0,
  },
  {
    id: 'make_sale',
    title: 'Sales Champion',
    description: 'Make a sale in your shop simulator!',
    icon: Coins,
    gradient: 'from-yellow-500 to-amber-500',
    emoji: '💰',
    coinsReward: 30,
    xpReward: 15,
    voucherReward: 1,
    checkCondition: (data) => data.totalSales > 0,
  },
  {
    id: 'visit_shop',
    title: 'Shop Inspector',
    description: 'Visit your shop and check on things!',
    icon: Target,
    gradient: 'from-cyan-500 to-blue-500',
    emoji: '🏪',
    coinsReward: 20,
    xpReward: 10,
    voucherReward: 1,
    moduleRoute: '/s/aipreneur',
    checkCondition: (data) => data.shopLaunched,
  },
  {
    id: 'csr_hero',
    title: 'Community Hero',
    description: 'Do something nice for the community!',
    icon: Heart,
    gradient: 'from-red-500 to-pink-500',
    emoji: '❤️',
    coinsReward: 45,
    xpReward: 25,
    voucherReward: 1,
    moduleRoute: '/s/aipreneur/csr',
    checkCondition: () => true, // CSR is always available
  },
];

// Get deterministic random tasks for a given date
export const getDailyTasks = (date: Date, count: number = 3): DailyTask[] => {
  // Create a seed from the date
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  // Simple seeded random
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };

  // Shuffle array with seed
  const shuffled = [...ALL_TASKS].sort((a, b) => {
    const hashA = seededRandom(seed + a.id.length);
    const hashB = seededRandom(seed + b.id.length);
    return hashA - hashB;
  });

  return shuffled.slice(0, count);
};

// Calculate time until midnight
const getTimeUntilMidnight = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

interface DailyTaskSystemProps {
  taskData: TaskCheckData;
  rewards: AIpreneurReward | null;
  onTaskClick?: (task: DailyTask) => void;
  onClaimDailyReward?: () => void | boolean | Promise<void | boolean>;
  onRedeemVoucher?: (voucher: Voucher) => Promise<void>;
  compact?: boolean;
  storageScopeId?: string;
}

const getScopedStorageKey = (baseKey: string, scopeId?: string | null): string => {
  if (!scopeId) {
    return baseKey;
  }
  return `${baseKey}_${scopeId}`;
};

const getStoredInt = (key: string): number => {
  return parseInt(localStorage.getItem(key) || '0', 10);
};

const setStoredInt = (key: string, value: number): void => {
  localStorage.setItem(key, value.toString());
};

const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateKey = (dateValue?: string | null): string | null => {
  if (!dateValue) return null;
  return dateValue.slice(0, 10);
};

// Get rarity color
const getRarityColor = (rarity: Voucher['rarity']): string => {
  switch (rarity) {
    case 'common': return 'text-gray-300';
    case 'rare': return 'text-blue-400';
    case 'epic': return 'text-purple-400';
    case 'legendary': return 'text-amber-400';
    default: return 'text-white';
  }
};

const getRarityBorder = (rarity: Voucher['rarity']): string => {
  switch (rarity) {
    case 'common': return 'border-gray-500/30';
    case 'rare': return 'border-blue-500/30';
    case 'epic': return 'border-purple-500/30';
    case 'legendary': return 'border-amber-500/50 shadow-lg shadow-amber-500/20';
    default: return 'border-white/10';
  }
};

export const DailyTaskSystem = ({
  taskData,
  rewards,
  onTaskClick,
  onClaimDailyReward,
  onRedeemVoucher,
  compact = false,
  storageScopeId,
}: DailyTaskSystemProps) => {
  const { geniusProfile } = useGeniusAuth();
  const storageScope = useMemo(
    () => storageScopeId || geniusProfile?.id || rewards?.student_id || 'global',
    [storageScopeId, geniusProfile?.id, rewards?.student_id]
  );

  const dailyTaskDateStorageKey = useMemo(
    () => getScopedStorageKey('dailyTaskDate', storageScope),
    [storageScope]
  );
  const completedDailyTasksStorageKey = useMemo(
    () => getScopedStorageKey('completedDailyTasks', storageScope),
    [storageScope]
  );
  const dailyRewardClaimedStorageKey = useMemo(
    () => getScopedStorageKey('dailyRewardClaimed', storageScope),
    [storageScope]
  );
  const vouchersStorageKey = useMemo(
    () => getScopedStorageKey('aipreneur_vouchers', storageScope),
    [storageScope]
  );

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [voucherCount, setVoucherCountState] = useState(0);
  const [showVoucherShop, setShowVoucherShop] = useState(false);
  const [redeemingVoucher, setRedeemingVoucher] = useState<string | null>(null);
  const [redeemedVoucher, setRedeemedVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    setVoucherCountState(getStoredInt(vouchersStorageKey));
  }, [vouchersStorageKey]);

  // Get today's tasks
  useEffect(() => {
    const today = new Date();
    const tasks = getDailyTasks(today);
    setDailyTasks(tasks);

    // Check local storage for completed tasks (reset daily)
    const storedDate = localStorage.getItem(dailyTaskDateStorageKey);
    const todayStr = today.toDateString();

    if (storedDate !== todayStr) {
      // New day - reset completed tasks
      localStorage.setItem(dailyTaskDateStorageKey, todayStr);
      localStorage.removeItem(completedDailyTasksStorageKey);
      setCompletedTasks(new Set());
      setDailyRewardClaimed(false);
      localStorage.removeItem(dailyRewardClaimedStorageKey);
    } else {
      // Same day - load completed tasks
      const stored = localStorage.getItem(completedDailyTasksStorageKey);
      if (stored) {
        setCompletedTasks(new Set(JSON.parse(stored)));
      }
      setDailyRewardClaimed(localStorage.getItem(dailyRewardClaimedStorageKey) === 'true');
    }
  }, [completedDailyTasksStorageKey, dailyRewardClaimedStorageKey, dailyTaskDateStorageKey]);

  useEffect(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    const todayKey = getLocalDateKey(today);

    const backendClaimDate = normalizeDateKey(rewards?.last_daily_claim_date);
    const backendClaimedToday = backendClaimDate === todayKey;

    const localClaimed = localStorage.getItem(dailyRewardClaimedStorageKey) === 'true';
    const claimed = backendClaimedToday || localClaimed;

    if (backendClaimedToday) {
      localStorage.setItem(dailyTaskDateStorageKey, todayStr);
      localStorage.setItem(dailyRewardClaimedStorageKey, 'true');
    }

    setDailyRewardClaimed(claimed);
  }, [rewards?.last_daily_claim_date, dailyRewardClaimedStorageKey, dailyTaskDateStorageKey]);

  // Update countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeUntilMidnight());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check task completion and award vouchers
  useEffect(() => {
    const newCompleted = new Set<string>();
    let vouchersToAdd = 0;

    dailyTasks.forEach(task => {
      if (task.checkCondition(taskData)) {
        // Award vouchers for newly completed tasks
        if (!completedTasks.has(task.id) && task.voucherReward) {
          vouchersToAdd += task.voucherReward;
        }
        newCompleted.add(task.id);
      }
    });

    // Only update if there are new completions
    if (newCompleted.size > completedTasks.size) {
      setCompletedTasks(newCompleted);
      localStorage.setItem(completedDailyTasksStorageKey, JSON.stringify([...newCompleted]));

      // Award vouchers
      if (vouchersToAdd > 0) {
        const newVoucherCount = voucherCount + vouchersToAdd;
        setVoucherCountState(newVoucherCount);
        setStoredInt(vouchersStorageKey, newVoucherCount);
      }

      // Show celebration and bonus voucher for completing all tasks
      if (newCompleted.size === dailyTasks.length && !showCelebration) {
        setShowCelebration(true);
        // Bonus voucher for completing all tasks
        const bonusVouchers = 2;
        const newTotal = getStoredInt(vouchersStorageKey) + bonusVouchers;
        setVoucherCountState(newTotal);
        setStoredInt(vouchersStorageKey, newTotal);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    }
  }, [taskData, dailyTasks, completedTasks, completedDailyTasksStorageKey, voucherCount, showCelebration, vouchersStorageKey]);

  // Handle voucher redemption
  const handleRedeemVoucher = async (voucher: Voucher) => {
    if (voucherCount < voucher.cost) return;

    setRedeemingVoucher(voucher.id);
    try {
      await onRedeemVoucher?.(voucher);
      const newCount = voucherCount - voucher.cost;
      setVoucherCountState(newCount);
      setStoredInt(vouchersStorageKey, newCount);
      setRedeemedVoucher(voucher);
      setTimeout(() => setRedeemedVoucher(null), 2000);
    } catch (error) {
      console.error('Failed to redeem voucher:', error);
    } finally {
      setRedeemingVoucher(null);
    }
  };

  const handleClaimDailyReward = async () => {
    if (dailyRewardClaimed) return;
    if (!onClaimDailyReward) return;

    try {
      const result = await onClaimDailyReward();
      if (result === false) {
        return;
      }
      setDailyRewardClaimed(true);
      localStorage.setItem(dailyRewardClaimedStorageKey, 'true');
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
    }
  };

  const allTasksCompleted = dailyTasks.length > 0 && completedTasks.size === dailyTasks.length;
  const streakDays = rewards?.current_streak || 0;
  const streakBonus = Math.min(streakDays * 5, 50);

  if (compact) {
    return (
      <div className="glass-card p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>Daily Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Voucher count badge */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowVoucherShop(true)}
              className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg"
            >
              <Ticket className="w-3 h-3 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">{voucherCount}</span>
            </motion.button>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <Clock className="w-3 h-3" />
              {timeLeft.hours}h {timeLeft.minutes}m
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedTasks.size / dailyTasks.length) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'var(--text-secondary)' }}>
            {completedTasks.size}/{dailyTasks.length} completed
          </span>
          {allTasksCompleted && (
            <span className="text-green-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> All Done!
            </span>
          )}
        </div>

        {/* Voucher Shop Modal for Compact View */}
        <AnimatePresence>
          {showVoucherShop && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowVoucherShop(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-md max-h-[80vh] overflow-y-auto"
              >
                <div className="bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Voucher Shop</h3>
                        <p className="text-xs text-white/70">Redeem your vouchers</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg">
                        <Ticket className="w-4 h-4 text-white" />
                        <span className="font-bold text-white">{voucherCount}</span>
                      </div>
                      <button
                        onClick={() => setShowVoucherShop(false)}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Redeemed Success */}
                  <AnimatePresence>
                    {redeemedVoucher && (
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 bg-green-500/20 border-b border-green-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-green-400">Redeemed!</p>
                            <p className="text-xs text-green-300/70">
                              {redeemedVoucher.reward.type === 'special'
                                ? redeemedVoucher.reward.description
                                : `+${redeemedVoucher.reward.amount} ${redeemedVoucher.reward.type === 'coins' ? 'Coins' : 'XP'}`}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Voucher Items */}
                  <div className="p-4 space-y-3">
                    {VOUCHER_REWARDS.map((voucher) => {
                      const canAfford = voucherCount >= voucher.cost;
                      const isRedeeming = redeemingVoucher === voucher.id;

                      return (
                        <motion.div
                          key={voucher.id}
                          whileHover={{ scale: canAfford ? 1.02 : 1 }}
                          className={`relative p-4 rounded-xl border transition-all ${getRarityBorder(voucher.rarity)} ${canAfford ? 'bg-white/5' : 'bg-white/[0.02] opacity-60'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${voucher.gradient} flex items-center justify-center text-2xl shadow-lg`}>
                              {voucher.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white">{voucher.name}</h4>
                                <span className={`text-[10px] font-bold uppercase ${getRarityColor(voucher.rarity)}`}>
                                  {voucher.rarity}
                                </span>
                              </div>
                              <p className="text-xs text-white/60 mb-1">{voucher.description}</p>
                              <p className="text-sm font-medium text-amber-400">
                                {voucher.reward.type === 'special'
                                  ? voucher.reward.description
                                  : `+${voucher.reward.amount} ${voucher.reward.type === 'coins' ? 'Coins' : 'XP'}`}
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: canAfford ? 1.05 : 1 }}
                              whileTap={{ scale: canAfford ? 0.95 : 1 }}
                              onClick={() => canAfford && handleRedeemVoucher(voucher)}
                              disabled={!canAfford || isRedeeming}
                              className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 ${canAfford
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            >
                              {isRedeeming ? (
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                                  <Sparkles className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <>
                                  <Ticket className="w-4 h-4" />
                                  {voucher.cost}
                                </>
                              )}
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* How to earn */}
                  <div className="p-4 border-t border-white/10">
                    <p className="text-xs text-center text-white/50">
                      Complete daily tasks to earn vouchers! Bonus vouchers for completing all tasks.
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-6xl mb-2"
              >
                🎉
              </motion.div>
              <p className="text-white font-bold text-lg">All Tasks Complete!</p>
              <p className="text-white/70 text-sm">Amazing work today!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Target className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <h3 className="font-bold text-lg" style={{ color: 'var(--text)' }}>
              Daily Quests ✨
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Complete tasks to earn rewards!
            </p>
          </div>
        </div>

        {/* Timer & Vouchers */}
        <div className="text-right space-y-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowVoucherShop(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg ml-auto"
          >
            <Ticket className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-purple-400">{voucherCount}</span>
            <span className="text-xs text-purple-300">Vouchers</span>
          </motion.button>
          <div className="flex items-center gap-1 text-xs font-medium justify-end" style={{ color: 'var(--text-secondary)' }}>
            <RefreshCw className="w-3 h-3" />
            Resets in {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Streak indicator */}
      <motion.div
        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 mb-4"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Flame className={`w-6 h-6 ${streakDays > 0 ? 'text-orange-400' : 'text-gray-400'}`} />
          </motion.div>
          <div>
            <p className={`font-bold text-sm ${streakDays > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
              {streakDays > 0 ? `${streakDays} Day Streak!` : 'No Streak Yet'}
            </p>
            <p className="text-xs text-orange-300/70">
              {streakDays > 0 ? `+${streakBonus} bonus coins` : 'Claim to start your streak!'}
            </p>
          </div>
        </div>

        {!dailyRewardClaimed ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClaimDailyReward}
            className="ml-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-bold rounded-lg flex items-center gap-1 shadow-lg"
          >
            <Gift className="w-4 h-4" />
            {streakDays === 0 ? 'Start Streak!' : 'Claim!'}
          </motion.button>
        ) : (
          <div className="ml-auto flex items-center gap-1 text-green-400 text-sm font-bold">
            <CheckCircle className="w-4 h-4" />
            Claimed!
          </div>
        )}
      </motion.div>

      {/* Task list */}
      <div className="space-y-3">
        {dailyTasks.map((task, index) => {
          const isCompleted = completedTasks.has(task.id);
          const Icon = task.icon;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: isCompleted ? 1 : 1.02 }}
              onClick={() => !isCompleted && onTaskClick?.(task)}
              className={`relative p-4 rounded-xl border transition-all cursor-pointer ${isCompleted
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/5 border-white/10 hover:border-white/30'
                }`}
            >
              <div className="flex items-center gap-4">
                {/* Task icon */}
                <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center ${isCompleted
                  ? 'bg-green-500/20'
                  : `bg-gradient-to-br ${task.gradient}`
                  }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <>
                      <Icon className="w-6 h-6 text-white" />
                      <span className="absolute -top-1 -right-1 text-lg">{task.emoji}</span>
                    </>
                  )}
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <h4 className={`font-bold text-sm mb-0.5 ${isCompleted ? 'text-green-400 line-through' : ''
                    }`} style={{ color: isCompleted ? undefined : 'var(--text)' }}>
                    {task.title}
                  </h4>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {task.description}
                  </p>
                </div>

                {/* Rewards */}
                <div className="text-right space-y-0.5">
                  <div className="flex items-center gap-1 text-amber-400 text-sm font-bold justify-end">
                    <Coins className="w-4 h-4" />
                    +{task.coinsReward}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="flex items-center gap-1 text-purple-400 text-xs">
                      <Zap className="w-3 h-3" />
                      +{task.xpReward}
                    </div>
                    {task.voucherReward && (
                      <div className="flex items-center gap-1 text-pink-400 text-xs">
                        <Ticket className="w-3 h-3" />
                        +{task.voucherReward}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress indicator for incomplete tasks */}
              {!isCompleted && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Total rewards summary */}
      <motion.div
        className="mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Complete all for bonus:
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-amber-400 font-bold text-xs sm:text-sm flex items-center gap-1">
              <Coins className="w-3 h-3 sm:w-4 sm:h-4" /> +100
            </span>
            <span className="text-purple-400 font-bold text-xs sm:text-sm flex items-center gap-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" /> +50 XP
            </span>
            <span className="text-pink-400 font-bold text-xs sm:text-sm flex items-center gap-1">
              <Ticket className="w-3 h-3 sm:w-4 sm:h-4" /> +2
            </span>
          </div>
        </div>
      </motion.div>

      {/* Voucher Shop Modal for Full View */}
      <AnimatePresence>
        {showVoucherShop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowVoucherShop(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg max-h-[85vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-br from-gray-900 via-purple-950/50 to-gray-900 rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-4 sm:p-5 flex items-center justify-between z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white">Voucher Shop 🎟️</h3>
                      <p className="text-sm text-white/70">Redeem vouchers for rewards</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl">
                      <Ticket className="w-5 h-5 text-white" />
                      <span className="font-bold text-lg text-white">{voucherCount}</span>
                    </div>
                    <button
                      onClick={() => setShowVoucherShop(false)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>
                </div>

                {/* Redeemed Success */}
                <AnimatePresence>
                  {redeemedVoucher && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-4 bg-green-500/20 border-b border-green-500/30"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center"
                        >
                          <CheckCircle className="w-6 h-6 text-white" />
                        </motion.div>
                        <div>
                          <p className="font-bold text-green-400 text-lg">Successfully Redeemed!</p>
                          <p className="text-sm text-green-300/70">
                            {redeemedVoucher.reward.type === 'special'
                              ? redeemedVoucher.reward.description
                              : `+${redeemedVoucher.reward.amount} ${redeemedVoucher.reward.type === 'coins' ? 'Coins' : 'XP'}`}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Voucher Items */}
                <div className="p-4 sm:p-5 space-y-4">
                  {VOUCHER_REWARDS.map((voucher, index) => {
                    const canAfford = voucherCount >= voucher.cost;
                    const isRedeeming = redeemingVoucher === voucher.id;

                    return (
                      <motion.div
                        key={voucher.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: canAfford ? 1.02 : 1 }}
                        className={`relative p-4 rounded-xl border-2 transition-all ${getRarityBorder(voucher.rarity)} ${canAfford ? 'bg-white/5 hover:bg-white/10' : 'bg-white/[0.02] opacity-50'}`}
                      >
                        {voucher.rarity === 'legendary' && (
                          <motion.div
                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        <div className="flex items-center gap-4 relative z-10">
                          <motion.div
                            className={`w-16 h-16 rounded-xl bg-gradient-to-br ${voucher.gradient} flex items-center justify-center text-3xl shadow-lg`}
                            whileHover={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            {voucher.icon}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-white text-lg">{voucher.name}</h4>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/10 ${getRarityColor(voucher.rarity)}`}>
                                {voucher.rarity}
                              </span>
                            </div>
                            <p className="text-sm text-white/60 mb-2">{voucher.description}</p>
                            <p className="text-base font-bold text-amber-400">
                              {voucher.reward.type === 'special'
                                ? voucher.reward.description
                                : `+${voucher.reward.amount} ${voucher.reward.type === 'coins' ? 'Coins' : 'XP'}`}
                            </p>
                          </div>
                          <motion.button
                            whileHover={{ scale: canAfford ? 1.08 : 1 }}
                            whileTap={{ scale: canAfford ? 0.92 : 1 }}
                            onClick={() => canAfford && handleRedeemVoucher(voucher)}
                            disabled={!canAfford || isRedeeming}
                            className={`px-5 py-3 rounded-xl font-bold flex items-center gap-2 ${canAfford
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                              : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                          >
                            {isRedeeming ? (
                              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                <Sparkles className="w-5 h-5" />
                              </motion.div>
                            ) : (
                              <>
                                <Ticket className="w-5 h-5" />
                                <span>{voucher.cost}</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* How to earn info */}
                <div className="p-5 border-t border-white/10 bg-white/5">
                  <div className="flex items-start gap-3">
                    <Gift className="w-5 h-5 text-purple-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white mb-1">How to earn vouchers:</p>
                      <ul className="text-xs text-white/60 space-y-1">
                        <li>• Complete daily tasks to earn 1-2 vouchers each</li>
                        <li>• Complete ALL daily tasks for +2 bonus vouchers</li>
                        <li>• Keep your streak going for extra rewards!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// Export types for use elsewhere
export type { DailyTask, TaskCheckData, Voucher };
