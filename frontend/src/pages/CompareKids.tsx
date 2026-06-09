/**
 * CompareKids - Compare persona traits across kids
 *
 * Shows grouped horizontal bar chart for each trait (Agility, Intelligence, etc.)
 * with animated bars per kid, color-coded.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Zap, Palette, Target, Heart, AlertCircle, BarChart2 } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { ComparisonSpiderChart } from '../components/ComparisonSpiderChart';

interface GeniusProfile {
  id: string;
  genius_name: string;
  gender: string;
  date_of_birth: string;
  profile_picture_url: string | null;
}

interface KidData {
  profile: GeniusProfile;
  traitScores: Record<string, number>;
  hasPersona: boolean;
}

const TRAITS = [
  { key: 'Agility', label: 'Agility', icon: Zap, color: 'from-green-400 to-emerald-500', bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400' },
  { key: 'Intelligence', label: 'Intelligence', icon: Brain, color: 'from-blue-400 to-indigo-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  { key: 'Creativity', label: 'Creativity', icon: Palette, color: 'from-purple-400 to-pink-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  { key: 'Focus', label: 'Focus', icon: Target, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'Empathy', label: 'Empathy', icon: Heart, color: 'from-rose-400 to-red-500', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
];

const KID_COLORS = [
  { bar: 'from-cyan-400 to-blue-500', dot: 'bg-cyan-400' },
  { bar: 'from-pink-400 to-rose-500', dot: 'bg-pink-400' },
  { bar: 'from-green-400 to-emerald-500', dot: 'bg-green-400' },
  { bar: 'from-amber-400 to-yellow-500', dot: 'bg-amber-400' },
  { bar: 'from-violet-400 to-purple-500', dot: 'bg-violet-400' },
];

const KID_HEX_COLORS = [
  '#22d3ee', // Cyan
  '#f472b6', // Pink
  '#4ade80', // Green
  '#fbbf24', // Amber
  '#a78bfa', // Violet
];

export const CompareKids = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [kidsData, setKidsData] = useState<KidData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadAllKidsData();
  }, [currentUser]);

  const loadAllKidsData = async () => {
    if (!currentUser) return;
    try {
      const profilesRes = await api.get<{ success: boolean; profiles: GeniusProfile[] }>(
        `/aipreneur/profiles?parent_id=${currentUser.id}`
      );

      if (!profilesRes.success || !profilesRes.profiles) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        profilesRes.profiles.map(async (profile) => {
          try {
            const personaRes = await api.get<{
              success: boolean;
              persona?: { trait_scores?: Record<string, number> };
            }>(`/aipreneur/profiles/${profile.id}/persona`);

            const traitScores = personaRes.persona?.trait_scores || {};
            const hasPersona = Object.keys(traitScores).length > 0;

            return { profile, traitScores, hasPersona };
          } catch {
            return { profile, traitScores: {}, hasPersona: false };
          }
        })
      );

      setKidsData(results);
    } catch (err) {
      console.error('Failed to load kids data:', err);
    } finally {
      setLoading(false);
    }
  };

  const kidsWithPersona = kidsData.filter(k => k.hasPersona);
  const kidsWithoutPersona = kidsData.filter(k => !k.hasPersona);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-medium" style={{ color: '#fff' }}>Loading comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      <TopNav userName={currentUser?.name || 'Parent'} />

      <main className="max-w-3xl mx-auto px-4 py-8 pt-24 md:pt-28 relative" style={{ zIndex: 1 }}>
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/p/dashboard')}
          className="flex items-center gap-2 mb-6 transition-colors font-medium"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </motion.button>

        {/* Title */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <BarChart2 className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3" style={{ color: '#fff' }}>
            Compare Your Kids
          </h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            See how each child's unique persona traits compare side by side to understand their strengths.
          </p>
        </motion.div>

        {/* Legend */}
        {kidsWithPersona.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-10"
          >
            {kidsWithPersona.map((kid, index) => {
              const colorSet = KID_COLORS[index % KID_COLORS.length];
              return (
                <div key={kid.profile.id} className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {kid.profile.profile_picture_url ? (
                      <img src={kid.profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">
                        {kid.profile.gender === 'female' ? '👧' : '👦'}
                      </div>
                    )}
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${colorSet.dot}`} />
                  <span className="text-sm font-bold" style={{ color: '#fff' }}>{kid.profile.genius_name}</span>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* No persona data message */}
        {kidsWithPersona.length === 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-3xl p-8 text-center shadow-xl"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <AlertCircle className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
            <h3 className="font-bold text-xl mb-2" style={{ color: '#fff' }}>No Persona Data Yet</h3>
            <p className="max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Your kids need to complete the Persona Quiz first before you can compare their traits.
            </p>
          </motion.div>
        )}

        {/* Only 1 kid with persona */}
        {kidsWithPersona.length === 1 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="rounded-2xl p-4 mb-8 text-center"
            style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>
              Only <strong>{kidsWithPersona[0].profile.genius_name}</strong> has completed the Persona Quiz.
              {kidsWithoutPersona.length > 0 && ` Encourage ${kidsWithoutPersona.map(k => k.profile.genius_name).join(', ')} to take the quiz too!`}
            </p>
          </motion.div>
        )}


        {/* Spider Chart */}
        {kidsWithPersona.length >= 1 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <div className="rounded-3xl p-6 sm:p-10 shadow-xl" style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}>
              <h3 className="font-bold text-center mb-8 text-xl" style={{ color: '#fff' }}>Trait Comparison Radar</h3>
              <div className="relative">
                <ComparisonSpiderChart
                  data={kidsWithPersona.map((kid, index) => ({
                    id: kid.profile.id,
                    name: kid.profile.genius_name,
                    color: KID_HEX_COLORS[index % KID_HEX_COLORS.length],
                    scores: kid.traitScores
                  }))}
                  traits={TRAITS.map(t => ({ key: t.key, label: t.label }))}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Bar Chart Comparison */}
        {kidsWithPersona.length >= 1 && (
          <div className="space-y-6">
            {TRAITS.map((trait, traitIndex) => {
              const TraitIcon = trait.icon;
              return (
                <motion.div
                  key={trait.key}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + traitIndex * 0.08 }}
                  className="rounded-3xl p-6 shadow-lg"
                  style={{
                    background: 'rgba(15, 15, 30, 0.5)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  {/* Trait Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${trait.bg} flex items-center justify-center`}>
                      <TraitIcon className={`w-6 h-6 ${trait.text}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg" style={{ color: '#fff' }}>{trait.label}</h3>
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Comparative Analysis</p>
                    </div>
                  </div>

                  {/* Bars per kid */}
                  <div className="space-y-4">
                    {kidsWithPersona.map((kid, kidIndex) => {
                      const score = kid.traitScores[trait.key] || 0;
                      const colorSet = KID_COLORS[kidIndex % KID_COLORS.length];

                      return (
                        <div key={kid.profile.id}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{kid.profile.genius_name}</span>
                            </div>
                            <span className="text-sm font-bold" style={{ color: '#fff' }}>{score}/100</span>
                          </div>
                          <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + traitIndex * 0.08 + kidIndex * 0.1, ease: 'easeOut' }}
                              className={`h-full rounded-full bg-gradient-to-r ${colorSet.bar} shadow-sm`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Kids without persona */}
        {kidsWithoutPersona.length > 0 && (
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 rounded-3xl p-6 shadow-lg"
            style={{
              background: 'rgba(15, 15, 30, 0.5)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Not yet compared</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kidsWithoutPersona.map(kid => (
                <div key={kid.profile.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}>
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {kid.profile.profile_picture_url ? (
                      <img src={kid.profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm">
                        {kid.profile.gender === 'female' ? '👧' : '👦'}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-bold block" style={{ color: '#fff' }}>{kid.profile.genius_name}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Quiz not completed</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Summary Cards */}
        {kidsWithPersona.length >= 2 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12"
          >
            <h3 className="font-bold text-2xl mb-6 text-center" style={{ color: '#fff' }}>Individual Highlights</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {kidsWithPersona.map((kid, index) => {
                const colorSet = KID_COLORS[index % KID_COLORS.length];
                // Find best and weakest trait
                const entries = Object.entries(kid.traitScores);
                const sorted = entries.sort(([, a], [, b]) => b - a);
                const best = sorted[0];
                const weakest = sorted[sorted.length - 1];
                const avg = entries.length > 0
                  ? Math.round(entries.reduce((s, [, v]) => s + v, 0) / entries.length)
                  : 0;

                return (
                  <div key={kid.profile.id} className="rounded-3xl p-6 shadow-xl hover:-translate-y-1 transition-transform" style={{
                    background: 'rgba(15, 15, 30, 0.5)',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        {kid.profile.profile_picture_url ? (
                          <img src={kid.profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {kid.profile.gender === 'female' ? '👧' : '👦'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg" style={{ color: '#fff' }}>{kid.profile.genius_name}</h4>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Average Score: {avg}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {best && (
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(74, 222, 128, 0.9)' }}>Top Strength</div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold" style={{ color: '#fff' }}>{best[0]}</span>
                            <span className="font-black" style={{ color: 'rgba(74, 222, 128, 0.9)' }}>{best[1]}</span>
                          </div>
                        </div>
                      )}
                      {weakest && weakest[0] !== best?.[0] && (
                        <div className="p-3 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                          <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>Growth Area</div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold" style={{ color: '#fff' }}>{weakest[0]}</span>
                            <span className="font-black" style={{ color: 'rgba(251, 191, 36, 0.9)' }}>{weakest[1]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default CompareKids;
