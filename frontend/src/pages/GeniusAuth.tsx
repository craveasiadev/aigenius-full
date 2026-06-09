import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, User, Lock, Mail, Eye, EyeOff, ArrowLeft, Moon, Sun,
  ChevronRight, Loader2
} from 'lucide-react';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import { api, setToken, getToken, getGeniusToken } from '../lib/api';
import type { Role } from '../types/models';

// Role card component
const RoleCard = ({
  emoji,
  title,
  description,
  selected,
  onClick,
  disabled,
  comingSoon,
}: {
  emoji: string;
  title: string;
  description: string;
  color: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) => (
  <motion.button
    whileHover={disabled ? {} : { scale: 1.02 }}
    whileTap={disabled ? {} : { scale: 0.98 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      background: selected
        ? 'rgba(56, 189, 248, 0.08)'
        : 'rgba(15, 15, 30, 0.4)',
      border: selected
        ? '1px solid rgba(56, 189, 248, 0.3)'
        : '1px solid rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(20px)',
      opacity: disabled ? 0.4 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: selected ? '0 0 30px rgba(56, 189, 248, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    }}
    className="relative p-5 sm:p-4 rounded-2xl transition-all text-left w-full min-h-[64px]"
  >
    {/* Coming Soon Badge */}
    {comingSoon && (
      <div className="absolute top-2 left-2 right-2 z-20">
        <div
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            color: '#fbbf24',
          }}
        >
          Coming Soon
        </div>
      </div>
    )}
    <div className={`flex items-center gap-4 ${comingSoon ? 'mt-6' : ''}`}>
      <div
        className="w-14 h-14 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl sm:text-2xl"
        style={{
          background: disabled
            ? 'rgba(255, 255, 255, 0.03)'
            : selected
              ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
              : 'rgba(56, 189, 248, 0.1)',
          color: selected ? '#fff' : undefined,
        }}
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold mb-0.5" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{title}</h3>
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>{description}</p>
      </div>
    </div>
    {selected && !disabled && (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
      >
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
    )}
  </motion.button>
);

export const GeniusAuth = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login: geniusLogin, isLoading: geniusLoading, error: geniusError, isAuthenticated: isGeniusAuthenticated } = useGeniusAuth();
  const { currentUser, isLoading: authLoading } = useAuth();
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  const isNativeApp = typeof (window as any).Capacitor !== 'undefined';
  const [selectedRole, setSelectedRole] = useState<Role | null>('student');
  const [geniusId, setGeniusId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'role' | 'login'>('login');
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isSubmitting || hasRedirected.current) return;
    if (authLoading || geniusLoading) return;

    const hasAuthToken = !!getToken();
    const hasGeniusToken = !!getGeniusToken();

    if (isGeniusAuthenticated && hasGeniusToken) {
      hasRedirected.current = true;
      navigate('/s/aipreneur', { replace: true });
      return;
    }

    if (currentUser && hasAuthToken) {
      // Prevent redirect loop:
      // /login -> /s/aipreneur (auth_token student) -> ProtectedRoute -> /login -> ...
      // Student pages must be guarded by genius auth (genius_token + profile).
      if (currentUser.role === 'student') {
        return;
      }

      const routes: Record<string, string> = {
        student: '/s/aipreneur',
        teacher: '/t/dashboard',
        parent: '/p/dashboard',
        master: '/admin/dashboard',
      };
      hasRedirected.current = true;
      navigate(routes[currentUser.role] || '/', { replace: true });
    }
  }, [isGeniusAuthenticated, currentUser?.id, currentUser?.role, navigate, isSubmitting, authLoading, geniusLoading]);

  const roles = [
    {
      role: 'parent' as Role,
      emoji: '👨‍👩‍👧',
      title: 'Parent',
      description: 'Supporting my child\'s entrepreneurial journey',
      disabled: true,
      comingSoon: true,
    },
    {
      role: 'student' as Role,
      emoji: '🎮',
      title: 'Young Genius',
      description: 'Ready to build my business empire!',
      disabled: false,
      comingSoon: false,
    },
    {
      role: 'teacher' as Role,
      emoji: '📚',
      title: 'Teacher',
      description: 'Guiding students to success',
      disabled: true,
      comingSoon: true,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const loginIdentifier = selectedRole === 'student' ? geniusId : email;

    if (!loginIdentifier || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedRole === 'student') {
        const success = await geniusLogin(geniusId, password);
        if (success) {
          navigate('/s/aipreneur');
          return;
        } else {
          setError(geniusError || 'Invalid Genius ID or password');
          setIsSubmitting(false);
          return;
        }
      }

      let response;
      try {
        response = await api.post<{
          success: boolean;
          token: string;
          user: {
            id: string;
            email: string;
            name: string;
            role: string;
            created_at: string;
          };
          message?: string;
        }>('/auth/login', { email, password });
      } catch (apiError: any) {
        if (apiError.status === 401) {
          setError('Invalid email or password');
        } else if (apiError.status === 422) {
          setError(apiError.data?.message || 'Invalid credentials');
        } else {
          setError(apiError.message || 'Unable to connect to server');
        }
        setIsSubmitting(false);
        return;
      }

      if (!response.success || !response.token || !response.user) {
        setError(response.message || 'Login failed');
        setIsSubmitting(false);
        return;
      }

      setToken(response.token);
      const userData = response.user;

      if (selectedRole && userData.role !== selectedRole) {
        setError(`This account is registered as ${userData.role}, not ${selectedRole}`);
        setIsSubmitting(false);
        return;
      }

      const userForStore = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as Role,
        passwordHash: '',
        createdAt: userData.created_at,
      };
      setCurrentUser(userForStore);

      const routes: Record<string, string> = {
        student: '/s/aipreneur',
        teacher: '/t/dashboard',
        parent: '/p/dashboard',
        master: '/admin/dashboard',
      };
      navigate(routes[userData.role] || '/');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setError('');
  };

  const continueToLogin = () => {
    if (selectedRole) setStep('login');
  };


  return (
    <div
      className="min-h-screen overflow-y-auto px-4 relative touch-manipulation"
      style={{
        background: '#0a0a1a',
        // Honour the iOS notch / Android status bar / gesture bar.
        // Without this, the logo gets clipped on notched phones and the
        // bottom register link gets covered by the home indicator.
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
    >
      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute"
          style={{
            top: '-30%',
            right: '-10%',
            width: '700px',
            height: '700px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.08) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-30%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(236, 72, 153, 0.06) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 60%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* Theme toggle — hidden in native app. Position respects the iOS notch
          so the button stays tappable below the status bar. */}
      {!isNativeApp && (
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="fixed z-50 w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-95 touch-manipulation"
          style={{
            top: 'max(env(safe-area-inset-top), 1rem)',
            right: 'max(env(safe-area-inset-right), 1rem)',
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" style={{ color: '#fbbf24' }} /> : <Moon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.5)' }} />}
        </button>
      )}

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto relative z-10"
      >
        {/* Logo Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4 sm:mb-8"
        >
          <div
            className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-3 sm:mb-4"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              boxShadow: '0 8px 32px rgba(6, 182, 212, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-1"
            style={{ color: 'rgba(255, 255, 255, 0.95)' }}
          >
            Welcome Back!
          </h1>
          <p className="text-base sm:text-sm" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>Let's get back to your shop</p>
        </motion.div>

        {/* Glass Card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(15, 15, 30, 0.5)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Role Selection */}
            {step === 'role' && (
              <motion.div
                key="role"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 sm:p-8"
              >
                <h2
                  className="text-lg font-semibold mb-1 text-center"
                  style={{ color: 'rgba(255, 255, 255, 0.9)' }}
                >
                  Who are you?
                </h2>
                <p className="text-sm text-center mb-6" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                  Select your role to continue
                </p>

                <div className="space-y-3 mb-6">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.role}
                      emoji={role.emoji}
                      title={role.title}
                      description={role.description}
                      color={role.color}
                      selected={selectedRole === role.role}
                      onClick={() => handleRoleSelect(role.role)}
                      disabled={role.disabled}
                      comingSoon={role.comingSoon}
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: selectedRole ? 1.02 : 1 }}
                  whileTap={{ scale: selectedRole ? 0.98 : 1 }}
                  onClick={continueToLogin}
                  disabled={!selectedRole}
                  className="w-full py-4 sm:py-3 rounded-2xl sm:rounded-xl font-bold text-lg sm:text-base flex items-center justify-center gap-2 transition-all min-h-[52px]"
                  style={selectedRole ? {
                    background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                    color: '#fff',
                    boxShadow: '0 8px 24px rgba(6, 182, 212, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  } : {
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'rgba(255, 255, 255, 0.25)',
                    cursor: 'not-allowed',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>

                <div className="mt-6 text-center space-y-3">
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                    Don't have an account?{' '}
                    <button
                      onClick={() => navigate('/register')}
                      className="font-semibold hover:underline"
                      style={{ color: '#38bdf8' }}
                    >
                      Sign Up Free
                    </button>
                  </p>
                  {!isNativeApp && (
                    <button
                      type="button"
                      onClick={() => navigate('/admin/login')}
                      className="text-xs transition-colors hover:opacity-80"
                      style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                    >
                      Admin login
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Login Form */}
            {step === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 sm:p-8"
              >
                {/* Genius login badge */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-sm"
                    style={{
                      background: 'rgba(56, 189, 248, 0.08)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <span>🎮</span>
                    <span>Young Genius</span>
                  </div>
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {(error || geniusError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 p-3 rounded-xl text-sm"
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      {error || geniusError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email/GeniusID Field */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      {selectedRole === 'student' ? 'Genius ID' : 'Email'}
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                      >
                        {selectedRole === 'student' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      </div>
                      <input
                        type={selectedRole === 'student' ? 'text' : 'email'}
                        value={selectedRole === 'student' ? geniusId : email}
                        onChange={(e) => selectedRole === 'student' ? setGeniusId(e.target.value) : setEmail(e.target.value)}
                        placeholder={selectedRole === 'student' ? 'Type your Genius ID here!' : 'your@email.com'}
                        className="w-full rounded-xl pl-10 pr-4 py-4 sm:py-3 text-base transition-all outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div
                        className="absolute left-3.5 top-1/2 -translate-y-1/2"
                        style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                      >
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your secret password"
                        className="w-full rounded-xl pl-10 pr-10 py-4 sm:py-3 text-base transition-all outline-none"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'rgba(255, 255, 255, 0.9)',
                          backdropFilter: 'blur(10px)',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors hover:opacity-80"
                        style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Forgot Password */}
                  {selectedRole !== 'student' && (
                    <div className="text-right">
                      <button
                        type="button"
                        className="text-sm hover:underline"
                        style={{ color: '#38bdf8' }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button - gradient glass */}
                  <motion.button
                    type="submit"
                    disabled={isSubmitting || geniusLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 sm:py-3 rounded-2xl sm:rounded-xl text-lg sm:text-base font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
                    style={{
                      background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                      color: '#fff',
                      boxShadow: '0 8px 24px rgba(6, 182, 212, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {(isSubmitting || geniusLoading) ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Let's Go!</span>
                    )}
                  </motion.button>
                </form>

                {/* Sign Up Link */}
                <div className="mt-5 text-center">
                  <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                    New here?{' '}
                    <button
                      onClick={() => navigate('/register')}
                      className="font-semibold hover:underline"
                      style={{ color: '#38bdf8' }}
                    >
                      Create an account
                    </button>
                  </p>
                </div>

                {/* Demo Hint for Students */}
                
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back to Home — hidden in native app */}
        {!isNativeApp && (
          <button
            onClick={() => navigate('/')}
            className="mt-5 mx-auto flex items-center gap-2 transition-colors text-sm hover:opacity-80"
            style={{ color: 'rgba(255, 255, 255, 0.3)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </button>
        )}
      </motion.div>

      {/* Global placeholder color style */}
      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.25) !important;
        }
      `}</style>
    </div>
  );
};
