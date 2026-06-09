import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, ChevronLeft, Zap, Trophy, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sortChaptersByOrder } from '../utils/chapterCodeUtils';
import type { ChapterCode } from '../utils/chapterCodeUtils';

interface ChapterQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterNumber: number;
  onGenerateStory: (responses: Record<number, string>) => void;
}

interface ChapterQuestion {
  id: string;
  chapter_code: ChapterCode;
  question_number: number;
  question_text: string;
  question_type: string;
  options: Array<{ value: string; label: string }>;
}

export default function ChapterQuestionsModal({
  isOpen,
  onClose,
  chapterNumber,
  onGenerateStory
}: ChapterQuestionsModalProps) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [otherText, setOtherText] = useState<Record<number, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ChapterQuestion[]>([]);
  const [chapterCode, setChapterCode] = useState<ChapterCode | null>(null);
  const colors = {
    primary: '#a855f7',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    bg: 'from-purple-500/10 to-pink-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400'
  };

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadChapterAndQuestions();
    }
  }, [isOpen, chapterNumber]);

  const loadChapterAndQuestions = async () => {
    const { data: chapters } = await supabase
      .from('chapters')
      .select('*')
      .order('ch_orderno');

    if (chapters && chapters[chapterNumber - 1]) {
      const chapter = chapters[chapterNumber - 1];
      setChapterCode(chapter.chapter_code as ChapterCode);

      const { data: questionData } = await supabase
        .from('chapter_questions')
        .select('*')
        .eq('chapter_code', chapter.chapter_code)
        .order('question_number');

      if (questionData) {
        setQuestions(questionData as ChapterQuestion[]);
      }
    }
  };

  const saveResponse = async (questionNum: number, answer: string) => {
    if (!userId || !chapterCode) return;

    const question = questions.find(q => q.question_number === questionNum);
    if (!question) return;

    const { data: chapter } = await supabase
      .from('chapters')
      .select('id')
      .eq('chapter_code', chapterCode)
      .maybeSingle();

    if (!chapter) return;

    const { data: questionData } = await supabase
      .from('chapter_questions')
      .select('id')
      .eq('chapter_code', chapterCode)
      .eq('question_number', questionNum)
      .maybeSingle();

    if (!questionData) return;

    await supabase
      .from('user_chapter_responses')
      .upsert({
        user_id: userId,
        chapter_id: chapter.id,
        question_number: questionNum,
        question_id: questionData.id,
        answer
      }, {
        onConflict: 'user_id,chapter_id,question_number'
      });
  };

  const handleAnswer = async (answer: string) => {
    const finalAnswer = answer === 'Other' && otherText[currentQuestion]
      ? otherText[currentQuestion]
      : answer;

    setResponses(prev => ({ ...prev, [currentQuestion]: finalAnswer }));
    await saveResponse(currentQuestion, finalAnswer);

    if (currentQuestion < 5) {
      setTimeout(() => setCurrentQuestion(currentQuestion + 1), 300);
    } else {
      setShowConfirmation(true);
    }
  };

  const handleGenerateStory = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    onGenerateStory(responses);
    setIsGenerating(false);
  };

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(1);
    setShowConfirmation(false);
  };

  const currentQ = questions[currentQuestion - 1];
  const progress = (currentQuestion / 5) * 100;
  const allQuestionsAnswered = Object.keys(responses).length === 5;

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl my-8 pointer-events-auto"
        >
          <div className="bg-[#0a0a10] rounded-3xl border-2 shadow-2xl overflow-hidden relative" style={{ borderColor: colors.primary }}>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  `radial-gradient(circle at 20% 20%, ${colors.primary}15, transparent 50%)`,
                  `radial-gradient(circle at 80% 80%, ${colors.secondary}15, transparent 50%)`,
                  `radial-gradient(circle at 20% 20%, ${colors.primary}15, transparent 50%)`,
                ],
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-900/90 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5 text-gray-300" />
            </motion.button>

            <div className="relative z-10 p-6 md:p-8">
              {!showConfirmation ? (
                <>
                  <div className="text-center mb-8">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.05, 1.05, 1],
                      }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-2xl mx-auto mb-4"
                      style={{ boxShadow: `0 20px 60px ${colors.primary}40` }}
                    >
                      <Sparkles className="w-10 h-10 text-white" />
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-2xl md:text-3xl font-bold text-white mb-2"
                    >
                      Let's Personalize Your Story
                    </motion.h2>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center justify-center gap-4 text-gray-400 text-sm"
                    >
                      <span>Question {currentQuestion} of 5</span>
                      <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </motion.div>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentQuestion}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <motion.div
                        className={`p-6 bg-gradient-to-br ${colors.bg} rounded-2xl border-2 ${colors.border} relative overflow-hidden`}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                          className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
                          style={{ background: `radial-gradient(circle, ${colors.primary}20, transparent)` }}
                        />
                        <div className="flex items-start gap-3 relative z-10">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Sparkles className={`w-6 h-6 ${colors.text} flex-shrink-0`} />
                          </motion.div>
                          <p className="text-lg text-white font-medium leading-relaxed">
                            {currentQ?.question_text}
                          </p>
                        </div>
                      </motion.div>

                      {currentQ?.question_type === 'multiple_choice' ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            {currentQ.options?.map((option, idx) => (
                              <motion.button
                                key={option.value}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleAnswer(option.label)}
                                className={`text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden group ${
                                  responses[currentQuestion] === option.label
                                    ? 'border-purple-400 bg-purple-400/10 shadow-lg shadow-purple-500/20'
                                    : 'border-gray-700 hover:border-purple-400/50 bg-gray-900/50 hover:shadow-lg hover:shadow-purple-500/10'
                                }`}
                              >
                                <div className="flex flex-col gap-2 relative z-10">
                                  <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.5 }}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                      responses[currentQuestion] === option.label
                                        ? 'bg-gradient-to-br from-purple-400 to-pink-500 text-white'
                                        : 'bg-gray-800 text-gray-300 group-hover:bg-gray-700'
                                    }`}
                                  >
                                    <span className="iconify text-2xl" data-icon={`mdi:alpha-${option.value.toLowerCase()}-circle`}></span>
                                  </motion.div>
                                  <span className={`text-sm font-medium leading-tight ${
                                    responses[currentQuestion] === option.label
                                      ? 'text-purple-400'
                                      : 'text-gray-300 group-hover:text-white'
                                  }`}>
                                    {option.label}
                                  </span>
                                </div>
                                {responses[currentQuestion] === option.label && (
                                  <motion.div
                                    layoutId="selectedBg"
                                    className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                  />
                                )}
                                <motion.div
                                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.1), transparent 70%)'
                                  }}
                                />
                              </motion.button>
                            ))}
                          </div>

                          {currentQ.has_other && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="relative"
                            >
                              <motion.div
                                className="absolute inset-0 rounded-2xl opacity-50"
                                animate={{
                                  boxShadow: [
                                    '0 0 20px rgba(168, 85, 247, 0.1)',
                                    '0 0 40px rgba(168, 85, 247, 0.2)',
                                    '0 0 20px rgba(168, 85, 247, 0.1)',
                                  ]
                                }}
                                transition={{ duration: 3, repeat: Infinity }}
                              />
                              <div className="relative">
                                <label className="block text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  Or share your own answer:
                                </label>
                                <textarea
                                  value={otherText[currentQuestion] || ''}
                                  onChange={(e) => setOtherText(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                                  placeholder="Type your custom response here..."
                                  className="w-full p-4 bg-gray-900/70 border-2 border-purple-500/30 rounded-2xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-none focus:bg-gray-900/90 transition-all focus:shadow-lg focus:shadow-purple-500/20"
                                  rows={3}
                                />
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleAnswer('Other')}
                                  disabled={!otherText[currentQuestion]?.trim()}
                                  className="mt-3 w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                  <Zap className="w-5 h-5" />
                                  Submit Custom Answer
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <textarea
                            value={responses[currentQuestion] || ''}
                            onChange={(e) => setResponses(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                            placeholder="Share your thoughts here..."
                            className="w-full p-5 bg-gray-900/50 border-2 border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:border-purple-400 focus:outline-none resize-none focus:bg-gray-900/70 transition-all"
                            rows={5}
                          />
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleAnswer(responses[currentQuestion] || '')}
                            disabled={!responses[currentQuestion]?.trim()}
                            className="mt-4 w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Zap className="w-5 h-5" />
                            Continue
                          </motion.button>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handlePrevious}
                          disabled={currentQuestion === 1}
                          className="flex items-center gap-2 px-5 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </motion.button>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1.1, 1],
                    }}
                    transition={{ duration: 0.5 }}
                    className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
                    style={{ boxShadow: '0 20px 60px rgba(16, 185, 129, 0.4)' }}
                  >
                    <Trophy className="w-14 h-14 text-white" />
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-bold text-white mb-3"
                  >
                    Awesome Work!
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-300 mb-8 text-lg"
                  >
                    You've completed all questions. Ready to bring your story to life?
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-800"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-5 h-5 text-purple-400" />
                      <p className="text-sm font-bold text-purple-400 uppercase tracking-wider">Your Story Profile</p>
                    </div>
                    <div className="space-y-3">
                      {questions.map((q, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          className="text-left bg-gray-900/50 rounded-xl p-3 border border-gray-800"
                        >
                          <p className="text-xs text-gray-500 mb-1">Q{idx + 1}: {q.question_text}</p>
                          <p className="text-sm text-purple-400 font-semibold truncate">
                            {responses[idx + 1] || 'Not answered'}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(16, 185, 129, 0.6)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGenerateStory}
                    disabled={!allQuestionsAnswered || isGenerating}
                    className="w-full px-6 py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <motion.div
                      className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"
                    />
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-6 h-6 relative z-10" />
                        </motion.div>
                        <span className="relative z-10">Generating Your Story...</span>
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        >
                          <Zap className="w-6 h-6 relative z-10" />
                        </motion.div>
                        <span className="relative z-10">Create My Adventure Now</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={handleReset}
                    className="mt-4 text-sm text-gray-500 hover:text-purple-400 transition-colors font-medium"
                  >
                    Review & Edit Answers
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
