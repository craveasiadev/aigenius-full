import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ConfettiProps {
  show: boolean;
  onComplete?: () => void;
}

export const Confetti = ({ show, onComplete }: ConfettiProps) => {
  const [pieces] = useState(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      color: ['#8A2BE2', '#f093fb', '#10B981', '#FFD700', '#FF6B6B'][Math.floor(Math.random() * 5)],
      delay: Math.random() * 0.5,
    }))
  );

  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <motion.div
          key={piece.id}
          initial={{ y: -20, x: piece.x, opacity: 1, rotate: 0 }}
          animate={{
            y: window.innerHeight + 20,
            rotate: 360,
            opacity: 0,
          }}
          transition={{
            duration: 2,
            delay: piece.delay,
            ease: 'easeIn',
          }}
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            backgroundColor: piece.color,
            borderRadius: '2px',
          }}
        />
      ))}
    </div>
  );
};
