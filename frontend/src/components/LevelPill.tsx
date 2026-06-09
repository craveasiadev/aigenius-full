import { Star } from 'lucide-react';

interface LevelPillProps {
  level: number;
}

export const LevelPill = ({ level }: LevelPillProps) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full glass-card">
      <span className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        Level
      </span>
      <Star className="w-4 h-4 text-accent" />
      <span
        className="font-bold text-sm"
        style={{ color: 'var(--text)' }}
        data-variable="level"
        data-component="LevelPill"
        data-path="props.level"
      >
        {level}
      </span>
    </div>
  );
};
