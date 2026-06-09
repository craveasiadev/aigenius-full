import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AILoadingToastProps {
  isVisible: boolean;
  message?: string;
}

export const AILoadingToast = ({ isVisible, message = 'Connecting to AI...' }: AILoadingToastProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-card rounded-2xl p-4 flex items-center gap-3 min-w-[320px] shadow-2xl border-2 border-blue-500/30"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <div className="flex-1">
            <p className="font-bold text-white mb-1">{message}</p>
            <div className="flex gap-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                className="w-2 h-2 bg-blue-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                className="w-2 h-2 bg-cyan-400 rounded-full"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                className="w-2 h-2 bg-blue-400 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
