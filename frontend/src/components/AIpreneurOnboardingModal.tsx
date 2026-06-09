import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Store, Star, CheckCircle } from 'lucide-react';
import { generateShopNames, validateShopName } from '../utils/shopNameGenerator';
import { Confetti } from './Confetti';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

type PassionCategory = 'ice_cream' | 'pets' | 'games' | 'bakery' | 'cars' | 'drinks' | 'art' | 'nature';

interface PassionOption {
  id: PassionCategory;
  icon: string;
  label: string;
  gradient: string;
}

interface AIpreneurOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const passionOptions: PassionOption[] = [
  { id: 'ice_cream', icon: '🍦', label: 'Ice Cream', gradient: 'from-yellow-400 to-orange-400' },
  { id: 'pets', icon: '🐶', label: 'Pets', gradient: 'from-orange-400 to-pink-400' },
  { id: 'games', icon: '🎮', label: 'Games', gradient: 'from-blue-400 to-cyan-400' },
  { id: 'bakery', icon: '🧁', label: 'Bakery', gradient: 'from-pink-400 to-rose-400' },
  { id: 'cars', icon: '🚗', label: 'Cars', gradient: 'from-red-400 to-orange-500' },
  { id: 'drinks', icon: '🥤', label: 'Drinks', gradient: 'from-cyan-400 to-blue-400' },
  { id: 'art', icon: '🎨', label: 'Art', gradient: 'from-purple-400 to-pink-400' },
  { id: 'nature', icon: '🌿', label: 'Nature', gradient: 'from-green-400 to-emerald-400' },
];

export const AIpreneurOnboardingModal = ({
  isOpen,
  onClose,
  onComplete
}: AIpreneurOnboardingModalProps) => {
  const { geniusProfile, completeOnboarding } = useGeniusAuth();
  const [stage, setStage] = useState<'passion' | 'shop-name' | 'ready' | 'saving'>('passion');
  const [selectedPassion, setSelectedPassion] = useState<PassionCategory | null>(null);
  const [studentName, setStudentName] = useState('');
  const [shopName, setShopName] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ name: string; emoji: string }>>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && geniusProfile) {
      setStudentName(geniusProfile.first_name);
    }
  }, [isOpen, geniusProfile]);

  const handlePassionSelect = (passion: PassionCategory) => {
    setSelectedPassion(passion);
    setShowConfetti(true);

    setTimeout(() => {
      setShowConfetti(false);
      const shopSuggestions = generateShopNames(studentName, passion, 5);
      setSuggestions(shopSuggestions);
      setShopName(shopSuggestions[0]?.name || '');
      setStage('shop-name');
    }, 1500);
  };

  const handleShopNameSubmit = () => {
    const validation = validateShopName(shopName);
    if (!validation.valid) {
      setError(validation.error || 'Invalid shop name');
      return;
    }

    setError('');
    setShowConfetti(true);

    setTimeout(() => {
      setShowConfetti(false);
      setStage('ready');
    }, 1500);
  };

  const handleComplete = async () => {
    if (!selectedPassion || !shopName) return;

    setStage('saving');

    try {
      const success = await completeOnboarding({
        passion_category: selectedPassion,
        aipreneur_shop_name: shopName,
        questionnaire_answers: {
          passion_category: selectedPassion,
          shop_theme: 'fun_colorful',
          vibe: 'fun_colorful',
        },
      });

      if (!success) {
        setError('Failed to save your choices. Please try again.');
        setStage('ready');
        return;
      }

      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (err) {
      console.error('Error in handleComplete:', err);
      setError('An unexpected error occurred');
      setStage('ready');
    }
  };

  if (!isOpen) return null;

  // Stage 1: Passion Selection
  if (stage === 'passion') {
    return (
      <>
        {showConfetti && <Confetti />}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="max-w-5xl w-full bg-gradient-to-br from-[#1a3a4a] via-[#2a1a3a] to-[#1a2a4a] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="text-6xl mb-6 text-center"
              >
                ✨
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-6xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent"
              >
                What's Your Passion?
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl md:text-2xl mb-2 text-center text-cyan-300"
              >
                Hey {studentName}! 👋
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg mb-12 text-center text-white/80"
              >
                Pick what makes you excited!
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
              >
                {passionOptions.map((option, index) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePassionSelect(option.id)}
                    className={`bg-gradient-to-br ${option.gradient} rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all border-4 border-white/20 hover:border-white/40`}
                  >
                    <span className="text-5xl md:text-6xl">{option.icon}</span>
                    <span className="text-lg md:text-xl font-bold text-white">
                      {option.label}
                    </span>
                  </motion.button>
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center mt-8 text-cyan-300 font-semibold flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Each choice opens a magical new world!
                <Sparkles className="w-5 h-5" />
              </motion.p>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Stage 2: Shop Naming
  if (stage === 'shop-name') {
    const selectedOption = passionOptions.find(p => p.id === selectedPassion);

    return (
      <>
        {showConfetti && <Confetti />}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="max-w-3xl w-full bg-gradient-to-br from-[#2a1a4a] via-[#1a3a5a] to-[#2a2a5a] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="text-6xl mb-6 text-center"
              >
                {selectedOption?.icon}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent"
              >
                Name Your Shop!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-lg mb-8 text-center text-white/80"
              >
                What will you call your amazing business?
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400" />
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      setError('');
                    }}
                    className="w-full pl-14 pr-4 py-4 text-xl rounded-2xl bg-white/10 border-2 border-cyan-400/30 focus:border-cyan-400 outline-none transition-all text-white placeholder-white/50"
                    placeholder="Enter your shop name..."
                    maxLength={50}
                  />
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-400 text-sm mt-2 ml-2"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
                <p className="text-sm text-white/70 mb-3 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  Need inspiration? Try these:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShopName(suggestion.name);
                        setError('');
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 border-2 border-cyan-400/30 hover:border-cyan-400 rounded-xl text-sm font-semibold transition-all"
                    >
                      {suggestion.emoji} {suggestion.name}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleShopNameSubmit}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
              >
                Continue
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Stage 3: Ready
  if (stage === 'ready') {
    const selectedOption = passionOptions.find(p => p.id === selectedPassion);

    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="max-w-3xl w-full bg-gradient-to-br from-[#1a4a3a] via-[#2a3a4a] to-[#1a3a4a] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-green-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6 }}
                className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
              >
                <Star className="w-12 h-12 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent"
              >
                Let's Get Ready for Business!
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 border-2 border-green-400/30"
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-4xl">{selectedOption?.icon}</span>
                  <Store className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-3xl font-bold text-center text-white mb-2">
                  {shopName}
                </p>
                <p className="text-sm text-center text-white/60">Your AIpreneur Shop</p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-center mb-8 text-white/80"
              >
                Now let's discover your superpowers with a quick personality quiz!
              </motion.p>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-center mb-4"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                className="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
              >
                Let's Go!
                <Sparkles className="w-6 h-6" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Stage: Saving
  if (stage === 'saving') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl p-12 text-white text-center shadow-2xl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-6 border-4 border-white/30 border-t-white rounded-full"
          />
          <h2 className="text-2xl font-bold mb-4">Setting up your shop...</h2>
          <p className="text-lg opacity-90">This will only take a moment!</p>
        </motion.div>
      </div>
    );
  }

  return null;
};
