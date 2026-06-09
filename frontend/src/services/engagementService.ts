/**
 * Engagement API Service
 *
 * Replaces Supabase-based engagement service with Laravel API.
 */

import { geniusApi as api } from '../lib/api';

// =============================================
// TYPES
// =============================================

export interface ActiveEvent {
  id: string;
  event_id: string;
  event_name: string;
  description: string;
  event_type: string;
  notification_text: string;
  impact_sales_multiplier: number;
  impact_traffic_multiplier: number;
  impact_mood_change: number;
  reward_coins: number;
  started_at: string;
  expires_at: string;
  is_completed: boolean;
  progress_percentage: number;
}

export interface Challenge {
  id: string;
  challenge_id: string;
  challenge_name: string;
  description: string;
  challenge_type: string;
  difficulty: string;
  reward_coins: number;
  learning_topic: string;
  status: string;
  progress_current: number;
  progress_target: number;
  progress_percentage: number;
  expires_at: string;
  is_streak_challenge: boolean;
}

export interface LifeEvent {
  id: string;
  event_id: string;
  event_name: string;
  event_category: string;
  scenario_text: string;
  character_name: string | null;
  character_role: string | null;
  choices: Array<{
    id: string;
    text: string;
    outcome: {
      coins?: number;
      mood?: number;
      lesson: string;
      [key: string]: unknown;
    };
  }>;
  status: string;
  triggered_at: string;
}

export interface EngagementStats {
  current_streak_days: number;
  longest_streak_days: number;
  total_challenges_completed: number;
  total_events_completed: number;
  total_life_events_resolved: number;
}

export interface MarketTrend {
  id: string;
  trend_code: string;
  trend_name: string;
  description: string;
  start_date: string;
  end_date: string;
  popularity_multiplier: number;
  price_tolerance_change: number;
  affected_categories: string[];
  is_active: boolean;
}

export interface SeasonalContent {
  id: string;
  content_code: string;
  content_name: string;
  content_type: string;
  season: string;
  available_start: string;
  available_end: string;
  content_data: Record<string, unknown>;
  unlock_cost: number;
  icon: string | null;
  theme_color: string | null;
  is_active: boolean;
  featured: boolean;
}

// =============================================
// EVENTS API
// =============================================

export const eventsApi = {
  /**
   * Get active events for current student.
   */
  async getActive(): Promise<{ success: boolean; events: ActiveEvent[] }> {
    return api.get('/aipreneur/events/active');
  },

  /**
   * Complete an event.
   */
  async complete(eventId: string): Promise<{ success: boolean; reward_coins: number }> {
    return api.post(`/aipreneur/events/${eventId}/complete`);
  },
};

// =============================================
// CHALLENGES API
// =============================================

export const challengesApi = {
  /**
   * Get active challenges.
   */
  async getActive(): Promise<{ success: boolean; challenges: Challenge[] }> {
    return api.get('/aipreneur/challenges/active');
  },

  /**
   * Complete a challenge.
   */
  async complete(challengeId: string): Promise<{ success: boolean; reward_coins: number }> {
    return api.post(`/aipreneur/challenges/${challengeId}/complete`);
  },

  /**
   * Update challenge progress.
   */
  async updateProgress(
    challengeId: string,
    amount: number
  ): Promise<{ success: boolean; challenge: Challenge }> {
    return api.post(`/aipreneur/challenges/${challengeId}/progress`, { amount });
  },

  /**
   * Assign daily challenges.
   */
  async assignDaily(): Promise<{
    success: boolean;
    assigned: number;
    challenges: Challenge[];
  }> {
    return api.post('/aipreneur/challenges/assign-daily');
  },
};

// =============================================
// LIFE EVENTS API
// =============================================

export const lifeEventsApi = {
  /**
   * Get pending life events.
   */
  async getPending(): Promise<{ success: boolean; life_events: LifeEvent[] }> {
    return api.get('/aipreneur/life-events/pending');
  },

  /**
   * Resolve a life event with a choice.
   */
  async resolve(
    lifeEventId: string,
    choiceId: string
  ): Promise<{
    success: boolean;
    outcome: {
      coins?: number;
      mood?: number;
      lesson: string;
    };
  }> {
    return api.post(`/aipreneur/life-events/${lifeEventId}/resolve`, { choice_id: choiceId });
  },

  /**
   * Trigger random life event.
   */
  async triggerRandom(): Promise<{
    success: boolean;
    message?: string;
    life_event?: LifeEvent;
  }> {
    return api.post('/aipreneur/life-events/trigger');
  },
};

// =============================================
// ENGAGEMENT STATS API
// =============================================

export const engagementStatsApi = {
  /**
   * Get engagement stats.
   */
  async get(): Promise<{ success: boolean; stats: EngagementStats }> {
    return api.get('/aipreneur/engagement/stats');
  },

  /**
   * Update streak.
   */
  async updateStreak(): Promise<{
    success: boolean;
    current_streak_days: number;
    longest_streak_days: number;
  }> {
    return api.post('/aipreneur/engagement/streak');
  },
};

// =============================================
// SYSTEM CONFIG API
// =============================================

export const systemConfigApi = {
  /**
   * Get system configuration.
   */
  async get(): Promise<{ success: boolean; config: Record<string, unknown> }> {
    return api.get('/aipreneur/system/config');
  },
};

// =============================================
// MARKET & SEASONAL API
// =============================================

export const marketApi = {
  /**
   * Get current market trends.
   */
  async getTrends(): Promise<{ success: boolean; trends: MarketTrend[] }> {
    return api.get('/aipreneur/market/trends');
  },

  /**
   * Get available seasonal content.
   */
  async getSeasonalContent(): Promise<{
    success: boolean;
    seasonal_content: SeasonalContent[];
  }> {
    return api.get('/aipreneur/seasonal/content');
  },
};

// =============================================
// COMBINED ENGAGEMENT SERVICE (backward compatible)
// =============================================

export const engagementService = {
  // Events
  async getActiveEvents(): Promise<ActiveEvent[]> {
    try {
      const response = await eventsApi.getActive();
      return response.success ? response.events : [];
    } catch (error) {
      console.error('Error fetching active events:', error);
      return [];
    }
  },

  async completeEvent(eventId: string): Promise<boolean> {
    try {
      const response = await eventsApi.complete(eventId);
      return response.success;
    } catch (error) {
      console.error('Error completing event:', error);
      return false;
    }
  },

  // Challenges
  async getActiveChallenges(): Promise<Challenge[]> {
    try {
      const response = await challengesApi.getActive();
      return response.success ? response.challenges : [];
    } catch (error) {
      console.error('Error fetching active challenges:', error);
      return [];
    }
  },

  async completeChallenge(challengeId: string): Promise<boolean> {
    try {
      const response = await challengesApi.complete(challengeId);
      return response.success;
    } catch (error) {
      console.error('Error completing challenge:', error);
      return false;
    }
  },

  // Life Events
  async getPendingLifeEvents(): Promise<LifeEvent[]> {
    try {
      const response = await lifeEventsApi.getPending();
      return response.success ? response.life_events : [];
    } catch (error) {
      console.error('Error fetching pending life events:', error);
      return [];
    }
  },

  async resolveLifeEvent(
    lifeEventId: string,
    choiceId: string
  ): Promise<{ success: boolean; outcome: unknown }> {
    try {
      const response = await lifeEventsApi.resolve(lifeEventId, choiceId);
      return { success: response.success, outcome: response.outcome };
    } catch (error) {
      console.error('Error resolving life event:', error);
      return { success: false, outcome: null };
    }
  },

  // Stats
  async getEngagementStats(): Promise<EngagementStats | null> {
    try {
      const response = await engagementStatsApi.get();
      return response.success ? response.stats : null;
    } catch (error) {
      console.error('Error fetching engagement stats:', error);
      return null;
    }
  },

  async updateStreak(): Promise<void> {
    try {
      await engagementStatsApi.updateStreak();
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  },

  // Config & Market
  async getSystemConfig(): Promise<Record<string, unknown>> {
    try {
      const response = await systemConfigApi.get();
      return response.success ? response.config : {};
    } catch (error) {
      console.error('Error fetching system config:', error);
      return {};
    }
  },

  async triggerRandomLifeEvent(): Promise<boolean> {
    try {
      const response = await lifeEventsApi.triggerRandom();
      return response.success;
    } catch (error) {
      console.error('Error triggering life event:', error);
      return false;
    }
  },

  async assignDailyChallenges(): Promise<void> {
    try {
      await challengesApi.assignDaily();
    } catch (error) {
      console.error('Error assigning daily challenges:', error);
    }
  },
};

export default engagementService;
