import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SectionHeaderProps {
  children: ReactNode;
  subtitle?: string;
  className?: string;
}

export const SectionHeader = ({ children, subtitle, className = '' }: SectionHeaderProps) => {
  return (
    <div className={`mb-6 ${className}`}>
      <motion.h2
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-accent to-purple-600 bg-clip-text text-transparent"
      >
        {children}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-2 text-sm md:text-base"
          style={{ color: 'var(--text-secondary)' }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};
