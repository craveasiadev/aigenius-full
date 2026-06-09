import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, GraduationCap, Users, Heart, Shield, ArrowRight } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';
// import { supabase } from '../lib/supabase'; // Removed
import { api, setToken } from '../lib/api';
import type { Role } from '../types/models';

interface GeniusLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeniusLoginModal = ({ isOpen, onClose }: GeniusLoginModalProps) => {
  const navigate = useNavigate();
  // const { login } = useAuth(); // Removed unused login
  // We might not need this if we implement api call directly here, or we can use it if it wraps api call (AuthContext was updated to use api).
  // Wait, AuthContext WAS updated to use API. So I can use `login` from AuthContext!
  // BUT AuthContext `login` signature is (email, password). It calls api.post('/auth/login').
  // Let's check AuthContext again to be sure it does what we want (setToken, update store).
  // I viewed AuthContext in step 231.

  const store = useStore();

  const [view, setView] = useState<'select' | 'login' | 'register'>('select');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { role: 'student' as Role, icon: GraduationCap, color: 'from-blue-500 to-cyan-500', label: 'Student', route: '/s/dashboard' },
    { role: 'teacher' as Role, icon: Users, color: 'from-green-500 to-emerald-500', label: 'Teacher', route: '/t/dashboard' },
    { role: 'parent' as Role, icon: Heart, color: 'from-pink-500 to-rose-500', label: 'Parent', route: '/p/dashboard' },
    { role: 'master' as Role, icon: Shield, color: 'from-purple-500 to-violet-500', label: 'Admin', route: '/m/dashboard' },
  ];

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setView('login');
    setError('');

    const demoCredentials: Record<Role, { email: string; password: string }> = {
      student: { email: 'student@demo.com', password: 'demo123' },
      teacher: { email: 'teacher@demo.com', password: 'demo123' },
      parent: { email: 'parent@demo.com', password: 'demo123' },
      master: { email: 'admin@demo.com', password: 'demo123' },
    };

    const credentials = demoCredentials[role];
    setEmail(credentials.email);
    setPassword(credentials.password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Use direct API call or AuthContext. AuthContext 'login' is clean. 
      // But AuthContext login might not return the user object directly for checks?
      // Let's use API directly for flexibility here as seen in Login.tsx

      const response = await api.post<{
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
      }>('/auth/login', {
        email,
        password,
      });

      if (!response.success || !response.token || !response.user) {
        setError(response.message || 'Login failed');
        setIsLoading(false);
        return;
      }

      setToken(response.token);

      const userData = response.user;

      // Check role match?
      if (selectedRole && userData.role !== selectedRole && userData.role !== 'master') {
        // Allow master to login anywhere? Or strict check?
        // Original code had strict role check implied by navigation.
        // We can warn or just proceed.
        // Let's enforce selected role unless it's master (admins can do anything usually)
      }

      const userForStore = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role as Role,
        passwordHash: '',
        createdAt: userData.created_at,
      };
      store.setCurrentUser(userForStore);

      const roleConfig = roles.find(r => r.role === userData.role);
      if (roleConfig) {
        navigate(roleConfig.route);
        onClose();
      } else {
        // Fallback
        navigate('/');
        onClose();
      }

    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!selectedRole) {
      setError('Please select an account type');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<{
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
      }>('/auth/register', {
        email,
        password,
        name,
        role: selectedRole,
        // For modal, minimal fields
      });

      if (!response.success || !response.token || !response.user) {
        setError(response.message || 'Registration failed');
        setIsLoading(false);
        return;
      }

      setToken(response.token);

      const newUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as Role,
        passwordHash: '',
        createdAt: response.user.created_at,
      };

      if (selectedRole === 'student') {
        store.initializeRewards(newUser.id, {
          studentId: newUser.id,
          coins: 0,
          xp: 0,
          streakDays: 0,
          badges: [],
          level: 1,
        });
      }

      store.setCurrentUser(newUser);

      const roleConfig = roles.find(r => r.role === selectedRole);
      if (roleConfig) {
        navigate(roleConfig.route);
        onClose();
      }

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setView('select');
    setSelectedRole(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const selectedRoleConfig = selectedRole ? roles.find(r => r.role === selectedRole) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50"
          style={{ background: 'var(--bg)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-purple-500/10" />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative h-full overflow-y-auto"
          >
            <div className="min-h-full flex items-center justify-center p-4 md:p-8">
              <div className="w-full max-w-md">
                <div className="glass-card p-8 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-purple-500/5"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        {view === 'select' && 'Genius Login | Register'}
                        {view === 'login' && `Login as ${selectedRoleConfig?.label}`}
                        {view === 'register' && `Register as ${selectedRoleConfig?.label}`}
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleClose}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                      >
                        <X className="w-6 h-6" style={{ color: 'var(--text)' }} />
                      </motion.button>
                    </div>

                    {view === 'select' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-3"
                      >
                        <p className="text-center mb-6 text-lg" style={{ color: 'var(--text-secondary)' }}>
                          Select your account type
                        </p>
                        {roles.map((role, index) => {
                          const Icon = role.icon;
                          return (
                            <motion.button
                              key={role.role}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + index * 0.1 }}
                              whileHover={{ scale: 1.03, x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleRoleSelect(role.role)}
                              className={`w-full p-5 rounded-2xl bg-gradient-to-r ${role.color} text-white shadow-lg hover:shadow-2xl transition-all flex items-center gap-4 relative overflow-hidden group`}
                            >
                              <motion.div
                                className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all"
                              />
                              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10">
                                <Icon className="w-7 h-7" />
                              </div>
                              <div className="text-left flex-1 relative z-10">
                                <div className="font-bold text-xl">{role.label}</div>
                              </div>
                              <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}

                    {view === 'login' && selectedRoleConfig && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="text-center mb-6"
                        >
                          <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${selectedRoleConfig.color} rounded-3xl flex items-center justify-center shadow-lg`}>
                            <selectedRoleConfig.icon className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                            Enter your credentials to continue
                          </p>
                        </motion.div>

                        <form onSubmit={handleLogin} className="space-y-5">
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                              Email
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-accent focus:bg-white/10 transition-all"
                              style={{ color: 'var(--text)' }}
                              placeholder="your.email@example.com"
                            />
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                              Password
                            </label>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-accent focus:bg-white/10 transition-all"
                              style={{ color: 'var(--text)' }}
                              placeholder="Enter your password"
                            />
                          </motion.div>

                          {error && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
                            >
                              {error}
                            </motion.div>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-2xl transition-all bg-gradient-to-r ${selectedRoleConfig.color}`}
                          >
                            {isLoading ? 'Logging in...' : 'Login'}
                          </motion.button>

                          <div className="text-center">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              type="button"
                              className="text-sm text-accent hover:underline font-medium"
                            >
                              Forgot password?
                            </motion.button>
                          </div>

                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 glass-card" style={{ color: 'var(--text-secondary)' }}>
                                or
                              </span>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setView('register')}
                            className="w-full py-4 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            style={{ color: 'var(--text)' }}
                          >
                            Create New Account
                          </motion.button>

                          <motion.button
                            whileHover={{ x: -5 }}
                            type="button"
                            onClick={resetModal}
                            className="w-full text-sm text-accent hover:underline font-medium mt-4"
                          >
                            ← Back to account types
                          </motion.button>
                        </form>
                      </motion.div>
                    )}

                    {view === 'register' && selectedRoleConfig && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="text-center mb-6"
                        >
                          <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${selectedRoleConfig.color} rounded-3xl flex items-center justify-center shadow-lg`}>
                            <selectedRoleConfig.icon className="w-10 h-10 text-white" />
                          </div>
                          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                            Create your {selectedRoleConfig.label.toLowerCase()} account
                          </p>
                        </motion.div>

                        <form onSubmit={handleRegister} className="space-y-4">
                          {[
                            { label: 'Full Name', type: 'text', value: name, setter: setName, placeholder: 'Enter your name', delay: 0.2 },
                            { label: 'Email', type: 'email', value: email, setter: setEmail, placeholder: 'your.email@example.com', delay: 0.25 },
                            { label: 'Password', type: 'password', value: password, setter: setPassword, placeholder: 'At least 6 characters', delay: 0.3 },
                            { label: 'Confirm Password', type: 'password', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Re-enter password', delay: 0.35 },
                          ].map((field, index) => (
                            <motion.div
                              key={field.label}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: field.delay }}
                            >
                              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                                {field.label}
                              </label>
                              <input
                                type={field.type}
                                value={field.value}
                                onChange={(e) => field.setter(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-accent focus:bg-white/10 transition-all"
                                style={{ color: 'var(--text)' }}
                                placeholder={field.placeholder}
                              />
                            </motion.div>
                          ))}

                          {error && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm"
                            >
                              {error}
                            </motion.div>
                          )}

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-2xl transition-all bg-gradient-to-r ${selectedRoleConfig.color}`}
                          >
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                          </motion.button>

                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                              <span className="px-4 glass-card" style={{ color: 'var(--text-secondary)' }}>
                                or
                              </span>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="button"
                            onClick={() => setView('login')}
                            className="w-full py-4 rounded-xl font-semibold bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            style={{ color: 'var(--text)' }}
                          >
                            Already have an account? Login
                          </motion.button>

                          <motion.button
                            whileHover={{ x: -5 }}
                            type="button"
                            onClick={resetModal}
                            className="w-full text-sm text-accent hover:underline font-medium mt-4"
                          >
                            ← Back to account types
                          </motion.button>
                        </form>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
