import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Target, Check, ArrowRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImprovementArea {
  title: string;
  description: string;
}

export const PrioritySelection = () => {
  const navigate = useNavigate();
  const { profileId, quizId } = useParams<{ profileId: string; quizId: string }>();

  const [profile, setProfile] = useState<any>(null);
  const [improvementAreas, setImprovementAreas] = useState<ImprovementArea[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [profileId, quizId]);

  const loadData = async () => {
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
        navigate('/parent/genius-profiles');
        return;
      }

      setProfile(profileData);

      // Load assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('ai_assessments')
        .select('*')
        .eq('genius_id', profileId)
        .eq('quiz_id', quizId)
        .single();

      if (assessmentError) {
        console.error('Error loading assessment:', assessmentError);
        navigate('/parent/genius-profiles');
        return;
      }

      setImprovementAreas(assessmentData.recommendations || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      navigate('/parent/genius-profiles');
    }
  };

  const togglePriority = (title: string) => {
    if (selectedPriorities.includes(title)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== title));
    } else {
      if (selectedPriorities.length < 5) {
        setSelectedPriorities([...selectedPriorities, title]);
      }
    }
  };

  const handleSubmit = async () => {
    if (selectedPriorities.length !== 5) return;

    setSubmitting(true);

    try {
      // Update assessment with selected priorities
      const { error } = await supabase
        .from('ai_assessments')
        .update({
          selected_priorities: selectedPriorities,
        })
        .eq('genius_id', profileId)
        .eq('quiz_id', quizId);

      if (error) {
        console.error('Error saving priorities:', error);
        setSubmitting(false);
        return;
      }

      // Navigate to success page
      navigate(`/parent/genius-profiles/${profileId}/success`);
    } catch (error) {
      console.error('Error:', error);
      setSubmitting(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'white' }}>Loading...</p>
        </div>
      </div>
    );
  }

  const canSubmit = selectedPriorities.length === 5;

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
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.6), rgba(236, 72, 153, 0.6))' }}>
              <Target className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold" style={{ color: 'white' }}>
                Select Priority Areas
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                {selectedPriorities.length} of 5 selected
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12" style={{ position: 'relative', zIndex: 1 }}>
        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-8 mb-8"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Info className="w-6 h-6" style={{ color: 'rgba(96, 165, 250, 1)' }} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'white' }}>
                Choose 5 Priority Focus Areas for {profile.genius_name}
              </h2>
              <p className="text-lg mb-4" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Based on the AI analysis, we've identified 10 areas for growth. Please select the 5 most important areas you'd like to focus on for {profile.genius_name}'s learning journey.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={
                  canSubmit
                    ? { background: 'rgba(34, 197, 94, 0.6)', color: 'white' }
                    : { background: 'rgba(249, 115, 22, 0.2)', color: 'rgba(251, 146, 60, 1)' }
                }>
                  {selectedPriorities.length}
                </div>
                <span className="font-semibold" style={{ color: 'white' }}>
                  / 5 priorities selected
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Improvement Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {improvementAreas.map((area, index) => {
            const isSelected = selectedPriorities.includes(area.title);
            const canSelect = !isSelected && selectedPriorities.length < 5;

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: canSelect || isSelected ? 1.02 : 1 }}
                whileTap={{ scale: canSelect || isSelected ? 0.98 : 1 }}
                onClick={() => (canSelect || isSelected) && togglePriority(area.title)}
                disabled={!canSelect && !isSelected}
                className="p-6 rounded-2xl text-left transition-all relative"
                style={
                  isSelected
                    ? { background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.5), rgba(236, 72, 153, 0.5))', border: '1px solid rgba(249, 115, 22, 0.4)', boxShadow: '0 0 30px rgba(249, 115, 22, 0.2)' }
                    : canSelect
                    ? { background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer' }
                    : { background: 'rgba(15, 15, 30, 0.3)', border: '1px solid rgba(255, 255, 255, 0.03)', opacity: 0.5, cursor: 'not-allowed' }
                }
              >
                {/* Selection Indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                  >
                    <Check className="w-6 h-6 text-white" />
                  </motion.div>
                )}

                {/* Number Badge */}
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 font-bold" style={
                  isSelected
                    ? { background: 'rgba(255, 255, 255, 0.2)', color: 'white' }
                    : { background: 'rgba(249, 115, 22, 0.1)', color: 'rgba(251, 146, 60, 1)' }
                }>
                  {index + 1}
                </div>

                <h3 className="text-xl font-bold mb-3 pr-12" style={{ color: 'white' }}>
                  {area.title}
                </h3>

                <p className="text-sm" style={{ color: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.5)' }}>
                  {area.description}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <motion.button
            whileHover={{ scale: canSubmit ? 1.05 : 1 }}
            whileTap={{ scale: canSubmit ? 0.95 : 1 }}
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="px-8 py-4 rounded-xl font-bold text-white inline-flex items-center gap-3"
            style={
              canSubmit && !submitting
                ? { background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)', cursor: 'pointer' }
                : { background: 'rgba(255, 255, 255, 0.1)', cursor: 'not-allowed', opacity: 0.5 }
            }
          >
            {submitting ? 'Saving...' : 'Complete Profile Setup'}
            {!submitting && <ArrowRight className="w-5 h-5" />}
          </motion.button>

          {!canSubmit && (
            <p className="text-sm mt-4" style={{ color: 'rgba(250, 204, 21, 0.8)' }}>
              Please select exactly 5 priority areas to continue
            </p>
          )}
        </motion.div>
      </main>
    </div>
  );
};
