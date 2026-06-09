import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const PrimaryButton = ({ children, onClick, className = '', disabled = false }: PrimaryButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`
        btn-primary min-h-[64px] w-full text-lg
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};
