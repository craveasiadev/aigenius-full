import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationPermissionPromptProps {
  onAccept: () => void;
  onDismiss: () => void;
}

export default function NotificationPermissionPrompt({ onAccept, onDismiss }: NotificationPermissionPromptProps) {
  const [show, setShow] = useState(true);

  const handleAccept = () => {
    setShow(false);
    setTimeout(onAccept, 300);
  };

  const handleDismiss = () => {
    setShow(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20 }}
            className="w-full max-w-sm rounded-3xl p-6 text-center"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Bell Icon */}
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
              style={{ background: 'linear-gradient(135deg, #ffd700 0%, #ff9800 100%)' }}>
              <span className="text-4xl">🔔</span>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-xl font-bold text-white">
              Stay in the loop!
            </h2>

            {/* Description */}
            <p className="mb-6 text-base text-gray-300 leading-relaxed">
              Want us to remind you to check on your shop? We'll let you know about quests and when your shop needs you!
            </p>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              className="mb-3 w-full rounded-2xl py-4 text-lg font-bold text-white transition-transform active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
                boxShadow: '0 4px 15px rgba(74, 222, 128, 0.3)',
              }}
            >
              Yes, remind me! ✨
            </button>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="w-full rounded-2xl py-3 text-base font-medium text-gray-400 transition-colors hover:text-gray-300"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
