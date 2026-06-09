import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  Brain,
  Zap,
  CheckCircle,
  Monitor,
  Cpu,
  Bot,
  Rocket,
  Search,
  Gamepad2,
  X,
  Lock,
  Coins,
  Sparkles,
  Smartphone,
  MessageCircle,
  ArrowRight,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { Confetti } from '../components/Confetti';

import { getAssetUrl } from '../lib/api';
import { GLASS, GLASS_HOVER } from '../lib/uiTokens';
import { ModulePage } from '../components/modules/ModulePage';
import { ModuleHero3D } from '../components/modules/ModuleHero3D';

type InnovationId =
  | 'ai_kiosk'
  | 'smart_qds'
  | 'targeting_ai'
  | 'robotic_cleaner'
  | 'analytics_hub'
  | 'smart_inventory'
  | 'drone_delivery'
  | 'eco_energy_grid';

const INNOVATIONS: Array<{
  id: InnovationId;
  name: string;
  category: string;
  description: string;
  cost: number;
  impact: string;
  unlockLevel: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  designLabel: string;
}> = [
    {
      id: 'ai_kiosk',
      name: 'Robot Greeter',
      category: 'Helper',
      description: 'A friendly robot that says hi to everyone!',
      cost: 500,
      impact: 'Happy Customers',
      unlockLevel: 1,
      icon: Bot,
      color: 'text-cyan-400',
      bg: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-400',
      designLabel: 'robot'
    },
    {
      id: 'smart_qds',
      name: 'Fast Line Screen',
      category: 'Speed',
      description: 'Helps friends get their toys faster.',
      cost: 300,
      impact: 'Less Waiting',
      unlockLevel: 1,
      icon: Monitor,
      color: 'text-green-400',
      bg: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400',
      designLabel: 'screen'
    },
    {
      id: 'targeting_ai',
      name: 'Toy Finder',
      category: 'Magic',
      description: 'Knows exactly what toy you want!',
      cost: 800,
      impact: 'More Sales',
      unlockLevel: 1,
      icon: Smartphone,
      color: 'text-purple-400',
      bg: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-400',
      designLabel: 'finder'
    },
    {
      id: 'robotic_cleaner',
      name: 'Sparkle Bot',
      category: 'Clean',
      description: 'Zooms around and cleans up dust!',
      cost: 450,
      impact: 'Shiny Shop',
      unlockLevel: 1,
      icon: Sparkles,
      color: 'text-yellow-400',
      bg: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400',
      designLabel: 'cleaner'
    },
    {
      id: 'analytics_hub',
      name: 'Future Scope',
      category: 'Brain',
      description: 'Sees what will be popular next week.',
      cost: 1500,
      impact: 'Super Smarts',
      unlockLevel: 1,
      icon: Brain,
      color: 'text-blue-400',
      bg: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-400',
      designLabel: 'scope'
    },
    {
      id: 'smart_inventory',
      name: 'Smart Inventory',
      category: 'Auto Stock',
      description: 'Keeps shelves filled and predicts restock timing.',
      cost: 1800,
      impact: 'Stable Stock',
      unlockLevel: 10,
      icon: Cpu,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-400',
      designLabel: 'inventory'
    },
    {
      id: 'drone_delivery',
      name: 'Drone Delivery',
      category: 'Logistics',
      description: 'Fast deliveries that attract more high-value visitors.',
      cost: 2200,
      impact: 'Faster Orders',
      unlockLevel: 10,
      icon: Rocket,
      color: 'text-orange-300',
      bg: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-400',
      designLabel: 'drone'
    },
    {
      id: 'eco_energy_grid',
      name: 'Eco Energy Grid',
      category: 'Sustainability',
      description: 'Cleaner energy improves public image and staff comfort.',
      cost: 2000,
      impact: 'Eco Boost',
      unlockLevel: 10,
      icon: Lightbulb,
      color: 'text-lime-300',
      bg: 'from-lime-500/20 to-green-500/20',
      border: 'border-lime-400',
      designLabel: 'energy'
    }
  ];

type GameLesson = {
  title: string;
  explanation: string;
  codeExample?: string;
  keyPoints: string[];
};

type DragGame = {
  id: string;
  type: 'drag';
  title: string;
  prompt: string;
  lesson: GameLesson;
  blocks: { text: string; icon: React.ElementType; color: string; isCode?: boolean }[];
  correctOrder: string[];
};

type QuizGame = {
  id: string;
  type: 'quiz';
  title: string;
  prompt: string;
  lesson: GameLesson;
  question: string;
  options: { text: string; correct: boolean }[];
};

type MatchGame = {
  id: string;
  type: 'match';
  title: string;
  prompt: string;
  lesson: GameLesson;
  pairs: { left: string; right: string }[];
};

type CodingGame = DragGame | QuizGame | MatchGame;

const CODING_GAMES: CodingGame[] = [
  {
    id: 'algo-1',
    type: 'drag',
    title: 'Robot Logic',
    prompt: 'Create a loop to make the robot wave!',
    lesson: {
      title: 'What are Loops?',
      explanation: 'A loop makes the computer repeat the same code over and over! It\'s like telling your robot "keep waving until I say stop." The while(true) loop repeats forever!',
      codeExample: 'while (true) {\n  // This code repeats forever!\n  robot.wave();\n  wait(1000);\n}',
      keyPoints: [
        'while(true) means "repeat forever"',
        'Code inside { } gets repeated each time',
        'wait(1000) pauses for 1 second between repeats'
      ]
    },
    blocks: [
      { text: 'while(true) {', icon: Zap, color: 'bg-purple-600 font-mono', isCode: true },
      { text: 'robot.wave();', icon: Bot, color: 'bg-blue-600 font-mono', isCode: true },
      { text: 'wait(1000);', icon: Monitor, color: 'bg-cyan-600 font-mono', isCode: true },
      { text: '}', icon: CheckCircle, color: 'bg-purple-600 font-mono', isCode: true }
    ],
    correctOrder: ['while(true) {', 'robot.wave();', 'wait(1000);', '}']
  },
  {
    id: 'algo-2',
    type: 'drag',
    title: 'Shop Assistant',
    prompt: 'Program the greeting sequence.',
    lesson: {
      title: 'Making Decisions with if/else',
      explanation: 'Computers need to make choices too! The if/else command checks a condition and picks what to do. If the condition is true, do one thing. Otherwise (else), do something different!',
      codeExample: 'if (customer) {\n  say("Hello!");\n} else {\n  idle();\n}',
      keyPoints: [
        'if checks whether something is true or false',
        'Code after if runs when the condition is TRUE',
        'Code after else runs when the condition is FALSE'
      ]
    },
    blocks: [
      { text: 'if (customer) {', icon: Search, color: 'bg-orange-600 font-mono', isCode: true },
      { text: 'say("Hello!");', icon: MessageCircle, color: 'bg-green-600 font-mono', isCode: true },
      { text: '} else {', icon: ArrowRight, color: 'bg-orange-600 font-mono', isCode: true },
      { text: 'idle(); }', icon: Lock, color: 'bg-gray-600 font-mono', isCode: true }
    ],
    correctOrder: ['if (customer) {', 'say("Hello!");', '} else {', 'idle(); }']
  },
  {
    id: 'algo-3',
    type: 'drag',
    title: 'Clean Up Bot',
    prompt: 'Fix the cleaning path algorithm.',
    lesson: {
      title: 'What is an Algorithm?',
      explanation: 'An algorithm is just a set of step-by-step instructions, like a recipe! Computers follow each step in order. If the steps are in the wrong order, things go wrong!',
      codeExample: 'While (Dirty)\n  Move Forward\n  Scrub Floor\nrepeat',
      keyPoints: [
        'An algorithm is steps in the correct order',
        'Each step must happen before the next one',
        'The computer follows instructions exactly as written'
      ]
    },
    blocks: [
      { text: 'While (Dirty)', icon: Sparkles, color: 'bg-pink-500', isCode: true },
      { text: 'Move Forward', icon: ArrowRight, color: 'bg-blue-500', isCode: true },
      { text: 'Scrub Floor', icon: Zap, color: 'bg-yellow-500', isCode: true },
      { text: 'repeat', icon: Rocket, color: 'bg-pink-500', isCode: true }
    ],
    correctOrder: ['While (Dirty)', 'Move Forward', 'Scrub Floor', 'repeat']
  },
  {
    id: 'algo-4',
    type: 'drag',
    title: 'Variable Math',
    prompt: 'Calculate the total coins.',
    lesson: {
      title: 'Storing Data with Variables',
      explanation: 'A variable is like a box with a label! You put data inside it and use the label to find it later. You can change what\'s in the box anytime.',
      codeExample: 'Let coins = 0     // Create a box called "coins"\ncoins = coins + 5 // Add 5 to the box\nPrint(coins)       // Show what is inside: 5!',
      keyPoints: [
        '"Let" creates a new variable (a named box)',
        'You can do math with variables like coins + 5',
        'Print() shows the value stored inside'
      ]
    },
    blocks: [
      { text: 'Let coins = 0', icon: Coins, color: 'bg-yellow-500', isCode: true },
      { text: 'coins = coins + 5', icon: ArrowRight, color: 'bg-green-500', isCode: true },
      { text: 'Print(coins)', icon: Monitor, color: 'bg-blue-500', isCode: true },
      { text: 'End', icon: CheckCircle, color: 'bg-gray-500', isCode: true }
    ],
    correctOrder: ['Let coins = 0', 'coins = coins + 5', 'Print(coins)', 'End']
  },
  // Quiz games — multiple choice
  {
    id: 'quiz-1',
    type: 'quiz',
    title: 'Debug Detective',
    prompt: 'Find the bug!',
    lesson: {
      title: 'True, False & Debugging',
      explanation: 'In coding, "true" and "false" are special values called booleans. When you write if(true), the condition is ALWAYS true, so the code inside ALWAYS runs. Debugging means finding mistakes in code!',
      codeExample: 'if (true) {\n  print("This ALWAYS runs!");\n}\n\nif (false) {\n  print("This NEVER runs!");\n}',
      keyPoints: [
        'true means YES, false means NO',
        'if(true) always runs the code inside',
        'Debugging = finding and fixing code mistakes'
      ]
    },
    question: 'What does "if (true)" always do?',
    options: [
      { text: 'Always runs the code inside', correct: true },
      { text: 'Never runs', correct: false },
      { text: 'Runs sometimes', correct: false },
      { text: 'Crashes the program', correct: false },
    ],
  },
  {
    id: 'quiz-2',
    type: 'quiz',
    title: 'Loop Master',
    prompt: 'Test your loop knowledge!',
    lesson: {
      title: 'Counting with For Loops',
      explanation: 'A "for" loop lets you repeat code a specific number of times! It has 3 parts: where to START counting, when to STOP, and how much to count UP each time.',
      codeExample: 'for (i = 0; i < 3; i++) {\n  print("Hello!");\n}\n// i starts at 0\n// Runs while i < 3 (so i = 0, 1, 2)\n// i++ adds 1 each time\n// Result: prints 3 times!',
      keyPoints: [
        'i = 0 means start counting from zero',
        'i < 3 means stop BEFORE reaching 3 (so 0, 1, 2 = three times)',
        'i++ means add 1 to the counter each loop'
      ]
    },
    question: 'How many times does "for(i=0; i<3; i++)" loop?',
    options: [
      { text: '3 times', correct: true },
      { text: '2 times', correct: false },
      { text: '4 times', correct: false },
      { text: 'Forever', correct: false },
    ],
  },
  {
    id: 'quiz-3',
    type: 'quiz',
    title: 'Data Types',
    prompt: 'What type is this?',
    lesson: {
      title: 'Types of Data',
      explanation: 'Computers store different kinds of data. Text like "Hello" is called a String. Numbers like 42 are called Numbers. True/false values are called Booleans. Each type works differently!',
      codeExample: '"Hello"  → String (text)\n42       → Number\ntrue     → Boolean (yes/no)\n[1,2,3]  → Array (a list)',
      keyPoints: [
        'Strings are text wrapped in quotes like "Hello"',
        'Numbers are for math like 42 or 3.14',
        'Booleans are only true or false'
      ]
    },
    question: 'What is the type of the value "Hello"?',
    options: [
      { text: 'String', correct: true },
      { text: 'Number', correct: false },
      { text: 'Boolean', correct: false },
      { text: 'Array', correct: false },
    ],
  },
  {
    id: 'quiz-4',
    type: 'quiz',
    title: 'Function Fun',
    prompt: 'How do functions work?',
    lesson: {
      title: 'Reusable Code with Functions',
      explanation: 'A function is like a mini-program you can reuse! You give it a name, put code inside, and call it whenever you need it. The "return" keyword sends a value back when the function is done.',
      codeExample: 'function add(a, b) {\n  return a + b;  // Sends the answer back!\n}\n\nlet result = add(2, 3);\nprint(result);  // Shows: 5',
      keyPoints: [
        'Functions are reusable blocks of code with a name',
        '"return" sends a value back to whoever called the function',
        'You can call a function many times with different inputs'
      ]
    },
    question: 'What does "return" do in a function?',
    options: [
      { text: 'Sends a value back', correct: true },
      { text: 'Prints to screen', correct: false },
      { text: 'Deletes the function', correct: false },
      { text: 'Creates a new variable', correct: false },
    ],
  },
  // Match games — connect pairs
  {
    id: 'match-1',
    type: 'match',
    title: 'Code Pairs',
    prompt: 'Match the code to what it does!',
    lesson: {
      title: 'Coding Basics 101',
      explanation: 'Every coder needs to know these 4 basic commands! print() shows text on screen, if/else makes decisions, for loops repeat things, and variables store data.',
      codeExample: 'print("Hi!")     // Show text on screen\nif/else          // Make a decision\nfor loop         // Repeat an action\nvariable = 10    // Store data',
      keyPoints: [
        'print() displays text or numbers on screen',
        'if/else lets code choose between two paths',
        'Loops repeat actions, variables store information'
      ]
    },
    pairs: [
      { left: 'print()', right: 'Show text' },
      { left: 'if/else', right: 'Make decisions' },
      { left: 'for loop', right: 'Repeat actions' },
      { left: 'variable', right: 'Store data' },
    ],
  },
  {
    id: 'match-2',
    type: 'match',
    title: 'Tech Match',
    prompt: 'Match the robot part to its job!',
    lesson: {
      title: 'Robot & Computer Parts',
      explanation: 'Robots and computers have special parts, just like your body! Sensors are like eyes (they see things), motors are like legs (they move), the CPU is like a brain (it thinks), and the battery is like food (it gives energy)!',
      keyPoints: [
        'Sensors detect things like light, sound, or touch',
        'Motors make robots move and spin',
        'The CPU (brain) processes all decisions',
        'Batteries provide power to run everything'
      ]
    },
    pairs: [
      { left: 'Sensor', right: 'See things' },
      { left: 'Motor', right: 'Move around' },
      { left: 'CPU', right: 'Think & decide' },
      { left: 'Battery', right: 'Power source' },
    ],
  },
  {
    id: 'match-3',
    type: 'match',
    title: 'Symbol Decoder',
    prompt: 'Match the symbol to its meaning!',
    lesson: {
      title: 'Code Symbols & Operators',
      explanation: 'Coders use special symbols to compare things! == checks if two things are the same, != checks if they are different, && means both must be true, and || means at least one must be true.',
      codeExample: '5 == 5   → true  (same!)\n5 != 3   → true  (different!)\ntrue && true  → true  (both yes!)\ntrue || false → true  (at least one yes!)',
      keyPoints: [
        '== means "is equal to" (checks if same)',
        '!= means "is NOT equal to" (checks if different)',
        '&& means AND (both sides must be true)',
        '|| means OR (at least one side must be true)'
      ]
    },
    pairs: [
      { left: '==', right: 'Equals' },
      { left: '!=', right: 'Not equal' },
      { left: '&&', right: 'And' },
      { left: '||', right: 'Or' },
    ],
  },
];

// Learning concept labels for each game
const GAME_LEARNING: Record<string, { concept: string; emoji: string; color: string }> = {
  'algo-1': { concept: 'Loops', emoji: '🔄', color: 'bg-purple-500' },
  'algo-2': { concept: 'Conditionals', emoji: '❓', color: 'bg-orange-500' },
  'algo-3': { concept: 'Algorithms', emoji: '🧩', color: 'bg-pink-500' },
  'algo-4': { concept: 'Variables', emoji: '📦', color: 'bg-yellow-500' },
  'quiz-1': { concept: 'Debugging', emoji: '🔍', color: 'bg-red-500' },
  'quiz-2': { concept: 'Loops', emoji: '🔄', color: 'bg-purple-500' },
  'quiz-3': { concept: 'Data Types', emoji: '🏷️', color: 'bg-blue-500' },
  'quiz-4': { concept: 'Functions', emoji: '⚡', color: 'bg-cyan-500' },
  'match-1': { concept: 'Code Basics', emoji: '💻', color: 'bg-green-500' },
  'match-2': { concept: 'Hardware', emoji: '🤖', color: 'bg-cyan-500' },
  'match-3': { concept: 'Operators', emoji: '🔣', color: 'bg-indigo-500' },
};

// Simulated code output for drag games
const GAME_OUTPUT: Record<string, string> = {
  'algo-1': '> Robot waves! 🤖👋',
  'algo-2': '> "Hello!" said the shop 🏪',
  'algo-3': '> Floor is sparkly clean! ✨',
  'algo-4': '> Output: 5 coins 🪙',
};

const resolveInnovationImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('/storage/innovations/')) {
    const filename = url.split('/storage/innovations/').pop();
    if (filename) {
      return getAssetUrl(`/aipreneur/innovation-image/${filename}`);
    }
  }
  return url;
};



export const InnovationModule = () => {
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const {
    innovations,
    rewards,
    availableInnovationProjects,
    innovationCatalog,
    innovationRewardsLevel,
    activeInnovationCount,
    maxActiveTech,
    innovationUpgradeStepCost,
    unlockInnovation,
    setInnovationActive,
    upgradeInnovation,
    loadInnovations,
    refreshAll,
  } = useAIpreneur();

  const [selectedTech, setSelectedTech] = useState<typeof INNOVATIONS[number] | null>(null);
  const [codingGames, setCodingGames] = useState<CodingGame[]>([]);
  const [codingSelections, setCodingSelections] = useState<Record<string, string[] | number[]>>({});
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [designMethod, setDesignMethod] = useState<'upload' | 'ai'>('upload');
  const [designUpload, setDesignUpload] = useState<string | null>(null);
  const [pendingActivationProject, setPendingActivationProject] = useState<string | null>(null);
  const [pendingUpgradeProject, setPendingUpgradeProject] = useState<string | null>(null);

  // Quiz game state
  const [quizAnswer, setQuizAnswer] = useState<Record<string, number | null>>({});
  // Match game state: track which left item is selected and matched pairs
  const [matchSelected, setMatchSelected] = useState<string | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<string, Record<string, string>>>({});
  // Lesson phase: show lesson before puzzle
  const [showLesson, setShowLesson] = useState(true);

  // Ref for auto-scrolling to unlock section
  const unlockSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInnovations();
  }, [loadInnovations]);

  useEffect(() => {
    if (selectedTech) {
      // Select 3 random games — ensure variety by picking from different types
      const dragGames = CODING_GAMES.filter(g => g.type === 'drag');
      const quizGames = CODING_GAMES.filter(g => g.type === 'quiz');
      const matchGames = CODING_GAMES.filter(g => g.type === 'match');
      const picked: CodingGame[] = [];
      // Pick one from each type (shuffled), then fill remaining
      const pools = [dragGames, quizGames, matchGames].sort(() => 0.5 - Math.random());
      for (const pool of pools) {
        if (picked.length >= 3) break;
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        if (shuffled.length > 0) picked.push(shuffled[0]);
      }
      // Shuffle the final order
      picked.sort(() => 0.5 - Math.random());
      setCodingGames(picked);
      setCodingSelections({});
      setQuizAnswer({});
      setMatchSelected(null);
      setMatchPairs({});
      setShowLesson(true);
      setMessage(null);
      setCurrentGameIndex(0);
      setDesignMethod('upload');
      setDesignUpload(null);
    }
  }, [selectedTech]);

  const unlockedSet = useMemo(() => {
    return new Set((innovations || []).map((inv) => inv.tech_project));
  }, [innovations]);

  const availableProjectSet = useMemo(() => {
    return new Set(availableInnovationProjects || []);
  }, [availableInnovationProjects]);

  const innovationsByProject = useMemo(() => {
    const map = new Map<string, (typeof innovations)[number]>();
    (innovations || []).forEach((innovation) => {
      map.set(innovation.tech_project, innovation);
    });
    return map;
  }, [innovations]);

  const catalogById = useMemo(() => {
    const map = new Map<string, (typeof innovationCatalog)[number]>();
    (innovationCatalog || []).forEach((project) => {
      map.set(project.id, project);
    });
    return map;
  }, [innovationCatalog]);

  const innovationUnlockCosts = useMemo(() => {
    const map = new Map<InnovationId, number>();
    INNOVATIONS.forEach((tech) => {
      const rawCost = Number(catalogById.get(tech.id)?.unlock_cost);
      map.set(tech.id, Number.isFinite(rawCost) && rawCost >= 0 ? rawCost : tech.cost);
    });
    return map;
  }, [catalogById]);

  const ownedTechList = useMemo(() => {
    return INNOVATIONS
      .map((tech) => {
        const innovation = innovationsByProject.get(tech.id);
        if (!innovation) return null;
        return { tech, innovation };
      })
      .filter((entry): entry is { tech: (typeof INNOVATIONS)[number]; innovation: (typeof innovations)[number] } => !!entry);
  }, [innovationsByProject]);

  const getDragSelection = (game: Extract<CodingGame, { type: 'drag' }>) => {
    const stored = codingSelections[game.id];
    const slots = Array(game.correctOrder.length).fill('');
    if (Array.isArray(stored)) {
      stored.forEach((value, idx) => {
        if (typeof value === 'string' && idx < slots.length) slots[idx] = value;
      });
    }
    return slots;
  };



  const isGameCorrect = (game: CodingGame) => {
    if (game.type === 'drag') {
      const slots = getDragSelection(game);
      return slots.every((slot, idx) => slot === game.correctOrder[idx]);
    }
    if (game.type === 'quiz') {
      const ans = quizAnswer[game.id];
      if (ans === null || ans === undefined) return false;
      return game.options[ans]?.correct === true;
    }
    if (game.type === 'match') {
      const matched = matchPairs[game.id] || {};
      return game.pairs.every(p => matched[p.left] === p.right);
    }
    return false;
  };

  const currentGame = codingGames[currentGameIndex];
  const currentCorrect = currentGame ? isGameCorrect(currentGame) : false;
  const isLastGame = currentGameIndex >= codingGames.length - 1 && codingGames.length > 0;
  const allGamesComplete = codingGames.length > 0 && codingGames.every(g => isGameCorrect(g));

  // Auto-scroll to unlock section when all games complete
  useEffect(() => {
    if (allGamesComplete && unlockSectionRef.current) {
      setTimeout(() => {
        unlockSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [allGamesComplete]);

  const handleNextGame = () => {
    if (!currentGame) return;
    if (!currentCorrect) {
      setMessage({ type: 'error', text: 'Solve the puzzle to continue!' });
      return;
    }
    setMessage(null);
    setShowLesson(true);
    setCurrentGameIndex((prev) => Math.min(prev + 1, codingGames.length - 1));
  };

  const handleDesignUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDesignUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUnlock = async () => {
    if (!selectedTech || isUnlocking) return;

    const selectedProjectMeta = catalogById.get(selectedTech.id);
    const selectedRequiredLevel = selectedProjectMeta?.unlock_level ?? selectedTech.unlockLevel;
    const selectedUnlockCost = innovationUnlockCosts.get(selectedTech.id) ?? selectedTech.cost;
    const selectedLevelUnlocked = availableProjectSet.size > 0
      ? availableProjectSet.has(selectedTech.id)
      : innovationRewardsLevel >= selectedRequiredLevel;

    if (!selectedLevelUnlocked) {
      setMessage({ type: 'error', text: `Reach level ${selectedRequiredLevel} to unlock this tech.` });
      return;
    }

    if (!codingGames.length || !isGameCorrect(codingGames[codingGames.length - 1])) {
      setMessage({ type: 'error', text: 'Finish all games first!' });
      return;
    }

    const designImage = designMethod === 'ai' ? 'AI_GENERATE' : designUpload;

    if (designMethod === 'upload' && !designImage) {
      setMessage({ type: 'error', text: 'Please upload a photo first!' });
      return;
    }

    const currentAiTokens = rewards?.ai_tokens || 0;
    if (currentAiTokens < selectedUnlockCost) {
      setMessage({ type: 'error', text: `Need more AI tokens! You need ${selectedUnlockCost}.` });
      return;
    }

    const quizAnswers = codingGames.map((game) => {
      let answer = '';
      if (game.type === 'drag') {
        const slots = getDragSelection(game);
        answer = slots.filter(Boolean).join(' -> ');
      } else if (game.type === 'quiz') {
        const ans = quizAnswer[game.id];
        answer = ans !== null && ans !== undefined ? game.options[ans]?.text || '' : '';
      } else if (game.type === 'match') {
        const matched = matchPairs[game.id] || {};
        answer = Object.entries(matched).map(([l, r]) => `${l} → ${r}`).join(', ');
      }
      return {
        question: game.prompt,
        answer,
        correct: isGameCorrect(game)
      };
    });

    setIsUnlocking(true);
    try {
      const unlockResult = await unlockInnovation({
        tech_project: selectedTech.id,
        quiz_answers: quizAnswers,
        design_image_data: designImage,
        cost: selectedUnlockCost,
      });

      if (!unlockResult) {
        setMessage({ type: 'error', text: 'Oops! Something went wrong. Try again.' });
        return;
      }

      setMessage({ type: 'success', text: `Yay! ${selectedTech.name} unlocked!` });

      await refreshAll();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      setSelectedTech(null);
    } catch (error) {
      console.error('Failed to unlock innovation:', error);
      setMessage({ type: 'error', text: 'Oops! Something went wrong.' });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleToggleInnovation = async (techProject: string, active: boolean) => {
    if (pendingActivationProject === techProject) return;
    const innovation = innovationsByProject.get(techProject);
    if (!innovation) return;
    const techName = INNOVATIONS.find((tech) => tech.id === techProject)?.name || techProject;

    setPendingActivationProject(techProject);
    try {
      const success = await setInnovationActive(innovation.id, active);
      if (!success) {
        setMessage({
          type: 'error',
          text: active
            ? `You can only activate up to ${maxActiveTech} tech items.`
            : 'Unable to update tech activation right now.',
        });
        return;
      }

      setMessage({
        type: 'success',
        text: active ? `${techName} activated.` : `${techName} deactivated.`,
      });
    } finally {
      setPendingActivationProject(null);
    }
  };

  const handleUpgradeOwnedInnovation = async (techProject: string) => {
    if (pendingUpgradeProject === techProject) return;
    const innovation = innovationsByProject.get(techProject);
    if (!innovation) return;
    const techName = INNOVATIONS.find((tech) => tech.id === techProject)?.name || techProject;

    setPendingUpgradeProject(techProject);
    try {
      const upgraded = await upgradeInnovation(innovation.id);
      if (!upgraded) {
        setMessage({ type: 'error', text: 'Upgrade failed. Check AI tokens and try again.' });
        return;
      }

      setMessage({
        type: 'success',
        text: `${techName} upgraded to level ${upgraded.upgrade_level}.`,
      });
    } finally {
      setPendingUpgradeProject(null);
    }
  };

  return (
    <ModulePage
      title="Innovation Lab"
      subtitle="Upgrade your shop with smart tech"
      icon={Lightbulb}
      tone="violet"
      onBack={() => smartBack()}
      hero={<ModuleHero3D kind="innovation" caption="Power up your shop with tech" />}
      lesson={{
        title: 'Innovation compounds',
        body: "Investing in better tools today (a kiosk, smarter inventory, an analytics hub) reduces tomorrow's costs and unlocks scale. Each upgrade pays for itself if you pick the right one for your stage.",
      }}
    >
      <Confetti show={showConfetti} />

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] p-4 rounded-3xl border-4 flex items-center gap-3 shadow-xl max-w-lg ${message.type === 'success'
                ? 'bg-green-500/20 border-green-400 text-green-100'
                : 'bg-red-500/20 border-red-400 text-red-100'
                }`}
            >
              <div className={`p-2 rounded-full flex-shrink-0 ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
              </div>
              <p className="font-bold text-lg">{message.text}</p>
              <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friendly intro — gives the kid a goal before the upgrade
            grid: pick one, unlock it, watch your shop level up. */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            🚀 Upgrade your shop with smart tech
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Each gadget makes your shop faster, friendlier, or smarter. Save your coins, pick wisely!
          </p>
        </div>

        {/* Tech Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {INNOVATIONS.map((tech) => {
            const projectMeta = catalogById.get(tech.id);
            const requiredLevel = projectMeta?.unlock_level ?? tech.unlockLevel;
            const isLevelUnlocked = availableProjectSet.size > 0
              ? availableProjectSet.has(tech.id)
              : innovationRewardsLevel >= requiredLevel;
            const isUnlocked = unlockedSet.has(tech.id);
            const unlockedEntry = innovationsByProject.get(tech.id);
            const previewUrl = resolveInnovationImageUrl(unlockedEntry?.design_image_url || undefined);
            const isActive = unlockedEntry?.is_active ?? false;
            const level = Math.max(1, unlockedEntry?.upgrade_level ?? 1);

            return (
              <motion.button
                key={tech.id}
                whileHover={isUnlocked ? { scale: 1.01 } : { scale: 1.03, rotate: isLevelUnlocked ? 1 : 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => !isUnlocked && isLevelUnlocked && setSelectedTech(tech)}
                disabled={isUnlocked || !isLevelUnlocked}
                className={`text-left relative rounded-[2.5rem] p-6 border-4 transition-all overflow-hidden h-full flex flex-col group ${isUnlocked
                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-green-500 opacity-90'
                  : isLevelUnlocked
                    ? `bg-gradient-to-br ${tech.bg} ${tech.border} hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`
                    : 'bg-gradient-to-br from-slate-900 to-slate-800 border-white/10 opacity-70 cursor-not-allowed'
                  }`}
              >
                {isUnlocked ? (
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                    Owned
                  </div>
                ) : !isLevelUnlocked ? (
                  <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Lv {requiredLevel} Required
                  </div>
                ) : null}

                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-xl ring-4 ring-white/10 ${isUnlocked ? 'bg-gray-700 grayscale' : 'bg-white/20 backdrop-blur-md'}`}>
                  <tech.icon className={`w-10 h-10 ${isUnlocked ? 'text-gray-400' : 'text-white drop-shadow-md'}`} />
                </div>

                <div className="mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-black/20 text-white/80`}>
                    {tech.category}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-white mb-2 leading-tight">{tech.name}</h3>
                <p className="text-blue-100/80 text-sm font-medium mb-4 flex-grow">{tech.description}</p>

                {previewUrl && (
                  <div className="mb-4 rounded-2xl border-2 border-white/20 overflow-hidden shadow-inner">
                    <img src={previewUrl} alt={tech.name} className="w-full h-32 object-cover" />
                  </div>
                )}

                <div className="mt-auto pt-4 border-t border-white/10">
                  {isUnlocked ? (
                    <div className="space-y-2">
                      <div className="text-green-400 font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> {isActive ? 'Active in Shop' : 'Owned (Inactive)'}
                      </div>
                      <div className="text-xs text-white/70">Level {level}/6</div>
                      {unlockedEntry?.scaled_effects && (
                        <div className="text-[11px] text-cyan-200/90 leading-5">
                          Sales +{unlockedEntry.scaled_effects.sales_boost.toFixed(1)}% | Popularity +{unlockedEntry.scaled_effects.popularity_boost.toFixed(1)}% | Mood +{unlockedEntry.scaled_effects.mood_boost.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-300 font-black text-lg flex items-center gap-1">
                        <Coins className="w-5 h-5 fill-yellow-400" /> {innovationUnlockCosts.get(tech.id) ?? tech.cost}
                      </span>
                      <span className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                        Unlock now
                      </span>
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Tech Management */}
        <div className="mt-8 rounded-[2.5rem] p-6 md:p-8 border-4 border-cyan-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/95">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-3xl font-black text-white">Tech Management</h2>
              <p className="text-cyan-200 font-medium">
                Activate up to {maxActiveTech} tech items inside your simulator and upgrade each to level 6.
              </p>
              <p className="text-xs text-white/60 mt-1">
                Current rewards level: {innovationRewardsLevel}. Reach level 10 to unlock Smart Inventory, Drone Delivery, and Eco Energy Grid.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 px-4 py-2">
              <Cpu className="w-4 h-4 text-cyan-300" />
              <span className="text-sm font-black text-cyan-100">
                Active Tech: {activeInnovationCount}/{maxActiveTech}
              </span>
            </div>
          </div>

          {ownedTechList.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-white/70">
              Unlock your first tech from the cards above to start managing activations and upgrades.
            </div>
          ) : (
            <div className="space-y-3">
              {ownedTechList.map(({ tech, innovation }) => {
                const scaled = innovation.scaled_effects;
                const level = Math.max(1, innovation.upgrade_level ?? 1);
                const canUpgrade = level < 6;
                const isActive = innovation.is_active;
                const canActivate = isActive || activeInnovationCount < maxActiveTech;
                const isActivationPending = pendingActivationProject === tech.id;
                const isUpgradePending = pendingUpgradeProject === tech.id;
                const nextUpgradeCost = Math.max(0, innovationUpgradeStepCost) * Math.min(6, level + 1);

                return (
                  <div key={innovation.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-black text-white">{tech.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isActive ? 'bg-green-500/20 text-green-200 border border-green-400/40' : 'bg-white/10 text-white/70 border border-white/20'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                          Level {level}/6
                        </span>
                      </div>
                      <p className="text-sm text-white/70">{tech.category}</p>
                      {scaled && (
                        <p className="text-xs text-cyan-200/90 mt-1">
                          Sales +{scaled.sales_boost.toFixed(1)}% | Popularity +{scaled.popularity_boost.toFixed(1)}% | Mood +{scaled.mood_boost.toFixed(1)}%
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleToggleInnovation(tech.id, !isActive)}
                        disabled={isActivationPending || !canActivate}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isActive
                          ? 'bg-rose-500/20 border border-rose-400/40 text-rose-200 hover:bg-rose-500/30'
                          : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30'} ${isActivationPending || !canActivate ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isActivationPending
                          ? 'Saving...'
                          : isActive
                            ? 'Deactivate'
                            : !canActivate
                              ? `Limit ${maxActiveTech} Active`
                              : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleUpgradeOwnedInnovation(tech.id)}
                        disabled={isUpgradePending || !canUpgrade}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${canUpgrade
                          ? 'bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 hover:bg-yellow-500/30'
                          : 'bg-white/10 border border-white/20 text-white/50'} ${isUpgradePending ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isUpgradePending
                          ? 'Upgrading...'
                          : canUpgrade
                            ? `Upgrade (${nextUpgradeCost} AI)`
                            : 'Max Level'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* WORKSHOP BANNER */}
        <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[3rem] p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <span className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-black text-white uppercase tracking-widest mb-4 border border-white/30">
                Live Workshop
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight leading-none">
                Learn Real <span className="text-yellow-300">Coding!</span>
              </h2>
              <p className="text-indigo-100 text-lg font-medium max-w-xl">
                Join our expert mentors and learn how to build your own apps, games, and website in just 4 weeks.
              </p>
            </div>

            <div className="bg-white p-2 rounded-[2rem] rotate-2 shadow-2xl">
              <div className="bg-[#0f172a] rounded-[1.5rem] p-6 border-4 border-indigo-100 w-full max-w-sm">
                <div className="flex -space-x-3 mb-4 justify-center">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 border-2 border-white ring-2 ring-[#0f172a]" />
                  ))}
                </div>
                <button
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-xl hover:scale-105 transition-transform shadow-lg"
                  onClick={() => navigate('/s/classes?category=coding')}
                >
                  Book a Slot
                </button>
                <p className="text-center text-gray-400 text-xs mt-3 font-bold uppercase tracking-widest">Limited Spots Available</p>
              </div>
            </div>
          </div>
        </div>

      <AnimatePresence>
        {selectedTech && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="w-full max-w-4xl max-h-[95vh] overflow-y-auto custom-scrollbar bg-[#1e293b] border-4 border-white/10 rounded-[3rem] p-6 md:p-8 shadow-2xl relative"
            >
              {/* Modal Close */}
              <button
                onClick={() => setSelectedTech(null)}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all z-20"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="text-center mb-8">
                <h2 className="text-4xl font-black text-white mb-2">Invent the <span className={selectedTech.color}>{selectedTech.name}</span></h2>
                <p className="text-blue-200 text-lg">Complete the puzzles to build your invention!</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Game Section */}
                <div className="space-y-6">
                  <div className="bg-[#0f172a] rounded-[2rem] p-6 border-4 border-blue-500/30 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-black text-xl flex items-center gap-2">
                        {showLesson ? (
                          <><BookOpen className="text-cyan-400" /> Lesson {currentGameIndex + 1}</>
                        ) : (
                          <><Gamepad2 className="text-purple-400" /> Puzzle {currentGameIndex + 1}</>
                        )}
                      </h3>
                      <div className="flex gap-1">
                        {codingGames.map((_, i) => (
                          <div key={i} className={`w-3 h-3 rounded-full ${i < currentGameIndex ? 'bg-green-500' : i === currentGameIndex ? 'bg-yellow-400 animate-pulse' : 'bg-white/10'}`} />
                        ))}
                      </div>
                    </div>

                    {/* THE GAME AREA */}
                    {currentGame && (
                      <AnimatePresence mode="wait">
                      <motion.div
                        key={currentGame.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-800/50 rounded-2xl p-4 min-h-[300px] flex flex-col"
                      >
                        {/* Learning concept badge */}
                        {GAME_LEARNING[currentGame.id] && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex justify-center mb-3"
                          >
                            <span className={`${GAME_LEARNING[currentGame.id].color} text-white text-xs font-black px-3 py-1 rounded-full inline-flex items-center gap-1.5`}>
                              {GAME_LEARNING[currentGame.id].emoji} Learning: {GAME_LEARNING[currentGame.id].concept}
                            </span>
                          </motion.div>
                        )}

                        {/* ═══ LESSON PHASE ═══ */}
                        {showLesson && currentGame.lesson ? (
                          <div className="flex-1 flex flex-col">
                            <h4 className="text-white font-black text-xl text-center mb-4">{currentGame.lesson.title}</h4>
                            <p className="text-white/80 text-sm sm:text-base leading-relaxed text-center mb-5">{currentGame.lesson.explanation}</p>

                            {currentGame.lesson.codeExample && (
                              <div className="bg-[#1e1e2e] rounded-xl border border-white/10 overflow-hidden mb-5">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181825] border-b border-white/5">
                                  <div className="flex gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                  </div>
                                  <span className="text-[10px] text-gray-500 font-mono ml-2">example.js</span>
                                </div>
                                <pre className="p-3 text-sm font-mono text-green-300 whitespace-pre-wrap leading-relaxed">{currentGame.lesson.codeExample}</pre>
                              </div>
                            )}

                            <div className="space-y-2 mb-6">
                              {currentGame.lesson.keyPoints.map((point, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.3 + i * 0.15 }}
                                  className="flex items-start gap-2 bg-white/5 rounded-xl px-3 py-2"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-white/70 text-xs sm:text-sm">{point}</span>
                                </motion.div>
                              ))}
                            </div>

                            <motion.button
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.6, type: 'spring' }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setShowLesson(false)}
                              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-sm shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
                            >
                              <Zap className="w-4 h-4" /> I&apos;m Ready! Let&apos;s Go!
                            </motion.button>
                          </div>
                        ) : (
                          <>
                        <p className="text-white font-bold text-lg mb-4 text-center">{currentGame.prompt}</p>

                        {/* ═══ DRAG GAME (Code Editor Style) ═══ */}
                        {currentGame.type === 'drag' && (
                          <div className="flex-1 flex flex-col justify-center">
                            {/* Terminal-style code editor */}
                            <div className="bg-[#1e1e2e] rounded-xl border border-white/10 overflow-hidden mb-6">
                              {/* Terminal header */}
                              <div className="flex items-center gap-2 px-3 py-2 bg-[#181825] border-b border-white/5">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                </div>
                                <span className="text-[10px] text-gray-500 font-mono ml-2">code.js</span>
                              </div>
                              {/* Code slots */}
                              <div className="p-3 space-y-2">
                                {getDragSelection(currentGame).map((slot, idx) => {
                                  const block = currentGame.blocks.find(b => b.text === slot);
                                  return (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.1 }}
                                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all min-h-[44px] ${slot ? `${block?.color} text-white shadow-md` : 'border border-dashed border-white/20 bg-white/5 text-white/30'}`}
                                      onClick={() => {
                                        if (!slot) return;
                                        setCodingSelections(prev => {
                                          const slots = getDragSelection(currentGame);
                                          slots[idx] = '';
                                          return { ...prev, [currentGame.id]: slots };
                                        })
                                      }}
                                    >
                                      <span className="text-gray-500 text-xs font-mono w-5 text-right select-none">{idx + 1}</span>
                                      <span className="text-white/20 select-none">│</span>
                                      {block ? (
                                        <>
                                          <block.icon className="w-4 h-4 flex-shrink-0" />
                                          <span className="text-sm font-mono font-bold">{slot}</span>
                                        </>
                                      ) : (
                                        <span className="text-xs font-mono italic">// drop code here...</span>
                                      )}
                                    </motion.div>
                                  )
                                })}
                              </div>
                              {/* Simulated output */}
                              {isGameCorrect(currentGame) && GAME_OUTPUT[currentGame.id] && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="border-t border-white/10 bg-[#11111b] px-3 py-2"
                                >
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-[10px] text-green-400 font-mono font-bold">OUTPUT</span>
                                  </div>
                                  <p className="text-green-300 text-sm font-mono">{GAME_OUTPUT[currentGame.id]}</p>
                                </motion.div>
                              )}
                            </div>

                            {/* Available blocks to drag */}
                            <p className="text-center text-gray-500 text-xs font-bold mb-2 uppercase tracking-wider">Tap blocks in the right order</p>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {currentGame.blocks.filter(b => !getDragSelection(currentGame).includes(b.text)).map((block, i) => (
                                <motion.button
                                  key={block.text}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 300 }}
                                  whileHover={{ scale: 1.08, y: -3 }}
                                  whileTap={{ scale: 0.92 }}
                                  onClick={() => {
                                    const slots = getDragSelection(currentGame);
                                    const emptyIdx = slots.findIndex(s => !s);
                                    if (emptyIdx === -1) return;
                                    const newSlots = [...slots];
                                    newSlots[emptyIdx] = block.text;
                                    setCodingSelections(prev => ({ ...prev, [currentGame.id]: newSlots }));
                                  }}
                                  className={`px-4 py-3 rounded-xl font-bold text-white shadow-md transition-transform flex items-center gap-2 font-mono text-sm ${block.color}`}
                                >
                                  <block.icon className="w-4 h-4" /> {block.text}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ═══ QUIZ GAME ═══ */}
                        {currentGame.type === 'quiz' && (
                          <div className="flex-1 flex flex-col justify-center">
                            {/* Question in code-style box */}
                            <div className="bg-[#1e1e2e] border border-indigo-500/20 rounded-xl overflow-hidden mb-6">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#181825] border-b border-white/5">
                                <Search className="w-3 h-3 text-indigo-400" />
                                <span className="text-[10px] text-indigo-400 font-mono font-bold">QUESTION</span>
                              </div>
                              <div className="p-4 text-center">
                                <p className="text-lg font-black text-indigo-200 font-mono">{currentGame.question}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {currentGame.options.map((opt, idx) => {
                                const selected = quizAnswer[currentGame.id];
                                const isSelected = selected === idx;
                                const showResult = selected !== null && selected !== undefined;
                                return (
                                  <motion.button
                                    key={idx}
                                    initial={{ x: -15, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 + idx * 0.1, type: 'spring' }}
                                    whileHover={!showResult ? { scale: 1.02, x: 4 } : {}}
                                    whileTap={!showResult ? { scale: 0.98 } : {}}
                                    onClick={() => {
                                      if (showResult) return;
                                      setQuizAnswer(prev => ({ ...prev, [currentGame.id]: idx }));
                                    }}
                                    className={`p-4 rounded-xl border-2 text-left font-bold transition-all ${
                                      showResult
                                        ? opt.correct
                                          ? 'border-green-500 bg-green-500/20 text-green-300'
                                          : isSelected
                                            ? 'border-red-500 bg-red-500/20 text-red-300'
                                            : 'border-white/5 bg-white/5 text-gray-500'
                                        : 'border-white/10 bg-white/5 text-white hover:border-indigo-500/50 hover:bg-indigo-500/10 cursor-pointer'
                                    }`}
                                  >
                                    <span className="text-xs text-gray-500 mr-2 font-mono">{String.fromCharCode(65 + idx)}.</span>
                                    {opt.text}
                                    {showResult && opt.correct && (
                                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                        <CheckCircle className="inline w-4 h-4 ml-2 text-green-400" />
                                      </motion.span>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ═══ MATCH GAME ═══ */}
                        {currentGame.type === 'match' && (() => {
                          const matched = matchPairs[currentGame.id] || {};
                          const matchedRights = new Set(Object.values(matched));
                          const matchCount = Object.keys(matched).length;
                          const totalPairs = currentGame.pairs.length;
                          // Shuffle right options once (use game id as seed-like stable order)
                          const shuffledRights = [...currentGame.pairs.map(p => p.right)].sort((a, b) => {
                            const ha = a.charCodeAt(0) + currentGame.id.charCodeAt(currentGame.id.length - 1);
                            const hb = b.charCodeAt(0) + currentGame.id.charCodeAt(currentGame.id.length - 1);
                            return ha - hb;
                          });
                          return (
                            <div className="flex-1 flex flex-col justify-center">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-gray-400 text-sm font-bold">Tap left, then match on right!</p>
                                <div className="flex items-center gap-1.5">
                                  {Array.from({ length: totalPairs }).map((_, i) => (
                                    <motion.div
                                      key={i}
                                      animate={i < matchCount ? { scale: [1, 1.3, 1] } : {}}
                                      className={`w-2.5 h-2.5 rounded-full transition-all ${i < matchCount ? 'bg-green-400' : 'bg-gray-700'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Left column — code concepts */}
                                <div className="space-y-3">
                                  {currentGame.pairs.map((pair, i) => {
                                    const isMatched = !!matched[pair.left];
                                    const isActive = matchSelected === pair.left;
                                    return (
                                      <motion.button
                                        key={pair.left}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        whileHover={!isMatched ? { scale: 1.03 } : {}}
                                        whileTap={!isMatched ? { scale: 0.97 } : {}}
                                        onClick={() => {
                                          if (isMatched) return;
                                          setMatchSelected(isActive ? null : pair.left);
                                        }}
                                        className={`w-full p-3 rounded-xl font-bold text-sm transition-all border-2 ${
                                          isMatched
                                            ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                            : isActive
                                              ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 ring-2 ring-yellow-400/30 scale-105'
                                              : 'bg-white/10 border-white/10 text-white hover:border-blue-400 cursor-pointer'
                                        }`}
                                      >
                                        <span className="font-mono">{pair.left}</span>
                                        {isMatched && <span className="ml-1 text-green-400">✓</span>}
                                      </motion.button>
                                    );
                                  })}
                                </div>
                                {/* Right column — definitions */}
                                <div className="space-y-3">
                                  {shuffledRights.map((right, i) => {
                                    const isMatched = matchedRights.has(right);
                                    return (
                                      <motion.button
                                        key={right}
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        whileHover={matchSelected && !isMatched ? { scale: 1.03 } : {}}
                                        whileTap={matchSelected && !isMatched ? { scale: 0.97 } : {}}
                                        onClick={() => {
                                          if (isMatched || !matchSelected) return;
                                          const correctPair = currentGame.pairs.find(p => p.left === matchSelected);
                                          if (correctPair?.right === right) {
                                            setMatchPairs(prev => ({
                                              ...prev,
                                              [currentGame.id]: { ...(prev[currentGame.id] || {}), [matchSelected]: right }
                                            }));
                                          }
                                          setMatchSelected(null);
                                        }}
                                        className={`w-full p-3 rounded-xl font-bold text-sm transition-all border-2 ${
                                          isMatched
                                            ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                            : matchSelected
                                              ? 'bg-blue-500/10 border-blue-400/30 text-blue-200 hover:border-blue-400 cursor-pointer animate-pulse'
                                              : 'bg-white/5 border-white/10 text-gray-400'
                                        }`}
                                      >
                                        {right}
                                        {isMatched && <span className="ml-1">✓</span>}
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                          </>
                        )}
                      </motion.div>
                      </AnimatePresence>
                    )}


                    <div className="mt-6 flex justify-between items-center">
                      <button
                        disabled={currentGameIndex === 0 && showLesson}
                        onClick={() => {
                          if (!showLesson) {
                            setShowLesson(true);
                          } else {
                            setCurrentGameIndex(prev => prev - 1);
                          }
                        }}
                        className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold disabled:opacity-20 hover:bg-white/20"
                      >
                        Back
                      </button>

                      {currentCorrect ? (
                        isLastGame ? (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="px-6 py-3 rounded-xl bg-green-500/20 text-green-400 font-black border border-green-500/30 flex items-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" /> All Puzzles Complete!
                          </motion.div>
                        ) : (
                          <motion.button
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            onClick={handleNextGame}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black shadow-lg shadow-green-500/30 hover:scale-105 active:scale-95 transition-all"
                          >
                            <span className="flex items-center gap-2">
                              ⚡ Next Level →
                            </span>
                          </motion.button>
                        )
                      ) : (
                        <div className="px-6 py-3 rounded-xl bg-white/5 text-white/30 font-bold border border-white/5 cursor-not-allowed flex items-center gap-2">
                          <Zap className="w-4 h-4" /> Solve to continue
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* Design Section — locked until all games are complete */}
                <div className="space-y-6" ref={unlockSectionRef}>
                  {!allGamesComplete ? (
                    <div className="bg-[#0f172a] rounded-[2rem] p-8 border-4 border-white/10 flex flex-col items-center justify-center text-center min-h-[300px]">
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-10 h-10 text-white/20" />
                      </div>
                      <h3 className="text-white/40 font-black text-xl mb-2">Design Locked</h3>
                      <p className="text-white/25 font-medium text-sm max-w-[240px]">
                        Complete all {codingGames.length} coding puzzles to unlock the design & build section
                      </p>
                      <div className="flex gap-2 mt-4">
                        {codingGames.map((g, i) => (
                          <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all ${isGameCorrect(g) ? 'bg-green-500' : 'bg-white/10'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, type: 'spring' }}
                    >
                      <div className="bg-[#0f172a] rounded-[2rem] p-6 border-4 border-purple-500/30">
                        <h3 className="text-white font-black text-xl mb-4 flex items-center gap-2">
                          <Sparkles className="text-pink-400" />
                          Design Your Invention
                        </h3>

                        <div className="flex gap-2 mb-4 bg-white/5 p-1 rounded-xl">
                          <button
                            onClick={() => setDesignMethod('upload')}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${designMethod === 'upload' ? 'bg-purple-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                          >
                            <Search className="w-4 h-4" /> Upload
                          </button>
                          <button
                            onClick={() => setDesignMethod('ai')}
                            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${designMethod === 'ai' ? 'bg-pink-500 text-white shadow-md' : 'text-white/50 hover:text-white'}`}
                          >
                            <Brain className="w-4 h-4" /> Let AI Decide
                          </button>
                        </div>

                        <div className="aspect-square bg-slate-800 rounded-2xl overflow-hidden border-2 border-dashed border-white/20 relative">
                          {designMethod === 'upload' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center relative group">
                              <input type="file" accept="image/*" onChange={handleDesignUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                              {designUpload ? (
                                <div className="relative w-full h-full">
                                  <img src={designUpload} alt="Preview" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-xl">Tap to change</span>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                                    <Search className="w-8 h-8 text-white/50" />
                                  </div>
                                  <p className="text-white/50 font-medium">Tap to upload blueprint</p>
                                  <p className="text-white/30 text-xs mt-1">(We will create the real thing!)</p>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center relative bg-gradient-to-br from-pink-500/10 to-purple-500/10">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4"
                              >
                                <Brain className="w-12 h-12 text-white" />
                              </motion.div>
                              <h4 className="text-xl font-black text-white mb-1">AI Magic</h4>
                              <p className="text-white/50 text-center max-w-[200px] text-sm">
                                The AI will invent something amazing for you!
                              </p>
                              <div className="mt-4 px-4 py-1 bg-yellow-500/20 rounded-full border border-yellow-500/30 text-yellow-300 text-xs font-bold flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Costs AI Tokens
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {(() => {
                        const designReady = designMethod === 'ai' || (designMethod === 'upload' && !!designUpload);
                        const canPay = designReady && !isUnlocking;
                        return (
                          <button
                            onClick={handleUnlock}
                            disabled={!canPay}
                            className={`w-full py-5 rounded-[2rem] text-2xl font-black shadow-xl transition-all flex items-center justify-center gap-3 mt-6 ${
                              canPay
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-orange-500/30 hover:scale-[1.02] active:scale-95'
                                : 'bg-gray-700/50 text-white/30 cursor-not-allowed shadow-none'
                            }`}
                          >
                            {isUnlocking ? 'Unlocking...' : !designReady ? (
                              <>
                                <Brain className="w-7 h-7 text-white/30" />
                                <span>Choose a design above</span>
                              </>
                            ) : (
                              <>
                                <Coins className="w-8 h-8" />
                                PAY {innovationUnlockCosts.get(selectedTech.id) ?? selectedTech.cost} AI TOKENS & UNLOCK
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Workshop Ad — moved to bottom of modal */}
              <div className="mt-8 rounded-[2rem] overflow-hidden relative group cursor-pointer border-4 border-yellow-400/30 hover:border-yellow-400 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-purple-900"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-10"></div>
                <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-block px-4 py-1 rounded-full bg-yellow-400 text-black font-black text-xs uppercase tracking-widest mb-3">New Class</div>
                    <h3 className="text-2xl md:text-4xl font-black text-white mb-3 italic">
                      CODE <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">MASTERS</span> CAMP
                    </h3>
                    <p className="text-indigo-200 text-base font-medium mb-4">
                      Learn to build REAL robots and apps!<br />
                      <span className="text-white font-bold">Starts this Saturday at 10 AM.</span>
                    </p>
                    <button
                      onClick={() => navigate('/s/classes?category=coding')}
                      className="px-6 py-2 bg-white text-indigo-900 font-black rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 mx-auto md:mx-0 text-sm"
                    >
                      Join Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-black/30 rounded-full border-4 border-cyan-400/30 flex items-center justify-center relative animate-pulse flex-shrink-0">
                    <Cpu className="w-16 h-16 md:w-20 md:h-20 text-cyan-400" />
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white font-black text-[10px] px-2 py-1 rounded-full rotate-12 shadow-lg">
                      Limited!
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};

export default InnovationModule;
