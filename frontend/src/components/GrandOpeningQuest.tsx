import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ShoppingBag, Users, Scissors, Sparkles,
  Rocket, ArrowRight, Coins, Star
} from 'lucide-react';
import { simulatorApi, ShopOpeningStatus } from '../services/aipreneurApi';

interface GrandOpeningQuestProps {
  onOpenShop: () => void;
  isShopLaunched: boolean;
  productsCount?: number;
  staffCount?: number;
  currentAiTokens?: number;
}

export const GrandOpeningQuest = ({
  onOpenShop,
  isShopLaunched,
  productsCount = 0,
  staffCount = 0,
  currentAiTokens = 0
}: GrandOpeningQuestProps) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ShopOpeningStatus | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetchStatus();
  }, [productsCount, staffCount]);

  if (isShopLaunched || status?.shop_launched) {
    return null;
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative rounded-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-xl" />
        <div className="relative p-4 animate-pulse">
          <div className="h-6 bg-purple-500/30 rounded w-3/4 mb-3" />
          <div className="h-4 bg-purple-500/30 rounded w-full mb-2" />
          <div className="h-4 bg-purple-500/30 rounded w-full" />
        </div>
      </motion.div>
    );
  }

  const requiredProducts = status?.required_products ?? 2;
  const requiredStaff = status?.required_staff ?? 2;
  const currentProductsCount = productsCount > 0 ? productsCount : (status?.products_count ?? 0);
  const currentStaffCount = staffCount > 0 ? staffCount : (status?.staff_count ?? 0);

  const hasEnoughProducts = currentProductsCount >= requiredProducts;
  const hasEnoughStaff = currentStaffCount >= requiredStaff;

  const questItems = [
    {
      id: 'products',
      label: 'Products',
      emoji: '🛍️',
      completed: hasEnoughProducts,
      count: currentProductsCount,
      required: requiredProducts,
      icon: ShoppingBag,
      color: 'from-blue-500 to-cyan-500',
      glowColor: 'shadow-blue-500/40',
      route: '/s/aipreneur/product',
    },
    {
      id: 'staff',
      label: 'Staff',
      emoji: '👥',
      completed: hasEnoughStaff,
      count: currentStaffCount,
      required: requiredStaff,
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      glowColor: 'shadow-purple-500/40',
      route: '/s/aipreneur/operation',
    },
  ];

  const allComplete = questItems.every(item => item.completed);
  const completedCount = questItems.filter(item => item.completed).length;
  const progress = (completedCount / questItems.length) * 100;

  // Find the first incomplete task for the pointing arrow
  const nextTask = questItems.find(item => !item.completed);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative rounded-2xl overflow-hidden shadow-2xl w-full"
    >
      {/* Animated glowing border */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{ padding: '2px' }}
        animate={{
          background: [
            'linear-gradient(0deg, #a855f7, #ec4899, #f59e0b)',
            'linear-gradient(120deg, #ec4899, #f59e0b, #a855f7)',
            'linear-gradient(240deg, #f59e0b, #a855f7, #ec4899)',
            'linear-gradient(360deg, #a855f7, #ec4899, #f59e0b)',
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />

      {/* Inner background */}
      <div className="absolute inset-[2px] bg-gradient-to-br from-purple-900 via-indigo-950 to-violet-900 rounded-[14px]" />

      {/* Floating sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 30}%` }}
            animate={{
              y: [0, -12, 0],
              opacity: [0.15, 0.5, 0.15],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
          >
            <Star className="w-2.5 h-2.5 text-yellow-400" fill="currentColor" />
          </motion.div>
        ))}
      </div>

      <div className="relative p-4">
        {/* Header with bouncing icon */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0"
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div className="min-w-0">
              <h2 className="text-base font-black text-white leading-none tracking-tight uppercase">QUEST</h2>
              <div className="mt-1 flex items-center gap-1.5">
                <motion.div
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-400"
                />
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wide">Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 shrink-0">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-black text-amber-400">{currentAiTokens}</span>
          </div>
        </div>

        {/* Instruction Banner — pulsing to attract attention */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-400/40 rounded-xl p-2.5 text-center mb-3"
        >
          <p className="text-xs font-black text-amber-300 uppercase tracking-wide">
            Complete to open shop!
          </p>
        </motion.div>

        {/* Progress Bar — taller and more visible */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-purple-200 uppercase tracking-wider font-bold">Progress</span>
            <span className="text-xs font-black text-white">{completedCount}/{questItems.length}</span>
          </div>
          <div className="w-full bg-purple-900/60 rounded-full h-3 overflow-hidden border border-purple-500/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 h-full rounded-full relative"
            >
              {/* Shimmer effect on progress bar */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </motion.div>
          </div>
        </div>

        {/* Quest Items — bigger, more animated */}
        <div className="space-y-2.5 mb-3">
          {questItems.map((item, index) => {
            const Icon = item.icon;
            const isNext = nextTask?.id === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15, type: 'spring' }}
                className="relative"
              >
                {/* Pointing arrow for the next task */}
                {isNext && (
                  <motion.div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full z-10"
                    animate={{ x: [0, 6, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <span className="text-lg">👉</span>
                  </motion.div>
                )}

                <motion.div
                  animate={isNext ? { scale: [1, 1.02, 1] } : {}}
                  transition={isNext ? { duration: 1.5, repeat: Infinity } : {}}
                  className={`rounded-xl overflow-hidden transition-all ${
                    item.completed
                      ? 'bg-green-500/15 border-2 border-green-400/40'
                      : isNext
                        ? `bg-white/10 border-2 border-amber-400/60 shadow-lg ${item.glowColor}`
                        : 'bg-white/5 border-2 border-purple-500/20'
                  }`}
                >
                  <div className="p-3 flex items-center gap-3">
                    {/* Icon with emoji */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.completed
                        ? 'bg-green-500 shadow-md shadow-green-500/30'
                        : `bg-gradient-to-br ${item.color} shadow-md ${item.glowColor}`
                    }`}>
                      {item.completed ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <CheckCircle className="w-6 h-6 text-white" />
                        </motion.div>
                      ) : (
                        <span className="text-lg">{item.emoji}</span>
                      )}
                    </div>

                    {/* Label & count */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-black ${item.completed ? 'text-green-400' : 'text-white'}`}>
                        {item.count}/{item.required} {item.label}
                      </h3>
                      {item.completed && (
                        <span className="text-[10px] font-bold text-green-300/70 uppercase">Done!</span>
                      )}
                    </div>

                    {/* Go button — bigger and animated for incomplete tasks */}
                    {!item.completed ? (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        animate={isNext ? { scale: [1, 1.08, 1] } : {}}
                        transition={isNext ? { duration: 1, repeat: Infinity } : {}}
                        onClick={() => navigate(item.route)}
                        className="px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1 shrink-0 bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/30 border border-white/20"
                      >
                        Go <ArrowRight className="w-3.5 h-3.5" />
                      </motion.button>
                    ) : (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-xl"
                      >
                        ✅
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Open Shop / Complete message */}
        <AnimatePresence mode="wait">
          {allComplete ? (
            <motion.button
              key="launch"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenShop}
              className="w-full py-3.5 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl font-black text-white text-sm shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 border-2 border-yellow-300/40 relative overflow-hidden"
            >
              {/* Shimmer on button */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
              <Scissors className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Open Your Shop!</span>
              <Rocket className="w-4 h-4 relative z-10" />
            </motion.button>
          ) : (
            <motion.div
              key="incomplete"
              className="text-center py-2 px-3 bg-white/5 rounded-xl border border-purple-500/20"
            >
              <p className="text-[10px] text-purple-300/70 font-bold">
                Complete to launch
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GrandOpeningQuest;
