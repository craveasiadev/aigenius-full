import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Sparkles,
  Plus,
  Star,
  CheckCircle,
  Clock,
  Palette,
  Trophy,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import { StorybookCard } from '../components/StorybookCard';
import { ProgressRing } from '../components/ProgressRing';
import { loadChaptersFromDatabase, getChapterGradients } from '../utils/chapterLoader';
import type { Chapter } from '../types/models';

export const ArtventureHub = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [geniusProfile, setGeniusProfile] = useState<any>(null);
  const [rewards, setRewards] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [storySessions, setStorySessions] = useState<any[]>([]);
  const [chapterProgress, setChapterProgress] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadAllData = async () => {
    if (!currentUser) return;

    try {
      const [profileRes, rewardsRes, sessionsRes, progressRes, chaptersData] = await Promise.all([
        supabase.from('genius_profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase.from('rewards').select('*').eq('student_id', currentUser.id).maybeSingle(),
        supabase.from('story_sessions').select('*').eq('genius_profile_id', currentUser.id).order('created_at', { ascending: false }),
        supabase.from('chapter_progress').select('*').eq('user_id', currentUser.id),
        loadChaptersFromDatabase()
      ]);

      setGeniusProfile(profileRes.data);
      setRewards(rewardsRes.data);
      setStorySessions(sessionsRes.data || []);
      setChapterProgress(progressRes.data || []);
      setAllChapters(chaptersData.chapters);
    } catch (error) {
      console.error('Error loading Artventure data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto mb-4 animate-pulse" style={{ color: 'rgba(139, 92, 246, 0.7)' }} />
          <p className="text-white text-xl">Loading your Artventure...</p>
        </div>
      </div>
    );
  }

  const completedStories = storySessions.filter(s => s.backcover_summary).length;
  const totalStories = storySessions.length;
  const overallProgress = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

  const inProgressStories = storySessions.filter(s => !s.backcover_summary);
  const completedStoriesData = storySessions.filter(s => s.backcover_summary);

  const availableChapters = allChapters.slice(0, 6);

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <TopNav userName={currentUser.name} />

      <div className="max-w-[1400px] mx-auto p-6 pt-20 md:pt-24 space-y-8 relative z-10">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-12 h-12 text-white" />
              <h1 className="text-4xl md:text-5xl font-black text-white">
                Artventure Hub
              </h1>
            </div>
            <p className="text-xl mb-6 max-w-2xl" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Unleash your creativity through interactive storytelling and art. Create beautiful storybooks and bring your imagination to life!
            </p>

            <div className="flex flex-wrap gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/s/create')}
                className="px-8 py-4 rounded-xl font-bold text-lg shadow-lg inline-flex items-center gap-2 text-white"
                style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
              >
                <Plus className="w-6 h-6" />
                Create New Storybook
              </motion.button>

              {inProgressStories.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const story = inProgressStories[0];
                    navigate(`/s/storybook/${story.chapter_code}?session_id=${story.session_id}`);
                  }}
                  className="px-8 py-4 rounded-xl font-bold text-lg inline-flex items-center gap-2 text-white"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  <Zap className="w-6 h-6" />
                  Continue Story
                </motion.button>
              )}
            </div>
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.08)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full" style={{ background: 'rgba(236, 72, 153, 0.06)', filter: 'blur(60px)' }} />
        </motion.div>

        {/* Progress Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6"
            style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-20 h-20">
                <ProgressRing progress={overallProgress} size={80} strokeWidth={6} color="rgb(168, 85, 247)" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{overallProgress}%</span>
                </div>
              </div>
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Overall Progress</h3>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{completedStories} of {totalStories} stories completed</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6"
            style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))' }}>
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <CheckCircle className="w-12 h-12" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Stories Created</h3>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              <span className="text-3xl font-bold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>{completedStories}</span> completed storybooks
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl p-6"
            style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.5), rgba(234, 179, 8, 0.5))' }}>
                <Star className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="w-12 h-12 text-yellow-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Coins Earned</h3>
            <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              <span className="text-3xl font-bold text-yellow-400">{rewards?.ai_tokens || 0}</span> total AI tokens
            </p>
          </motion.div>
        </div>

        {/* In Progress Stories */}
        {inProgressStories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-7 h-7" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                Continue Your Stories
              </h2>
              <span className="font-semibold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>{inProgressStories.length} in progress</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inProgressStories.map((story, idx) => (
                <motion.div
                  key={story.session_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  onClick={() => navigate(`/s/storybook/${story.chapter_code}?session_id=${story.session_id}`)}
                  className="rounded-2xl p-6 cursor-pointer transition-all group"
                  style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))' }}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 transition-colors" style={{}}>
                    {story.selected_title || story.chapter_title || 'Untitled Story'}
                  </h3>
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    {story.chapter_theme ? `A story about ${story.chapter_theme.toLowerCase()}` : 'Continue crafting your creative story...'}
                  </p>
                  <div className="flex items-center gap-2 font-semibold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                    <Zap className="w-4 h-4" />
                    <span>Continue</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Completed Stories Gallery */}
        {completedStoriesData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-7 h-7" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                Completed Storybooks
              </h2>
              <span className="font-semibold" style={{ color: 'rgba(16, 185, 129, 0.8)' }}>{completedStoriesData.length} completed</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedStoriesData.map((story, idx) => (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  onClick={() => navigate(`/s/storybook/${story.chapter_code || story.id}`)}
                  className="rounded-2xl p-6 cursor-pointer transition-all group relative overflow-hidden"
                  style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
                >
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="w-8 h-8" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                  </div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.5), rgba(5, 150, 105, 0.5))' }}>
                      <BookOpen className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 transition-colors">
                    {story.title || 'Completed Story'}
                  </h3>
                  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                    {story.description || 'A wonderful story you created!'}
                  </p>
                  <div className="flex items-center gap-2 font-semibold" style={{ color: 'rgba(16, 185, 129, 0.8)' }}>
                    <Trophy className="w-4 h-4" />
                    <span>View Story</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Available Story Chapters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Palette className="w-7 h-7" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
              Available Story Themes
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableChapters.map((chapter, idx) => {
              const gradients = getChapterGradients();
              const gradient = gradients[idx % gradients.length];

              return (
                <motion.div
                  key={chapter.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + idx * 0.1 }}
                  onClick={() => navigate('/s/create')}
                  className="relative group cursor-pointer"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
                  <div className="relative rounded-2xl p-6 transition-all" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                    <h3 className="text-xl font-bold text-white mb-2 transition-colors">
                      {chapter.title}
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                      {chapter.description}
                    </p>
                    <div className="flex items-center gap-2 font-semibold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                      <Plus className="w-4 h-4" />
                      <span>Create Story</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Empty State */}
        {totalStories === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="rounded-3xl p-12 text-center"
            style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))' }}>
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Start Your Creative Journey!</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Create your first storybook and unlock the world of creative storytelling. Choose a theme, answer fun questions, and watch your story come to life!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/s/create')}
              className="px-8 py-4 rounded-xl font-bold text-white text-lg shadow-lg inline-flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
            >
              <Plus className="w-6 h-6" />
              Create Your First Story
            </motion.button>
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
