/**
 * Insufficient AI Tokens Modal
 *
 * Displays when user tries to perform an operation without enough AI tokens.
 * Provides options to top up or cancel.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShoppingCart, X, Coins, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InsufficientTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  required: number;
  currentBalance: number;
  operationType?: string;
}

export const InsufficientTokensModal: React.FC<InsufficientTokensModalProps> = ({
  isOpen,
  onClose,
  required,
  currentBalance,
  operationType = 'this action',
}) => {
  const navigate = useNavigate();
  const deficit = required - currentBalance;

  const handleTopUp = () => {
    onClose();
    navigate('/s/aipreneur/ai-tokens');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Header with warning */}
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6 text-center border-b border-white/10 relative">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>

                {/* Animated icon */}
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                >
                  <AlertTriangle className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold text-white mb-1">Not Enough AI Tokens!</h3>
                <p className="text-orange-300/80 text-sm">You need more AI tokens for {operationType}</p>
              </div>

                {/* Coin balance display */}
                <div className="p-6">
                  <div className="bg-black/30 rounded-xl p-4 mb-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60 text-sm">Required:</span>
                      <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-white font-bold">{required} AI tokens</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60 text-sm">Your Balance:</span>
                      <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 font-bold">{currentBalance} AI tokens</span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                      <span className="text-white/60 text-sm">You need:</span>
                      <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400 font-bold">+{deficit} more AI tokens</span>
                      </div>
                    </div>
                  </div>

                {/* Suggestion */}
                <p className="text-white/50 text-xs text-center mb-4">
                  Top up your AI tokens to continue creating amazing content!
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                  >
                    Maybe Later
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTopUp}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-white font-bold shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Top Up
                  </motion.button>
                </div>
              </div>

              {/* Bottom tip */}
              <div className="px-6 pb-4">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 text-center">
                  <p className="text-violet-300 text-xs">
                    <Zap className="w-3 h-3 inline mr-1" />
                    Tip: Top up AI tokens to keep creating!
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

export default InsufficientTokensModal;
