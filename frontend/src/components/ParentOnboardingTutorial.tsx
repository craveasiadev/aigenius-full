import { useEffect, useMemo, useState, type ElementType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CheckCircle2, Compass, Link2, PlusCircle, ShieldCheck } from 'lucide-react';

interface ParentOnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToDashboard: () => void;
  onGoToAddChild: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  gradient: string;
  actionLabel?: string;
  action?: () => void;
}

export const ParentOnboardingTutorial = ({
  isOpen,
  onClose,
  onGoToDashboard,
  onGoToAddChild,
}: ParentOnboardingTutorialProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<TutorialStep[]>(() => ([
    {
      id: 'welcome',
      title: 'Parent Setup Ready',
      description: 'Your parent account is complete. Next step is setting up how your child logs in and learns.',
      icon: ShieldCheck,
      gradient: 'from-fuchsia-500 to-rose-500',
    },
    {
      id: 'dashboard',
      title: 'Use Parent Dashboard',
      description: 'Go to Dashboard anytime to view all children and click Continue Learning for each child profile.',
      icon: Compass,
      gradient: 'from-indigo-500 to-purple-500',
      actionLabel: 'Open Dashboard',
      action: onGoToDashboard,
    },
    {
      id: 'add-child',
      title: 'Add Child Profile',
      description: 'Use Add Genius to create a child profile with Genius ID and password. Save these credentials for student login.',
      icon: PlusCircle,
      gradient: 'from-cyan-500 to-blue-500',
      actionLabel: 'Add Child Now',
      action: onGoToAddChild,
    },
    {
      id: 'link-child',
      title: 'Link Existing Child',
      description: 'If a student already has a standalone account, use Link Existing Child with Genius ID + password verification.',
      icon: Link2,
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'done',
      title: 'You Are Ready',
      description: 'Registration, dashboard flow, add child, and link-child flow are now set. You can replay this guide anytime.',
      icon: CheckCircle2,
      gradient: 'from-amber-500 to-orange-500',
    },
  ]), [onGoToAddChild, onGoToDashboard]);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = steps[stepIndex];
  const Icon = step.icon;
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleAction = () => {
    step.action?.();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#151522] overflow-hidden shadow-2xl"
        >
          <div className={`h-1.5 w-full bg-gradient-to-r ${step.gradient}`} />

          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-xs uppercase tracking-wider text-gray-400">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <button
                onClick={onClose}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Skip
              </button>
            </div>

            <div className="flex items-start gap-4 mb-5">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{step.title}</h2>
                <p className="text-gray-300 mt-2 leading-relaxed">{step.description}</p>
              </div>
            </div>

            <div className="flex gap-1.5 mb-6">
              {steps.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${idx === stepIndex ? `w-8 bg-gradient-to-r ${step.gradient}` : idx < stepIndex ? 'w-3 bg-white/40' : 'w-3 bg-white/15'
                    }`}
                />
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBack}
                disabled={stepIndex === 0}
                className="sm:w-auto w-full px-4 py-3 rounded-xl border border-white/10 text-gray-200 disabled:text-gray-600 disabled:border-white/5 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleNext}
                className={`sm:flex-1 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${step.gradient} flex items-center justify-center gap-2`}
              >
                {isLastStep ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
              {step.action && (
                <button
                  onClick={handleAction}
                  className="sm:w-auto w-full px-4 py-3 rounded-xl border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 transition-colors"
                >
                  {step.actionLabel || 'Open'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ParentOnboardingTutorial;
