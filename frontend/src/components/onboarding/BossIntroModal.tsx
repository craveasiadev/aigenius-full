/**
 * Boss Introduction Modal — onboarding stage 1.
 *
 * Welcomes the student and walks them through the journey ahead with a
 * series of speech-bubble messages from "Boss Genius". Same design
 * language as the rest of the AIpreneur app:
 *   • Glass card on a calm theme-aware backdrop
 *   • 3D plastic-key Next button (no gradients, no glow)
 *   • Solid colours throughout, dotted-grid texture
 *   • Theme-aware via the global ThemeProvider
 *   • Fully responsive — stacks vertically on mobile, two-column on sm+
 *   • PWA: safe-area insets, ≥44-px tap targets, `touch-manipulation`
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Store, Sparkles, ArrowRight, X } from 'lucide-react';
import {
  GLASS, ICON_TILE, BTN_3D_PRIMARY,
} from '../../lib/uiTokens';

interface BossIntroModalProps {
  studentName: string;
  onComplete: () => void;
}

// Speech bubble messages. `face` is the emoji rendered inside the boss
// avatar — switches between messages.
const SPEECH_MESSAGES: Array<{ text: string; face: string }> = [
  {
    text: "Hey there, future entrepreneur! I'm Boss Genius, your guide to building an amazing business!",
    face: '👋',
  },
  {
    text: "Together, we're going to create YOUR very own shop. How exciting is that?",
    face: '🤩',
  },
  {
    text: 'First, take a photo of your current shop or store area so the AI can understand your style.',
    face: '🏪',
  },
  {
    text: 'Next, answer a few fun questions about your dream business setup.',
    face: '🧠',
  },
  {
    text: 'Finally, take your boss selfie so YOU appear as the owner of your new AI shop.',
    face: '📸',
  },
  {
    text: "Ready to start your entrepreneurship adventure? Let's go!",
    face: '🚀',
  },
];

const JOURNEY_STEPS = [
  { icon: Store, label: 'Build shop', tone: 'text-violet-500' },
  { icon: Sparkles, label: 'Create products', tone: 'text-sky-500' },
  { icon: Rocket, label: 'Launch business', tone: 'text-emerald-500' },
];

export const BossIntroModal = ({ studentName, onComplete }: BossIntroModalProps) => {
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    if (currentMessage < SPEECH_MESSAGES.length - 1) {
      setIsAnimating(true);
      setCurrentMessage((prev) => prev + 1);
      setTimeout(() => setIsAnimating(false), 250);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const message = SPEECH_MESSAGES[currentMessage];
  const isLastMessage = currentMessage === SPEECH_MESSAGES.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 touch-manipulation overflow-y-auto"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
      }}
    >
      {/* Faint dotted-grid backdrop texture — same as the page-level
          background, so the modal feels like part of the app. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(148,163,184,0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Skip button — top-right, glass pill */}
      <motion.button
        type="button"
        onClick={handleSkip}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`${GLASS} fixed z-[110] inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-transform touch-manipulation`}
        style={{
          top: 'max(env(safe-area-inset-top), 12px)',
          right: 'max(env(safe-area-inset-right), 12px)',
        }}
      >
        <X className="w-4 h-4" />
        Skip intro
      </motion.button>

      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 240 }}
        className={`${GLASS} relative w-full max-w-xl rounded-3xl overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="boss-intro-title"
      >
        {/* Header — solid violet wash with chip-style title */}
        <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4 border-b border-slate-200/70 dark:border-white/10 flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-violet-600 border-b-[3px] border-violet-800 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold text-violet-600 dark:text-violet-300">
              AIpreneur intro
            </p>
            <h2 id="boss-intro-title" className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
              Welcome, {studentName}!
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7">
          {/* Boss avatar + speech bubble */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
            {/* Avatar — solid violet disc with 3D bottom border + animated emoji */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex-shrink-0"
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-violet-600 border-b-[5px] border-violet-800 rounded-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMessage}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 20 }}
                    transition={{ type: 'spring', damping: 18, stiffness: 250 }}
                    className="text-5xl sm:text-6xl select-none"
                  >
                    {message.face}
                  </motion.div>
                </AnimatePresence>
              </div>
              {/* Tiny sparkle accent — no rotation animation, kept calm */}
              <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border-b-[2px] border-amber-600 flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </span>
            </motion.div>

            {/* Speech bubble — slate panel with subtle tail */}
            <div className="flex-1 w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="relative bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5"
                >
                  {/* Tail — only on sm+ where avatar is to the left */}
                  <span
                    aria-hidden
                    className="hidden sm:block absolute left-0 top-12 -translate-x-2 w-3 h-3 rotate-45 bg-slate-100 dark:bg-slate-800/60 border-l border-b border-slate-200 dark:border-white/10"
                  />
                  <p className="text-slate-800 dark:text-slate-100 text-sm sm:text-base leading-relaxed">
                    {message.text}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Progress dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {SPEECH_MESSAGES.map((_, index) => (
              <span
                key={index}
                className={`block h-1.5 rounded-full transition-all ${
                  index === currentMessage
                    ? 'w-8 bg-violet-600 dark:bg-violet-400'
                    : index < currentMessage
                      ? 'w-2 bg-violet-300 dark:bg-violet-700'
                      : 'w-2 bg-slate-300 dark:bg-white/15'
                }`}
                aria-hidden
              />
            ))}
          </div>

          {/* Next / Let's start */}
          <div className="mt-5 flex justify-center">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleNext}
              className={`${BTN_3D_PRIMARY} w-full sm:w-auto min-h-[56px] px-7 sm:px-9 text-base`}
            >
              {isLastMessage ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Let&apos;s start
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>

          {/* Step counter for accessibility */}
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {currentMessage + 1} of {SPEECH_MESSAGES.length}
          </p>
        </div>

        {/* Journey footer — three icon tiles showing the journey ahead */}
        <div className="border-t border-slate-200/70 dark:border-white/10 px-4 sm:px-6 py-4 grid grid-cols-3 gap-2 bg-slate-50/60 dark:bg-slate-900/40">
          {JOURNEY_STEPS.map(({ icon: Icon, label, tone }) => (
            <div
              key={label}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-slate-700 dark:text-slate-300"
            >
              <span className={`${ICON_TILE} w-9 h-9 sm:w-10 sm:h-10`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${tone}`} />
              </span>
              <span className="text-[10px] sm:text-xs leading-tight text-center font-semibold">
                {label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BossIntroModal;
