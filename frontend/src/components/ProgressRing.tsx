import { motion } from 'framer-motion';

interface ProgressRingProps {
  current: number;
  total: number;
  size?: number;
}

export const ProgressRing = ({ current, total, size = 120 }: ProgressRingProps) => {
  const percentage = (current / total) * 100;
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="8"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8A2BE2" />
            <stop offset="100%" stopColor="#f093fb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold"
          style={{ color: 'var(--text)' }}
          data-variable="current"
          data-component="ProgressRing"
          data-path="props.current"
        >
          <span
            data-variable="current"
            data-component="ProgressRing"
            data-path="props.current"
          >
            {current}
          </span>
          /
          <span
            data-variable="total"
            data-component="ProgressRing"
            data-path="props.total"
          >
            {total}
          </span>
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          pages
        </span>
      </div>
    </div>
  );
};
