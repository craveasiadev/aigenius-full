/**
 * Chapter Loader Utility
 *
 * Loads and formats chapter data from Laravel API.
 */

import { api } from '../lib/api';
import type { Chapter, ChapterTag } from '../types/models';

// Local cache key
const CHAPTERS_CACHE_KEY = 'chapters_cache';

export const getIconForTheme = (theme: string): string => {
  const iconMap: Record<string, string> = {
    AMBITION: '🎯',
    INNOVATION: '💡',
    EXPLORATION: '🗺️',
    ENVIRONMENT: '🌱',
    SPACE: '🚀',
    FRIENDSHIP: '❤️',
    DIGITAL: '💻',
    CREATIVITY: '🎨',
    LEADERSHIP: '🦸',
    SCIENCE: '🔬',
    HISTORY: '⏰',
    LEGACY: '🏛️',
  };
  return iconMap[theme] || '📖';
};

// Map theme keys to ChapterTags
const themeToTag: Record<string, ChapterTag> = {
  AMBITION: 'Ambition',
  INNOVATION: 'Innovation',
  EXPLORATION: 'Exploration',
  ENVIRONMENT: 'Green',
  SPACE: 'Space',
  FRIENDSHIP: 'Heart',
  DIGITAL: 'Digital',
  CREATIVITY: 'Creative',
  LEADERSHIP: 'Hero',
  SCIENCE: 'Lab',
  HISTORY: 'Time',
  LEGACY: 'Legacy',
};

export const formatChapterData = (dbChapter: {
  id: string;
  chapter_code?: string;
  ch_orderno: number;
  title: string;
  theme_key: string;
  description?: string;
  icon?: string;
  focus_areas?: string[];
  reward_badge?: string;
}): Chapter => {
  return {
    id: dbChapter.id as Chapter['id'],
    code: dbChapter.chapter_code || dbChapter.id,
    number: dbChapter.ch_orderno,
    title: dbChapter.title,
    tag: themeToTag[dbChapter.theme_key] || 'Ambition',
    description: dbChapter.description || `Discover ${dbChapter.title}`,
    coverTemplates: [],
    icon: dbChapter.icon || getIconForTheme(dbChapter.theme_key),
    theme: dbChapter.theme_key,
    focus: dbChapter.focus_areas || [],
    activity: 'Read a personalized story and answer quiz questions',
    output: `A personalized storybook about ${dbChapter.title.toLowerCase()}`,
    rewardBadge: dbChapter.reward_badge || `${dbChapter.theme_key} Master`,
  };
};

export const loadChaptersFromDatabase = async (): Promise<{
  chapters: Chapter[];
  error: Error | null;
}> => {
  try {
    // Try API first
    const response = await api.get<{
      success: boolean;
      chapters?: Array<{
        id: string;
        chapter_code?: string;
        ch_orderno: number;
        title: string;
        theme_key: string;
        description?: string;
        icon?: string;
        focus_areas?: string[];
        reward_badge?: string;
      }>;
    }>('/aipreneur/chapters');

    if (response.success && response.chapters) {
      const formattedChapters = response.chapters.map(formatChapterData);

      // Cache the chapters
      localStorage.setItem(CHAPTERS_CACHE_KEY, JSON.stringify({
        chapters: formattedChapters,
        timestamp: Date.now(),
      }));

      return { chapters: formattedChapters, error: null };
    }
  } catch (error) {
    console.error('Error loading chapters from API:', error);

    // Try to use cached chapters
    try {
      const cached = JSON.parse(localStorage.getItem(CHAPTERS_CACHE_KEY) || '{}');
      if (cached.chapters && cached.chapters.length > 0) {
        console.log('Using cached chapters');
        return { chapters: cached.chapters, error: null };
      }
    } catch {
      // Cache read failed
    }
  }

  // Return default chapters if no API or cache
  return { chapters: getDefaultChapters(), error: null };
};

// Default chapters for fallback
const getDefaultChapters = (): Chapter[] => {
  const defaultData = [
    { id: '1', code: 'CH_AMBITION_01', number: 1, title: 'The Ambition Adventure', theme: 'AMBITION' },
    { id: '2', code: 'CH_INNOVATION_01', number: 2, title: 'Innovation Station', theme: 'INNOVATION' },
    { id: '3', code: 'CH_WORLD_01', number: 3, title: 'Exploration Quest', theme: 'EXPLORATION' },
    { id: '4', code: 'CH_ECO_01', number: 4, title: 'Green Planet Heroes', theme: 'ENVIRONMENT' },
    { id: '5', code: 'CH_SPACE_01', number: 5, title: 'Space Odyssey', theme: 'SPACE' },
    { id: '6', code: 'CH_FRIENDSHIP_01', number: 6, title: 'Heart & Kindness', theme: 'FRIENDSHIP' },
    { id: '7', code: 'CH_DIGITAL_01', number: 7, title: 'Digital World', theme: 'DIGITAL' },
    { id: '8', code: 'CH_CREATIVITY_01', number: 8, title: 'Creative Spark', theme: 'CREATIVITY' },
    { id: '9', code: 'CH_LEADERSHIP_01', number: 9, title: 'Everyday Heroes', theme: 'LEADERSHIP' },
    { id: '10', code: 'CH_SCIENCE_01', number: 10, title: 'Science Lab', theme: 'SCIENCE' },
    { id: '11', code: 'CH_HISTORY_01', number: 11, title: 'Time Travelers', theme: 'HISTORY' },
    { id: '12', code: 'CH_LEGACY_01', number: 12, title: 'Legacy Builders', theme: 'LEGACY' },
  ];

  return defaultData.map(ch => ({
    id: ch.id as Chapter['id'],
    code: ch.code,
    number: ch.number,
    title: ch.title,
    tag: themeToTag[ch.theme] || 'Ambition',
    description: `Discover ${ch.title}`,
    coverTemplates: [],
    icon: getIconForTheme(ch.theme),
    theme: ch.theme,
    focus: [],
    activity: 'Read a personalized story and answer quiz questions',
    output: `A personalized storybook about ${ch.title.toLowerCase()}`,
    rewardBadge: `${ch.theme} Master`,
  }));
};

export const getRandomChapters = (chapters: Chapter[], count: number): Chapter[] => {
  const shuffled = [...chapters].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, chapters.length));
};

export const getChapterBenefits = (): Record<string, string> => {
  return {
    'The Ambition Adventure': 'Perfect for building goal-setting skills and turning your creative dreams into achievable plans!',
    'Innovation Station': 'Unleash your natural creativity to solve real problems and invent amazing solutions!',
    'Exploration Quest': 'Feed your curiosity by discovering new cultures and places through visual storytelling!',
    'Green Planet Heroes': 'Channel your problem-solving skills to protect the environment and create sustainable solutions!',
    'Space Odyssey': 'Explore the universe while developing your analytical thinking and imagination!',
    'Heart & Kindness': 'Build emotional intelligence and strengthen your natural empathy for others!',
    'Digital World': 'Master technology skills while staying safe and creative in the digital age!',
    'Creative Spark': 'Perfect for visual learners like you - express yourself through art and storytelling!',
    'Everyday Heroes': 'Discover your leadership potential and learn how small actions create big changes!',
    'Science Lab': 'Explore hands-on experiments that bring your curiosity and creativity to life!',
    'Time Travelers': 'Journey through history and meet amazing people who changed the world!',
    'Legacy Builders': 'Create meaningful projects that combine your creativity with lasting impact!',
  };
};

export const getChapterGradients = (): string[] => {
  return [
    'from-yellow-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-green-500 to-emerald-500',
    'from-purple-500 to-pink-500',
    'from-red-500 to-rose-500',
    'from-indigo-500 to-violet-500',
    'from-cyan-500 to-blue-500',
    'from-pink-500 to-rose-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-red-500',
    'from-violet-500 to-purple-500',
    'from-teal-500 to-cyan-500',
  ];
};

export default {
  loadChaptersFromDatabase,
  formatChapterData,
  getRandomChapters,
  getIconForTheme,
  getChapterBenefits,
  getChapterGradients,
};
