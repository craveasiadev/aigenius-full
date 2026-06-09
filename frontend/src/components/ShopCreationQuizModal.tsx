import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Store, Sparkles, X, Check, Star } from 'lucide-react';
import { Confetti } from './Confetti';

// Business types based on passion
export type BusinessType = 'food' | 'toys' | 'art' | 'pets' | 'fashion' | 'nature';

// Shop vibe/theme
export type ShopVibe = 'colorful' | 'modern' | 'cozy' | 'fancy' | 'playful';

// Shop superpower/USP
export type ShopSuperpower = 'happiness' | 'creativity' | 'eco' | 'quality';

export interface QuizAnswers {
  businessType: BusinessType | null;
  shopVibe: ShopVibe | null;
  colors: string[];
  superpower: ShopSuperpower | null;
  shopName: string;
}

interface ShopCreationQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (answers: QuizAnswers) => void;
  studentName?: string;
}

const businessTypeOptions = [
  { id: 'food', icon: '🍕', label: 'Yummy food & treats', gradient: 'from-orange-400 to-red-400' },
  { id: 'toys', icon: '🎮', label: 'Cool toys & games', gradient: 'from-blue-400 to-indigo-400' },
  { id: 'art', icon: '🎨', label: 'Pretty art & crafts', gradient: 'from-purple-400 to-pink-400' },
  { id: 'pets', icon: '🐾', label: 'Cute animals & pets', gradient: 'from-amber-400 to-orange-400' },
  { id: 'fashion', icon: '👗', label: 'Fun fashion & clothes', gradient: 'from-pink-400 to-rose-400' },
  { id: 'nature', icon: '🌸', label: 'Nature & flowers', gradient: 'from-green-400 to-emerald-400' },
];

const shopVibeOptions = [
  { id: 'colorful', icon: '🌈', label: 'Colorful & Fun!', description: 'Rainbow colors everywhere', gradient: 'from-red-400 via-yellow-400 to-blue-400' },
  { id: 'modern', icon: '✨', label: 'Cool & Modern!', description: 'Sleek & techy vibes', gradient: 'from-slate-400 to-cyan-400' },
  { id: 'cozy', icon: '🏡', label: 'Natural & Cozy!', description: 'Plants & wood', gradient: 'from-amber-500 to-green-500' },
  { id: 'fancy', icon: '💎', label: 'Fancy & Sparkly!', description: 'Elegant & glamorous', gradient: 'from-purple-400 to-pink-400' },
  { id: 'playful', icon: '🧸', label: 'Playful & Cute!', description: 'Soft & sweet', gradient: 'from-pink-300 to-purple-300' },
];

const colorPalettes = [
  { id: 'red', color: '#EF4444', name: 'Red' },
  { id: 'orange', color: '#F97316', name: 'Orange' },
  { id: 'yellow', color: '#EAB308', name: 'Yellow' },
  { id: 'green', color: '#22C55E', name: 'Green' },
  { id: 'cyan', color: '#06B6D4', name: 'Cyan' },
  { id: 'blue', color: '#3B82F6', name: 'Blue' },
  { id: 'purple', color: '#8B5CF6', name: 'Purple' },
  { id: 'pink', color: '#EC4899', name: 'Pink' },
  { id: 'white', color: '#FFFFFF', name: 'White' },
  { id: 'black', color: '#1F2937', name: 'Black' },
];

const superpowerOptions = [
  { id: 'happiness', icon: '😊', label: 'Making people happy!', description: 'Spread joy to everyone', gradient: 'from-yellow-400 to-orange-400' },
  { id: 'creativity', icon: '💡', label: 'Super creative stuff!', description: 'Unique & original ideas', gradient: 'from-purple-400 to-blue-400' },
  { id: 'eco', icon: '🌍', label: 'Helping the planet!', description: 'Eco-friendly & sustainable', gradient: 'from-green-400 to-teal-400' },
  { id: 'quality', icon: '⭐', label: 'Best quality ever!', description: 'Premium & perfect', gradient: 'from-amber-400 to-yellow-400' },
];

const generateShopNameSuggestions = (businessType: BusinessType | null, studentName: string): string[] => {
  const firstName = studentName.split(' ')[0] || 'My';

  const suggestions: Record<BusinessType, string[]> = {
    food: [`${firstName}'s Yummy Kitchen`, `${firstName}'s Treat Shop`, `Super Snacks by ${firstName}`, `${firstName}'s Food Factory`],
    toys: [`${firstName}'s Game Zone`, `${firstName}'s Toy Box`, `Fun Factory by ${firstName}`, `${firstName}'s Play Palace`],
    art: [`${firstName}'s Art Studio`, `Creative Corner by ${firstName}`, `${firstName}'s Masterpieces`, `Rainbow Art by ${firstName}`],
    pets: [`${firstName}'s Pet Paradise`, `Happy Paws by ${firstName}`, `${firstName}'s Animal Kingdom`, `Furry Friends Shop`],
    fashion: [`${firstName}'s Fashion House`, `Style Studio by ${firstName}`, `${firstName}'s Boutique`, `Trendy by ${firstName}`],
    nature: [`${firstName}'s Garden`, `Green Dreams by ${firstName}`, `${firstName}'s Flower Shop`, `Nature's Magic by ${firstName}`],
  };

  return businessType ? suggestions[businessType] : [`${firstName}'s Dream Shop`, `${firstName}'s Amazing Store`, `Super Shop by ${firstName}`];
};

export const ShopCreationQuizModal = ({
  isOpen,
  onClose,
  onComplete,
  studentName = 'Friend'
}: ShopCreationQuizModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    businessType: null,
    shopVibe: null,
    colors: [],
    superpower: null,
    shopName: '',
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (answers.businessType) {
      setNameSuggestions(generateShopNameSuggestions(answers.businessType, studentName));
    }
  }, [answers.businessType, studentName]);

  const totalSteps = 6;

  const handleBusinessTypeSelect = (type: BusinessType) => {
    setAnswers(prev => ({ ...prev, businessType: type }));
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
      setCurrentStep(1);
    }, 800);
  };

  const handleVibeSelect = (vibe: ShopVibe) => {
    setAnswers(prev => ({ ...prev, shopVibe: vibe }));
    setCurrentStep(2);
  };

  const handleColorToggle = (colorId: string) => {
    setAnswers(prev => {
      const newColors = prev.colors.includes(colorId)
        ? prev.colors.filter(c => c !== colorId)
        : prev.colors.length < 3
          ? [...prev.colors, colorId]
          : prev.colors;
      return { ...prev, colors: newColors };
    });
  };

  const handleSuperpowerSelect = (power: ShopSuperpower) => {
    setAnswers(prev => ({ ...prev, superpower: power }));
    setCurrentStep(4);
  };

  const handleShopNameSelect = (name: string) => {
    setAnswers(prev => ({ ...prev, shopName: name }));
  };

  const handleComplete = () => {
    if (!answers.shopName) return;

    setIsSubmitting(true);
    setShowConfetti(true);

    // Just pass the answers to the parent component
    // The parent (AIpreneurDashboard) will handle saving via Laravel API
    setTimeout(() => {
      onComplete({
        businessType: answers.businessType,
        shopVibe: answers.shopVibe,
        colors: answers.colors,
        superpower: answers.superpower,
        shopName: answers.shopName,
      });
      setIsSubmitting(false);
    }, 1500);
  };

  const canProceedFromColors = answers.colors.length >= 2;
  const canProceedToComplete = answers.shopName.trim().length >= 3;

  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (currentStep) {
      // Step 1: Business Type
      case 0:
        return (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="text-6xl mb-6 text-center"
            >
              🌟
            </motion.div>

            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              What do you LOVE the most?
            </h1>

            <p className="text-lg mb-8 text-center text-white/80">
              Hey {studentName}! Pick what makes you excited!
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {businessTypeOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleBusinessTypeSelect(option.id as BusinessType)}
                  className={`bg-gradient-to-br ${option.gradient} rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all border-4 border-white/20 hover:border-white/40`}
                >
                  <span className="text-4xl md:text-5xl">{option.icon}</span>
                  <span className="text-sm md:text-base font-bold text-white text-center">
                    {option.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        );

      // Step 2: Shop Vibe
      case 1:
        return (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <div className="text-5xl mb-4 text-center">🏪</div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              What's your dream shop like?
            </h1>

            <p className="text-lg mb-8 text-center text-white/80">
              Pick the vibe that feels right!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shopVibeOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleVibeSelect(option.id as ShopVibe)}
                  className={`bg-gradient-to-br ${option.gradient} rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all border-4 border-white/20 hover:border-white/50`}
                >
                  <span className="text-4xl">{option.icon}</span>
                  <span className="text-lg font-bold text-white">{option.label}</span>
                  <span className="text-sm text-white/80">{option.description}</span>
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => setCurrentStep(0)}
              className="mt-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </motion.div>
        );

      // Step 3: Colors
      case 2:
        return (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <div className="text-5xl mb-4 text-center">🎨</div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-red-400 via-yellow-400 to-blue-400 bg-clip-text text-transparent">
              Pick your favorite colors!
            </h1>

            <p className="text-lg mb-8 text-center text-white/80">
              Choose 2-3 colors for your shop theme
            </p>

            <div className="grid grid-cols-5 gap-3 max-w-md mx-auto mb-8">
              {colorPalettes.map((color) => (
                <motion.button
                  key={color.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleColorToggle(color.id)}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-xl shadow-lg transition-all ${answers.colors.includes(color.id)
                      ? 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-110'
                      : 'hover:ring-2 hover:ring-white/50'
                    }`}
                  style={{ backgroundColor: color.color }}
                >
                  {answers.colors.includes(color.id) && (
                    <Check className="w-6 h-6 mx-auto text-white drop-shadow-lg" />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-sm text-white/60">Selected:</span>
              <div className="flex gap-2">
                {answers.colors.map(colorId => {
                  const color = colorPalettes.find(c => c.id === colorId);
                  return color ? (
                    <div
                      key={colorId}
                      className="w-6 h-6 rounded-full border-2 border-white"
                      style={{ backgroundColor: color.color }}
                    />
                  ) : null;
                })}
              </div>
              <span className="text-xs text-white/40">({answers.colors.length}/3)</span>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedFromColors}
                className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canProceedFromColors
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );

      // Step 4: Superpower
      case 3:
        return (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <div className="text-5xl mb-4 text-center">💪</div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              What's your shop's superpower?
            </h1>

            <p className="text-lg mb-8 text-center text-white/80">
              What makes your shop special?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {superpowerOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSuperpowerSelect(option.id as ShopSuperpower)}
                  className={`bg-gradient-to-br ${option.gradient} rounded-2xl p-5 flex items-center gap-4 shadow-xl hover:shadow-2xl transition-all border-4 border-white/20 hover:border-white/50`}
                >
                  <span className="text-4xl">{option.icon}</span>
                  <div className="text-left">
                    <span className="text-lg font-bold text-white block">{option.label}</span>
                    <span className="text-sm text-white/80">{option.description}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              className="mt-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </button>
          </motion.div>
        );

      // Step 5: Shop Name
      case 4:
        return (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <div className="text-5xl mb-4 text-center">
              {businessTypeOptions.find(b => b.id === answers.businessType)?.icon || '🏪'}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Name your dream shop!
            </h1>

            <p className="text-lg mb-6 text-center text-white/80">
              Pick a name or create your own!
            </p>

            <div className="max-w-lg mx-auto">
              <div className="relative mb-6">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400" />
                <input
                  type="text"
                  value={answers.shopName}
                  onChange={(e) => handleShopNameSelect(e.target.value)}
                  className="w-full pl-14 pr-4 py-4 text-xl rounded-2xl bg-white/10 border-2 border-cyan-400/30 focus:border-cyan-400 outline-none transition-all text-white placeholder-white/50"
                  placeholder="Enter your shop name..."
                  maxLength={50}
                />
              </div>

              <div className="mb-6">
                <p className="text-sm text-white/70 mb-3 flex items-center gap-2">
                  <span className="text-lg">💡</span>
                  Try these fun names:
                </p>
                <div className="flex flex-wrap gap-2">
                  {nameSuggestions.map((name, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleShopNameSelect(name)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${answers.shopName === name
                          ? 'bg-cyan-500 text-white border-2 border-white'
                          : 'bg-white/10 hover:bg-white/20 border-2 border-cyan-400/30 hover:border-cyan-400 text-white'
                        }`}
                    >
                      {name}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  disabled={!canProceedToComplete}
                  className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${canProceedToComplete
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:opacity-90'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        );

      // Step 6: Confirmation
      case 5:
        const businessOption = businessTypeOptions.find(b => b.id === answers.businessType);
        const vibeOption = shopVibeOptions.find(v => v.id === answers.shopVibe);
        const superpowerOption = superpowerOptions.find(s => s.id === answers.superpower);

        return (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6 }}
              className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center"
            >
              <Star className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Ready to see your shop?
            </h1>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 max-w-lg mx-auto border-2 border-green-400/30">
              <div className="text-center mb-4">
                <span className="text-5xl">{businessOption?.icon}</span>
                <h2 className="text-2xl font-bold text-white mt-2">{answers.shopName}</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/60">Type</span>
                  <span className="text-white font-semibold">{businessOption?.label}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/60">Vibe</span>
                  <span className="text-white font-semibold flex items-center gap-2">
                    {vibeOption?.icon} {vibeOption?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/10">
                  <span className="text-white/60">Colors</span>
                  <div className="flex gap-1">
                    {answers.colors.map(colorId => {
                      const color = colorPalettes.find(c => c.id === colorId);
                      return color ? (
                        <div
                          key={colorId}
                          className="w-5 h-5 rounded-full border border-white"
                          style={{ backgroundColor: color.color }}
                        />
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/60">Superpower</span>
                  <span className="text-white font-semibold flex items-center gap-2">
                    {superpowerOption?.icon} {superpowerOption?.label.replace('!', '')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold flex items-center gap-2 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Change
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isSubmitting}
                className="px-8 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-3 text-white disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create My Shop!
                    <Sparkles className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {showConfetti && <Confetti show={showConfetti} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-4xl w-full bg-gradient-to-br from-[#1a3a4a] via-[#2a1a3a] to-[#1a2a4a] rounded-3xl p-6 md:p-10 text-white shadow-2xl relative overflow-hidden my-4"
        >
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Progress indicator */}
          <div className="relative z-10 mb-8">
            <div className="flex justify-center gap-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${index === currentStep
                      ? 'w-8 bg-cyan-400'
                      : index < currentStep
                        ? 'bg-green-400'
                        : 'bg-white/20'
                    }`}
                />
              ))}
            </div>
            <p className="text-center text-sm text-white/50 mt-2">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};
