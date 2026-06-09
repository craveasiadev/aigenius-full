/**
 * InactivityConsequencesModal — Shows penalties for missed login days.
 * Kid-friendly: warm tone, not punitive, encouraging.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Heart } from 'lucide-react';
import type { InactivityConsequence } from '../utils/inactivityCheck';

interface InactivityConsequencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  consequences: InactivityConsequence[];
  daysMissed: number;
}

export default function InactivityConsequencesModal({
  isOpen,
  onClose,
  consequences,
  daysMissed,
}: InactivityConsequencesModalProps) {
  if (!isOpen || consequences.length === 0) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div className="text-center pt-8 pb-4 px-6">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                😔
              </motion.div>
              <h2 className="text-white text-2xl font-black mb-2">
                Oh no! Your shop missed you!
              </h2>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm font-bold">
                  You were away for {daysMissed} day{daysMissed > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Consequences */}
            <div className="px-5 pb-4 space-y-2.5">
              {consequences.map((consequence, i) => (
                <motion.div
                  key={consequence.type + i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.15 }}
                  className="flex items-start gap-3 p-3.5 rounded-2xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span className="text-3xl flex-shrink-0 mt-0.5">{consequence.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm mb-0.5">{consequence.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.45)' }}>
                      {consequence.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Encouragement */}
            <div className="px-5 pb-6">
              <p className="text-center text-sm mb-4" style={{ color: 'rgba(255, 255, 255, 0.35)' }}>
                Don't worry! You can make it all better by playing every day.
              </p>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-2xl text-white text-lg font-black flex items-center justify-center gap-2 min-h-[52px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.7), rgba(236, 72, 153, 0.7))',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Heart className="w-5 h-5" />
                I'll take better care!
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
