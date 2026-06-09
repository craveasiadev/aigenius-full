/**
 * Offline Earnings Modal
 *
 * Shows earnings accumulated while user was away (idle game mechanic).
 * Displays on login if there are earnings to claim.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, DollarSign, Coins, TrendingUp, AlertTriangle, Gift, X } from 'lucide-react';
import { OfflineEarningsResponse } from '../services/aipreneurApi';

interface OfflineEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: () => Promise<void>;
  earningsData: OfflineEarningsResponse['earnings'] | null;
  notifications?: OfflineEarningsResponse['notifications'];
}

export const OfflineEarningsModal: React.FC<OfflineEarningsModalProps> = ({
  isOpen,
  onClose,
  onClaim,
  earningsData,
  notifications = [],
}) => {
  const [isClaiming, setIsClaiming] = useState(false);

  if (!earningsData) return null;

  const formatDuration = (hours: number): string => {
    if (hours < 1) return 'Less than an hour';
    if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim();
      onClose();
    } catch (error) {
      console.error('Failed to claim offline earnings:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const hasEarnings = earningsData.profit > 0 || earningsData.visitors > 0;
  const isInactive = earningsData.is_inactive;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md"
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className={`p-6 text-center border-b border-white/10 relative ${
                isInactive
                  ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20'
                  : 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20'
              }`}>
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>

                {/* Icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg ${
                    isInactive
                      ? 'bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/30'
                      : 'bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-emerald-500/30'
                  }`}
                >
                  {isInactive ? (
                    <AlertTriangle className="w-8 h-8 text-white" />
                  ) : (
                    <Gift className="w-8 h-8 text-white" />
                  )}
                </motion.div>

                <h3 className="text-xl font-bold text-white mb-1">
                  {isInactive ? 'Welcome Back!' : 'Your Shop Kept Running!'}
                </h3>
                <div className="flex items-center justify-center gap-2 text-white/70 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>You were away for {formatDuration(earningsData.offline_duration_hours)}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Inactivity Warning */}
                {isInactive && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-orange-300 font-medium text-sm">Shop Was Idle</p>
                        <p className="text-orange-300/70 text-xs mt-1">
                          Your shop stopped earning after 3 days of inactivity. Visit regularly to maximize profits!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Earnings Stats */}
                {hasEarnings ? (
                  <div className="space-y-3 mb-4">
                    {/* Visitors */}
                    <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-white/70">Visitors</span>
                      </div>
                      <span className="text-white font-bold text-lg">+{earningsData.visitors}</span>
                    </div>

                    {/* Sales */}
                    <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <span className="text-white/70">Sales Made</span>
                      </div>
                      <span className="text-white font-bold text-lg">{earningsData.sales}</span>
                    </div>

                    {/* Profit */}
                    <div className="bg-black/30 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-white/70">Profit Earned</span>
                      </div>
                      <span className="text-emerald-400 font-bold text-lg">RM{earningsData.profit.toFixed(2)}</span>
                    </div>

                    {/* Coins */}
                    {earningsData.coins_earned > 0 && (
                      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 flex items-center justify-between border border-yellow-500/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-yellow-400" />
                          </div>
                          <span className="text-yellow-300">Bonus Coins!</span>
                        </div>
                        <span className="text-yellow-400 font-bold text-lg">+{earningsData.coins_earned}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-black/30 rounded-xl p-6 text-center mb-4">
                    <p className="text-white/50">No earnings while you were away.</p>
                    <p className="text-white/30 text-sm mt-1">Add more products and staff to increase sales!</p>
                  </div>
                )}

                {/* Notifications */}
                {notifications.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {notifications.map((notif, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 text-sm ${
                          notif.type === 'warning'
                            ? 'bg-orange-500/10 border border-orange-500/20 text-orange-300'
                            : notif.type === 'milestone'
                            ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        <p className="font-medium">{notif.title}</p>
                        <p className="text-xs opacity-80 mt-0.5">{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Claim Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isClaiming ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Claiming...
                    </>
                  ) : hasEarnings ? (
                    <>
                      <Gift className="w-5 h-5" />
                      Claim Rewards
                    </>
                  ) : (
                    'Continue'
                  )}
                </motion.button>
              </div>

              {/* Tip */}
              <div className="px-6 pb-4">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-center">
                  <p className="text-cyan-300 text-xs">
                    Tip: Your shop earns while you're away! More products & marketing = more offline income.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineEarningsModal;
