import React from 'react';

const TRAITS = [
  { key: 'Agility', color: '#38bdf8', icon: '⚡' },
  { key: 'Intelligence', color: '#a78bfa', icon: '🧠' },
  { key: 'Creativity', color: '#f472b6', icon: '🎨' },
  { key: 'Focus', color: '#34d399', icon: '🎯' },
  { key: 'Empathy', color: '#fb7185', icon: '💖' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const PersonaRadarChart = ({ scores, size = 220 }: { scores: Record<string, number>; size?: number }) => {
  const center = size / 2;
  const maxRadius = size * 0.35;
  const step = (Math.PI * 2) / TRAITS.length;
  const startAngle = -Math.PI / 2;

  const levelSteps = [0.33, 0.66, 1];

  const toPoint = (index: number, value: number) => {
    const angle = startAngle + step * index;
    const radius = (clamp(value, 0, 100) / 100) * maxRadius;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  };

  const valuePoints = TRAITS.map((trait, index) => {
    const value = Number(scores?.[trait.key] ?? 0);
    return toPoint(index, value);
  });

  const polygonPoints = valuePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="w-full flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {levelSteps.map((level) => {
          const points = TRAITS.map((_, index) => {
            const angle = startAngle + step * index;
            const radius = maxRadius * level;
            const x = center + Math.cos(angle) * radius;
            const y = center + Math.sin(angle) * radius;
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon
              key={`grid-${level}`}
              points={points}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
            />
          );
        })}

        {TRAITS.map((_, index) => {
          const angle = startAngle + step * index;
          const x = center + Math.cos(angle) * maxRadius;
          const y = center + Math.sin(angle) * maxRadius;
          return (
            <line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={polygonPoints}
          fill="rgba(56,189,248,0.25)"
          stroke="rgba(56,189,248,0.8)"
          strokeWidth="2"
        />

        {valuePoints.map((point, index) => (
          <circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={TRAITS[index].color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-2 w-full">
        {TRAITS.map((trait) => (
          <div key={trait.key} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-base">{trait.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-white/70">{trait.key}</p>
              <p className="text-sm font-semibold text-white">{Math.round(Number(scores?.[trait.key] ?? 0))}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonaRadarChart;
