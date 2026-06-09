import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../lib/smartBack';
import {
  X, Users, Sparkles, CheckCircle, Heart, Zap, Gift,
  MessageCircle, ThumbsUp, ThumbsDown, RefreshCw,
  Award, Crown, ImageIcon, Volume2, VolumeX, ChevronRight,
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { Confetti } from '../components/Confetti';
import { staffApi, businessApi, rewardsApi } from '../services/aipreneurApi';
import { useAIpreneur } from '../hooks/useAIpreneur';
import { analyzeModuleCompletion } from '../services/personaEvolutionService';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { GLASS, BTN_3D_PRIMARY, BTN_3D_SECONDARY } from '../lib/uiTokens';
import { ModulePage } from '../components/modules/ModulePage';
import { ModuleHero3D } from '../components/modules/ModuleHero3D';

interface StaffMember {
  id: string;
  name: string;
  role: 'cashier' | 'chef' | 'cleaner' | 'greeter';
  salary: number;
  baseMood: number;
  baseEnergy: number;
  personality: string;
  skills: string[];
  hobbies: string[];
  hired: boolean;
  mood: number;
  energy: number;
  intelligence: number;
  emotional_intelligence: number;
  work_ethic: number;
  sales_impact: number;
  honesty: number;
  secret_trait: string;
  avatarUrl: string;
  avatarStyle: {
    bgGradient: string;
    borderColor: string;
    accentColor: string;
  };
}

type ChatMessage = {
  sender: 'user' | 'npc';
  text: string;
  emotion?: 'happy' | 'neutral' | 'nervous' | 'excited';
};

// Character avatars from assets
const CHARACTER_AVATARS = [
  '/assets/character/chinese-man-shopping.png',
  '/assets/character/CHINESE-MAN.png',
  '/assets/character/chinese-woman-shopping.png',
  '/assets/character/indian-man.png',
  '/assets/character/indian-men-shopping.png',
  '/assets/character/indian-woman-shopping.png',
  '/assets/character/indian-woman.png',
  '/assets/character/malay-man-shopping.png',
  '/assets/character/malay-man.png',
  '/assets/character/malay-woman.png',
  '/assets/character/maly-woman-shopping.png',
];

// Avatar style variations for visual variety
const AVATAR_STYLES = [
  { bgGradient: 'from-purple-500/30 to-pink-500/30', borderColor: 'border-purple-400', accentColor: 'text-purple-400' },
  { bgGradient: 'from-cyan-500/30 to-blue-500/30', borderColor: 'border-cyan-400', accentColor: 'text-cyan-400' },
  { bgGradient: 'from-emerald-500/30 to-green-500/30', borderColor: 'border-emerald-400', accentColor: 'text-emerald-400' },
  { bgGradient: 'from-orange-500/30 to-yellow-500/30', borderColor: 'border-orange-400', accentColor: 'text-orange-400' },
  { bgGradient: 'from-rose-500/30 to-red-500/30', borderColor: 'border-rose-400', accentColor: 'text-rose-400' },
  { bgGradient: 'from-indigo-500/30 to-violet-500/30', borderColor: 'border-indigo-400', accentColor: 'text-indigo-400' },
  { bgGradient: 'from-teal-500/30 to-cyan-500/30', borderColor: 'border-teal-400', accentColor: 'text-teal-400' },
  { bgGradient: 'from-amber-500/30 to-orange-500/30', borderColor: 'border-amber-400', accentColor: 'text-amber-400' },
];

// Name pools for random generation
const FIRST_NAMES = [
  'Alya', 'Ben', 'Rio', 'Zack', 'Maya', 'Kai', 'Luna', 'Leo', 'Sara', 'Jay',
  'Nina', 'Max', 'Zara', 'Dan', 'Lily', 'Tom', 'Mia', 'Sam', 'Ana', 'Raj',
  'Emma', 'Noah', 'Ava', 'Liam', 'Isla', 'Ethan', 'Chloe', 'Lucas', 'Sophie', 'Jack',
  'Aisha', 'Kumar', 'Wei', 'Mei', 'Priya', 'Arjun', 'Fatima', 'Hassan', 'Siti', 'Ahmad'
];

const PERSONALITIES = [
  'Super friendly and always smiling! 😊',
  'Calm and focused worker 🧘',
  'Energetic and loves to help! ⚡',
  'Creative problem solver 🎨',
  'Quick learner and adaptable 📚',
  'Great with customers! 🤝',
  'Detail-oriented perfectionist ✨',
  'Natural team leader 👑',
  'Reliable and trustworthy 🛡️',
  'Fun and makes work enjoyable 🎉'
];

const SKILLS_POOL = [
  ['Math Whiz 🔢', 'Super Fast ⚡'],
  ['Great Cooker 👨‍🍳', 'Clean Freak 🧹'],
  ['Friendly Talker 💬', 'Memory Master 🧠'],
  ['Organizing Pro 📦', 'Time Manager ⏰'],
  ['Sales Star ⭐', 'Problem Solver 🔧'],
  ['Tech Savvy 💻', 'Creative Mind 🎨'],
  ['Multitasker 🎯', 'Patient Helper 🤗'],
  ['Quick Thinker 💡', 'Team Player 🤝']
];

const HOBBIES_POOL = [
  ['Playing Games 🎮', 'Reading 📖'],
  ['Sports 🏃', 'Music 🎵'],
  ['Art & Drawing 🖌️', 'Dancing 💃'],
  ['Cooking 🍳', 'Gardening 🌱'],
  ['Movies 🎬', 'Puzzles 🧩'],
  ['Photography 📸', 'Travel ✈️']
];

const SECRET_TRAITS = ['Star Employee', 'Reliable Worker', 'Creative Thinker', 'Quick Learner', 'Hard Worker', 'Team Spirit'];

const ROLE_INFO: Record<string, { emoji: string; title: string; description: string }> = {
  cashier: { emoji: '💰', title: 'Cashier', description: 'Handles payments & customer checkout' },
  chef: { emoji: '👨‍🍳', title: 'Chef', description: 'Prepares delicious items' },
  cleaner: { emoji: '🧹', title: 'Cleaner', description: 'Keeps the shop sparkling clean' },
  greeter: { emoji: '👋', title: 'Greeter', description: 'Welcomes customers with a smile' },
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate random staff member
const generateRandomStaff = (
  role: 'cashier' | 'chef' | 'cleaner' | 'greeter',
  usedNames: Set<string>,
  usedAvatars: Set<string>
): StaffMember => {
  // Pick unique name
  let name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  let attempts = 0;
  while (usedNames.has(name) && attempts < 50) {
    name = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    attempts++;
  }
  usedNames.add(name);

  // Pick unique avatar
  const availableAvatars = CHARACTER_AVATARS.filter(a => !usedAvatars.has(a));
  const avatarUrl = availableAvatars.length > 0
    ? availableAvatars[Math.floor(Math.random() * availableAvatars.length)]
    : CHARACTER_AVATARS[Math.floor(Math.random() * CHARACTER_AVATARS.length)];
  usedAvatars.add(avatarUrl);

  const avatarStyle = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];

  const baseMood = 50 + Math.floor(Math.random() * 50);
  const baseEnergy = 50 + Math.floor(Math.random() * 50);
  const intelligence = 40 + Math.floor(Math.random() * 60);
  const emotional_intelligence = 40 + Math.floor(Math.random() * 60);
  const work_ethic = 20 + Math.floor(Math.random() * 80);
  const honesty = 30 + Math.floor(Math.random() * 70);

  const sales_impact = Math.floor((work_ethic - 50) / 5) + Math.floor((emotional_intelligence - 50) / 10);

  const avgStat = (intelligence + emotional_intelligence + work_ethic) / 3;
  const salary = Math.max(3, Math.min(15, Math.floor(avgStat / 10) + Math.floor(Math.random() * 3)));

  let secret_trait = 'Reliable Worker';
  if (work_ethic >= 90 && honesty >= 90) secret_trait = 'Star Employee';
  else if (work_ethic >= 80) secret_trait = 'Hard Worker';
  else if (intelligence >= 85) secret_trait = 'Quick Learner';
  else if (emotional_intelligence >= 85) secret_trait = 'Team Spirit';
  else secret_trait = SECRET_TRAITS[Math.floor(Math.random() * SECRET_TRAITS.length)];

  return {
    id: generateId(),
    name,
    role,
    salary,
    baseMood,
    baseEnergy,
    personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
    skills: SKILLS_POOL[Math.floor(Math.random() * SKILLS_POOL.length)],
    hobbies: HOBBIES_POOL[Math.floor(Math.random() * HOBBIES_POOL.length)],
    hired: false,
    mood: baseMood,
    energy: baseEnergy,
    intelligence,
    emotional_intelligence,
    work_ethic,
    sales_impact,
    honesty,
    secret_trait,
    avatarUrl,
    avatarStyle,
  };
};

// Generate staff candidates
const generateStaffCandidates = (): StaffMember[] => {
  const usedNames = new Set<string>();
  const usedAvatars = new Set<string>();
  const roles: Array<'cashier' | 'chef' | 'cleaner' | 'greeter'> = ['cashier', 'chef', 'cleaner', 'greeter'];

  // Generate 2 candidates per role = 8 candidates
  const candidates: StaffMember[] = [];
  for (const role of roles) {
    candidates.push(generateRandomStaff(role, usedNames, usedAvatars));
    candidates.push(generateRandomStaff(role, usedNames, usedAvatars));
  }

  return shuffleArray(candidates);
};

type RandomEvent = {
  type: 'tired' | 'mistake' | 'happy';
  staffName: string;
  message: string;
  options: {
    text: string;
    moodChange: number;
    energyChange: number;
    salesChange: number;
  }[];
};

// Interview questions with fun emojis
const INTERVIEW_QUESTIONS = [
  { key: 'intro', text: "Tell me about yourself! 👋", icon: '👤' },
  { key: 'strengths', text: "What makes you awesome? 💪", icon: '⭐' },
  { key: 'teamwork', text: "How do you work with others? 🤝", icon: '👥' },
  { key: 'challenge', text: "Tell me about a challenge you solved! 🧩", icon: '🎯' },
  { key: 'motivation', text: "Why do you want this job? 💼", icon: '❤️' },
];

const ENCOURAGE_ACTIONS = [
  { id: 'praise', emoji: '🙌', label: 'Praise', moodBoost: 10, energyBoost: 0, cost: 0, desc: 'Tell them they\'re doing great!' },
  { id: 'snacks', emoji: '🍩', label: 'Treat Snacks', moodBoost: 5, energyBoost: 15, cost: 5, desc: 'Boosts energy!' },
  { id: 'lunch', emoji: '🍱', label: 'Treat Lunch', moodBoost: 15, energyBoost: 20, cost: 10, desc: 'Full meal = full energy' },
  { id: 'bonus', emoji: '💰', label: 'Give Bonus', moodBoost: 20, energyBoost: 0, cost: 15, desc: 'Cash makes everyone smile' },
  { id: 'dayoff', emoji: '🏖️', label: 'Day Off', moodBoost: 25, energyBoost: 30, cost: 0, desc: 'Rest recharges everything' },
  { id: 'trophy', emoji: '🏆', label: 'Award Trophy', moodBoost: 30, energyBoost: 5, cost: 8, desc: 'Recognition feels amazing' },
];

export const OperationModule = () => {
  const { geniusProfile } = useGeniusAuth();
  const { business } = useAIpreneur();
  const navigate = useNavigate();
  const smartBack = useSmartBack();
  const { speak, stop: stopSpeech, isSpeaking } = useSpeechSynthesis();
  const [step, setStep] = useState<'team' | 'hire' | 'interview' | 'work' | 'complete'>('team');
  const [staff, setStaff] = useState<StaffMember[]>(() => generateStaffCandidates());
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<string | null>(null);

  // Track whether module was already completed (from backend)
  const moduleAlreadyCompleted = (business?.module_operation_progress ?? 0) >= 100;

  // Sound toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Encourage system
  const [encourageTargetId, setEncourageTargetId] = useState<string | null>(null);

  // Interview state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [interviewScore, setInterviewScore] = useState(0);

  const [isHiring, setIsHiring] = useState(false);

  // Work state
  const [isWorking, setIsWorking] = useState(false);
  const [customersServed, setCustomersServed] = useState(0);
  const [salesMultiplier, setSalesMultiplier] = useState(1.0);
  const [leadershipScore, setLeadershipScore] = useState(0);
  const [currentEvent, setCurrentEvent] = useState<RandomEvent | null>(null);
  const [showGeniMessage, setShowGeniMessage] = useState(false);
  const [geniMessage, setGeniMessage] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing hired staff from backend on mount
  const [staffLoaded, setStaffLoaded] = useState(false);
  useEffect(() => {
    if (staffLoaded) return;
    const loadExistingStaff = async () => {
      try {
        const response = await staffApi.getAll();
        if (response.success && response.staff && response.staff.length > 0) {
          const existingIds = new Set(response.staff.map(s => s.id));
          const existingStaff: StaffMember[] = response.staff.map((s, idx) => ({
            id: s.id,
            name: s.staff_name,
            role: (s.staff_role as 'cashier' | 'chef' | 'cleaner' | 'greeter') || 'cashier',
            salary: s.salary || 5,
            baseMood: s.mood || 75,
            baseEnergy: s.energy || 75,
            personality: s.personality || 'Hardworking team member! 💪',
            skills: s.skills || ['Reliable 🛡️'],
            hobbies: s.hobbies || ['Working 💼'],
            hired: true,
            mood: s.mood || 75,
            energy: s.energy || 75,
            intelligence: 70,
            emotional_intelligence: 70,
            work_ethic: 70,
            sales_impact: Math.floor(s.efficiency_modifier * 10) || 5,
            honesty: 80,
            secret_trait: 'Reliable Worker',
            avatarUrl: CHARACTER_AVATARS[idx % CHARACTER_AVATARS.length],
            avatarStyle: AVATAR_STYLES[idx % AVATAR_STYLES.length],
          }));
          // Merge: existing hired staff + candidates that aren't duplicates
          setStaff(prev => {
            const filtered = prev.filter(s => !existingIds.has(s.id) && !s.hired);
            return [...existingStaff, ...filtered];
          });
        }
        setStaffLoaded(true);
      } catch (err) {
        console.error('Failed to load existing staff:', err);
        setStaffLoaded(true);
      }
    };
    loadExistingStaff();
  }, [staffLoaded]);

  // Regenerate candidates
  const handleRefreshCandidates = () => {
    // Keep hired staff, only replace candidates
    setStaff(prev => [...prev.filter(s => s.hired), ...generateStaffCandidates()]);
    setSelectedRole(null);
  };

  // Filter candidates by role
  const filteredCandidates = useMemo(() => {
    if (!selectedRole) return staff;
    return staff.filter(s => s.role === selectedRole);
  }, [staff, selectedRole]);

  // Get hired staff
  const hiredStaff = useMemo(() => staff.filter(s => s.hired), [staff]);

  useEffect(() => {
    let customerInterval: ReturnType<typeof setInterval>;
    let eventInterval: ReturnType<typeof setInterval>;

    if (isWorking && step === 'work') {
      customerInterval = setInterval(() => {
        const avgMood = hiredStaff.length > 0 ? hiredStaff.reduce((sum, s) => sum + s.mood, 0) / hiredStaff.length : 75;
        const moodMultiplier = avgMood / 75;
        setCustomersServed(prev => prev + Math.max(1, Math.floor(1 * salesMultiplier * moodMultiplier)));
      }, 3000);

      eventInterval = setInterval(() => {
        if (Math.random() > 0.7) {
          triggerRandomEvent();
        }
      }, 15000);
    }

    return () => {
      clearInterval(customerInterval);
      clearInterval(eventInterval);
    };
  }, [isWorking, step, staff, salesMultiplier]);

  const triggerRandomEvent = () => {
    const hiredStaff = staff.filter(s => s.hired);
    if (hiredStaff.length === 0) return;

    const randomStaff = hiredStaff[Math.floor(Math.random() * hiredStaff.length)];
    const eventType = ['tired', 'mistake', 'happy'][Math.floor(Math.random() * 3)] as 'tired' | 'mistake' | 'happy';

    const events: Record<string, RandomEvent> = {
      tired: {
        type: 'tired',
        staffName: randomStaff.name,
        message: `${randomStaff.name} is feeling tired 😴`,
        options: [
          { text: '☕ Give a break', moodChange: 10, energyChange: 20, salesChange: 0 },
          { text: '💪 Encourage them', moodChange: 5, energyChange: 0, salesChange: 0 }
        ]
      },
      mistake: {
        type: 'mistake',
        staffName: randomStaff.name,
        message: `${randomStaff.name} made a small mistake! 😅`,
        options: [
          { text: '🤗 Help fix it kindly', moodChange: 15, energyChange: 0, salesChange: -2 },
          { text: '🤷 Ignore it', moodChange: -10, energyChange: 0, salesChange: -5 }
        ]
      },
      happy: {
        type: 'happy',
        staffName: randomStaff.name,
        message: `${randomStaff.name} served 10 happy customers! 🎉`,
        options: [
          { text: '👏 Give praise!', moodChange: 20, energyChange: 0, salesChange: 5 },
          { text: '😶 Say nothing', moodChange: -5, energyChange: 0, salesChange: 0 }
        ]
      }
    };

    setCurrentEvent(events[eventType]);
  };

  const handleEventResponse = (option: RandomEvent['options'][0]) => {
    if (!currentEvent) return;

    setStaff(prevStaff =>
      prevStaff.map(s =>
        s.name === currentEvent.staffName
          ? {
            ...s,
            mood: Math.min(100, Math.max(0, s.mood + option.moodChange)),
            energy: Math.min(100, Math.max(0, s.energy + option.energyChange))
          }
          : s
      )
    );

    setLeadershipScore(prev => prev + (option.moodChange > 0 ? 5 : 0));
    setCurrentEvent(null);

    setGeniMessage(option.moodChange > 0 ? 'Great leadership! 👏' : 'Try to be more supportive next time...');
    setShowGeniMessage(true);
    setTimeout(() => setShowGeniMessage(false), 2000);
  };

  const MAX_STAFF = 5;

  const handleSelectCandidate = (member: StaffMember) => {
    if (hiredStaff.length >= MAX_STAFF) {
      setGeniMessage(`Your team is full (${MAX_STAFF}/${MAX_STAFF})! Fire someone first to hire a new member. 👥`);
      setShowGeniMessage(true);
      setTimeout(() => setShowGeniMessage(false), 3000);
      return;
    }
    setSelectedStaff(member);
    setChatHistory([
      {
        sender: 'npc',
        text: `Hi! I'm ${member.name}! Thanks for meeting with me today! I'm really excited about this ${ROLE_INFO[member.role].title} position! 😊`,
        emotion: 'excited'
      }
    ]);
    setAskedQuestions(new Set());
    setInterviewScore(0);
    setStep('interview');
  };

  const handleAskQuestion = (questionKey: string) => {
    if (!selectedStaff || isTyping || askedQuestions.has(questionKey)) return;

    const question = INTERVIEW_QUESTIONS.find(q => q.key === questionKey);
    if (!question) return;

    setChatHistory(prev => [...prev, { sender: 'user', text: question.text }]);
    setIsTyping(true);
    setAskedQuestions(prev => new Set([...prev, questionKey]));

    setTimeout(() => {
      const answer = generateNPCResponse(selectedStaff, questionKey);
      setChatHistory(prev => [...prev, { sender: 'npc', text: answer.text, emotion: answer.emotion }]);
      setIsTyping(false);

      // Speak the answer aloud if sound is enabled
      if (soundEnabled) {
        const cleanText = answer.text.replace(/[^\w\s!?.,'-]/g, '');
        speak(cleanText);
      }

      // Update interview score based on work ethic and honesty
      const scoreBonus = Math.floor((selectedStaff.work_ethic + selectedStaff.honesty) / 40);
      setInterviewScore(prev => prev + scoreBonus);
    }, 1200 + Math.random() * 800);
  };

  const generateNPCResponse = (staff: StaffMember, type: string): { text: string, emotion: 'happy' | 'neutral' | 'nervous' | 'excited' } => {
    const isHonest = staff.honesty > 70;
    const isConfident = staff.emotional_intelligence > 70;

    if (type === 'intro') {
      if (isConfident) {
        return { text: `I'm ${staff.personality} I've always loved working with people and making them happy! 🌟`, emotion: 'excited' };
      }
      return { text: `Well, I'm ${staff.name}... I try my best and I really like ${staff.hobbies[0]}! 😊`, emotion: 'happy' };
    }
    if (type === 'strengths') {
      return { text: `My superpowers are ${staff.skills[0]} and ${staff.skills[1]}! I'm also great at staying positive! 💪✨`, emotion: 'excited' };
    }
    if (type === 'teamwork') {
      if (staff.emotional_intelligence > 75) {
        return { text: `I love being part of a team! I always try to help my teammates and celebrate wins together! 🎉`, emotion: 'happy' };
      }
      return { text: `I work well with others. I listen carefully and do my part! 🤝`, emotion: 'neutral' };
    }
    if (type === 'challenge') {
      if (staff.work_ethic > 80) {
        return { text: `Once we had a super busy day and I stayed calm, helped everyone, and we served 100 customers! It was awesome! 🏆`, emotion: 'excited' };
      }
      return { text: `I once had to learn something new really quickly. It was hard but I did it! 📚`, emotion: 'happy' };
    }
    if (type === 'motivation') {
      if (!isHonest && staff.honesty < 50) {
        return { text: `I absolutely LOVE this company! It's my dream job! (I really need the money though 😅)`, emotion: 'nervous' };
      }
      if (staff.sales_impact > 5) {
        return { text: `I want to help make this the best shop ever! I know I can help you serve more customers! 🚀`, emotion: 'excited' };
      }
      return { text: `This seems like a great place to work and grow! Plus, ${staff.hobbies[0]} keeps me happy! 😊`, emotion: 'happy' };
    }
    return { text: "That's a good question! Let me think... 🤔", emotion: 'neutral' };
  };

  const confirmHire = async () => {
    if (!selectedStaff || isHiring) return;

    setIsHiring(true);

    try {
      const response = await staffApi.create({
        staff_role: selectedStaff.role,
        staff_name: selectedStaff.name,
        mood: selectedStaff.mood,
        energy: selectedStaff.energy,
        salary: selectedStaff.salary,
        skills: selectedStaff.skills,
        hobbies: selectedStaff.hobbies,
        personality: selectedStaff.personality,
        speed_modifier: 0.8 + (selectedStaff.work_ethic / 250),
        efficiency_modifier: 0.8 + (selectedStaff.intelligence / 250),
      });

      if (response.success) {
        // Use server-generated ID so local state stays in sync with backend
        const serverId = response.staff?.id || selectedStaff.id;
        setStaff(prevStaff =>
          prevStaff.map(s =>
            s.id === selectedStaff.id
              ? { ...selectedStaff, id: serverId, hired: true }
              : s
          )
        );
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        setGeniMessage(`🎉 ${selectedStaff.name} joined your team!`);
        setShowGeniMessage(true);
        setTimeout(() => setShowGeniMessage(false), 2000);
        setStep('team');
        setSelectedStaff(null);
      } else {
        setGeniMessage('Failed to hire. Please try again.');
        setShowGeniMessage(true);
        setTimeout(() => setShowGeniMessage(false), 2000);
      }
    } catch (error) {
      console.error('Error hiring staff:', error);
      setGeniMessage('Error hiring staff. Please try again.');
      setShowGeniMessage(true);
      setTimeout(() => setShowGeniMessage(false), 2000);
    } finally {
      setIsHiring(false);
    }
  };

  const rejectCandidate = () => {
    setGeniMessage(`Thanks for coming, ${selectedStaff?.name}! 👋`);
    setShowGeniMessage(true);
    setTimeout(() => {
      setShowGeniMessage(false);
      setStep('team');
      setSelectedStaff(null);
    }, 1500);
  };

  const handleStartWork = () => {
    if (hiredStaff.length === 0) {
      setGeniMessage('Hire at least one team member first! 👥');
      setShowGeniMessage(true);
      setTimeout(() => setShowGeniMessage(false), 2000);
      return;
    }

    const totalImpact = hiredStaff.reduce((sum, s) => sum + (s.sales_impact || 0), 0);
    setSalesMultiplier(1 + (totalImpact / 50));

    setIsWorking(true);
    setStep('work');
    setCustomersServed(0);
  };

  const handleMotivate = (type: 'praise' | 'snacks' | 'bonus') => {
    const moodBoost = type === 'praise' ? 10 : type === 'snacks' ? 5 : 20;
    const energyBoost = type === 'snacks' ? 15 : 0;

    setStaff(prevStaff =>
      prevStaff.map(s =>
        s.hired
          ? {
            ...s,
            mood: Math.min(100, s.mood + moodBoost),
            energy: Math.min(100, s.energy + energyBoost)
          }
          : s
      )
    );

    const messages: Record<string, string> = {
      praise: 'Your team feels appreciated! 💖',
      snacks: 'Snack time boosts energy! 🍩',
      bonus: 'Bonus makes everyone happy! 💰'
    };
    setGeniMessage(messages[type]);
    setShowGeniMessage(true);
    setTimeout(() => setShowGeniMessage(false), 2000);
  };

  const handleEncourage = (staffId: string, actionId: string) => {
    const action = ENCOURAGE_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    setStaff(prev => prev.map(s =>
      s.id === staffId ? {
        ...s,
        mood: Math.min(100, s.mood + action.moodBoost),
        energy: Math.min(100, s.energy + action.energyBoost),
      } : s
    ));

    // Persist to backend
    const member = staff.find(s => s.id === staffId);
    if (member) {
      staffApi.update(staffId, {
        mood: Math.min(100, member.mood + action.moodBoost),
        energy: Math.min(100, member.energy + action.energyBoost),
      }).catch(() => { });
    }

    setEncourageTargetId(null);
    setGeniMessage(`${action.emoji} ${action.label} given! Mood boosted!`);
    setShowGeniMessage(true);
    setTimeout(() => setShowGeniMessage(false), 2000);
  };

  const [firingId, setFiringId] = useState<string | null>(null);
  const handleFireStaff = async (staffId: string) => {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    setFiringId(staffId);
    try {
      const response = await staffApi.delete(staffId);
      if (response.success) {
        setStaff(prev => prev.filter(s => s.id !== staffId));
        setGeniMessage(`${member.name} has left the team. 👋`);
        setShowGeniMessage(true);
        setTimeout(() => setShowGeniMessage(false), 2000);
      }
    } catch (err) {
      console.error('Failed to fire staff:', err);
      setGeniMessage('Failed to fire staff member.');
      setShowGeniMessage(true);
      setTimeout(() => setShowGeniMessage(false), 2000);
    } finally {
      setFiringId(null);
    }
  };

  const handleFinishShift = async () => {
    if (isSaving) return;

    setIsSaving(true);
    setIsWorking(false);

    try {
      // Only claim rewards on first completion — prevent repeated achievement triggers
      if (!moduleAlreadyCompleted) {
        await businessApi.updateModuleProgress('operation', 100);

        try {
          await rewardsApi.claimDaily();
        } catch {
          // Ignore if already claimed
        }

        if (geniusProfile?.id) {
          await analyzeModuleCompletion(geniusProfile.id, 'operations');
        }
      }

      setShowConfetti(true);
      setStep('complete');
      setGeniMessage(moduleAlreadyCompleted ? 'Great practice session! 🎉' : 'Module complete! You\'re a great leader! 🎉');
      setShowGeniMessage(true);

      setTimeout(() => {
        smartBack();
      }, 3000);
    } catch (error) {
      console.error('Error saving operations data:', error);
      setIsSaving(false);
    }
  };


  const lastUserMessage = [...chatHistory].reverse().find(msg => msg.sender === 'user');
  const lastNpcMessage = [...chatHistory].reverse().find(msg => msg.sender === 'npc');

  return (
    <ModulePage
      title="Operations"
      subtitle="Your team makes the magic happen"
      icon={Users}
      tone="lime"
      onBack={() => smartBack()}
      hero={<ModuleHero3D kind="staff" caption="Your dream team awaits" />}
      lesson={{
        title: 'People are your business',
        body: 'A great team multiplies what you can do alone. Hire for attitude, train for skill, and lead with kindness — happy staff serve happier customers.',
      }}
    >
      {showConfetti && <Confetti show={showConfetti} />}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${GLASS} relative w-full rounded-3xl overflow-visible`}
      >

        <div className="p-4 sm:p-6 md:p-8">
          <AnimatePresence mode="wait">
            {/* TEAM STEP - Staff Dashboard (Default) */}
            {step === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Users className="w-10 h-10 text-white" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Your Team</h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm">{hiredStaff.length > 0 ? `${hiredStaff.length} team member${hiredStaff.length > 1 ? 's' : ''} ready to work!` : 'Build your dream team to run the shop!'}</p>
                  {moduleAlreadyCompleted && (
                    <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 rounded-full text-sm font-bold text-green-400" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <CheckCircle className="w-4 h-4" /> Module Completed
                    </div>
                  )}
                </div>

                {hiredStaff.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="text-7xl mb-6">👥</div>
                    <h2 className="text-2xl font-bold text-white mb-3">Your team is empty!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }} className="mb-8">Hire your first team member to get started.</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStep('hire')}
                      className="px-8 py-4 rounded-2xl font-bold text-white text-lg flex items-center gap-3 mx-auto"
                      style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    >
                      <Users className="w-6 h-6" />
                      Hire Your First Team Member!
                    </motion.button>
                  </motion.div>
                ) : (
                  <>
                    {/* Staff Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {hiredStaff.map((member) => (
                        <motion.div
                          key={member.id}
                          whileHover={{ scale: 1.02 }}
                          className="p-5 rounded-2xl"
                          style={{
                            background: 'rgba(15, 15, 30, 0.5)',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div className="flex items-center gap-4 mb-3">
                            <div className="relative shrink-0">
                              <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '2px solid rgba(255, 255, 255, 0.12)', background: 'rgba(0,0,0,0.3)' }}>
                                <img src={member.avatarUrl} alt={member.name} className="w-full h-[200%] object-cover object-top" />
                              </div>
                              {/* Mood emoji floats off the avatar's bottom-right —
                                  instantly tells the kid how this team-mate is
                                  feeling without parsing a percentage. */}
                              <span
                                aria-hidden
                                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-lg leading-none"
                                style={{ background: '#1e1b3a', border: '2px solid rgba(255,255,255,0.12)' }}
                                title={`Mood ${member.mood}% · Energy ${member.energy}%`}
                              >
                                {member.mood >= 80 ? '😄' : member.mood >= 55 ? '🙂' : member.mood >= 30 ? '😐' : '😢'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-bold text-lg truncate">{member.name}</h3>
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.5)' }}>{ROLE_INFO[member.role].title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setEncourageTargetId(encourageTargetId === member.id ? null : member.id)}
                                className="px-3 py-2 rounded-xl text-pink-400 font-bold text-sm flex items-center gap-1"
                                style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}
                              >
                                <Heart className="w-4 h-4" />
                                Encourage
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                  if (confirm(`Are you sure you want to fire ${member.name}?`)) {
                                    handleFireStaff(member.id);
                                  }
                                }}
                                disabled={firingId === member.id}
                                className="px-3 py-2 rounded-xl text-red-400 font-bold text-sm flex items-center gap-1 disabled:opacity-50"
                                style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
                              >
                                <X className="w-4 h-4" />
                                Fire
                              </motion.button>
                            </div>
                          </div>

                          {/* Mood & Energy bars */}
                          <div className="flex gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Mood</span>
                                <span className="text-pink-400">{member.mood}%</span>
                              </div>
                              <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${member.mood}%` }}
                                  className="bg-gradient-to-r from-pink-500 to-rose-500 h-2.5 rounded-full"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Energy</span>
                                <span className="text-green-400">{member.energy}%</span>
                              </div>
                              <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${member.energy}%` }}
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Encourage menu (inline) */}
                          <AnimatePresence>
                            {encourageTargetId === member.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  {ENCOURAGE_ACTIONS.map(action => (
                                    <motion.button
                                      key={action.id}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleEncourage(member.id, action.id)}
                                      className="p-3 rounded-xl text-center"
                                      style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                                    >
                                      <div className="text-2xl mb-1">{action.emoji}</div>
                                      <div className="text-white font-bold text-xs">{action.label}</div>
                                      <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{action.cost > 0 ? `${action.cost} coins` : 'Free'}</div>
                                    </motion.button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      ))}
                    </div>

                    {/* Bottom actions */}
                    <div className="flex gap-3">
                      {hiredStaff.length < MAX_STAFF && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setStep('hire')}
                          className="flex-1 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                          style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                        >
                          <Users className="w-5 h-5" />
                          Hire More ({hiredStaff.length}/{MAX_STAFF})
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStartWork}
                        className="flex-1 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2"
                        style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                      >
                        <Sparkles className="w-5 h-5" />
                        {moduleAlreadyCompleted ? 'Practice Shift!' : 'Start Working!'}
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* HIRE STEP - New Interactive UI */}
            {step === 'hire' && (
              <motion.div
                key="hire"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    animate={{
                      rotate: [0, -5, 5, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Users className="w-10 h-10 text-white" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    Build Your Dream Team! 🌟
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)' }} className="text-sm md:text-base">
                    Click on a candidate to start interviewing them!
                  </p>
                  {hiredStaff.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStep('team')}
                      className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
                      style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      ← Back to Team
                    </motion.button>
                  )}
                </div>

                {/* Role Filter & Refresh */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRole(null)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm transition-all"
                    style={!selectedRole
                      ? { background: 'rgba(255, 255, 255, 0.12)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }
                      : { background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                    }
                  >
                    All Roles
                  </motion.button>
                  {Object.entries(ROLE_INFO).map(([role, info]) => (
                    <motion.button
                      key={role}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedRole(role)}
                      className="px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
                      style={selectedRole === role
                        ? { background: 'rgba(255, 255, 255, 0.12)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }
                        : { background: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }
                      }
                    >
                      <span>{info.emoji}</span>
                      <span>{info.title}</span>
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRefreshCandidates}
                    className="p-2 rounded-xl"
                    style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}
                    title="New Candidates"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Hired Staff Summary */}
                {hiredStaff.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl"
                    style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                          {hiredStaff.slice(0, 4).map((member) => (
                            <motion.div
                              key={member.id}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-10 h-10 rounded-full border-2 border-green-500 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}
                            >
                              <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                            </motion.div>
                          ))}
                        </div>
                        <div>
                          <p className="text-white font-bold">{hiredStaff.length}/{MAX_STAFF} Team Member{hiredStaff.length > 1 ? 's' : ''} Hired!</p>
                          <p className="text-green-400 text-sm">{hiredStaff.map(s => s.name).join(', ')}</p>
                          {hiredStaff.length >= MAX_STAFF && (
                            <p className="text-yellow-400 text-xs mt-1">Staff limit reached!</p>
                          )}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStartWork}
                        className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                      >
                        <Sparkles className="w-5 h-5" />
                        {moduleAlreadyCompleted ? 'Practice Shift!' : 'Start Working!'}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Candidates Grid — Game-style Character Select */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCandidates.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      whileHover={{ scale: member.hired ? 1 : 1.03 }}
                      onClick={() => !member.hired && handleSelectCandidate(member)}
                      className={`relative ${member.hired || hiredStaff.length >= MAX_STAFF ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div
                        className="relative p-4 rounded-xl transition-all overflow-hidden"
                        style={{
                          background: member.hired ? 'rgba(34, 197, 94, 0.06)' : 'rgba(15, 15, 30, 0.8)',
                          border: member.hired ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        {/* Hired badge */}
                        {member.hired && (
                          <div className="absolute top-2 right-2 z-10 bg-green-500 rounded-full p-1">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}

                        {/* Head-only avatar (zoomed circular) */}
                        <div className="relative w-16 h-16 mx-auto mb-3">
                          <div className="w-full h-full rounded-full overflow-hidden"
                            style={{ border: member.hired ? '2px solid rgba(34, 197, 94, 0.4)' : '2px solid rgba(255, 255, 255, 0.1)' }}
                          >
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-full h-[200%] object-cover object-top"
                            />
                          </div>
                        </div>

                        {/* Name & Role pill */}
                        <div className="text-center">
                          <h3 className="text-white font-bold text-sm truncate">{member.name}</h3>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.5)' }}
                          >
                            {ROLE_INFO[member.role].title}
                          </span>
                        </div>

                        {/* Salary */}
                        <div className="mt-2.5 text-center">
                          <span className="text-[11px] font-bold" style={{ color: 'rgba(234, 179, 8, 0.6)' }}>{member.salary} coins/day</span>
                        </div>

                        {/* Hover overlay */}
                        {!member.hired && (
                          <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
                          >
                            <div className="text-center">
                              <MessageCircle className="w-7 h-7 text-white mx-auto mb-1.5" />
                              <p className="text-white font-bold text-xs">Interview</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'interview' && selectedStaff && (
              <motion.div
                key="interview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-[75vh]"
              >
                {/* Interview Header */}
                <div className="flex items-center gap-4 mb-4 pb-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                      <MessageCircle style={{ color: 'rgba(255,255,255,0.4)' }} /> Interviewing {selectedStaff.name}
                    </h2>
                    <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Position: <span className="text-white font-bold">{ROLE_INFO[selectedStaff.role].title}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSoundEnabled(!soundEnabled);
                        if (soundEnabled) stopSpeech();
                      }}
                      className="p-2.5 rounded-xl transition-colors"
                      style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                      title={soundEnabled ? 'Mute voice' : 'Enable voice'}
                    >
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-white" /> : <VolumeX className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </button>
                    <div className="text-right px-4 py-2 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div className="text-xs uppercase tracking-wider font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Interview Score</div>
                      <div className="text-2xl font-black text-white">{interviewScore} / 10</div>
                    </div>
                  </div>
                </div>

                {/* Interview Stage */}
                <div className="flex-1 rounded-3xl p-6 mb-4 relative overflow-hidden flex flex-col md:flex-row items-center justify-center gap-8" style={{ background: 'rgba(15, 15, 30, 0.3)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>

                  {/* Avatar - Full Body for Interview */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-40 h-56 md:w-52 md:h-72 flex-shrink-0"
                  >
                    <div className="absolute inset-0 rounded-2xl blur-2xl opacity-20" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />
                    <motion.img
                      src={selectedStaff.avatarUrl}
                      alt={selectedStaff.name}
                      animate={isSpeaking ? { scale: [1, 1.02, 1, 1.02, 1] } : {}}
                      transition={{ duration: 0.4, repeat: isSpeaking ? Infinity : 0 }}
                      className="w-full h-full object-cover rounded-2xl shadow-2xl relative z-10"
                      style={{ border: '2px solid rgba(255, 255, 255, 0.1)' }}
                    />
                    {isSpeaking && (
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)' }}
                      >
                        <Volume2 className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {selectedStaff.personality.split(' ')[0]} Personality
                    </div>
                  </motion.div>

                  {/* Speech Bubble Area */}
                  <div className="flex-1 w-full max-w-xl flex flex-col gap-4">
                    {/* Conversation History / Stream */}
                    <div className="flex flex-col gap-4 relative">

                      {/* User Bubble (Right) */}
                      {lastUserMessage && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="self-end max-w-[80%]"
                        >
                          <div className="px-5 py-3.5 rounded-2xl rounded-tr-sm" style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <p className="font-bold text-sm md:text-base text-white">"{lastUserMessage.text}"</p>
                          </div>
                        </motion.div>
                      )}

                      {/* NPC Bubble (Left) */}
                      <motion.div
                        key={lastNpcMessage?.text || 'start'}
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="self-start max-w-[90%] relative"
                      >
                        <div className="p-5 md:p-6 rounded-2xl rounded-tl-sm relative z-10" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <h3 className="font-bold text-sm mb-1.5 flex items-center gap-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            {selectedStaff.name}
                            {lastNpcMessage?.emotion && (
                              <span className="text-lg">
                                {lastNpcMessage.emotion === 'excited' ? '🤩' : lastNpcMessage.emotion === 'happy' ? '😊' : lastNpcMessage.emotion === 'nervous' ? '😅' : '🤔'}
                              </span>
                            )}
                          </h3>
                          <p className="text-base md:text-lg font-bold leading-relaxed text-white">
                            {lastNpcMessage?.text || "Hi there! I'm ready for your questions! Ask me anything."}
                          </p>
                        </div>
                      </motion.div>
                    </div>

                    {isTyping && (
                      <div className="flex items-center gap-2 text-sm ml-4 self-start px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'rgba(255,255,255,0.4)' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce delay-75" style={{ background: 'rgba(255,255,255,0.4)' }} />
                        <div className="w-2 h-2 rounded-full animate-bounce delay-150" style={{ background: 'rgba(255,255,255,0.4)' }} />
                        <span className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>Thinking...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Question Controls */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-between text-xs mb-3 px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <span className="font-bold text-white">ASK A QUESTION:</span>
                    <span>{askedQuestions.size}/{INTERVIEW_QUESTIONS.length} Questions Asked</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {INTERVIEW_QUESTIONS.map(q => (
                      <motion.button
                        key={q.key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAskQuestion(q.key)}
                        disabled={isTyping || askedQuestions.has(q.key)}
                        className="p-3 rounded-xl text-left text-sm font-bold transition-all flex flex-col items-center justify-center gap-2 text-center h-24"
                        style={askedQuestions.has(q.key)
                          ? { background: 'rgba(255, 255, 255, 0.02)', color: 'rgba(255,255,255,0.2)', border: '2px solid transparent', cursor: 'not-allowed' }
                          : { background: 'rgba(255, 255, 255, 0.04)', border: '2px solid rgba(255, 255, 255, 0.08)', color: '#fff' }
                        }
                      >
                        <span className="text-2xl">{q.icon}</span>
                        <span className="leading-tight">{q.text.replace(/[!?]/g, '')}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={rejectCandidate}
                      className="flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
                      style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      <ThumbsDown className="w-5 h-5" />
                      Pass on Candidate
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: isHiring ? 1 : 1.02 }}
                      whileTap={{ scale: isHiring ? 1 : 0.98 }}
                      onClick={confirmHire}
                      disabled={isHiring}
                      className="flex-[2] py-4 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                    >
                      {isHiring ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          HIRING...
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="w-6 h-6" />
                          HIRE {selectedStaff.name.toUpperCase()}!
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}


            {/* WORK STEP */}
            {step === 'work' && (
              <motion.div
                key="work"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                  >
                    <Sparkles className="w-8 h-8 text-white" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-white mb-2">Shop is Open! 🏪</h2>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div className="text-3xl font-bold text-white">{customersServed}</div>
                      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Customers Served</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div className="text-3xl font-bold text-white">{leadershipScore}</div>
                      <div className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Leadership Score</div>
                    </div>
                  </div>
                </div>

                {/* Team Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {hiredStaff.map((member) => (
                    <motion.div
                      key={member.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-xl flex items-center gap-4"
                      style={{ background: 'rgba(15, 15, 30, 0.5)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{member.name}</h3>
                        <div className="flex gap-4 mt-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Mood</span>
                              <span className="text-pink-400">{member.mood}%</span>
                            </div>
                            <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${member.mood}%` }}
                                className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full"
                              />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-1">
                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Energy</span>
                              <span className="text-green-400">{member.energy}%</span>
                            </div>
                            <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${member.energy}%` }}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Motivate Team */}
                <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.15)' }}>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-yellow-400" />
                    Motivate Your Team
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMotivate('praise')}
                      className="p-4 rounded-xl"
                      style={{ background: 'rgba(236, 72, 153, 0.1)', border: '2px solid rgba(236, 72, 153, 0.2)' }}
                    >
                      <div className="text-3xl mb-2">🙌</div>
                      <div className="text-white font-bold text-sm mb-1">Praise</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Free</div>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMotivate('snacks')}
                      className="p-4 rounded-xl"
                      style={{ background: 'rgba(249, 115, 22, 0.1)', border: '2px solid rgba(249, 115, 22, 0.2)' }}
                    >
                      <div className="text-3xl mb-2">🍩</div>
                      <div className="text-white font-bold text-sm mb-1">Snacks</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>5 coins</div>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMotivate('bonus')}
                      className="p-4 rounded-xl"
                      style={{ background: 'rgba(34, 197, 94, 0.1)', border: '2px solid rgba(34, 197, 94, 0.2)' }}
                    >
                      <div className="text-3xl mb-2">💰</div>
                      <div className="text-white font-bold text-sm mb-1">Bonus</div>
                      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>10 coins</div>
                    </motion.button>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFinishShift}
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl font-bold text-xl text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}
                >
                  {isSaving ? 'Saving...' : moduleAlreadyCompleted ? '✨ Finish Practice Shift' : '✨ Finish Shift & Complete Module'}
                </motion.button>
              </motion.div>
            )}

            {/* COMPLETE STEP */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-8xl mb-6"
                >
                  🏆
                </motion.div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  {moduleAlreadyCompleted ? 'Great Practice!' : 'Leadership Unlocked!'}
                </h2>
                <p className="text-xl mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {moduleAlreadyCompleted ? 'Keep leading your team!' : 'Your team is motivated and ready!'}
                </p>
                {!moduleAlreadyCompleted && (
                <div className="flex items-center justify-center gap-6 flex-wrap">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
                    style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                  >
                    <Award className="w-6 h-6 text-green-400" />
                    <span className="text-green-400 font-bold">+60 XP</span>
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl"
                    style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}
                  >
                    <Crown className="w-6 h-6 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">+30 Coins</span>
                  </motion.div>
                </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Event Modal */}
      <AnimatePresence>
        {currentEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="rounded-3xl p-8 max-w-md"
              style={{
                background: 'rgba(15, 15, 30, 0.7)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
              }}
            >
              <div className="text-6xl text-center mb-4">
                {currentEvent.type === 'tired' ? '😴' : currentEvent.type === 'mistake' ? '😅' : '🎉'}
              </div>
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                {currentEvent.message}
              </h3>
              <div className="space-y-3">
                {currentEvent.options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEventResponse(option)}
                    className="w-full p-4 rounded-xl text-white font-bold shadow-lg"
                    style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    {option.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Geni Message Toast */}
      <AnimatePresence>
        {showGeniMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999]"
          >
            <div className={`${GLASS} rounded-2xl px-4 py-3 flex items-center gap-2 max-w-md`}>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600 border-b-[3px] border-violet-800">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{geniMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModulePage>
  );
};
