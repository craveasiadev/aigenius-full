import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Sparkles } from 'lucide-react';

interface ImageGenerationSuccessProps {
  imageUrl: string;
  storyText?: string;
  onComplete?: () => void;
}

export const ImageGenerationSuccess = ({ imageUrl, storyText, onComplete }: ImageGenerationSuccessProps) => {
  const [showConfetti, setShowConfetti] = useState(true);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    const timer = setTimeout(() => {
      setShowConfetti(false);
      onComplete?.();
    }, 4000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      {showConfetti && (
        <Confetti
          width={dimensions.width}
          height={dimensions.height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
        />
      )}

      <div className="bg-gradient-to-br from-[#1a1a24] to-[#0f0f18] rounded-3xl p-6 border-2 border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <motion.div
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: 3,
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white">Your Storybook Page is Ready!</h3>
          <motion.div
            animate={{
              rotate: [0, -10, 10, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: 3,
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <img
            src={imageUrl}
            alt="Generated storybook illustration"
            className="w-full rounded-2xl border-2 border-purple-500 shadow-lg"
          />
          <motion.div
            animate={{
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="absolute -top-3 -right-3 w-12 h-12 bg-yellow-400 rounded-full blur-xl"
          />
          <motion.div
            animate={{
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 1,
            }}
            className="absolute -bottom-3 -left-3 w-12 h-12 bg-purple-400 rounded-full blur-xl"
          />
        </motion.div>

        {storyText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-6 p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30"
          >
            <p className="text-white text-lg leading-relaxed italic">
              "{storyText}"
            </p>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-purple-300 mt-4 text-sm"
        >
          AI-generated from your creation
        </motion.p>
      </div>
    </motion.div>
  );
};
