import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X, Briefcase, Compass, Trophy, User, Swords,
  ShoppingBag, Users, Megaphone, Lightbulb, Leaf, DollarSign,
  Palette, Store as StoreIcon,
  Gift, Coins, Medal, Crown,
  Home, Globe, Map, Lock,
  UserCog, Brain, HelpCircle, LogOut, Shirt,
  Clock, ChevronLeft, CheckCircle, Zap, Ticket, Flame,
  Sparkles, ChevronRight, TrendingUp, Award, Heart,
} from 'lucide-react';
import { useGeniusAuth } from '../../contexts/GeniusAuthContext';
import { AvatarWardrobe } from './AvatarWardrobe';
import { getDailyTasks } from '../DailyTaskSystem';
import { leaderboardApi, rewardsApi, type LeaderboardEntry, type AIpreneurReward } from '../../services/aipreneurApi';

// ─── Bottom Nav Tabs ───
const TABS = [
  { id: 'manage', label: 'AI Learning', icon: Briefcase },
  { id: 'quest', label: 'Quest', icon: Swords },
  { id: 'rewards', label: 'Rewards', icon: Trophy },
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'profile', label: 'Profile', icon: User },
];

// ─── Tab accent colours ───
const TAB_ACCENT: Record<string, { gradient: string; glow: string; ring: string; text: string }> = {
  manage:  { gradient: 'from-violet-500 to-indigo-600', glow: 'shadow-violet-500/30', ring: 'ring-violet-400', text: 'text-violet-600' },
  quest:   { gradient: 'from-amber-400 to-orange-500',  glow: 'shadow-amber-500/30',  ring: 'ring-amber-400',  text: 'text-amber-600' },
  rewards: { gradient: 'from-yellow-400 to-amber-500',  glow: 'shadow-yellow-500/40', ring: 'ring-yellow-400', text: 'text-yellow-600' },
  explore: { gradient: 'from-cyan-400 to-blue-500',     glow: 'shadow-cyan-500/30',   ring: 'ring-cyan-400',   text: 'text-cyan-600' },
  profile: { gradient: 'from-emerald-400 to-teal-500',  glow: 'shadow-emerald-500/30',ring: 'ring-emerald-400',text: 'text-emerald-600' },
};

// ─── Grid items per tab ───
interface GridItem {
  id: string;
  name: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  glow: string;
  desc: string;
}

const TAB_CONTENT: Record<string, GridItem[]> = {
  manage: [
    { id: 'product',    name: 'Products',   icon: ShoppingBag, path: '/s/aipreneur/product',    gradient: 'from-blue-500 to-cyan-500',     glow: 'shadow-blue-500/25',   desc: 'Create Product with AI' },
    { id: 'operation',  name: 'Team',       icon: Users,       path: '/s/aipreneur/operation',  gradient: 'from-emerald-500 to-green-500', glow: 'shadow-emerald-500/25', desc: 'Hire Team with AI' },
    { id: 'marketing',  name: 'Marketing',  icon: Megaphone,   path: '/s/aipreneur/marketing',  gradient: 'from-orange-500 to-red-500',    glow: 'shadow-orange-500/25',  desc: 'Content Creation with AI' },
    { id: 'innovation', name: 'Technology', icon: Lightbulb,   path: '/s/aipreneur/innovation', gradient: 'from-pink-500 to-rose-500',     glow: 'shadow-pink-500/25',    desc: 'Coding with AI' },
    { id: 'csr',        name: 'CSR',        icon: Leaf,        path: '/s/aipreneur/csr',        gradient: 'from-lime-500 to-green-500',    glow: 'shadow-lime-500/25',    desc: 'Social Impact with AI' },
    { id: 'finance',    name: 'Finance',    icon: DollarSign,  path: '/s/aipreneur/finance',    gradient: 'from-indigo-500 to-violet-500', glow: 'shadow-indigo-500/25',  desc: 'Money Smart with AI' },
  ],
  quest: [
    { id: 'achievements', name: 'Daily Quests', icon: Swords,   path: '/s/aipreneur',          gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/25', desc: 'Missions' },
    { id: 'dashboard',    name: 'Dashboard',    icon: Home,      path: '/s/aipreneur',          gradient: 'from-violet-500 to-purple-500',glow: 'shadow-violet-500/25',desc: 'Overview' },
  ],
  rewards: [
    { id: 'rewards',     name: 'My Rewards', icon: Gift,   path: '/s/aipreneur/rewards',   gradient: 'from-yellow-400 to-amber-500', glow: 'shadow-yellow-500/25', desc: 'Claim prizes' },
    { id: 'tokens',      name: 'AI Tokens',  icon: Coins,  path: '/s/aipreneur/ai-tokens', gradient: 'from-blue-400 to-indigo-500',  glow: 'shadow-blue-500/25',   desc: 'Top up' },
    { id: 'leaderboard', name: 'Rank',       icon: Crown,  path: '/s/aipreneur',           gradient: 'from-orange-400 to-red-500',   glow: 'shadow-orange-500/25', desc: 'Leaderboard' },
    { id: 'medals',      name: 'Badges',     icon: Medal,  path: '/s/aipreneur',           gradient: 'from-emerald-400 to-cyan-500', glow: 'shadow-emerald-500/25',desc: 'Achievements' },
  ],
  explore: [
    { id: 'dashboard', name: 'Dashboard',   icon: Home,      path: '/s/aipreneur',         gradient: 'from-violet-500 to-indigo-500', glow: 'shadow-violet-500/25', desc: 'Overview' },
    { id: 'store',     name: 'My Webstore', icon: StoreIcon,  path: '/s/aipreneur/store',   gradient: 'from-purple-500 to-pink-500',   glow: 'shadow-purple-500/25', desc: 'View shop' },
    { id: 'explore',   name: 'Explore',     icon: Globe,      path: '/s/aipreneur/explore', gradient: 'from-cyan-500 to-blue-500',     glow: 'shadow-cyan-500/25',   desc: 'Discover' },
    { id: 'map',       name: 'World Map',   icon: Map,        path: '#coming-soon',         gradient: 'from-teal-500 to-emerald-500',  glow: 'shadow-teal-500/25',   desc: 'Coming Soon' },
    { id: 'decorate',  name: 'Decorate',    icon: Palette,    path: '/s/aipreneur/decorate', gradient: 'from-rose-500 to-pink-500',    glow: 'shadow-rose-500/25',   desc: 'Interior' },
  ],
  profile: [
    { id: 'avatar',   name: 'Avatar',       icon: Shirt,      path: '#avatar',                   gradient: 'from-violet-500 to-purple-500', glow: 'shadow-violet-500/25', desc: 'Wardrobe' },
    { id: 'persona',  name: 'Persona Quiz', icon: Brain,       path: '/s/aipreneur/persona-quiz', gradient: 'from-indigo-500 to-blue-500',   glow: 'shadow-indigo-500/25', desc: 'Discover you' },
    { id: 'profile',  name: 'My Profile',   icon: UserCog,     path: '/s/profile',                gradient: 'from-pink-500 to-rose-500',     glow: 'shadow-pink-500/25',   desc: 'Edit info' },
    { id: 'help',     name: 'Tutorial',     icon: HelpCircle,  path: '#tutorial',                 gradient: 'from-teal-400 to-cyan-500',     glow: 'shadow-teal-500/25',   desc: 'Learn' },
    { id: 'logout',   name: 'Logout',       icon: LogOut,      path: '#logout',                   gradient: 'from-red-500 to-rose-600',      glow: 'shadow-red-500/25',    desc: 'Sign out' },
  ],
};

interface TabletMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarChange?: (avatarPath: string) => void;
}

// Time until midnight for quest reset countdown
const getTimeUntilMidnight = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
};

// ─── Animated Finger (reusable) ───
function AnimatedFinger({ x, y, tapping }: { x: number; y: number; tapping: boolean }) {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none text-2xl"
      animate={{ x, y, scale: tapping ? 0.75 : 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 200 }}
    >
      👆
      {tapping && (
        <motion.div
          className="absolute inset-0 w-8 h-8 -m-1 rounded-full border-2 border-yellow-400"
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}
    </motion.div>
  );
}

// ─── Mini Tablet Mockup (reusable) ───
function MiniTablet({ activeTab, highlightItem, children }: { activeTab: string; highlightItem?: string; children?: React.ReactNode }) {
  const tabs = [
    { id: 'manage', label: 'M', color: 'bg-violet-500' },
    { id: 'quest', label: 'Q', color: 'bg-amber-500' },
    { id: 'rewards', label: 'R', color: 'bg-yellow-500' },
    { id: 'explore', label: 'E', color: 'bg-cyan-500' },
    { id: 'profile', label: 'P', color: 'bg-emerald-500' },
  ];
  return (
    <div className="w-[140px] h-[200px] bg-gradient-to-b from-slate-300 to-slate-400 rounded-[16px] p-[3px] shadow-xl mx-auto">
      <div className="w-full h-full bg-white rounded-[14px] overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="h-3 bg-slate-50 flex items-center px-2">
          <div className="w-1 h-1 rounded-full bg-slate-300" />
        </div>
        {/* Content */}
        <div className="flex-1 p-1.5 overflow-hidden bg-slate-50">
          {children}
        </div>
        {/* Bottom nav */}
        <div className="h-7 bg-white border-t border-slate-100 flex items-center justify-around px-1">
          {tabs.map(t => (
            <div key={t.id} className={`w-4 h-4 rounded-md flex items-center justify-center text-[6px] font-bold text-white transition-all ${
              activeTab === t.id ? `${t.color} scale-110 shadow-sm` : 'bg-slate-200 text-slate-400'
            } ${highlightItem === t.id ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
              {t.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Grid Item ───
function MiniGridItem({ label, color, highlight }: { label: string; color: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-1 flex flex-col items-center gap-0.5 bg-white border transition-all ${
      highlight ? 'border-yellow-400 ring-1 ring-yellow-300 scale-110 shadow-md' : 'border-slate-100'
    }`}>
      <div className={`w-5 h-5 rounded-md ${color} flex items-center justify-center`}>
        <div className="w-2 h-2 bg-white/40 rounded-sm" />
      </div>
      <span className="text-[5px] font-bold text-slate-500 leading-none">{label}</span>
    </div>
  );
}

// ─── Step 1: Open Your Phone ───
function PhoneSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(0), 4500),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center">
      {/* 3D scene bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 to-green-200 rounded-xl overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-green-400/30 to-transparent" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-3xl">🏪</div>
      </div>
      {/* Phone icon */}
      <motion.div
        className="absolute bottom-3 right-3 w-10 h-16 bg-gradient-to-b from-slate-700 to-slate-900 rounded-lg border border-slate-500 flex items-center justify-center"
        animate={phase >= 2 ? { scale: [1, 1.3, 1.1], boxShadow: '0 0 20px rgba(168,85,247,0.6)' } : {}}
        transition={{ duration: 0.4 }}
      >
        <div className="w-7 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-md">
          <div className="grid grid-cols-2 gap-[2px] p-1 pt-2">
            {['bg-amber-400','bg-green-400','bg-blue-400','bg-pink-400'].map((c,i) => (
              <div key={i} className={`w-2 h-2 rounded-sm ${c}`} />
            ))}
          </div>
        </div>
      </motion.div>
      {/* Animated finger */}
      {phase >= 1 && (
        <AnimatedFinger x={phase >= 2 ? 105 : 60} y={phase >= 2 ? 120 : 80} tapping={phase === 2} />
      )}
      {/* Menu appearing */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-4 bg-white rounded-xl shadow-2xl flex items-center justify-center border-2 border-violet-200"
          >
            <div className="text-center">
              <span className="text-2xl">📱</span>
              <p className="text-[8px] font-bold text-violet-600 mt-1">Menu Opens!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 2: Add Products ───
function ProductSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3500),
      setTimeout(() => setPhase(0), 5200),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center">
      <MiniTablet activeTab={phase >= 1 ? 'manage' : ''} highlightItem={phase === 1 ? 'manage' : undefined}>
        {phase < 2 ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-[8px]">Tap Manage</div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            <MiniGridItem label="Products" color="bg-blue-500" highlight={phase >= 3} />
            <MiniGridItem label="Team" color="bg-emerald-500" />
            <MiniGridItem label="Marketing" color="bg-orange-500" />
            <MiniGridItem label="Tech" color="bg-pink-500" />
          </div>
        )}
      </MiniTablet>
      {phase >= 1 && phase < 3 && <AnimatedFinger x={-25} y={155} tapping={phase === 1} />}
      {phase >= 3 && phase < 4 && <AnimatedFinger x={-35} y={40} tapping={phase === 3} />}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute top-2 right-2 bg-blue-500 text-white rounded-lg px-2 py-1 shadow-lg"
          >
            <p className="text-[7px] font-bold flex items-center gap-1">📦 Product Page!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 3: Hire Staff ───
function StaffSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3300),
      setTimeout(() => setPhase(0), 5000),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center">
      <MiniTablet activeTab="manage">
        <div className="grid grid-cols-2 gap-1">
          <MiniGridItem label="Products" color="bg-blue-500" />
          <MiniGridItem label="Team" color="bg-emerald-500" highlight={phase >= 2} />
          <MiniGridItem label="Marketing" color="bg-orange-500" />
          <MiniGridItem label="Tech" color="bg-pink-500" />
        </div>
      </MiniTablet>
      {phase >= 1 && phase < 3 && <AnimatedFinger x={15} y={40} tapping={phase === 2} />}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-2 right-2 bg-emerald-500 rounded-lg p-2 shadow-lg"
          >
            <div className="flex items-center gap-1">
              <span className="text-sm">👨‍💼</span>
              <div>
                <p className="text-[7px] font-bold text-white">Staff Hired!</p>
                {phase >= 4 && (
                  <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[6px] text-emerald-100 font-bold">
                    ✅ Ready to serve!
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 4: Grand Opening ───
function OpenShopSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => setPhase(0), 5500),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center overflow-hidden">
      {/* Companion bubble */}
      <motion.div
        className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-3 shadow-xl w-[200px]"
        animate={phase >= 2 ? { scale: 0.95 } : { scale: 1 }}
      >
        <div className="flex items-start gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <p className="text-white text-[8px] font-bold">You're all set!</p>
            <motion.button
              className="mt-1.5 w-full py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-[8px] font-black text-white"
              animate={phase >= 1 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              🎊 OPEN SHOP! 🎊
            </motion.button>
          </div>
        </div>
      </motion.div>
      {/* Finger tapping button */}
      {phase >= 1 && phase < 3 && <AnimatedFinger x={50} y={95} tapping={phase === 2} />}
      {/* Ribbon cutting */}
      <AnimatePresence>
        {phase >= 3 && (
          <>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/2 left-0 w-1/2 h-2 bg-red-500 origin-right"
            />
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute top-1/2 right-0 w-1/2 h-2 bg-red-500 origin-left"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.5, repeat: Infinity }} className="text-4xl block">🎉</motion.span>
                <p className="text-white text-xs font-black mt-1 drop-shadow-lg">GRAND OPENING!</p>
              </div>
            </motion.div>
            {/* Mini confetti */}
            {phase >= 4 && ['🎊','⭐','🎈','✨','🎁','🌟'].map((e, i) => (
              <motion.span
                key={i}
                className="absolute text-lg"
                initial={{ x: 100, y: 90, opacity: 1 }}
                animate={{ x: 100 + (Math.random() - 0.5) * 200, y: -20, opacity: 0, rotate: 360 }}
                transition={{ duration: 1.5, delay: i * 0.1 }}
              >
                {e}
              </motion.span>
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 5: Decorate Your Shop ───
function DecorateSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2300),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(0), 5000),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center">
      <MiniTablet activeTab={phase >= 1 ? 'explore' : 'manage'} highlightItem={phase === 1 ? 'explore' : undefined}>
        {phase < 2 ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-[8px]">Tap Explore</div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            <MiniGridItem label="Dashboard" color="bg-violet-500" />
            <MiniGridItem label="Webstore" color="bg-purple-500" />
            <MiniGridItem label="Explore" color="bg-cyan-500" />
            <MiniGridItem label="Decorate" color="bg-rose-500" highlight={phase >= 3} />
          </div>
        )}
      </MiniTablet>
      {phase === 1 && <AnimatedFinger x={37} y={155} tapping />}
      {phase >= 3 && phase < 4 && <AnimatedFinger x={15} y={75} tapping={phase === 3} />}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 bg-rose-500 rounded-lg p-2 shadow-lg"
          >
            <div className="flex gap-1">
              {['bg-amber-300','bg-sky-300','bg-rose-300','bg-emerald-300'].map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`w-4 h-4 rounded-md ${c} border border-white/50`}
                />
              ))}
            </div>
            <p className="text-[6px] text-white font-bold text-center mt-1">Pick a style! 🎨</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 6: Complete Quests ───
function QuestSimulation() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const seq = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2300),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(0), 5000),
    ];
    return () => seq.forEach(clearTimeout);
  }, [phase === 0 ? 'reset' : 'running']);

  return (
    <div className="relative w-full h-[180px] flex items-center justify-center">
      <MiniTablet activeTab={phase >= 1 ? 'quest' : 'manage'} highlightItem={phase === 1 ? 'quest' : undefined}>
        {phase < 2 ? (
          <div className="flex items-center justify-center h-full text-slate-300 text-[8px]">Tap Quest</div>
        ) : (
          <div className="space-y-1.5 p-0.5">
            {['Add a product','Hire 1 staff','Visit Dashboard'].map((q, i) => (
              <motion.div
                key={i}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.15 }}
                className={`flex items-center gap-1 p-1 rounded-md border text-[6px] font-medium ${
                  phase >= 4 && i === 0 ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-600'
                }`}
              >
                <div className={`w-3 h-3 rounded-full flex items-center justify-center text-[5px] ${
                  phase >= 4 && i === 0 ? 'bg-green-400 text-white' : 'bg-amber-100'
                }`}>
                  {phase >= 4 && i === 0 ? '✓' : '!'}
                </div>
                {q}
              </motion.div>
            ))}
          </div>
        )}
      </MiniTablet>
      {phase === 1 && <AnimatedFinger x={-15} y={155} tapping />}
      <AnimatePresence>
        {phase >= 4 && (
          <motion.div
            initial={{ scale: 0, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            className="absolute top-2 right-2 bg-amber-400 rounded-lg px-2 py-1.5 shadow-lg"
          >
            <p className="text-[7px] font-black text-amber-900">+50 coins! 🪙</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 7: You're Ready! ───
function ReadySimulation() {
  return (
    <div className="relative w-full h-[180px] flex items-center justify-center overflow-hidden bg-gradient-to-b from-sky-100 to-emerald-100 rounded-xl">
      {/* Shop scene */}
      <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-5xl">
        🏪
      </motion.div>
      {/* Walking customers */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute text-lg"
          animate={{ x: [-40, 200] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 1.3, ease: 'linear' }}
          style={{ bottom: 20 + i * 12, left: 0 }}
        >
          {['🚶','🧑','🧒'][i]}
        </motion.div>
      ))}
      {/* Floating celebration */}
      {['⭐','🎊','✨','🌟','🎉','💫'].map((e, i) => (
        <motion.span
          key={i}
          className="absolute text-xl pointer-events-none"
          animate={{ y: [180, -20], opacity: [0, 1, 1, 0], rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          style={{ left: 20 + i * 40 }}
        >
          {e}
        </motion.span>
      ))}
      {/* Open sign */}
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute top-3 bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black shadow-lg"
      >
        ✅ SHOP OPEN!
      </motion.div>
    </div>
  );
}

// ─── Tutorial Data ───
const TUTORIAL_STEPS: { title: string; desc: string; color: string; Sim: React.FC }[] = [
  { title: '📱 Open Your Phone', desc: 'Tap the phone icon at the bottom-right to open your menu!', color: 'from-violet-500 to-purple-600', Sim: PhoneSimulation },
  { title: '📦 Add Products',    desc: 'Go to Manage > Products to add items to your shop!',        color: 'from-blue-500 to-cyan-500',     Sim: ProductSimulation },
  { title: '👥 Hire Your Team',  desc: 'Go to Manage > Team and hire at least 2 staff!',            color: 'from-emerald-500 to-green-500', Sim: StaffSimulation },
  { title: '✂️ Grand Opening',   desc: 'With 2+ products and 2+ staff, cut the ribbon!',            color: 'from-red-500 to-pink-500',      Sim: OpenShopSimulation },
  { title: '🎨 Decorate',        desc: 'Go to Explore > Decorate to customize your shop!',          color: 'from-rose-500 to-pink-500',     Sim: DecorateSimulation },
  { title: '⚔️ Daily Quests',    desc: 'Complete quests in the Quest tab for awesome rewards!',      color: 'from-amber-500 to-yellow-500',  Sim: QuestSimulation },
  { title: '🚀 You\'re Ready!',  desc: 'Your shop is open! Keep growing and have fun!',             color: 'from-yellow-400 to-orange-500', Sim: ReadySimulation },
];

function TutorialContent({ step, onNext, onClose }: { step: number; onNext: () => void; onClose: () => void }) {
  const isLast = step >= TUTORIAL_STEPS.length - 1;
  const s = TUTORIAL_STEPS[Math.min(step, TUTORIAL_STEPS.length - 1)];
  const SimComponent = s.Sim;

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -30 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="relative w-full max-w-sm"
    >
      <div className={`absolute -inset-4 bg-gradient-to-br ${s.color} opacity-20 blur-3xl rounded-full`} />
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-2">
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === step ? 'w-6 bg-gradient-to-r ' + s.color : i < step ? 'w-3 bg-slate-300' : 'w-3 bg-slate-200'}`} />
          ))}
        </div>

        {/* Animation area */}
        <div className="mx-4 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
          <SimComponent />
        </div>

        {/* Title + desc */}
        <div className="px-5 pt-4 pb-1 text-center">
          <h3 className="font-black text-lg text-slate-800">{s.title}</h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">{s.desc}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <span className="text-slate-400 text-[11px] font-medium">{step + 1} / {TUTORIAL_STEPS.length}</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isLast ? onClose : onNext}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-1.5 bg-gradient-to-r ${s.color} shadow-lg`}
          >
            {isLast ? "Let's Go!" : 'Next'}
            {!isLast && <ChevronRight className="w-4 h-4" />}
            {isLast && <Sparkles className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

export const TabletMenu = ({ isOpen, onClose, onAvatarChange }: TabletMenuProps) => {
  const [activeTab, setActiveTab] = useState('manage');
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showDailyQuests, setShowDailyQuests] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(getTimeUntilMidnight());
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardSort, setLeaderboardSort] = useState<'xp' | 'profit'>('xp');
  const [currentUserRank, setCurrentUserRank] = useState(0);
  const [userRewards, setUserRewards] = useState<AIpreneurReward | null>(null);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const navigate = useNavigate();
  const { logout, geniusProfile } = useGeniusAuth();

  // Get today's 3 daily quests (deterministic per day)
  const dailyTasks = useMemo(() => getDailyTasks(new Date(), 3), []);

  // Load completed tasks from localStorage
  const completedTasks = useMemo(() => {
    const scope = geniusProfile?.id || 'global';
    const dateKey = `dailyTaskDate_${scope}`;
    const tasksKey = `completedDailyTasks_${scope}`;
    const storedDate = localStorage.getItem(dateKey);
    if (storedDate === new Date().toDateString()) {
      const stored = localStorage.getItem(tasksKey);
      if (stored) return new Set<string>(JSON.parse(stored));
    }
    return new Set<string>();
  }, [geniusProfile?.id, showDailyQuests]);

  // Countdown timer
  useEffect(() => {
    if (!showDailyQuests) return;
    const timer = setInterval(() => setTimeLeft(getTimeUntilMidnight()), 1000);
    return () => clearInterval(timer);
  }, [showDailyQuests]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch leaderboard data when opening
  useEffect(() => {
    if (!showLeaderboard) return;
    setLeaderboardLoading(true);
    leaderboardApi.getLeaderboard(leaderboardSort).then(res => {
      if (res.success && res.leaderboard.length > 0) {
        setLeaderboardData(res.leaderboard);
        setCurrentUserRank(res.current_user_rank);
      } else {
        setLeaderboardData([]);
        setCurrentUserRank(0);
      }
      setLeaderboardLoading(false);
    }).catch(() => {
      setLeaderboardData([]);
      setCurrentUserRank(0);
      setLeaderboardLoading(false);
    });
  }, [showLeaderboard, leaderboardSort, geniusProfile?.id]);

  // Fetch user rewards/badges when opening badges view
  useEffect(() => {
    if (!showBadges) return;
    setBadgesLoading(true);
    rewardsApi.get().then(res => {
      if (res.success && res.rewards) {
        setUserRewards(res.rewards);
      }
      setBadgesLoading(false);
    }).catch(() => setBadgesLoading(false));
  }, [showBadges]);

  // Badge catalog — all possible badges
  const BADGE_CATALOG = useMemo(() => [
    { id: 'first_steps',      name: 'First Steps',      emoji: '🎯', desc: 'Create your first product', category: 'quest', gradient: 'from-green-400 to-emerald-500' },
    { id: 'product_master',   name: 'Product Master',   emoji: '📦', desc: 'Create 5 products',        category: 'quest', gradient: 'from-blue-400 to-cyan-500' },
    { id: 'team_builder',     name: 'Team Builder',     emoji: '👥', desc: 'Hire your first staff',     category: 'quest', gradient: 'from-violet-400 to-purple-500' },
    { id: 'week_champion',    name: 'Week Champion',    emoji: '🔥', desc: '7-day login streak',        category: 'quest', gradient: 'from-orange-400 to-red-500' },
    { id: 'grand_opening',    name: 'Grand Opening',    emoji: '🚀', desc: 'Launch your shop',          category: 'quest', gradient: 'from-pink-400 to-rose-500' },
    { id: 'money_maker',      name: 'Money Maker',      emoji: '💰', desc: 'Earn 100 coins in sales',   category: 'quest', gradient: 'from-amber-400 to-yellow-500' },
    { id: 'level_master',     name: 'Level Master',     emoji: '👑', desc: 'Reach level 5',             category: 'quest', gradient: 'from-indigo-400 to-blue-500' },
    { id: 'token_collector',  name: 'Token Collector',  emoji: '💎', desc: 'Collect 1000 AI tokens',    category: 'quest', gradient: 'from-cyan-400 to-teal-500' },
    { id: 'community_hero',   name: 'Community Hero',   emoji: '🌟', desc: 'Complete 3 CSR donations',  category: 'csr',   gradient: 'from-emerald-400 to-green-500' },
    { id: 'green_champion',   name: 'Green Champion',   emoji: '🌱', desc: 'Support an eco cause',      category: 'csr',   gradient: 'from-lime-400 to-emerald-500' },
    { id: 'charity_star',     name: 'Charity Star',     emoji: '💝', desc: 'Donate over 50 coins total', category: 'csr',   gradient: 'from-pink-400 to-fuchsia-500' },
    { id: 'marketing_guru',   name: 'Marketing Guru',   emoji: '📣', desc: 'Launch 3 campaigns',        category: 'quest', gradient: 'from-rose-400 to-orange-500' },
    { id: 'tech_innovator',   name: 'Tech Innovator',   emoji: '⚡', desc: 'Unlock 3 tech upgrades',    category: 'quest', gradient: 'from-blue-400 to-violet-500' },
    { id: 'decorator_pro',    name: 'Decorator Pro',    emoji: '🎨', desc: 'Customize your shop',       category: 'quest', gradient: 'from-fuchsia-400 to-pink-500' },
    { id: 'influencer_king',  name: 'Influencer King',  emoji: '🤳', desc: 'Run influencer campaigns',  category: 'quest', gradient: 'from-purple-400 to-indigo-500' },
    { id: 'daily_warrior',    name: 'Daily Warrior',    emoji: '⚔️',  desc: 'Complete 10 daily quests',  category: 'quest', gradient: 'from-amber-400 to-orange-500' },
  ], []);

  const handleNavigate = (path: string, id?: string) => {
    if (id === 'logout' || path === '#logout') {
      logout();
      onClose();
      return;
    }
    if (id === 'avatar' || path === '#avatar') {
      setShowWardrobe(true);
      return;
    }
    if (id === 'achievements') {
      setShowDailyQuests(true);
      return;
    }
    if (id === 'leaderboard') {
      setShowLeaderboard(true);
      return;
    }
    if (id === 'medals') {
      setShowBadges(true);
      return;
    }
    if (id === 'help' || path === '#tutorial') {
      setShowTutorial(true);
      setTutorialStep(0);
      return;
    }
    if (path === '#coming-soon') {
      return; // Do nothing — disabled item
    }
    navigate(path);
    onClose();
  };

  const currentItems = TAB_CONTENT[activeTab] || [];
  const accent = TAB_ACCENT[activeTab];

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="tablet-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Tablet Device */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            className="relative"
          >
            {/* Phone Body */}
            <div className="bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 rounded-[2.5rem] p-2 shadow-2xl border-4 border-slate-300">
              {/* Screen Bezel */}
              <div className="bg-slate-200 rounded-[2rem] p-1">
                {/* Actual Screen — light mode */}
                <div className="w-[300px] sm:w-[380px] h-[min(520px,80vh)] sm:h-[600px] bg-gradient-to-b from-slate-50 to-white rounded-[1.8rem] overflow-hidden flex flex-col">

                  {/* ═══ Status Bar ═══ */}
                  <div className="px-6 py-1.5 flex items-center justify-between flex-shrink-0">
                    <span className="text-slate-500 text-[10px] font-semibold">{currentTime}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-1.5 bg-slate-400 rounded-sm" />
                      <div className="w-2.5 h-1.5 bg-slate-300 rounded-sm" />
                      <div className="w-4 h-2 border border-slate-400 rounded-sm flex items-center justify-center">
                        <div className="w-2.5 h-1 bg-green-500 rounded-sm" />
                      </div>
                    </div>
                  </div>

                  {/* ═══ Top Header: User + Coins + Close ═══ */}
                  <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md"
                      >
                        {geniusProfile?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                      </motion.div>
                      <div>
                        <p className="text-slate-800 font-bold text-xs leading-tight">{geniusProfile?.first_name || 'Player'}</p>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-slate-400 text-[9px]">Online</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.div
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"
                      >
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-700 font-bold text-[11px]">1,250</span>
                      </motion.div>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* ═══ Tab Title ═══ */}
                  <div className="px-4 pb-2 flex-shrink-0">
                    <motion.div
                      key={activeTab}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="flex items-center gap-2"
                    >
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-md ${accent.glow}`}>
                        {(() => {
                          const TabIcon = TABS.find(t => t.id === activeTab)?.icon || Briefcase;
                          return <TabIcon className="w-3.5 h-3.5 text-white" />;
                        })()}
                      </div>
                      <h2 className={`font-black text-sm tracking-wide uppercase ${accent.text}`}>
                        {TABS.find(t => t.id === activeTab)?.label}
                      </h2>
                    </motion.div>
                  </div>

                  {/* ═══ Content Area ═══ */}
                  <div className="px-3 flex-1 min-h-0 pb-1">
                    <AnimatePresence mode="wait">
                      {/* ── Leaderboard Sub-view ── */}
                      {showLeaderboard ? (
                        <motion.div
                          key="leaderboard"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
                          className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 h-full overflow-y-auto"
                        >
                          {/* Back + title */}
                          <div className="flex items-center gap-2 mb-2">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setShowLeaderboard(false)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                            <div className="flex-1">
                              <h3 className="text-slate-800 font-black text-xs uppercase tracking-wide flex items-center gap-1">
                                <Crown className="w-3.5 h-3.5 text-orange-500" /> Leaderboard
                              </h3>
                            </div>
                          </div>

                          {/* Sort tabs */}
                          <div className="flex gap-1 mb-2">
                            {([['xp', 'Level', Zap], ['profit', 'Coins', Coins]] as const).map(([key, label, SortIcon]) => (
                              <motion.button
                                key={key}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setLeaderboardSort(key)}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                                  leaderboardSort === key
                                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-500'
                                }`}
                              >
                                <SortIcon className="w-3 h-3" /> {label}
                              </motion.button>
                            ))}
                          </div>

                          {/* Your rank highlight */}
                          {currentUserRank > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="mb-2 p-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                                  <span className="text-white font-black text-[11px]">#{currentUserRank}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-amber-800 font-bold text-[10px]">Your Rank</p>
                                  <p className="text-amber-600 text-[8px]">Keep going to climb higher!</p>
                                </div>
                                <TrendingUp className="w-4 h-4 text-amber-500" />
                              </div>
                            </motion.div>
                          )}

                          {/* Loading */}
                          {leaderboardLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                            </div>
                          ) : (
                            /* Leaderboard list */
                            <div className="space-y-1.5">
                              {leaderboardData.map((entry, index) => {
                                const rank = index + 1;
                                const isCurrentUser = entry.id === geniusProfile?.id;
                                const medalColors = ['from-yellow-300 to-amber-400', 'from-slate-300 to-slate-400', 'from-amber-600 to-orange-700'];
                                const medalEmoji = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;
                                return (
                                  <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                      isCurrentUser
                                        ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-300'
                                        : 'bg-white border-slate-100'
                                    }`}
                                  >
                                    {/* Rank */}
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                      rank <= 3
                                        ? `bg-gradient-to-br ${medalColors[rank - 1]} shadow-sm`
                                        : 'bg-slate-100'
                                    }`}>
                                      {medalEmoji ? (
                                        <span className="text-sm">{medalEmoji}</span>
                                      ) : (
                                        <span className="text-slate-500 font-bold text-[9px]">{rank}</span>
                                      )}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 ${
                                      isCurrentUser
                                        ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                        : 'bg-gradient-to-br from-slate-400 to-slate-500'
                                    }`}>
                                      {entry.genius_name.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Name + shop */}
                                    <div className="flex-1 min-w-0">
                                      <p className={`font-bold text-[10px] leading-tight truncate ${isCurrentUser ? 'text-violet-700' : 'text-slate-700'}`}>
                                        {entry.genius_name} {isCurrentUser && <span className="text-violet-400">(You)</span>}
                                      </p>
                                      {entry.shop_name && (
                                        <p className="text-slate-400 text-[8px] truncate">{entry.shop_name}</p>
                                      )}
                                    </div>

                                    {/* Score */}
                                    <div className="text-right flex-shrink-0">
                                      <p className="font-black text-[11px] text-slate-800">
                                        {leaderboardSort === 'xp' && `Lv.${entry.level}`}
                                        {leaderboardSort === 'profit' && entry.total_profit.toLocaleString()}
                                      </p>
                                      <p className="text-[7px] text-slate-400 font-medium">
                                        {leaderboardSort === 'xp' && `${entry.xp} XP`}
                                        {leaderboardSort === 'profit' && 'coins'}
                                      </p>
                                    </div>
                                  </motion.div>
                                );
                              })}

                              {leaderboardData.length === 0 && (
                                <div className="text-center py-6">
                                  <Crown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                  <p className="text-slate-400 text-[10px] font-medium">No data yet</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Footer tip */}
                          <div className="mt-2 text-center">
                            <p className="text-[8px] text-slate-300">Complete quests & earn XP to climb the ranks!</p>
                          </div>
                        </motion.div>

                      ) : showBadges ? (
                      /* ── Badges Sub-view ── */
                        <motion.div
                          key="badges"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
                          className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 h-full overflow-y-auto"
                        >
                          {/* Back + title */}
                          <div className="flex items-center gap-2 mb-2">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setShowBadges(false)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                            <div className="flex-1">
                              <h3 className="text-slate-800 font-black text-xs uppercase tracking-wide flex items-center gap-1">
                                <Medal className="w-3.5 h-3.5 text-emerald-500" /> My Badges
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-full">
                              <Award className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-700 text-[9px] font-bold">
                                {userRewards?.badges?.length || 0}/{BADGE_CATALOG.length}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${BADGE_CATALOG.length > 0 ? ((userRewards?.badges?.length || 0) / BADGE_CATALOG.length) * 100 : 0}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>

                          {/* Loading */}
                          {badgesLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                          ) : (
                            <>
                              {/* Category headers */}
                              {(['quest', 'csr'] as const).map(category => {
                                const categoryBadges = BADGE_CATALOG.filter(b => b.category === category);
                                const earned = userRewards?.badges || [];
                                return (
                                  <div key={category} className="mb-3">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                      {category === 'quest' ? (
                                        <Swords className="w-3 h-3 text-amber-500" />
                                      ) : (
                                        <Heart className="w-3 h-3 text-pink-500" />
                                      )}
                                      <h4 className="text-slate-600 font-bold text-[9px] uppercase tracking-wide">
                                        {category === 'quest' ? 'Quest Badges' : 'CSR Badges'}
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {categoryBadges.map((badge, index) => {
                                        const isUnlocked = earned.includes(badge.id);
                                        return (
                                          <motion.div
                                            key={badge.id}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.04 }}
                                            className={`relative p-2 rounded-xl border text-center transition-all ${
                                              isUnlocked
                                                ? 'bg-white border-emerald-200 shadow-sm'
                                                : 'bg-slate-100/50 border-slate-200/50 opacity-60'
                                            }`}
                                          >
                                            {/* Badge icon */}
                                            <div className={`w-10 h-10 rounded-xl mx-auto mb-1 flex items-center justify-center ${
                                              isUnlocked
                                                ? `bg-gradient-to-br ${badge.gradient} shadow-sm`
                                                : 'bg-slate-200'
                                            }`}>
                                              {isUnlocked ? (
                                                <span className="text-lg">{badge.emoji}</span>
                                              ) : (
                                                <Lock className="w-4 h-4 text-slate-400" />
                                              )}
                                            </div>
                                            <p className={`font-bold text-[9px] leading-tight ${isUnlocked ? 'text-slate-700' : 'text-slate-400'}`}>
                                              {badge.name}
                                            </p>
                                            <p className="text-[7px] text-slate-400 mt-0.5 leading-tight">{badge.desc}</p>
                                            {/* Unlocked checkmark */}
                                            {isUnlocked && (
                                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                                                <CheckCircle className="w-3 h-3 text-white" />
                                              </div>
                                            )}
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}

                          {/* Footer tip */}
                          <div className="mt-1 text-center">
                            <p className="text-[8px] text-slate-300">Complete quests & CSR activities to unlock badges!</p>
                          </div>
                        </motion.div>

                      ) : showDailyQuests ? (
                        <motion.div
                          key="daily-quests"
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
                          className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 h-full overflow-y-auto"
                        >
                          {/* Back button + title */}
                          <div className="flex items-center gap-2 mb-3">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => setShowDailyQuests(false)}
                              className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                            <div className="flex-1">
                              <h3 className="text-slate-800 font-black text-xs uppercase tracking-wide">Daily Quests</h3>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span className="text-amber-700 text-[9px] font-bold">
                                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-500 text-[9px] font-medium">{completedTasks.size}/{dailyTasks.length} completed</span>
                              {completedTasks.size === dailyTasks.length && dailyTasks.length > 0 && (
                                <span className="text-green-500 text-[9px] font-bold flex items-center gap-0.5">
                                  <CheckCircle className="w-3 h-3" /> All Done!
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${dailyTasks.length > 0 ? (completedTasks.size / dailyTasks.length) * 100 : 0}%` }}
                                transition={{ duration: 0.5 }}
                              />
                            </div>
                          </div>

                          {/* Quest cards */}
                          <div className="space-y-2">
                            {dailyTasks.map((task, index) => {
                              const isCompleted = completedTasks.has(task.id);
                              const TaskIcon = task.icon;
                              return (
                                <motion.button
                                  key={task.id}
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
                                  whileHover={{ scale: isCompleted ? 1 : 1.02 }}
                                  whileTap={{ scale: isCompleted ? 1 : 0.97 }}
                                  onClick={() => {
                                    if (!isCompleted && task.moduleRoute) {
                                      navigate(task.moduleRoute);
                                      onClose();
                                    }
                                  }}
                                  className={`w-full relative p-3 rounded-xl border transition-all text-left ${
                                    isCompleted
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    {/* Task icon */}
                                    <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                      isCompleted
                                        ? 'bg-green-100'
                                        : `bg-gradient-to-br ${task.gradient} shadow-sm`
                                    }`}>
                                      {isCompleted ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                      ) : (
                                        <>
                                          <TaskIcon className="w-4 h-4 text-white" />
                                          <span className="absolute -top-1 -right-1 text-sm">{task.emoji}</span>
                                        </>
                                      )}
                                    </div>

                                    {/* Task info */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className={`font-bold text-[11px] leading-tight ${
                                        isCompleted ? 'text-green-600 line-through' : 'text-slate-700'
                                      }`}>
                                        {task.title}
                                      </h4>
                                      <p className="text-slate-400 text-[9px] mt-0.5 truncate">{task.description}</p>
                                    </div>

                                    {/* Rewards */}
                                    <div className="text-right flex-shrink-0 space-y-0.5">
                                      <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold justify-end">
                                        <Coins className="w-3 h-3" /> +{task.coinsReward}
                                      </div>
                                      <div className="flex items-center gap-1 justify-end">
                                        <span className="flex items-center gap-0.5 text-violet-500 text-[9px] font-medium">
                                          <Zap className="w-2.5 h-2.5" /> +{task.xpReward}
                                        </span>
                                        {task.voucherReward && (
                                          <span className="flex items-center gap-0.5 text-pink-500 text-[9px] font-medium">
                                            <Ticket className="w-2.5 h-2.5" /> +{task.voucherReward}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tap hint for incomplete */}
                                  {!isCompleted && task.moduleRoute && (
                                    <div className="mt-1.5 text-center">
                                      <span className="text-[8px] text-slate-300 font-medium uppercase tracking-wider">Tap to start</span>
                                    </div>
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>

                          {/* Bonus reward info */}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-200/50"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-3.5 h-3.5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-slate-600 text-[9px] font-bold">Complete all for bonus!</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-amber-500 text-[9px] font-bold flex items-center gap-0.5"><Coins className="w-2.5 h-2.5" /> +100</span>
                                  <span className="text-violet-500 text-[9px] font-bold flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> +50 XP</span>
                                  <span className="text-pink-500 text-[9px] font-bold flex items-center gap-0.5"><Ticket className="w-2.5 h-2.5" /> +2</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>

                          {/* Daily tip */}
                          <div className="mt-2 text-center">
                            <p className="text-[8px] text-slate-300">Quests rotate every day at midnight</p>
                          </div>
                        </motion.div>
                      ) : (
                      /* ── Normal Grid View ── */
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.25, type: 'spring', stiffness: 300, damping: 30 }}
                        className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80 h-full overflow-y-auto"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          {currentItems.map((item, index) => {
                            const Icon = item.icon;
                            const isDisabled = item.path === '#coming-soon';
                            return (
                              <motion.button
                                key={item.id}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 22 }}
                                whileHover={isDisabled ? {} : { scale: 1.06, y: -4 }}
                                whileTap={isDisabled ? {} : { scale: 0.92, rotate: -2 }}
                                onClick={() => !isDisabled && handleNavigate(item.path, item.id)}
                                className={`relative bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col items-center gap-1.5 shadow-sm transition-all group ${
                                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-slate-200'
                                }`}
                              >
                                {/* Icon circle */}
                                <motion.div
                                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${isDisabled ? 'from-slate-300 to-slate-400' : item.gradient} flex items-center justify-center shadow-md ${isDisabled ? '' : item.glow}`}
                                  whileHover={isDisabled ? {} : { rotate: [0, -8, 8, 0] }}
                                  transition={{ duration: 0.4 }}
                                >
                                  {isDisabled ? <Lock className="w-4 h-4 text-white/70" /> : <Icon className="w-4 h-4 text-white drop-shadow-sm" />}
                                </motion.div>
                                <div className="text-center">
                                  <span className={`font-bold text-[12px] block leading-tight ${isDisabled ? 'text-slate-400' : 'text-slate-700'}`}>{item.name}</span>
                                  <span className={`font-bold text-[9px] ${isDisabled ? 'text-orange-400 font-bold' : 'text-blue-500'}`}>{item.desc}</span>
                                </div>
                                {/* Hover tint */}
                                {!isDisabled && (
                                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity pointer-events-none`} />
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ═══ Bottom Navigation — always visible, never overlapped ═══ */}
                  <div className="px-3 pt-2 pb-1 flex-shrink-0">
                    <div className="bg-white border border-slate-200 rounded-2xl px-1 py-1.5 flex items-end justify-around relative shadow-sm">
                      {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const isRewards = tab.id === 'rewards';
                        const TabIcon = tab.icon;
                        const tabAccent = TAB_ACCENT[tab.id];

                        if (isRewards) {
                          return (
                            <motion.button
                              key={tab.id}
                              onClick={() => { setActiveTab(tab.id); setShowDailyQuests(false); setShowLeaderboard(false); setShowBadges(false); }}
                              whileTap={{ scale: 0.85, rotate: -5 }}
                              className="relative flex flex-col items-center -mt-5"
                            >
                              {/* Glow ring */}
                              <motion.div
                                className="absolute inset-0 -m-1 rounded-full"
                                animate={isActive
                                  ? { boxShadow: ['0 0 10px 2px rgba(250,204,21,0.2)', '0 0 18px 5px rgba(250,204,21,0.35)', '0 0 10px 2px rgba(250,204,21,0.2)'] }
                                  : { boxShadow: '0 0 6px 1px rgba(250,204,21,0.1)' }
                                }
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <motion.div
                                animate={isActive ? { y: [0, -3, 0] } : { y: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tabAccent.gradient} flex items-center justify-center shadow-lg ${tabAccent.glow} ring-2 ${isActive ? tabAccent.ring : 'ring-slate-200'} border-2 border-white`}
                              >
                                <TabIcon className="w-7 h-7 text-white drop-shadow-md" />
                              </motion.div>
                              <span className={`text-[9px] font-black mt-1 uppercase tracking-wider ${isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                                {tab.label}
                              </span>
                            </motion.button>
                          );
                        }

                        return (
                          <motion.button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setShowDailyQuests(false); setShowLeaderboard(false); setShowBadges(false); }}
                            whileTap={{ scale: 0.8, rotate: -8 }}
                            className="relative flex flex-col items-center py-1 px-2"
                          >
                            <motion.div
                              animate={isActive ? { y: [0, -2, 0] } : { y: 0 }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                isActive
                                  ? `bg-gradient-to-br ${tabAccent.gradient} shadow-md ${tabAccent.glow}`
                                  : 'bg-slate-100'
                              }`}
                            >
                              <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            </motion.div>
                            <span className={`text-[8px] font-bold mt-0.5 uppercase tracking-wider ${isActive ? tabAccent.text : 'text-slate-400'}`}>
                              {tab.label}
                            </span>
                            {isActive && (
                              <motion.div
                                layoutId="nav-dot"
                                className={`w-1 h-1 rounded-full bg-gradient-to-r ${tabAccent.gradient} mt-0.5`}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Home Indicator */}
                  <div className="flex justify-center py-1.5 flex-shrink-0">
                    <div className="w-28 h-1 bg-slate-300 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Reflection/Shine */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Avatar Wardrobe Overlay */}
    <AvatarWardrobe
      isOpen={showWardrobe}
      onClose={() => setShowWardrobe(false)}
      onAvatarChange={(path) => {
        onAvatarChange?.(path);
        setShowWardrobe(false);
        onClose();
      }}
      userId={geniusProfile?.id}
    />

    {/* ═══ AIpreneur Tutorial Overlay ═══ */}
    <AnimatePresence>
      {showTutorial && (
        <motion.div
          key="tutorial-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <TutorialContent step={tutorialStep} onNext={() => setTutorialStep(s => s + 1)} onClose={() => setShowTutorial(false)} />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default TabletMenu;
