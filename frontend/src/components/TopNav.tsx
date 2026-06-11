import { motion } from 'framer-motion';
import { LogOut, Brain, Database, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AITokenCounter } from './AITokenCounter';
import { useAuth } from '../contexts/AuthContext';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clearAllTokens } from '../lib/api';

interface TopNavProps {
  userName?: string;
  showPersonaButton?: boolean;
  title?: string;
  subtitle?: string;
  showTokenCounter?: boolean;
}

export const TopNav = ({
  userName,
  showPersonaButton = false,
  title = 'AI Genius AIpreneur',
  subtitle = 'Your Learning Journey',
  showTokenCounter = true,
}: TopNavProps) => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { logout: geniusLogout, isAuthenticated: isGeniusAuthenticated, geniusProfile } = useGeniusAuth();
  const { isDark, toggleTheme } = useTheme();

  const studentName = userName ||
    (geniusProfile ? `${geniusProfile.first_name || ''} ${geniusProfile.last_name || ''}`.trim() : '') ||
    'Student';
  const studentAvatar = geniusProfile?.avatar_url;
  const studentInitial = studentName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    console.log('[TopNav] Logout initiated');
    clearAllTokens();

    if (isGeniusAuthenticated) {
      console.log('[TopNav] Logging out genius user');
      await geniusLogout();
    }

    console.log('[TopNav] Logging out regular user');
    await logout();

    console.log('[TopNav] Logout complete, navigating to login');
    navigate('/login', { replace: true });
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(10, 10, 26, 0.65)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div className="w-full px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center gap-4 md:gap-8">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src="/logo.svg"
                alt="AI Genius"
                className="h-10 md:h-12 w-auto"
              />
              <div className="hidden sm:block">
                <h1 className="text-base md:text-lg font-bold text-white/90">
                  {title}
                </h1>
                <p className="text-xs text-white/40">
                  {subtitle}
                </p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">

            {currentUser && showTokenCounter && <AITokenCounter />}

            <motion.div
              className="hidden md:flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded-xl transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/s/profile')}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <motion.div
                className="w-9 h-9 rounded-full overflow-hidden"
                whileHover={{ scale: 1.1 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(99, 102, 241, 0.5))',
                  padding: '2px',
                }}
              >
                {studentAvatar ? (
                  <img
                    src={studentAvatar}
                    alt={studentName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(15, 15, 30, 0.8)' }}
                  >
                    <span className="text-white/90 font-bold text-sm">
                      {studentInitial}
                    </span>
                  </div>
                )}
              </motion.div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  {studentName}
                </p>
                {geniusProfile?.genius_id && (
                  <p className="text-xs text-white/30">@{geniusProfile.genius_id}</p>
                )}
              </div>
            </motion.div>

            {showPersonaButton && (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/s/persona')}
                  className="relative px-3 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
                  title="My Persona"
                  style={{
                    background: 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    color: 'rgba(167, 139, 250, 0.9)',
                  }}
                >
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">My Persona</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/s/ai-data')}
                  className="px-3 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
                  title="AI Data"
                  style={{
                    background: 'rgba(96, 165, 250, 0.12)',
                    border: '1px solid rgba(96, 165, 250, 0.2)',
                    color: 'rgba(147, 197, 253, 0.9)',
                  }}
                >
                  <Database className="w-4 h-4" />
                  <span className="hidden sm:inline font-semibold">AI Data</span>
                </motion.button>
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2 rounded-xl transition-colors"
              title="Toggle Theme"
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-400" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
              title="Logout"
              style={{
                background: 'rgba(248, 113, 113, 0.06)',
                border: '1px solid rgba(248, 113, 113, 0.1)',
                color: 'rgba(248, 113, 113, 0.7)',
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>

          </div>
        </div>
      </div>
    </motion.nav>
  );
};
