import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, Brain, X } from 'lucide-react';
import { PersonaQuestion, selectRandomQuestions, PERSONA_QUESTIONS } from '../utils/personaQuestions';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';
import { personaApi } from '../services/aipreneurApi';

interface PersonaQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const PersonaQuizModal = ({ isOpen, onClose, onComplete }: PersonaQuizModalProps) => {
  const { geniusProfile } = useGeniusAuth();
  const [stage, setStage] = useState<'welcome' | 'quiz' | 'generating' | 'complete'>('welcome');
  const [questions, setQuestions] = useState<PersonaQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  type SavedProgress = {
    questionIds: string[];
    answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
    currentIndex: number;
    stage: 'quiz';
    updatedAt: string;
  };

  const storageKey = geniusProfile?.id ? `persona-quiz-progress-${geniusProfile.id}` : null;

  const loadProgress = (): SavedProgress | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SavedProgress;
      if (!parsed?.questionIds?.length) return null;
      return parsed;
    } catch (error) {
      console.warn('[PersonaQuizModal] Failed to load saved progress:', error);
      return null;
    }
  };

  const saveProgress = (data: SavedProgress) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('[PersonaQuizModal] Failed to save progress:', error);
    }
  };

  const clearProgress = () => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('[PersonaQuizModal] Failed to clear progress:', error);
    }
  };

  const handleClose = useCallback(() => {
    if (isOpen && stage === 'quiz' && questions.length > 0) {
      saveProgress({
        questionIds: questions.map((question) => question.id),
        answers,
        currentIndex,
        stage: 'quiz',
        updatedAt: new Date().toISOString(),
      });
      setHasSavedProgress(true);
    }
    onClose();
  }, [isOpen, stage, questions, answers, currentIndex, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const saved = loadProgress();
    if (saved) {
      const restoredQuestions = saved.questionIds
        .map((id) => PERSONA_QUESTIONS.find((question) => question.id === id))
        .filter(Boolean) as PersonaQuestion[];

      if (restoredQuestions.length === saved.questionIds.length) {
        setQuestions(restoredQuestions);
        setAnswers(saved.answers || {});
        setCurrentIndex(Math.min(saved.currentIndex || 0, restoredQuestions.length - 1));
        setStage('quiz');
        setIsSubmitting(false);
        setHasSavedProgress(true);
        return;
      }
    }

    const selected = selectRandomQuestions(10);
    setQuestions(selected);
    setAnswers({});
    setCurrentIndex(0);
    setStage('welcome');
    setIsSubmitting(false);
    setHasSavedProgress(false);
  }, [isOpen, geniusProfile?.id]);

  useEffect(() => {
    if (!isOpen) {
      setStage('welcome');
      setCurrentIndex(0);
      setAnswers({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  useEffect(() => {
    if (!isOpen || stage !== 'quiz' || questions.length === 0) return;

    saveProgress({
      questionIds: questions.map((question) => question.id),
      answers,
      currentIndex,
      stage: 'quiz',
      updatedAt: new Date().toISOString(),
    });
    setHasSavedProgress(true);
  }, [isOpen, stage, questions, answers, currentIndex]);

  const handleStart = () => {
    setStage('quiz');
  };

  const handleStartOver = () => {
    clearProgress();
    setHasSavedProgress(false);
    const selected = selectRandomQuestions(10);
    setQuestions(selected);
    setAnswers({});
    setCurrentIndex(0);
    setIsSubmitting(false);
    setStage('quiz');
  };

  const handleSimulateAll = () => {
    // Automatically answer all questions with random answers
    const simulatedAnswers: Record<string, 'A' | 'B' | 'C' | 'D'> = {};
    questions.forEach(q => {
      const options: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
      simulatedAnswers[q.id] = options[Math.floor(Math.random() * options.length)];
    });
    setAnswers(simulatedAnswers);
    setCurrentIndex(questions.length - 1);
    setStage('quiz');
  };

  const handleAnswer = (option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers({
      ...answers,
      [questions[currentIndex].id]: option,
    });

    // Automatically move to next question after a short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!geniusProfile) {
      console.error('No genius profile available');
      alert('Unable to save quiz results. Please try refreshing the page.');
      return;
    }

    setIsSubmitting(true);
    setStage('generating');

    try {
      const responses = questions
        .map(question => {
          const answerLabel = answers[question.id];
          if (!answerLabel) return null;
          const selectedOption = question.options.find(opt => opt.label === answerLabel);

          return {
            quiz_type: 'phase1',
            question_id: question.id,
            answer_code: answerLabel.toLowerCase(),
            trait_impacts: selectedOption?.traitImpacts || {},
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      const response = await personaApi.submitQuiz(responses);
      if (!response.success) {
        throw new Error(response.message || 'Unable to save your quiz. Please try again.');
      }

      if (geniusProfile?.id) {
        localStorage.setItem(`persona_quiz_completed_${geniusProfile.id}`, 'true');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      clearProgress();
      setStage('complete');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting persona quiz:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
      });
      setIsSubmitting(false);
      const errorMessage = error?.message || 'There was an error saving your quiz. Please try again.';
      alert(`Error: ${errorMessage}`);
      setStage('quiz');
    }
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allQuestionsAnswered = questions.every(q => answers[q.id]);

  if (stage === 'welcome') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-2xl w-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 flex items-center justify-center transition-colors"
            title={hasSavedProgress ? 'Continue later' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-300/20 rounded-full blur-3xl" />
          <div className="relative z-10">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Brain className="w-12 h-12" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Meet Your Persona Quiz!
            </h1>
            <p className="text-xl mb-2">
              Hey {geniusProfile?.first_name || geniusProfile?.genius_name || 'there'}!
            </p>
            <p className="text-lg mb-8 opacity-90">
              We're going to ask you 10 fun questions to learn how you think and learn. This helps personalize your business and AI journey.
            </p>

            <div className="bg-white/10 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Why take this quiz?
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-2xl">✨</span>
                  <span>Get personalized learning tips for business and AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-2xl">🎯</span>
                  <span>Discover your special strengths and talents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-2xl">🚀</span>
                  <span>Learn the best ways YOU like to learn</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-2xl">🎨</span>
                  <span>Get challenges that match your interests</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="w-full md:w-auto px-12 py-4 bg-white text-blue-600 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
              >
                {hasSavedProgress ? 'Continue Quiz' : "Let's Start!"}
                <ArrowRight className="w-6 h-6" />
              </motion.button>

              {hasSavedProgress && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartOver}
                  className="w-full md:w-auto px-8 py-3 bg-white/15 hover:bg-white/25 text-white rounded-2xl font-bold border-2 border-white/40 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  Start Over
                </motion.button>
              )}

              {import.meta.env.DEV && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSimulateAll}
                  className="w-full md:w-auto px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold border-2 border-white/50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Debug: Auto-Complete
                </motion.button>
              )}
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === 'generating') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-3xl p-12 text-white text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-pulse" />
          <div className="relative z-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-24 h-24 mx-auto mb-6 border-8 border-white/30 border-t-white rounded-full"
          />
          <h2 className="text-3xl font-bold mb-4">
            Generating Your Learning Profile and AI Tips
          </h2>
          <p className="text-xl opacity-90">
            Creating your unique learning experience...
          </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === 'complete') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-2xl w-full bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl p-12 text-white text-center shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-300/20 rounded-full blur-3xl" />
          <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <CheckCircle className="w-24 h-24 mx-auto mb-6" />
          </motion.div>
          <h2 className="text-3xl font-bold mb-4">
            All Done!
          </h2>
          <p className="text-xl opacity-90">
            Your personalized learning journey is ready!
          </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="max-w-4xl w-full">
        <div className="bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-purple-500/20 backdrop-blur-xl rounded-t-3xl p-4 mb-2 border border-white/20 shadow-2xl">
          <div className="flex items-center justify-between text-white mb-2">
            <span className="text-sm font-bold drop-shadow-lg">Question {currentIndex + 1} of {questions.length}</span>
            <span className="text-sm font-bold drop-shadow-lg">{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/20 shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 shadow-lg"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-2xl border border-white/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20 pointer-events-none" />
            <div className="relative z-10">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors"
              title="Save and close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                {currentQuestion.question}
              </h2>
              <p className="text-sm text-white/90">
                Choose the answer that feels most like you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {currentQuestion.options.map((option) => {
                const hoverColors = {
                  'A': 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
                  'B': 'hover:bg-green-100 dark:hover:bg-green-900/30',
                  'C': 'hover:bg-orange-100 dark:hover:bg-orange-900/30',
                  'D': 'hover:bg-purple-100 dark:hover:bg-purple-900/30'
                };

                return (
                  <motion.button
                    key={option.label}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAnswer(option.label)}
                    className={`p-6 rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-3 min-h-[180px] backdrop-blur-sm ${
                      selectedAnswer === option.label
                        ? 'bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 text-white shadow-2xl border-2 border-white/30'
                        : `bg-white/10 dark:bg-gray-800/80 border-2 border-white/20 dark:border-gray-600 ${hoverColors[option.label]} shadow-lg`
                    }`}
                  >
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-2xl ${
                        selectedAnswer === option.label
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {selectedAnswer === option.label ? (
                        <CheckCircle className="w-10 h-10" />
                      ) : (
                        option.label
                      )}
                    </div>
                    <span className={`text-base font-semibold ${
                      selectedAnswer === option.label ? 'text-white' : 'text-white'
                    }`}>
                      {option.text}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all text-white ${
                  currentIndex === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-white/10 dark:hover:bg-gray-700'
                }`}
              >
                <ArrowLeft className="w-5 h-5" />
                Previous
              </button>

              {isLastQuestion ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  disabled={!allQuestionsAnswered || isSubmitting}
                  className={`px-8 py-4 rounded-xl font-bold text-white shadow-xl flex items-center gap-2 ${
                    allQuestionsAnswered && !isSubmitting
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Complete Quiz
                  <CheckCircle className="w-5 h-5" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                  className={`px-8 py-4 rounded-xl font-bold text-white shadow-xl flex items-center gap-2 ${
                    selectedAnswer
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next Question
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              )}
            </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-2 mt-6">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-500 w-8'
                  : answers[questions[index].id]
                  ? 'bg-green-500 w-2'
                  : 'bg-gray-300 dark:bg-gray-600 w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
