import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, BookOpen, X, Star, TrendingUp, Zap, Target, Heart, Brain, Trophy, Lightbulb, Rocket, Play, Lock } from 'lucide-react';
import { useState } from 'react';

interface StorybookCardProps {
  id: string;
  title: string;
  icon: string;
  oneLiner: string;
  description: string;
  focusAreas: string[];
  gradient: string;
  personalizedBenefit?: string;
  matchScore?: number;
  isRecommended?: boolean;
  rank?: number;
  onStart: () => void;
  userName?: string;
  rewardBadge?: string;
  isActive?: boolean;
  progress?: { pageIndex: number; percentage: number };
  isDisabled?: boolean;
}

export const StorybookCard = ({
  title,
  icon,
  oneLiner,
  description,
  focusAreas,
  gradient,
  personalizedBenefit,
  matchScore,
  isRecommended = false,
  rank,
  onStart,
  userName = 'Jackson',
  rewardBadge,
  isActive = false,
  progress,
  isDisabled = false,
}: StorybookCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleCardClick = () => {
    setShowModal(true);
  };

  const handleStartAdventure = () => {
    setShowModal(false);
    onStart();
  };

  const benefitIcons = [
    { icon: Brain, label: 'Develops Critical Thinking' },
    { icon: Heart, label: 'Builds Emotional Intelligence' },
    { icon: Lightbulb, label: 'Sparks Creativity' },
    { icon: Target, label: 'Achieves Learning Goals' },
    { icon: Trophy, label: 'Boosts Confidence' },
    { icon: Rocket, label: 'Accelerates Growth' },
  ];

  const getColorFromGradient = (gradient: string) => {
    if (gradient.includes('yellow')) return { primary: '#eab308', secondary: '#f59e0b', accent: '#fbbf24', bg: 'from-yellow-500/10 to-orange-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' };
    if (gradient.includes('blue')) return { primary: '#3b82f6', secondary: '#0ea5e9', accent: '#06b6d4', bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/30', text: 'text-blue-400' };
    if (gradient.includes('green')) return { primary: '#22c55e', secondary: '#10b981', accent: '#14b8a6', bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/30', text: 'text-green-400' };
    if (gradient.includes('purple')) return { primary: '#a855f7', secondary: '#ec4899', accent: '#f472b6', bg: 'from-purple-500/10 to-pink-500/10', border: 'border-purple-500/30', text: 'text-purple-400' };
    if (gradient.includes('red')) return { primary: '#ef4444', secondary: '#f43f5e', accent: '#fb7185', bg: 'from-red-500/10 to-rose-500/10', border: 'border-red-500/30', text: 'text-red-400' };
    return { primary: '#6366f1', secondary: '#8b5cf6', accent: '#a78bfa', bg: 'from-indigo-500/10 to-violet-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400' };
  };

  const colors = getColorFromGradient(gradient);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={!isDisabled ? { y: -8, scale: 1.02 } : {}}
        onHoverStart={() => !isDisabled && setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        onClick={!isDisabled ? handleCardClick : undefined}
        className={`bg-[#1a1a24] rounded-3xl p-6 border border-gray-800 relative overflow-hidden group ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-700 cursor-pointer'
        } ${
          isActive ? 'ring-2 ring-cyan-400 border-cyan-400' : ''
        }`}
      >
        {isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full border-2 border-[#0a0a10] shadow-lg">
              IN PROGRESS
            </div>
          </motion.div>
        )}

        {isDisabled && !isActive && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shadow-lg border-2 border-[#0a0a10]">
              <Lock className="w-5 h-5 text-gray-400" />
            </div>
          </motion.div>
        )}

        {isRecommended && rank && rank <= 3 && !isActive && !isDisabled && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="relative">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg border-2 border-[#0a0a10]`}>
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-xs mt-0.5">#{rank}</span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${colors.primary}20, transparent 70%)`,
          }}
        />

        <div className="relative z-10">
          <motion.div
            animate={isHovering ? {
              rotate: [0, -10, 10, -10, 0],
              scale: [1, 1.1, 1.1, 1.1, 1],
            } : {}}
            transition={{ duration: 0.5 }}
            className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 text-4xl shadow-lg group-hover:shadow-2xl transition-shadow`}
          >
            {icon}
            <motion.div
              className="absolute inset-0 rounded-3xl"
              animate={isHovering ? {
                boxShadow: [
                  `0 0 0 0 ${colors.primary}00`,
                  `0 0 0 10px ${colors.primary}30`,
                  `0 0 0 20px ${colors.primary}00`,
                ],
              } : {}}
              transition={{ duration: 1, repeat: isHovering ? Infinity : 0 }}
            />
          </motion.div>

          <motion.h3
            className={`text-xl font-bold text-white mb-2 group-hover:${colors.text} transition-colors`}
            animate={isHovering ? { x: [0, 5, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h3>

          <p className="text-sm text-gray-400 mb-4 line-clamp-2">
            {oneLiner}
          </p>

          {personalizedBenefit && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-4 p-3 bg-gradient-to-r ${colors.bg} rounded-xl border ${colors.border} relative overflow-hidden`}
            >
              <motion.div
                className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent`}
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
              <div className="flex items-start gap-2 relative z-10">
                <Sparkles className={`w-4 h-4 ${colors.text} flex-shrink-0 mt-0.5`} />
                <p className="text-xs text-gray-200 leading-relaxed font-medium">
                  {personalizedBenefit}
                </p>
              </div>
            </motion.div>
          )}

          {matchScore && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="mb-4"
            >
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${gradient} rounded-full shadow-lg`}>
                <TrendingUp className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white">
                  {matchScore}% Match
                </span>
              </div>
            </motion.div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {focusAreas.slice(0, 3).map((area, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs px-3 py-1 bg-gray-800 text-gray-400 rounded-full hover:bg-gray-700 transition-colors"
              >
                {area}
              </motion.span>
            ))}
          </div>

          {progress && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>Page {progress.pageIndex + 1}</span>
                <span className="text-cyan-400 font-bold">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          <motion.button
            whileHover={!isDisabled ? { scale: 1.05 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            onClick={(e) => {
              e.stopPropagation();
              if (!isDisabled) handleCardClick();
            }}
            disabled={isDisabled}
            className={`w-full px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg transition-shadow ${
              isDisabled
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : isActive
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-2xl'
                : `bg-gradient-to-r ${gradient} text-white hover:shadow-2xl`
            }`}
          >
            {isDisabled ? (
              <>
                <Lock className="w-4 h-4" />
                Complete Current Chapter
              </>
            ) : isActive ? (
              <>
                <Play className="w-4 h-4" />
                Continue Adventure
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Start Adventure
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
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
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
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
                      setShowModal(false);
                    }}
                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-gray-900/90 hover:bg-gray-800 rounded-full flex items-center justify-center transition-colors backdrop-blur-sm"
                  >
                    <X className="w-5 h-5 text-gray-300" />
                  </motion.button>

                  <div className="relative z-10 p-6 md:p-8">
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.05, 1.05, 1],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className={`w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br ${gradient} flex items-center justify-center text-6xl md:text-7xl shadow-2xl mx-auto mb-4`}
                        style={{ boxShadow: `0 20px 60px ${colors.primary}40` }}
                      >
                        {icon}
                      </motion.div>

                      <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-bold text-white mb-2"
                      >
                        {title}
                      </motion.h2>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-sm md:text-base mb-4"
                      >
                        {oneLiner}
                      </motion.p>

                      {matchScore && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.3 }}
                          className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradient} rounded-full shadow-lg`}
                        >
                          <Star className="w-5 h-5 text-white fill-white" />
                          <span className="text-base font-bold text-white">
                            {matchScore}% Perfect Match for {userName}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    {personalizedBenefit && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className={`mb-6 p-5 bg-gradient-to-br ${colors.bg} rounded-2xl border-2 ${colors.border} relative overflow-hidden`}
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
                          <div className="flex-1">
                            <p className={`text-xs ${colors.text} font-bold mb-2 uppercase tracking-wider`}>
                              Why This Is Perfect for {userName}
                            </p>
                            <p className="text-base text-white leading-relaxed font-medium">
                              {personalizedBenefit}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mb-6"
                    >
                      <h3 className={`text-sm ${colors.text} font-bold mb-4 uppercase tracking-wider flex items-center gap-2`}>
                        <Trophy className="w-4 h-4" />
                        {userName}'s Benefits
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {benefitIcons.map((benefit, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + i * 0.1, type: 'spring' }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            className={`p-4 bg-gradient-to-br ${colors.bg} rounded-xl border ${colors.border} hover:border-opacity-60 transition-all cursor-default`}
                          >
                            <benefit.icon className={`w-6 h-6 ${colors.text} mb-2`} />
                            <p className="text-xs text-gray-300 font-semibold leading-tight">
                              {benefit.label}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="mb-6"
                    >
                      <h3 className={`text-sm ${colors.text} font-bold mb-3 uppercase tracking-wider flex items-center gap-2`}>
                        <Target className="w-4 h-4" />
                        Learning Focus
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {focusAreas.map((area, i) => (
                          <motion.span
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.05 }}
                            className={`text-sm px-4 py-2 bg-gradient-to-r ${gradient} text-white rounded-full font-semibold shadow-md`}
                          >
                            {area}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 }}
                      className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div>
                        <h3 className={`text-sm ${colors.text} font-bold mb-3 uppercase tracking-wider flex items-center gap-2`}>
                          <BookOpen className="w-4 h-4" />
                          About This Adventure
                        </h3>
                        <p className="text-gray-300 leading-relaxed text-sm">
                          {description}
                        </p>
                      </div>
                      {rewardBadge && (
                        <div className={`p-4 bg-gradient-to-br ${colors.bg} rounded-xl border-2 ${colors.border} text-center flex flex-col items-center justify-center`}>
                          <div className="text-5xl mb-2">🏅</div>
                          <h3 className={`text-xs ${colors.text} font-bold mb-1 uppercase tracking-wider`}>
                            Reward Badge
                          </h3>
                          <p className={`text-base font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
                            {rewardBadge}
                          </p>
                        </div>
                      )}
                    </motion.div>

                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
                      whileHover={{ scale: 1.02, boxShadow: '0 20px 40px #10b98160' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleStartAdventure}
                      className="w-full px-6 py-5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Zap className="w-6 h-6 relative z-10" />
                      </motion.div>
                      <span className="relative z-10">Start {userName}'s Adventure Now</span>
                    </motion.button>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 }}
                      className="text-center text-xs text-gray-500 mt-4"
                    >
                      Personalized learning journey • 10 interactive pages • Progress tracking
                    </motion.p>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
