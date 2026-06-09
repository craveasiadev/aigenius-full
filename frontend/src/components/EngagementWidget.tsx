import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trophy, Heart, X, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { engagementService, ActiveEvent, Challenge, LifeEvent } from '../services/engagementService';

interface EngagementWidgetProps {
  studentId: string;
}

export function EngagementWidget({ studentId }: EngagementWidgetProps) {
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [pendingLifeEvents, setPendingLifeEvents] = useState<LifeEvent[]>([]);
  const [selectedLifeEvent, setSelectedLifeEvent] = useState<LifeEvent | null>(null);
  const [showLifeEventModal, setShowLifeEventModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEngagementData();
  }, [studentId]);

  const loadEngagementData = async () => {
    setLoading(true);
    try {
      const [events, challenges, lifeEvents] = await Promise.all([
        engagementService.getActiveEvents(studentId),
        engagementService.getActiveChallenges(studentId),
        engagementService.getPendingLifeEvents(studentId),
      ]);

      setActiveEvents(events);
      setActiveChallenges(challenges);
      setPendingLifeEvents(lifeEvents);

      await engagementService.updateStreak(studentId);
    } catch (error) {
      console.error('Error loading engagement data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveLifeEvent = async (choiceId: string) => {
    if (!selectedLifeEvent) return;

    const result = await engagementService.resolveLifeEvent(
      studentId,
      selectedLifeEvent.id,
      choiceId
    );

    if (result.success) {
      setShowLifeEventModal(false);
      setSelectedLifeEvent(null);
      loadEngagementData();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const hasEngagementContent =
    activeEvents.length > 0 ||
    activeChallenges.length > 0 ||
    pendingLifeEvents.length > 0;

  if (!hasEngagementContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {activeEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">Active Events</h3>
          </div>

          <div className="space-y-3">
            {activeEvents.map((event) => (
              <div
                key={event.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-white">{event.event_name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {event.notification_text}
                    </p>
                  </div>
                  {event.reward_coins > 0 && (
                    <div className="flex items-center gap-1 text-yellow-400 font-medium text-sm">
                      <Sparkles className="w-4 h-4" />
                      {event.reward_coins}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>
                    Sales: {(event.impact_sales_multiplier * 100).toFixed(0)}%
                  </span>
                  <span>
                    Traffic: {(event.impact_traffic_multiplier * 100).toFixed(0)}%
                  </span>
                  <span className="ml-auto">
                    Expires: {new Date(event.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeChallenges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-bold text-white">Daily Challenges</h3>
          </div>

          <div className="space-y-3">
            {activeChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">
                        {challenge.challenge_name}
                      </h4>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                        {challenge.challenge_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {challenge.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400 font-medium text-sm">
                    <Sparkles className="w-4 h-4" />
                    {challenge.reward_coins}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${challenge.progress_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {challenge.progress_percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  Expires: {new Date(challenge.expires_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {pendingLifeEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 rounded-xl p-6 border border-pink-500/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-pink-400" />
            <h3 className="text-lg font-bold text-white">Life Events</h3>
          </div>

          <div className="space-y-3">
            {pendingLifeEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedLifeEvent(event);
                  setShowLifeEventModal(true);
                }}
                className="w-full bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-pink-500/50 transition-colors text-left"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white">{event.event_name}</h4>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                      {event.scenario_text}
                    </p>
                    {event.character_name && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-pink-400">
                        <Heart className="w-3 h-3" />
                        {event.character_name} - {event.character_role}
                      </div>
                    )}
                  </div>
                  <TrendingUp className="w-5 h-5 text-pink-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showLifeEventModal && selectedLifeEvent && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLifeEventModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full border border-gray-700 shadow-2xl"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <Heart className="w-8 h-8 text-pink-400" />
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {selectedLifeEvent.event_name}
                      </h2>
                      {selectedLifeEvent.character_name && (
                        <p className="text-sm text-gray-400 mt-1">
                          {selectedLifeEvent.character_name} -{' '}
                          {selectedLifeEvent.character_role}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLifeEventModal(false)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-700">
                  <p className="text-gray-300 leading-relaxed">
                    {selectedLifeEvent.scenario_text}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-400 mb-3">
                    What will you do?
                  </p>
                  {selectedLifeEvent.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => handleResolveLifeEvent(choice.id)}
                      className="w-full bg-gray-900 hover:bg-gray-700 rounded-lg p-4 border border-gray-700 hover:border-pink-500/50 transition-all text-left group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-medium group-hover:text-pink-400 transition-colors">
                            {choice.text}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            {choice.outcome.lesson}
                          </p>
                        </div>
                        {(choice.outcome.coins || choice.outcome.mood) && (
                          <div className="flex flex-col gap-1 text-xs ml-4">
                            {choice.outcome.coins && (
                              <span
                                className={`${
                                  choice.outcome.coins > 0
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {choice.outcome.coins > 0 ? '+' : ''}
                                {choice.outcome.coins} coins
                              </span>
                            )}
                            {choice.outcome.mood && (
                              <span
                                className={`${
                                  choice.outcome.mood > 0
                                    ? 'text-blue-400'
                                    : 'text-orange-400'
                                }`}
                              >
                                {choice.outcome.mood > 0 ? '+' : ''}
                                {choice.outcome.mood} mood
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
