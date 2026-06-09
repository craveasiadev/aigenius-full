import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  loading,
  fullWidth,
  className = '',
  disabled,
  ...props 
}: ButtonProps) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30',
    secondary: 'bg-surface hover:bg-surface-hover border border-border text-txt-primary',
    ghost: 'bg-transparent hover:bg-surface-hover text-txt-secondary hover:text-txt-primary',
    gradient: 'bg-gradient-to-r from-accent to-blue-600 hover:from-accent-hover hover:to-blue-700 text-white shadow-lg shadow-accent/25',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  );
};

export const IconButton = ({ 
  icon, 
  onClick, 
  className = '',
  variant = 'ghost',
  size = 'md'
}: { 
  icon: ReactNode; 
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizes = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
  };

  return (
    <Button 
      variant={variant} 
      size="sm" 
      onClick={onClick}
      className={`${sizes[size]} ${className}`}
    >
      {icon}
    </Button>
  );
};
