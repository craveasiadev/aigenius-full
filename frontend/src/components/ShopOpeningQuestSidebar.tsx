import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Circle, ShoppingBag, Users, Scissors, Sparkles, ChevronRight, Rocket } from 'lucide-react';
import { simulatorApi, ShopOpeningStatus } from '../services/aipreneurApi';

interface ShopOpeningQuestSidebarProps {
  onOpenShop: () => void;
  isShopLaunched: boolean;
  // Pass current counts to trigger refresh when they change
  productsCount?: number;
  staffCount?: number;
}

export const ShopOpeningQuestSidebar = ({ onOpenShop, isShopLaunched, productsCount = 0, staffCount = 0 }: ShopOpeningQuestSidebarProps) => {
  const [status, setStatus] = useState<ShopOpeningStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await simulatorApi.getShopOpeningStatus();
        if (response.success) {
          setStatus(response);
        }
      } catch (error) {
        console.error('Failed to fetch shop opening status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch once on mount and when products/staff count changes
    // No polling - the dashboard refreshes these values when activities happen
    fetchStatus();
  }, [productsCount, staffCount]); // Refetch when products or staff count changes

  if (isShopLaunched || status?.shop_launched) {
    return null; // Don't show if shop is already launched
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-gradient-to-br from-purple-900/80 to-indigo-900/80 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-purple-500/30 rounded w-3/4" />
          <div className="h-4 bg-purple-500/30 rounded w-full" />
          <div className="h-4 bg-purple-500/30 rounded w-full" />
        </div>
      </motion.div>
    );
  }

  const requiredProducts = status?.required_products ?? 2;
  const requiredStaff = status?.required_staff ?? 2;
  // Use props values (from dashboard) as they are always current
  // Fall back to API values if props are 0 (initial state)
  const currentProductsCount = productsCount > 0 ? productsCount : (status?.products_count ?? 0);
  const currentStaffCount = staffCount > 0 ? staffCount : (status?.staff_count ?? 0);

  // Calculate completion based on actual counts (more accurate than API which might be stale)
  const hasEnoughProducts = currentProductsCount >= requiredProducts;
  const hasEnoughStaff = currentStaffCount >= requiredStaff;

  const questItems = [
    {
      id: 'products',
      label: `Create ${requiredProducts} Products`,
      description: `Design products for your shop (${currentProductsCount}/${requiredProducts})`,
      completed: hasEnoughProducts,
      count: currentProductsCount,
      required: requiredProducts,
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'staff',
      label: `Hire ${requiredStaff} Staff`,
      description: `Interview and hire staff (${currentStaffCount}/${requiredStaff})`,
      completed: hasEnoughStaff,
      count: currentStaffCount,
      required: requiredStaff,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const allComplete = questItems.every(item => item.completed);
  const completedCount = questItems.filter(item => item.completed).length;
  const progress = (completedCount / questItems.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gradient-to-br from-purple-900/80 to-indigo-900/80 rounded-2xl border border-purple-500/30 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Grand Opening Quest</h3>
            <p className="text-sm text-purple-300">{completedCount}/{questItems.length} tasks complete</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-purple-300" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Progress Bar */}
            <div className="px-4 pb-2">
              <div className="w-full bg-purple-900/50 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full"
                />
              </div>
            </div>

            {/* Quest Items */}
            <div className="px-4 pb-4 space-y-3">
              {questItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-xl border transition-all ${
                      item.completed
                        ? 'bg-green-500/20 border-green-500/40'
                        : 'bg-purple-900/30 border-purple-500/20 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.completed
                          ? 'bg-green-500'
                          : `bg-gradient-to-br ${item.color}`
                      }`}>
                        {item.completed ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${
                          item.completed ? 'text-green-400 line-through' : 'text-white'
                        }`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-purple-300">
                          {item.completed ? `Complete! (${item.count}/${item.required})` : `${item.count}/${item.required} completed`}
                        </p>
                      </div>
                      {item.completed ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-2xl"
                        >
                          ✓
                        </motion.div>
                      ) : (
                        <Circle className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Open Shop Button */}
            <div className="p-4 pt-0">
              {allComplete ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenShop}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                >
                  <Scissors className="w-5 h-5" />
                  Open Your Shop!
                  <Rocket className="w-5 h-5" />
                </motion.button>
              ) : (
                <div className="text-center py-3 px-4 bg-purple-900/30 rounded-xl border border-purple-500/20">
                  <p className="text-sm text-purple-300">
                    Complete all tasks to open your shop!
                  </p>
                </div>
              )}
            </div>

            {/* Reward Preview */}
            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 pb-4"
              >
                <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <span className="text-lg">🪙</span> +100 Coins
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <span className="text-lg">⭐</span> +200 XP
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ShopOpeningQuestSidebar;
