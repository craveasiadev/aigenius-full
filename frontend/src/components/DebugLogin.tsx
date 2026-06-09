import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, FileCode, Code, Activity } from 'lucide-react';
import { api, setToken } from '../lib/api';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';

interface DebugAccount {
  email: string;
  password: string;
  name: string;
  role: string;
  dashboardPath: string;
}

const debugAccounts: DebugAccount[] = [
  {
    email: 'jackson', // This might be an issue if backend validates email format. Assuming Jackson is an ID or login identifier.
    password: 'malaysia',
    name: 'Jackson',
    role: 'student',
    dashboardPath: '/s/dashboard',
  },
  {
    email: 'seancreative@gmail.com',
    password: 'malaysia',
    name: 'Sean Tan',
    role: 'parent',
    dashboardPath: '/p/dashboard',
  },
  {
    email: 'teacher@test.com',
    password: 'malaysia',
    name: 'Test Teacher',
    role: 'teacher',
    dashboardPath: '/t/dashboard',
  },
  {
    email: 'sean@craveasia.com',
    password: 'malaysia',
    name: 'Sean (Admin)',
    role: 'master',
    dashboardPath: '/admin/dashboard',
  },
];

export const DebugLogin = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const showFilename = useStore((state) => state.showFilename);
  const setShowFilename = useStore((state) => state.setShowFilename);
  const showVariable = useStore((state) => state.showVariable);
  const setShowVariable = useStore((state) => state.setShowVariable);
  const showMonitor = useStore((state) => state.showMonitor);
  const setShowMonitor = useStore((state) => state.setShowMonitor);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleQuickLogin = async (account: DebugAccount) => {
    setIsLoggingIn(true);
    setIsOpen(false);

    try {
      // We use the new API to login
      // Note: 'jackson' is not a valid email, but if backend supports username or ID login, it might work.
      // However, our AuthController validates 'email' => 'required|email'.
      // So 'jackson' will fail validation if it's not an email.
      // If 'jackson' is a student Genius ID, it should be handled via Genius Auth (different endpoint maybe?).
      // For now, we try standard auth. Login might fail for 'jackson'.

      // Actually, AuthController uses 'email' field.
      // If DebugLogin is important, we might need a bypass or specific handling.
      // But for 'seancreative@gmail.com' and others it should work.

      const response = await api.post<{
        success: boolean;
        token: string;
        user: any;
        message?: string;
      }>('/auth/login', {
        email: account.email,
        password: account.password,
      });

      if (!response.success || !response.token || !response.user) {
        console.error('Login error:', response.message);
        alert('Failed to login: ' + (response.message || 'User not found'));
        setIsLoggingIn(false);
        return;
      }

      const data = response.user;

      const userForStore = {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role as any,
        passwordHash: '',
        createdAt: data.created_at,
      };

      setToken(response.token);
      setCurrentUser(userForStore);
      navigate(account.dashboardPath);
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback: If network fails, and we are in debug mode, maybe we strictly require API now?
      // Yes, we shouldn't mock login if we want to test the real backend.
      if (account.email === 'jackson') {
        alert('Note: \'jackson\' might fail if backend requires valid email. Please use a valid email account.');
      } else {
        alert('Failed to login. Please check console.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoggingIn}
        className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center gap-2 shadow-lg disabled:opacity-50"
        title="Debug Login"
      >
        <Bug className="w-4 h-4 text-white" />
        <span className="hidden sm:inline text-white font-semibold text-sm">
          {isLoggingIn ? 'Logging in...' : 'Debug'}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-64 glass-card overflow-hidden rounded-xl shadow-2xl z-50"
          >
            <div className="py-2">
              {debugAccounts.map((account, index) => (
                <motion.button
                  key={account.email}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleQuickLogin(account)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/5"
                  style={{ color: 'var(--text)' }}
                >
                  <div className="font-semibold">{account.name}</div>
                  <div className="text-xs opacity-60 capitalize">{account.role}</div>
                </motion.button>
              ))}

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: debugAccounts.length * 0.05 }}
                className="px-4 py-3 border-t border-white/10 space-y-3"
              >
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showFilename}
                    onChange={(e) => setShowFilename(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-600 bg-gray-800 checked:bg-blue-500 checked:border-blue-500 cursor-pointer transition-all"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <FileCode className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      Show Filename
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showVariable}
                    onChange={(e) => setShowVariable(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-600 bg-gray-800 checked:bg-purple-500 checked:border-purple-500 cursor-pointer transition-all"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Code className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      Show Variable
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={showMonitor}
                    onChange={(e) => setShowMonitor(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-600 bg-gray-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer transition-all"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium group-hover:text-white transition-colors" style={{ color: 'var(--text-secondary)' }}>
                      Show Monitor
                    </span>
                  </div>
                </label>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
