import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { Quiz, QuizItem } from '../types/models';

interface ABCDModalProps {
  quiz: Quiz;
  onComplete: (passed: boolean) => void;
  onClose: () => void;
}

export const ABCDModal = ({ quiz, onComplete, onClose }: ABCDModalProps) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const currentItem = quiz.items[currentItemIndex];
  const isLastItem = currentItemIndex === quiz.items.length - 1;

  // Safety check: if currentItem is undefined, reset to first item
  if (!currentItem && quiz.items.length > 0) {
    setCurrentItemIndex(0);
    return null;
  }

  const handleSelect = (label: string) => {
    if (isAnswered) return;

    setSelected(label);
    setIsAnswered(true);

    const isCorrect = label === currentItem.answer;

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    }

    setTimeout(() => {
      if (isLastItem) {
        const passed = (correctCount + (isCorrect ? 1 : 0)) >= quiz.passingScore;
        console.log('Quiz completed:', { correctCount, isCorrect, passingScore: quiz.passingScore, passed });
        onComplete(passed);
      } else {
        // Move to next question, but don't exceed bounds
        const nextIndex = currentItemIndex + 1;
        if (nextIndex < quiz.items.length) {
          setCurrentItemIndex(nextIndex);
          setSelected(null);
          setIsAnswered(false);
        }
      }
    }, isCorrect ? 1000 : 2000);
  };

  const handleClose = () => {
    setSelected(null);
    setIsAnswered(false);
    setCurrentItemIndex(0);
    setCorrectCount(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={handleClose}
        />
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card rounded-2xl p-6 md:p-8 max-w-2xl w-full mx-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                  Quiz Time! 🎯
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Question {currentItemIndex + 1} of {quiz.items.length}
                </p>
              </div>
              <button onClick={handleClose}>
                <X className="w-6 h-6" style={{ color: 'var(--text)' }} />
              </button>
            </div>

            <p className="text-lg md:text-xl mb-8 font-medium" style={{ color: 'var(--text)' }}>
              {currentItem.question}
            </p>

            {currentItem.type === 'abcd-text' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentItem.options.map((option) => {
                  const isCorrect = option.label === currentItem.answer;
                  const isSelected = selected === option.label;
                  const showResult = isAnswered && isSelected;

                  return (
                    <motion.button
                      key={option.label}
                      onClick={() => handleSelect(option.label)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      animate={
                        showResult
                          ? isCorrect
                            ? { scale: [1, 1.05, 1] }
                            : { x: [-10, 10, -10, 10, 0] }
                          : {}
                      }
                      className={`
                        min-h-[80px] p-6 rounded-xl text-left font-medium text-lg
                        transition-all duration-200
                        ${!isAnswered ? 'glass-card hover:ring-2 hover:ring-accent' : ''}
                        ${showResult && isCorrect ? 'bg-success/20 ring-2 ring-success' : ''}
                        ${showResult && !isCorrect ? 'bg-red-500/20 ring-2 ring-red-500' : ''}
                      `}
                      style={{ color: 'var(--text)' }}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-2xl font-bold text-accent flex-shrink-0">
                          {option.label}
                        </span>
                        <span className="flex-1">{option.text}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {currentItem.options.map((option) => {
                  const isCorrect = option.label === currentItem.answer;
                  const isSelected = selected === option.label;
                  const showResult = isAnswered && isSelected;

                  return (
                    <motion.button
                      key={option.label}
                      onClick={() => handleSelect(option.label)}
                      disabled={isAnswered}
                      whileHover={!isAnswered ? { scale: 1.02 } : {}}
                      whileTap={!isAnswered ? { scale: 0.98 } : {}}
                      animate={
                        showResult
                          ? isCorrect
                            ? { scale: [1, 1.05, 1] }
                            : { x: [-10, 10, -10, 10, 0] }
                          : {}
                      }
                      className={`
                        aspect-square p-4 rounded-xl
                        transition-all duration-200
                        ${!isAnswered ? 'glass-card hover:ring-2 hover:ring-accent' : ''}
                        ${showResult && isCorrect ? 'bg-success/20 ring-2 ring-success' : ''}
                        ${showResult && !isCorrect ? 'bg-red-500/20 ring-2 ring-red-500' : ''}
                      `}
                    >
                      <div className="text-2xl font-bold text-accent mb-2">{option.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Sprite Grid Cell
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                {selected === currentItem.answer ? (
                  <>
                    <div className="text-success font-semibold text-lg mb-4">✓ Correct!</div>
                    {isLastItem && (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Great job! Moving to next page...
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-red-500 font-semibold text-lg">
                    ✗ Incorrect. The answer was {currentItem.answer}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </>
    </AnimatePresence>
  );
};
