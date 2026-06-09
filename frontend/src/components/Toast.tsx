import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  isVisible: boolean;
  onClose: () => void;
}

export const Toast = ({ message, type = 'success', isVisible, onClose }: ToastProps) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 glass-card rounded-xl p-4 flex items-center gap-3 min-w-[300px] shadow-lg"
        >
          {type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
          )}
          <span className="flex-1 font-medium" style={{ color: 'var(--text)' }}>
            {message}
          </span>
          <button onClick={onClose} className="flex-shrink-0">
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
