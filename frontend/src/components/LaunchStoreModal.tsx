import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Rocket, Sparkles, CheckCircle, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Confetti } from './Confetti';

interface LaunchStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  shopName: string;
  allModulesComplete: boolean;
  onLaunchComplete: () => void;
}

const shopThemes = [
  { id: 'modern', name: 'Modern & Clean', emoji: '✨', gradient: 'from-gray-400 to-gray-600' },
  { id: 'fun', name: 'Fun & Colorful', emoji: '🎨', gradient: 'from-pink-500 to-purple-500' },
  { id: 'eco', name: 'Eco & Natural', emoji: '🌿', gradient: 'from-green-500 to-emerald-600' },
  { id: 'tech', name: 'Futuristic Tech', emoji: '🚀', gradient: 'from-cyan-500 to-blue-600' },
  { id: 'luxury', name: 'Luxury Premium', emoji: '👑', gradient: 'from-amber-500 to-yellow-600' },
  { id: 'cozy', name: 'Cute & Cozy', emoji: '🧸', gradient: 'from-yellow-400 to-orange-500' }
];

export const LaunchStoreModal = ({
  isOpen,
  onClose,
  studentId,
  shopName,
  allModulesComplete,
  onLaunchComplete
}: LaunchStoreModalProps) => {
  const [step, setStep] = useState<'check' | 'theme' | 'launching' | 'success'>('check');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
  };

  const handleLaunch = async () => {
    if (!selectedTheme) return;

    setStep('launching');

    try {
      const shopSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      await supabase
        .from('aipreneur_business')
        .update({
          shop_theme: selectedTheme,
          shop_launched: true,
          launched_at: new Date().toISOString(),
          shop_slug: shopSlug,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      const { data: rewards } = await supabase
        .from('rewards')
        .select('coins, badges')
        .eq('student_id', studentId)
        .single();

      await supabase
        .from('rewards')
        .update({
          coins: (rewards?.coins || 0) + 50,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', studentId);

      const currentBadges = rewards?.badges || [];
      if (!currentBadges.includes('Entrepreneur')) {
        await supabase
          .from('rewards')
          .update({
            badges: [...currentBadges, 'Entrepreneur']
          })
          .eq('student_id', studentId);
      }

      setShowConfetti(true);
      setStep('success');
      setTimeout(() => {
        onLaunchComplete();
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error launching store:', error);
      setStep('theme');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        {showConfetti && <Confetti />}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="max-w-2xl w-full bg-[#1a1a24] rounded-3xl border border-gray-800 overflow-hidden"
        >
          {step !== 'success' && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* Step 1: Check Eligibility */}
          {step === 'check' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Rocket className="w-20 h-20 mx-auto mb-4 text-cyan-400" />
                <h2 className="text-4xl font-bold text-white mb-2">Launch Your Shop!</h2>
                <p className="text-lg text-gray-300">
                  {allModulesComplete ? "You're ready to go live!" : "Complete all modules first"}
                </p>
              </div>

              {allModulesComplete ? (
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 1: Product Created ✓</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 2: Shop Decorated ✓</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 3: Staff Managed ✓</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 4: Marketing Complete ✓</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 5: Tech Upgraded ✓</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <span className="text-white font-semibold">Module 6: CSR Established ✓</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-8">
                  <p className="text-yellow-200 text-center">
                    Complete all 6 modules to unlock store launch!
                  </p>
                </div>
              )}

              <motion.button
                whileHover={{ scale: allModulesComplete ? 1.02 : 1 }}
                whileTap={{ scale: allModulesComplete ? 0.98 : 1 }}
                onClick={() => allModulesComplete && setStep('theme')}
                disabled={!allModulesComplete}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold text-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {allModulesComplete ? 'Continue to Launch 🚀' : 'Complete Modules First'}
              </motion.button>
            </div>
          )}

          {/* Step 2: Select Theme */}
          {step === 'theme' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Store className="w-20 h-20 mx-auto mb-4 text-pink-400" />
                <h2 className="text-4xl font-bold text-white mb-2">Choose Your Shop Theme</h2>
                <p className="text-lg text-gray-300">
                  Pick a style that matches your vision for {shopName}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {shopThemes.map((theme) => (
                  <motion.button
                    key={theme.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleThemeSelect(theme.id)}
                    className={`p-6 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white border-4 transition-all ${
                      selectedTheme === theme.id ? 'border-white scale-105' : 'border-white/20'
                    }`}
                  >
                    <div className="text-5xl mb-3">{theme.emoji}</div>
                    <h3 className="font-bold">{theme.name}</h3>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: selectedTheme ? 1.02 : 1 }}
                whileTap={{ scale: selectedTheme ? 0.98 : 1 }}
                onClick={handleLaunch}
                disabled={!selectedTheme}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Launch My Shop! 🎉
              </motion.button>
            </div>
          )}

          {/* Step 3: Launching */}
          {step === 'launching' && (
            <div className="p-8 text-center">
              <div className="animate-pulse mb-8">
                <Sparkles className="w-24 h-24 mx-auto text-cyan-400" />
              </div>
              <h2 className="text-4xl font-bold text-white mb-4">Launching Your Shop...</h2>
              <p className="text-lg text-gray-300">Setting up your storefront</p>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="p-8 text-center">
              <CheckCircle className="w-24 h-24 mx-auto mb-6 text-green-400" />
              <h2 className="text-5xl font-bold text-white mb-4">Congratulations! 🎉</h2>
              <p className="text-2xl text-gray-300 mb-8">
                {shopName} is now live!
              </p>

              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 max-w-md mx-auto">
                <h3 className="text-xl font-bold text-white mb-4">Launch Rewards:</h3>
                <div className="space-y-2 text-lg text-gray-300">
                  <p>✨ +50 Bonus Coins</p>
                  <p>🏆 Entrepreneur Badge</p>
                  <p>🏪 Your shop is now public!</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
