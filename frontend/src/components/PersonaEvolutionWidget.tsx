import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPersonaInsights } from '../services/personaEvolutionService';

interface PersonaEvolutionWidgetProps {
  geniusProfileId: string;
}

export const PersonaEvolutionWidget = ({ geniusProfileId }: PersonaEvolutionWidgetProps) => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [geniusProfileId]);

  const loadInsights = async () => {
    try {
      const data = await getPersonaInsights(geniusProfileId);
      setInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!insights || insights.unlockedInsights.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              Start Your Entrepreneurial Journey
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Build your business in AIpreneur Hub to unlock personality insights based on your real decisions!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/s/aipreneur')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold text-sm"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  const latestInsight = insights.unlockedInsights[insights.unlockedInsights.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => navigate('/s/persona')}
      className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30 cursor-pointer hover:border-purple-400/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Your Persona Evolution</h3>
            <p className="text-sm text-gray-400">Grow through your business journey</p>
          </div>
        </div>
        {insights.progressPercentage === 100 && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Insights Unlocked</span>
          <span className="text-lg font-bold text-cyan-400">
            {insights.unlockedInsights.length}/{insights.totalInsights}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${insights.progressPercentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500"
          />
        </div>
      </div>

      {latestInsight && (
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Latest Insight</span>
          </div>
          <p className="text-white font-bold text-sm mb-1">{latestInsight.insightName}</p>
          <p className="text-gray-300 text-xs">{latestInsight.description}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {insights.progressPercentage === 100
            ? 'All insights unlocked!'
            : `${insights.totalInsights - insights.unlockedInsights.length} more to discover`}
        </p>
        <motion.div
          whileHover={{ x: 5 }}
          className="flex items-center gap-1 text-cyan-400 text-sm font-semibold"
        >
          View Full Persona
          <ArrowRight className="w-4 h-4" />
        </motion.div>
      </div>
    </motion.div>
  );
};
