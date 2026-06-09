import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Award, Info } from 'lucide-react';
import { useState } from 'react';
import type { StoredRecommendation } from '../services/recommendationService';

interface RecommendationCardProps {
  recommendation: StoredRecommendation;
  gradient: string;
  onStart: () => void;
  rank: number;
}

export const RecommendationCard = ({
  recommendation,
  gradient,
  onStart,
  rank,
}: RecommendationCardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const getMatchBadgeColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 80) return 'from-blue-500 to-cyan-500';
    if (score >= 70) return 'from-yellow-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  const getMatchLabel = (score: number) => {
    if (score >= 90) return 'Perfect Match';
    if (score >= 80) return 'Great Match';
    if (score >= 70) return 'Good Match';
    return 'Recommended';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-[#1a1a24] rounded-2xl p-6 border border-gray-800 hover:border-gray-700 transition-all relative group"
    >
      {rank <= 3 && (
        <div className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#0a0a10]">
          <span className="text-white font-bold text-sm">#{rank}</span>
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-110 transition-transform`}
        >
          {recommendation.template_icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
            {recommendation.template_title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {recommendation.template_one_liner}
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-200 leading-relaxed">
            {recommendation.personalized_benefit}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${getMatchBadgeColor(
            recommendation.match_score
          )} rounded-full`}
        >
          <Award className="w-4 h-4 text-white" />
          <span className="text-xs font-bold text-white">
            {getMatchLabel(recommendation.match_score)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors"
        >
          <Info className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">Why?</span>
        </button>
      </div>

      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-800"
        >
          <p className="text-xs text-gray-300 mb-3">{recommendation.reasoning}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Learning Style Match</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{
                      width: `${recommendation.recommendation_factors.learningStyleMatch}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-cyan-400 font-semibold w-8 text-right">
                  {recommendation.recommendation_factors.learningStyleMatch}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Strength Alignment</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{
                      width: `${recommendation.recommendation_factors.strengthAlignment}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-green-400 font-semibold w-8 text-right">
                  {recommendation.recommendation_factors.strengthAlignment}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Growth Potential</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                    style={{
                      width: `${recommendation.recommendation_factors.growthPotential}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-purple-400 font-semibold w-8 text-right">
                  {recommendation.recommendation_factors.growthPotential}%
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {recommendation.template_focus_areas.slice(0, 3).map((area, i) => (
          <span
            key={i}
            className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded-full"
          >
            {area}
          </span>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className={`w-full px-4 py-3 bg-gradient-to-r ${gradient} text-white rounded-xl font-semibold flex items-center justify-center gap-2`}
      >
        <TrendingUp className="w-4 h-4" />
        Start Adventure
      </motion.button>
    </motion.div>
  );
};
