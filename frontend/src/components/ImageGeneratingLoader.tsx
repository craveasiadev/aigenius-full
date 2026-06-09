import { motion } from 'framer-motion';
import { Sparkles, Wand2 } from 'lucide-react';

export const ImageGeneratingLoader = () => {
  const messages = [
    'Adding magic...',
    'Bringing your photo to life...',
    'Creating storybook art...',
    'Painting your adventure...',
    'Weaving imagination...',
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-2xl p-8 border-2 border-purple-500/50"
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
            scale: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="relative"
        >
          <Wand2 className="w-16 h-16 text-purple-400" />
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        </motion.div>

        <div className="text-center space-y-2">
          <motion.h3
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-white"
          >
            Generating AI Image...
          </motion.h3>
          <p className="text-purple-300 text-lg">{randomMessage}</p>
          <p className="text-gray-400 text-sm">This usually takes 10-15 seconds</p>
        </div>

        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 bg-purple-500 rounded-full"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};
