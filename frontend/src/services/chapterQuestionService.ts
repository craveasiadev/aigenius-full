/**
 * Chapter Question Service
 *
 * Handles chapter questions and user responses.
 * Uses Laravel API instead of direct Supabase access.
 */

import { api } from '../lib/api';
import type { ChapterCode } from '../utils/chapterCodeUtils';
import type { InteractiveQuestionData } from '../components/InteractiveQuestion';

export interface ChapterQuestion {
  id: string;
  chapter_code: ChapterCode;
  question_number: number;
  question_text: string;
  question_type: 'multiple_choice' | 'text_input';
  options?: Array<{ value: string; label: string }>;
  has_other?: boolean;
}

export interface UserChapterResponse {
  id: string;
  user_id: string;
  chapter_id: string;
  question_number: number;
  selected_option?: string;
  text_response?: string;
  answered_at: string;
}

// Local storage keys
const QUESTIONS_CACHE_KEY = 'chapter_questions_cache';
const RESPONSES_CACHE_KEY = 'user_chapter_responses';

export const getChapterQuestions = async (
  chapterCode: ChapterCode
): Promise<ChapterQuestion[]> => {
  try {
    // Try API first
    const response = await api.get<{
      success: boolean;
      questions: ChapterQuestion[];
    }>(`/aipreneur/chapters/${chapterCode}/questions`);

    if (response.success && response.questions) {
      // Cache the questions
      const cache = JSON.parse(localStorage.getItem(QUESTIONS_CACHE_KEY) || '{}');
      cache[chapterCode] = response.questions;
      localStorage.setItem(QUESTIONS_CACHE_KEY, JSON.stringify(cache));

      return response.questions;
    }
  } catch {
    // Fall back to cache
  }

  // Check local cache
  const cache = JSON.parse(localStorage.getItem(QUESTIONS_CACHE_KEY) || '{}');
  return cache[chapterCode] || [];
};

export const getUserChapterResponses = async (
  userId: string,
  chapterCode: ChapterCode
): Promise<UserChapterResponse[]> => {
  try {
    // Try API first
    const response = await api.get<{
      success: boolean;
      responses: UserChapterResponse[];
    }>(`/aipreneur/chapters/${chapterCode}/responses`);

    if (response.success && response.responses) {
      return response.responses;
    }
  } catch {
    // Fall back to local storage
  }

  // Check local storage
  const allResponses = JSON.parse(localStorage.getItem(RESPONSES_CACHE_KEY) || '{}');
  const chapterResponses = allResponses[chapterCode] || [];
  return chapterResponses.filter((r: UserChapterResponse) => r.user_id === userId);
};

export const saveUserChapterResponse = async (
  userId: string,
  chapterCode: ChapterCode,
  questionNumber: number,
  selectedOption?: string,
  textResponse?: string
): Promise<boolean> => {
  const responseData = {
    user_id: userId,
    chapter_code: chapterCode,
    question_number: questionNumber,
    selected_option: selectedOption,
    text_response: textResponse,
    answered_at: new Date().toISOString(),
  };

  try {
    // Try API first
    const response = await api.post<{ success: boolean }>(
      `/aipreneur/chapters/${chapterCode}/responses`,
      responseData
    );

    return response.success;
  } catch {
    // Store locally for later sync
    const allResponses = JSON.parse(localStorage.getItem(RESPONSES_CACHE_KEY) || '{}');
    if (!allResponses[chapterCode]) {
      allResponses[chapterCode] = [];
    }

    // Check if response exists and update, or add new
    const existingIndex = allResponses[chapterCode].findIndex(
      (r: UserChapterResponse) =>
        r.user_id === userId && r.question_number === questionNumber
    );

    if (existingIndex >= 0) {
      allResponses[chapterCode][existingIndex] = {
        ...allResponses[chapterCode][existingIndex],
        selected_option: selectedOption,
        text_response: textResponse,
        answered_at: new Date().toISOString(),
      };
    } else {
      allResponses[chapterCode].push({
        id: `local_${Date.now()}`,
        ...responseData,
      });
    }

    localStorage.setItem(RESPONSES_CACHE_KEY, JSON.stringify(allResponses));
    return true;
  }
};

export const convertToInteractiveQuestion = (
  question: ChapterQuestion
): InteractiveQuestionData | null => {
  if (!question) return null;

  if (question.question_type === 'multiple_choice' && question.options) {
    return {
      id: question.id,
      type: 'multiple-choice',
      question: question.question_text,
      options: question.options.map(opt => opt.label),
      correctAnswer: undefined,
      explanation: 'Thank you for sharing your thoughts!',
    };
  }

  if (question.question_type === 'text_input') {
    return {
      id: question.id,
      type: 'reflection',
      question: question.question_text,
    };
  }

  return null;
};

export const getChapterProgress = async (
  userId: string,
  chapterCode: ChapterCode
): Promise<{
  totalQuestions: number;
  answeredQuestions: number;
  percentComplete: number;
}> => {
  try {
    const [questions, responses] = await Promise.all([
      getChapterQuestions(chapterCode),
      getUserChapterResponses(userId, chapterCode),
    ]);

    const totalQuestions = questions.length;
    const answeredQuestions = responses.length;
    const percentComplete = totalQuestions > 0
      ? Math.round((answeredQuestions / totalQuestions) * 100)
      : 0;

    return {
      totalQuestions,
      answeredQuestions,
      percentComplete,
    };
  } catch (error) {
    console.error('Error getting chapter progress:', error);
    return {
      totalQuestions: 0,
      answeredQuestions: 0,
      percentComplete: 0,
    };
  }
};

export default {
  getChapterQuestions,
  getUserChapterResponses,
  saveUserChapterResponse,
  convertToInteractiveQuestion,
  getChapterProgress,
};
