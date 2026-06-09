/**
 * Teacher Dashboard — "Mission Control" for AI Genius AIpreneur.
 *
 * Designed for the kids-aged-9–12 product line: the teacher view stays
 * professional enough for schools, but borrows the same game-feel vocab
 * (Squad, Quests, Missions, Trophies, Tokens) the students see — so a
 * teacher reading a parent-evening printout knows the language their
 * class is using.
 *
 * Layout: theme-aware page background (StarfieldBackground + dotted
 * grid + page shell) → Mission Control banner → 6 tabbed sections.
 *
 * The data shape and every state/handler from the prior implementation
 * is preserved exactly so existing behaviours (chapter assignment alert,
 * filters, AI question textarea, tab switching) stay functional.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  BookOpen,
  Award,
  TrendingUp,
  Plus,
  Mail,
  GraduationCap,
  Search,
  Download,
  Send,
  Rocket,
  Target,
  Trophy,
  Sparkles,
  Flame,
  Star,
  Crown,
  Coins,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { TopNav } from '../components/TopNav';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { StatTile } from '../components/ui/StatTile';
import { QuestCard } from '../components/ui/QuestCard';
import { XPBar } from '../components/ui/XPBar';
import {
  GLASS,
  PAGE,
  BTN_3D_PRIMARY,
  BTN_3D_SECONDARY,
  GAME_TAB,
  GAME_TAB_ACTIVE,
  GAME_TAB_INACTIVE,
  FIELD,
  RARITY_CHIP,
  GAME_ACCENTS,
} from '../lib/uiTokens';

type Tab = 'Dashboard' | 'My Students' | 'AI Chapters' | 'Rewards & Earnings' | 'AI Training Programme' | 'Resources';

const TABS: Array<{ id: Tab; icon: typeof Target; emoji: string }> = [
  { id: 'Dashboard', icon: Target, emoji: '🎯' },
  { id: 'My Students', icon: Users, emoji: '👥' },
  { id: 'AI Chapters', icon: BookOpen, emoji: '📚' },
  { id: 'Rewards & Earnings', icon: Trophy, emoji: '🏆' },
  { id: 'AI Training Programme', icon: GraduationCap, emoji: '🎓' },
  { id: 'Resources', icon: Sparkles, emoji: '✨' },
];

export const TeacherDashboard = () => {
  const { currentUser } = useAuth();
  const store = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('Dashboard');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('All Chapters');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');

  if (!currentUser) return null;

  const students = store.getTeacherStudents(currentUser.id);
  const totalStudents = students.length;

  const allChapters = students.flatMap((s) => store.getStudentChapters(s.id));
  const chaptersRunning = allChapters.filter((c) => c.status === 'in_progress').length;

  const totalBadges = students.reduce((sum, student) => {
    const rewards = store.getRewards(student.id);
    return sum + rewards.badges.length;
  }, 0);

  // Mock activity feed kept identical to prior copy — when the backend
  // ships a real feed endpoint, swap this in place without touching the
  // surrounding UI.
  const activityFeed = [
    { id: 1, student: 'Fitri', action: 'completed Page 4 – The Germ Detective', time: '2 mins ago', icon: '🎯', accent: 'amber' as const },
    { id: 2, student: 'Alex Wonder', action: 'earned "Dream Achiever" badge', time: '15 mins ago', icon: '🏆', accent: 'orange' as const },
    { id: 3, student: 'Emma Chen', action: 'uploaded new artwork for Ambition chapter', time: '1 hour ago', icon: '🎨', accent: 'pink' as const },
    { id: 4, student: 'Liam Smith', action: 'completed quiz with 100% score', time: '2 hours ago', icon: '✅', accent: 'lime' as const },
    { id: 5, student: 'Sophia Garcia', action: 'started Innovation chapter', time: '3 hours ago', icon: '🚀', accent: 'cyan' as const },
  ];

  const chapterAssignments: Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    accent: keyof typeof GAME_ACCENTS;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    tags: string[];
    students: number;
    progress: number;
  }> = [
    { id: '1', title: 'Ambition', subtitle: 'Dream Chapter', description: 'Who do you want to be?', icon: '🎯', accent: 'cyan', rarity: 'rare', tags: ['Drawing', 'Storytelling', 'STEM Basics'], students: 8, progress: 65 },
    { id: '2', title: 'Innovation', subtitle: 'Creator Chapter', description: 'Invent something that helps people.', icon: '⚡', accent: 'violet', rarity: 'epic', tags: ['Design Thinking', 'Robotics'], students: 6, progress: 45 },
    { id: '3', title: 'Space & Beyond', subtitle: 'Galaxy Chapter', description: 'Journey to the stars.', icon: '⭐', accent: 'blue', rarity: 'legendary', tags: ['Astronomy', 'Rockets'], students: 5, progress: 30 },
    { id: '4', title: 'Friendship & Empathy', subtitle: 'Heart Chapter', description: 'Helping and caring for others.', icon: '❤️', accent: 'pink', rarity: 'rare', tags: ['Emotional Intelligence'], students: 7, progress: 55 },
  ];

  const handleAssignChapter = (_chapterId: string) => {
    alert('Chapter assignment feature coming soon!');
  };

  return (
    <div className={PAGE}>
      <StarfieldBackground />
      <DottedBackground />

      <TopNav userName={currentUser.name} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 pt-20 md:pt-24 pb-12">
        {/* ── Mission Control banner ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS} rounded-3xl p-5 sm:p-7 mb-6 sm:mb-8 ring-2 ring-inset ring-violet-300/60 dark:ring-violet-500/40 relative overflow-hidden`}
        >
          {/* Decorative ribbon */}
          <div
            aria-hidden
            className="absolute -top-12 -right-10 w-44 h-44 rounded-full bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 opacity-20 blur-2xl"
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 shrink-0">
              <Rocket className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 text-[10px] font-black uppercase tracking-widest mb-1.5">
                <Zap className="w-3 h-3" />
                Mission Control
              </div>
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome back, Coach {currentUser.name}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Your squad has <span className="font-bold text-violet-600 dark:text-violet-300">{chaptersRunning}</span> active quest{chaptersRunning === 1 ? '' : 's'} and earned <span className="font-bold text-amber-600 dark:text-amber-300">{totalBadges}</span> trophies so far. Let's level them up.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Tab bar ────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-6 sm:mb-8 scrollbar-thin">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveTab(tab.id)}
                className={`${GAME_TAB} ${active ? GAME_TAB_ACTIVE : GAME_TAB_INACTIVE}`}
              >
                <span aria-hidden>{tab.emoji}</span>
                <span>{tab.id}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════════════════════════════════
              DASHBOARD TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'Dashboard' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                <StatTile
                  icon={Users}
                  label="Active Squad"
                  value={totalStudents}
                  emoji="🧑‍🚀"
                  accent="cyan"
                  delay={0}
                />
                <StatTile
                  icon={BookOpen}
                  label="Quests Running"
                  value={chaptersRunning}
                  emoji="📖"
                  accent="violet"
                  delay={0.05}
                />
                <StatTile
                  icon={Award}
                  label="Trophies Earned"
                  value={totalBadges}
                  emoji="🏆"
                  accent="amber"
                  delay={0.1}
                />
                <StatTile
                  icon={TrendingUp}
                  label="Earning Tier"
                  value="15%"
                  hint="Next tier at 50 students"
                  emoji="⚡"
                  accent="lime"
                  progress={(totalStudents / 50) * 100}
                  delay={0.15}
                />
              </div>

              {/* Squad Activity Feed (Quest Log) */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${GLASS} rounded-3xl p-5 sm:p-6 mb-6 ring-2 ring-inset ring-pink-200/60 dark:ring-pink-500/30`}
              >
                <div className="flex items-center justify-between mb-4 sm:mb-5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75 animate-ping" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
                    </span>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Live Quest Log
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Last 24h
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {activityFeed.map((activity, idx) => {
                    const c = GAME_ACCENTS[activity.accent];
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + idx * 0.06 }}
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 ring-1 ring-inset ${c.ring}`}
                      >
                        <div
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl sm:text-2xl ${c.fill}`}
                        >
                          {activity.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-snug">
                            <span className={`font-bold ${c.text}`}>{activity.student}</span>{' '}
                            <span className="text-slate-600 dark:text-slate-300">{activity.action}</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {activity.time}
                          </p>
                        </div>
                        <Sparkles className={`w-4 h-4 ${c.text} shrink-0`} />
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Quick action buttons — game-pill style */}
              <div className="flex flex-wrap gap-3">
                <button className={`${BTN_3D_PRIMARY} px-5 py-3 text-sm sm:text-base`}>
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create Squad
                </button>
                <button className={`${BTN_3D_SECONDARY} px-5 py-3 text-sm sm:text-base`}>
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  Invite Student
                </button>
                <button className={`${BTN_3D_SECONDARY} px-5 py-3 text-sm sm:text-base`}>
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                  Join Training
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              MY STUDENTS TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'My Students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className={`${GLASS} rounded-3xl p-5 sm:p-6`}
            >
              <div className="flex flex-col gap-4 mb-5 sm:mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      My Squad ({totalStudents})
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Track every adventurer's progress through their quests.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name or ID"
                      className={`${FIELD} pl-10 pr-4 py-3 text-sm sm:text-base`}
                    />
                  </div>
                  <div className="flex gap-2">
                    {['All', 'Active', 'Completed'].map((filter, idx) => (
                      <button
                        key={filter}
                        className={`${GAME_TAB} ${idx === 0 ? GAME_TAB_ACTIVE : GAME_TAB_INACTIVE}`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {students.length > 0 ? (
                <div className="space-y-3">
                  {students.map((student, idx) => {
                    const rewards = store.getRewards(student.id);
                    const chapters = store.getStudentChapters(student.id);
                    const currentChapter = chapters.find((c) => c.status === 'in_progress');
                    const completedPages = currentChapter ? currentChapter.currentPageIndex : 0;
                    const totalPages = currentChapter ? currentChapter.pages?.length || 10 : 10;
                    const progress = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;
                    const accentList: Array<keyof typeof GAME_ACCENTS> = [
                      'cyan',
                      'violet',
                      'pink',
                      'amber',
                      'lime',
                      'orange',
                    ];
                    const accent = accentList[idx % accentList.length];
                    const c = GAME_ACCENTS[accent];

                    return (
                      <motion.div
                        key={student.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`rounded-2xl p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 ring-1 ring-inset ${c.ring} flex flex-col md:flex-row md:items-center gap-4`}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-xl bg-gradient-to-br ${c.bar} shrink-0`}
                          >
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">
                              {student.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                              {currentChapter?.title || 'No active quest'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                {rewards.badges.length}
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <Crown className="w-3 h-3 text-violet-500" />
                                Lv {Math.max(1, Math.floor(completedPages / 2))}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-5 md:w-72">
                          <div className="flex-1 min-w-0">
                            <XPBar
                              percent={progress}
                              accent={accent}
                              height="md"
                              label={`${completedPages}/${totalPages} pages`}
                              caption={`${progress}%`}
                            />
                          </div>
                          <button className={`${BTN_3D_SECONDARY} px-4 py-2 text-xs sm:text-sm shrink-0`}>
                            View
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-3xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-10 h-10 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-lg mb-4 font-bold">
                    Your squad is empty
                  </p>
                  <button className={`${BTN_3D_PRIMARY} px-6 py-3`}>
                    <Mail className="w-4 h-4" />
                    Invite Your First Student
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              AI CHAPTERS TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'AI Chapters' && (
            <motion.div
              key="chapters"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Quest Library
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Assign chapters and watch students level up.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedChapterFilter}
                    onChange={(e) => setSelectedChapterFilter(e.target.value)}
                    className={`${FIELD} px-3 py-2.5 text-sm`}
                  >
                    <option>All Chapters</option>
                    <option>Dream Chapters</option>
                    <option>Creator Chapters</option>
                    <option>Galaxy Chapters</option>
                  </select>
                  <button className={`${BTN_3D_PRIMARY} px-4 py-2.5 text-sm`}>
                    <Plus className="w-4 h-4" />
                    New
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {chapterAssignments.map((chapter, idx) => (
                  <motion.div
                    key={chapter.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                  >
                    <div
                      className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ${GAME_ACCENTS[chapter.accent].ring}`}
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${GAME_ACCENTS[chapter.accent].fill} flex items-center justify-center text-3xl sm:text-4xl shrink-0`}
                        >
                          {chapter.icon}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${RARITY_CHIP[chapter.rarity]}`}
                          >
                            {chapter.rarity}
                          </span>
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            👥 {chapter.students} students
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {chapter.title}
                      </h3>
                      <p className={`text-xs sm:text-sm font-bold ${GAME_ACCENTS[chapter.accent].text}`}>
                        {chapter.subtitle}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                        {chapter.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {chapter.tags.map((t) => (
                          <span
                            key={t}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${GAME_ACCENTS[chapter.accent].fill} ${GAME_ACCENTS[chapter.accent].text}`}
                          >
                            {t}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4">
                        <XPBar
                          percent={chapter.progress}
                          accent={chapter.accent}
                          height="md"
                          label="Squad progress"
                          caption={`${chapter.progress}%`}
                        />
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button className={`${BTN_3D_SECONDARY} flex-1 px-4 py-2.5 text-sm`}>
                          View Progress
                        </button>
                        <button
                          onClick={() => handleAssignChapter(chapter.id)}
                          className={`${BTN_3D_PRIMARY} flex-1 px-4 py-2.5 text-sm`}
                        >
                          Assign Quest
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              REWARDS & EARNINGS TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'Rewards & Earnings' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {/* Tier card */}
              <div className={`${GLASS} rounded-3xl p-5 sm:p-7 mb-6 ring-2 ring-inset ring-amber-200/70 dark:ring-amber-500/40 relative overflow-hidden`}>
                <div
                  aria-hidden
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-300/40 blur-3xl"
                />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Current Tier
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Earning <span className="font-bold text-amber-600 dark:text-amber-300">15%</span> of your students' subscriptions
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 mb-5">
                    {[
                      { range: '0-10', pct: '12%', active: false, label: 'Rookie Coach' },
                      { range: '11-50', pct: '15%', active: true, label: 'Squad Leader' },
                      { range: '51-100', pct: '18%', active: false, label: 'Captain' },
                      { range: '100+', pct: '21%', active: false, label: 'Legend' },
                    ].map((tier) => (
                      <div
                        key={tier.range}
                        className={`rounded-2xl p-3 sm:p-4 text-center border-2 ${
                          tier.active
                            ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-400 dark:border-amber-500/60'
                            : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/50'
                        }`}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                          {tier.range} students
                        </p>
                        <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                          {tier.pct}
                        </p>
                        <p className={`text-[11px] sm:text-xs font-bold mt-1 ${tier.active ? 'text-amber-700 dark:text-amber-200' : 'text-slate-400'}`}>
                          {tier.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <XPBar
                    percent={(totalStudents / 50) * 100}
                    accent="amber"
                    height="lg"
                    label="Progress to next tier"
                    caption={`${totalStudents}/50`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ring-lime-200/70 dark:ring-lime-500/40`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-lime-100 dark:bg-lime-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-lime-600 dark:text-lime-300" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Treasure Chest
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-slate-200 dark:border-white/10">
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                        This Month
                      </span>
                      <span className="text-2xl font-black text-lime-600 dark:text-lime-300">
                        $342
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">
                        Total Earnings
                      </span>
                      <span className="text-2xl font-black text-lime-600 dark:text-lime-300">
                        $2,450
                      </span>
                    </div>
                  </div>
                  <button className={`${BTN_3D_SECONDARY} w-full mt-4 px-5 py-3 text-sm`}>
                    View Details
                  </button>
                </div>

                <div className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ring-orange-200/70 dark:ring-orange-500/40`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-orange-600 dark:text-orange-300" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Reward Store
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Wonderpark Tickets', icon: Award, accent: 'cyan' as const, emoji: '🎢' },
                      { label: 'AI Workshop Access', icon: GraduationCap, accent: 'violet' as const, emoji: '🎓' },
                      { label: 'Merchandise', icon: Star, accent: 'orange' as const, emoji: '🎁' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/5 ring-1 ring-inset ${GAME_ACCENTS[item.accent].ring}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${GAME_ACCENTS[item.accent].fill}`}
                          >
                            {item.emoji}
                          </div>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">→</span>
                      </div>
                    ))}
                  </div>
                  <button className={`${BTN_3D_PRIMARY} w-full mt-4 px-5 py-3 text-sm`}>
                    Redeem Rewards
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              AI TRAINING PROGRAMME TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'AI Training Programme' && (
            <motion.div
              key="training"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className={`${GLASS} rounded-3xl p-6 sm:p-8 mb-6 text-center ring-2 ring-inset ring-violet-300/60 dark:ring-violet-500/40 relative overflow-hidden`}>
                <div
                  aria-hidden
                  className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-violet-300/40 blur-3xl"
                />
                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 text-[10px] font-black uppercase tracking-widest mb-3">
                    <Rocket className="w-3 h-3" />
                    Coach Academy
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Become a Certified AI Genius Trainer
                  </h2>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
                    Learn how to guide students through creativity, storytelling, and STEM — and earn rewards as you grow.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-6">
                    {[
                      { title: 'Learn', desc: 'Access teacher tutorials and resources', emoji: '📚', accent: 'cyan' as const },
                      { title: 'Apply', desc: 'Conduct workshops or classroom lessons', emoji: '👥', accent: 'lime' as const },
                      { title: 'Earn', desc: "Get paid through your students' subscriptions", emoji: '💰', accent: 'amber' as const },
                    ].map((step) => (
                      <div
                        key={step.title}
                        className={`rounded-2xl p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 ring-1 ring-inset ${GAME_ACCENTS[step.accent].ring}`}
                      >
                        <div
                          className={`w-14 h-14 rounded-2xl ${GAME_ACCENTS[step.accent].fill} flex items-center justify-center text-3xl mx-auto`}
                        >
                          {step.emoji}
                        </div>
                        <h3 className="mt-3 text-base sm:text-lg font-black text-slate-900 dark:text-white">
                          {step.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                          {step.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button className={`${BTN_3D_PRIMARY} px-7 py-3.5 text-base`}>
                    <Rocket className="w-4 h-4" />
                    Join Now
                  </button>
                </div>
              </div>

              <div className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ring-cyan-200/70 dark:ring-cyan-500/40`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    Your Training Quests
                  </h3>
                </div>
                <div className="space-y-4">
                  {[
                    { title: 'Introduction to AI Genius Platform', progress: 100, accent: 'lime' as const },
                    { title: 'Guiding Students Through Chapters', progress: 75, accent: 'cyan' as const },
                    { title: 'Managing Student Progress', progress: 45, accent: 'blue' as const },
                    { title: 'Advanced Teaching Techniques', progress: 0, accent: 'violet' as const },
                  ].map((item) => (
                    <XPBar
                      key={item.title}
                      percent={item.progress}
                      accent={item.accent}
                      height="md"
                      label={item.title}
                      caption={item.progress === 100 ? '✓ Complete' : `${item.progress}%`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════════════════════
              RESOURCES TAB
              ═══════════════════════════════════════════════════════ */}
          {activeTab === 'Resources' && (
            <motion.div
              key="resources"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col sm:flex-row gap-3 mb-5 sm:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources..."
                    className={`${FIELD} pl-10 pr-4 py-3 text-sm sm:text-base`}
                  />
                </div>
                <button className={`${BTN_3D_PRIMARY} px-5 py-3 text-sm sm:text-base`}>
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  Download All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { title: 'Lesson Guides', desc: '12 PDFs available', emoji: '📘', accent: 'cyan' as const },
                  { title: 'Tutorial Videos', desc: '8 Videos available', emoji: '🎥', accent: 'pink' as const },
                  { title: 'Quiz Templates', desc: '15 Templates available', emoji: '📝', accent: 'violet' as const },
                  { title: 'Art Activity Samples', desc: '20 images available', emoji: '🎨', accent: 'orange' as const },
                ].map((resource) => (
                  <QuestCard
                    key={resource.title}
                    icon={resource.emoji}
                    title={resource.title}
                    body={resource.desc}
                    accent={resource.accent}
                    onClick={() => undefined}
                    cta="Open"
                  />
                ))}
              </div>

              {/* AI assistant */}
              <div className={`${GLASS} rounded-3xl p-5 sm:p-6 ring-2 ring-inset ring-violet-300/60 dark:ring-violet-500/40`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Ask the Genius
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Your AI co-pilot for lesson planning
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl p-4 mb-4 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-200 mb-1.5 uppercase tracking-wider">
                    AI Assistant
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Hello! I can help with lesson planning, student management, and teaching strategies. What would you like to know?
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className={`${FIELD} flex-1 px-4 py-3 text-sm sm:text-base`}
                  />
                  <button className={`${BTN_3D_PRIMARY} px-5 py-3 text-sm sm:text-base`}>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="relative z-10 mt-12 py-6 px-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10">
        AI Genius AIpreneur · Empowering Educators · © CRAVE Group
      </footer>
    </div>
  );
};
