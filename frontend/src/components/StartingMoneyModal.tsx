import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Sparkles, Rocket, ShoppingBag, Users, X, Gift, Star } from 'lucide-react';
import { Confetti } from './Confetti';

interface StartingMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaim: (amount: number) => Promise<void>;
  studentName: string;
}

export const StartingMoneyModal = ({ isOpen, onClose, onClaim, studentName }: StartingMoneyModalProps) => {
  const [isClaming, setIsClaiming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const STARTING_AMOUNT = 500; // Starting coins for new entrepreneurs

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      await onClaim(STARTING_AMOUNT);
      setShowConfetti(true);
      setClaimed(true);
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Failed to claim starting money:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {showConfetti && <Confetti />}

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-gradient-to-br from-[#1a1a24] to-[#0a0a15] rounded-3xl border-2 border-amber-500/30 shadow-2xl shadow-amber-500/20 overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Floating coins animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${10 + i * 12}%`,
                    top: '100%',
                  }}
                  animate={{
                    y: [0, -400],
                    x: [0, Math.sin(i) * 30],
                    rotate: [0, 360],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + i * 0.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeOut',
                  }}
                >
                  <span className="text-2xl">🪙</span>
                </motion.div>
              ))}
            </div>

            <div className="relative p-8">
              {!claimed ? (
                <>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <motion.div
                      animate={{
                        rotate: [0, -10, 10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/50"
                    >
                      <Coins className="w-12 h-12 text-white" />
                    </motion.div>

                    <h2 className="text-3xl font-black text-white mb-2">
                      Welcome, {studentName}!
                    </h2>
                    <p className="text-amber-300 text-lg">
                      Here's your startup capital to begin your business journey!
                    </p>
                  </div>

                  {/* Amount Display */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-2xl p-6 mb-8 border border-amber-500/30"
                  >
                    <div className="text-center">
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2"
                      >
                        {STARTING_AMOUNT}
                      </motion.div>
                      <div className="flex items-center justify-center gap-2 text-amber-400">
                        <Coins className="w-5 h-5" />
                        <span className="font-bold text-lg">Starting Coins</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* What you can do */}
                  <div className="space-y-3 mb-8">
                    <h3 className="text-white font-bold text-lg mb-3">Use your coins to:</h3>

                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Create Products</p>
                        <p className="text-sm text-gray-400">50 coins each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Hire Staff</p>
                        <p className="text-sm text-gray-400">100 coins each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">Earn More!</p>
                        <p className="text-sm text-gray-400">Sell products to earn coins</p>
                      </div>
                    </div>
                  </div>

                  {/* Claim Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClaim}
                    disabled={isClaming}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-2xl font-bold text-white text-xl flex items-center justify-center gap-3 shadow-xl shadow-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/40 transition-all disabled:opacity-50"
                  >
                    {isClaming ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-6 h-6" />
                        </motion.div>
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Gift className="w-6 h-6" />
                        Claim Your Coins!
                        <Sparkles className="w-6 h-6" />
                      </>
                    )}
                  </motion.button>
                </>
              ) : (
                /* Success State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-green-500/50"
                  >
                    <Star className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-black text-white mb-4"
                  >
                    Congratulations!
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-4"
                  >
                    +{STARTING_AMOUNT} Coins
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-400"
                  >
                    Now go build your empire!
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 flex items-center justify-center gap-2 text-green-400"
                  >
                    <Rocket className="w-5 h-5" />
                    <span>Your adventure begins...</span>
                  </motion.div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartingMoneyModal;
