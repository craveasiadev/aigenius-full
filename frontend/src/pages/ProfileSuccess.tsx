import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { PartyPopper, Plus, Home } from 'lucide-react';
import { Confetti } from '../components/Confetti';
import { supabase } from '../lib/supabase';

export const ProfileSuccess = () => {
  const navigate = useNavigate();
  const { profileId } = useParams<{ profileId: string }>();

  const [profile, setProfile] = useState<any>(null);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [profileCount, setProfileCount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    loadData();
    setTimeout(() => setShowConfetti(false), 5000);
  }, [profileId]);

  const loadData = async () => {
    if (!profileId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('genius_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load assessment to get priorities
      const { data: assessmentData } = await supabase
        .from('ai_assessments')
        .select('selected_priorities')
        .eq('genius_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (assessmentData) {
        setPriorities(assessmentData.selected_priorities || []);
      }

      // Count total profiles
      const { data: allProfiles } = await supabase
        .from('genius_profiles')
        .select('id')
        .eq('parent_id', user.id);

      setProfileCount(allProfiles?.length || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getDefaultAvatar = (gender: string) => {
    const avatars = {
      male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boy',
      female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=girl',
      other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=person',
    };
    return avatars[gender as keyof typeof avatars] || avatars.other;
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const canAddMore = profileCount < 5;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#0a0a1a' }}>
      {showConfetti && <Confetti />}

      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <main className="relative z-10 flex items-center justify-center min-h-screen px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="rounded-2xl p-8 md:p-12 text-center" style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.6), rgba(16, 185, 129, 0.6))', boxShadow: '0 0 40px rgba(34, 197, 94, 0.3)' }}
            >
              <PartyPopper className="w-16 h-16 text-white" />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute inset-0 rounded-full"
                style={{ background: 'rgba(34, 197, 94, 0.3)', filter: 'blur(20px)' }}
              />
            </motion.div>

            {/* Success Message */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold mb-4"
              style={{ color: 'white' }}
            >
              Genius Profile Created!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl mb-8"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
            >
              {profile?.genius_name}'s personalized learning journey is ready to begin
            </motion.p>

            {/* Profile Summary */}
            {profile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl p-6 mb-8"
                style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <img
                      src={profile.profile_picture_url || getDefaultAvatar(profile.gender)}
                      alt={profile.genius_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-2xl font-bold mb-2" style={{ color: 'white' }}>
                      {profile.genius_name}
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                      Age {calculateAge(profile.date_of_birth)} - {profile.gender}
                    </p>
                  </div>
                </div>

                {priorities.length > 0 && (
                  <div className="text-left">
                    <h4 className="text-lg font-bold mb-3" style={{ color: 'white' }}>
                      Priority Focus Areas
                    </h4>
                    <div className="space-y-2">
                      {priorities.map((priority, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <span className="font-bold" style={{ color: 'rgba(74, 222, 128, 1)' }}>{index + 1}</span>
                          </div>
                          <span className="font-semibold" style={{ color: 'white' }}>
                            {priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {canAddMore && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/parent/genius-profiles/add')}
                  className="px-8 py-4 rounded-xl font-bold text-white flex items-center gap-3 justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.6), rgba(6, 182, 212, 0.6))', boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' }}
                >
                  <Plus className="w-5 h-5" />
                  Add Another Genius
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/p/dashboard')}
                className="px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-3 justify-center"
                style={{ color: 'white', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </motion.button>
            </motion.div>

            {!canAddMore && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 text-sm"
                style={{ color: 'rgba(250, 204, 21, 0.8)' }}
              >
                You've reached the maximum of 5 Genius profiles
              </motion.p>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};
