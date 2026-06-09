import { Coins } from 'lucide-react';

interface CoinCounterProps {
  count: number;
}

export const CoinCounter = ({ count }: CoinCounterProps) => {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full glass-card">
      <span className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        Coins
      </span>
      <Coins className="w-5 h-5 text-yellow-500" />
      <span
        className="font-bold text-sm"
        style={{ color: 'var(--text)' }}
        data-variable="count"
        data-component="CoinCounter"
        data-path="props.count"
      >
        {count}
      </span>
    </div>
  );
};
