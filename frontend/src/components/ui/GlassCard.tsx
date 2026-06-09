import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const GlassCard = ({ children, className = '', hover = false, onClick, delay = 0 }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? { y: -4, scale: 1.02 } : undefined}
      onClick={onClick}
      className={`
        bg-surface/80 backdrop-blur-xl 
        border border-border rounded-2xl 
        shadow-lg shadow-black/5
        ${hover ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-accent/30' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
};

export const GradientCard = ({ children, className = '', gradient = 'from-accent to-blue-600' }: GlassCardProps & { gradient?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-xl ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const StatCard = ({ 
  icon, 
  value, 
  label, 
  trend,
  delay = 0 
}: { 
  icon: ReactNode; 
  value: string | number; 
  label: string;
  trend?: { value: number; positive: boolean };
  delay?: number;
}) => {
  return (
    <GlassCard className="p-5" hover delay={delay}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.positive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
          }`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-txt-primary">{value}</div>
        <div className="text-sm text-txt-secondary">{label}</div>
      </div>
    </GlassCard>
  );
};
