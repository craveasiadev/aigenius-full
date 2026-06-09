/**
 * Persona Insights Service
 *
 * Analyzes chapter responses to build persona insights.
 * Uses Laravel API instead of direct Supabase access.
 */

import { api } from '../lib/api';
import type { ChapterCode } from '../utils/chapterCodeUtils';
import { getUserChapterResponses } from './chapterQuestionService';

interface PersonaInsight {
  category: string;
  insights: string[];
  confidence: number;
}

const chapterThemes: Record<ChapterCode, string> = {
  CH_AMBITION_01: 'Ambition and Dreams',
  CH_INNOVATION_01: 'Innovation and Creativity',
  CH_WORLD_01: 'Exploration and Adventure',
  CH_ECO_01: 'Environmental Awareness',
  CH_SPACE_01: 'Space and Science',
  CH_FRIENDSHIP_01: 'Kindness and Empathy',
  CH_DIGITAL_01: 'Digital Literacy',
  CH_CREATIVITY_01: 'Creative Expression',
  CH_LEADERSHIP_01: 'Leadership',
  CH_SCIENCE_01: 'Scientific Inquiry',
  CH_HISTORY_01: 'Historical Awareness',
  CH_LEGACY_01: 'Self-Reflection',
};

export const analyzeChapterResponses = async (
  userId: string,
  chapterCode: ChapterCode
): Promise<PersonaInsight[]> => {
  try {
    const responses = await getUserChapterResponses(userId, chapterCode);

    if (responses.length === 0) {
      return [];
    }

    const insights: PersonaInsight[] = [];

    const theme = chapterThemes[chapterCode];
    if (theme) {
      insights.push({
        category: theme,
        insights: [
          `Showed strong engagement with ${theme.toLowerCase()} content`,
          `Completed ${responses.length} questions in this chapter`,
        ],
        confidence: 0.8,
      });
    }

    return insights;
  } catch (error) {
    console.error('Error analyzing chapter responses:', error);
    return [];
  }
};

export const updatePersonaProfileWithInsights = async (
  geniusProfileId: string,
  chapterCode: ChapterCode
): Promise<boolean> => {
  try {
    // Try to update via API
    const response = await api.post<{ success: boolean }>('/aipreneur/persona/update-insights', {
      genius_profile_id: geniusProfileId,
      chapter_code: chapterCode,
    });

    return response.success;
  } catch (error) {
    console.error('Error in updatePersonaProfileWithInsights:', error);

    // Fall back to local analysis
    const insights = await analyzeChapterResponses(geniusProfileId, chapterCode);

    if (insights.length === 0) {
      return false;
    }

    // Store insights locally for later sync
    const storedInsights = JSON.parse(localStorage.getItem('persona_insights') || '[]');
    storedInsights.push({
      genius_profile_id: geniusProfileId,
      chapter_code: chapterCode,
      insights,
      created_at: new Date().toISOString(),
    });
    localStorage.setItem('persona_insights', JSON.stringify(storedInsights));

    return true;
  }
};

export const shouldRefreshRecommendations = async (
  geniusProfileId: string,
  chapterCode: ChapterCode
): Promise<boolean> => {
  try {
    // Try API first
    const response = await api.get<{
      success: boolean;
      should_refresh: boolean;
    }>(`/aipreneur/persona/should-refresh?chapter_code=${chapterCode}`);

    if (response.success) {
      return response.should_refresh;
    }
  } catch {
    // Fall back to local check
  }

  // Local fallback - based on stored responses
  try {
    const responses = await getUserChapterResponses(geniusProfileId, chapterCode);
    const chapterThreshold = 3;
    return responses.length >= chapterThreshold;
  } catch (error) {
    console.error('Error checking if recommendations should refresh:', error);
    return false;
  }
};

export default {
  analyzeChapterResponses,
  updatePersonaProfileWithInsights,
  shouldRefreshRecommendations,
};
