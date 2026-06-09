import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Coins } from 'lucide-react';
import { PrimaryButton } from './PrimaryButton';
import { StorybookViewer } from './StorybookViewer';
import { Confetti } from './Confetti';
import type { GeneratedChapter } from '../types/models';

interface CompletionOverlayProps {
  chapter: GeneratedChapter;
  coinsEarned: number;
  onBackToDashboard: () => void;
  userId?: string;
  geniusProfileId?: string;
}

export const CompletionOverlay = ({
  chapter,
  coinsEarned,
  onBackToDashboard,
  userId,
  geniusProfileId,
}: CompletionOverlayProps) => {
  const [showStorybook, setShowStorybook] = useState(false);

  if (showStorybook) {
    return (
      <StorybookViewer
        chapter={chapter}
        onClose={() => setShowStorybook(false)}
        userId={userId}
        geniusProfileId={geniusProfileId}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-pink-600 z-50 flex items-center justify-center px-4">
      <Confetti show={true} />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-2xl w-full"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-8xl mb-6"
        >
          🎓
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
        >
          You've completed the<br />{chapter.cover.title}!
        </motion.h1>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="bg-white/20 backdrop-blur-md rounded-3xl p-8 mb-8"
        >
          <div className="flex items-center justify-center gap-4 mb-6">
            <Trophy className="w-16 h-16 text-yellow-300" />
            <div className="text-white">
              <div className="text-xl font-semibold">Dream Achiever</div>
              <div className="text-3xl font-bold">🏅</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-white">
            <Coins className="w-8 h-8 text-yellow-300" />
            <div className="text-2xl font-bold">
              +{coinsEarned} Coins Earned!
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          <PrimaryButton onClick={() => setShowStorybook(true)}>
            View My Storybook
          </PrimaryButton>
          <button
            onClick={onBackToDashboard}
            className="w-full py-4 rounded-2xl font-bold text-lg bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};
