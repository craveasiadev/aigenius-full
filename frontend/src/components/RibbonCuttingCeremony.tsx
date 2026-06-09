import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Sparkles, Star, PartyPopper, Trophy, X } from 'lucide-react';
import { simulatorApi } from '../services/aipreneurApi';
import confetti from 'canvas-confetti';

type CeremonyStage = 'intro' | 'cutting' | 'celebration' | 'rewards';

interface RibbonCuttingCeremonyProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  shopName: string;
}

export const RibbonCuttingCeremony = ({
  isOpen,
  onClose,
  onComplete,
  shopName,
}: RibbonCuttingCeremonyProps) => {
  const [stage, setStage] = useState<CeremonyStage>('intro');
  const [ribbonCut, setRibbonCut] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rewards, setRewards] = useState<{ ai_tokens: number; xp: number } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStage('intro');
      setRibbonCut(false);
      setLoading(false);
      setRewards(null);
    }
  }, [isOpen]);

  // Fire confetti
  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'];

    (function frame() {
      confetti({
        particleCount: 7,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
      });
      confetti({
        particleCount: 7,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  // Handle ribbon cut
  const handleRibbonCut = async () => {
    if (ribbonCut || loading) return;

    setLoading(true);
    setRibbonCut(true);

    try {
      const response = await simulatorApi.completeRibbonCutting();

      if (response.success) {
        setRewards(response.rewards || { ai_tokens: 5, xp: 200 });

        // Wait a moment then show celebration
        setTimeout(() => {
          setStage('celebration');
          fireConfetti();

          // After celebration, show rewards
          setTimeout(() => {
            setStage('rewards');
          }, 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to complete ribbon cutting:', error);
      setRibbonCut(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle complete
  const handleComplete = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        {/* Close button */}
        {stage !== 'cutting' && !loading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Intro Stage */}
        {stage === 'intro' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-lg mx-auto p-8"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl mb-6"
            >
              🎊
            </motion.div>

            <h1 className="text-5xl font-black text-white mb-4 uppercase tracking-wider">
              Grand Opening!
            </h1>

            <p className="text-xl text-gray-300 mb-8">
              Congratulations! You've completed all the preparations for
              <span className="text-yellow-400 font-bold"> {shopName}</span>!
            </p>

            <p className="text-lg text-purple-300 mb-8">
              It's time for the ribbon cutting ceremony!
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setStage('cutting')}
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-xl font-bold text-xl text-white shadow-lg shadow-orange-500/30"
            >
              <span className="flex items-center gap-2">
                <Scissors className="w-6 h-6" />
                Let's Cut the Ribbon!
              </span>
            </motion.button>
          </motion.div>
        )}

        {/* Cutting Stage */}
        {stage === 'cutting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full max-w-2xl mx-auto p-8 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-8">
              Click to cut the ribbon!
            </h2>

            {/* Ribbon */}
            <div className="relative h-40 flex items-center justify-center my-8">
              {/* Left side */}
              <motion.div
                animate={ribbonCut ? { x: -100, rotate: -20, opacity: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="absolute left-0 w-1/2 h-8 bg-gradient-to-r from-red-600 to-red-500 rounded-l-full origin-right"
                style={{ right: '50%' }}
              />

              {/* Right side */}
              <motion.div
                animate={ribbonCut ? { x: 100, rotate: 20, opacity: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="absolute right-0 w-1/2 h-8 bg-gradient-to-l from-red-600 to-red-500 rounded-r-full origin-left"
                style={{ left: '50%' }}
              />

              {/* Scissors button */}
              <motion.button
                whileHover={!ribbonCut ? { scale: 1.2 } : {}}
                whileTap={!ribbonCut ? { scale: 0.9 } : {}}
                onClick={handleRibbonCut}
                disabled={ribbonCut || loading}
                className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  ribbonCut
                    ? 'bg-green-500 cursor-default'
                    : 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:shadow-xl hover:shadow-orange-500/50 cursor-pointer'
                }`}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
                  />
                ) : ribbonCut ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-4xl"
                  >
                    ✂️
                  </motion.div>
                ) : (
                  <Scissors className="w-12 h-12 text-white" />
                )}
              </motion.button>

              {/* Sparkle effects */}
              {ribbonCut && (
                <>
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, scale: 0 }}
                      animate={{
                        opacity: 0,
                        scale: 2,
                        x: (Math.random() - 0.5) * 200,
                        y: (Math.random() - 0.5) * 200,
                      }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className="absolute"
                    >
                      <Sparkles className="w-8 h-8 text-yellow-400" />
                    </motion.div>
                  ))}
                </>
              )}
            </div>

            {!ribbonCut && (
              <p className="text-purple-300 animate-pulse">
                Click the scissors to cut!
              </p>
            )}
          </motion.div>
        )}

        {/* Celebration Stage */}
        {stage === 'celebration' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-lg mx-auto p-8"
          >
            <motion.div
              animate={{
                y: [0, -20, 0],
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-9xl mb-6"
            >
              🎉
            </motion.div>

            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 mb-4"
            >
              CONGRATULATIONS!
            </motion.h1>

            <motion.p
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-white"
            >
              {shopName} is now OPEN!
            </motion.p>

            {/* Floating emojis */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight + 50,
                    rotate: 0,
                  }}
                  animate={{
                    y: -100,
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 2,
                    ease: 'linear',
                  }}
                  className="absolute text-4xl"
                >
                  {['🎈', '🎊', '⭐', '✨', '🎁'][Math.floor(Math.random() * 5)]}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Rewards Stage */}
        {stage === 'rewards' && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-lg mx-auto p-8 bg-gradient-to-br from-purple-900/90 to-indigo-900/90 rounded-3xl border border-purple-500/30 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-7xl mb-4"
            >
              <Trophy className="w-20 h-20 mx-auto text-yellow-400" />
            </motion.div>

            <h2 className="text-3xl font-bold text-white mb-2">
              Grand Opening Rewards!
            </h2>

            <p className="text-purple-300 mb-6">
              You've earned these rewards for opening your shop!
            </p>

            <div className="flex justify-center gap-8 mb-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-5xl mb-2">🪙</div>
                <div className="text-3xl font-bold text-yellow-400">
                  +{rewards?.ai_tokens || 5}
                </div>
                <div className="text-sm text-purple-300">AI Tokens</div>
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <div className="text-5xl mb-2">⭐</div>
                <div className="text-3xl font-bold text-blue-400">
                  +{rewards?.xp || 200}
                </div>
                <div className="text-sm text-purple-300">XP</div>
              </motion.div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-xl text-white shadow-lg"
            >
              <span className="flex items-center gap-2">
                <PartyPopper className="w-6 h-6" />
                Start Running My Shop!
              </span>
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default RibbonCuttingCeremony;
