import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, TrendingUp, Heart, ArrowLeft, Rocket, Zap, Users, Award } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLearningStyleDisplay } from '../utils/traitDisplay';
import { PersonaRadarChart } from '../components/PersonaRadarChart';
import { getPersonaInsights, getEntrepreneurialProfile } from '../services/personaEvolutionService';
import { personaApi, AIpreneurPersonaProfile, GeniusProfile as ApiGeniusProfile } from '../services/aipreneurApi';
import { ThemeToggle } from '../components/ThemeToggle';

type ParentGeniusProfile = ApiGeniusProfile & {
  genius_name?: string;
  profile_picture_url?: string | null;
};

export const ParentViewPersona = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<AIpreneurPersonaProfile | null>(null);
  const [geniusProfile, setGeniusProfile] = useState<ParentGeniusProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [aipreneurInsights, setAipreneurInsights] = useState<any>(null);
  const [entrepreneurialProfile, setEntrepreneurialProfile] = useState<any>(null);

  useEffect(() => {
    loadPersonaProfile();
  }, [profileId]);

  const loadPersonaProfile = async () => {
    if (!profileId) return;

    try {
      const response = await personaApi.getProfileForParent(profileId);
      if (response.success) {
        setGeniusProfile(response.profile as ParentGeniusProfile);
        setProfile(response.persona);
      } else {
        console.error('Error loading persona:', response.message);
      }

      const insights = await getPersonaInsights(profileId);
      setAipreneurInsights(insights);

      const entProfile = await getEntrepreneurialProfile(profileId);
      setEntrepreneurialProfile(entProfile);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayName = geniusProfile?.first_name || geniusProfile?.genius_name || 'Your child';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Loading persona profile...</p>
        </div>
      </div>
    );
  }

  if (!profile || !geniusProfile) {
    return (
      <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        </div>

        <header className="sticky top-0 z-50" style={{
          background: 'rgba(10, 10, 26, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-14 sm:h-16 md:h-20 flex justify-between items-center">
            <h1 className="text-sm sm:text-lg font-bold" style={{ color: '#fff' }}>Persona Profile</h1>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12 pb-24 sm:pb-28 relative" style={{ zIndex: 1, paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <button
              onClick={() => navigate('/p/dashboard')}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-6 text-sm sm:text-base mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl sm:rounded-3xl flex items-center justify-center">
              <Brain className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4" style={{ color: '#fff' }}>
              Persona Quiz Not Completed
            </h1>
            <p className="text-sm sm:text-lg mb-6 sm:mb-8 px-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {displayName} needs to complete the persona quiz first.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/p/dashboard')}
              className="px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                color: '#fff',
              }}
            >
              Back to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  const topTraits = Object.entries(profile.trait_scores || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const maxScore = Math.max(...Object.values(profile.trait_scores || {}));

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <header className="sticky top-0 z-50" style={{
        background: 'rgba(10, 10, 26, 0.7)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 h-14 sm:h-16 md:h-20 flex justify-between items-center">
          <h1 className="text-sm sm:text-lg font-bold truncate pr-2 min-w-0 flex-1" style={{ color: '#fff' }}>
            {displayName}'s Persona
          </h1>
          <div className="flex-shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto p-3 sm:p-4 md:p-6 pb-24 sm:pb-28 relative" style={{ zIndex: 1, paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6"
        >
          <button
            onClick={() => navigate('/p/dashboard')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-3 sm:mb-4 text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden" style={{
            background: 'linear-gradient(135deg, rgba(26, 58, 74, 0.6), rgba(42, 26, 58, 0.6))',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 text-4xl sm:text-6xl opacity-20">
              🧠
            </div>
            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2 text-cyan-400">
                {displayName}'s Persona Profile
              </h1>
              <p className="text-sm sm:text-base md:text-lg mb-3 sm:mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Unique learning journey and special talents
              </p>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full" style={{ background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                  <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                  <span className="text-purple-400 font-semibold text-xs sm:text-sm md:text-base">
                    {getLearningStyleDisplay(profile.learning_style)?.name || profile.learning_style}
                  </span>
                </div>
                {geniusProfile.age !== null && (
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full" style={{ background: 'rgba(34, 211, 238, 0.15)', border: '1px solid rgba(34, 211, 238, 0.2)' }}>
                    <span className="text-cyan-400 font-semibold text-xs sm:text-sm md:text-base">
                      Age: {geniusProfile.age}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: '#fff' }}>Strengths</h2>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>What makes them shine</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {profile.strengths.map((strength, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl"
                  style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.12)' }}
                >
                  <span className="text-lg sm:text-2xl flex-shrink-0">✨</span>
                  <p className="text-sm sm:text-base" style={{ color: '#fff' }}>{strength}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: '#fff' }}>Growth Areas</h2>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Skills being developed</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {profile.growth_areas.map((area, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl"
                  style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.12)' }}
                >
                  <span className="text-lg sm:text-2xl flex-shrink-0">🌱</span>
                  <p className="text-sm sm:text-base" style={{ color: '#fff' }}>{area}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: '#fff' }}>Trait Scores</h2>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Personality insights</p>
              </div>
            </div>

            <div className="mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <PersonaRadarChart scores={profile.trait_scores || {}} />
            </div>

            <div className="space-y-3 sm:space-y-4">
              {topTraits.map(([trait, score]) => {
                const category = { name: trait, icon: '⭐' };
                if (!category) return null;

                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

                return (
                  <div key={trait}>
                    <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-base sm:text-xl flex-shrink-0">{category.icon}</span>
                        <span className="font-semibold text-xs sm:text-sm truncate" style={{ color: '#fff' }}>{category.name}</span>
                      </div>
                      <span className="text-cyan-400 font-bold text-xs sm:text-sm flex-shrink-0">{score}</span>
                    </div>
                    <div className="w-full h-2 sm:h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl sm:rounded-2xl p-4 sm:p-6"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: '#fff' }}>Fun Facts</h2>
                <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Special things about them</p>
              </div>
            </div>

            <div className="space-y-2 sm:space-y-3">
              {profile.fun_facts.map((fact, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
                  style={{ background: 'rgba(236, 72, 153, 0.06)', border: '1px solid rgba(236, 72, 153, 0.12)' }}
                >
                  <p className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base" style={{ color: '#fff' }}>
                    <span className="text-lg sm:text-2xl flex-shrink-0">💫</span>
                    {fact}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        {aipreneurInsights && aipreneurInsights.unlockedInsights.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl p-4 sm:p-6"
            style={{
              background: 'rgba(168, 85, 247, 0.08)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(168, 85, 247, 0.15)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: '#fff' }}>Entrepreneurial Insights</h2>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Discovered through AIpreneur activities</p>
                </div>
              </div>
              <div className="text-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl self-start sm:self-auto" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                <div className="text-lg sm:text-2xl font-bold text-purple-400">
                  {aipreneurInsights.unlockedInsights.length}/{aipreneurInsights.totalInsights}
                </div>
                <div className="text-[10px] sm:text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Unlocked</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {aipreneurInsights.unlockedInsights.map((insight: any, index: number) => (
                <motion.div
                  key={insight.insightId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className="rounded-lg sm:rounded-xl p-3 sm:p-4"
                  style={{
                    background: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                  }}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'rgba(196, 148, 255, 0.9)' }}>
                      {insight.confidenceScore}%
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-lg font-bold mb-1 sm:mb-2" style={{ color: '#fff' }}>{insight.insightName}</h3>
                  <p className="text-xs sm:text-sm mb-1 sm:mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{insight.description}</p>
                  <p className="text-[10px] sm:text-xs text-cyan-400">From: {insight.discoveredFrom}</p>
                </motion.div>
              ))}
            </div>

            {entrepreneurialProfile && (
              <div className="rounded-lg sm:rounded-xl p-4 sm:p-6" style={{
                background: 'rgba(34, 211, 238, 0.06)',
                border: '1px solid rgba(34, 211, 238, 0.12)',
              }}>
                <h3 className="text-sm sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2" style={{ color: '#fff' }}>
                  <Award className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                  How Business Decisions Reflect Personality
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {entrepreneurialProfile.entrepreneurialStyle && (
                    <div className="rounded-lg p-3 sm:p-4" style={{ background: 'rgba(234, 179, 8, 0.06)', border: '1px solid rgba(234, 179, 8, 0.12)' }}>
                      <h4 className="text-xs sm:text-sm font-semibold text-yellow-400 mb-1 sm:mb-2">Business Style</h4>
                      <p className="font-bold text-sm sm:text-base" style={{ color: '#fff' }}>{entrepreneurialProfile.entrepreneurialStyle}</p>
                    </div>
                  )}
                  {entrepreneurialProfile.leadershipTraits && entrepreneurialProfile.leadershipTraits.length > 0 && (
                    <div className="rounded-lg p-3 sm:p-4" style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.12)' }}>
                      <h4 className="text-xs sm:text-sm font-semibold text-blue-400 mb-1 sm:mb-2 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Leadership
                      </h4>
                      <p className="text-sm sm:text-base" style={{ color: '#fff' }}>{entrepreneurialProfile.leadershipTraits.join(', ')}</p>
                    </div>
                  )}
                  {entrepreneurialProfile.socialValues && entrepreneurialProfile.socialValues.length > 0 && (
                    <div className="rounded-lg p-3 sm:p-4" style={{ background: 'rgba(236, 72, 153, 0.06)', border: '1px solid rgba(236, 72, 153, 0.12)' }}>
                      <h4 className="text-xs sm:text-sm font-semibold text-pink-400 mb-1 sm:mb-2 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Values
                      </h4>
                      <p className="text-sm sm:text-base" style={{ color: '#fff' }}>{entrepreneurialProfile.socialValues.join(', ')}</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.12)' }}>
                  <h4 className="text-xs sm:text-sm font-semibold text-green-400 mb-1 sm:mb-2">Parent Insight</h4>
                  <p className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {displayName}'s {profile.learning_style} learning style is being validated
                    through their entrepreneurial journey. Their business decisions show consistency with their
                    core personality traits, providing real-world confirmation of their natural strengths.
                  </p>
                </div>
              </div>
            )}
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 sm:mt-6 rounded-xl sm:rounded-2xl p-4 sm:p-6"
          style={{
            background: 'rgba(168, 85, 247, 0.08)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(168, 85, 247, 0.15)',
          }}
        >
          <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2 sm:mb-3" style={{ color: '#fff' }}>
            About {displayName}'s Learning Style
          </h3>
          <p className="text-xs sm:text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {getLearningStyleDisplay(profile.learning_style)?.description || 'Your child\'s unique learning style'}
          </p>
        </motion.section>
      </div>
    </div>
  );
};
