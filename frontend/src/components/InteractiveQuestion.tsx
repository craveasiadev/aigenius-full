import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle, MessageCircle, Sparkles, Lightbulb, Trophy, Star } from 'lucide-react';
import { Confetti } from './Confetti';

export type QuestionType =
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blank'
  | 'reflection';

export interface InteractiveQuestionData {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  hint?: string;
  explanation?: string;
}

interface InteractiveQuestionProps {
  question: InteractiveQuestionData;
  onAnswer?: (correct: boolean) => void;
  onComplete?: () => void;
  onNavigateNext?: () => void;
}

const optionEmojis = ['🎯', '⭐', '💎', '🏆', '🎨', '🚀', '💡', '🔥'];
const optionGradients = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-green-500 to-emerald-500',
  'from-orange-500 to-red-500',
  'from-yellow-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-green-500',
];

export const InteractiveQuestion = ({ question, onAnswer, onComplete, onNavigateNext }: InteractiveQuestionProps) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [userText, setUserText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!question || !question.type) {
    return null;
  }

  const handleSubmit = () => {
    if (question.type === 'reflection') {
      setShowResult(true);
      setTimeout(() => {
        onAnswer?.(true);
        onComplete?.();
      }, 1500);
      return;
    }

    if (selectedAnswer === null && !userText) return;

    const isCorrect = question.type === 'fill-blank'
      ? userText.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim()
      : selectedAnswer === question.correctAnswer;

    setShowResult(true);

    if (isCorrect) {
      setShowConfetti(true);
      setTimeout(() => {
        onAnswer?.(true);
        onComplete?.();
        if (onNavigateNext) {
          onNavigateNext();
        }
        setShowResult(false);
        setSelectedAnswer(null);
        setUserText('');
        setShowConfetti(false);
      }, 2500);
    } else {
      onAnswer?.(false);
    }
  };

  const handleReset = () => {
    setShowResult(false);
    setSelectedAnswer(null);
    setUserText('');
    setShowHint(false);
    setShowConfetti(false);
  };

  const isCorrect = question.type === 'fill-blank'
    ? userText.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim()
    : selectedAnswer === question.correctAnswer;

  return (
    <>
      <Confetti show={showConfetti} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-6 md:p-8 border-2 border-purple-300/50 dark:border-purple-500/50 shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.15))',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
      >
        <motion.div
          className="absolute inset-0 opacity-20"
          animate={{
            background: [
              'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.3), transparent 50%)',
              'radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.3), transparent 50%)',
              'radial-gradient(circle at 20% 20%, rgba(139, 92, 246, 0.3), transparent 50%)',
            ],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        <div className="relative z-10">
          <div className="flex items-start gap-3 mb-6">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              {question.type === 'reflection' ? (
                <MessageCircle className="w-6 h-6 text-white" />
              ) : (
                <HelpCircle className="w-6 h-6 text-white" />
              )}
            </motion.div>
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-2 shadow-md"
              >
                <Sparkles className="w-3 h-3 text-white" />
                <span className="text-xs font-bold text-white">
                  {question.type === 'reflection' ? 'THINK & SHARE' : 'QUICK QUIZ'}
                </span>
              </motion.div>
              <h3 className="text-lg md:text-xl font-bold leading-snug mb-1" style={{ color: 'var(--text)' }}>
                {question.question}
              </h3>
            </div>
          </div>

          {question.type === 'multiple-choice' && question.options && (
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectOption = index === question.correctAnswer;
                const showCorrect = showResult && isCorrectOption;
                const showWrong = showResult && isSelected && !isCorrectOption;
                const gradient = optionGradients[index % optionGradients.length];
                const emoji = optionEmojis[index % optionEmojis.length];

                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: !showResult ? 1.05 : 1, y: !showResult ? -5 : 0 }}
                    whileTap={{ scale: !showResult ? 0.95 : 1 }}
                    onClick={() => !showResult && setSelectedAnswer(index)}
                    disabled={showResult}
                    className={`relative p-6 rounded-2xl font-bold text-base transition-all overflow-hidden group ${
                      showCorrect
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-2xl ring-4 ring-green-400/50'
                        : showWrong
                        ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-2xl ring-4 ring-red-400/50'
                        : isSelected
                        ? `bg-gradient-to-br ${gradient} text-white shadow-xl ring-4 ring-purple-400/50`
                        : 'bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-lg backdrop-blur-sm'
                    }`}
                    style={!showCorrect && !showWrong && !isSelected ? { color: 'var(--text)' } : {}}
                  >
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${gradient.includes('blue') ? '#3b82f6' : gradient.includes('purple') ? '#a855f7' : gradient.includes('green') ? '#22c55e' : '#f97316'}20, transparent 70%)`,
                      }}
                    />

                    <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                      <motion.div
                        animate={isSelected || showCorrect ? {
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.2, 1.2, 1]
                        } : {}}
                        transition={{ duration: 0.5 }}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-lg ${
                          showCorrect || showWrong || isSelected
                            ? 'bg-white/20'
                            : `bg-gradient-to-br ${gradient}`
                        }`}
                      >
                        {showCorrect || showWrong ? (
                          showCorrect ? '✓' : '✗'
                        ) : emoji}
                      </motion.div>

                      <span className="text-sm md:text-base font-semibold leading-tight break-words">
                        {option}
                      </span>

                      {(showCorrect || showWrong) && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="absolute top-2 right-2"
                        >
                          {showCorrect ? (
                            <CheckCircle className="w-6 h-6 text-white drop-shadow-lg" />
                          ) : (
                            <XCircle className="w-6 h-6 text-white drop-shadow-lg" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {question.type === 'true-false' && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['True', 'False'].map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectOption = index === question.correctAnswer;
                const showCorrect = showResult && isCorrectOption;
                const showWrong = showResult && isSelected && !isCorrectOption;
                const emoji = index === 0 ? '✓' : '✗';
                const gradient = index === 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500';

                return (
                  <motion.button
                    key={option}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: !showResult ? 1.05 : 1, y: !showResult ? -5 : 0 }}
                    whileTap={{ scale: !showResult ? 0.95 : 1 }}
                    onClick={() => !showResult && setSelectedAnswer(index)}
                    disabled={showResult}
                    className={`relative p-8 rounded-2xl font-bold text-lg transition-all overflow-hidden group ${
                      showCorrect
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-2xl ring-4 ring-green-400/50'
                        : showWrong
                        ? 'bg-gradient-to-br from-red-500 to-rose-500 text-white shadow-2xl ring-4 ring-red-400/50'
                        : isSelected
                        ? `bg-gradient-to-br ${gradient} text-white shadow-xl ring-4 ring-purple-400/50`
                        : 'bg-white/80 dark:bg-gray-800/80 border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 shadow-lg backdrop-blur-sm'
                    }`}
                    style={!showCorrect && !showWrong && !isSelected ? { color: 'var(--text)' } : {}}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        animate={isSelected || showCorrect ? {
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.2, 1.2, 1]
                        } : {}}
                        transition={{ duration: 0.5 }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-lg ${
                          showCorrect || showWrong || isSelected
                            ? 'bg-white/20'
                            : `bg-gradient-to-br ${gradient}`
                        }`}
                      >
                        {emoji}
                      </motion.div>
                      <span className="text-xl font-bold">{option}</span>

                      {(showCorrect || showWrong) && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="absolute top-3 right-3"
                        >
                          {showCorrect ? (
                            <CheckCircle className="w-7 h-7 text-white drop-shadow-lg" />
                          ) : (
                            <XCircle className="w-7 h-7 text-white drop-shadow-lg" />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}

          {question.type === 'fill-blank' && (
            <div className="mb-6">
              <motion.input
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                type="text"
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={showResult}
                placeholder="Type your answer here..."
                className={`w-full px-6 py-4 rounded-2xl font-semibold text-base border-2 transition-all shadow-lg ${
                  showResult
                    ? isCorrect
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500 text-green-700 dark:text-green-300 ring-4 ring-green-400/30'
                      : 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border-red-500 text-red-700 dark:text-red-300 ring-4 ring-red-400/30'
                    : 'bg-white/80 dark:bg-gray-800/80 border-purple-300 dark:border-purple-700 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-300/50 backdrop-blur-sm'
                }`}
                style={!showResult ? { color: 'var(--text)' } : {}}
              />
            </div>
          )}

          {question.type === 'reflection' && (
            <div className="mb-6">
              <motion.textarea
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                disabled={showResult}
                placeholder="Share your wonderful thoughts here..."
                rows={4}
                className="w-full px-6 py-4 rounded-2xl font-medium text-base border-2 border-purple-300 dark:border-purple-700 bg-white/80 dark:bg-gray-800/80 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-300/50 resize-none transition-all shadow-lg backdrop-blur-sm"
                style={{ color: 'var(--text)' }}
              />
            </div>
          )}

          <AnimatePresence>
            {showResult && question.explanation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className={`mb-6 p-5 rounded-2xl shadow-lg border-2 ${
                  isCorrect || question.type === 'reflection'
                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-400/50 dark:border-green-600/50'
                    : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-400/50 dark:border-blue-600/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect || question.type === 'reflection' ? (
                    <Trophy className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <Lightbulb className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`font-bold text-base mb-2 ${
                      isCorrect || question.type === 'reflection'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}>
                      {isCorrect || question.type === 'reflection' ? '✓ Amazing Work!' : '💡 Learn More:'}
                    </p>
                    <p className={`text-sm leading-relaxed ${
                      isCorrect || question.type === 'reflection'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-blue-800 dark:text-blue-200'
                    }`}>
                      {question.explanation}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            {!showResult && (
              <>
                {question.hint && (
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowHint(!showHint)}
                    className="px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-orange-400 text-white hover:from-yellow-500 hover:to-orange-500 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHint ? 'Hide Hint' : 'Need a Hint?'}
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={
                    (question.type === 'multiple-choice' || question.type === 'true-false') && selectedAnswer === null ||
                    (question.type === 'fill-blank' && !userText.trim()) ||
                    (question.type === 'reflection' && !userText.trim())
                  }
                  className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all shadow-xl flex items-center justify-center gap-2 ${
                    (selectedAnswer !== null || userText.trim())
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 ring-4 ring-purple-400/30'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Star className="w-5 h-5" />
                  {question.type === 'reflection' ? 'Submit Answer' : 'Check Answer'}
                </motion.button>
              </>
            )}
            {showResult && !isCorrect && question.type !== 'reflection' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                className="flex-1 py-4 rounded-2xl font-bold text-base bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-xl ring-4 ring-blue-400/30"
              >
                🔄 Try Again
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {showHint && question.hint && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="p-5 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-2xl border-2 border-yellow-400/50 dark:border-yellow-600/50 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-base text-yellow-700 dark:text-yellow-300 mb-1">
                      💡 Helpful Hint
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 leading-relaxed">
                      {question.hint}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};
