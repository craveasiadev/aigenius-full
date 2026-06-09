/**
 * ContentCreationGuide Component
 *
 * 7-step animated tutorial teaching kids how to create video content.
 * Follows the InteractiveTutorial pattern with buddy avatar,
 * animated simulations, and step-by-step navigation.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, X, Smartphone, Sun, Frame,
  Smile, FileText, Rocket, Video
} from 'lucide-react';

interface ContentCreationGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  scriptHook: string;
  scriptScenes: string[];
  scriptCta: string;
}

interface GuideStep {
  id: string;
  emoji: string;
  title: string;
  buddyMessage: string;
  tips: string[];
  gradient: string;
  icon: React.ElementType;
}

// ========== STEP SIMULATIONS ==========

const IntroSimulation = () => (
  <div className="relative w-full h-40 bg-gradient-to-br from-cyan-900 to-blue-900 rounded-xl overflow-hidden border border-cyan-500/30 flex items-center justify-center">
    <motion.div
      className="text-7xl"
      animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      🎬
    </motion.div>
    <motion.div
      className="absolute top-3 left-4 text-2xl"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
    >
      ✨
    </motion.div>
    <motion.div
      className="absolute bottom-4 right-6 text-2xl"
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
    >
      🌟
    </motion.div>
  </div>
);

const PhoneSetupSimulation = () => (
  <div className="relative w-full h-40 bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
    {/* Hand holding phone */}
    <motion.div
      className="relative"
      animate={{ rotate: [5, 0, 5] }}
      transition={{ duration: 3, repeat: Infinity }}
    >
      {/* Phone outline */}
      <div className="w-16 h-28 bg-gray-800 rounded-xl border-2 border-gray-600 flex items-center justify-center relative">
        <div className="absolute top-1 w-6 h-1 bg-gray-600 rounded-full" />
        <motion.div
          className="w-10 h-16 bg-gradient-to-b from-blue-400 to-purple-400 rounded-md"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute bottom-1 w-4 h-4 bg-gray-600 rounded-full" />
      </div>
    </motion.div>

    {/* Eye level indicator */}
    <motion.div
      className="absolute right-6 flex flex-col items-center gap-1"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <span className="text-lg">👁️</span>
      <div className="w-px h-12 bg-yellow-400 border-dashed" />
      <span className="text-xs text-yellow-400 font-bold">Eye Level</span>
    </motion.div>

    {/* Arrow UP */}
    <motion.div
      className="absolute left-6 text-green-400 text-sm font-bold flex flex-col items-center"
      animate={{ y: [4, -4, 4] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <span>↑</span>
      <span className="text-[10px]">Hold</span>
      <span className="text-[10px]">Upright</span>
    </motion.div>
  </div>
);

const LightingSimulation = () => (
  <div className="relative w-full h-40 bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
    {/* Window with sun */}
    <div className="absolute left-8 top-4 bottom-4 w-20 bg-gradient-to-b from-yellow-100 to-yellow-200 rounded-lg border-2 border-yellow-300 flex items-center justify-center">
      <motion.div
        className="text-3xl"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        ☀️
      </motion.div>
    </div>

    {/* Light rays */}
    {[0, 1, 2].map(i => (
      <motion.div
        key={i}
        className="absolute h-px bg-gradient-to-r from-yellow-400 to-transparent"
        style={{ left: '7rem', top: `${4 + i * 2}rem`, width: '6rem', transform: `rotate(${(i - 1) * 10}deg)` }}
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
      />
    ))}

    {/* Face */}
    <motion.div
      className="text-5xl ml-16"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      😊
    </motion.div>

    {/* Checkmark */}
    <motion.div
      className="absolute right-4 top-4 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full"
      animate={{ scale: [0.9, 1.1, 0.9] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      Good!
    </motion.div>

    {/* Bad example X */}
    <motion.div
      className="absolute right-4 bottom-4 text-red-400 text-xs font-bold"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      No light behind you
    </motion.div>
  </div>
);

const FramingSimulation = () => (
  <div className="relative w-full h-40 bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
    {/* Camera frame overlay */}
    <div className="w-32 h-32 border-2 border-dashed border-cyan-400 rounded-lg relative flex items-center justify-center">
      {/* Corner markers */}
      <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

      {/* Person silhouette */}
      <motion.div
        className="flex flex-col items-center"
        animate={{ y: [2, -2, 2] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="w-10 h-10 bg-gray-500 rounded-full mb-1" />
        <div className="w-14 h-12 bg-gray-500 rounded-t-xl" />
      </motion.div>

      {/* Center crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/50" />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-400/50" />
      </div>
    </div>

    {/* Labels */}
    <motion.div
      className="absolute bottom-3 text-cyan-300 text-xs font-bold"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      Head to Shoulders
    </motion.div>
  </div>
);

const SpeakingSimulation = () => {
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setMouthOpen(prev => !prev), 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-40 bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center gap-8">
      {/* Animated face */}
      <div className="relative">
        <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center relative">
          {/* Eyes */}
          <div className="absolute top-5 left-4 w-3 h-3 bg-gray-800 rounded-full" />
          <div className="absolute top-5 right-4 w-3 h-3 bg-gray-800 rounded-full" />
          {/* Mouth */}
          <motion.div
            className="absolute bottom-4 bg-gray-800 rounded-full"
            animate={{ width: mouthOpen ? 12 : 8, height: mouthOpen ? 8 : 3 }}
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          />
        </div>
        {/* Sound waves */}
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute top-1/2 -right-3 border-2 border-cyan-400 rounded-full"
            style={{ width: `${(i + 1) * 12}px`, height: `${(i + 1) * 12}px`, transform: 'translate(50%, -50%)' }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Tips */}
      <div className="flex flex-col gap-2 text-sm">
        {['Smile!', 'Be clear', 'Have fun!'].map((tip, i) => (
          <motion.div
            key={tip}
            className="bg-white/10 px-3 py-1 rounded-full text-white font-bold text-xs"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3 }}
          >
            {tip}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ScriptPreviewSimulation = ({ scriptHook, scriptCta }: { scriptHook: string; scriptCta: string }) => (
  <div className="relative w-full h-40 bg-[#1a1a2e] rounded-xl overflow-hidden border border-white/10 p-4">
    {/* Mini teleprompter preview */}
    <div className="w-full h-full bg-black/50 rounded-lg border border-white/10 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
      <motion.div
        className="p-3 space-y-2"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <p className="text-cyan-400 text-xs font-bold">Your Script:</p>
        <p className="text-white text-sm font-medium leading-relaxed">{scriptHook}</p>
        <p className="text-pink-400 text-xs font-bold mt-2">{scriptCta}</p>
      </motion.div>
      <div className="absolute bottom-2 right-2 bg-red-500 w-3 h-3 rounded-full animate-pulse" />
    </div>
  </div>
);

const ReadySimulation = () => (
  <div className="relative w-full h-40 bg-gradient-to-br from-green-900 to-emerald-900 rounded-xl overflow-hidden border border-green-500/30 flex items-center justify-center">
    <motion.div
      className="text-6xl"
      animate={{
        scale: [1, 1.2, 1],
        rotate: [0, 10, -10, 0],
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      🎥
    </motion.div>
    <motion.div
      className="absolute top-4 right-6 text-2xl"
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      ⭐
    </motion.div>
    <motion.div
      className="absolute bottom-4 left-6 text-lg"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      🎉
    </motion.div>
    <motion.div
      className="absolute bottom-3 text-green-300 text-xs font-bold"
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      Just practice — have fun!
    </motion.div>
  </div>
);

// ========== MAIN COMPONENT ==========

export const ContentCreationGuide = ({
  isOpen,
  onClose,
  onStartRecording,
  scriptHook,
  scriptScenes,
  scriptCta,
}: ContentCreationGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps: GuideStep[] = [
    {
      id: 'intro',
      emoji: '🎬',
      title: 'Make a Video!',
      buddyMessage: "You picked a great script! Let me show you how to make an awesome video. It's easy and fun!",
      tips: [
        'This guide will teach you step by step',
        'No worries — this is just for practice!',
        "You'll record a practice video at the end",
      ],
      gradient: 'from-cyan-500 to-blue-500',
      icon: Video,
    },
    {
      id: 'phone_setup',
      emoji: '📱',
      title: 'Phone Setup',
      buddyMessage: 'Hold your phone UPRIGHT (vertical) at eye level. Like taking a selfie but with both hands!',
      tips: [
        'Hold phone upright (portrait mode)',
        'Keep it at eye level — not too high or low',
        'Use both hands to keep it steady',
        'Lean it on something if your arms get tired',
      ],
      gradient: 'from-purple-500 to-pink-500',
      icon: Smartphone,
    },
    {
      id: 'lighting',
      emoji: '☀️',
      title: 'Good Lighting',
      buddyMessage: 'Face a window or a bright light. Never have light BEHIND you or your face will be dark!',
      tips: [
        'Face the light source (window or lamp)',
        'Never stand with light behind you',
        'Natural daylight looks best',
        'Avoid shadows on your face',
      ],
      gradient: 'from-yellow-500 to-orange-500',
      icon: Sun,
    },
    {
      id: 'framing',
      emoji: '🖼️',
      title: 'Frame Yourself',
      buddyMessage: 'Center yourself in the frame. Show your head down to your shoulders. Leave a little space above your head!',
      tips: [
        'Center yourself in the middle',
        'Show head to shoulders',
        'Leave small space above your head',
        'Keep a clean background if possible',
      ],
      gradient: 'from-cyan-500 to-teal-500',
      icon: Frame,
    },
    {
      id: 'speaking',
      emoji: '🗣️',
      title: 'How to Speak',
      buddyMessage: 'Smile big, speak clearly, and be enthusiastic! Pretend you are telling your best friend about something cool!',
      tips: [
        'Smile and look at the camera',
        'Speak clearly and a bit louder than normal',
        'Be enthusiastic and have energy',
        'It is okay to make mistakes — just keep going!',
      ],
      gradient: 'from-pink-500 to-rose-500',
      icon: Smile,
    },
    {
      id: 'script_review',
      emoji: '📜',
      title: 'Your Script',
      buddyMessage: "Here's the script you'll read! It will scroll on screen while you record, like a teleprompter on TV!",
      tips: [
        `Hook: "${scriptHook}"`,
        ...scriptScenes.map((s, i) => `Step ${i + 1}: ${s}`),
        `End with: "${scriptCta}"`,
      ],
      gradient: 'from-indigo-500 to-purple-500',
      icon: FileText,
    },
    {
      id: 'ready',
      emoji: '🚀',
      title: "You're Ready!",
      buddyMessage: "This is just practice! The video won't be saved anywhere. Have fun, be yourself, and let's do this!",
      tips: [
        'This is practice only — video is NOT saved',
        'Max 20 seconds recording',
        'You can try as many times as you want',
        'Have fun and be yourself!',
      ],
      gradient: 'from-green-500 to-emerald-500',
      icon: Rocket,
    },
  ];

  const step = steps[currentStep];

  const handleNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }

    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentStep, isTransitioning, steps.length]);

  const handlePrev = useCallback(() => {
    if (isTransitioning || currentStep === 0) return;
    setIsTransitioning(true);
    setCurrentStep(currentStep - 1);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentStep, isTransitioning]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Reset step on open
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const renderSimulation = () => {
    switch (step.id) {
      case 'intro': return <IntroSimulation />;
      case 'phone_setup': return <PhoneSetupSimulation />;
      case 'lighting': return <LightingSimulation />;
      case 'framing': return <FramingSimulation />;
      case 'speaking': return <SpeakingSimulation />;
      case 'script_review': return <ScriptPreviewSimulation scriptHook={scriptHook} scriptCta={scriptCta} />;
      case 'ready': return <ReadySimulation />;
      default: return null;
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
      >
        {/* Skip / Close */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-[80] flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 hover:text-white text-sm font-medium backdrop-blur-md border border-white/20 transition-all"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Skip</span>
        </button>

        {/* Card */}
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="z-[75] w-full max-w-md"
        >
          {/* Glow */}
          <div className={`absolute -inset-2 bg-gradient-to-r ${step.gradient} rounded-3xl blur-xl opacity-30`} />

          <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
            {/* Top gradient bar */}
            <div className={`h-2 w-full bg-gradient-to-r ${step.gradient}`} />

            <div className="p-4 sm:p-5">
              {/* Buddy + speech */}
              <div className="flex items-start gap-3 mb-4">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg border-2 border-white/30 flex-shrink-0"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {step.emoji}
                </motion.div>
                <div className="flex-1 bg-white/10 rounded-2xl rounded-tl-none p-3 border border-white/10">
                  <p className="text-white/90 text-xs sm:text-sm font-medium leading-relaxed">
                    {step.buddyMessage}
                  </p>
                </div>
              </div>

              {/* Step info */}
              <div className={`p-3 rounded-xl bg-gradient-to-r ${step.gradient} bg-opacity-20 border border-white/10 mb-3`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-black text-white">{step.title}</h2>
                </div>
              </div>

              {/* Simulation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-3"
              >
                {renderSimulation()}
              </motion.div>

              {/* Tips */}
              <div className="bg-black/30 rounded-xl p-3 mb-3 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                {step.tips.map((tip, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="flex gap-2 text-xs text-white/80"
                  >
                    <span className="text-cyan-400 flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </motion.div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-white/50">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentStep
                          ? `w-5 bg-gradient-to-r ${step.gradient}`
                          : idx < currentStep
                            ? 'w-2 bg-white/50'
                            : 'w-2 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrev}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-semibold rounded-xl border border-white/10 flex items-center justify-center gap-1 text-sm transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </motion.button>
                )}

                {isLastStep ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onStartRecording}
                    className="flex-[2] py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm"
                  >
                    <Video className="w-5 h-5" />
                    Start Recording
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleNext}
                    className={`flex-[2] py-3 bg-gradient-to-r ${step.gradient} text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm`}
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ContentCreationGuide;
