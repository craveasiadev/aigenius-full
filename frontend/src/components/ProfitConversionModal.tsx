import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, ArrowRight, X, Loader2, Sparkles, Zap, PiggyBank } from 'lucide-react';
import { conversionApi } from '../services/aipreneurApi';

interface ProfitConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConvert: (profitAmount: number) => Promise<void>;
  availableProfit: number;
}

export const ProfitConversionModal: React.FC<ProfitConversionModalProps> = ({
  isOpen,
  onClose,
  onConvert,
  availableProfit,
}) => {
  const [conversionRate, setConversionRate] = useState(25); // 25 profit coins = 1 AI token default
  const [minConversion, setMinConversion] = useState(25);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Load conversion rate on mount
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      conversionApi.getRate()
        .then((response) => {
          if (response.success) {
            setConversionRate(response.rate);
            setMinConversion(response.min_conversion);
            // Default to max available
            const maxConvertible = Math.floor(response.available_profit / response.rate) * response.rate;
            setSelectedAmount(Math.min(maxConvertible, response.available_profit));
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const tokensToReceive = Math.floor(selectedAmount / conversionRate);
  const canConvert = selectedAmount >= minConversion && tokensToReceive > 0;

  const handleConvert = async () => {
    if (!canConvert) return;

    setIsConverting(true);
    try {
      await onConvert(selectedAmount);
      onClose();
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const presetAmounts = [
    { label: '25%', value: Math.floor(availableProfit * 0.25) },
    { label: '50%', value: Math.floor(availableProfit * 0.5) },
    { label: 'Max', value: availableProfit },
  ].filter(p => p.value >= minConversion);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotateX: 20 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotateX: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md relative"
          >
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-yellow-500/20 blur-[60px] rounded-full" />

            <div className="relative bg-[#1a1a24] rounded-3xl border-2 border-yellow-500/30 overflow-hidden shadow-2xl">

              {/* Header */}
              <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 p-6 text-center relative border-b border-white/5">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center justify-center gap-6 mb-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                  >
                    <PiggyBank className="w-8 h-8 text-white" />
                  </motion.div>

                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-6 h-6 text-white/30" />
                    <span className="text-xs text-yellow-400 font-bold mt-1">CONVERT</span>
                  </div>

                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30"
                  >
                    <Coins className="w-8 h-8 text-white" />
                  </motion.div>
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-wide">Coins → AI Tokens</h3>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {isLoading ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
                    <p className="text-gray-400 font-bold">Powering up...</p>
                  </div>
                ) : (
                  <>
                    {/* Available */}
                    <div className="flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
                      <span className="text-gray-400 font-bold">Profit Coins Balance</span>
                      <span className="text-xl font-black text-emerald-400">{availableProfit.toFixed(0)} Profit Coins</span>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm font-bold text-gray-400">
                        <span>Convert Amount</span>
                        <span>{selectedAmount.toFixed(0)} Profit Coins</span>
                      </div>

                      <input
                        type="range"
                        min={minConversion}
                        max={availableProfit}
                        step={conversionRate}
                        value={selectedAmount}
                        onChange={(e) => setSelectedAmount(Number(e.target.value))}
                        className="w-full h-6 bg-gray-800 rounded-full appearance-none cursor-pointer accent-yellow-500"
                      />

                      <div className="flex gap-2">
                        {presetAmounts.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setSelectedAmount(preset.value)}
                            className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs border border-gray-700 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Result Card */}
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-2xl p-4 border border-yellow-500/20 text-center">
                      <p className="text-yellow-200/60 text-xs font-bold uppercase mb-1">You Receive</p>
                      <div className="text-4xl font-black text-yellow-400 flex items-center justify-center gap-2">
                        <Sparkles className="w-6 h-6" /> {tokensToReceive} AI Tokens
                      </div>
                    </div>

                    {/* Action Button */}
                    <motion.button
                      whileHover={{ scale: canConvert ? 1.05 : 1 }}
                      whileTap={{ scale: canConvert ? 0.95 : 1 }}
                      onClick={handleConvert}
                      disabled={!canConvert || isConverting}
                      className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-xl transition-all ${canConvert
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-600 text-white shadow-orange-500/25 border-b-4 border-orange-700 active:border-b-0 active:translate-y-1'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed border-b-4 border-gray-900'
                        }`}
                    >
                      {isConverting ? (
                        <> <Loader2 className="w-6 h-6 animate-spin" /> Converting... </>
                      ) : (
                        <> <Zap className="w-6 h-6 fill-white" /> CONVERT TO AI TOKENS </>
                      )}
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProfitConversionModal;
