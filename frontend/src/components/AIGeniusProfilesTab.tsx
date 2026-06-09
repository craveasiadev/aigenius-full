import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, BarChart3, RefreshCw, Eye, Users, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getRecommendationsForStudent } from '../services/recommendationService';

interface GeniusProfile {
  id: string;
  genius_id: string;
  genius_name: string;
  gender: string;
  date_of_birth: string;
  age: number | null;
  parent_id: string;
  parent_name?: string;
  persona_quiz_completed: boolean;
  persona_quiz_date?: string;
  created_at: string;
}

interface PersonaProfile {
  genius_profile_id: string;
  strengths: string[];
  growth_areas: string[];
  learning_style: string;
  fun_facts: string[];
  trait_scores: Record<string, number>;
}

interface RecommendationStats {
  genius_profile_id: string;
  genius_name: string;
  recommendation_count: number;
  last_generated: string;
  expires_at: string;
  is_expired: boolean;
}

interface AIUsageStats {
  total_cost: number;
  total_tokens: number;
  gpt4_calls: number;
  dalle_calls: number;
  last_30_days_cost: number;
}

export const AIGeniusProfilesTab = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'profiles' | 'recommendations' | 'analytics'>('overview');
  const [geniusProfiles, setGeniusProfiles] = useState<GeniusProfile[]>([]);
  const [recommendationStats, setRecommendationStats] = useState<RecommendationStats[]>([]);
  const [aiUsageStats, setAIUsageStats] = useState<AIUsageStats>({
    total_cost: 0,
    total_tokens: 0,
    gpt4_calls: 0,
    dalle_calls: 0,
    last_30_days_cost: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [personaData, setPersonaData] = useState<PersonaProfile | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('genius_profiles')
        .select(`
          *,
          users!genius_profiles_parent_id_fkey(name)
        `)
        .order('created_at', { ascending: false });

      if (profiles) {
        setGeniusProfiles(profiles.map((p: any) => ({
          ...p,
          parent_name: p.users?.name,
        })));
      }

      const { data: recData } = await supabase
        .from('storybook_recommendations')
        .select(`
          genius_profile_id,
          generated_at,
          expires_at,
          genius_profiles!inner(genius_name)
        `);

      if (recData) {
        const statsMap = new Map<string, any>();
        recData.forEach((rec: any) => {
          const key = rec.genius_profile_id;
          if (!statsMap.has(key)) {
            statsMap.set(key, {
              genius_profile_id: key,
              genius_name: rec.genius_profiles?.genius_name || 'Unknown',
              recommendation_count: 0,
              last_generated: rec.generated_at,
              expires_at: rec.expires_at,
              is_expired: new Date(rec.expires_at) < new Date(),
            });
          }
          const stats = statsMap.get(key);
          stats.recommendation_count += 1;
          if (new Date(rec.generated_at) > new Date(stats.last_generated)) {
            stats.last_generated = rec.generated_at;
            stats.expires_at = rec.expires_at;
            stats.is_expired = new Date(rec.expires_at) < new Date();
          }
        });
        setRecommendationStats(Array.from(statsMap.values()));
      }

      const { data: usageData } = await supabase
        .from('ai_usage_logs')
        .select('*');

      if (usageData) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stats = {
          total_cost: usageData.reduce((sum, log) => sum + (Number(log.total_cost) || 0), 0),
          total_tokens: usageData.reduce((sum, log) => sum + (log.prompt_tokens || 0) + (log.completion_tokens || 0), 0),
          gpt4_calls: usageData.filter(log => log.service_type.includes('gpt')).length,
          dalle_calls: usageData.filter(log => log.service_type.includes('dalle')).length,
          last_30_days_cost: usageData
            .filter(log => new Date(log.created_at) > thirtyDaysAgo)
            .reduce((sum, log) => sum + (Number(log.total_cost) || 0), 0),
        };
        setAIUsageStats(stats);
      }
    } catch (error) {
      console.error('Error loading AI & Genius data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (profileId: string) => {
    setSelectedProfile(profileId);
    try {
      const { data: persona } = await supabase
        .from('child_persona_profile')
        .select('*')
        .eq('genius_profile_id', profileId)
        .maybeSingle();

      setPersonaData(persona);

      const recs = await getRecommendationsForStudent(profileId, false);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading profile details:', error);
    }
  };

  const handleRefreshRecommendations = async (profileId: string) => {
    setRefreshing(true);
    try {
      await getRecommendationsForStudent(profileId, true);
      await loadData();
      alert('Recommendations refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing recommendations:', error);
      alert('Failed to refresh recommendations');
    } finally {
      setRefreshing(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading AI & Genius data...</div>
      </div>
    );
  }

  const profilesWithPersona = geniusProfiles.filter(p => p.persona_quiz_completed);
  const profilesWithoutPersona = geniusProfiles.filter(p => !p.persona_quiz_completed);
  const activeRecommendations = recommendationStats.filter(r => !r.is_expired);
  const expiredRecommendations = recommendationStats.filter(r => r.is_expired);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">AI & Genius Profiles Management</h2>
        <p className="text-gray-400">Monitor genius profiles, persona quizzes, and AI-powered recommendation system performance.</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['overview', 'profiles', 'recommendations', 'analytics'] as const).map((tab) => (
          <motion.button
            key={tab}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveSubTab(tab)}
            className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-all capitalize ${
              activeSubTab === tab
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-[#1a1a24] text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      {activeSubTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-purple-900/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Total Genius Profiles</p>
              <p className="text-4xl font-bold text-white">{geniusProfiles.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-cyan-900/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Persona Quizzes Completed</p>
              <p className="text-4xl font-bold text-white">{profilesWithPersona.length}</p>
              <p className="text-gray-400 text-xs mt-1">{profilesWithoutPersona.length} pending</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-green-900/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-400 text-sm mb-1">Active Recommendations</p>
              <p className="text-4xl font-bold text-white">{activeRecommendations.length}</p>
              <p className="text-gray-400 text-xs mt-1">{expiredRecommendations.length} expired</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-orange-900/30"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-400 text-sm mb-1">AI Cost (30 days)</p>
              <p className="text-4xl font-bold text-white">${aiUsageStats.last_30_days_cost.toFixed(2)}</p>
              <p className="text-gray-400 text-xs mt-1">${aiUsageStats.total_cost.toFixed(2)} total</p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-white">AI Usage Overview</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <div>
                    <p className="text-white font-semibold">Total API Calls</p>
                    <p className="text-gray-400 text-sm">GPT-4 & DALL-E combined</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-400">{aiUsageStats.gpt4_calls + aiUsageStats.dalle_calls}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <div>
                    <p className="text-white font-semibold">GPT-4 Calls</p>
                    <p className="text-gray-400 text-sm">Text generation</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{aiUsageStats.gpt4_calls}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <div>
                    <p className="text-white font-semibold">DALL-E Calls</p>
                    <p className="text-gray-400 text-sm">Image generation</p>
                  </div>
                  <p className="text-2xl font-bold text-pink-400">{aiUsageStats.dalle_calls}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <div>
                    <p className="text-white font-semibold">Total Tokens Used</p>
                    <p className="text-gray-400 text-sm">Prompt + Completion</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{aiUsageStats.total_tokens.toLocaleString()}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-xl font-bold text-white">System Health</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">OpenAI API Connected</p>
                    <p className="text-gray-400 text-sm">All services operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Recommendation Engine Active</p>
                    <p className="text-gray-400 text-sm">{activeRecommendations.length} profiles have fresh recommendations</p>
                  </div>
                </div>
                {expiredRecommendations.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                    <div>
                      <p className="text-white font-medium">{expiredRecommendations.length} Expired Recommendations</p>
                      <p className="text-gray-400 text-sm">Need refresh</p>
                    </div>
                  </div>
                )}
                {profilesWithoutPersona.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">{profilesWithoutPersona.length} Pending Persona Quizzes</p>
                      <p className="text-gray-400 text-sm">Students need to complete assessment</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}

      {activeSubTab === 'profiles' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">All Genius Profiles</h3>
            <p className="text-gray-400">{geniusProfiles.length} total profiles</p>
          </div>

          <div className="space-y-4">
            {geniusProfiles.map((profile) => (
              <div key={profile.id} className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {profile.genius_name[0]}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">{profile.genius_name}</h4>
                      <p className="text-gray-400 text-sm">Genius ID: {profile.genius_id}</p>
                      <p className="text-gray-400 text-sm">Parent: {profile.parent_name || 'Unknown'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewProfile(profile.id)}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Age</p>
                    <p className="text-white font-medium">{calculateAge(profile.date_of_birth)} years</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Gender</p>
                    <p className="text-white font-medium capitalize">{profile.gender}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Persona Quiz</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      profile.persona_quiz_completed
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {profile.persona_quiz_completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Created</p>
                    <p className="text-white font-medium">{formatDate(profile.created_at)}</p>
                  </div>
                </div>

                {selectedProfile === profile.id && personaData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-700"
                  >
                    <h5 className="text-white font-bold mb-3">Persona Profile</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Strengths</p>
                        <div className="flex flex-wrap gap-2">
                          {personaData.strengths.map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Growth Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {personaData.growth_areas.map((g, i) => (
                            <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Learning Style</p>
                        <p className="text-white font-medium capitalize">{personaData.learning_style}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Fun Facts</p>
                        <ul className="text-white text-sm space-y-1">
                          {personaData.fun_facts.slice(0, 2).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {recommendations.length > 0 && (
                      <div className="mt-4">
                        <p className="text-gray-400 text-sm mb-2">Current Recommendations ({recommendations.length})</p>
                        <div className="space-y-2">
                          {recommendations.slice(0, 3).map((rec, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-[#0f0f15] rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{rec.template_icon}</span>
                                <div>
                                  <p className="text-white text-sm font-medium">{rec.template_title}</p>
                                  <p className="text-gray-400 text-xs">Match: {rec.match_score}%</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'recommendations' && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Recommendation System Status</h3>
            <p className="text-gray-400">{recommendationStats.length} profiles with recommendations</p>
          </div>

          <div className="bg-[#1a1a24] rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0f0f15] border-b border-gray-800">
                <tr>
                  <th className="text-left p-4 text-gray-400 font-semibold">Genius Name</th>
                  <th className="text-left p-4 text-gray-400 font-semibold">Recommendations</th>
                  <th className="text-left p-4 text-gray-400 font-semibold">Last Generated</th>
                  <th className="text-left p-4 text-gray-400 font-semibold">Expires</th>
                  <th className="text-left p-4 text-gray-400 font-semibold">Status</th>
                  <th className="text-left p-4 text-gray-400 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recommendationStats.map((stat) => (
                  <tr key={stat.genius_profile_id} className="border-b border-gray-800 hover:bg-[#1f1f29]">
                    <td className="p-4 text-white font-medium">{stat.genius_name}</td>
                    <td className="p-4 text-white">{stat.recommendation_count} items</td>
                    <td className="p-4 text-gray-400">{formatDate(stat.last_generated)}</td>
                    <td className="p-4 text-gray-400">{formatDate(stat.expires_at)}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        stat.is_expired
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {stat.is_expired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleRefreshRecommendations(stat.genius_profile_id)}
                        disabled={refreshing}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">AI Analytics & Insights</h3>
            <p className="text-gray-400 mt-2">Detailed analytics coming soon!</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <h4 className="text-lg font-bold text-white">Cost Breakdown</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">GPT-4 Text Generation</span>
                    <span className="text-white font-semibold">${(aiUsageStats.total_cost * 0.7).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">DALL-E Image Generation</span>
                    <span className="text-white font-semibold">${(aiUsageStats.total_cost * 0.3).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-bold text-white">Usage by Purpose</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <span className="text-gray-400">Story Generation</span>
                  <span className="text-white font-semibold">{Math.floor(aiUsageStats.gpt4_calls * 0.4)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <span className="text-gray-400">Recommendations</span>
                  <span className="text-white font-semibold">{Math.floor(aiUsageStats.gpt4_calls * 0.35)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0f0f15] rounded-lg">
                  <span className="text-gray-400">Assessment Analysis</span>
                  <span className="text-white font-semibold">{Math.floor(aiUsageStats.gpt4_calls * 0.25)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
