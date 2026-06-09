import React from 'react';
import { motion } from 'framer-motion';

interface SpiderChartProps {
    data: Array<{
        id: string;
        name: string;
        color: string;
        scores: Record<string, number>;
    }>;
    traits: Array<{
        key: string;
        label: string;
    }>;
}

export const ComparisonSpiderChart = ({ data, traits }: SpiderChartProps) => {
    const size = 500;
    const center = size / 2;
    const radius = size * 0.35; // Leave room for labels
    const angleStep = (Math.PI * 2) / traits.length;

    const getPoint = (score: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const value = Math.max(0, Math.min(100, score));
        const distance = (value / 100) * radius;
        return {
            x: center + Math.cos(angle) * distance,
            y: center + Math.sin(angle) * distance
        };
    };

    const levels = [20, 40, 60, 80, 100];

    return (
        <div className="w-full relative aspect-square max-w-[600px] mx-auto">
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
                {/* Background Grid */}
                {levels.map((level, i) => (
                    <polygon
                        key={level}
                        points={traits.map((_, index) => {
                            const { x, y } = getPoint(level, index);
                            return `${x},${y}`;
                        }).join(' ')}
                        fill={i === levels.length - 1 ? "rgba(255, 255, 255, 0.03)" : "none"}
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="1"
                        strokeDasharray={i === levels.length - 1 ? '0' : '4 4'}
                    />
                ))}

                {/* Axes */}
                {traits.map((trait, index) => {
                    const { x, y } = getPoint(100, index);
                    // Label position (push out slightly)
                    const angle = index * angleStep - Math.PI / 2;
                    const labelDist = radius + 35;
                    const lx = center + Math.cos(angle) * labelDist;
                    const ly = center + Math.sin(angle) * labelDist;

                    return (
                        <g key={trait.key}>
                            <line
                                x1={center}
                                y1={center}
                                x2={x}
                                y2={y}
                                stroke="rgba(255, 255, 255, 0.1)"
                                strokeWidth="1"
                            />
                            <text
                                x={lx}
                                y={ly}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="rgba(255, 255, 255, 0.7)"
                                fontSize="16"
                                fontWeight="600"
                                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                            >
                                {trait.label}
                            </text>
                        </g>
                    );
                })}

                {/* Data Paths */}
                {data.map((kid, kidIndex) => {
                    const points = traits.map((trait, index) => {
                        const score = kid.scores[trait.key] || 0;
                        const { x, y } = getPoint(score, index);
                        return `${x},${y}`;
                    }).join(' ');

                    return (
                        <g key={kid.id}>
                            <motion.polygon
                                initial={{ opacity: 0, scale: 0.8, fillOpacity: 0 }}
                                animate={{ opacity: 1, scale: 1, fillOpacity: 0.2 }}
                                transition={{ duration: 1, delay: kidIndex * 0.2, ease: "easeOut" }}
                                points={points}
                                fill={kid.color}
                                stroke={kid.color}
                                strokeWidth="3"
                                style={{ transformOrigin: 'center' }}
                            />
                            {/* Dots */}
                            {traits.map((trait, index) => {
                                const score = kid.scores[trait.key] || 0;
                                const { x, y } = getPoint(score, index);
                                return (
                                    <motion.circle
                                        key={`${kid.id}-${trait.key}`}
                                        cx={x}
                                        cy={y}
                                        r={5}
                                        fill={kid.color}
                                        stroke="#0a0a10"
                                        strokeWidth="2"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: kidIndex * 0.2 + 0.5 + index * 0.05 }}
                                    />
                                );
                            })}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};
