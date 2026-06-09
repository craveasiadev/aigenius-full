/**
 * Shop Math Games Component
 *
 * 5 real-life shop scenario mini-games that teach math + business to kids.
 * Uses the student's actual products, staff, and shop data.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight } from 'lucide-react';
import type { AIpreneurProduct, AIpreneurBusiness, AIpreneurStaff } from '../../services/aipreneurApi';

// ── Types ──

type ShopGameType = 'cashier_challenge' | 'tax_time' | 'queue_rush' | 'profit_puzzle' | 'boss_budget';

interface GameProduct {
  name: string;
  price: number;
  imageUrl: string | null;
}

interface GameStaff {
  name: string;
  salary: number;
  role: string;
}

interface PuzzleOption {
  id: number;
  label: string;
  value: number;
}

interface PuzzleState {
  gameType: ShopGameType;
  scenario: string;
  question: string;
  options: PuzzleOption[];
  correctOptionId: number;
  // Game-specific display data
  product?: GameProduct;
  products?: GameProduct[];
  staffMember?: GameStaff;
  staffMembers?: GameStaff[];
  customerPays?: number;
  tax?: number;
  costPrice?: number;
  budget?: number;
}

interface ShopMathGamesProps {
  products: AIpreneurProduct[];
  business: AIpreneurBusiness | null;
  staff: AIpreneurStaff[];
  studentName: string;
  shopName: string | null;
  puzzleAttemptsToday: number;
  dailyLimit: number;
  onPuzzleSolved: (correct: boolean) => Promise<void>;
  onShowConfetti: () => void;
}

// ── Constants ──

const ALL_GAME_TYPES: ShopGameType[] = [
  'cashier_challenge', 'tax_time', 'queue_rush', 'profit_puzzle', 'boss_budget',
];

const DEFAULT_PRODUCTS: GameProduct[] = [
  { name: 'Cupcake', price: 3, imageUrl: null },
  { name: 'Juice Box', price: 2, imageUrl: null },
  { name: 'Sticker Pack', price: 1, imageUrl: null },
  { name: 'Toy Car', price: 5, imageUrl: null },
  { name: 'Cookie', price: 2, imageUrl: null },
  { name: 'Crayon Set', price: 4, imageUrl: null },
];

const DEFAULT_STAFF: GameStaff[] = [
  { name: 'Ali', salary: 3, role: 'Helper' },
  { name: 'Siti', salary: 4, role: 'Cleaner' },
];

const GAME_META: Record<ShopGameType, { title: string; subtitle: string; emoji: string; gradient: string }> = {
  cashier_challenge: { title: 'Cashier Challenge', subtitle: 'Give the right change!', emoji: '🏪', gradient: 'from-green-500 to-emerald-600' },
  tax_time: { title: 'Tax Time!', subtitle: 'Add the tax to the price!', emoji: '🧾', gradient: 'from-blue-500 to-cyan-600' },
  queue_rush: { title: 'Queue Rush!', subtitle: 'Serve all your customers!', emoji: '🏃', gradient: 'from-purple-500 to-pink-600' },
  profit_puzzle: { title: 'Profit Puzzle', subtitle: 'How much did you earn?', emoji: '📈', gradient: 'from-yellow-500 to-orange-600' },
  boss_budget: { title: 'Boss Budget', subtitle: 'Pay your team!', emoji: '👔', gradient: 'from-indigo-500 to-purple-600' },
};

const CUSTOMER_EMOJIS = ['🧑', '👧', '👦', '🧒', '👩', '👨', '🧔'];
const OPTION_GRADIENTS = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500', 'from-orange-500 to-red-500'];

// ── Utilities ──

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeProducts(products: AIpreneurProduct[]): GameProduct[] {
  if (products.length === 0) return DEFAULT_PRODUCTS;
  return products.map(p => ({
    name: p.product_name,
    price: Math.max(1, Math.min(10, Math.round(p.price))),
    imageUrl: p.image_url,
  }));
}

function normalizeStaff(staff: AIpreneurStaff[]): GameStaff[] {
  if (staff.length === 0) return DEFAULT_STAFF;
  return staff.map(s => ({
    name: s.staff_name,
    salary: Math.max(1, Math.min(8, Math.round(s.salary / 10) || 3)),
    role: s.staff_role,
  }));
}

function generateOptions(correct: number, count: number = 3): PuzzleOption[] {
  const offsets = [1, -1, 2, -2, 3, -3, 4, -4];
  const used = new Set([correct]);
  const wrongs: number[] = [];

  for (const offset of offsets) {
    if (wrongs.length >= count) break;
    const val = correct + offset;
    if (val > 0 && !used.has(val)) {
      used.add(val);
      wrongs.push(val);
    }
  }
  while (wrongs.length < count) {
    const val = randInt(1, 15);
    if (!used.has(val)) {
      used.add(val);
      wrongs.push(val);
    }
  }

  const allOptions: PuzzleOption[] = [
    { id: 0, label: `${correct} coins`, value: correct },
    ...wrongs.map((v, i) => ({ id: i + 1, label: `${v} coins`, value: v })),
  ];

  return shuffleArray(allOptions);
}

function getDistinctProducts(gameProducts: GameProduct[], count: number): GameProduct[] {
  if (gameProducts.length >= count) {
    return shuffleArray(gameProducts).slice(0, count);
  }
  // Mix real products with defaults
  const mixed = [...gameProducts, ...DEFAULT_PRODUCTS.filter(d => !gameProducts.some(p => p.name === d.name))];
  return shuffleArray(mixed).slice(0, count);
}

// ── Puzzle Generators ──

function generateCashierChallenge(products: GameProduct[]): PuzzleState {
  const product = pickRandom(products);
  const change = randInt(1, 3);
  const customerPays = product.price + change;
  const options = generateOptions(change);
  const correctId = options.find(o => o.value === change)!.id;

  return {
    gameType: 'cashier_challenge',
    scenario: `A customer wants to buy your ${product.name}! It costs ${product.price} coins.`,
    question: `They give you ${customerPays} coins. How much change do you give back?`,
    options,
    correctOptionId: correctId,
    product,
    customerPays,
  };
}

function generateTaxTime(products: GameProduct[]): PuzzleState {
  const product = pickRandom(products);
  const tax = randInt(1, 2);
  const total = product.price + tax;
  const options = generateOptions(total);
  const correctId = options.find(o => o.value === total)!.id;

  return {
    gameType: 'tax_time',
    scenario: `Your ${product.name} costs ${product.price} coins. The government says you must add a tax!`,
    question: `The tax is ${tax} coin${tax > 1 ? 's' : ''}. How much does the customer pay in total?`,
    options,
    correctOptionId: correctId,
    product,
    tax,
  };
}

function generateQueueRush(products: GameProduct[], shopName: string): PuzzleState {
  const count = randInt(2, 3);
  const chosen = getDistinctProducts(products, count);
  const total = chosen.reduce((sum, p) => sum + p.price, 0);
  const options = generateOptions(total);
  const correctId = options.find(o => o.value === total)!.id;

  const lines = chosen.map((p, i) => `Customer ${i + 1} wants ${p.name} (${p.price} coins)`).join('. ');

  return {
    gameType: 'queue_rush',
    scenario: `${count} customers are lining up at ${shopName}! ${lines}.`,
    question: 'How many coins will you earn from all customers?',
    options,
    correctOptionId: correctId,
    products: chosen,
  };
}

function generateProfitPuzzle(products: GameProduct[]): PuzzleState {
  const product = pickRandom(products);
  const sellingPrice = Math.max(product.price, 3);
  const costPrice = randInt(1, Math.max(1, sellingPrice - 1));
  const profit = sellingPrice - costPrice;
  const options = generateOptions(profit);
  const correctId = options.find(o => o.value === profit)!.id;

  return {
    gameType: 'profit_puzzle',
    scenario: `You spent ${costPrice} coins to make your ${product.name}. You sell it for ${sellingPrice} coins!`,
    question: 'How much profit did you make?',
    options,
    correctOptionId: correctId,
    product: { ...product, price: sellingPrice },
    costPrice,
  };
}

function generateBossBudget(staff: GameStaff[], studentName: string): PuzzleState {
  const useTwo = staff.length >= 2 && Math.random() > 0.5;

  if (useTwo) {
    const chosen = shuffleArray(staff).slice(0, 2);
    const totalSalary = chosen[0].salary + chosen[1].salary;
    const options = generateOptions(totalSalary);
    const correctId = options.find(o => o.value === totalSalary)!.id;

    return {
      gameType: 'boss_budget',
      scenario: `Time to pay your team, Boss ${studentName}!`,
      question: `${chosen[0].name} needs ${chosen[0].salary} coins and ${chosen[1].name} needs ${chosen[1].salary} coins. What's the total salary?`,
      options,
      correctOptionId: correctId,
      staffMembers: chosen,
    };
  } else {
    const member = pickRandom(staff);
    const budget = member.salary + randInt(2, 5);
    const remaining = budget - member.salary;
    const options = generateOptions(remaining);
    const correctId = options.find(o => o.value === remaining)!.id;

    return {
      gameType: 'boss_budget',
      scenario: `Boss ${studentName}, you have ${budget} coins in your vault!`,
      question: `Your ${member.role} ${member.name} needs ${member.salary} coins salary. How many coins do you have left?`,
      options,
      correctOptionId: correctId,
      staffMember: member,
      budget,
    };
  }
}

// ── Animation Sub-Components ──

const AnimatedCharacter = ({ emoji, delay = 0 }: { emoji: string; delay?: number }) => (
  <motion.div
    initial={{ x: -80, opacity: 0, scale: 0.5 }}
    animate={{ x: 0, opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 15, delay }}
    className="text-5xl md:text-6xl select-none"
  >
    {emoji}
  </motion.div>
);

const SpeechBubble = ({ text, delay = 0.3 }: { text: string; delay?: number }) => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', delay }}
    className="relative bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 border-2 border-white/20 max-w-lg"
  >
    <div className="absolute -left-2.5 top-4 w-5 h-5 bg-white/10 border-l-2 border-b-2 border-white/20 rotate-45" />
    <p className="text-white text-base md:text-lg font-bold leading-relaxed">{text}</p>
  </motion.div>
);

const CoinRewardBurst = () => (
  <motion.div
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 1] }}
    transition={{ duration: 0.6 }}
    className="flex items-center justify-center pointer-events-none py-2"
  >
    <div className="bg-yellow-500/20 backdrop-blur-sm rounded-3xl px-8 py-3 border-2 border-yellow-500/40">
      <span className="text-2xl md:text-3xl font-black text-yellow-400">+10 coins earned!</span>
    </div>
  </motion.div>
);

const ProductCard = ({ product, label }: { product: GameProduct; label?: string }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.2 }}
    className="inline-flex flex-col items-center gap-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3"
  >
    {label && <span className="text-xs text-gray-500 uppercase font-bold">{label}</span>}
    <span className="text-lg font-black text-white">{product.name}</span>
    <span className="text-2xl md:text-3xl font-black text-yellow-400">{product.price} coins</span>
  </motion.div>
);

const CoinPile = ({ amount, color = 'text-yellow-400', label }: { amount: number; color?: string; label: string }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', delay: 0.4 }}
    className="inline-flex flex-col items-center gap-1"
  >
    <span className="text-xs text-gray-500 uppercase font-bold">{label}</span>
    <div className="flex items-center gap-1.5">
      {Array.from({ length: Math.min(amount, 6) }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.08 }}
          className="text-2xl"
        >
          🪙
        </motion.span>
      ))}
    </div>
    <span className={`text-xl font-black ${color}`}>{amount} coins</span>
  </motion.div>
);

const OptionButton = ({ option, index, isSelected, isCorrect, showResult, onSelect }: {
  option: PuzzleOption;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  showResult: boolean;
  onSelect: (id: number) => void;
}) => (
  <motion.button
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.6 + index * 0.1 }}
    whileHover={!showResult ? { scale: 1.05 } : {}}
    whileTap={!showResult ? { scale: 0.95 } : {}}
    onClick={() => !showResult && onSelect(option.id)}
    disabled={showResult}
    className={`py-5 px-4 rounded-2xl border-2 text-center text-xl md:text-2xl font-black transition-all ${
      showResult
        ? isCorrect
          ? 'border-green-500 bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
          : isSelected
            ? 'border-red-500 bg-red-500/20 text-red-400'
            : 'border-white/5 bg-white/5 text-gray-600'
        : `border-white/10 bg-gradient-to-r ${OPTION_GRADIENTS[index % 4]} bg-clip-padding text-white hover:border-white/30 hover:shadow-lg`
    }`}
    style={!showResult ? { background: `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))` } : undefined}
  >
    <span className="mr-2">🪙</span> {option.label}
  </motion.button>
);

// ── Main Component ──

export const ShopMathGames: React.FC<ShopMathGamesProps> = ({
  products, business, staff, studentName, shopName,
  puzzleAttemptsToday, dailyLimit, onPuzzleSolved, onShowConfetti,
}) => {
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReward, setShowReward] = useState(false);
  const lastGameTypeRef = useRef<ShopGameType | null>(null);

  // ── Streak + Practice Mode (client-only, no backend impact) ──
  // Streak: consecutive correct answers across BOTH rewarded daily plays
  // and Practice Mode. Resets on a wrong answer. Drives the combo chip
  // + level-up celebrations at thresholds (3/5/10).
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => {
    try { return parseInt(localStorage.getItem('aig:shopmath-best-streak') ?? '0', 10) || 0; }
    catch { return 0; }
  });
  // Practice Mode: kicks in AFTER the kid hits the daily-rewarded cap.
  // Same five game types, same UI, same feedback — but no coin reward
  // (so the daily-reward economy isn't bypassed) and no `onPuzzleSolved`
  // is dispatched to the backend. Pure "more games for fun + learning".
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceAttempts, setPracticeAttempts] = useState(0);
  const [practiceCorrect, setPracticeCorrect] = useState(0);

  const gameProducts = useMemo(() => normalizeProducts(products), [products]);
  const gameStaff = useMemo(() => normalizeStaff(staff), [staff]);
  const displayShopName = shopName || `${studentName}'s Shop`;

  // Daily-limit gate ONLY applies when not in practice mode — once a kid
  // taps "Keep Playing" we let the puzzle generator run unbounded.
  const dailyLimitReached = !practiceMode && puzzleAttemptsToday >= dailyLimit;

  const generatePuzzle = () => {
    // In practice mode the gate is lifted; in rewarded mode the existing
    // daily-limit check still applies.
    if (dailyLimitReached) return;

    const available = ALL_GAME_TYPES.filter(t => t !== lastGameTypeRef.current);
    const type = pickRandom(available);
    lastGameTypeRef.current = type;

    let newPuzzle: PuzzleState;
    switch (type) {
      case 'cashier_challenge':
        newPuzzle = generateCashierChallenge(gameProducts);
        break;
      case 'tax_time':
        newPuzzle = generateTaxTime(gameProducts);
        break;
      case 'queue_rush':
        newPuzzle = generateQueueRush(gameProducts, displayShopName);
        break;
      case 'profit_puzzle':
        newPuzzle = generateProfitPuzzle(gameProducts);
        break;
      case 'boss_budget':
        newPuzzle = generateBossBudget(gameStaff, studentName);
        break;
    }

    setPuzzle(newPuzzle);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFeedback(null);
    setShowReward(false);
  };

  useEffect(() => {
    if (!dailyLimitReached && !puzzle) {
      generatePuzzle();
    }
  }, []);

  /** Cheer line escalates with streak so the celebration scales with
   *  the kid's run. Capped at "LEGENDARY" so 50 correct in a row doesn't
   *  produce silly tier inflation. */
  const cheerForStreak = (s: number): string => {
    if (s >= 10) return `🔥 LEGENDARY ×${s}! You're on fire, Boss!`;
    if (s >= 5)  return `⚡ COMBO ×${s}! Math wizard!`;
    if (s >= 3)  return `✨ Streak ×${s}! Keep going!`;
    return 'Correct! Amazing work, Boss! 🎉';
  };

  const handleSelectAnswer = async (optionId: number) => {
    if (selectedAnswer !== null || !puzzle) return;
    setSelectedAnswer(optionId);

    const correct = optionId === puzzle.correctOptionId;
    setIsCorrect(correct);

    if (correct) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        try { localStorage.setItem('aig:shopmath-best-streak', String(nextStreak)); }
        catch { /* ignore */ }
      }
      setFeedback(cheerForStreak(nextStreak));
      setShowReward(true);
      onShowConfetti();
      if (practiceMode) setPracticeCorrect((n) => n + 1);
    } else {
      // Break the streak — and let the kid see what it WAS so the loss
      // feels concrete instead of invisible.
      if (streak >= 3) {
        setFeedback(`So close — streak ×${streak} ended. The answer was ${puzzle.options.find(o => o.id === puzzle.correctOptionId)?.label}. Bounce back! 💪`);
      } else {
        const rightOpt = puzzle.options.find(o => o.id === puzzle.correctOptionId);
        setFeedback(`Oops! The answer was ${rightOpt?.label}. You'll get it next time! 💪`);
      }
      setStreak(0);
    }

    if (practiceMode) {
      // Track the play locally only — DO NOT call the backend reward
      // endpoint, otherwise practice plays would double-bill against
      // the daily-coin economy.
      setPracticeAttempts((n) => n + 1);
    } else {
      await onPuzzleSolved(correct);
    }
  };

  const handleNext = () => {
    // Practice mode is unlimited; rewarded mode still respects the cap.
    if (!practiceMode && puzzleAttemptsToday >= dailyLimit) return;
    generatePuzzle();
  };

  /** Kick off Practice Mode from the "All Done Today" screen. */
  const enterPracticeMode = () => {
    setPracticeMode(true);
    setStreak(0);
    generatePuzzle();
  };

  const meta = puzzle ? GAME_META[puzzle.gameType] : null;

  return (
    <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-3xl p-1 shadow-2xl border border-indigo-500/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/assets/pattern-dots.svg')] opacity-5" />
      <div className="relative bg-[#0e0e18]/95 backdrop-blur-sm rounded-[20px] p-6 md:p-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 bg-gradient-to-br ${meta?.gradient || 'from-yellow-400 to-orange-500'} rounded-2xl flex items-center justify-center shadow-lg`}>
              <span className="text-2xl">{meta?.emoji || '🧠'}</span>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-white">{meta?.title || 'Shop Math'}</h3>
              <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider">{meta?.subtitle || 'Learn & Earn!'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Streak chip — only shown once the kid has a streak going
                so it doesn't clutter the empty state. Color escalates
                with streak length: amber → orange (3+) → red-fire (5+)
                → fuchsia-electric (10+). */}
            {streak >= 2 && (
              <motion.div
                key={streak}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className={[
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm',
                  streak >= 10 ? 'bg-gradient-to-r from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-500/40'
                  : streak >= 5  ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-orange-500/40'
                  : streak >= 3  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg shadow-amber-500/40'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-200',
                ].join(' ')}
              >
                <span className="text-base sm:text-lg">{streak >= 10 ? '🔥' : streak >= 5 ? '⚡' : '✨'}</span>
                <span>×{streak}</span>
              </motion.div>
            )}

            {/* Mode badge — daily progress when rewarded, "FREE PLAY"
                when in practice mode so the kid never wonders why the
                coin counter isn't ticking. */}
            {practiceMode ? (
              <div className="inline-flex items-center gap-1.5 bg-fuchsia-500/15 border border-fuchsia-500/40 px-3 py-1.5 rounded-xl">
                <span className="text-base">🎮</span>
                <span className="text-fuchsia-200 font-black text-xs">FREE PLAY</span>
                {practiceAttempts > 0 && (
                  <span className="text-fuchsia-300 font-bold text-[11px]">
                    {practiceCorrect}/{practiceAttempts}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                {[...Array(dailyLimit)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full transition-colors ${i < puzzleAttemptsToday ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-gray-700'}`} />
                ))}
                <span className="text-xs text-gray-400 ml-1 font-bold">{puzzleAttemptsToday}/{dailyLimit}</span>
              </div>
            )}

            {selectedAnswer !== null && !dailyLimitReached && (
              <button
                onClick={handleNext}
                className="bg-green-500 hover:bg-green-400 text-black text-xs font-black px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 uppercase flex items-center gap-1 shadow-lg shadow-green-500/20"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {dailyLimitReached ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-7xl mb-5">🏆</motion.div>
            <h3 className="text-3xl font-black text-white mb-2">Daily Rewards Claimed!</h3>
            <p className="text-gray-400 text-base font-medium mb-5 max-w-md">
              You've earned all {dailyLimit} coin rewards today. Come back tomorrow for new ones — or keep training for FREE!
            </p>

            {/* Practice Mode CTA — unlimited free play. No coin reward,
                but streaks + level-ups still feel epic. This turns the
                "one-and-done" feel into "play as much as you want". */}
            <button
              type="button"
              onClick={enterPracticeMode}
              className="group relative inline-flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-white font-black text-base sm:text-lg bg-gradient-to-b from-fuchsia-500 via-violet-500 to-indigo-600 border-b-[4px] border-indigo-800 active:translate-y-[2px] active:border-b-[2px] shadow-2xl shadow-fuchsia-500/40 transition-[transform,border-bottom-width] duration-100 hover:brightness-110"
            >
              <span className="text-xl sm:text-2xl">🎮</span>
              <span>Keep Playing (Free Mode)</span>
            </button>
            <p className="text-[11px] text-gray-500 mt-2">Practice all 5 games — no coin reward, but streaks count!</p>

            {bestStreak > 0 && (
              <div className="mt-5 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl">
                <span className="text-lg">🏅</span>
                <span className="text-amber-200 font-bold text-sm">Best streak ever: ×{bestStreak}</span>
              </div>
            )}
          </div>
        ) : puzzle ? (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {/* ===== CASHIER CHALLENGE ===== */}
              {puzzle.gameType === 'cashier_challenge' && (
                <motion.div key="cashier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <AnimatedCharacter emoji={pickRandom(CUSTOMER_EMOJIS)} />
                    <SpeechBubble text={puzzle.scenario} />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <ProductCard product={puzzle.product!} label="Product" />
                    <CoinPile amount={puzzle.customerPays!} label="Customer Pays" />
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-lg md:text-xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-4 inline-block"
                    >
                      {puzzle.question}
                    </motion.p>
                  </div>
                </motion.div>
              )}

              {/* ===== TAX TIME ===== */}
              {puzzle.gameType === 'tax_time' && (
                <motion.div key="tax" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <AnimatedCharacter emoji="🧾" />
                    <SpeechBubble text={puzzle.scenario} />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <ProductCard product={puzzle.product!} label="Price" />
                    <motion.div
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.4 }}
                      className="text-3xl font-black text-white"
                    >
                      +
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ delay: 0.5 }}
                      className="bg-red-500/20 border-2 border-red-500/30 rounded-2xl px-5 py-3 text-center"
                    >
                      <span className="text-xs text-red-400 uppercase font-bold block">Tax</span>
                      <span className="text-2xl md:text-3xl font-black text-red-400">+{puzzle.tax} coin{puzzle.tax! > 1 ? 's' : ''}</span>
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-lg md:text-xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-4 inline-block"
                    >
                      {puzzle.question}
                    </motion.p>
                  </div>
                </motion.div>
              )}

              {/* ===== QUEUE RUSH ===== */}
              {puzzle.gameType === 'queue_rush' && (
                <motion.div key="queue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg font-black text-purple-300 mb-4"
                    >
                      Customers are lining up at {displayShopName}!
                    </motion.p>
                  </div>
                  <div className="flex flex-wrap items-end justify-center gap-4 md:gap-6">
                    {puzzle.products!.map((prod, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: 100 + i * 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ type: 'spring', delay: 0.2 + i * 0.25 }}
                        className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[120px]"
                      >
                        <span className="text-4xl">{CUSTOMER_EMOJIS[i % CUSTOMER_EMOJIS.length]}</span>
                        <span className="text-sm font-bold text-gray-400">Customer {i + 1}</span>
                        <span className="text-base font-black text-white">{prod.name}</span>
                        <span className="text-xl font-black text-yellow-400">{prod.price} coins</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-lg md:text-xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-4 inline-block"
                    >
                      {puzzle.question}
                    </motion.p>
                  </div>
                </motion.div>
              )}

              {/* ===== PROFIT PUZZLE ===== */}
              {puzzle.gameType === 'profit_puzzle' && (
                <motion.div key="profit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <AnimatedCharacter emoji="🏭" />
                    <SpeechBubble text={puzzle.scenario} />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-3 text-center"
                    >
                      <span className="text-xs text-red-400 uppercase font-bold block">You Spent</span>
                      <span className="text-2xl font-black text-red-400">{puzzle.costPrice} coins</span>
                      <div className="flex justify-center mt-1">
                        {Array.from({ length: Math.min(puzzle.costPrice!, 5) }).map((_, i) => (
                          <motion.span key={i} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + i * 0.05 }} className="text-lg">🪙</motion.span>
                        ))}
                      </div>
                    </motion.div>
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }} className="text-3xl">➡️</motion.span>
                    <motion.div
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-2xl px-5 py-3 text-center"
                    >
                      <span className="text-xs text-green-400 uppercase font-bold block">You Sell For</span>
                      <span className="text-2xl font-black text-green-400">{puzzle.product!.price} coins</span>
                      <div className="flex justify-center mt-1">
                        {Array.from({ length: Math.min(puzzle.product!.price, 5) }).map((_, i) => (
                          <motion.span key={i} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 + i * 0.05 }} className="text-lg">🪙</motion.span>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-lg md:text-xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-4 inline-block"
                    >
                      {puzzle.question}
                    </motion.p>
                  </div>
                </motion.div>
              )}

              {/* ===== BOSS BUDGET ===== */}
              {puzzle.gameType === 'boss_budget' && (
                <motion.div key="budget" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="flex items-start gap-4">
                    <AnimatedCharacter emoji="👔" />
                    <SpeechBubble text={puzzle.scenario} />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-6">
                    {puzzle.budget && (
                      <CoinPile amount={puzzle.budget} label="Your Coins" color="text-yellow-400" />
                    )}
                    {puzzle.staffMember && (
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-3 text-center"
                      >
                        <span className="text-3xl mb-1 block">👷</span>
                        <span className="text-sm font-bold text-gray-400">{puzzle.staffMember.role}</span>
                        <span className="text-base font-black text-white block">{puzzle.staffMember.name}</span>
                        <span className="text-xl font-black text-indigo-400">{puzzle.staffMember.salary} coins</span>
                      </motion.div>
                    )}
                    {puzzle.staffMembers && puzzle.staffMembers.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.2 }}
                        className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-5 py-3 text-center"
                      >
                        <span className="text-3xl mb-1 block">{i === 0 ? '👷' : '👩‍🔧'}</span>
                        <span className="text-sm font-bold text-gray-400">{s.role}</span>
                        <span className="text-base font-black text-white block">{s.name}</span>
                        <span className="text-xl font-black text-indigo-400">{s.salary} coins</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-lg md:text-xl font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-6 py-4 inline-block"
                    >
                      {puzzle.question}
                    </motion.p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Answer Options (shared) */}
            {puzzle && (
              <div className="grid grid-cols-2 gap-3">
                {puzzle.options.map((opt, idx) => (
                  <OptionButton
                    key={`${puzzle.gameType}-${opt.id}`}
                    option={opt}
                    index={idx}
                    isSelected={selectedAnswer === opt.id}
                    isCorrect={opt.id === puzzle.correctOptionId}
                    showResult={selectedAnswer !== null}
                    onSelect={handleSelectAnswer}
                  />
                ))}
              </div>
            )}

            {/* Reward burst */}
            <AnimatePresence>
              {showReward && <CoinRewardBurst />}
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-center text-lg md:text-xl font-black py-4 px-6 rounded-2xl border-2 ${
                    isCorrect
                      ? 'text-green-400 bg-green-500/10 border-green-500/30'
                      : 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                  }`}
                >
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ShopMathGames;
