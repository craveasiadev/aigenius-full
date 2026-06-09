import { Flame } from 'lucide-react';

interface StreakPillProps {
  days: number;
}

export const StreakPill = ({ days }: StreakPillProps) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full glass-card">
      <span className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        Streak
      </span>
      <Flame className="w-4 h-4 text-orange-500" />
      <span
        className="font-bold text-sm"
        style={{ color: 'var(--text)' }}
        data-variable="days"
        data-component="StreakPill"
        data-path="props.days"
      >
        {days}
      </span>
    </div>
  );
};
