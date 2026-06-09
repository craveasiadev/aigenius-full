import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import { X, Heart, Gift, Users, TreePine, GraduationCap, Stethoscope, Globe, Sparkles, Play, Clock, Trophy, ArrowLeft, Sun, Moon, Lightbulb } from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { csrApi } from '../services/aipreneurApi';
import { ApiError } from '../lib/api';
import { Confetti } from '../components/Confetti';
import { GLASS, GLASS_HOVER, PAGE } from '../lib/uiTokens';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cause {
  id: string;
  name: string;
  icon: any;
  color: string;
  gradient: string;
  description: string;
  impact: string;
}

interface ActionType {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  description: string;
}

interface MoralOption {
  text: string;
  emoji: string;
  good: boolean;
  feedback: string;
}

interface MoralScenario {
  id: string;
  title: string;
  story: string;
  icon: any;
  options: MoralOption[];
}

// ─── Phase type (clean state machine) ────────────────────────────────────────

type Phase = 'choose-cause' | 'scenario' | 'puzzle' | 'donate' | 'victory';

// ─── Constants ───────────────────────────────────────────────────────────────

const MISSION_TIME = 15;

// Puzzle types for Bonus Quest — diverse mechanics
interface MemoryMatch { type: 'memory'; pairs: { emoji: string; label: string }[] }
interface WordScramble { type: 'word'; word: string; hint: string }
interface EmojiSequence { type: 'emoji'; sequence: string[]; answer: string; options: string[] }
interface OddOneOut { type: 'odd'; items: { emoji: string; label: string; isOdd: boolean }[] }
interface TilePuzzle { type: 'tile'; size: number; image: string[] }
type BonusPuzzle = MemoryMatch | WordScramble | EmojiSequence | OddOneOut | TilePuzzle;

const BONUS_PUZZLES: BonusPuzzle[] = [
  // Memory Match - flip cards to find pairs
  {
    type: 'memory', pairs: [
      { emoji: '❤️', label: 'Love' },
      { emoji: '🤝', label: 'Help' },
      { emoji: '🌱', label: 'Grow' },
      { emoji: '⭐', label: 'Star' },
    ]
  },
  {
    type: 'memory', pairs: [
      { emoji: '🎁', label: 'Give' },
      { emoji: '🫂', label: 'Hug' },
      { emoji: '🌍', label: 'Earth' },
      { emoji: '🕊️', label: 'Peace' },
    ]
  },
  // Word Scramble - unscramble a kindness word
  { type: 'word', word: 'KINDNESS', hint: 'Being nice and caring to others' },
  { type: 'word', word: 'EMPATHY', hint: 'Feeling what others feel' },
  { type: 'word', word: 'CHARITY', hint: 'Giving to those in need' },
  { type: 'word', word: 'RESPECT', hint: 'Treating everyone with honor' },
  // Emoji Sequence - complete the pattern
  { type: 'emoji', sequence: ['❤️', '🤝', '❤️', '🤝', '❤️'], answer: '🤝', options: ['🤝', '⭐', '🎁', '🌱'] },
  { type: 'emoji', sequence: ['🌱', '🌿', '🌳', '🌱', '🌿'], answer: '🌳', options: ['🌳', '🌻', '🍀', '🌱'] },
  { type: 'emoji', sequence: ['😊', '🤗', '😊', '🤗', '😊'], answer: '🤗', options: ['🤗', '😢', '😊', '🎉'] },
  // Odd One Out - find which doesn't belong
  {
    type: 'odd', items: [
      { emoji: '🤝', label: 'Helping', isOdd: false },
      { emoji: '🎁', label: 'Sharing', isOdd: false },
      { emoji: '😡', label: 'Fighting', isOdd: true },
      { emoji: '🫂', label: 'Hugging', isOdd: false },
    ]
  },
  {
    type: 'odd', items: [
      { emoji: '🌍', label: 'Recycle', isOdd: false },
      { emoji: '🌱', label: 'Plant trees', isOdd: false },
      { emoji: '🗑️', label: 'Litter', isOdd: true },
      { emoji: '💧', label: 'Save water', isOdd: false },
    ]
  },
  // Tile Puzzle - arrange tiles in order (3x3 with one blank)
  { type: 'tile', size: 3, image: ['S', 'E', 'E', 'T', 'H', 'I', 'N', 'K', ''] },
  { type: 'tile', size: 3, image: ['H', 'E', 'L', 'P', 'F', 'U', 'L', '!', ''] },
];

const causes: Cause[] = [
  { id: 'education', name: 'Education', icon: GraduationCap, color: 'blue', gradient: 'from-blue-500 to-cyan-500', description: 'Help kids learn', impact: 'Students Helped' },
  { id: 'environment', name: 'Planet', icon: TreePine, color: 'green', gradient: 'from-green-500 to-emerald-500', description: 'Protect nature', impact: 'Trees Planted' },
  { id: 'health', name: 'Health', icon: Stethoscope, color: 'red', gradient: 'from-red-500 to-pink-500', description: 'Heal the sick', impact: 'Treatments Given' },
  { id: 'animals', name: 'Animals', icon: Heart, color: 'pink', gradient: 'from-pink-500 to-rose-500', description: 'Love pets', impact: 'Animals Saved' },
  { id: 'community', name: 'Community', icon: Users, color: 'purple', gradient: 'from-purple-500 to-indigo-500', description: 'Help neighbors', impact: 'Families Fed' },
  { id: 'global', name: 'World', icon: Globe, color: 'cyan', gradient: 'from-cyan-500 to-blue-600', description: 'Global peace', impact: 'Lives Changed' }
];

const actionTypes: ActionType[] = [
  { id: 'help_friend', name: 'Support', emoji: '🤝', multiplier: 1.0, description: 'Direct help to someone close.' },
  { id: 'share_supplies', name: 'Share', emoji: '🎁', multiplier: 1.5, description: 'Giving resources to many.' },
  { id: 'community_clean', name: 'Lead', emoji: '📢', multiplier: 2.0, description: 'Organizing a big event.' }
];

const MORALITY_SCENARIOS: MoralScenario[] = [
  {
    id: 'lost_wallet',
    title: 'The Lost Wallet',
    story: 'You spot a wallet on the sidewalk. It looks full!',
    icon: Gift,
    options: [
      { text: 'Return it to owner', emoji: '🦸', good: true, feedback: 'Heroic! Honesty builds trust.' },
      { text: 'Keep the money', emoji: '🙊', good: false, feedback: 'Oh no! That belongs to someone else.' },
      { text: 'Leave it there', emoji: '🙈', good: false, feedback: 'Someone else might steal it!' },
    ],
  },
  {
    id: 'line_cut',
    title: 'The Line Cutter',
    story: 'Your best friend tries to skip the long line at your shop.',
    icon: Users,
    options: [
      { text: 'Say "Wait in line"', emoji: '⚖️', good: true, feedback: 'Fairness wins! Everyone is equal.' },
      { text: 'Let them cut', emoji: '🤫', good: false, feedback: 'Unfair to the others waiting!' },
      { text: 'Close the shop', emoji: '🚪', good: false, feedback: 'Quitting doesn\'t solve it!' },
    ],
  },
  {
    id: 'extra_change',
    title: 'Extra Change',
    story: 'A cashier gives you too much money back by mistake.',
    icon: Trophy,
    options: [
      { text: 'Give it back', emoji: '✨', good: true, feedback: 'Integrity is a superpower!' },
      { text: 'Keep it quietly', emoji: '🤐', good: false, feedback: 'That hurts the shop owner.' },
      { text: 'Buy candy with it', emoji: '🍬', good: false, feedback: 'Spending it is still stealing.' },
    ],
  },
];

const COIN_PRESETS = [10, 25, 50, 100] as const;

const PHASE_LABELS: { phase: Phase; label: string }[] = [
  { phase: 'choose-cause', label: 'Cause' },
  { phase: 'scenario', label: 'Quest' },
  { phase: 'puzzle', label: 'Puzzle' },
  { phase: 'donate', label: 'Give' },
  { phase: 'victory', label: 'Hero' },
];

// ─── Animated POV scene illustrations for each moral scenario ────────────────

const SceneIllustration: React.FC<{ scenarioId: string }> = ({ scenarioId }) => {
  if (scenarioId === 'lost_wallet') {
    return (
      <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden">
        {/* Sky */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-amber-200" />
        {/* Sun */}
        <motion.div className="absolute top-3 right-8 text-4xl" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>☀️</motion.div>
        {/* Background trees */}
        <motion.div className="absolute left-6 bottom-24 text-4xl" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>🌳</motion.div>
        <motion.div className="absolute right-10 bottom-28 text-3xl" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>🌲</motion.div>
        {/* Bird */}
        <motion.div className="absolute top-6 left-1/3 text-2xl" animate={{ x: [0, 60, 120], y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 2, type: 'tween' }}>🐦</motion.div>
        {/* Sidewalk */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-gray-300 to-gray-400 border-t-2 border-gray-500/30">
          <div className="absolute top-3 left-1/4 w-16 h-0.5 bg-gray-500/20" />
          <div className="absolute top-10 right-1/3 w-20 h-0.5 bg-gray-500/20" />
        </div>
        {/* Road */}
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gray-600">
          <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 flex justify-center gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="w-6 h-1 bg-yellow-400/60 rounded-full" />
            ))}
          </div>
        </div>
        {/* Wallet with golden glow */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: [-5, 5, -5] }}
          transition={{ scale: { type: 'spring', delay: 0.5, stiffness: 200 }, rotate: { repeat: Infinity, duration: 2.5, type: 'tween' } }}
        >
          <motion.div
            className="absolute -inset-8 bg-yellow-400/30 rounded-full blur-xl z-0"
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
          <span className="text-6xl md:text-7xl relative z-10 drop-shadow-2xl">👛</span>
        </motion.div>
        {/* Your footsteps */}
        <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 0.4, y: 0 }} transition={{ delay: 1.2 }}>
          <span className="text-xl rotate-[20deg]">👟</span>
          <span className="text-xl -rotate-[20deg]">👟</span>
        </motion.div>
        {/* POV label */}
        <motion.div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white font-bold text-xs md:text-sm px-4 py-2 rounded-full z-20 whitespace-nowrap"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          👀 You&apos;re walking and you see...
        </motion.div>
      </div>
    );
  }

  if (scenarioId === 'line_cut') {
    return (
      <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden bg-gradient-to-b from-indigo-900 via-purple-900 to-purple-950">
        {/* Shop sign */}
        <motion.div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-500 px-6 py-2 rounded-xl shadow-lg z-10"
          initial={{ y: -30 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <span className="text-black font-black text-sm md:text-base">🏪 YOUR SHOP</span>
        </motion.div>
        {/* Counter */}
        <div className="absolute top-16 inset-x-6 h-10 bg-amber-800/80 rounded-lg border-b-4 border-amber-900/80" />
        {/* Queue line rope */}
        <div className="absolute bottom-20 left-12 right-24 h-0.5 bg-yellow-400/40 rounded-full" />
        {/* People in queue */}
        {['🧑', '👧', '👦'].map((emoji, i) => (
          <motion.div
            key={i}
            className="absolute bottom-8 flex flex-col items-center"
            style={{ left: `${15 + i * 18}%` }}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.2, type: 'spring' }}
          >
            <span className="text-4xl md:text-5xl">{emoji}</span>
            <span className="text-[10px] text-green-400 font-bold mt-0.5">In line</span>
          </motion.div>
        ))}
        {/* Friend cutting! */}
        <motion.div
          className="absolute bottom-6 right-[12%] flex flex-col items-center z-10"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: [0, -10, 5, 0], opacity: 1 }}
          transition={{ delay: 1.2, duration: 1, type: 'tween' }}
        >
          <motion.div animate={{ x: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 0.4, type: 'tween' }}>
            <span className="text-5xl md:text-6xl">🏃</span>
          </motion.div>
          <motion.div
            className="bg-red-500 text-white text-[10px] md:text-xs font-black px-2 py-0.5 rounded-full whitespace-nowrap"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            BFF cutting! 😱
          </motion.div>
        </motion.div>
        {/* POV label */}
        <motion.div
          className="absolute top-3 left-4 bg-black/40 backdrop-blur-sm text-white font-bold text-[10px] md:text-xs px-3 py-1.5 rounded-full z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          👀 You&apos;re behind the counter...
        </motion.div>
      </div>
    );
  }

  if (scenarioId === 'extra_change') {
    return (
      <div className="relative w-full h-48 md:h-64 rounded-3xl overflow-hidden bg-gradient-to-b from-emerald-800 to-emerald-950">
        {/* Cash register */}
        <motion.div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.3 }}
        >
          <span className="text-5xl md:text-6xl">🧾</span>
        </motion.div>
        {/* Counter top */}
        <div className="absolute bottom-0 inset-x-0 h-20 bg-amber-800 border-t-4 border-amber-600">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-900/50 px-6 py-1 rounded-full">
            <span className="text-white/60 text-[10px] md:text-xs font-bold">CASHIER COUNTER</span>
          </div>
        </div>
        {/* Cashier person */}
        <motion.div
          className="absolute bottom-16 left-[15%]"
          initial={{ x: -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <span className="text-4xl md:text-5xl">🧑‍💼</span>
        </motion.div>
        {/* Hand giving coins */}
        <motion.div
          className="absolute bottom-20 left-[35%]"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <span className="text-3xl md:text-4xl">🤲</span>
        </motion.div>
        {/* Bouncing coins animation */}
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className="absolute text-2xl md:text-3xl"
            style={{ left: `${40 + i * 7}%`, top: '35%' }}
            animate={{
              y: [0, -25 - i * 6, 10],
              x: [0, (i - 2) * 12, (i - 2) * 18],
              opacity: [0, 1, 0.7],
              rotate: [0, 180, 360],
            }}
            transition={{ delay: 1 + i * 0.12, duration: 1.2, repeat: Infinity, repeatDelay: 2.5 }}
          >
            🪙
          </motion.div>
        ))}
        {/* Alert */}
        <motion.div
          className="absolute top-4 right-4 bg-red-500/90 text-white font-black text-[10px] md:text-xs px-3 py-1.5 rounded-full z-20"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ delay: 1.8, type: 'tween', duration: 0.5 }}
        >
          Extra coins! 💰
        </motion.div>
        {/* POV label */}
        <motion.div
          className="absolute top-3 left-4 bg-black/40 backdrop-blur-sm text-white font-bold text-[10px] md:text-xs px-3 py-1.5 rounded-full z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          👀 You&apos;re at the counter...
        </motion.div>
      </div>
    );
  }

  return null;
};

// ─── Step progress indicator ─────────────────────────────────────────────────

const PhaseIndicator: React.FC<{ currentPhase: Phase }> = ({ currentPhase }) => {
  const currentIdx = PHASE_LABELS.findIndex(p => p.phase === currentPhase);
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6">
      {PHASE_LABELS.map((item, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={item.phase} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && (
              <div className={`w-4 sm:w-8 h-0.5 rounded-full transition-colors duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-700'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${isCompleted
                    ? 'bg-emerald-500 text-white scale-90'
                    : isCurrent
                      ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50 ring-offset-2 ring-offset-[#0a0a10] scale-110'
                      : 'bg-gray-800 text-gray-500 border border-gray-700'
                  }`}
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-bold transition-colors duration-500 ${isCurrent ? 'text-indigo-300' : isCompleted ? 'text-emerald-400' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const CSRModule = () => {
  const { geniusProfile } = useGeniusAuth();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { theme, toggleTheme } = useTheme();

  // ── Core phase state machine ──
  const [phase, setPhase] = useState<Phase>('choose-cause');
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [donationAmount, setDonationAmount] = useState(25);
  const [, setTotalDonated] = useState(0);
  const [kindnessScore, setKindnessScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [missionScore, setMissionScore] = useState(0);
  const [canDonateToday, setCanDonateToday] = useState(true);
  const [dailyStatusMessage, setDailyStatusMessage] = useState<string | null>(null);

  // ── Scenario state ──
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MISSION_TIME);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{ msg: string; type: 'good' | 'bad' } | null>(null);

  // Timer interval ref — single source of truth
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Feedback timeout ref
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Puzzle state ──
  const [bonusPuzzle, setBonusPuzzle] = useState<BonusPuzzle | null>(null);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleAnswer, setPuzzleAnswer] = useState<number | null>(null);

  // Memory Match state
  const [memoryCards, setMemoryCards] = useState<{ id: number; emoji: string; label: string; flipped: boolean; matched: boolean }[]>([]);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryLocked, setMemoryLocked] = useState(false);

  // Word Scramble state
  const [scrambledLetters, setScrambledLetters] = useState<{ letter: string; id: number; used: boolean }[]>([]);
  const [wordGuess, setWordGuess] = useState<{ letter: string; id: number }[]>([]);

  // Tile Puzzle state
  const [tiles, setTiles] = useState<string[]>([]);

  // ── Helpers ──

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFeedbackTimeout = useCallback(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
  }, []);

  // ── Load initial data ──
  useEffect(() => {
    const loadData = async () => {
      if (!geniusProfile) return;
      try {
        const response = await csrApi.getStatus();
        if (response.success && response.business) {
          setTotalDonated(response.business.total_donated || 0);
          setKindnessScore(Math.floor((response.business.total_donated || 0) / 10));
          const allowToday = response.can_donate_today !== false;
          setCanDonateToday(allowToday);
          setDailyStatusMessage(
            allowToday
              ? null
              : 'CSR quest is already completed today. Come back tomorrow for the next mission.'
          );
        }
      } catch (err) {
        console.error("CSR Load Error", err);
      }
    };
    loadData();
  }, [geniusProfile]);

  // ── Single countdown timer effect ──
  // Runs ONLY during scenario phase when NOT showing feedback
  useEffect(() => {
    if (phase !== 'scenario' || showingFeedback) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time expired — trigger feedback
          clearTimer();
          setShowingFeedback(true);
          setFeedbackData({ msg: "Time's up! Be quicker next time!", type: 'bad' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [phase, showingFeedback, scenarioIndex, clearTimer]);

  // ── Feedback auto-advance effect ──
  // When showingFeedback becomes true, wait 2s then advance
  useEffect(() => {
    if (!showingFeedback) return;

    feedbackTimeoutRef.current = setTimeout(() => {
      feedbackTimeoutRef.current = null;
      setShowingFeedback(false);
      setFeedbackData(null);

      if (scenarioIndex + 1 < MORALITY_SCENARIOS.length) {
        setScenarioIndex(prev => prev + 1);
        setTimeLeft(MISSION_TIME);
      } else {
        setPhase('puzzle');
      }
    }, 2000);

    return () => clearFeedbackTimeout();
  }, [showingFeedback, scenarioIndex, clearFeedbackTimeout]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      clearTimer();
      clearFeedbackTimeout();
    };
  }, [clearTimer, clearFeedbackTimeout]);

  // ── Init puzzle ──
  const initPuzzle = useCallback((puzzle: BonusPuzzle) => {
    setBonusPuzzle(puzzle);
    setPuzzleSolved(false);
    setPuzzleAnswer(null);
    setMemoryFlipped([]);
    setMemoryLocked(false);
    setWordGuess([]);

    if (puzzle.type === 'memory') {
      const cards = puzzle.pairs.flatMap((p, i) => [
        { id: i * 2, emoji: p.emoji, label: p.label, flipped: false, matched: false },
        { id: i * 2 + 1, emoji: p.emoji, label: p.label, flipped: false, matched: false },
      ]);
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      setMemoryCards(cards);
    } else if (puzzle.type === 'word') {
      const letters = puzzle.word.split('').map((l, i) => ({ letter: l, id: i, used: false }));
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      setScrambledLetters(letters);
    } else if (puzzle.type === 'tile') {
      const t = [...puzzle.image];
      let blankIdx = t.indexOf('');
      for (let m = 0; m < 30; m++) {
        const s = puzzle.size;
        const neighbors: number[] = [];
        if (blankIdx % s > 0) neighbors.push(blankIdx - 1);
        if (blankIdx % s < s - 1) neighbors.push(blankIdx + 1);
        if (blankIdx >= s) neighbors.push(blankIdx - s);
        if (blankIdx < s * (s - 1)) neighbors.push(blankIdx + s);
        const swap = neighbors[Math.floor(Math.random() * neighbors.length)];
        [t[blankIdx], t[swap]] = [t[swap], t[blankIdx]];
        blankIdx = swap;
      }
      setTiles(t);
    }
  }, []);

  // ── Start mission (choose cause -> scenario phase) ──
  const startMission = useCallback((cause: Cause) => {
    if (!canDonateToday) {
      setDailyStatusMessage('You already completed CSR today. New mission unlocks tomorrow.');
      return;
    }

    setSelectedCause(cause);
    setScenarioIndex(0);
    setMissionScore(0);
    setTimeLeft(MISSION_TIME);
    setShowingFeedback(false);
    setFeedbackData(null);
    setPhase('scenario');

    // Pre-pick puzzle for later
    const puzzle = BONUS_PUZZLES[Math.floor(Math.random() * BONUS_PUZZLES.length)];
    initPuzzle(puzzle);
  }, [canDonateToday, initPuzzle]);

  // ── Handle moral choice ──
  // Double-click protection: buttons are disabled while showingFeedback is true
  const handleChoice = useCallback((option: MoralOption) => {
    if (showingFeedback) return; // safety check (buttons also disabled in UI)

    clearTimer(); // stop countdown immediately
    setShowingFeedback(true);

    if (option.good) {
      const timeBonus = Math.max(0, timeLeft - 5);
      setMissionScore(prev => prev + 10 + timeBonus);
      setFeedbackData({ msg: option.feedback, type: 'good' });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setFeedbackData({ msg: option.feedback, type: 'bad' });
    }
  }, [showingFeedback, timeLeft, clearTimer]);

  // ── Puzzle solved bonus ──
  const solvePuzzleBonus = useCallback(async () => {
    setPuzzleSolved(true);
    setMissionScore(prev => prev + 50);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, []);

  // ── Memory Match handler ──
  const handleMemoryFlip = useCallback((cardId: number) => {
    if (puzzleSolved || memoryLocked) return;
    const card = memoryCards.find(c => c.id === cardId);
    if (!card || card.flipped || card.matched) return;

    const newCards = memoryCards.map(c => c.id === cardId ? { ...c, flipped: true } : c);
    setMemoryCards(newCards);
    const newFlipped = [...memoryFlipped, cardId];
    setMemoryFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryLocked(true);
      const [first, second] = newFlipped.map(id => newCards.find(c => c.id === id)!);
      if (first.emoji === second.emoji) {
        const matched = newCards.map(c => (c.id === first.id || c.id === second.id) ? { ...c, matched: true } : c);
        setMemoryCards(matched);
        setMemoryFlipped([]);
        setMemoryLocked(false);
        if (matched.every(c => c.matched)) solvePuzzleBonus();
      } else {
        setTimeout(() => {
          setMemoryCards(prev => prev.map(c => (c.id === first.id || c.id === second.id) ? { ...c, flipped: false } : c));
          setMemoryFlipped([]);
          setMemoryLocked(false);
        }, 800);
      }
    }
  }, [puzzleSolved, memoryLocked, memoryCards, memoryFlipped, solvePuzzleBonus]);

  // ── Word Scramble handler ──
  const handleLetterTap = useCallback((letterId: number) => {
    if (puzzleSolved) return;
    const letter = scrambledLetters.find(l => l.id === letterId);
    if (!letter || letter.used) return;

    setScrambledLetters(prev => prev.map(l => l.id === letterId ? { ...l, used: true } : l));
    const newGuess = [...wordGuess, { letter: letter.letter, id: letterId }];
    setWordGuess(newGuess);

    if (bonusPuzzle?.type === 'word' && newGuess.length === bonusPuzzle.word.length) {
      const guessWord = newGuess.map(g => g.letter).join('');
      if (guessWord === bonusPuzzle.word) {
        solvePuzzleBonus();
      } else {
        setTimeout(() => {
          setScrambledLetters(prev => prev.map(l => ({ ...l, used: false })));
          setWordGuess([]);
        }, 600);
      }
    }
  }, [puzzleSolved, scrambledLetters, wordGuess, bonusPuzzle, solvePuzzleBonus]);

  const handleWordUndo = useCallback(() => {
    if (puzzleSolved || wordGuess.length === 0) return;
    const last = wordGuess[wordGuess.length - 1];
    setWordGuess(prev => prev.slice(0, -1));
    setScrambledLetters(prev => prev.map(l => l.id === last.id ? { ...l, used: false } : l));
  }, [puzzleSolved, wordGuess]);

  // ── Emoji Sequence handler ──
  const handleEmojiSelect = useCallback((idx: number) => {
    if (puzzleSolved || puzzleAnswer !== null || bonusPuzzle?.type !== 'emoji') return;
    setPuzzleAnswer(idx);
    if (bonusPuzzle.options[idx] === bonusPuzzle.answer) {
      solvePuzzleBonus();
    }
  }, [puzzleSolved, puzzleAnswer, bonusPuzzle, solvePuzzleBonus]);

  // ── Odd One Out handler ──
  const handleOddSelect = useCallback((idx: number) => {
    if (puzzleSolved || puzzleAnswer !== null || bonusPuzzle?.type !== 'odd') return;
    setPuzzleAnswer(idx);
    if (bonusPuzzle.items[idx]?.isOdd) {
      solvePuzzleBonus();
    }
  }, [puzzleSolved, puzzleAnswer, bonusPuzzle, solvePuzzleBonus]);

  // ── Tile Puzzle handler ──
  const handleTileClick = useCallback((idx: number) => {
    if (puzzleSolved || bonusPuzzle?.type !== 'tile') return;
    const s = bonusPuzzle.size;
    const blankIdx = tiles.indexOf('');
    const sameRow = Math.floor(idx / s) === Math.floor(blankIdx / s) && Math.abs(idx - blankIdx) === 1;
    const sameCol = idx % s === blankIdx % s && Math.abs(idx - blankIdx) === s;
    if (!sameRow && !sameCol) return;

    const newTiles = [...tiles];
    [newTiles[idx], newTiles[blankIdx]] = [newTiles[blankIdx], newTiles[idx]];
    setTiles(newTiles);

    const target = bonusPuzzle.image;
    if (newTiles.every((t, i) => t === target[i])) {
      solvePuzzleBonus();
    }
  }, [puzzleSolved, bonusPuzzle, tiles, solvePuzzleBonus]);

  // ── Final Donation ──
  const handleDonate = useCallback(async () => {
    if (!selectedCause || !selectedAction || !geniusProfile || !canDonateToday) return;

    try {
      setDailyStatusMessage(null);
      await csrApi.donate({
        cause: selectedCause.id,
        action_type: selectedAction.id,
        donation_amount: donationAmount
      });

      setPhase('victory');
      setTotalDonated(prev => prev + donationAmount);
      setKindnessScore(prev => prev + Math.floor(donationAmount / 10));
      setCanDonateToday(false);
      setShowConfetti(true);

      setTimeout(() => {
        smartBack();
      }, 5000);
    } catch (err) {
      console.error("Donation failed", err);
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        typeof err.message === 'string' &&
        err.message.toLowerCase().includes('already')
      ) {
        setCanDonateToday(false);
        setDailyStatusMessage('CSR quest is already completed today. Come back tomorrow.');
      } else {
        setDailyStatusMessage('Unable to submit CSR quest right now. Please try again.');
      }
    }
  }, [selectedCause, selectedAction, geniusProfile, canDonateToday, donationAmount, smartBack]);

  // ── Derived values ──
  const currentScenario = MORALITY_SCENARIOS[scenarioIndex];

  // ── Render ──
  const dark = theme === 'dark';
  return (
    <div className={`${PAGE} flex flex-col touch-manipulation`}>
      <StarfieldBackground /><DottedBackground />
      {showConfetti && <Confetti show={showConfetti} />}

      <header
        className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/70 dark:border-white/10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => smartBack()}
            aria-label="Back"
            className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white truncate">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
            Kindness Quest
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-400/30">
              <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-300 fill-rose-500" />
              <span className="font-extrabold text-xs text-rose-700 dark:text-rose-300 tabular-nums">
                Lv {Math.floor(kindnessScore / 100) + 1}
              </span>
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`${GLASS} ${GLASS_HOVER} w-10 h-10 rounded-xl flex items-center justify-center`}
            >
              {dark ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex-1 flex flex-col items-center p-4 md:p-8 overflow-y-auto w-full"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
      >
        {/* Lesson banner */}
        <div className="max-w-4xl w-full mb-6 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-400/30 px-4 py-3 flex items-start gap-2.5">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800 shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-violet-900 dark:text-violet-100">
              Lesson — Doing good builds great brands
            </p>
            <p className="text-sm text-violet-800/90 dark:text-violet-200/90">
              Customers remember brands that stand for something. Pick a cause you care about, decide HOW you help (donating money, volunteering time, or sharing skills), and tell the story honestly.
            </p>
          </div>
        </div>

        {/* Phase indicator breadcrumb */}
        <PhaseIndicator currentPhase={phase} />

        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 1: CHOOSE CAUSE                                         */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {phase === 'choose-cause' && (
            <motion.div
              key="choose-cause"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35 }}
              className="max-w-4xl w-full"
            >
              <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-white mb-4">Choose Your Mission</h2>
                <p className="text-gray-400 text-lg">Who will you help today, hero?</p>
                {dailyStatusMessage && (
                  <div className="mt-4 inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
                    {dailyStatusMessage}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {causes.map((cause, i) => (
                  <motion.button
                    key={cause.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={canDonateToday ? { scale: 1.05, y: -5 } : undefined}
                    onClick={() => startMission(cause)}
                    disabled={!canDonateToday}
                    className={`group relative p-6 rounded-3xl border-2 text-left bg-gradient-to-br ${cause.gradient} border-transparent shadow-lg ${canDonateToday ? 'hover:border-white/40' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <cause.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-1">{cause.name}</h3>
                    <p className="text-white/80 font-medium text-sm">{cause.description}</p>

                    <div className="absolute top-4 right-4 bg-black/20 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 2: SCENARIO (morality quiz)                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {phase === 'scenario' && currentScenario && (
            <motion.div
              key={`scenario-${scenarioIndex}`}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl w-full space-y-6"
            >
              <div className="space-y-6">
                {/* Progress Bar */}
                <div className="flex items-center gap-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
                    <span className={`text-xl font-black ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
                  </div>
                  <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / MISSION_TIME) * 100}%` }}
                      className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-cyan-500'}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {MORALITY_SCENARIOS.map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < scenarioIndex ? 'bg-green-500' : i === scenarioIndex ? 'bg-yellow-400 animate-pulse scale-125' : 'bg-gray-600'}`} />
                    ))}
                  </div>
                  <div className="text-yellow-400 font-bold flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> {missionScore}
                  </div>
                </div>

                {/* Animated Scene Illustration */}
                <SceneIllustration key={currentScenario.id} scenarioId={currentScenario.id} />

                {/* Scenario Card — shows feedback OR question */}
                <div className="bg-gray-800 rounded-3xl p-6 md:p-8 border-2 border-indigo-500/30 shadow-2xl">

                  {showingFeedback && feedbackData ? (
                    /* ── Feedback Result ── */
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-10"
                    >
                      <motion.div
                        className="text-8xl mb-6"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring" }}
                      >
                        {feedbackData.type === 'good' ? '🌟' : '🤔'}
                      </motion.div>
                      <h3 className={`text-3xl md:text-4xl font-black mb-4 ${feedbackData.type === 'good' ? 'text-green-400' : 'text-orange-400'}`}>
                        {feedbackData.type === 'good' ? 'Awesome Choice!' : 'Think Again...'}
                      </h3>
                      <div className={`inline-block px-8 py-4 rounded-xl border-2 ${feedbackData.type === 'good' ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                        <p className="text-white text-xl font-bold max-w-md">{feedbackData.msg}</p>
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Question & Options ── */
                    <div>
                      <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-white mb-4">{currentScenario.title}</h2>
                        <p className="text-xl text-indigo-200 leading-relaxed font-medium bg-indigo-900/30 inline-block px-6 py-2 rounded-xl border border-indigo-500/30">
                          {currentScenario.story}
                        </p>
                      </div>

                      <p className="text-center text-gray-400 font-bold text-sm mb-4">
                        What do you do? 🤔
                      </p>

                      <div className="flex flex-col md:flex-row items-stretch justify-center gap-3 md:gap-4">
                        {currentScenario.options.map((opt, i) => (
                          <button
                            key={`${currentScenario.id}-opt-${i}`}
                            onClick={() => handleChoice(opt)}
                            disabled={showingFeedback}
                            className={`flex-1 min-h-[120px] p-5 md:p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border-4 shadow-xl bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 ${showingFeedback
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-indigo-400 hover:shadow-indigo-500/20 hover:scale-105 active:scale-95'
                              }`}
                          >
                            <span className="text-5xl md:text-6xl drop-shadow-lg">{opt.emoji}</span>
                            <span className="font-bold text-base md:text-lg text-white text-center leading-tight">
                              {opt.text}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">XP Points</span>
                  <span className="text-yellow-400 font-black text-xl">+{Math.floor(missionScore * 1.5)}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 3: PUZZLE (bonus mini-game)                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {phase === 'puzzle' && (
            <motion.div
              key="puzzle"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35 }}
              className="max-w-2xl w-full"
            >
              <div className="text-center mb-6">
                <h2 className="text-3xl font-black text-white mb-2">Bonus Challenge!</h2>
                <p className="text-gray-400 text-lg">
                  {bonusPuzzle?.type === 'memory' ? 'Flip cards to find all matching pairs!' :
                    bonusPuzzle?.type === 'word' ? 'Unscramble the hidden kindness word!' :
                      bonusPuzzle?.type === 'emoji' ? 'Find the pattern and complete the sequence!' :
                        bonusPuzzle?.type === 'odd' ? 'Spot the one that doesn\'t belong!' :
                          bonusPuzzle?.type === 'tile' ? 'Slide the tiles to spell the word!' : 'Solve the puzzle!'}
                </p>
              </div>

              <div className={`bg-gray-800 rounded-3xl p-8 border-2 ${puzzleSolved ? 'border-green-500/50' : 'border-purple-500/30'} shadow-2xl min-h-[400px] flex flex-col items-center justify-center`}>

                {puzzleSolved ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: 2, type: 'tween' }}
                      className="text-8xl mb-4"
                    >🎉</motion.div>
                    <div className="text-green-400 font-black text-3xl mb-2">PUZZLE SOLVED!</div>
                    <div className="text-gray-400 text-lg mb-2">+50 Points &amp; +15 Coins</div>
                    <div className="text-yellow-400 font-bold text-xl mb-6">Total Score: {missionScore}</div>
                    <button
                      onClick={() => setPhase('donate')}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xl rounded-2xl shadow-xl hover:brightness-110 transition-all"
                    >
                      Continue to Donate! 🚀
                    </button>
                  </motion.div>

                ) : bonusPuzzle?.type === 'memory' ? (
                  /* ═══ MEMORY MATCH ═══ */
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-2 bg-purple-500/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                      </div>
                      <h3 className="text-xl font-black text-white">Memory Match</h3>
                    </div>
                    <p className="text-gray-400 text-center mb-6 font-bold">Flip cards to find matching pairs!</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                      {memoryCards.map((card) => (
                        <motion.button
                          key={card.id}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleMemoryFlip(card.id)}
                          className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-bold transition-all ${card.matched
                              ? 'bg-green-500/30 border-2 border-green-500/50'
                              : card.flipped
                                ? 'bg-purple-500/30 border-2 border-purple-400'
                                : 'bg-gradient-to-br from-purple-600 to-indigo-700 border-2 border-purple-500/30 hover:border-purple-400 cursor-pointer'
                            }`}
                        >
                          {card.flipped || card.matched ? (
                            <motion.span
                              initial={{ rotateY: 90 }}
                              animate={{ rotateY: 0 }}
                              className="text-3xl"
                            >{card.emoji}</motion.span>
                          ) : (
                            <span className="text-2xl text-purple-300/50">?</span>
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                      {memoryCards.filter((_, i) => i % 2 === 0).map((card, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${memoryCards.filter(c => c.emoji === card.emoji).every(c => c.matched) ? 'bg-green-400' : 'bg-gray-700'}`} />
                      ))}
                    </div>
                  </div>

                ) : bonusPuzzle?.type === 'word' ? (
                  /* ═══ WORD SCRAMBLE ═══ */
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-2 bg-cyan-500/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-black text-white">Word Scramble</h3>
                    </div>
                    <p className="text-purple-300 text-center mb-6 italic text-lg">Hint: {bonusPuzzle.hint}</p>

                    {/* Answer slots */}
                    <div className="flex justify-center gap-2 mb-6">
                      {bonusPuzzle.word.split('').map((_, i) => (
                        <div
                          key={i}
                          className={`w-10 h-12 rounded-xl flex items-center justify-center text-lg font-black border-2 transition-all ${wordGuess[i]
                              ? 'bg-purple-500/30 border-purple-400 text-white'
                              : 'bg-gray-700/50 border-gray-600 border-dashed text-gray-600'
                            }`}
                        >
                          {wordGuess[i]?.letter || ''}
                        </div>
                      ))}
                    </div>

                    {/* Scrambled letters */}
                    <div className="flex flex-wrap justify-center gap-3 mb-4">
                      {scrambledLetters.map((l) => (
                        <motion.button
                          key={l.id}
                          whileHover={!l.used ? { scale: 1.1, y: -3 } : {}}
                          whileTap={!l.used ? { scale: 0.9 } : {}}
                          onClick={() => handleLetterTap(l.id)}
                          className={`w-11 h-12 rounded-xl font-black text-lg transition-all border-b-4 active:border-b-0 active:translate-y-1 ${l.used
                              ? 'bg-gray-800 border-gray-900 text-gray-700 cursor-default'
                              : 'bg-white text-purple-900 border-purple-300 hover:bg-purple-50 cursor-pointer'
                            }`}
                        >
                          {l.letter}
                        </motion.button>
                      ))}
                    </div>

                    {wordGuess.length > 0 && (
                      <button
                        onClick={handleWordUndo}
                        className="mx-auto block text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl bg-white/5 mt-4"
                      >
                        ↩ Undo
                      </button>
                    )}
                  </div>

                ) : bonusPuzzle?.type === 'emoji' ? (
                  /* ═══ EMOJI SEQUENCE ═══ */
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-2 bg-yellow-500/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-yellow-400" />
                      </div>
                      <h3 className="text-xl font-black text-white">Pattern Finder</h3>
                    </div>
                    <p className="text-gray-400 text-center mb-6 font-bold text-lg">Complete the pattern!</p>

                    <div className="flex justify-center items-center gap-2 mb-8 bg-gray-900/50 rounded-2xl p-4">
                      {bonusPuzzle.sequence.map((emoji, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-2xl"
                        >{emoji}</motion.div>
                      ))}
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border-2 border-yellow-500/40 border-dashed flex items-center justify-center text-yellow-400 text-lg font-black animate-pulse">
                        ?
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {bonusPuzzle.options.map((emoji, i) => {
                        const isSelected = puzzleAnswer === i;
                        const isCorrect = emoji === bonusPuzzle.answer;
                        const showResult = puzzleAnswer !== null;
                        return (
                          <motion.button
                            key={i}
                            whileHover={!showResult ? { scale: 1.05 } : {}}
                            whileTap={!showResult ? { scale: 0.95 } : {}}
                            onClick={() => handleEmojiSelect(i)}
                            className={`py-4 rounded-2xl text-3xl transition-all border-2 ${showResult
                                ? isCorrect
                                  ? 'bg-green-500/20 border-green-500'
                                  : isSelected
                                    ? 'bg-red-500/20 border-red-500'
                                    : 'bg-gray-800 border-transparent'
                                : 'bg-white/10 border-white/10 hover:border-purple-400 cursor-pointer'
                              }`}
                          >{emoji}</motion.button>
                        );
                      })}
                    </div>

                    {puzzleAnswer !== null && !puzzleSolved && (
                      <div className="text-center mt-6">
                        <p className="text-orange-400 font-bold mb-3">Wrong answer! Try a new puzzle.</p>
                        <button
                          onClick={() => {
                            const puzzle = BONUS_PUZZLES[Math.floor(Math.random() * BONUS_PUZZLES.length)];
                            initPuzzle(puzzle);
                          }}
                          className="px-6 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition"
                        >
                          New Puzzle
                        </button>
                      </div>
                    )}
                  </div>

                ) : bonusPuzzle?.type === 'odd' ? (
                  /* ═══ ODD ONE OUT ═══ */
                  <div className="w-full max-w-md">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-2 bg-pink-500/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-pink-400" />
                      </div>
                      <h3 className="text-xl font-black text-white">Odd One Out</h3>
                    </div>
                    <p className="text-gray-400 text-center mb-6 font-bold text-lg">Find the one that does NOT belong!</p>

                    <div className="grid grid-cols-2 gap-4">
                      {bonusPuzzle.items.map((item, i) => {
                        const isSelected = puzzleAnswer === i;
                        const showResult = puzzleAnswer !== null;
                        return (
                          <motion.button
                            key={i}
                            whileHover={!showResult ? { scale: 1.05, y: -3 } : {}}
                            whileTap={!showResult ? { scale: 0.95 } : {}}
                            onClick={() => handleOddSelect(i)}
                            className={`p-6 rounded-3xl flex flex-col items-center gap-3 transition-all border-2 ${showResult
                                ? item.isOdd
                                  ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/30'
                                  : isSelected
                                    ? 'bg-red-500/20 border-red-500'
                                    : 'bg-gray-800/50 border-transparent opacity-50'
                                : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600 hover:border-purple-400 cursor-pointer'
                              }`}
                          >
                            <span className="text-5xl">{item.emoji}</span>
                            <span className="text-sm font-bold text-gray-300">{item.label}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    {puzzleAnswer !== null && !puzzleSolved && (
                      <div className="text-center mt-6">
                        <p className="text-orange-400 font-bold mb-3">That one fits! Try a new puzzle.</p>
                        <button
                          onClick={() => {
                            const puzzle = BONUS_PUZZLES[Math.floor(Math.random() * BONUS_PUZZLES.length)];
                            initPuzzle(puzzle);
                          }}
                          className="px-6 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition"
                        >
                          New Puzzle
                        </button>
                      </div>
                    )}
                  </div>

                ) : bonusPuzzle?.type === 'tile' ? (
                  /* ═══ SLIDING TILE PUZZLE ═══ */
                  <div className="w-full max-w-sm">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-2 bg-indigo-500/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h3 className="text-xl font-black text-white">Slide Puzzle</h3>
                    </div>
                    <p className="text-gray-400 text-center mb-6 font-bold text-lg">Slide tiles to spell the word!</p>

                    <div className="grid grid-cols-3 gap-2 mx-auto" style={{ maxWidth: '320px' }}>
                      {tiles.map((tile, i) => {
                        const isBlank = tile === '';
                        return (
                          <motion.button
                            key={i}
                            layout
                            whileTap={!isBlank ? { scale: 0.9 } : {}}
                            onClick={() => handleTileClick(i)}
                            className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-black transition-all ${isBlank
                                ? 'bg-gray-900/50 border border-dashed border-gray-700'
                                : 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-2 border-purple-400/30 cursor-pointer hover:brightness-110 shadow-lg shadow-purple-500/20'
                              }`}
                          >{tile}</motion.button>
                        );
                      })}
                    </div>
                    <p className="text-purple-400 text-center mt-4 font-bold text-lg">
                      Target: {bonusPuzzle.image.filter(t => t !== '').join('')}
                    </p>
                  </div>

                ) : null}
              </div>

              {/* Skip button for players who are stuck */}
              {!puzzleSolved && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => setPhase('donate')}
                    className="text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors underline"
                  >
                    Skip puzzle and donate anyway
                  </button>
                </div>
              )}

              <div className="bg-yellow-500/10 rounded-2xl p-4 border border-yellow-500/20 mt-6">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">Mission Score</span>
                  <span className="text-yellow-400 font-black text-xl">+{missionScore} pts</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 4: DONATE (coin amount + action type)                   */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {phase === 'donate' && selectedCause && (
            <motion.div
              key="donate"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.35 }}
              className="max-w-2xl w-full text-center"
            >
              <div className="mb-8">
                <h2 className="text-4xl font-black text-white mb-2">Make Your Impact</h2>
                <p className="text-xl text-gray-400">How many coins will you give to {selectedCause.name}?</p>
              </div>

              {/* Coin amount selection */}
              <div className="bg-gray-800 rounded-3xl p-8 border border-gray-700 mb-8">
                <div className="text-7xl font-black text-emerald-400 mb-2 flex items-center justify-center gap-3">
                  <span className="text-5xl">🪙</span>
                  {donationAmount}
                </div>
                <p className="text-emerald-300/60 font-bold text-lg mb-8">coins</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {COIN_PRESETS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDonationAmount(amount)}
                      className={`py-4 rounded-2xl font-black text-xl transition-all border-2 ${donationAmount === amount
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                          : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-emerald-400/50 hover:bg-gray-700'
                        }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action type selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                {actionTypes.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action)}
                    className={`p-4 rounded-2xl border-2 transition-all ${selectedAction?.id === action.id
                      ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-800 border-transparent hover:bg-gray-700'
                      }`}
                  >
                    <div className="text-3xl mb-2">{action.emoji}</div>
                    <div className="font-bold text-white text-sm">{action.name}</div>
                    <div className="text-xs text-indigo-300 mt-1">{action.multiplier}x Impact</div>
                  </button>
                ))}
              </div>

              <button
                onClick={handleDonate}
                disabled={!selectedAction || !canDonateToday}
                className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all border-b-4 active:border-b-0 active:translate-y-1 ${(selectedAction && canDonateToday)
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white border-green-700 hover:brightness-110'
                  : 'bg-gray-700 text-gray-500 border-gray-900 cursor-not-allowed'
                  }`}
              >
                COMPLETE QUEST! 🚀
              </button>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* PHASE 5: VICTORY                                              */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {phase === 'victory' && selectedCause && (
            <motion.div
              key="victory"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="text-center"
            >
              <div className="relative mb-8 inline-block">
                <div className="absolute inset-0 bg-yellow-400 blur-[80px] opacity-40 animate-pulse"></div>
                <Trophy className="w-32 h-32 text-yellow-400 relative z-10 drop-shadow-2xl" />
              </div>

              <h2 className="text-6xl font-black text-white mb-4 tracking-tight">HERO STATUS!</h2>
              <p className="text-2xl text-indigo-300 font-bold mb-12">You changed the world today.</p>

              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Coins Donated</div>
                  <div className="text-3xl font-black text-white flex items-center justify-center gap-2">
                    <span className="text-2xl">🪙</span> {donationAmount}
                  </div>
                </div>
                <div className="bg-gray-800/80 p-6 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Impact Score</div>
                  <div className="text-3xl font-black text-yellow-400">+{Math.floor(donationAmount * (selectedAction?.multiplier || 1))}</div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default CSRModule;
