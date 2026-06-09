import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, ShoppingBag, Megaphone, Lightbulb, CheckCircle,
  Palette, Users, Heart, PiggyBank, Sparkles
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  emoji: string;
  targetId?: string;
  actionLabel?: string;
  action?: () => void;
  gradient: string;
}

interface AIpreneurTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onViewShop: () => void;
  onNavigateToProduct: () => void;
  onNavigateToMarketing: () => void;
  onNavigateToInnovation: () => void;
  onNavigateToDecorate?: () => void;
  onNavigateToOperation?: () => void;
  onNavigateToCSR?: () => void;
  isShopGenerated?: boolean;
}

// Floating particle for background effect
const FloatingEmoji = ({ emoji, delay }: { emoji: string; delay: number }) => (
  <motion.div
    className="absolute text-3xl pointer-events-none"
    initial={{ opacity: 0, y: 100, x: Math.random() * 100 - 50 }}
    animate={{
      opacity: [0, 1, 0],
      y: -100,
      x: Math.random() * 100 - 50,
      rotate: [0, 360]
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 2
    }}
    style={{ left: `${Math.random() * 100}%`, bottom: '10%' }}
  >
    {emoji}
  </motion.div>
);

export const AIpreneurTutorial = ({
  isOpen,
  onClose,
  onViewShop,
  onNavigateToProduct,
  onNavigateToMarketing,
  onNavigateToInnovation,
  onNavigateToDecorate,
  onNavigateToOperation,
  onNavigateToCSR,
  isShopGenerated = false
}: AIpreneurTutorialProps) => {
  const { geniusProfile } = useGeniusAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Build steps dynamically based on shop status
  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: `Hey ${geniusProfile?.first_name || 'there'}!`,
      description: "Welcome to your AI-powered business empire! I'm your guide to becoming a super AIpreneur. Ready to build something amazing?",
      icon: Sparkles,
      emoji: '🚀',
      gradient: 'from-cyan-500 to-blue-600',
      actionLabel: "Let's Go!",
    },
    {
      id: 'view_shop',
      title: 'Your Shop World',
      description: isShopGenerated
        ? "This is your shop! Watch customers visit, see sales happen in real-time, and customize your space!"
        : "First, let's create your shop! Click the banner to take a selfie and AI will design your unique shop!",
      icon: ShoppingBag,
      emoji: '🏪',
      gradient: 'from-violet-500 to-purple-600',
      targetId: 'view-shop-btn',
      actionLabel: isShopGenerated ? "Cool!" : "Next",
      action: isShopGenerated ? onViewShop : undefined
    },
    {
      id: 'create_products',
      title: 'Create Products',
      description: "Design your first products! Whether it's toys, food, art, or gadgets - let your imagination run wild!",
      icon: ShoppingBag,
      emoji: '📦',
      gradient: 'from-blue-500 to-cyan-500',
      targetId: 'module-product',
      actionLabel: "Go Create!",
      action: onNavigateToProduct
    },
    // {
    //   id: 'decorate',
    //   title: 'Style Your Shop',
    //   description: isShopGenerated
    //     ? "Make your shop unique! Add furniture, cool decorations, and create the perfect vibe for your customers!"
    //     : "Once your shop is ready, you can decorate it with amazing stuff!",
    //   icon: Palette,
    //   emoji: '🎨',
    //   gradient: 'from-pink-500 to-rose-500',
    //   targetId: 'module-decorate',
    //   actionLabel: isShopGenerated ? "Decorate!" : "Next",
    //   action: isShopGenerated ? onNavigateToDecorate : undefined
    // },
    // {
    //   id: 'operation',
    //   title: 'Build Your Team',
    //   description: "Hire awesome staff to help run your shop! Interview candidates and build the dream team!",
    //   icon: Users,
    //   emoji: '👥',
    //   gradient: 'from-violet-500 to-fuchsia-500',
    //   targetId: 'module-operation',
    //   actionLabel: "Hire Staff!",
    //   action: onNavigateToOperation
    // },
    // {
    //   id: 'marketing',
    //   title: 'Spread the Word',
    //   description: "Want more customers? Run marketing campaigns, hire influencers, and watch your shop go viral!",
    //   icon: Megaphone,
    //   emoji: '📣',
    //   gradient: 'from-amber-500 to-orange-500',
    //   targetId: 'module-marketing',
    //   actionLabel: "Start Marketing!",
    //   action: onNavigateToMarketing
    // },
    // {
    //   id: 'innovation',
    //   title: 'Tech Lab',
    //   description: "Unlock futuristic tech! Add AI kiosks, smart screens, and automation to level up your shop!",
    //   icon: Lightbulb,
    //   emoji: '💡',
    //   gradient: 'from-emerald-500 to-green-500',
    //   targetId: 'module-innovation',
    //   actionLabel: "Innovate!",
    //   action: onNavigateToInnovation
    // },
    // {
    //   id: 'csr',
    //   title: 'Give Back',
    //   description: "Be a hero! Donate to causes you care about and make the world a better place!",
    //   icon: Heart,
    //   emoji: '❤️',
    //   gradient: 'from-red-500 to-pink-500',
    //   targetId: 'module-csr',
    //   actionLabel: "Help Others!",
    //   action: onNavigateToCSR
    // },
    {
      id: 'finance',
      title: 'Track Money',
      description: "Keep an eye on your coins, sales, and profits in the sidebar. Watch your empire grow!",
      icon: PiggyBank,
      emoji: '💰',
      gradient: 'from-yellow-500 to-amber-500',
      actionLabel: "Got It!",
    },
    {
      id: 'finish',
      title: "You're Ready!",
      description: isShopGenerated
        ? "That's everything! Now go explore, complete quests, and build the coolest shop ever!"
        : "Almost there! Create your shop to unlock all features and start your journey!",
      icon: CheckCircle,
      emoji: '🎉',
      gradient: 'from-green-500 to-emerald-500',
      actionLabel: "Start My Journey!",
      action: onClose
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Effect to locate target element and update highlight rect
  useEffect(() => {
    if (!isOpen) return;

    if (currentStep.targetId) {
      const updatePosition = () => {
        const element = document.getElementById(currentStep.targetId!);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
        } else {
          setTargetRect(null);
        }
      };

      const timer = setTimeout(updatePosition, 100);
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setTargetRect(null);
    }
  }, [currentStepIndex, isOpen, currentStep.targetId]);

  const handleNext = () => {
    if (currentStep.action) {
      currentStep.action();
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } else {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        onClose();
      }
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!isOpen) return null;

  const Icon = currentStep.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-hidden"
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#030014]/95 via-[#0a0a20]/95 to-[#030014]/95 backdrop-blur-md" />

        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.3, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
          />

          {/* Floating emojis */}
          {['✨', '🌟', '💫', '⭐', '🎯', '🏆'].map((emoji, i) => (
            <FloatingEmoji key={i} emoji={emoji} delay={i * 0.5} />
          ))}

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Spotlight highlight for target element */}
        {targetRect && (
          <>
            {/* Cutout mask using multiple divs */}
            <div className="absolute top-0 left-0 right-0 bg-black/60 transition-all duration-500"
              style={{ height: targetRect.top - 12 }} />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 transition-all duration-500"
              style={{ top: targetRect.bottom + 12 }} />
            <div className="absolute left-0 bg-black/60 transition-all duration-500"
              style={{ top: targetRect.top - 12, height: targetRect.height + 24, width: targetRect.left - 12 }} />
            <div className="absolute right-0 bg-black/60 transition-all duration-500"
              style={{ top: targetRect.top - 12, height: targetRect.height + 24, left: targetRect.right + 12 }} />

            {/* Animated highlight border */}
            <motion.div
              className="absolute rounded-2xl pointer-events-none z-50"
              style={{
                top: targetRect.top - 12,
                left: targetRect.left - 12,
                width: targetRect.width + 24,
                height: targetRect.height + 24
              }}
              animate={{
                boxShadow: [
                  '0 0 0 3px rgba(6, 182, 212, 0.5), 0 0 30px rgba(6, 182, 212, 0.3)',
                  '0 0 0 3px rgba(139, 92, 246, 0.5), 0 0 30px rgba(139, 92, 246, 0.3)',
                  '0 0 0 3px rgba(6, 182, 212, 0.5), 0 0 30px rgba(6, 182, 212, 0.3)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </>
        )}

        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white text-sm font-medium backdrop-blur-md border border-white/10 transition-all"
        >
          <X className="w-4 h-4" />
          Skip
        </motion.button>

        {/* Main Tutorial Card */}
        <div className="absolute inset-0 flex items-center justify-center p-4 z-[60]">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md"
          >
            {/* Card glow effect */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${currentStep.gradient} rounded-3xl blur-xl opacity-30`} />

            {/* Main card */}
            <div className="relative bg-gradient-to-br from-[#1a1a2e]/90 to-[#16162a]/90 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
              {/* Top accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${currentStep.gradient}`} />

              <div className="p-6 pt-8">
                {/* Icon and emoji */}
                <div className="flex items-center justify-center mb-6">
                  <motion.div
                    className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${currentStep.gradient} flex items-center justify-center shadow-2xl`}
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Icon className="w-10 h-10 text-white" />

                    {/* Floating emoji */}
                    <motion.span
                      className="absolute -top-2 -right-2 text-2xl"
                      animate={{ y: [0, -5, 0], rotate: [0, 10, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      {currentStep.emoji}
                    </motion.span>
                  </motion.div>
                </div>

                {/* Step counter */}
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/50 font-medium">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                </div>

                {/* Title */}
                <motion.h2
                  className="text-2xl font-black text-center text-white mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={`title-${currentStep.id}`}
                >
                  {currentStep.title}
                </motion.h2>

                {/* Description */}
                <motion.p
                  className="text-center text-white/60 text-sm leading-relaxed mb-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  key={`desc-${currentStep.id}`}
                >
                  {currentStep.description}
                </motion.p>

                {/* Progress dots */}
                <div className="flex justify-center gap-1.5 mb-6">
                  {steps.map((_, idx) => (
                    <motion.div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentStepIndex
                          ? `w-8 bg-gradient-to-r ${currentStep.gradient}`
                          : idx < currentStepIndex
                            ? 'w-1.5 bg-white/30'
                            : 'w-1.5 bg-white/10'
                      }`}
                    />
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  {currentStepIndex > 0 && (
                    <button
                      onClick={handlePrev}
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold rounded-xl transition-all border border-white/5"
                    >
                      Back
                    </button>
                  )}

                  <motion.button
                    onClick={handleNext}
                    className={`flex-1 py-3.5 bg-gradient-to-r ${currentStep.gradient} text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {currentStep.actionLabel || 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Quick skip hint */}
                {currentStepIndex < 3 && (
                  <p className="text-center text-white/30 text-xs mt-4">
                    Press ESC or click Skip to close
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Keyboard listener */}
        <div
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
          }}
          className="absolute inset-0 outline-none"
          style={{ opacity: 0 }}
        />
      </motion.div>
    </AnimatePresence>
  );
};
