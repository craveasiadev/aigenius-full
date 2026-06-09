import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAIpreneur } from '../hooks/useAIpreneur';

export const AITokenCounter = () => {
  const navigate = useNavigate();
  const { rewards } = useAIpreneur();
  const [showDetails, setShowDetails] = useState(false);

  // Get balance from aipreneur rewards (stored in aipreneur_rewards table)
  const tokenBalance = rewards?.ai_tokens || 0;


  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-full transition-all"
      >
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-yellow-400 font-semibold leading-none">AI TOKENS</span>
          <motion.span
            key={tokenBalance}
            initial={{ scale: 1.1, color: '#facc15' }}
            animate={{ scale: 1, color: '#fef08a' }}
            className="text-sm font-bold text-yellow-200 leading-none mt-0.5"
          >
            {formatNumber(tokenBalance)}
          </motion.span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-12 w-64 bg-[#1a1a24] border border-purple-500/30 rounded-2xl p-4 shadow-2xl z-50"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xs text-gray-400">AI Token Balance</span>
                <span className="text-sm font-bold text-yellow-300">
                  {tokenBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-800">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowDetails(false);
                  navigate('/s/aipreneur/ai-tokens');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy AI Tokens
              </motion.button>
              <p className="text-[10px] text-gray-500 leading-relaxed mt-2 text-center">
                Purchase AI tokens with real money
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
