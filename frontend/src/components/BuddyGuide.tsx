/**
 * BuddyGuide Component
 *
 * A fun, animated avatar guide that helps kids navigate the AIpreneur dashboard.
 * Features speech bubbles, funny expressions, and contextual tips.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles } from 'lucide-react';

// Avatar expressions/moods
type BuddyMood = 'happy' | 'excited' | 'thinking' | 'celebrating' | 'waving' | 'pointing';

interface BuddyGuideProps {
  message: string;
  mood?: BuddyMood;
  onNext?: () => void;
  onDismiss?: () => void;
  showNextButton?: boolean;
  nextButtonText?: string;
  position?: 'bottom-right' | 'bottom-left' | 'center';
  highlightElement?: string; // ID of element to highlight
  autoHide?: number; // Auto hide after milliseconds
  persistent?: boolean; // Don't show dismiss button
}

// Buddy avatar SVG with different expressions
const BuddyAvatar = ({ mood }: { mood: BuddyMood }) => {
  const expressions: Record<BuddyMood, { eyes: string; mouth: string; extras?: React.ReactNode }> = {
    happy: {
      eyes: 'M18 22c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2zm14 0c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2z',
      mouth: 'M16 32c0 0 4 6 9 6s9-6 9-6',
    },
    excited: {
      eyes: 'M15 20c0-3 3-5 3-5s3 2 3 5-3 5-3 5-3-2-3-5zm14 0c0-3 3-5 3-5s3 2 3 5-3 5-3 5-3-2-3-5z',
      mouth: 'M14 30c0 0 6 10 11 10s11-10 11-10',
      extras: (
        <>
          <motion.text x="8" y="15" fontSize="8" animate={{ y: [15, 12, 15] }} transition={{ duration: 0.5, repeat: Infinity }}>✨</motion.text>
          <motion.text x="40" y="15" fontSize="8" animate={{ y: [15, 12, 15] }} transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}>✨</motion.text>
        </>
      )
    },
    thinking: {
      eyes: 'M16 22h4m12 0h4',
      mouth: 'M20 34c0 0 3-2 5-2s5 2 5 2',
      extras: (
        <motion.text x="42" y="10" fontSize="10" animate={{ opacity: [1, 0.5, 1], y: [10, 8, 10] }} transition={{ duration: 1.5, repeat: Infinity }}>?</motion.text>
      )
    },
    celebrating: {
      eyes: 'M15 20l3 3 3-3m11 0l3 3 3-3',
      mouth: 'M14 30c0 0 6 10 11 10s11-10 11-10',
      extras: (
        <>
          <motion.text x="5" y="8" fontSize="8" animate={{ y: [8, 2, 8], rotate: [0, 20, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>🎉</motion.text>
          <motion.text x="42" y="8" fontSize="8" animate={{ y: [8, 2, 8], rotate: [0, -20, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}>🎊</motion.text>
        </>
      )
    },
    waving: {
      eyes: 'M18 22c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2zm14 0c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2z',
      mouth: 'M16 32c0 0 4 6 9 6s9-6 9-6',
      extras: (
        <motion.g animate={{ rotate: [-10, 20, -10] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ transformOrigin: '45px 25px' }}>
          <text x="45" y="25" fontSize="12">👋</text>
        </motion.g>
      )
    },
    pointing: {
      eyes: 'M18 22c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2zm14 0c2 0 3-1 3-2s-1-2-3-2-3 1-3 2 1 2 3 2z',
      mouth: 'M18 34c0 0 3 3 7 3s7-3 7-3',
      extras: (
        <motion.g animate={{ x: [0, 5, 0] }} transition={{ duration: 0.8, repeat: Infinity }}>
          <text x="48" y="30" fontSize="12">👉</text>
        </motion.g>
      )
    }
  };

  const expr = expressions[mood];

  return (
    <motion.svg
      viewBox="0 0 50 50"
      className="w-16 h-16 md:w-20 md:h-20"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
    >
      {/* Head */}
      <defs>
        <linearGradient id="buddyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="25"
        cy="25"
        r="22"
        fill="url(#buddyGrad)"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Face background */}
      <circle cx="25" cy="27" r="18" fill="#FEF3C7" />

      {/* Eyes */}
      <path d={expr.eyes} fill="#1F2937" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />

      {/* Mouth */}
      <path d={expr.mouth} fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" />

      {/* Cheeks (blush) */}
      <circle cx="12" cy="28" r="3" fill="#FCA5A5" opacity="0.5" />
      <circle cx="38" cy="28" r="3" fill="#FCA5A5" opacity="0.5" />

      {/* Extras for expression */}
      {expr.extras}
    </motion.svg>
  );
};

// Speech bubble component
const SpeechBubble = ({ children, position }: { children: React.ReactNode; position: 'left' | 'right' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8, y: 10 }}
    className={`relative bg-white rounded-2xl p-4 shadow-xl max-w-xs ${
      position === 'left' ? 'ml-4' : 'mr-4'
    }`}
  >
    {/* Speech bubble tail */}
    <div
      className={`absolute top-6 w-4 h-4 bg-white transform rotate-45 ${
        position === 'left' ? '-left-2' : '-right-2'
      }`}
    />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

export const BuddyGuide = ({
  message,
  mood = 'happy',
  onNext,
  onDismiss,
  showNextButton = true,
  nextButtonText = 'Got it!',
  position = 'bottom-right',
  highlightElement,
  autoHide,
  persistent = false,
}: BuddyGuideProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Auto hide after timeout
  useEffect(() => {
    if (autoHide && autoHide > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onDismiss]);

  // Track highlighted element
  useEffect(() => {
    if (highlightElement) {
      const updatePosition = () => {
        const element = document.getElementById(highlightElement);
        if (element) {
          setTargetRect(element.getBoundingClientRect());
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [highlightElement]);

  const handleNext = () => {
    setIsVisible(false);
    onNext?.();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'bottom-1/4 left-1/2 -translate-x-1/2',
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {/* Highlight overlay */}
      {highlightElement && targetRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] pointer-events-none"
        >
          {/* Semi-transparent overlay with cutout */}
          <div className="absolute inset-0 bg-black/50" />
          <motion.div
            className="absolute bg-transparent rounded-xl"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }}
            animate={{
              boxShadow: [
                '0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px 4px rgba(139, 92, 246, 0.5)',
                '0 0 0 9999px rgba(0,0,0,0.5), 0 0 30px 8px rgba(236, 72, 153, 0.5)',
                '0 0 0 9999px rgba(0,0,0,0.5), 0 0 20px 4px rgba(139, 92, 246, 0.5)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}

      {/* Buddy guide container */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`fixed ${positionClasses[position]} z-[100] flex items-end gap-2`}
      >
        {/* Avatar */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <BuddyAvatar mood={mood} />
        </motion.div>

        {/* Speech bubble */}
        <SpeechBubble position="left">
          <p className="text-gray-800 text-sm font-medium mb-3 leading-relaxed">
            {message}
          </p>

          <div className="flex items-center gap-2">
            {showNextButton && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1"
              >
                {nextButtonText}
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}

            {!persistent && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </SpeechBubble>
      </motion.div>
    </AnimatePresence>
  );
};

// Export types for use in other components
export type { BuddyMood, BuddyGuideProps };
