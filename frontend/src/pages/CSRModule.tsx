import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSmartBack } from '../lib/smartBack';
import { Heart, Gift, Users, TreePine, GraduationCap, Stethoscope, Globe, Sparkles, Play, Clock, Trophy, ArrowLeft, Sun, Moon, Lightbulb, Flame, Zap, Star, BookOpen, Leaf, Smile } from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { csrApi, businessApi } from '../services/aipreneurApi';
import { ApiError } from '../lib/api';
import { Confetti } from '../components/Confetti';
import { GLASS, GLASS_HOVER, PAGE, EASE_PLAYFUL } from '../lib/uiTokens';
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
  /** Age bands this scenario is appropriate for. */
  bands: AgeBand[];
  /** Cause ids this scenario belongs to — used to match the chosen mission. */
  causes: string[];
  /** The one-line kindness lesson reinforced when the hero chooses well. */
  lesson: string;
  /** Emoji + background used by the generic animated scene fallback. */
  sceneEmoji: string;
  sceneBg: string;
  options: MoralOption[];
}

// Fisher–Yates shuffle — used to randomise both which scenarios appear AND
// the order of the answer options, so the "right" choice is never in a
// predictable spot (no memorising positions).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Age-band difficulty engine ──────────────────────────────────────────────
// The whole quest adapts to the child's age (geniusProfile.age). This is the
// single source of truth for difficulty: timer, how many scenarios, which
// puzzles, reward scaling, vocabulary and tone.

type AgeBand = 'sprout' | 'explorer' | 'changemaker';

interface BandConfig {
  label: string;
  emoji: string;
  /** Seconds on the decision timer — younger = more relaxed. */
  time: number;
  /** How many moral scenarios make up a run. */
  scenarioCount: number;
  /** Which bonus-puzzle mechanics are allowed for this band. */
  puzzleTypes: BonusPuzzle['type'][];
  /** Multiplier on points earned, so older kids chase bigger numbers. */
  rewardScale: number;
  subtitle: string;
  accent: string; // tailwind text accent for the band chip
  chip: string;   // tailwind bg/border for the band chip
}

const BAND_CONFIG: Record<AgeBand, BandConfig> = {
  sprout: {
    label: 'Sprout Hero',
    emoji: '🌱',
    time: 25,
    scenarioCount: 3,
    puzzleTypes: ['memory', 'odd', 'emoji'],
    rewardScale: 1,
    subtitle: 'Little choices, big kindness.',
    accent: 'text-emerald-700 dark:text-emerald-300',
    chip: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-400/30',
  },
  explorer: {
    label: 'Explorer Hero',
    emoji: '🚀',
    time: 15,
    scenarioCount: 4,
    puzzleTypes: ['memory', 'odd', 'emoji', 'word'],
    rewardScale: 1.5,
    subtitle: 'Make smart, kind decisions fast.',
    accent: 'text-sky-700 dark:text-sky-300',
    chip: 'bg-sky-100 dark:bg-sky-500/15 border-sky-200 dark:border-sky-400/30',
  },
  changemaker: {
    label: 'Changemaker',
    emoji: '⚡',
    time: 12,
    scenarioCount: 5,
    puzzleTypes: ['memory', 'odd', 'emoji', 'word', 'tile'],
    rewardScale: 2,
    subtitle: 'Lead with integrity under pressure.',
    accent: 'text-violet-700 dark:text-violet-300',
    chip: 'bg-violet-100 dark:bg-violet-500/15 border-violet-200 dark:border-violet-400/30',
  },
};

function getAgeBand(age: number | null | undefined): AgeBand {
  if (age == null) return 'explorer'; // sensible default tone
  if (age <= 8) return 'sprout';
  if (age <= 12) return 'explorer';
  return 'changemaker';
}

// Escalating praise — the engine of "just one more" addictiveness.
const STREAK_PRAISE = ['Nice!', 'Great!', 'Awesome!', 'On Fire!', 'UNSTOPPABLE!'];
function praiseFor(streak: number): string {
  return STREAK_PRAISE[Math.min(streak - 1, STREAK_PRAISE.length - 1)] || 'Nice!';
}
// Combo multiplier grows with the streak, capped so it stays fair.
function comboFor(streak: number): number {
  return Math.min(1 + Math.max(0, streak - 1) * 0.5, 3);
}

// ─── Phase type (clean state machine) ────────────────────────────────────────

type Phase = 'choose-cause' | 'scenario' | 'puzzle' | 'donate' | 'victory';

// ─── Constants ───────────────────────────────────────────────────────────────

const KINDNESS_METER_TARGET = 150; // score that fills the meter to 100%

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

// Scenario pool — real-world situations a kid actually meets, tagged by age
// band AND by cause so the dilemmas match the mission the player picked
// (Education, Planet, Health, Animals, Community, World). Each good choice
// teaches one concrete kindness/integrity lesson, surfaced in the recap.
// Option order is shuffled at runtime, so the right answer is never fixed.
const MORALITY_SCENARIOS: MoralScenario[] = [
  // ── EDUCATION ──────────────────────────────────────────────────────────
  {
    id: 'reading_tease',
    title: 'Reading Out Loud',
    story: 'A classmate stumbles reading aloud and others start to giggle.',
    icon: GraduationCap,
    bands: ['sprout', 'explorer'],
    causes: ['education'],
    lesson: 'Encouraging others helps everyone feel safe to learn.',
    sceneEmoji: '📖', sceneBg: 'from-blue-300 to-cyan-300',
    options: [
      { text: 'Cheer them on kindly', emoji: '👏', good: true, feedback: 'Yes! Kind words help people keep trying.' },
      { text: 'Laugh along too', emoji: '😆', good: false, feedback: 'That makes learning scary for them.' },
      { text: 'Say "Hurry up!"', emoji: '😤', good: false, feedback: 'Rushing only makes it harder.' },
    ],
  },
  {
    id: 'share_notes',
    title: 'The Sick Classmate',
    story: 'A classmate missed a week of school and is lost on the homework.',
    icon: BookOpen,
    bands: ['explorer', 'changemaker'],
    causes: ['education'],
    lesson: 'Sharing knowledge lifts the whole class up.',
    sceneEmoji: '📝', sceneBg: 'from-sky-300 to-blue-400',
    options: [
      { text: 'Share your notes & explain', emoji: '🤝', good: true, feedback: 'Generous! Helping others learn is powerful.' },
      { text: 'Say "Not my problem"', emoji: '🙄', good: false, feedback: 'A small bit of help means a lot.' },
      { text: 'Charge them for notes', emoji: '💸', good: false, feedback: 'Kindness shouldn\'t come with a price tag.' },
    ],
  },
  {
    id: 'exam_cheat',
    title: 'The Shared Answers',
    story: 'Before a test, a friend offers to secretly send you the answers.',
    icon: GraduationCap,
    bands: ['explorer', 'changemaker'],
    causes: ['education'],
    lesson: 'Real learning beats an easy shortcut every time.',
    sceneEmoji: '📚', sceneBg: 'from-indigo-300 to-blue-400',
    options: [
      { text: 'Say no, study together', emoji: '✍️', good: true, feedback: 'Honest! You\'ll actually learn it for life.' },
      { text: 'Take the answers', emoji: '🤫', good: false, feedback: 'Cheating means you never really learned.' },
      { text: 'Sell them to others', emoji: '💰', good: false, feedback: 'That spreads the dishonesty further.' },
    ],
  },

  // ── PLANET (environment) ─────────────────────────────────────────────────
  {
    id: 'last_juice',
    title: 'The Empty Bottle',
    story: 'You finished your drink. The recycle bin is a little far away.',
    icon: Leaf,
    bands: ['sprout', 'explorer'],
    causes: ['environment'],
    lesson: 'Small green habits add up to a healthier planet.',
    sceneEmoji: '♻️', sceneBg: 'from-emerald-300 to-green-300',
    options: [
      { text: 'Walk it to the recycle bin', emoji: '♻️', good: true, feedback: 'Planet hero! Small steps protect the Earth.' },
      { text: 'Drop it on the ground', emoji: '🗑️', good: false, feedback: 'Litter hurts animals and nature.' },
      { text: 'Hide it under a bench', emoji: '🪑', good: false, feedback: 'Out of sight isn\'t gone — recycle it!' },
    ],
  },
  {
    id: 'running_tap',
    title: 'The Running Tap',
    story: 'You finished brushing your teeth but the tap is still running.',
    icon: Leaf,
    bands: ['sprout', 'explorer'],
    causes: ['environment'],
    lesson: 'Saving water means saving a precious resource.',
    sceneEmoji: '💧', sceneBg: 'from-cyan-300 to-sky-400',
    options: [
      { text: 'Turn the tap off', emoji: '🚰', good: true, feedback: 'Smart! Clean water is precious.' },
      { text: 'Leave it running', emoji: '🌊', good: false, feedback: 'That wastes water other people need.' },
      { text: 'Turn it up higher', emoji: '💦', good: false, feedback: 'Even more waste — turn it off!' },
    ],
  },
  {
    id: 'beach_plastic',
    title: 'Plastic on the Beach',
    story: 'At the beach you spot a plastic bag drifting near a sea turtle.',
    icon: TreePine,
    bands: ['explorer', 'changemaker'],
    causes: ['environment', 'animals'],
    lesson: 'Cleaning up protects wildlife and the oceans.',
    sceneEmoji: '🐢', sceneBg: 'from-teal-300 to-cyan-500',
    options: [
      { text: 'Pick it up & bin it', emoji: '🧤', good: true, feedback: 'Hero! Turtles mistake bags for food.' },
      { text: 'Leave it, not my mess', emoji: '🏖️', good: false, feedback: 'That bag could harm the turtle.' },
      { text: 'Push it into the sea', emoji: '🌊', good: false, feedback: 'No! That pollutes the ocean more.' },
    ],
  },
  {
    id: 'green_supplier',
    title: 'Cheap vs. Clean',
    story: 'A cheaper supplier pollutes a river. A pricier one is eco-friendly.',
    icon: Leaf,
    bands: ['changemaker'],
    causes: ['environment'],
    lesson: 'Sustainable choices protect the planet and your reputation.',
    sceneEmoji: '🌊', sceneBg: 'from-cyan-400 to-blue-500',
    options: [
      { text: 'Choose the clean supplier', emoji: '🌿', good: true, feedback: 'Leader move — planet AND brand win.' },
      { text: 'Pick the polluter to save money', emoji: '🏭', good: false, feedback: 'Short-term profit, long-term harm.' },
      { text: 'Hide where it comes from', emoji: '🙈', good: false, feedback: 'Customers value honesty about sourcing.' },
    ],
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    id: 'scraped_knee',
    title: 'The Playground Tumble',
    story: 'A younger kid trips on the playground and starts to cry.',
    icon: Heart,
    bands: ['sprout', 'explorer'],
    causes: ['health', 'community'],
    lesson: 'Comforting someone who is hurt is true kindness.',
    sceneEmoji: '🩹', sceneBg: 'from-rose-300 to-pink-300',
    options: [
      { text: 'Help them up gently', emoji: '🦸', good: true, feedback: 'Hero move! You made them feel safe.' },
      { text: 'Laugh and walk away', emoji: '😆', good: false, feedback: 'Ouch — that would hurt their feelings too.' },
      { text: 'Keep playing', emoji: '🙃', good: false, feedback: 'A hero stops to help, even mid-game.' },
    ],
  },
  {
    id: 'sick_friend',
    title: 'A Friend Feels Sick',
    story: 'Your friend suddenly looks pale and says they feel really sick in class.',
    icon: Stethoscope,
    bands: ['explorer', 'changemaker'],
    causes: ['health'],
    lesson: 'Getting an adult quickly is the safest, kindest help.',
    sceneEmoji: '🤒', sceneBg: 'from-red-300 to-rose-400',
    options: [
      { text: 'Tell the teacher right away', emoji: '🧑‍🏫', good: true, feedback: 'Right! Grown-ups can get real help fast.' },
      { text: 'Tell them to "tough it out"', emoji: '😬', good: false, feedback: 'They might be really unwell — get help.' },
      { text: 'Ignore it', emoji: '🙉', good: false, feedback: 'A friend in need should never be ignored.' },
    ],
  },
  {
    id: 'cover_cough',
    title: 'The Big Sneeze',
    story: 'You feel a huge sneeze coming while sitting with your friends.',
    icon: Stethoscope,
    bands: ['sprout', 'explorer'],
    causes: ['health'],
    lesson: 'Good hygiene keeps everyone around you healthy.',
    sceneEmoji: '🤧', sceneBg: 'from-orange-300 to-amber-300',
    options: [
      { text: 'Cover with your elbow', emoji: '💪', good: true, feedback: 'Great! That stops germs from spreading.' },
      { text: 'Sneeze on your friends', emoji: '🤢', good: false, feedback: 'Yuck — that can make others sick.' },
      { text: 'Wipe hands on the table', emoji: '🖐️', good: false, feedback: 'Germs spread that way too. Wash up!' },
    ],
  },

  // ── ANIMALS ────────────────────────────────────────────────────────────
  {
    id: 'stray_cat',
    title: 'The Hungry Stray',
    story: 'A skinny stray cat is meowing outside, looking lost and hungry.',
    icon: Heart,
    bands: ['sprout', 'explorer'],
    causes: ['animals'],
    lesson: 'Caring for animals safely shows a gentle heart.',
    sceneEmoji: '🐱', sceneBg: 'from-amber-300 to-orange-400',
    options: [
      { text: 'Tell an adult & leave water', emoji: '🥣', good: true, feedback: 'Kind & smart — adults can help it safely.' },
      { text: 'Chase it away', emoji: '🏃', good: false, feedback: 'That scares an animal that needs help.' },
      { text: 'Throw something at it', emoji: '🪨', good: false, feedback: 'Never hurt an animal — be gentle.' },
    ],
  },
  {
    id: 'teasing_dog',
    title: 'Teasing the Dog',
    story: 'Some kids are poking a neighbour\'s dog through the fence to scare it.',
    icon: Heart,
    bands: ['explorer', 'changemaker'],
    causes: ['animals'],
    lesson: 'Standing up for animals is real courage.',
    sceneEmoji: '🐶', sceneBg: 'from-yellow-300 to-amber-400',
    options: [
      { text: 'Ask them to stop, kindly', emoji: '✋', good: true, feedback: 'Brave! Animals feel fear and pain too.' },
      { text: 'Join in the teasing', emoji: '😈', good: false, feedback: 'That frightens and could hurt the dog.' },
      { text: 'Film it for laughs', emoji: '📱', good: false, feedback: 'Sharing cruelty isn\'t funny — it\'s harmful.' },
    ],
  },

  // ── COMMUNITY ──────────────────────────────────────────────────────────
  {
    id: 'share_snack',
    title: 'The Forgotten Lunch',
    story: 'A classmate forgot their lunch and looks really hungry.',
    icon: Smile,
    bands: ['sprout', 'explorer'],
    causes: ['community'],
    lesson: 'Sharing what you have makes others feel cared for.',
    sceneEmoji: '🍱', sceneBg: 'from-amber-300 to-orange-300',
    options: [
      { text: 'Share half of yours', emoji: '🤝', good: true, feedback: 'So kind! Sharing builds real friendships.' },
      { text: 'Eat it all quickly', emoji: '😋', good: false, feedback: 'Your friend is still hungry. Sharing is caring!' },
      { text: 'Pretend not to see', emoji: '🙈', good: false, feedback: 'A kind hero always notices a friend in need.' },
    ],
  },
  {
    id: 'heavy_bags',
    title: 'The Heavy Groceries',
    story: 'An elderly neighbour is struggling up the stairs with heavy bags.',
    icon: Users,
    bands: ['sprout', 'explorer'],
    causes: ['community'],
    lesson: 'Small acts of help make a neighbourhood feel like home.',
    sceneEmoji: '🛍️', sceneBg: 'from-orange-300 to-rose-300',
    options: [
      { text: 'Offer to carry a bag', emoji: '💪', good: true, feedback: 'Wonderful! That\'s what good neighbours do.' },
      { text: 'Walk past quickly', emoji: '🚶', good: false, feedback: 'A moment of your time means a lot to them.' },
      { text: 'Pretend to be busy', emoji: '📱', good: false, feedback: 'Helping is never wasted time.' },
    ],
  },
  {
    id: 'lost_wallet',
    title: 'The Lost Wallet',
    story: 'You spot a wallet on the sidewalk. It looks full!',
    icon: Gift,
    bands: ['explorer', 'changemaker'],
    causes: ['community'],
    lesson: 'Honesty builds the trust your brand is built on.',
    sceneEmoji: '👛', sceneBg: 'from-sky-300 to-amber-200',
    options: [
      { text: 'Hand it in to be returned', emoji: '🦸', good: true, feedback: 'Heroic! Honesty builds trust.' },
      { text: 'Keep the money', emoji: '🙊', good: false, feedback: 'Oh no! That belongs to someone else.' },
      { text: 'Leave it there', emoji: '🙈', good: false, feedback: 'Someone else might take it — hand it in.' },
    ],
  },
  {
    id: 'line_cut',
    title: 'The Line Cutter',
    story: 'Your best friend tries to skip the long line at your shop.',
    icon: Users,
    bands: ['explorer', 'changemaker'],
    causes: ['community'],
    lesson: 'Fairness means everyone is treated equally — even friends.',
    sceneEmoji: '🏪', sceneBg: 'from-indigo-400 to-purple-500',
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
    bands: ['explorer', 'changemaker'],
    causes: ['community'],
    lesson: 'Integrity means doing right even when no one is watching.',
    sceneEmoji: '🪙', sceneBg: 'from-emerald-400 to-teal-500',
    options: [
      { text: 'Give it back', emoji: '✨', good: true, feedback: 'Integrity is a superpower!' },
      { text: 'Keep it quietly', emoji: '🤐', good: false, feedback: 'That hurts the shop owner.' },
      { text: 'Buy candy with it', emoji: '🍬', good: false, feedback: 'Spending it is still stealing.' },
    ],
  },
  {
    id: 'broken_toy',
    title: 'The Accident',
    story: 'A customer\'s little brother accidentally breaks something in your shop.',
    icon: Heart,
    bands: ['explorer', 'changemaker'],
    causes: ['community'],
    lesson: 'Patience and kindness turn customers into loyal fans.',
    sceneEmoji: '🧸', sceneBg: 'from-fuchsia-400 to-rose-400',
    options: [
      { text: 'Smile: "Accidents happen!"', emoji: '😊', good: true, feedback: 'Kindness! They\'ll love your brand forever.' },
      { text: 'Yell at the kid', emoji: '😡', good: false, feedback: 'That scares customers away.' },
      { text: 'Make them pay double', emoji: '💸', good: false, feedback: 'Unfair — it was an accident.' },
    ],
  },
  {
    id: 'fake_review',
    title: 'The Tempting Review',
    story: 'You could secretly post fake 5-star reviews for your own shop.',
    icon: Star,
    bands: ['changemaker'],
    causes: ['community'],
    lesson: 'Honest reputations last; fake ones always collapse.',
    sceneEmoji: '⭐', sceneBg: 'from-amber-400 to-orange-500',
    options: [
      { text: 'Earn real reviews instead', emoji: '✍️', good: true, feedback: 'Right call — real trust can\'t be faked.' },
      { text: 'Post fake glowing ones', emoji: '🤥', good: false, feedback: 'If caught, your brand is ruined.' },
      { text: 'Pay friends to lie', emoji: '💰', good: false, feedback: 'Still dishonest — customers feel cheated.' },
    ],
  },

  // ── WORLD (global) ────────────────────────────────────────────────────
  {
    id: 'new_kid',
    title: 'The New Kid',
    story: 'A new student from another country sits alone and looks shy.',
    icon: Globe,
    bands: ['sprout', 'explorer'],
    causes: ['global'],
    lesson: 'Including others builds a kinder, more peaceful world.',
    sceneEmoji: '🌏', sceneBg: 'from-cyan-300 to-blue-400',
    options: [
      { text: 'Invite them to join you', emoji: '👋', good: true, feedback: 'Beautiful! Everyone deserves to belong.' },
      { text: 'Ignore them', emoji: '🙄', good: false, feedback: 'A friendly hello can change someone\'s day.' },
      { text: 'Make fun of their accent', emoji: '😏', good: false, feedback: 'Differences make the world wonderful.' },
    ],
  },
  {
    id: 'online_rumor',
    title: 'The Group-Chat Rumor',
    story: 'A nasty rumour about a classmate is spreading in the group chat.',
    icon: Globe,
    bands: ['explorer', 'changemaker'],
    causes: ['global', 'community'],
    lesson: 'Stopping gossip online protects people from real harm.',
    sceneEmoji: '💬', sceneBg: 'from-violet-300 to-indigo-400',
    options: [
      { text: 'Refuse to share & speak up', emoji: '🛑', good: true, feedback: 'Strong! Rumours hurt — you stopped the spread.' },
      { text: 'Forward it to more people', emoji: '📲', good: false, feedback: 'That spreads the hurt even wider.' },
      { text: 'Add your own joke', emoji: '😬', good: false, feedback: 'Piling on makes it worse for someone real.' },
    ],
  },
  {
    id: 'disaster_relief',
    title: 'The Flooded Town',
    story: 'A flood hit a nearby town. Your shop could donate part of today\'s profit.',
    icon: Globe,
    bands: ['changemaker'],
    causes: ['global'],
    lesson: 'Brands that give back in a crisis earn lasting respect.',
    sceneEmoji: '🌧️', sceneBg: 'from-blue-400 to-indigo-500',
    options: [
      { text: 'Donate & tell the story honestly', emoji: '💙', good: true, feedback: 'Leadership! Real help, told with honesty.' },
      { text: 'Keep all the profit', emoji: '🤑', good: false, feedback: 'A little giving makes a big difference.' },
      { text: 'Pretend to give but don\'t', emoji: '🎭', good: false, feedback: 'Fake charity destroys trust fast.' },
    ],
  },
  {
    id: 'quiet_give',
    title: 'The Quiet Gift',
    story: 'You can donate to the local shelter, but no one would ever know.',
    icon: Gift,
    bands: ['changemaker'],
    causes: ['global', 'community'],
    lesson: 'Real kindness doesn\'t need an audience.',
    sceneEmoji: '🤲', sceneBg: 'from-violet-400 to-indigo-500',
    options: [
      { text: 'Give anyway, quietly', emoji: '💝', good: true, feedback: 'Pure kindness — that\'s real character.' },
      { text: 'Only give if filmed', emoji: '🎥', good: false, feedback: 'Then it\'s for show, not for good.' },
      { text: 'Skip it this time', emoji: '🚶', good: false, feedback: 'A small gift still changes a life.' },
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

// Per-cause set dressing — gives the generic scene a believable backdrop
// (props placed on the ground for depth) so each dilemma reads like a real
// little world rather than a flat emoji on a gradient.
const CAUSE_SCENE: Record<string, { props: string[]; ground: string }> = {
  education:   { props: ['🏫', '📚', '✏️'], ground: 'from-blue-300/50 to-blue-400/10' },
  environment: { props: ['🌳', '🌿', '🍃'], ground: 'from-emerald-400/50 to-green-500/10' },
  health:      { props: ['🏥', '➕', '🩺'], ground: 'from-rose-300/50 to-red-400/10' },
  animals:     { props: ['🌳', '🐾', '🌼'], ground: 'from-amber-300/50 to-orange-400/10' },
  community:   { props: ['🏠', '🏪', '🌳'], ground: 'from-orange-300/50 to-amber-400/10' },
  global:      { props: ['🏙️', '✈️', '🌍'], ground: 'from-cyan-300/50 to-blue-400/10' },
};

// A cinematic "diorama" scene: sky gradient + sun glow + drifting clouds +
// a grounded backdrop with depth props + the subject with a contact shadow +
// a vignette. Looks like a real scene without needing photo assets.
const GenericScene: React.FC<{ scenario: MoralScenario }> = ({ scenario }) => {
  const cfg = CAUSE_SCENE[scenario.causes[0]] || CAUSE_SCENE.community;
  return (
    <div className={`relative w-full h-48 md:h-64 rounded-3xl overflow-hidden bg-gradient-to-b ${scenario.sceneBg}`}>
      {/* soft sun / key light */}
      <motion.div
        className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/40 blur-3xl"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 4 }}
      />
      {/* drifting clouds */}
      {[0, 1].map(i => (
        <motion.div
          key={`cloud-${i}`}
          className="absolute text-3xl opacity-70"
          style={{ top: `${10 + i * 12}%`, left: '-15%' }}
          animate={{ x: ['0%', '135%'] }}
          transition={{ duration: 18 + i * 7, repeat: Infinity, ease: 'linear', delay: i * 3 }}
        >☁️</motion.div>
      ))}
      {/* grounded backdrop */}
      <div className={`absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t ${cfg.ground}`} />
      <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/25" />
      {/* depth props along the ground */}
      {cfg.props.map((p, i) => (
        <motion.div
          key={`prop-${i}`}
          className="absolute bottom-[58px] text-2xl md:text-3xl opacity-60"
          style={{ left: `${10 + i * 32}%` }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 0.6 }}
          transition={{ delay: 0.2 + i * 0.15 }}
        >{p}</motion.div>
      ))}
      {/* floating sparkles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute text-sm"
          style={{ left: `${16 + i * 16}%`, top: `${16 + (i % 3) * 16}%` }}
          animate={{ y: [0, -10, 0], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2 + (i % 3), repeat: Infinity, delay: i * 0.25 }}
        >✨</motion.div>
      ))}
      {/* subject + contact shadow */}
      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center">
        <motion.span
          className="text-7xl md:text-8xl drop-shadow-2xl relative z-10"
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, y: [0, -6, 0], rotate: [-3, 3, -3] }}
          transition={{
            scale: { type: 'spring', stiffness: 200 },
            y: { repeat: Infinity, duration: 2.5, type: 'tween' },
            rotate: { repeat: Infinity, duration: 3, type: 'tween' },
          }}
        >{scenario.sceneEmoji}</motion.span>
        <div className="w-20 h-3 -mt-1 bg-black/30 blur-md rounded-[50%]" />
      </div>
      {/* cinematic vignette */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl shadow-[inset_0_0_60px_rgba(0,0,0,0.45)]" />
      {/* POV label */}
      <motion.div
        className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm text-white font-bold text-xs md:text-sm px-4 py-2 rounded-full z-20 whitespace-nowrap"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      >
        👀 What do you do?
      </motion.div>
    </div>
  );
};

const SceneIllustration: React.FC<{ scenario: MoralScenario }> = ({ scenario }) => {
  const scenarioId = scenario.id;
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

  // Every other scenario uses the cinematic generic diorama.
  return <GenericScene scenario={scenario} />;
};

// One-line real-world consequence per scenario — shown on the feedback card
// so kids learn what actually happens in real life, not just "good/bad".
const REAL_WORLD: Record<string, string> = {
  reading_tease: 'Kids who feel supported read more and improve faster — encouragement really does help the brain learn.',
  share_notes: 'Studying together helps students remember far more than studying alone.',
  exam_cheat: 'Skills you cheat past come back later — the learning gap never really disappears.',
  last_juice: 'A plastic bottle can take up to 450 years to break down; recycling one saves real energy.',
  running_tap: 'Leaving the tap on while brushing can waste about 6 litres of clean water every minute.',
  beach_plastic: 'Sea turtles often mistake floating plastic bags for jellyfish, which can make them very sick.',
  green_supplier: 'Polluted rivers harm whole towns, while brands known for clean sourcing keep customers for years.',
  scraped_knee: 'A calm, kind helper lowers another person\'s stress and helps them recover faster.',
  sick_friend: 'Telling an adult quickly means a sick person gets proper care before things get worse.',
  cover_cough: 'Covering a sneeze can stop thousands of germ droplets from spreading to people around you.',
  stray_cat: 'Approaching strays carefully keeps you and the animal safe — shelters can give it a real home.',
  teasing_dog: 'Frightened animals can bite to defend themselves; calm and kindness keep everyone safe.',
  share_snack: 'Hungry kids find it hard to focus — a shared meal helps a friend think and feel better.',
  heavy_bags: 'Small neighbourly help is what keeps a community strong and people feeling safe.',
  lost_wallet: 'Wallets handed in to staff or police are far more likely to find their way back home.',
  line_cut: 'Fair queues keep people calm; favouritism is the fastest way to lose customers\' trust.',
  extra_change: 'Small shops run on thin margins, so returning extra change can save someone real money.',
  broken_toy: 'Customers treated kindly after a mistake often become a brand\'s most loyal fans.',
  fake_review: 'Fake reviews are illegal in many countries and can get a business banned online.',
  new_kid: 'One friendly classmate can completely change how safe a new student feels at school.',
  online_rumor: 'Online rumours spread in minutes and can seriously hurt someone\'s reputation and feelings.',
  disaster_relief: 'Local businesses that help during a disaster are remembered and supported for years.',
  quiet_give: 'Anonymous giving still feeds, shelters and heals real people who never learn your name.',
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
  const smartBack = useSmartBack();
  const { theme, toggleTheme } = useTheme();

  // ── Age band drives the whole difficulty curve ──
  const band = useMemo(() => getAgeBand(geniusProfile?.age), [geniusProfile?.age]);
  const bandCfg = BAND_CONFIG[band];
  const missionTime = bandCfg.time;

  // ── Core phase state machine ──
  const [phase, setPhase] = useState<Phase>('choose-cause');
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [donationAmount, setDonationAmount] = useState(25);
  const [, setTotalDonated] = useState(0);
  const [kindnessScore, setKindnessScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [missionScore, setMissionScore] = useState(0);
  // Soft status line — used only for real errors now (no daily lock).
  const [dailyStatusMessage, setDailyStatusMessage] = useState<string | null>(null);

  // ── Scenario state ──
  const [activeScenarios, setActiveScenarios] = useState<MoralScenario[]>([]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(missionTime);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{ msg: string; type: 'good' | 'bad'; praise?: string; combo?: number } | null>(null);

  // ── Streak / combo — the "just one more" addictiveness loop ──
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lessonsLearned, setLessonsLearned] = useState<string[]>([]);

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

  // Pick a band-appropriate bonus puzzle.
  const pickPuzzle = useCallback((): BonusPuzzle => {
    const pool = BONUS_PUZZLES.filter(p => bandCfg.puzzleTypes.includes(p.type));
    const safe = pool.length ? pool : BONUS_PUZZLES;
    return safe[Math.floor(Math.random() * safe.length)];
  }, [bandCfg.puzzleTypes]);

  // ── Load initial data ──
  useEffect(() => {
    const loadData = async () => {
      if (!geniusProfile) return;
      try {
        const response = await csrApi.getStatus();
        if (response.success && response.business) {
          setTotalDonated(response.business.total_donated || 0);
          setKindnessScore(Math.floor((response.business.total_donated || 0) / 10));
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
          setStreak(0); // running out of time breaks the streak
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

      if (scenarioIndex + 1 < activeScenarios.length) {
        setScenarioIndex(prev => prev + 1);
        setTimeLeft(missionTime);
      } else {
        setPhase('puzzle');
      }
    }, 2000);

    return () => clearFeedbackTimeout();
  }, [showingFeedback, scenarioIndex, activeScenarios.length, missionTime, clearFeedbackTimeout]);

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
    setDailyStatusMessage(null);

    // Build an age-appropriate run that MATCHES the chosen mission/cause.
    // Prefer scenarios tagged for this cause, then fill from the rest of the
    // band pool so we always reach the target count. Everything is shuffled,
    // and each scenario's answer options are shuffled too — so neither the
    // question order nor the "right" answer position is ever predictable.
    const bandPool = MORALITY_SCENARIOS.filter(s => s.bands.includes(band));
    const onCause = shuffle(bandPool.filter(s => s.causes.includes(cause.id)));
    const offCause = shuffle(bandPool.filter(s => !s.causes.includes(cause.id)));
    const chosen = shuffle(
      [...onCause, ...offCause].slice(0, Math.min(bandCfg.scenarioCount, bandPool.length))
    ).map(s => ({ ...s, options: shuffle(s.options) }));

    setActiveScenarios(chosen);
    setSelectedCause(cause);
    setScenarioIndex(0);
    setMissionScore(0);
    setStreak(0);
    setBestStreak(0);
    setLessonsLearned([]);
    setTimeLeft(missionTime);
    setShowingFeedback(false);
    setFeedbackData(null);
    setPhase('scenario');

    // Pre-pick a band-appropriate puzzle for later
    initPuzzle(pickPuzzle());
  }, [band, bandCfg.scenarioCount, missionTime, initPuzzle, pickPuzzle]);

  // ── Reset everything for an immediate replay (no daily lock) ──
  const resetForReplay = useCallback(() => {
    clearTimer();
    clearFeedbackTimeout();
    setPhase('choose-cause');
    setSelectedCause(null);
    setSelectedAction(null);
    setActiveScenarios([]);
    setScenarioIndex(0);
    setMissionScore(0);
    setStreak(0);
    setBestStreak(0);
    setLessonsLearned([]);
    setShowingFeedback(false);
    setFeedbackData(null);
    setShowConfetti(false);
    setDailyStatusMessage(null);
  }, [clearTimer, clearFeedbackTimeout]);

  // ── Handle moral choice ──
  // Double-click protection: buttons are disabled while showingFeedback is true
  const handleChoice = useCallback((option: MoralOption) => {
    if (showingFeedback) return; // safety check (buttons also disabled in UI)

    clearTimer(); // stop countdown immediately
    setShowingFeedback(true);

    const scenario = activeScenarios[scenarioIndex];

    if (option.good) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak(prev => Math.max(prev, newStreak));

      const combo = comboFor(newStreak);
      const timeBonus = Math.max(0, timeLeft - 5);
      const earned = Math.round((10 + timeBonus) * combo);
      setMissionScore(prev => prev + earned);

      // Collect the lesson for the end-of-quest recap.
      if (scenario?.lesson) {
        setLessonsLearned(prev => (prev.includes(scenario.lesson) ? prev : [...prev, scenario.lesson]));
      }

      setFeedbackData({ msg: option.feedback, type: 'good', praise: praiseFor(newStreak), combo });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setStreak(0); // a poor choice breaks the streak
      setFeedbackData({ msg: option.feedback, type: 'bad' });
    }
  }, [showingFeedback, timeLeft, clearTimer, streak, activeScenarios, scenarioIndex]);

  // ── Puzzle solved bonus ──
  const solvePuzzleBonus = useCallback(async () => {
    setPuzzleSolved(true);
    setMissionScore(prev => prev + Math.round(50 * bandCfg.rewardScale));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, [bandCfg.rewardScale]);

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
  // No daily lock — kids can play as many missions as they like. If the
  // backend has already recorded today's donation we still celebrate the
  // learning (soft success) so replaying never feels punished.
  const goToVictory = useCallback(() => {
    setPhase('victory');
    setTotalDonated(prev => prev + donationAmount);
    setKindnessScore(prev => prev + Math.floor(donationAmount / 10));
    setShowConfetti(true);
  }, [donationAmount]);

  const handleDonate = useCallback(async () => {
    if (!selectedCause || !selectedAction || !geniusProfile) return;

    try {
      setDailyStatusMessage(null);
      await csrApi.donate({
        cause: selectedCause.id,
        action_type: selectedAction.id,
        donation_amount: donationAmount
      });

      // Advance the AIGENIUS learning pathway (non-fatal if it fails).
      businessApi.updateModuleProgress('csr', 100).catch(() => { /* best-effort */ });

      goToVictory();
    } catch (err) {
      console.error("Donation failed", err);
      // "Already donated today" is fine — let them keep playing & still win.
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        typeof err.message === 'string' &&
        err.message.toLowerCase().includes('already')
      ) {
        goToVictory();
      } else {
        setDailyStatusMessage('Couldn\'t save your impact right now — but your kindness still counts! Try again anytime.');
        goToVictory();
      }
    }
  }, [selectedCause, selectedAction, geniusProfile, donationAmount, goToVictory]);

  // ── Derived values ──
  const currentScenario = activeScenarios[scenarioIndex];
  const meterPct = Math.min(100, Math.round((missionScore / KINDNESS_METER_TARGET) * 100));

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
          <h1 className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate min-w-0 flex-1">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
            <span className="truncate">Kindness Quest</span>
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            {/* Age-band badge — shows the quest is tuned to this hero's age */}
            <span className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border ${bandCfg.chip}`}>
              <span className="text-sm leading-none">{bandCfg.emoji}</span>
              <span className={`font-extrabold text-xs ${bandCfg.accent}`}>{bandCfg.label}</span>
            </span>
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
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}
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
                <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">Choose Your Mission</h2>
                <p className="text-gray-400 text-base sm:text-lg">Who will you help today, hero?</p>
                {/* Personalised band line */}
                <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold ${bandCfg.chip} ${bandCfg.accent}`}>
                  <span>{bandCfg.emoji}</span>
                  <span>{bandCfg.label} mode · {bandCfg.subtitle}</span>
                </div>
                {dailyStatusMessage && (
                  <div className="mt-4 inline-flex items-center rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
                    {dailyStatusMessage}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
                {causes.map((cause, i) => (
                  <motion.button
                    key={cause.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    onClick={() => startMission(cause)}
                    className={`group relative p-4 sm:p-6 rounded-3xl border-2 text-left bg-gradient-to-br ${cause.gradient} border-transparent shadow-lg hover:border-white/40`}
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 backdrop-blur-sm group-hover:scale-110 transition-transform">
                      <cause.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white mb-1">{cause.name}</h3>
                    <p className="text-white/80 font-medium text-xs sm:text-sm">{cause.description}</p>

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
                {/* HUD: timer · progress dots · streak · score */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
                  <div className="flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`} />
                    <span className={`text-xl font-black ${timeLeft < 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}s</span>
                  </div>
                  <div className="flex-1 min-w-[80px] h-3 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: '100%' }}
                      animate={{ width: `${(timeLeft / missionTime) * 100}%` }}
                      className={`h-full ${timeLeft < 5 ? 'bg-red-500' : 'bg-cyan-500'}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {activeScenarios.map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < scenarioIndex ? 'bg-green-500' : i === scenarioIndex ? 'bg-yellow-400 animate-pulse scale-125' : 'bg-gray-600'}`} />
                    ))}
                  </div>
                  {/* Streak chip */}
                  <AnimatePresence>
                    {streak > 0 && (
                      <motion.div
                        key="streak"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 16 }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40"
                      >
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-300 font-black text-sm tabular-nums">{streak}</span>
                        {comboFor(streak) > 1 && (
                          <span className="text-amber-300 font-black text-xs">×{comboFor(streak)}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="text-yellow-400 font-bold flex items-center gap-1">
                    <Trophy className="w-4 h-4" /> {missionScore}
                  </div>
                </div>

                {/* Kindness meter */}
                <div className="bg-gray-800/40 rounded-2xl p-3 border border-gray-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-pink-300 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" /> Kindness Meter</span>
                    <span className="text-xs font-bold text-pink-300 tabular-nums">{meterPct}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${meterPct}%` }}
                      transition={{ ease: EASE_PLAYFUL, duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-pink-400 to-rose-400"
                    />
                  </div>
                </div>

                {/* Animated Scene Illustration */}
                <SceneIllustration key={currentScenario.id} scenario={currentScenario} />

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
                      {/* Streak praise banner */}
                      {feedbackData.type === 'good' && feedbackData.praise && (
                        <motion.div
                          initial={{ scale: 0, y: 10 }}
                          animate={{ scale: 1, y: 0 }}
                          transition={{ type: 'spring', stiffness: 340, damping: 16, delay: 0.1 }}
                          className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40"
                        >
                          <Flame className="w-4 h-4 text-orange-400" />
                          <span className="text-orange-300 font-black text-sm uppercase tracking-wide">
                            {feedbackData.praise}{streak > 1 ? ` · ${streak} in a row!` : ''}
                          </span>
                        </motion.div>
                      )}
                      <h3 className={`text-3xl md:text-4xl font-black mb-4 ${feedbackData.type === 'good' ? 'text-green-400' : 'text-orange-400'}`}>
                        {feedbackData.type === 'good' ? 'Awesome Choice!' : 'Think Again...'}
                      </h3>
                      <div className={`inline-block px-4 sm:px-8 py-4 rounded-xl border-2 ${feedbackData.type === 'good' ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                        <p className="text-white text-lg sm:text-xl font-bold max-w-md">{feedbackData.msg}</p>
                      </div>
                      {/* Real-world consequence — the actual lesson */}
                      {currentScenario && REAL_WORLD[currentScenario.id] && (
                        <motion.p
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-5 mx-auto max-w-md text-sm md:text-base text-cyan-100/90 bg-cyan-500/10 border border-cyan-400/30 rounded-xl px-5 py-3 flex items-start gap-2 text-left"
                        >
                          <span className="text-lg leading-none mt-0.5">🌍</span>
                          <span><span className="font-bold text-cyan-300">In the real world:</span> {REAL_WORLD[currentScenario.id]}</span>
                        </motion.p>
                      )}
                      {feedbackData.type === 'good' && feedbackData.combo && feedbackData.combo > 1 && (
                        <p className="mt-3 text-amber-300 font-bold flex items-center justify-center gap-1.5">
                          <Zap className="w-4 h-4" /> Combo ×{feedbackData.combo} bonus points!
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    /* ── Question & Options ── */
                    <div>
                      <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">{currentScenario.title}</h2>
                        <p className="text-base sm:text-xl text-indigo-200 leading-relaxed font-medium bg-indigo-900/30 inline-block px-4 sm:px-6 py-2 rounded-xl border border-indigo-500/30">
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

              <div className={`bg-gray-800 rounded-3xl p-4 sm:p-8 border-2 ${puzzleSolved ? 'border-green-500/50' : 'border-purple-500/30'} shadow-2xl min-h-[400px] flex flex-col items-center justify-center`}>

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
                    <div className="text-gray-400 text-lg mb-2">+{Math.round(50 * bandCfg.rewardScale)} Points &amp; +15 Coins</div>
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
                    <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-6">
                      {bonusPuzzle.word.split('').map((_, i) => (
                        <div
                          key={i}
                          className={`w-9 h-11 sm:w-10 sm:h-12 rounded-xl flex items-center justify-center text-lg font-black border-2 transition-all ${wordGuess[i]
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
                          onClick={() => initPuzzle(pickPuzzle())}
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
                          onClick={() => initPuzzle(pickPuzzle())}
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
                <h2 className="text-2xl sm:text-4xl font-black text-white mb-2">Make Your Impact</h2>
                <p className="text-base sm:text-xl text-gray-400">How many coins will you give to {selectedCause.name}?</p>
              </div>

              {/* Coin amount selection */}
              <div className="bg-gray-800 rounded-3xl p-5 sm:p-8 border border-gray-700 mb-8">
                <div className="text-5xl sm:text-7xl font-black text-emerald-400 mb-2 flex items-center justify-center gap-3">
                  <span className="text-4xl sm:text-5xl">🪙</span>
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
                disabled={!selectedAction}
                className={`w-full py-5 rounded-2xl font-black text-2xl shadow-xl transition-all border-b-4 active:border-b-0 active:translate-y-1 ${selectedAction
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
              className="text-center max-w-xl w-full"
            >
              <div className="relative mb-8 inline-block">
                <div className="absolute inset-0 bg-yellow-400 blur-[80px] opacity-40 animate-pulse"></div>
                <Trophy className="w-24 h-24 sm:w-32 sm:h-32 text-yellow-400 relative z-10 drop-shadow-2xl" />
              </div>

              <h2 className="text-4xl sm:text-6xl font-black text-white mb-4 tracking-tight">HERO STATUS!</h2>
              <p className="text-lg sm:text-2xl text-indigo-300 font-bold mb-10">You changed the world today.</p>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Coins Donated</div>
                  <div className="text-3xl font-black text-white flex items-center justify-center gap-2">
                    <span className="text-2xl">🪙</span> {donationAmount}
                  </div>
                </div>
                <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Impact Score</div>
                  <div className="text-3xl font-black text-yellow-400">+{Math.floor(donationAmount * (selectedAction?.multiplier || 1))}</div>
                </div>
                <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center justify-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> Best Streak</div>
                  <div className="text-3xl font-black text-orange-400">{bestStreak}🔥</div>
                </div>
                <div className="bg-gray-800/80 p-5 rounded-2xl border border-gray-700">
                  <div className="text-gray-400 text-xs font-bold uppercase mb-1">Mission Score</div>
                  <div className="text-3xl font-black text-emerald-400">{missionScore}</div>
                </div>
              </div>

              {/* "What you learned today" — the lesson recap for kids */}
              {lessonsLearned.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, ease: EASE_PLAYFUL }}
                  className="max-w-md mx-auto bg-violet-500/10 border border-violet-400/30 rounded-2xl p-5 text-left"
                >
                  <div className="flex items-center gap-2 mb-3 justify-center">
                    <BookOpen className="w-5 h-5 text-violet-300" />
                    <h3 className="text-lg font-black text-violet-200">What you learned today</h3>
                  </div>
                  <ul className="space-y-2">
                    {lessonsLearned.map((lesson, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.12 }}
                        className="flex items-start gap-2 text-violet-100/90 text-sm font-medium"
                      >
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span>{lesson}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Keep playing — no daily lock */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={resetForReplay}
                  className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-black text-lg rounded-2xl shadow-xl border-b-4 border-violet-800 active:border-b-0 active:translate-y-1 hover:brightness-110 transition-all"
                >
                  🔁 Play Again
                </button>
                <button
                  onClick={() => smartBack()}
                  className="px-8 py-4 bg-gray-800 text-gray-200 font-bold text-lg rounded-2xl border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 hover:bg-gray-700 transition-all"
                >
                  Finish
                </button>
              </div>
              {dailyStatusMessage && (
                <p className="mt-4 text-sm text-amber-300/90 max-w-md mx-auto">{dailyStatusMessage}</p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default CSRModule;
