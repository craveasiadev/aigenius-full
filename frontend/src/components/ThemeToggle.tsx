import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="p-3 rounded-full glass-card hover:bg-white/10 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-6 h-6" style={{ color: 'var(--text)' }} />
      ) : (
        <Moon className="w-6 h-6" style={{ color: 'var(--text)' }} />
      )}
    </motion.button>
  );
};
