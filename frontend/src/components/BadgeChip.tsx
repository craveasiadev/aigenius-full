import { Award } from 'lucide-react';

interface BadgeChipProps {
  label: string;
}

export const BadgeChip = ({ label }: BadgeChipProps) => {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card min-w-max">
      <Award className="w-4 h-4 text-accent" />
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {label}
      </span>
    </div>
  );
};
