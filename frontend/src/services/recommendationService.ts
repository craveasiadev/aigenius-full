/**
 * Recommendation Service
 *
 * Manages storybook recommendations for students.
 * Uses Laravel API instead of direct Supabase access.
 */

import { api } from '../lib/api';
import { generateTopStorybookRecommendations, type RecommendationResult } from './openaiService';

export interface StoredRecommendation {
  id: string;
  genius_profile_id: string;
  template_id: string;
  template_title: string;
  template_icon: string;
  template_description: string;
  template_one_liner: string;
  template_focus_areas: string[];
  match_score: number;
  rank_position: number;
  reasoning: string;
  personalized_benefit: string;
  recommendation_factors: {
    personaMatch: number;
    learningStyleMatch: number;
    strengthAlignment: number;
    growthPotential: number;
    ageAppropriateness: number;
  };
  generated_at: string;
  expires_at: string;
}

// Cache key for local storage
const RECOMMENDATIONS_CACHE_KEY = 'storybook_recommendations';

export const getRecommendationsForStudent = async (
  geniusProfileId: string,
  forceRefresh: boolean = false
): Promise<StoredRecommendation[]> => {
  try {
    // Check local cache first
    if (!forceRefresh) {
      const cached = getCachedRecommendations(geniusProfileId);
      if (cached && cached.length >= 6) {
        console.log('Using cached recommendations');
        return cached;
      }
    }

    // Try to get from API
    try {
      const response = await api.get<{
        success: boolean;
        recommendations: StoredRecommendation[];
      }>(`/aipreneur/recommendations?genius_profile_id=${geniusProfileId}`);

      if (response.success && response.recommendations && response.recommendations.length >= 6) {
        // Cache the recommendations
        setCachedRecommendations(geniusProfileId, response.recommendations);
        return response.recommendations;
      }
    } catch {
      // API not available, generate locally
    }

    console.log('Generating fresh recommendations');
    return await generateAndStoreRecommendations(geniusProfileId);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
};

const getCachedRecommendations = (geniusProfileId: string): StoredRecommendation[] | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(RECOMMENDATIONS_CACHE_KEY) || '{}');
    const cached = cache[geniusProfileId];

    if (cached && cached.expires_at) {
      const expiresAt = new Date(cached.expires_at);
      if (expiresAt > new Date()) {
        return cached.recommendations;
      }
    }
  } catch {
    // Cache read failed
  }
  return null;
};

const setCachedRecommendations = (
  geniusProfileId: string,
  recommendations: StoredRecommendation[]
): void => {
  try {
    const cache = JSON.parse(localStorage.getItem(RECOMMENDATIONS_CACHE_KEY) || '{}');
    cache[geniusProfileId] = {
      recommendations,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    };
    localStorage.setItem(RECOMMENDATIONS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache write failed
  }
};

const generateAndStoreRecommendations = async (
  geniusProfileId: string
): Promise<StoredRecommendation[]> => {
  try {
    // Get profile data from API
    let profile: { name: string; age: number } | null = null;
    let personaData: {
      strengths?: string[];
      growth_areas?: string[];
      learning_style?: string;
      fun_facts?: string[];
    } | null = null;

    try {
      const profileResponse = await api.get<{
        success: boolean;
        profile: {
          genius_name?: string;
          first_name?: string;
          age?: number;
          date_of_birth?: string;
        };
      }>('/aipreneur/auth/me');

      if (profileResponse.success && profileResponse.profile) {
        const p = profileResponse.profile;
        const name = p.genius_name || p.first_name || 'Student';
        let age = p.age || 10;

        if (!p.age && p.date_of_birth) {
          const birthDate = new Date(p.date_of_birth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        profile = { name, age };
      }
    } catch {
      // Use defaults
      profile = { name: 'Student', age: 10 };
    }

    if (!profile) {
      profile = { name: 'Student', age: 10 };
    }

    // Get default templates
    const defaultTemplates = getDefaultTemplates();

    // Generate recommendations using OpenAI (if available) or use mock
    let recommendations: RecommendationResult[] = [];

    try {
      recommendations = await generateTopStorybookRecommendations(
        defaultTemplates,
        profile,
        {
          strengths: personaData?.strengths,
          growth_areas: personaData?.growth_areas,
          learning_style: personaData?.learning_style,
          fun_facts: personaData?.fun_facts,
        },
        6
      );
    } catch {
      // Use mock recommendations
      recommendations = defaultTemplates.slice(0, 6).map((t, idx) => ({
        templateId: t.id,
        matchScore: 85 - idx * 5,
        reasoning: `Great match for your learning journey!`,
        personalizedBenefit: `This will help you explore ${t.focus_areas[0]?.toLowerCase() || 'new skills'}`,
        factors: {
          personaMatch: 0.8,
          learningStyleMatch: 0.75,
          strengthAlignment: 0.7,
          growthPotential: 0.8,
          ageAppropriateness: 0.9,
        },
      }));
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const storedRecs: StoredRecommendation[] = recommendations.map((rec, idx) => {
      const template = defaultTemplates.find(t => t.id === rec.templateId) || defaultTemplates[idx];
      return {
        id: `local_${Date.now()}_${idx}`,
        genius_profile_id: geniusProfileId,
        template_id: rec.templateId,
        template_title: template.title,
        template_icon: template.icon,
        template_description: template.description,
        template_one_liner: template.one_liner,
        template_focus_areas: template.focus_areas,
        match_score: rec.matchScore,
        rank_position: idx + 1,
        reasoning: rec.reasoning,
        personalized_benefit: rec.personalizedBenefit,
        recommendation_factors: rec.factors,
        generated_at: now,
        expires_at: expiresAt,
      };
    });

    // Cache locally
    setCachedRecommendations(geniusProfileId, storedRecs);

    return storedRecs;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
};

// Default templates for local generation
const getDefaultTemplates = () => [
  {
    id: 'template_ambition',
    title: 'My Ambition Adventure',
    icon: '🎯',
    one_liner: 'Discover your dreams and plan your future',
    description: 'Explore different careers, set goals, and create a vision board.',
    focus_areas: ['Goal Setting', 'Self-Discovery', 'Career Exploration'],
  },
  {
    id: 'template_innovation',
    title: 'Innovation Station',
    icon: '💡',
    one_liner: 'Invent solutions that change the world',
    description: 'Become an inventor and learn design thinking.',
    focus_areas: ['Design Thinking', 'Problem Solving', 'Creativity'],
  },
  {
    id: 'template_explorer',
    title: 'World Explorer',
    icon: '🌍',
    one_liner: 'Travel the globe and discover amazing cultures',
    description: 'Journey through continents and learn about cultures.',
    focus_areas: ['Geography', 'Cultural Awareness', 'History'],
  },
  {
    id: 'template_eco',
    title: 'Eco Hero Mission',
    icon: '🌱',
    one_liner: 'Save the planet with sustainable solutions',
    description: 'Learn about environmental challenges and conservation.',
    focus_areas: ['Environmental Science', 'Sustainability', 'Conservation'],
  },
  {
    id: 'template_space',
    title: 'Space Odyssey',
    icon: '🚀',
    one_liner: 'Blast off to explore the mysteries of the universe',
    description: 'Journey through space and learn about planets.',
    focus_areas: ['Astronomy', 'Physics', 'Space Science'],
  },
  {
    id: 'template_kindness',
    title: 'Kindness Quest',
    icon: '❤️',
    one_liner: 'Spread joy and develop emotional intelligence',
    description: 'Explore feelings and practice empathy.',
    focus_areas: ['Emotional Intelligence', 'Empathy', 'Social Skills'],
  },
];

export const trackRecommendationAction = async (
  geniusProfileId: string,
  templateId: string,
  actionType: 'view' | 'click' | 'start' | 'complete',
  recommendationId?: string
) => {
  try {
    await api.post('/aipreneur/recommendations/track', {
      genius_profile_id: geniusProfileId,
      template_id: templateId,
      action_type: actionType,
      recommendation_id: recommendationId || null,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Store locally for later sync
    const actions = JSON.parse(localStorage.getItem('recommendation_actions') || '[]');
    actions.push({
      genius_profile_id: geniusProfileId,
      template_id: templateId,
      action_type: actionType,
      recommendation_id: recommendationId || null,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('recommendation_actions', JSON.stringify(actions));
  }
};

export const shouldRefreshRecommendations = async (
  geniusProfileId: string
): Promise<boolean> => {
  const cached = getCachedRecommendations(geniusProfileId);
  return !cached || cached.length === 0;
};

export default {
  getRecommendationsForStudent,
  trackRecommendationAction,
  shouldRefreshRecommendations,
};
