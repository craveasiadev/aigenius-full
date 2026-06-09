import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Smartphone } from 'lucide-react';

interface ForceLogoutModalProps {
  isOpen: boolean;
  message: string;
  onDismiss: () => void;
}

export const ForceLogoutModal = ({ isOpen, message, onDismiss }: ForceLogoutModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop — not dismissible */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,30,0.95), rgba(30,20,50,0.95))',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Header accent */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

            <div className="px-6 pt-6 pb-5 text-center">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                <div className="relative">
                  <Smartphone className="w-7 h-7 text-amber-400" />
                  <LogOut className="w-4 h-4 text-orange-400 absolute -bottom-1 -right-1.5" />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-white font-black text-lg mb-2">Signed Out</h3>

              {/* Message */}
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                {message}
              </p>

              {/* Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onDismiss}
                className="w-full py-3 rounded-xl font-bold text-white text-sm"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                }}
              >
                Sign In Again
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
