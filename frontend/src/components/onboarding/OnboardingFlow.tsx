/**
 * Onboarding Flow Orchestrator
 *
 * Controls the sequential onboarding stages:
 * 1. Boss Introduction
 * 2. Shop Image Capture
 * 3. Shop Questionnaire
 * 4. Boss Selfie Capture
 * 5. Shop Generation (async)
 * 6. Complete -> Dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onboardingApi, OnboardingStage } from '../../services/onboardingApi';
import BossIntroModal from './BossIntroModal';
import SelfieCapture from './SelfieCapture';
import ShopQuestionnaire from './ShopQuestionnaire';

interface OnboardingFlowProps {
  onComplete: () => void;
  onClose?: () => void;
  studentName?: string;
  skipBossIntro?: boolean;
  skipQuestionnaire?: boolean; // If true, skip questions (shop image -> selfie -> generate)
}

export const OnboardingFlow = ({
  onComplete,
  onClose,
  studentName = 'Friend',
  skipBossIntro = false,
  skipQuestionnaire = false,
}: OnboardingFlowProps) => {
  // If skipBossIntro is true, start at shop image stage directly.
  const [currentStage, setCurrentStage] = useState<OnboardingStage>(skipBossIntro ? 'boss_intro_completed' : 'not_started');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildDefaultQuestionnaire = useCallback(() => {
    return {
      passion_category: 'art',
      shop_theme: 'modern',
      color_palette: ['blue', 'teal', 'purple'],
      unique_selling_point: 'creative',
      shop_name: `${studentName}'s Shop`,
    };
  }, [studentName]);

  const ensureQuestionnaireForSkip = useCallback(async () => {
    if (!skipQuestionnaire) return;

    const response = await onboardingApi.saveQuestionnaire(buildDefaultQuestionnaire());
    if (!response.success) {
      throw new Error('Failed to auto-save questionnaire for skip mode');
    }
  }, [buildDefaultQuestionnaire, skipQuestionnaire]);

  const finalizeOnboarding = useCallback(async () => {
    const genResponse = await onboardingApi.generateShop();
    if (!genResponse.success) {
      throw new Error('Failed to start shop generation');
    }

    // Keep this call for backend bonus/token initialization.
    await onboardingApi.complete();
    onComplete();
  }, [onComplete]);

  // Load current onboarding status and resume from saved stage.
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await onboardingApi.getStatus();
        if (response.success) {
          const loadedStage = response.stage;

          // Already done or currently generating.
          if (loadedStage === 'completed' || loadedStage === 'shop_generating') {
            onComplete();
            return;
          }

          if (loadedStage === 'selfie_completed') {
            // In the new flow selfie is the final stage, so complete immediately.
            try {
              await finalizeOnboarding();
              return;
            } catch (finalizeError) {
              console.warn('Failed to finalize from selfie_completed stage, resuming onboarding:', finalizeError);

              // Fallback for older in-progress users.
              if (response.signboard_url) {
                setCurrentStage(skipQuestionnaire ? 'questionnaire_completed' : 'signboard_completed');
              } else {
                setCurrentStage('boss_intro_completed');
              }
              return;
            }
          }

          if (loadedStage === 'questionnaire_completed') {
            // New flow: questions done, waiting for final selfie.
            setCurrentStage('questionnaire_completed');
            return;
          }

          if (loadedStage === 'signboard_completed') {
            // Shop image done, continue to questionnaire (or selfie if skipping questions).
            if (skipQuestionnaire) {
              try {
                await ensureQuestionnaireForSkip();
                setCurrentStage('questionnaire_completed');
              } catch (skipError) {
                console.warn('Failed to auto-save questionnaire in skip mode:', skipError);
                setCurrentStage('signboard_completed');
              }
            } else {
              setCurrentStage('signboard_completed');
            }
            return;
          }

          if (loadedStage === 'boss_intro_completed') {
            setCurrentStage('boss_intro_completed');
            return;
          }

          // Not started.
          setCurrentStage(skipBossIntro ? 'boss_intro_completed' : 'not_started');
        }
      } catch (err) {
        console.error('Failed to load onboarding status:', err);
        // On error, start from beginning based on skipBossIntro prop.
        setCurrentStage(skipBossIntro ? 'boss_intro_completed' : 'not_started');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [ensureQuestionnaireForSkip, finalizeOnboarding, onComplete, skipBossIntro, skipQuestionnaire]);

  // Handle boss intro completion.
  //
  // The backend `/aipreneur/onboarding/boss-intro` endpoint sometimes fails
  // for reasons orthogonal to UX (cold-start, auth token edge cases, dev
  // backend not running). Previously this trapped the user on a "Failed to
  // continue" toast with no way forward except clicking the same button
  // again. Now: we log the error, surface a single recoverable warning, and
  // still advance the local stage so the user reaches the questionnaire +
  // selfie steps. The backend status will sync up on the next API call.
  const handleBossIntroComplete = useCallback(async () => {
    try {
      setError(null);
      const response = await onboardingApi.completeBossIntro();
      if (response.success) {
        setCurrentStage('boss_intro_completed');
        return;
      }
    } catch (err) {
      console.error('[onboarding] completeBossIntro failed; advancing locally:', err);
      // Brief non-blocking warning, auto-dismiss after 4 s. We DO advance.
      setError('Heads up: your progress couldn\'t sync online — continuing anyway.');
      setTimeout(() => setError(null), 4000);
    }
    setCurrentStage('boss_intro_completed');
  }, []);

  // Handle shop image upload.
  const handleShopImageComplete = useCallback(async (base64Image: string) => {
    try {
      setError(null);
      const response = await onboardingApi.uploadSignboard(base64Image);
      if (response.success) {
        if (skipQuestionnaire) {
          await ensureQuestionnaireForSkip();
          setCurrentStage('questionnaire_completed');
        } else {
          setCurrentStage('signboard_completed');
        }
      }
    } catch (err) {
      setError('Failed to upload shop image. Please try again.');
      console.error(err);
    }
  }, [ensureQuestionnaireForSkip, skipQuestionnaire]);

  // Handle questionnaire completion.
  const handleQuestionnaireComplete = useCallback(async (answers: {
    passion_category: string;
    shop_theme: string;
    color_palette: string[];
    unique_selling_point: string;
    shop_name: string;
  }) => {
    try {
      setError(null);

      const questResponse = await onboardingApi.saveQuestionnaire(answers);
      if (!questResponse.success) {
        throw new Error('Failed to save questionnaire');
      }

      setCurrentStage('questionnaire_completed');
    } catch (err) {
      setError('Failed to save questions. Please try again.');
      console.error(err);
    }
  }, []);

  // Handle final boss selfie upload and complete onboarding.
  const handleBossSelfieComplete = useCallback(async (base64Image: string) => {
    try {
      setError(null);
      const response = await onboardingApi.uploadSelfie(base64Image);
      if (response.success) {
        await finalizeOnboarding();
      }
    } catch (err) {
      setError('Failed to complete setup. Please try again.');
      console.error(err);
    }
  }, [finalizeOnboarding]);

  // Skip to specific stage (for navigation).
  const goToStage = (stage: OnboardingStage) => {
    setCurrentStage(stage);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your adventure...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Close button for skipped boss intro mode */}
      {onClose && skipBossIntro && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-[70] w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <AnimatePresence mode="wait">
        {/* Error toast — safe-area-aware so it doesn't slide under the iOS
            notch. Constrained width so long messages wrap nicely on phones
            rather than spanning ear-to-ear of the device. Amber for "warn",
            red only for blocking failures (we don't have any of those any
            more — boss-intro now auto-advances). */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 -translate-x-1/2 max-w-[calc(100vw-32px)] sm:max-w-md px-4 py-2.5 rounded-xl shadow-lg z-[60] bg-amber-500 text-white text-sm font-medium text-center"
            style={{ top: 'max(env(safe-area-inset-top), 12px)' }}
            role="status"
          >
            {error}
          </motion.div>
        )}

        {/* Stage 1: Boss Introduction */}
        {currentStage === 'not_started' && (
          <BossIntroModal
            key="boss-intro"
            studentName={studentName}
            onComplete={handleBossIntroComplete}
          />
        )}

        {/* Stage 2: Shop Image Capture */}
        {currentStage === 'boss_intro_completed' && (
          <SelfieCapture
            key="shop-image"
            captureType="shop"
            onComplete={handleShopImageComplete}
            onBack={() => (skipBossIntro && onClose ? onClose() : goToStage('not_started'))}
          />
        )}

        {/* Stage 3: Shop Questionnaire */}
        {currentStage === 'signboard_completed' && (
          <ShopQuestionnaire
            key="questionnaire"
            studentName={studentName}
            onComplete={handleQuestionnaireComplete}
            onBack={() => goToStage('boss_intro_completed')}
          />
        )}

        {/* Stage 4: Boss Selfie */}
        {currentStage === 'questionnaire_completed' && (
          <SelfieCapture
            key="boss-selfie"
            captureType="selfie"
            onComplete={handleBossSelfieComplete}
            onBack={() => goToStage(skipQuestionnaire ? 'boss_intro_completed' : 'signboard_completed')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
