import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, ArrowLeft, Link2, Eye, EyeOff, HelpCircle, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { api, getToken } from '../lib/api';
import { useStore } from '../store/useStore';
import { ParentOnboardingTutorial } from '../components/ParentOnboardingTutorial';
import { TopNav } from '../components/TopNav';

interface GeniusProfile {
  id: string;
  parent_id: string;
  genius_id: string;
  genius_name: string;
  gender: string;
  date_of_birth: string;
  profile_picture_url: string | null;
  persona_quiz_completed?: boolean;
  created_at: string;
}

export const GeniusProfileManager = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<GeniusProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [linkGeniusId, setLinkGeniusId] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const currentUser = useStore((state) => state.currentUser);

  useEffect(() => {
    loadProfiles();
  }, [currentUser]);

  useEffect(() => {
    const forceShow = localStorage.getItem('parent_onboarding_show') === '1';
    const seenTutorial = localStorage.getItem('parent_onboarding_seen') === '1';

    if (forceShow || !seenTutorial) {
      setShowTutorial(true);
      localStorage.removeItem('parent_onboarding_show');
    }
  }, []);

  const loadProfiles = async () => {
    try {
      if (!currentUser) {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }
        return;
      }

      const response = await api.get<{
        success: boolean;
        profiles: GeniusProfile[];
      }>('/aipreneur/profiles', { parent_id: currentUser.id });

      if (response.success) {
        setProfiles(response.profiles || []);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
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

  const getDefaultAvatar = (gender: string) => {
    const avatars = {
      male: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boy',
      female: 'https://api.dicebear.com/7.x/avataaars/svg?seed=girl',
      other: 'https://api.dicebear.com/7.x/avataaars/svg?seed=person',
    };
    return avatars[gender as keyof typeof avatars] || avatars.other;
  };

  const canAddMore = profiles.length < 5;

  const closeTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('parent_onboarding_seen', '1');
  };

  const handleLinkExistingChild = async () => {
    const geniusId = linkGeniusId.trim();
    const password = linkPassword.trim();

    if (!geniusId || !password) {
      setLinkError('Enter Genius ID and password to verify this child.');
      setLinkSuccess('');
      return;
    }

    setLinking(true);
    setLinkError('');
    setLinkSuccess('');

    try {
      const response = await api.post<{ success: boolean; message?: string }>('/aipreneur/profiles/link-existing', {
        genius_id: geniusId,
        password,
      });

      if (response.success) {
        setLinkSuccess(response.message || 'Child linked successfully.');
        setLinkPassword('');
        setLinkGeniusId('');
        await loadProfiles();
      } else {
        setLinkError(response.message || 'Unable to link child profile.');
      }
    } catch (error: any) {
      setLinkError(error?.message || 'Unable to link child profile.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'rgba(139, 92, 246, 0.6)', borderTopColor: 'transparent' }} />
          <p className="font-medium" style={{ color: 'white' }}>Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: '#0a0a1a' }}>
      {/* Ambient gradient orbs */}
      <div style={{ position: 'fixed', top: '-20%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '20%', width: '30%', height: '30%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08), transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <TopNav userName={currentUser?.name || 'Parent'} />

      <main className="page-container pt-24 md:pt-28 pb-20" style={{ position: 'relative', zIndex: 1 }}>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <button
              onClick={() => navigate('/p/dashboard')}
              className="flex items-center gap-2 mb-4 transition-colors font-medium"
              style={{ color: 'rgba(255, 255, 255, 0.5)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(139, 92, 246, 0.8)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)')}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ color: 'white' }}>
              Genius Profiles
            </h1>
            <p className="text-lg max-w-2xl" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              {profiles.length === 0
                ? 'Add your first Genius profile to get started with personalized learning.'
                : `You have ${profiles.length} ${profiles.length === 1 ? 'profile' : 'profiles'}${canAddMore ? ` (${5 - profiles.length} more available)` : ' (Maximum reached)'}`
              }
            </p>
          </div>

          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all"
            style={{ color: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.04)' }}
          >
            <HelpCircle className="w-4 h-4" />
            View Tutorial
          </button>
        </div>

        {/* Link Existing Child Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 rounded-2xl p-6"
          style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <Link2 className="w-6 h-6" style={{ color: 'rgba(96, 165, 250, 1)' }} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1" style={{ color: 'white' }}>Link Account</h3>
              <p className="text-sm max-w-xl" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Does your child already have a student account? Enter their Genius ID and password below to link them to your parent dashboard.
              </p>
            </div>
          </div>

          <div className="rounded-2xl p-4 sm:p-6" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-4 items-start">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Genius ID</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                  <input
                    type="text"
                    value={linkGeniusId}
                    onChange={(e) => {
                      setLinkGeniusId(e.target.value);
                      if (linkError) setLinkError('');
                    }}
                    placeholder="e.g. G-123456"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider ml-1" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                  <input
                    type={showLinkPassword ? 'text' : 'password'}
                    value={linkPassword}
                    onChange={(e) => {
                      setLinkPassword(e.target.value);
                      if (linkError) setLinkError('');
                    }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-white placeholder-white/30 outline-none transition-all focus:ring-2 focus:ring-purple-500/40"
                    style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinkPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                  >
                    {showLinkPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="md:mt-6">
                <button
                  type="button"
                  onClick={handleLinkExistingChild}
                  disabled={linking || !linkGeniusId || !linkPassword}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))', boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}
                >
                  {linking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Link Child <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>

            {linkError && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-sm font-medium p-3 rounded-lg" style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <ShieldCheck className="w-4 h-4" /> {linkError}
              </motion.div>
            )}
            {linkSuccess && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-2 text-sm font-medium p-3 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <ShieldCheck className="w-4 h-4" /> {linkSuccess}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Existing Profiles */}
          {profiles.map((profile, index) => (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="group relative rounded-2xl p-6"
              style={{ background: 'rgba(15, 15, 30, 0.5)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(255, 255, 255, 0.06)', transition: 'border-color 0.3s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)')}
            >
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden shadow-inner" style={{ background: 'rgba(255, 255, 255, 0.04)' }}>
                  <img
                    src={profile.profile_picture_url || getDefaultAvatar(profile.gender)}
                    alt={profile.genius_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => navigate(`/parent/genius-profiles/${profile.id}/edit`)}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
                  style={{ background: 'rgba(15, 15, 30, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)' }}
                  title="Edit Profile"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-1 truncate px-2" style={{ color: 'white' }}>
                  {profile.genius_name}
                </h3>
                <div className="flex items-center justify-center gap-2 text-sm mb-3" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  <span>Age {calculateAge(profile.date_of_birth)}</span>
                  <span>•</span>
                  <span className="capitalize">{profile.gender}</span>
                </div>

                <div className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'rgba(167, 139, 250, 1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  Genius ID: {profile.genius_id || 'N/A'}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate(`/parent/genius-profiles/${profile.id}/edit`)}
                  className="w-full text-sm py-2.5 rounded-xl font-semibold transition-all"
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'white' }}
                >
                  Manage Profile
                </button>
              </div>
            </motion.div>
          ))}

          {/* Add New Profile Card */}
          {canAddMore && (
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: profiles.length * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/parent/genius-profiles/add')}
              className="flex flex-col items-center justify-center min-h-[320px] rounded-2xl transition-all group"
              style={{ border: '2px dashed rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)'; e.currentTarget.style.background = 'rgba(139, 92, 246, 0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
                <Plus className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: 'white' }}>Add Another Genius</h3>
              <p className="text-center px-6 text-sm" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                Create a new profile for your child
              </p>
            </motion.button>
          )}
        </div>

        {!canAddMore && (
          <div className="mt-8 p-4 rounded-xl text-center" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
            <p className="font-medium text-sm" style={{ color: 'rgba(250, 204, 21, 0.9)' }}>
              Maximum of 5 profiles reached. You can manage existing profiles above.
            </p>
          </div>
        )}

      </main>

      <ParentOnboardingTutorial
        isOpen={showTutorial}
        onClose={closeTutorial}
        onGoToDashboard={() => navigate('/p/dashboard')}
        onGoToAddChild={() => navigate('/parent/genius-profiles/add')}
      />
    </div>
  );
};
