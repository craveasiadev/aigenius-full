import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import type { Chapter } from '../types/models';

interface QuizQuestion {
  question_id: string;
  question: string;
  options: { code: string; text: string }[];
}

interface StoryQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  geniusName: string;
  onSubmit: (answers: Record<string, string>) => void;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question_id: 'q1',
    question: 'What sounds most exciting to you?',
    options: [
      { code: 'a', text: 'Discovering something brand new' },
      { code: 'b', text: 'Solving a tricky puzzle' },
      { code: 'c', text: 'Building or creating something' },
      { code: 'd', text: 'Helping others succeed' },
    ],
  },
  {
    question_id: 'q2',
    question: 'When you learn something new, you like to:',
    options: [
      { code: 'a', text: 'See pictures and watch how it works' },
      { code: 'b', text: 'Listen to stories about it' },
      { code: 'c', text: 'Try it yourself right away' },
      { code: 'd', text: 'Talk about it with others' },
    ],
  },
  {
    question_id: 'q3',
    question: 'What makes you feel proud?',
    options: [
      { code: 'a', text: 'Finishing a hard challenge' },
      { code: 'b', text: 'Making something beautiful' },
      { code: 'c', text: 'Being a good friend' },
      { code: 'd', text: 'Learning something new every day' },
    ],
  },
  {
    question_id: 'q4',
    question: 'If you could have a superpower, what would it be?',
    options: [
      { code: 'a', text: 'Super speed to explore everywhere' },
      { code: 'b', text: 'X-ray vision to see hidden things' },
      { code: 'c', text: 'Super strength to build amazing things' },
      { code: 'd', text: 'Mind reading to understand everyone' },
    ],
  },
  {
    question_id: 'q5',
    question: 'What would make this adventure perfect?',
    options: [
      { code: 'a', text: 'Lots of surprises and excitement' },
      { code: 'b', text: 'Cool facts and new knowledge' },
      { code: 'c', text: 'Fun activities and experiments' },
      { code: 'd', text: 'Meeting interesting characters' },
    ],
  },
];

export const StoryQuizModal = ({ isOpen, onClose, chapter, geniusName, onSubmit }: StoryQuizModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentStep];
  const progress = ((currentStep + 1) / QUIZ_QUESTIONS.length) * 100;

  const handleAnswer = (code: string) => {
    setAnswers({ ...answers, [currentQuestion.question_id]: code });

    if (currentStep < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => setCurrentStep(currentStep + 1), 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== QUIZ_QUESTIONS.length) {
      return;
    }

    setIsSubmitting(true);
    await onSubmit(answers);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1a1a24] rounded-3xl w-full max-w-2xl p-8 border border-gray-800 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-gray-900/90 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-4xl">{chapter.icon}</div>
              <div>
                <h2 className="text-2xl font-bold text-white">{chapter.title}</h2>
                <p className="text-sm text-gray-400">Personalize {geniusName}'s Adventure</p>
              </div>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-2">
              <motion.div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Question {currentStep + 1} of {QUIZ_QUESTIONS.length}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="text-xl font-bold text-white mb-6">{currentQuestion.question}</h3>

              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  const isSelected = answers[currentQuestion.question_id] === option.code;

                  return (
                    <motion.button
                      key={option.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswer(option.code)}
                      className={`w-full p-4 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500'
                          : 'bg-gray-800/50 border-2 border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{option.text}</span>
                        {isSelected && <Sparkles className="w-5 h-5 text-cyan-400" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                currentStep === 0
                  ? 'opacity-50 cursor-not-allowed text-gray-500'
                  : 'text-cyan-400 hover:bg-cyan-500/10'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {currentStep === QUIZ_QUESTIONS.length - 1 && Object.keys(answers).length === QUIZ_QUESTIONS.length && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Creating Story...
                  </>
                ) : (
                  <>
                    Generate Story
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
