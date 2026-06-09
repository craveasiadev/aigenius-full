import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Rocket, X, RefreshCw, ArrowRight } from 'lucide-react';
import { Confetti } from './Confetti';
import {
  BusinessType,
  ShopVibe,
  generateShop,
  GeneratedShop,
  getVibeFilter,
} from '../services/shopGenerationService';

interface QuizAnswers {
  businessType: BusinessType | null;
  shopVibe: ShopVibe | null;
  colors: string[];
  superpower: string | null;
  shopName: string;
}

interface ShopRevealModalProps {
  isOpen: boolean;
  answers: QuizAnswers;
  onClose: () => void;
  onConfirm: () => void;
  onRegenerate?: () => void;
}

const businessTypeEmojis: Record<string, string> = {
  food: '🍕',
  toys: '🎮',
  art: '🎨',
  pets: '🐾',
  fashion: '👗',
  nature: '🌸',
};

const businessTypeGradients: Record<string, string> = {
  food: 'from-orange-500 to-red-500',
  toys: 'from-blue-500 to-indigo-500',
  art: 'from-purple-500 to-pink-500',
  pets: 'from-amber-500 to-orange-500',
  fashion: 'from-pink-500 to-rose-500',
  nature: 'from-green-500 to-emerald-500',
};

const vibeDescriptions: Record<string, string> = {
  colorful: 'vibrant and joyful',
  modern: 'sleek and sophisticated',
  cozy: 'warm and inviting',
  fancy: 'elegant and luxurious',
  playful: 'fun and whimsical',
};

export const ShopRevealModal = ({
  isOpen,
  answers,
  onClose,
  onConfirm,
  onRegenerate,
}: ShopRevealModalProps) => {
  const [stage, setStage] = useState<'loading' | 'reveal' | 'celebrate'>('loading');
  const [showConfetti, setShowConfetti] = useState(false);
  const [generatedShop, setGeneratedShop] = useState<GeneratedShop | null>(null);

  useEffect(() => {
    if (isOpen && answers.businessType && answers.shopVibe && answers.superpower) {
      setStage('loading');

      // Simulate shop generation (in reality, this happens quickly)
      const generateTimer = setTimeout(() => {
        const shop = generateShop({
          businessType: answers.businessType as BusinessType,
          shopVibe: answers.shopVibe as ShopVibe,
          colors: answers.colors,
          superpower: answers.superpower as any,
          shopName: answers.shopName,
        });
        setGeneratedShop(shop);
        setStage('reveal');

        // Trigger celebration after reveal animation
        setTimeout(() => {
          setShowConfetti(true);
          setStage('celebrate');
        }, 1500);
      }, 2000);

      return () => clearTimeout(generateTimer);
    }
  }, [isOpen, answers]);

  const handleConfirm = () => {
    setShowConfetti(true);
    setTimeout(() => {
      onConfirm();
    }, 500);
  };

  if (!isOpen) return null;

  const emoji = answers.businessType ? businessTypeEmojis[answers.businessType] : '🏪';
  const gradient = answers.businessType ? businessTypeGradients[answers.businessType] : 'from-cyan-500 to-blue-500';
  const vibeDesc = answers.shopVibe ? vibeDescriptions[answers.shopVibe] : 'amazing';

  return (
    <>
      {showConfetti && <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="max-w-2xl w-full bg-gradient-to-br from-[#1a2a4a] via-[#2a1a3a] to-[#1a3a4a] rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden my-4"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <AnimatePresence mode="wait">
            {/* Loading Stage */}
            {stage === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-10 text-center py-12"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-8xl mb-8 inline-block"
                >
                  ✨
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Creating Your Dream Shop...
                </h2>

                <p className="text-lg text-white/70 mb-8">
                  Adding magic touches to make it perfect!
                </p>

                <div className="flex justify-center gap-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -10, 0],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                      className="w-3 h-3 rounded-full bg-cyan-400"
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Reveal Stage */}
            {(stage === 'reveal' || stage === 'celebrate') && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10"
              >
                {/* Shop Image/Preview */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="mb-8"
                >
                  <div
                    className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${gradient} shadow-2xl border-4 border-white/20`}
                    style={{
                      filter: answers.shopVibe ? getVibeFilter(answers.shopVibe as ShopVibe) : undefined,
                    }}
                  >
                    {/* Shop Preview Visualization */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                      {/* Shop Sign */}
                      <motion.div
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white/90 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-xl mb-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{emoji}</span>
                          <h3 className="text-2xl md:text-3xl font-black text-gray-800">
                            {answers.shopName}
                          </h3>
                        </div>
                      </motion.div>

                      {/* Shop Building Representation */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: 'spring' }}
                        className="relative"
                      >
                        <div className="text-9xl">{emoji}</div>
                        <motion.div
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute -top-4 -right-4 text-3xl"
                        >
                          ✨
                        </motion.div>
                      </motion.div>

                      {/* Theme colors preview */}
                      {generatedShop && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                          className="flex gap-2 mt-4"
                        >
                          {answers.colors.map((colorId, index) => (
                            <motion.div
                              key={colorId}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 1.2 + index * 0.1 }}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-lg"
                              style={{
                                backgroundColor:
                                  generatedShop.themeColors[
                                    index === 0 ? 'primary' : index === 1 ? 'secondary' : 'accent'
                                  ],
                              }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Decorative elements */}
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute top-4 left-4 text-2xl"
                    >
                      ⭐
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 5, 0] }}
                      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                      className="absolute top-4 right-4 text-2xl"
                    >
                      💫
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      className="absolute bottom-4 left-1/4 text-xl"
                    >
                      🌟
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 3, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, delay: 0.3 }}
                      className="absolute bottom-4 right-1/4 text-xl"
                    >
                      ✨
                    </motion.div>
                  </div>
                </motion.div>

                {/* Celebration Message */}
                {stage === 'celebrate' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mb-4"
                    >
                      <Star className="w-6 h-6 text-white fill-white" />
                      <span className="text-xl font-bold text-white">This is YOUR shop!</span>
                      <Star className="w-6 h-6 text-white fill-white" />
                    </motion.div>

                    <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                      Welcome to{' '}
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {answers.shopName}
                      </span>
                    </h2>

                    <p className="text-white/70">
                      A {vibeDesc} shop where you'll make your entrepreneurship dreams come true!
                    </p>
                  </motion.div>
                )}

                {/* Action Buttons */}
                {stage === 'celebrate' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row justify-center gap-4"
                  >
                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Try Different Style
                      </button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="px-8 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
                    >
                      <Rocket className="w-6 h-6" />
                      Start Building!
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};
