import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Brain, Sparkles, TrendingUp, Target, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AIAnalysisResult {
  strengths: string[];
  interests: string[];
  learningStyle: string;
  improvementAreas: Array<{
    title: string;
    description: string;
  }>;
}

export const AIAnalysis = () => {
  const navigate = useNavigate();
  const { profileId, quizId } = useParams<{ profileId: string; quizId: string }>();

  const [profile, setProfile] = useState<any>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDataAndAnalyze();
  }, [profileId, quizId]);

  const loadDataAndAnalyze = async () => {
    if (!profileId || !quizId) return;

    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('genius_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError);
        setError('Failed to load profile');
        return;
      }

      setProfile(profileData);

      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from('assessment_quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) {
        console.error('Error loading quiz:', quizError);
        setError('Failed to load quiz');
        return;
      }

      setQuiz(quizData);

      // Perform AI analysis
      await performAIAnalysis(profileData, quizData);
    } catch (error) {
      console.error('Error:', error);
      setError('An unexpected error occurred');
    }
  };

  const performAIAnalysis = async (profile: any, quiz: any) => {
    try {
      // Calculate age
      const birthDate = new Date(profile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      // For demo purposes, create mock analysis
      // In production, this would call OpenAI API
      const mockAnalysis: AIAnalysisResult = {
        strengths: ['Creative thinking', 'Problem-solving', 'Curiosity'],
        interests: ['Science and exploration', 'Art and creativity', 'Technology'],
        learningStyle: 'Visual and hands-on learner who enjoys interactive experiences',
        improvementAreas: [
          {
            title: 'Mathematical reasoning',
            description: 'Strengthen logical thinking and problem-solving with numbers through fun games and puzzles',
          },
          {
            title: 'Reading comprehension',
            description: 'Improve understanding of complex texts through guided reading and discussion',
          },
          {
            title: 'Writing expression',
            description: 'Develop creative writing skills and ability to express ideas clearly',
          },
          {
            title: 'Social collaboration',
            description: 'Build teamwork and communication skills through group activities',
          },
          {
            title: 'Time management',
            description: 'Learn to organize tasks and manage time effectively for better productivity',
          },
          {
            title: 'Critical thinking',
            description: 'Enhance ability to analyze information and make informed decisions',
          },
          {
            title: 'Scientific inquiry',
            description: 'Develop curiosity and systematic approach to exploring natural phenomena',
          },
          {
            title: 'Digital literacy',
            description: 'Build responsible and effective use of technology and online resources',
          },
          {
            title: 'Emotional intelligence',
            description: 'Strengthen understanding and management of emotions in self and others',
          },
          {
            title: 'Physical coordination',
            description: 'Improve motor skills and body awareness through active play and sports',
          },
        ],
      };

      // Save analysis to database
      const { error: analysisError } = await supabase
        .from('ai_assessments')
        .insert({
          genius_id: profile.id,
          quiz_id: quiz.id,
          strengths: mockAnalysis.strengths,
          weaknesses: [], // Will be populated with selected priorities
          recommendations: mockAnalysis.improvementAreas,
          selected_priorities: [],
          ai_analysis: JSON.stringify(mockAnalysis),
        });

      if (analysisError) {
        console.error('Error saving analysis:', analysisError);
      }

      setAnalysis(mockAnalysis);
      setLoading(false);
    } catch (error) {
      console.error('AI Analysis error:', error);
      setError('Failed to generate analysis');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto mb-6"
          >
            <Brain className="w-full h-full" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
          </motion.div>
          <h3 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
            AI is analyzing responses...
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Please wait while we generate personalized insights
          </p>
        </div>
      </div>
    );
  }

  if (error || !analysis || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a1a' }}>
        <div className="text-center rounded-2xl p-6 sm:p-8 w-full max-w-md" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
            <span className="text-3xl">!</span>
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: 'white' }}>
            {error || 'Something went wrong'}
          </h3>
          <button
            onClick={() => navigate('/parent/genius-profiles')}
            className="mt-4 px-6 py-3 rounded-xl text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
          >
            Back to Profiles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <header className="sticky top-0 z-50" style={{ background: 'rgba(10, 10, 26, 0.7)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))' }}>
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold" style={{ color: 'white' }}>
                Analysis Results
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                AI-powered insights for {profile.genius_name}
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 pb-24 sm:pb-28" style={{ position: 'relative', zIndex: 1 }}>
        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8 text-center"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 sm:mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))', boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)' }}
          >
            <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'white' }}>
            Analysis Complete!
          </h2>
          <p className="text-base sm:text-lg" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            We've analyzed {profile.genius_name}'s responses and identified key strengths and growth opportunities
          </p>
        </motion.div>

        {/* Strengths Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <TrendingUp className="w-6 h-6" style={{ color: 'rgba(74, 222, 128, 1)' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>
                Key Strengths
              </h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Areas where {profile.genius_name} excels
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.strengths.map((strength, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="p-4 rounded-xl"
                style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
              >
                <p className="font-semibold" style={{ color: 'rgba(74, 222, 128, 1)' }}>{strength}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Learning Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Brain className="w-6 h-6" style={{ color: 'rgba(96, 165, 250, 1)' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>
                Learning Style
              </h3>
            </div>
          </div>
          <p className="text-base sm:text-lg" style={{ color: 'white' }}>
            {analysis.learningStyle}
          </p>
        </motion.div>

        {/* Improvement Areas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
              <Target className="w-6 h-6" style={{ color: 'rgba(251, 146, 60, 1)' }} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold" style={{ color: 'white' }}>
                Growth Opportunities
              </h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Areas identified for focused development
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.improvementAreas.map((area, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="p-5 rounded-xl transition-all"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <h4 className="text-base sm:text-lg font-bold mb-2" style={{ color: 'white' }}>
                  {index + 1}. {area.title}
                </h4>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {area.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Next Step */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/parent/genius-profiles/${profileId}/priorities/${quizId}`)}
            className="w-full sm:w-auto px-6 sm:px-8 py-4 rounded-xl font-bold text-white inline-flex items-center justify-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.6), rgba(236, 72, 153, 0.6))', boxShadow: '0 0 30px rgba(249, 115, 22, 0.3)' }}
          >
            Select Priority Focus Areas
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <p className="text-sm mt-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Choose 5 areas to focus on for {profile.genius_name}'s personalized learning journey
          </p>
        </motion.div>
      </main>
    </div>
  );
};
