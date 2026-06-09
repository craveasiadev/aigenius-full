import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Zap, Star as Stars, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Confetti } from './Confetti';
import { getRandomQuestions } from '../utils/questionBank';
import type { InteractiveQuestionData } from './InteractiveQuestion';

interface AIGenerationModalProps {
  isOpen: boolean;
  previewUrl: string;
  onConfirm: () => void;
  onChooseAgain: () => void;
  onComplete: () => void;
}

type Stage = 'confirm' | 'generating' | 'questions' | 'complete';

export const AIGenerationModal = ({
  isOpen,
  previewUrl,
  onConfirm,
  onChooseAgain,
  onComplete
}: AIGenerationModalProps) => {
  const [stage, setStage] = useState<Stage>('confirm');
  const [questions, setQuestions] = useState<InteractiveQuestionData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userText, setUserText] = useState('');

  useEffect(() => {
    if (isOpen && stage === 'confirm') {
      // Get 3 random questions when modal opens
      const randomQuestions = getRandomQuestions(3);
      setQuestions(randomQuestions);
    }
  }, [isOpen, stage]);

  const handleConfirm = () => {
    onConfirm();
    setStage('generating');

    // Show AI animation for 3 seconds, then show questions
    setTimeout(() => {
      setStage('questions');
    }, 3000);
  };

  const handleAnswerSelect = (answer: string | number) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null && !userText.trim()) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = currentQuestion.type === 'reflection'
      ? true
      : currentQuestion.type === 'fill-blank'
      ? userText.toLowerCase().trim() === (currentQuestion.correctAnswer as string).toLowerCase().trim()
      : selectedAnswer === currentQuestion.correctAnswer;

    setShowResult(true);

    if (isCorrect) {
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);

      // If all 3 answered correctly
      if (newCorrectCount === 3) {
        setShowConfetti(true);
        setTimeout(() => {
          onComplete();
          resetModal();
        }, 2500);
      } else {
        // Move to next question
        setTimeout(() => {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setUserText('');
          setShowResult(false);
        }, 1500);
      }
    } else {
      // Reset on wrong answer
      setTimeout(() => {
        setSelectedAnswer(null);
        setUserText('');
        setShowResult(false);
      }, 2000);
    }
  };

  const resetModal = () => {
    setStage('confirm');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setShowResult(false);
    setShowConfetti(false);
    setUserText('');
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const hasValidQuestion = currentQuestion && stage === 'questions';

  return (
    <AnimatePresence>
      <>
        <Confetti show={showConfetti} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">

          {/* Confirmation Stage */}
          {stage === 'confirm' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative rounded-3xl p-8 max-w-lg w-full"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 blur-2xl"
              />

              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-6 flex items-center justify-center"
                >
                  <Sparkles className="w-12 h-12 text-purple-400" />
                </motion.div>

                <h3 className="text-2xl font-bold text-center mb-4 text-white">
                  Ready to Create Magic?
                </h3>

                <div className="mb-6 rounded-2xl overflow-hidden border-2 border-purple-400/50">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-64 object-cover"
                  />
                </div>

                <p className="text-center text-purple-200 mb-8">
                  Our AI will transform your artwork into an amazing story page!
                </p>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onChooseAgain}
                    className="px-4 py-3 rounded-xl font-medium text-sm text-white border-2 border-purple-400/50 hover:border-purple-400 transition-all"
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                  >
                    &lt; Choose Picture Again
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirm}
                    className="flex-1 py-3 rounded-xl font-bold text-white text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                      boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)'
                    }}
                  >
                    Confirm & Generate
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Generating Stage */}
          {stage === 'generating' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative rounded-3xl p-12 max-w-md w-full"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 0, 80, 0.95), rgba(80, 0, 100, 0.95))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.5)'
              }}
            >
              <div className="relative flex flex-col items-center">
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                    scale: { duration: 1.5, repeat: Infinity }
                  }}
                  className="mb-8"
                >
                  <Brain className="w-24 h-24 text-purple-400" />
                </motion.div>

                <motion.h3
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl font-bold text-center mb-4 text-white"
                >
                  AI Generating...
                </motion.h3>

                <div className="flex gap-2 mb-8">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -20, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                      className="w-3 h-3 rounded-full bg-purple-400"
                    />
                  ))}
                </div>

                <div className="flex gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Sparkles className="w-8 h-8 text-pink-400" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                  >
                    <Zap className="w-8 h-8 text-yellow-400" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                  >
                    <Stars className="w-8 h-8 text-purple-400" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Questions Stage */}
          {hasValidQuestion && (
            <motion.div
              key={`question-${currentQuestionIndex}`}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="relative rounded-3xl p-8 max-w-2xl w-full"
              style={{
                background: 'linear-gradient(135deg, rgba(20, 0, 60, 0.98), rgba(60, 0, 80, 0.98))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(139, 92, 246, 0.5)',
                boxShadow: '0 20px 60px rgba(139, 92, 246, 0.5)'
              }}
            >
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-purple-300 font-semibold">
                    Question {currentQuestionIndex + 1} of 3
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`w-3 h-3 rounded-full ${
                          i < correctCount ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <motion.h3
                  key={`question-text-${currentQuestionIndex}`}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  {currentQuestion.question}
                </motion.h3>
              </div>

              {currentQuestion.type === 'multiple-choice' && (
                <div className="space-y-3 mb-6">
                  {currentQuestion.options?.map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={`${currentQuestionIndex}-option-${index}`}
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={!showResult ? { scale: 1.02, x: 5 } : {}}
                        whileTap={!showResult ? { scale: 0.98 } : {}}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        className={`w-full text-left px-6 py-4 rounded-2xl font-medium text-lg transition-all ${
                          showCorrect
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-2 border-green-400'
                            : showWrong
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white border-2 border-red-400'
                            : isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-2 border-purple-400'
                            : 'bg-black/40 text-white border-2 border-purple-600/30 hover:border-purple-500'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            showCorrect || showWrong || isSelected ? 'bg-white/20 text-white' : 'bg-purple-700 text-purple-200'
                          }`}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="flex-1">{option}</span>
                          {showCorrect && <CheckCircle className="w-6 h-6" />}
                          {showWrong && <XCircle className="w-6 h-6" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'true-false' && (
                <div className="flex gap-4 mb-6">
                  {['True', 'False'].map((option, index) => {
                    const isSelected = selectedAnswer === index;
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const showCorrect = showResult && isCorrect;
                    const showWrong = showResult && isSelected && !isCorrect;

                    return (
                      <motion.button
                        key={`${currentQuestionIndex}-${option}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.2 }}
                        whileHover={!showResult ? { scale: 1.05, y: -5 } : {}}
                        whileTap={!showResult ? { scale: 0.95 } : {}}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        className={`flex-1 px-6 py-6 rounded-2xl font-bold text-xl transition-all ${
                          showCorrect
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                            : showWrong
                            ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
                            : isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-black/40 text-white border-2 border-purple-600/30 hover:border-purple-500'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {option}
                          {showCorrect && <CheckCircle className="w-5 h-5" />}
                          {showWrong && <XCircle className="w-5 h-5" />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'fill-blank' && (
                <motion.input
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  type="text"
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  disabled={showResult}
                  placeholder="Type your answer..."
                  className={`w-full px-6 py-4 rounded-2xl font-medium text-lg border-2 transition-all mb-6 ${
                    showResult
                      ? userText.toLowerCase().trim() === (currentQuestion.correctAnswer as string).toLowerCase().trim()
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'bg-red-500/20 border-red-500 text-red-300'
                      : 'bg-black/40 border-purple-600/50 focus:border-purple-500 text-white placeholder-purple-300/50 focus:outline-none'
                  }`}
                />
              )}

              {currentQuestion.type === 'reflection' && (
                <motion.textarea
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  disabled={showResult}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className={`w-full px-6 py-4 rounded-2xl font-medium text-lg border-2 transition-all mb-6 resize-none ${
                    showResult
                      ? 'bg-green-500/20 border-green-500 text-green-300'
                      : 'bg-black/40 border-purple-600/50 focus:border-purple-500 text-white placeholder-purple-300/50 focus:outline-none'
                  }`}
                />
              )}

              <AnimatePresence mode="wait">
                {!showResult && (
                  <motion.button
                    key="submit-button"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={
                      (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'true-false') && selectedAnswer === null ||
                      (currentQuestion.type === 'fill-blank' || currentQuestion.type === 'reflection') && !userText.trim()
                    }
                    className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
                      (selectedAnswer !== null || userText.trim())
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-2xl hover:shadow-purple-500/50'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {currentQuestion.type === 'reflection' ? 'Submit' : 'Check Answer'}
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {showResult && currentQuestion.explanation && (
                  <motion.div
                    key="result-explanation"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-4 rounded-2xl text-white ${
                      currentQuestion.type === 'reflection' ||
                      selectedAnswer === currentQuestion.correctAnswer ||
                      userText.toLowerCase().trim() === (currentQuestion.correctAnswer as string)?.toLowerCase().trim()
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-blue-500/20 border-2 border-blue-500'
                    }`}
                  >
                    <p className="font-bold mb-2">
                      {currentQuestion.type === 'reflection' ||
                       selectedAnswer === currentQuestion.correctAnswer ||
                       userText.toLowerCase().trim() === (currentQuestion.correctAnswer as string)?.toLowerCase().trim()
                        ? '✓ Great answer!'
                        : '💡 Learn more:'}
                    </p>
                    <p className="text-sm">{currentQuestion.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </>
    </AnimatePresence>
  );
};
