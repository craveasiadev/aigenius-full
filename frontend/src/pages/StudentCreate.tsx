import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import { StorybookCard } from '../components/StorybookCard';
import { StoryQuizModal } from '../components/StoryQuizModal';
import { generateStory } from '../services/storyGenerationService';
import { useTokenUsage } from '../contexts/TokenUsageContext';
import { loadChaptersFromDatabase, getChapterBenefits, getChapterGradients } from '../utils/chapterLoader';
import type { Chapter } from '../types/models';
import type { StoryGenerationRequest } from '../types/story';

export const StudentCreate = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { updateFromDelta } = useTokenUsage();

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [geniusProfile, setGeniusProfile] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGeniusProfile();
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      setIsLoading(true);
      const { chapters } = await loadChaptersFromDatabase();
      setAllChapters(chapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeniusProfile = async () => {
    if (!currentUser) return;

    try {
      const { data: geniusData } = await supabase
        .from('genius_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (geniusData) {
        setGeniusProfile(geniusData);
      }
    } catch (error) {
      console.error('Error loading genius profile:', error);
    }
  };

  const handleStartAdventure = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setShowQuizModal(true);
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    if (!selectedChapter || !geniusProfile) return;

    setIsGenerating(true);

    try {
      const request: StoryGenerationRequest = {
        genius_profile_id: currentUser!.id,
        genius_name: geniusProfile.genius_name || currentUser!.name,
        age: geniusProfile.age || 7,
        gender: geniusProfile.gender || 'neutral',
        learning_style: geniusProfile.learning_style || 'visual',
        behaviour_tendency: geniusProfile.behaviour_tendency || 'explorer',
        curiosity_type: geniusProfile.curiosity_type || 'curious',
        chapter_code: selectedChapter.code,
        chapter_title: selectedChapter.title,
        chapter_theme: selectedChapter.theme || selectedChapter.tag,
        answers: Object.entries(answers).map(([question_id, answer_code]) => ({
          question_id,
          answer_code,
        })),
      };

      console.log('🚀 Generating story with request:', request);

      const response = await generateStory(request);

      console.log('✅ Story generated:', response);

      updateFromDelta(response.tokens_used);

      navigate(`/s/storybook/${selectedChapter.code}?session_id=${response.session_id}`);
    } catch (error) {
      console.error('❌ Error generating story:', error);
      alert('Failed to generate story. Please try again.');
      setIsGenerating(false);
      setShowQuizModal(false);
    }
  };

  if (!currentUser) return null;

  const chapterBenefits = getChapterBenefits();
  const gradients = getChapterGradients();

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <TopNav userName={geniusProfile?.genius_name || currentUser.name} />

      <div className="max-w-[1400px] mx-auto p-6 pt-20 md:pt-24 relative z-10">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/s/dashboard')}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'rgba(255, 255, 255, 0.4)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Choose Your Next Adventure
          </h1>
          <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Each chapter helps you learn, create, and grow in new ways!
          </p>
        </motion.div>

        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 rounded-full mb-6 mx-auto"
                style={{ border: '4px solid rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }}
              />
              <h2 className="text-2xl font-bold text-white mb-2">Creating Your Story...</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>This will take a few moments</p>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full mb-4"
              style={{ border: '4px solid rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }}
            />
            <p style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Loading chapters...</p>
          </div>
        ) : allChapters.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto mb-4" style={{ color: 'rgba(255, 255, 255, 0.15)' }} />
            <p className="text-xl" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>No chapters available yet.</p>
            <p className="mt-2" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>Check back soon for new adventures!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allChapters.map((chapter, idx) => {
              const gradient = gradients[idx % gradients.length];
              const benefit = chapterBenefits[chapter.title] || 'An amazing adventure awaits you in this chapter!';

              return (
                <StorybookCard
                  key={chapter.id}
                  id={chapter.id}
                  title={chapter.title}
                  icon={chapter.icon}
                  oneLiner={chapter.description}
                  description={chapter.theme}
                  focusAreas={chapter.focus}
                  gradient={gradient}
                  personalizedBenefit={geniusProfile ? benefit : undefined}
                  onStart={() => handleStartAdventure(chapter)}
                  userName={geniusProfile?.genius_name || currentUser.name}
                  rewardBadge={chapter.rewardBadge}
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />

      {selectedChapter && showQuizModal && !isGenerating && (
        <StoryQuizModal
          isOpen={showQuizModal}
          onClose={() => {
            setShowQuizModal(false);
            setSelectedChapter(null);
          }}
          chapter={selectedChapter}
          geniusName={geniusProfile?.genius_name || currentUser.name}
          onSubmit={handleQuizSubmit}
        />
      )}
    </div>
  );
};
