import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Award, Coins, BarChart3, Calendar, Sparkles, Code, Video, ArrowRight, Star } from 'lucide-react';
import { TopNav } from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { api } from '../lib/api';
import { DottedBackground } from '../components/ui/DottedBackground';
import { StarfieldBackground } from '../components/ui/StarfieldBackground';
import { PAGE } from '../lib/uiTokens';

interface GeniusProfile {
  id: string;
  genius_name: string;
  gender: string;
  date_of_birth: string;
  profile_picture_url: string | null;
}

export const ParentDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { loginAsChild } = useGeniusAuth();
  const [profiles, setProfiles] = useState<GeniusProfile[]>([]);
  const [coinBalances, setCoinBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [switchingProfile, setSwitchingProfile] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a token first (parent uses auth_token, not genius_token)
    const token = localStorage.getItem('auth_token');

    if (!token) {
      // No token - redirect to login
      console.log('[ParentDashboard] No auth_token found, redirecting to login');
      navigate('/login');
      return;
    }

    // If token exists but currentUser not yet loaded, wait
    if (!currentUser) {
      console.log('[ParentDashboard] Token exists but currentUser not loaded yet, waiting...');
      return; // AuthContext will set currentUser when ready
    }

    console.log('[ParentDashboard] User authenticated, loading data...');
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    try {
      const response = await api.get<{
        success: boolean;
        profiles: GeniusProfile[];
      }>(`/aipreneur/profiles?parent_id=${currentUser.id}`);

      if (response.success && response.profiles && response.profiles.length > 0) {
        setProfiles(response.profiles);

        // Fetch coin balances for all kids
        const balanceResults = await Promise.all(
          response.profiles.map(async (p: GeniusProfile) => {
            try {
              const bal = await api.get<{ success: boolean; data?: { coins: number } }>(
                `/aigenius/payments/balance?student_id=${p.id}`
              );
              return { id: p.id, coins: bal.data?.coins ?? 0 };
            } catch {
              return { id: p.id, coins: 0 };
            }
          })
        );
        const balMap: Record<string, number> = {};
        balanceResults.forEach(b => { balMap[b.id] = b.coins; });
        setCoinBalances(balMap);
      } else {
        navigate('/parent/genius-profiles');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      // On error, redirect to profile manager
      navigate('/parent/genius-profiles');
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

  const handleContinueLearning = async (profileId: string) => {
    setSwitchingProfile(profileId);
    try {
      const switched = await loginAsChild(profileId);
      if (switched) {
        navigate('/s/aipreneur');
      }
    } finally {
      setSwitchingProfile(null);
    }
  };

  if (loading) {
    return (
      <div className={`${PAGE} flex items-center justify-center`} style={{ backgroundColor: '#0a0a1a', color: 'white' }}>
        <StarfieldBackground />
        <DottedBackground />
        {/* Background gradient orbs */}
        <div
          style={{
            position: 'fixed',
            top: '15%',
            left: '10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'fixed',
            bottom: '10%',
            right: '15%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="mx-auto mb-4"
            style={{
              width: '64px',
              height: '64px',
              border: '4px solid rgba(139, 92, 246, 0.5)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              backdropFilter: 'blur(10px)',
            }}
          />
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, fontSize: '1rem' }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE} style={{ backgroundColor: '#0a0a1a', color: 'white' }}>
      <StarfieldBackground />
      <DottedBackground />
      {/* Fixed background gradient orbs */}
      <div
        style={{
          position: 'fixed',
          top: '5%',
          left: '5%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12), transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '40%',
          right: '0%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '0%',
          left: '30%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08), transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <TopNav
        userName={currentUser?.name || 'Parent'}
        title="AI Genius"
        subtitle="Parent Hub"
        showTokenCounter={false}
      />

      <main
        className="page-container pt-24 md:pt-28 px-4 sm:px-6 md:px-8"
        style={{
          position: 'relative',
          zIndex: 1,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 96px)',
        }}
      >
        <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          {/* Header - Modern & Welcome */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-10">
            <div className="min-w-0">
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-2"
                style={{ color: 'rgba(255, 255, 255, 0.95)' }}
              >
                Parent
                <span
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Hub
                </span>
              </h1>
              <p
                className="text-sm sm:text-base md:text-lg font-medium max-w-2xl"
                style={{ color: 'rgba(255, 255, 255, 0.65)' }}
              >
                Manage your children's learning journey, track progress, and unlock their potential with{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                  }}
                >
                  AI Genius
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/p/book-class')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  minHeight: '40px',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Calendar className="w-5 h-5" />
                Book Class
              </motion.button>

              {profiles.length >= 2 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/parent/compare-kids')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    minHeight: '40px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <BarChart3 className="w-5 h-5" />
                  Compare
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/parent/genius-profiles')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  minHeight: '40px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Users className="w-5 h-5" />
                Manage Profiles
              </motion.button>
            </div>
          </div>

          {/* Profiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {profiles.map((profile, index) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative"
                style={{
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '20px',
                  padding: '16px',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  {/* Avatar with gradient ring */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      padding: '3px',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #3b82f6)',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={profile.profile_picture_url || getDefaultAvatar(profile.gender)}
                      alt={profile.genius_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '13px',
                        background: 'rgba(15, 15, 30, 0.8)',
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-xl font-bold truncate"
                      style={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {profile.genius_name}
                    </h3>
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                    >
                      Age {calculateAge(profile.date_of_birth)} · Genius
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Storybooks
                    </div>
                    <div className="text-lg font-black" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                      0 / 6
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      <Coins className="w-3 h-3" style={{ color: '#8b5cf6' }} /> Coins
                    </div>
                    <div className="text-lg font-black" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                      {(coinBalances[profile.id] ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Streak
                    </div>
                    <div className="text-lg font-black" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                      🔥 0 days
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  >
                    <div
                      className="text-xs font-bold uppercase tracking-wider mb-1"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      Badges
                    </div>
                    <div className="text-lg font-black" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                      🏆 0
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleContinueLearning(profile.id)}
                    disabled={switchingProfile === profile.id}
                    className="col-span-2 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 20px',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: switchingProfile === profile.id ? 'not-allowed' : 'pointer',
                      opacity: switchingProfile === profile.id ? 0.7 : 1,
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {switchingProfile === profile.id ? (
                      <>Loading...</>
                    ) : (
                      <>
                        Continue Learning <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                  <button
                    onClick={() => navigate(`/parent/genius-profiles/${profile.id}/persona`)}
                    className="text-sm"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    My Persona
                  </button>
                  <button
                    onClick={() => navigate(`/parent/genius-profiles/${profile.id}/topup`)}
                    className="text-sm"
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                      e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    Top Up
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Empty State / Add Child Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: profiles.length * 0.1 }}
              onClick={() => navigate('/parent/genius-profiles/add')}
              className="group relative flex flex-col items-center justify-center p-6 sm:p-8 text-center"
              style={{
                minHeight: '250px',
                border: '2px dashed rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                background: 'rgba(15, 15, 30, 0.3)',
                backdropFilter: 'blur(20px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.background = 'rgba(15, 15, 30, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.background = 'rgba(15, 15, 30, 0.3)';
              }}
            >
              <div
                className="mb-4"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                }}
              >
                <Users className="w-8 h-8" style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Add Another Child
              </h3>
              <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)', maxWidth: '200px' }}>
                Create a new profile for another genius in the family.
              </p>
            </motion.div>
          </div>

          {/* Workshop & Class Promotions */}
          <div className="mt-8 sm:mt-12">
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-3"
              style={{ color: 'rgba(255, 255, 255, 0.95)' }}
            >
              <span
                style={{
                  padding: '8px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '12px',
                  display: 'inline-flex',
                }}
              >
                <Sparkles className="w-6 h-6" style={{ color: '#8b5cf6' }} />
              </span>
              Enrich Your Kids' Learning
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Coding Class Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group flex flex-col justify-between"
                style={{
                  minHeight: '240px',
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '20px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => navigate('/p/book-class')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.3))',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                      }}
                    >
                      <Code className="w-7 h-7" style={{ color: '#a78bfa' }} />
                    </div>
                    <span
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        borderRadius: '20px',
                        padding: '4px 14px',
                        color: '#a78bfa',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      New Class
                    </span>
                  </div>

                  <h4 className="text-2xl font-black mb-3" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                    Coding Adventure
                  </h4>
                  <p
                    className="text-base mb-6 leading-relaxed max-w-sm"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                  >
                    Build apps, games &amp; websites with friendly mentors. Unlock the power of code!
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: '2px solid rgba(255, 255, 255, 0.06)',
                            background: 'rgba(255, 255, 255, 0.08)',
                          }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-xs font-medium ml-2"
                      style={{ color: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      +12 joined
                    </span>
                  </div>
                  <div
                    className="text-sm flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      color: 'white',
                      fontWeight: 600,
                      transition: 'gap 0.2s ease',
                    }}
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>

              {/* Content Creation Workshop Banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group flex flex-col justify-between"
                style={{
                  minHeight: '240px',
                  background: 'rgba(15, 15, 30, 0.5)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '20px',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onClick={() => navigate('/p/book-class')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.2)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(52, 211, 153, 0.3))',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <Video className="w-7 h-7" style={{ color: '#6ee7b7' }} />
                    </div>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '20px',
                        padding: '4px 14px',
                        color: '#6ee7b7',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                      }}
                    >
                      Trending
                    </span>
                  </div>

                  <h4 className="text-2xl font-black mb-3" style={{ color: 'rgba(255, 255, 255, 0.95)' }}>
                    Content Creator
                  </h4>
                  <p
                    className="text-base mb-6 leading-relaxed max-w-sm"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                  >
                    Master video editing, storytelling & viral content creation. Be the next big creator!
                  </p>
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    ))}
                    <span className="font-bold text-sm ml-2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      4.9/5
                    </span>
                  </div>
                  <div
                    className="text-sm flex items-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6), rgba(99, 102, 241, 0.6))',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '10px',
                      padding: '8px 16px',
                      color: 'white',
                      fontWeight: 600,
                      transition: 'gap 0.2s ease',
                    }}
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
        </div>
      </main>
    </div>
  );
};
