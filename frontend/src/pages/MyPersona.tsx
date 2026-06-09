import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Lock, Check, ArrowRight, BookOpen,
  Sparkles, TrendingUp, Target, Star, Lightbulb, Users, GraduationCap,
  Rocket, Award, Zap, Heart, Brain, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';
import {
  getLearningStyleDisplay,
  getBehaviourTendencyDisplay,
  getCuriosityTypeDisplay
} from '../utils/traitDisplay';
import { getDiscoveryIcon, DISCOVERY_ORDER } from '../utils/discoveryMapping';
import { getPersonaInsights, getEntrepreneurialProfile } from '../services/personaEvolutionService';
import { personaApi, AIpreneurPersonaProfile, GeniusProfile as ApiGeniusProfile } from '../services/aipreneurApi';
import { PersonaRadarChart } from '../components/PersonaRadarChart';

interface PersonaData {
  phase1_learning_style_code: string | null;
  phase1_behaviour_tendency_code: string | null;
  phase1_curiosity_type_code: string | null;
  strengths: string[];
  growth_areas: string[];
  fun_facts: string[];
  trait_scores: Record<string, number>;
  created_at: string;
}

type GeniusProfile = ApiGeniusProfile & {
  genius_name?: string;
  profile_picture_url?: string | null;
};

interface Discovery {
  discovery_key: string;
  label: string;
  short_description: string;
  icon_name: string;
}

interface UnlockedDiscovery {
  discovery_key: string;
  total_sessions: number;
  average_score: number;
  latest_level: string;
  latest_summary: string;
  updated_at: string;
}

const DISCOVERY_FALLBACKS: Record<string, { label: string; short_description: string }> = {
  CURIOSITY: { label: 'Curiosity', short_description: 'Asking questions and exploring new ideas.' },
  CREATIVITY: { label: 'Creativity', short_description: 'Inventing and imagining new possibilities.' },
  LOGIC: { label: 'Logic', short_description: 'Solving problems with clear thinking.' },
  DRIVE: { label: 'Drive', short_description: 'Staying motivated to reach goals.' },
  EMPATHY: { label: 'Empathy', short_description: 'Understanding how others feel.' },
  IDENTITY: { label: 'Identity', short_description: 'Knowing who you are and what matters.' },
  REFLECTION: { label: 'Reflection', short_description: 'Learning from experiences.' },
  CONFIDENCE: { label: 'Confidence', short_description: 'Believing in your abilities.' },
  COLLABORATION: { label: 'Collaboration', short_description: 'Working well with others.' },
  COMMUNICATION: { label: 'Communication', short_description: 'Sharing ideas clearly.' },
  DIGITALITY: { label: 'Digitality', short_description: 'Using technology wisely.' },
  RESPONSIBILITY: { label: 'Responsibility', short_description: 'Being dependable and careful.' },
  RESILIENCE: { label: 'Resilience', short_description: 'Bouncing back from challenges.' },
};

const DEFAULT_DISCOVERIES: Discovery[] = DISCOVERY_ORDER.map(key => ({
  discovery_key: key,
  label: DISCOVERY_FALLBACKS[key]?.label || key,
  short_description: DISCOVERY_FALLBACKS[key]?.short_description || 'Discovery insight',
  icon_name: key,
}));

export const MyPersona = () => {
  const { geniusProfile: authProfile } = useGeniusAuth();
  const navigate = useNavigate();
  const [personaData, setPersonaData] = useState<PersonaData | null>(null);
  const [geniusProfile, setGeniusProfile] = useState<GeniusProfile | null>(null);
  const [discoveries] = useState<Discovery[]>(DEFAULT_DISCOVERIES);
  const [unlockedDiscoveries] = useState<UnlockedDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiscovery, setSelectedDiscovery] = useState<string | null>(null);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [aipreneurInsights, setAipreneurInsights] = useState<any>(null);
  const [entrepreneurialProfile, setEntrepreneurialProfile] = useState<any>(null);
  const [showMoreInsights, setShowMoreInsights] = useState(false);
  const traitEntries = useMemo(() => {
    const scores = personaData?.trait_scores || {};
    return Object.entries(scores)
      .filter(([, value]) => typeof value === 'number')
      .sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [personaData?.trait_scores]);

  const displayName = geniusProfile?.first_name || geniusProfile?.genius_name || 'Friend';
  const avatarUrl = geniusProfile?.avatar_url || geniusProfile?.profile_picture_url || null;

  useEffect(() => {
    if (authProfile) {
      setGeniusProfile(authProfile as GeniusProfile);
    }
  }, [authProfile]);

  useEffect(() => {
    loadAllData();
  }, [authProfile]);

  const loadAllData = async () => {
    try {
      const response = await personaApi.getProfile();
      if (response.success) {
        setGeniusProfile(response.profile as GeniusProfile);

        const persona = response.persona as AIpreneurPersonaProfile;
        setPersonaData({
          phase1_learning_style_code: persona.learning_style ? persona.learning_style.toLowerCase() : null,
          phase1_behaviour_tendency_code: null,
          phase1_curiosity_type_code: null,
          strengths: persona.strengths || [],
          growth_areas: persona.growth_areas || [],
          fun_facts: persona.fun_facts || [],
          trait_scores: persona.trait_scores || {},
          created_at: persona.created_at,
        });
      }

      const profileId = response?.profile?.id || authProfile?.id;
      if (profileId) {
        const insights = await getPersonaInsights(profileId);
        setAipreneurInsights(insights);

        const entProfile = await getEntrepreneurialProfile(profileId);
        setEntrepreneurialProfile(entProfile);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDiscoveryUnlocked = (key: string) => {
    if (key === 'CURIOSITY') return true;
    return unlockedDiscoveries.some(d => d.discovery_key === key);
  };

  const handleDiscoveryClick = (key: string) => {
    if (isDiscoveryUnlocked(key)) {
      setSelectedDiscovery(key);
    } else {
      setShowLockedModal(true);
    }
  };

  const scrollToDiscoveryCard = (key: string) => {
    const element = document.getElementById(`discovery-card-${key}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 mx-auto mb-4"
          >
            <div className="w-full h-full rounded-full" style={{ border: '4px solid rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          </motion.div>
          <p className="text-lg font-semibold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>Loading your persona...</p>
        </div>
      </div>
    );
  }

  if (!personaData || !geniusProfile) {
    return (
      <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
        {/* Gradient orbs */}
        <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

        <TopNav userName={displayName} />

        <div className="max-w-4xl mx-auto px-4 py-12 pt-20 md:pt-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)' }}
            >
              <Sparkles className="w-16 h-16 text-white" />
            </motion.div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Discover Your Genius Persona
            </h1>
            <p className="text-lg mb-8" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Take the personality quiz to unlock your discovery journey!
            </p>
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/s/dashboard')}
              className="px-8 py-4 text-white rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
            >
              Start Your Journey
            </motion.button>
          </motion.div>
        </div>

        <BottomNav />
      </div>
    );
  }

  const learningStyle = getLearningStyleDisplay(personaData.phase1_learning_style_code);
  const behaviourTendency = getBehaviourTendencyDisplay(personaData.phase1_behaviour_tendency_code);
  const curiosityType = getCuriosityTypeDisplay(personaData.phase1_curiosity_type_code);

  const orderedDiscoveries = DISCOVERY_ORDER
    .map(key => discoveries.find(d => d.discovery_key === key))
    .filter(Boolean) as Discovery[];

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {/* Gradient orbs */}
      <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      <div className="fixed top-[30%] right-[20%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div className="relative z-10">
        <TopNav userName={displayName} />

        <div className="max-w-[1400px] mx-auto p-6 pt-20 md:pt-24">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -5 }}
            onClick={() => navigate('/s/dashboard')}
            className="flex items-center gap-2 mb-6 group"
            style={{ color: 'rgba(139, 92, 246, 0.8)' }}
          >
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-semibold">Back to Dashboard</span>
          </motion.button>

          {/* Hero Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 rounded-3xl" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(99, 102, 241, 0.08))', filter: 'blur(40px)' }} />
            <div className="relative rounded-3xl p-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-6">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 30px rgba(139, 92, 246, 0.3)' }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl text-white">{displayName.charAt(0)}</span>
                    )}
                  </motion.div>
                  <div>
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-violet-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {displayName}
                    </h1>
                    <p className="text-lg mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Age {geniusProfile.age} - Discovering my genius
                    </p>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: 'spring' }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
                      style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
                    >
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                      </motion.div>
                      <span className="text-yellow-400 font-bold text-sm">
                        Genius Persona Ready!
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Persona Snapshot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Persona Snapshot
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl p-6" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                <div className="text-5xl mb-4">{learningStyle?.icon || 'G'}</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {learningStyle?.name || `Learning Style: ${personaData.phase1_learning_style_code || 'Balanced'}`}
                </h3>
                <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  {learningStyle?.description || 'You learn best when lessons match your style.'}
                </p>
              </div>

              <div className="rounded-2xl p-6" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                  Strengths
                </h3>
                <div className="flex flex-wrap gap-2">
                  {personaData.strengths.length > 0 ? (
                    personaData.strengths.map((strength) => (
                      <span key={strength} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'rgba(196, 167, 255, 0.9)' }}>
                        {strength}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No strengths recorded yet.</span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl p-6" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-400" />
                  Growth Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {personaData.growth_areas.length > 0 ? (
                    personaData.growth_areas.map((area) => (
                      <span key={area} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: 'rgba(253, 230, 138, 0.9)' }}>
                        {area}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No growth areas recorded yet.</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Trait Scores */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
              Trait Scores
            </h2>
            {traitEntries.length > 0 && (
              <div className="mb-6 rounded-2xl p-4" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <PersonaRadarChart scores={personaData.trait_scores} />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {traitEntries.length > 0 ? (
                traitEntries.slice(0, 8).map(([trait, score]) => (
                  <div key={trait} className="rounded-2xl p-4" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      <span className="font-semibold">{String(trait)}</span>
                      <span className="font-bold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>{Math.round(Number(score))}</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, Number(score)))}%`, background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.7), rgba(99, 102, 241, 0.7))' }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>No trait scores yet.</div>
              )}
            </div>
          </motion.div>

          {/* Fun Facts */}
          {personaData.fun_facts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                Fun Facts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personaData.fun_facts.map((fact) => (
                  <div key={fact} className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {fact}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* More Insights Toggle */}
          {(aipreneurInsights || entrepreneurialProfile) && (
            <div className="mb-6">
              <button
                onClick={() => setShowMoreInsights(prev => !prev)}
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: 'rgba(139, 92, 246, 0.8)' }}
              >
                <span>{showMoreInsights ? 'Hide' : 'Show'} More Insights</span>
                <ArrowRight className={`w-4 h-4 transition-transform ${showMoreInsights ? 'rotate-90' : ''}`} />
              </button>
            </div>
          )}

          {showMoreInsights && (
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
              >
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-400" />
              Phase 1: Core Persona Traits
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {learningStyle && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl p-6 transition-all"
                  style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(168, 85, 247, 0.15)' }}
                >
                  <div className="text-5xl mb-4">{learningStyle.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{learningStyle.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{learningStyle.description}</p>
                </motion.div>
              )}

              {behaviourTendency && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl p-6 transition-all"
                  style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(99, 102, 241, 0.15)' }}
                >
                  <div className="text-5xl mb-4">{behaviourTendency.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{behaviourTendency.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{behaviourTendency.description}</p>
                </motion.div>
              )}

              {curiosityType && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="rounded-2xl p-6 transition-all"
                  style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(16, 185, 129, 0.15)' }}
                >
                  <div className="text-5xl mb-4">{curiosityType.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{curiosityType.name}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{curiosityType.description}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {aipreneurInsights && aipreneurInsights.unlockedInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Rocket className="w-6 h-6" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                Phase 2: Entrepreneurial Insights
              </h2>
              <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                Discovered through your AIpreneur journey
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {aipreneurInsights.unlockedInsights.map((insight: any, index: number) => (
                  <motion.div
                    key={insight.insightId}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="rounded-2xl p-6 transition-all"
                    style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(168, 85, 247, 0.15)' }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))' }}>
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'rgba(196, 167, 255, 0.9)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        {insight.confidenceScore}% confidence
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{insight.insightName}</h3>
                    <p className="text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{insight.description}</p>
                    <div className="text-xs mb-2" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                      Unlocked from: {insight.discoveredFrom}
                    </div>
                    {insight.relatedDecisions && insight.relatedDecisions.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Based on:</p>
                        <ul className="text-xs space-y-1" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                              {insight.relatedDecisions.slice(0, 2).map((decision: string, idx: number) => (
                                <li key={idx}>- {decision}</li>
                              ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="rounded-2xl p-6" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                      <Brain className="w-5 h-5" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                      Your Entrepreneurial Profile
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {entrepreneurialProfile?.entrepreneurialStyle && (
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{entrepreneurialProfile.entrepreneurialStyle}</span>
                        </div>
                      )}
                      {entrepreneurialProfile?.leadershipTraits && entrepreneurialProfile.leadershipTraits.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" style={{ color: 'rgba(99, 102, 241, 0.8)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{entrepreneurialProfile.leadershipTraits.join(', ')}</span>
                        </div>
                      )}
                      {entrepreneurialProfile?.socialValues && entrepreneurialProfile.socialValues.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4" style={{ color: 'rgba(236, 72, 153, 0.8)' }} />
                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{entrepreneurialProfile.socialValues.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                      {aipreneurInsights.unlockedInsights.length}/{aipreneurInsights.totalInsights}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Insights Unlocked</div>
                    <div className="mt-2 w-full rounded-full h-2" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${aipreneurInsights.progressPercentage}%`, background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.7), rgba(99, 102, 241, 0.7))' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8"
              >
              <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-6 h-6" style={{ color: 'rgba(139, 92, 246, 0.8)' }} />
                Genius Discovery Path
              </h2>
            <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Complete Discovery Books to unlock deeper insights about yourself</p>

            <div
              ref={scrollContainerRef}
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-gray-800/50"
            >
              {orderedDiscoveries.map((discovery, index) => {
                const isUnlocked = isDiscoveryUnlocked(discovery.discovery_key);
                const Icon = getDiscoveryIcon(discovery.discovery_key);

                return (
                  <motion.button
                    key={discovery.discovery_key}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleDiscoveryClick(discovery.discovery_key);
                      scrollToDiscoveryCard(discovery.discovery_key);
                    }}
                    className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center font-bold transition-all relative group"
                    style={isUnlocked
                      ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', color: 'white', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }
                      : { background: 'rgba(255, 255, 255, 0.04)', color: 'rgba(255, 255, 255, 0.3)', border: '2px solid rgba(255, 255, 255, 0.08)' }
                    }
                  >
                    {isUnlocked ? (
                      <>
                        <Check className="w-8 h-8" />
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                          {discovery.label}
                        </div>
                      </>
                    ) : (
                      <>
                        <Lock className="w-6 h-6" />
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                          {discovery.label}
                        </div>
                      </>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
            <h2 className="text-2xl font-bold text-white mb-6">All Discoveries</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orderedDiscoveries.map((discovery, index) => {
                const isUnlocked = isDiscoveryUnlocked(discovery.discovery_key);
                const Icon = getDiscoveryIcon(discovery.discovery_key);
                const unlockedData = unlockedDiscoveries.find(u => u.discovery_key === discovery.discovery_key);

                return (
                  <motion.div
                    key={discovery.discovery_key}
                    id={`discovery-card-${discovery.discovery_key}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                    onClick={() => handleDiscoveryClick(discovery.discovery_key)}
                    className="p-6 rounded-2xl cursor-pointer transition-all"
                    style={isUnlocked
                      ? { background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(139, 92, 246, 0.2)' }
                      : { background: 'rgba(15, 15, 30, 0.3)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.04)' }
                    }
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                        style={isUnlocked
                          ? { background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }
                          : { background: 'rgba(255, 255, 255, 0.04)' }
                        }
                      >
                        <Icon className="w-7 h-7" style={{ color: isUnlocked ? 'white' : 'rgba(255, 255, 255, 0.2)' }} />
                      </div>
                      {isUnlocked ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.6)' }}>
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                          <Lock className="w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.25)' }} />
                        </div>
                      )}
                    </div>

                    <h3 className="text-lg font-bold mb-2" style={{ color: isUnlocked ? 'white' : 'rgba(255, 255, 255, 0.3)' }}>
                      {discovery.label}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: isUnlocked ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)' }}>
                      {discovery.short_description}
                    </p>

                    {isUnlocked && unlockedData ? (
                      <p className="text-xs" style={{ color: 'rgba(139, 92, 246, 0.8)' }}>
                        Unlocked on {new Date(unlockedData.updated_at).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>
                        Complete a book to unlock
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-8"
              >
            <div className="rounded-2xl p-8" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-yellow-400" />
                Your Personality Summary
              </h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {displayName} is a {learningStyle?.name.toLowerCase()} who {behaviourTendency?.description.toLowerCase()}.
                As {curiosityType?.name === 'Story Dreamer' ? 'a' : 'an'} {curiosityType?.name.toLowerCase()}, {displayName}
                {' '}{curiosityType?.description.toLowerCase()}. This unique combination of traits makes {displayName} a truly special genius!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl p-6" style={{ background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.12)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.4), rgba(245, 158, 11, 0.4))' }}>
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Key Strengths</h3>
                  </div>
                  <ul className="space-y-2">
                    {personaData.strengths.slice(0, 5).map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-1" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl p-6" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4), rgba(5, 150, 105, 0.4))' }}>
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Growth Areas</h3>
                  </div>
                  <ul className="space-y-2">
                    {personaData.growth_areas.slice(0, 5).map((area, idx) => (
                      <li key={idx} className="flex items-start gap-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <Sparkles className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: 'rgba(16, 185, 129, 0.7)' }} />
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl p-8 text-center"
                style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(168, 85, 247, 0.15)' }}
              >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(236, 72, 153, 0.6))' }}
            >
              <BookOpen className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Keep Discovering, {displayName}!
            </h2>
            <p className="text-lg mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Complete Discovery Books to unlock more insights about yourself and unlock all 13 discoveries on your genius journey.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/s/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 text-white rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
            >
              Explore Discovery Books
              <ArrowRight className="w-5 h-5" />
            </motion.button>
              </motion.div>
            </div>
          )}
        </div>

        <BottomNav />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showLockedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLockedModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl p-8 max-w-md w-full relative"
              style={{ background: 'rgba(15, 15, 30, 0.8)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            >
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Lock className="w-10 h-10" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Discovery Locked</h3>
                <p className="mb-6" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  Complete a Discovery Book to unlock this insight about yourself!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLockedModal(false)}
                  className="px-6 py-3 text-white rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                >
                  Got It
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {selectedDiscovery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDiscovery(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl p-8 max-w-3xl w-full relative my-8"
              style={{ background: 'rgba(15, 15, 30, 0.8)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
            >
              <button
                onClick={() => setSelectedDiscovery(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'rgba(255, 255, 255, 0.5)' }}
              >
                X
              </button>

              {(() => {
                const discovery = discoveries.find(d => d.discovery_key === selectedDiscovery);
                const Icon = discovery ? getDiscoveryIcon(discovery.discovery_key) : Sparkles;
                const unlockedData = unlockedDiscoveries.find(u => u.discovery_key === selectedDiscovery);

                return (
                  <div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))' }}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-white">{discovery?.label}</h3>
                        <p style={{ color: 'rgba(139, 92, 246, 0.8)' }}>{discovery?.short_description}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="rounded-xl p-6" style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
                        <h4 className="text-xl font-bold text-white mb-3">AI Insight</h4>
                        <p className="leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                          {selectedDiscovery === 'CURIOSITY'
                            ? `${displayName}'s curiosity shines through their ${curiosityType?.name.toLowerCase()} nature. This natural inquisitiveness drives them to explore and learn in unique ways, making connections that others might miss.`
                            : unlockedData?.latest_summary || 'Complete more activities to unlock detailed insights about this discovery.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="rounded-xl p-6" style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.12)' }}>
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5" style={{ color: 'rgba(168, 85, 247, 0.8)' }} />
                            <h4 className="text-lg font-bold text-white">For Parents</h4>
                          </div>
                          <ul className="list-disc list-inside space-y-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            <li>Encourage exploration and questions</li>
                            <li>Provide varied learning materials</li>
                            <li>Celebrate their unique approach</li>
                          </ul>
                        </div>

                        <div className="rounded-xl p-6" style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
                          <div className="flex items-center gap-2 mb-4">
                            <GraduationCap className="w-5 h-5" style={{ color: 'rgba(16, 185, 129, 0.8)' }} />
                            <h4 className="text-lg font-bold text-white">For Teachers</h4>
                          </div>
                          <ul className="list-disc list-inside space-y-2 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                            <li>Adapt teaching to their style</li>
                            <li>Foster their natural curiosity</li>
                            <li>Build on their strengths</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
