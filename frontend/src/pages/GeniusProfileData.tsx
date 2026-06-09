import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { TopNav } from '../components/TopNav';
import { BottomNav } from '../components/BottomNav';

interface DataSection {
  title: string;
  emoji: string;
  data: Record<string, any> | null;
  count?: number;
  emptyMessage?: string;
}

export const GeniusProfileData = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sections, setSections] = useState<DataSection[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadAIData();
    }
  }, [currentUser]);

  const filterNonNull = (obj: any): Record<string, any> => {
    if (!obj) return {};
    const filtered: Record<string, any> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '' &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  const loadAIData = async (isSync = false) => {
    try {
      if (isSync) {
        setSyncing(true);
      } else {
        setLoading(true);
      }

      const newSections: DataSection[] = [];

      newSections.push({
        title: 'Authentication Context (currentUser Object)',
        emoji: '🔐',
        data: filterNonNull({
          id: currentUser.id,
          role: currentUser.role,
          email: currentUser.email,
          name: currentUser.name,
          geniusId: currentUser.geniusId,
          avatarUrl: currentUser.avatarUrl,
          teacherId: currentUser.teacherId,
          parentIds: currentUser.parentIds,
          createdAt: currentUser.createdAt
        })
      });

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      newSections.push({
        title: 'Users Table Data',
        emoji: '👤',
        data: userData ? filterNonNull(userData) : null,
        emptyMessage: 'No data in users table for this account'
      });

      const { data: geniusData } = await supabase
        .from('genius_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (geniusData) {
        newSections.push({
          title: 'Genius Profile (genius_profiles table)',
          emoji: '🎓',
          data: filterNonNull({
            genius_uid: geniusData.genius_uid,
            ...geniusData
          })
        });

        const { data: parentData } = await supabase
          .from('users')
          .select('*')
          .eq('id', geniusData.parent_id)
          .maybeSingle();

        if (parentData) {
          newSections.push({
            title: 'Parent/Guardian Information',
            emoji: '👨‍👩‍👧',
            data: filterNonNull({
              parent_id: parentData.id,
              parent_name: parentData.name,
              parent_email: parentData.email,
              parent_role: parentData.role,
              parent_created_at: parentData.created_at
            })
          });
        }

        const { data: persona } = await supabase
          .from('child_persona_profile')
          .select('*')
          .eq('genius_profile_id', geniusData.id)
          .maybeSingle();

        newSections.push({
          title: 'Persona Profile (child_persona_profile table)',
          emoji: '🧠',
          data: persona ? filterNonNull(persona) : null,
          emptyMessage: 'No persona profile data yet'
        });

        const { data: quizResponses } = await supabase
          .from('child_persona_responses')
          .select('*')
          .eq('genius_profile_id', geniusData.id)
          .maybeSingle();

        newSections.push({
          title: 'Persona Quiz Responses (child_persona_quiz_responses table)',
          emoji: '📝',
          data: quizResponses ? filterNonNull(quizResponses) : null,
          emptyMessage: 'No quiz responses yet'
        });

        const { data: chapterResponses } = await supabase
          .from('user_chapter_responses')
          .select('*')
          .eq('user_id', geniusData.id)
          .order('created_at', { ascending: false });

        newSections.push({
          title: 'Chapter Responses (user_chapter_responses table)',
          emoji: '📖',
          data: null,
          count: chapterResponses?.length || 0,
          emptyMessage: 'No chapter responses yet'
        });

        if (chapterResponses && chapterResponses.length > 0) {
          chapterResponses.forEach((response, index) => {
            const filtered = filterNonNull(response);
            if (Object.keys(filtered).length > 0) {
              newSections.push({
                title: `Chapter Response #${index + 1}`,
                emoji: '  📄',
                data: filtered
              });
            }
          });
        }

        const { data: recommendations } = await supabase
          .from('storybook_recommendations')
          .select('*')
          .eq('genius_profile_id', geniusData.id)
          .order('created_at', { ascending: false });

        newSections.push({
          title: 'AI Recommendations (student_recommendations table)',
          emoji: '💡',
          data: null,
          count: recommendations?.length || 0,
          emptyMessage: 'No recommendations yet'
        });

        if (recommendations && recommendations.length > 0) {
          recommendations.forEach((rec, index) => {
            const filtered = filterNonNull(rec);
            if (Object.keys(filtered).length > 0) {
              newSections.push({
                title: `Recommendation #${index + 1}`,
                emoji: '  ⭐',
                data: filtered
              });
            }
          });
        }

        const { data: tokenUsage } = await supabase
          .from('ai_usage_logs')
          .select('*')
          .eq('genius_id', geniusData.id)
          .order('created_at', { ascending: false });

        newSections.push({
          title: 'OpenAI Token Usage (token_counter table)',
          emoji: '🤖',
          data: null,
          count: tokenUsage?.length || 0,
          emptyMessage: 'No token usage data yet'
        });

        if (tokenUsage && tokenUsage.length > 0) {
          tokenUsage.forEach((usage, index) => {
            const filtered = filterNonNull(usage);
            if (Object.keys(filtered).length > 0) {
              newSections.push({
                title: `Token Usage Log #${index + 1}`,
                emoji: '  🔢',
                data: filtered
              });
            }
          });
        }
      }

      const hasUsers = userData !== null;
      const hasGenius = geniusData !== null;
      const hasParent = geniusData?.parent_id ? true : false;
      const hasPersona = newSections.some(s => s.title.includes('Persona Profile') && s.data);
      const hasQuiz = newSections.some(s => s.title.includes('Quiz Responses') && s.data);
      const hasChapter = newSections.find(s => s.title.includes('Chapter Responses'))?.count || 0;
      const hasRecs = newSections.find(s => s.title.includes('AI Recommendations'))?.count || 0;
      const hasTokens = newSections.find(s => s.title.includes('Token Usage'))?.count || 0;

      newSections.push({
        title: 'Data Completeness Summary',
        emoji: '⚠️',
        data: {
          'Auth Context': hasGenius ? '✓ Available' : '✗ No data',
          'Users Table': hasUsers ? '✓ Available' : '✗ No data',
          'Genius Profile': hasGenius ? '✓ Available' : '✗ No data',
          'Parent Data': hasParent ? '✓ Available' : '✗ No data',
          'Persona Profile': hasPersona ? '✓ Available' : '✗ No data',
          'Quiz Responses': hasQuiz ? '✓ Available' : '✗ No data',
          'Chapter Responses': hasChapter > 0 ? `✓ ${hasChapter} responses` : '✗ No data',
          'Recommendations': hasRecs > 0 ? `✓ ${hasRecs} recommendations` : '✗ No data',
          'Token Usage': hasTokens > 0 ? `✓ ${hasTokens} logs` : '✗ No data'
        }
      });

      setSections(newSections);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      if (isSync) {
        setSyncing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleSync = () => {
    loadAIData(true);
  };

  const renderValue = (key: string, value: any): string => {
    if (key === 'password_hash' && value) {
      return '"[REDACTED]"';
    }

    if (typeof value === 'string') {
      return `"${value}"`;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return JSON.stringify(value);
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <TopNav userName={currentUser.name} showPersonaButton={false} />

      <div className="max-w-6xl mx-auto p-6 pt-20 md:pt-24" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/s/dashboard')}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all"
            style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Database'}
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'white' }}>Genius Profile Data</h1>

        {sections.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No data found for this genius profile</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="rounded-2xl p-4" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <h2 className="text-lg font-bold mb-3" style={{ color: 'white' }}>
                  {section.emoji} {section.title}
                </h2>

                {section.count !== undefined && (
                  <div className="text-sm font-mono mb-2" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    total_{section.title.split(' ')[0].toLowerCase()} = {section.count}
                  </div>
                )}

                {section.data && Object.keys(section.data).length > 0 ? (
                  <div className="space-y-1 text-sm font-mono">
                    {Object.entries(section.data).map(([key, value], index) => (
                      <div key={index} style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        <span style={{ color: 'rgba(167, 139, 250, 0.8)' }}>{key}</span> = {renderValue(key, value)}
                      </div>
                    ))}
                  </div>
                ) : section.emptyMessage ? (
                  <div className="text-sm italic" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>{section.emptyMessage}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
