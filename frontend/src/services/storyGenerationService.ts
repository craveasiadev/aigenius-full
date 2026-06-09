/**
 * Story Generation Service
 *
 * Handles AI-powered story generation for children's storybooks.
 * Uses Laravel API instead of direct Supabase access.
 */

import OpenAI from 'openai';
import { api } from '../lib/api';
import type {
  StoryGenerationRequest,
  StoryGenerationResponse,
  BackcoverRequest,
  BackcoverResponse,
  StorySession,
} from '../types/story';

let openaiClient: OpenAI | null = null;

export function clearOpenAIClient() {
  openaiClient = null;
}

async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;

  // Try to get API key from Laravel backend
  let apiKey: string | null = null;

  try {
    const response = await api.get<{ success: boolean; api_key?: string }>('/aipreneur/system/openai-key');
    if (response.success && response.api_key) {
      apiKey = response.api_key;
    }
  } catch {
    // Fall back to environment variable
  }

  if (!apiKey) {
    apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }

  if (!apiKey || apiKey.trim() === '') {
    throw new Error('OpenAI API key not configured. Please add it in Admin Settings.');
  }

  console.log('🔑 Initializing OpenAI client with API key:', apiKey.substring(0, 20) + '...');

  openaiClient = new OpenAI({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
  });

  return openaiClient;
}

async function getTextGenerationModel(): Promise<string> {
  try {
    const response = await api.get<{ success: boolean; model?: string }>('/aipreneur/system/ai-model');
    if (response.success && response.model) {
      return response.model;
    }
  } catch {
    // Use default
  }
  return 'gpt-4o-mini';
}

// Local storage for story sessions
const STORY_SESSIONS_KEY = 'story_sessions';

function getStoredSessions(): Record<string, StorySession> {
  try {
    return JSON.parse(localStorage.getItem(STORY_SESSIONS_KEY) || '{}');
  } catch {
    return {};
  }
}

function storeSession(session: StorySession): void {
  const sessions = getStoredSessions();
  sessions[session.session_id] = session;
  localStorage.setItem(STORY_SESSIONS_KEY, JSON.stringify(sessions));
}

export const generateStory = async (request: StoryGenerationRequest): Promise<StoryGenerationResponse> => {
  const answersText = request.answers.map((a, i) => `Q${i + 1}: ${a.answer_code}`).join('\n');

  const prompt = `You are an AI storytelling engine for children. Generate a personalized 10-page interactive storybook.

CHILD INFO:
- Name: ${request.genius_name}
- Age: ${request.age}
- Gender: ${request.gender}
- Learning Style: ${request.learning_style}
- Behaviour: ${request.behaviour_tendency}
- Curiosity: ${request.curiosity_type}

CHAPTER: ${request.chapter_title} (Theme: ${request.chapter_theme})

PERSONALIZATION ANSWERS:
${answersText}

Generate a JSON response with exactly this structure:
{
  "titles": ["4 story title options - each MUST include the child's name ${request.genius_name}"],
  "pages": [
    {
      "page_index": 1,
      "page_type": "activity" or "quiz",
      "intro_text": "engaging story text for this page (2-3 sentences)",
      "activity_prompt_photo": "if activity: instruction for photo/art activity",
      "activity_requires_photo": true/false,
      "activity_prompt_question": "if quiz: the question",
      "question_id": "if quiz: unique id",
      "options": ["if quiz: 4 answer options"],
      "result_text_template": "short continuation text (1-2 sentences)"
    }
    ... 10 pages total, mix of activity and quiz pages
  ]
}

RULES:
- Each title MUST include "${request.genius_name}"
- Alternate between activity and quiz pages
- Keep text appropriate for age ${request.age}
- Make it exciting and educational
- Each page builds on the story
- Return ONLY valid JSON, no markdown`;

  try {
    console.log('📖 Starting story generation for chapter:', request.chapter_code);

    const openai = await getOpenAIClient();
    const model = await getTextGenerationModel();

    console.log('🤖 Using model:', model);

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const content = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    console.log('✅ OpenAI response received. Tokens used:', tokensUsed);

    if (!content) {
      throw new Error('No content generated from OpenAI');
    }

    const generated = JSON.parse(content);
    console.log('📚 Story data parsed successfully. Title options:', generated.titles?.length);

    const sessionId = crypto.randomUUID();
    const storySession: StorySession = {
      session_id: sessionId,
      chapter_code: request.chapter_code,
      chapter_title: request.chapter_title,
      chapter_theme: request.chapter_theme,
      genius_name: request.genius_name,
      age: request.age,
      gender: request.gender,
      titles: generated.titles,
      pages: generated.pages,
    };

    console.log('💾 Saving story session...');

    // Try to save to API
    try {
      await api.post('/aipreneur/story-sessions', {
        session_id: sessionId,
        genius_profile_id: request.genius_profile_id,
        chapter_code: request.chapter_code,
        chapter_title: request.chapter_title,
        chapter_theme: request.chapter_theme,
        genius_name: request.genius_name,
        age: request.age,
        gender: request.gender,
        titles: generated.titles,
        pages: generated.pages,
      });
    } catch {
      // Store locally
      storeSession(storySession);
    }

    console.log('✅ Story session saved successfully');

    // Log token usage
    try {
      await api.post('/aipreneur/ai/usage-log', {
        genius_profile_id: request.genius_profile_id,
        tokens_used: tokensUsed,
        purpose: 'story_generation',
      });
    } catch {
      // Ignore logging errors
    }

    return {
      session_id: sessionId,
      story_session: storySession,
      tokens_used: tokensUsed,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Story generation error:', err);

    if (err.message?.includes('API key')) {
      console.error('🔑 API key issue detected');
      throw new Error('OpenAI API key is not configured properly. Please check Admin Settings.');
    }

    if (err.message?.includes('quota')) {
      console.error('💳 API quota issue detected');
      throw new Error('OpenAI API quota exceeded. Please check your API usage.');
    }

    console.error('🔍 Full error details:', err);
    throw new Error(err.message || 'An unexpected error occurred during story generation. Please try again.');
  }
};

export const generateBackcover = async (request: BackcoverRequest): Promise<BackcoverResponse> => {
  const prompt = `Generate a back cover summary and author blurb for a children's storybook.

STORY INFO:
- Title: ${request.selected_title}
- Chapter: ${request.chapter_title}
- Child: ${request.genius_name}, age ${request.age}, ${request.gender}

Generate a JSON response:
{
  "backcover_summary": "3-4 sentence summary appropriate for a book back cover, exciting and inviting",
  "backcover_author_text": "2-3 sentences about the author (the child) highlighting their creativity and uniqueness"
}

Return ONLY valid JSON, no markdown`;

  try {
    const openai = await getOpenAIClient();
    const model = await getTextGenerationModel();

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!content) {
      throw new Error('No content generated');
    }

    const generated = JSON.parse(content);

    // Try to update session via API
    try {
      await api.put(`/aipreneur/story-sessions/${request.session_id}`, {
        backcover_summary: generated.backcover_summary,
        backcover_author_text: generated.backcover_author_text,
      });
    } catch {
      // Update local storage
      const sessions = getStoredSessions();
      if (sessions[request.session_id]) {
        sessions[request.session_id].backcover_summary = generated.backcover_summary;
        sessions[request.session_id].backcover_author_text = generated.backcover_author_text;
        localStorage.setItem(STORY_SESSIONS_KEY, JSON.stringify(sessions));
      }
    }

    // Log token usage
    try {
      await api.post('/aipreneur/ai/usage-log', {
        genius_profile_id: request.genius_profile_id,
        tokens_used: tokensUsed,
        purpose: 'story_generation',
      });
    } catch {
      // Ignore logging errors
    }

    return {
      backcover_summary: generated.backcover_summary,
      backcover_author_text: generated.backcover_author_text,
      tokens_used: tokensUsed,
    };
  } catch (error) {
    console.error('Backcover generation error:', error);
    throw error;
  }
};

export const getStorySession = async (sessionId: string): Promise<StorySession | null> => {
  // Try API first
  try {
    const response = await api.get<{ success: boolean; session: StorySession }>(
      `/aipreneur/story-sessions/${sessionId}`
    );
    if (response.success && response.session) {
      return response.session;
    }
  } catch {
    // Fall back to local storage
  }

  // Check local storage
  const sessions = getStoredSessions();
  return sessions[sessionId] || null;
};

export const updateStorySession = async (sessionId: string, updates: Partial<StorySession>): Promise<void> => {
  // Try API first
  try {
    await api.put(`/aipreneur/story-sessions/${sessionId}`, updates);
    return;
  } catch {
    // Update local storage
  }

  const sessions = getStoredSessions();
  if (sessions[sessionId]) {
    sessions[sessionId] = { ...sessions[sessionId], ...updates };
    localStorage.setItem(STORY_SESSIONS_KEY, JSON.stringify(sessions));
  }
};

export interface GeneratePageImageRequest {
  intro_text: string;
  result_text: string;
  genius_name: string;
  age: number;
  gender: string;
  page_index: number;
  chapter_theme: string;
  uploaded_image_base64?: string;
}

export interface GeneratePageImageResponse {
  image_url: string;
  tokens_used: number;
}

export const generateStorybookPageImage = async (
  request: GeneratePageImageRequest,
  genius_profile_id: string
): Promise<GeneratePageImageResponse> => {
  const basePrompt = `Using this uploaded image, generate a story page of: ${request.intro_text} ${request.result_text}

Ensure the uploaded image is improved into the story; yet still recognizable.

CHARACTER: ${request.genius_name}, a ${request.age}-year-old ${request.gender}
THEME: ${request.chapter_theme}
PAGE: ${request.page_index + 1}

Create a colorful, whimsical storybook illustration that:
- Features ${request.genius_name} as the main character
- Captures the magical moment described in the story
- Uses a warm, inviting, child-friendly art style
- Is age-appropriate and positive
- Has clear composition with ${request.genius_name} as the focal point
- Looks like it belongs in a premium children's book
- Incorporates recognizable elements from the uploaded image
- Style: digital illustration, vibrant colors, storybook art, watercolor-inspired

Make it enchanting and memorable! Ensure the image is as what attached, make sure there is no text or font in the whole image and image should be ready image that I can print as storybook page.`;

  try {
    console.log('🎨 Starting image generation for page:', request.page_index);
    console.log('📸 Has uploaded image:', !!request.uploaded_image_base64);

    const openai = await getOpenAIClient();

    let imageUrl: string | undefined;
    const tokensUsed = 1000;

    console.log('🖼️ Using gpt-image-1-mini for image generation');

    const response = await openai.images.generate({
      model: 'gpt-image-1-mini',
      prompt: basePrompt,
      size: '1024x1024',
      n: 1,
    });

    imageUrl = response.data[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI');
    }

    console.log('✅ Image generated successfully');

    // Log token usage
    try {
      await api.post('/aipreneur/ai/usage-log', {
        genius_profile_id,
        tokens_used: tokensUsed,
        purpose: 'image_generation',
      });
    } catch {
      // Ignore logging errors
    }

    return {
      image_url: imageUrl,
      tokens_used: tokensUsed,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Image generation error:', err);

    if (err.message?.includes('API key')) {
      throw new Error('OpenAI API key is not configured properly. Please check Admin Settings.');
    }

    if (err.message?.includes('quota') || err.message?.includes('billing')) {
      throw new Error('OpenAI API quota exceeded. Please check your API usage.');
    }

    throw new Error(err.message || 'Failed to generate image. Please try again.');
  }
};

export default {
  generateStory,
  generateBackcover,
  getStorySession,
  updateStorySession,
  generateStorybookPageImage,
  clearOpenAIClient,
};
