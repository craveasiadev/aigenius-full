/**
 * OpenAI Service
 *
 * Handles AI-powered features using OpenAI API.
 * Uses environment variables or Laravel API for configuration.
 */

import OpenAI from 'openai';
import { api } from '../lib/api';

let openaiClient: OpenAI | null = null;

const initializeOpenAI = async () => {
  if (openaiClient) return openaiClient;

  try {
    // Try to get API key from Laravel backend first
    let apiKey: string | null = null;

    try {
      const response = await api.get<{ success: boolean; api_key?: string }>('/aipreneur/system/openai-key');
      if (response.success && response.api_key) {
        apiKey = response.api_key;
      }
    } catch {
      // API not available, use env variable
    }

    // Fall back to environment variable
    if (!apiKey) {
      apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
    return openaiClient;
  } catch (err) {
    console.error('Failed to initialize OpenAI:', err);
    throw err;
  }
};

const logUsage = async (params: {
  serviceType: 'gpt4' | 'gpt4-turbo' | 'dalle' | 'dalle3';
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  geniusId?: string;
  userId?: string;
  purpose: 'assessment' | 'story_generation' | 'benefits_analysis' | 'questionnaire_generation' | 'image_generation';
}) => {
  try {
    await api.post('/aipreneur/openai/log-usage', {
      user_type: params.geniusId ? 'genius' : 'system',
      user_id: params.geniusId || params.userId || null,
      service: params.serviceType === 'dalle3' || params.serviceType === 'dalle' ? 'image_generation' : 'text_generation',
      model: params.serviceType === 'dalle3' ? 'dall-e-3' : (params.serviceType === 'dalle' ? 'dall-e-2' : 'gpt-4o-mini'),
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.promptTokens + params.completionTokens,
      estimated_cost: params.totalCost,
      purpose: params.purpose,
    });
  } catch (err) {
    // Log locally if API fails
    const logs = JSON.parse(localStorage.getItem('ai_usage_logs') || '[]');
    logs.push({
      ...params,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('ai_usage_logs', JSON.stringify(logs.slice(-100))); // Keep last 100
  }
};

export interface AssessmentQuestion {
  question: string;
  answer: string;
  category: string;
}

export interface AssessmentResult {
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: number;
  }>;
  analysis: string;
}

export const analyzeAssessment = async (
  questions: AssessmentQuestion[],
  geniusId: string,
  geniusName: string,
  age: number
): Promise<AssessmentResult> => {
  const client = await initializeOpenAI();

  const prompt = `You are an expert child development psychologist and educational consultant. Analyze the following assessment responses from ${geniusName}, a ${age}-year-old child.

ASSESSMENT RESPONSES:
${questions.map((q, i) => `${i + 1}. ${q.question}\n   Answer: ${q.answer}\n   Category: ${q.category}`).join('\n\n')}

Based on these responses, provide a comprehensive analysis in JSON format with the following structure:
{
  "strengths": [list of 3-5 key strength areas identified],
  "weaknesses": [list of 3-5 areas for improvement],
  "recommendations": [
    {
      "title": "Brief recommendation title",
      "description": "Detailed description of how this will help the child",
      "priority": 1-10 rating
    }
    ... (provide exactly 10 recommendations)
  ],
  "analysis": "A warm, encouraging 2-3 paragraph analysis explaining the child's profile, celebrating their strengths, and gently addressing growth areas. Written in a tone that would be shared with parents."
}

Focus on:
- Identifying learning style preferences
- Recognizing creativity vs. analytical thinking balance
- Understanding social-emotional development
- Noting problem-solving approaches
- Celebrating unique talents and interests

Make recommendations specific, actionable, and age-appropriate.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    await logUsage({
      serviceType: 'gpt4',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalCost: ((completion.usage?.total_tokens || 0) * 0.00003),
      geniusId,
      purpose: 'assessment',
    });

    return result;
  } catch (err) {
    console.error('Assessment analysis failed:', err);
    throw new Error('Failed to analyze assessment. Please try again.');
  }
};

export interface PersonalizedBenefit {
  benefit: string;
  reasoning: string;
}

export const generatePersonalizedBenefits = async (
  storybookTemplate: {
    title: string;
    description: string;
    focus_areas: string[];
  },
  assessment: {
    strengths: string[];
    selected_priorities: string[];
  },
  geniusName: string,
  age: number,
  personaData?: {
    strengths?: string[];
    growth_areas?: string[];
    learning_style?: string;
    fun_facts?: string[];
  }
): Promise<string[]> => {
  const client = await initializeOpenAI();

  const personaSection = personaData ? `

CHILD'S PERSONA PROFILE:
Strengths: ${personaData.strengths?.join(', ') || 'Not specified'}
Growth Areas: ${personaData.growth_areas?.join(', ') || 'Not specified'}
Learning Style: ${personaData.learning_style || 'Not specified'}
Unique Traits: ${personaData.fun_facts?.slice(0, 2).join('. ') || 'Not specified'}` : '';

  const prompt = `You are an educational content specialist. Generate personalized benefits for ${geniusName}, a ${age}-year-old child.

STORYBOOK: "${storybookTemplate.title}"
Description: ${storybookTemplate.description}
Focus Areas: ${storybookTemplate.focus_areas.join(', ')}

CHILD'S PROFILE:
Strengths: ${assessment.strengths.join(', ')}
Priority Development Areas: ${assessment.selected_priorities.join(', ')}${personaSection}

Generate exactly 5 specific, personalized benefits explaining how this storybook will help ${geniusName}. Each benefit should:
- Connect the storybook's focus areas to the child's unique personality and development areas
- Be specific and actionable
- Be encouraging and positive
- Be 1-2 sentences long
- Start with an action verb or outcome
${personaData ? "- Take into account the child's learning style and personality traits" : ''}

Return as a JSON object with a "benefits" array:
{"benefits": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4", "Benefit 5"]}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"benefits":[]}');

    await logUsage({
      serviceType: 'gpt4',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalCost: ((completion.usage?.total_tokens || 0) * 0.00003),
      purpose: 'benefits_analysis',
    });

    return result.benefits || [];
  } catch (err) {
    console.error('Benefits generation failed:', err);
    return [
      `Helps ${geniusName} develop key skills in ${storybookTemplate.focus_areas[0]}`,
      `Encourages creative expression and imagination`,
      `Builds confidence through hands-on activities`,
      `Supports growth in priority development areas`,
      `Creates lasting memories through engaging storytelling`,
    ];
  }
};

export interface StoryPage {
  pageNumber: number;
  title: string;
  content: string;
  activityPrompt?: string;
  reflectionQuestion?: string;
}

export interface GeneratedStory {
  title: string;
  pages: StoryPage[];
  theme: string;
}

export const generatePersonalizedStory = async (
  template: {
    title: string;
    description: string;
    focus_areas: string[];
    activities: string[];
  },
  geniusProfile: {
    name: string;
    age: number;
    gender: string;
  },
  questionnaireResponses: Record<string, string>,
  selectedPriorities: string[]
): Promise<GeneratedStory> => {
  const client = await initializeOpenAI();

  const prompt = `You are a master storyteller and children's book author. Create an engaging, personalized storybook for ${geniusProfile.name}, a ${geniusProfile.age}-year-old child.

STORYBOOK TEMPLATE: "${template.title}"
Description: ${template.description}
Focus Areas: ${template.focus_areas.join(', ')}
Suggested Activities: ${template.activities.join(', ')}

CHILD'S PROFILE:
Priority Development Areas: ${selectedPriorities.join(', ')}

QUESTIONNAIRE RESPONSES:
${Object.entries(questionnaireResponses).map(([q, a]) => `${q}: ${a}`).join('\n')}

Create a complete interactive storybook with exactly 8 pages. Each page should:
- Tell part of an engaging narrative featuring ${geniusProfile.name} as the protagonist
- Include an activity prompt or creative challenge
- Incorporate learning elements related to the focus areas
- Build on the child's responses to create a personally relevant story
- Be age-appropriate and encouraging

Return as JSON:
{
  "title": "Personalized story title featuring child's name",
  "theme": "One-sentence theme summary",
  "pages": [
    {
      "pageNumber": 1,
      "title": "Page title",
      "content": "Story content (3-4 paragraphs, 150-200 words)",
      "activityPrompt": "Creative activity instruction",
      "reflectionQuestion": "Thought-provoking question for the child"
    },
    ... (8 pages total)
  ]
}

Make it magical, educational, and deeply personal to ${geniusProfile.name}'s interests and goals.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    await logUsage({
      serviceType: 'gpt4',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalCost: ((completion.usage?.total_tokens || 0) * 0.00003),
      purpose: 'story_generation',
    });

    return result;
  } catch (err) {
    console.error('Story generation failed:', err);
    throw new Error('Failed to generate story. Please try again.');
  }
};

export const generateStorybookBenefitsForStudent = async (
  templates: Array<{
    id: string;
    title: string;
    description: string;
    focus_areas: string[];
  }>,
  geniusProfile: {
    name: string;
    age: number;
  },
  personaData: {
    strengths?: string[];
    growth_areas?: string[];
    learning_style?: string;
    fun_facts?: string[];
  }
): Promise<Record<string, string>> => {
  const client = await initializeOpenAI();

  const templatesDesc = templates.map((t, i) =>
    `${i + 1}. "${t.title}": ${t.description} (Focus: ${t.focus_areas.slice(0, 3).join(', ')})`
  ).join('\n');

  const prompt = `You are an educational advisor. For ${geniusProfile.name}, a ${geniusProfile.age}-year-old child with the following profile, generate a single compelling one-liner benefit for each storybook explaining why it's special for them.

CHILD'S PERSONA:
- Strengths: ${personaData.strengths?.join(', ') || 'Not specified'}
- Growth Areas: ${personaData.growth_areas?.join(', ') || 'Not specified'}
- Learning Style: ${personaData.learning_style || 'Not specified'}
- Unique Traits: ${personaData.fun_facts?.slice(0, 2).join('. ') || 'Not specified'}

STORYBOOKS:
${templatesDesc}

For each storybook, create ONE compelling sentence that:
- Is specific to ${geniusProfile.name}'s personality and learning style
- Highlights how this particular storybook matches their strengths or growth areas
- Is encouraging and makes them excited to start
- Is 12-20 words long
- Uses "you" language (e.g., "Perfect for your creative mind" not "Perfect for their creative mind")

Return as JSON object mapping template titles to benefits:
{
  "Template Title 1": "One-liner benefit for this child",
  "Template Title 2": "One-liner benefit for this child",
  ...
}`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    await logUsage({
      serviceType: 'gpt4',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalCost: ((completion.usage?.total_tokens || 0) * 0.00003),
      purpose: 'benefits_analysis',
    });

    return result;
  } catch (err) {
    console.error('Storybook benefits generation failed:', err);
    return {};
  }
};

export interface RecommendationResult {
  templateId: string;
  matchScore: number;
  reasoning: string;
  personalizedBenefit: string;
  factors: {
    personaMatch: number;
    learningStyleMatch: number;
    strengthAlignment: number;
    growthPotential: number;
    ageAppropriateness: number;
  };
}

export const generateTopStorybookRecommendations = async (
  templates: Array<{
    id: string;
    title: string;
    description: string;
    focus_areas: string[];
    one_liner?: string;
  }>,
  geniusProfile: {
    name: string;
    age: number;
  },
  personaData: {
    strengths?: string[];
    growth_areas?: string[];
    learning_style?: string;
    fun_facts?: string[];
  },
  topN: number = 6
): Promise<RecommendationResult[]> => {
  const client = await initializeOpenAI();

  const templatesDesc = templates.map((t, i) =>
    `${i + 1}. ID: "${t.id}" | Title: "${t.title}" | ${t.description} | Focus: ${t.focus_areas.slice(0, 3).join(', ')}`
  ).join('\n');

  const prompt = `You are an expert educational psychologist and AI recommendation specialist. Analyze ${geniusProfile.name}, a ${geniusProfile.age}-year-old child, and recommend the TOP ${topN} most suitable storybooks from the list below.

CHILD'S PERSONA PROFILE:
- Strengths: ${personaData.strengths?.join(', ') || 'Not specified'}
- Growth Areas: ${personaData.growth_areas?.join(', ') || 'Not specified'}
- Learning Style: ${personaData.learning_style || 'Not specified'}
- Unique Traits: ${personaData.fun_facts?.slice(0, 3).join('. ') || 'Not specified'}
- Age: ${geniusProfile.age} years old

AVAILABLE STORYBOOKS:
${templatesDesc}

For each of the TOP ${topN} most recommended storybooks, provide:
1. A match score (0-100) showing how well it fits this child
2. Detailed reasoning explaining why this is perfect for ${geniusProfile.name}
3. A compelling one-sentence personalized benefit (15-25 words) using "you" language
4. Individual factor scores (0-100 each):
   - personaMatch: Overall personality and interest alignment
   - learningStyleMatch: How well it matches their learning preferences
   - strengthAlignment: Leverages their existing strengths
   - growthPotential: Addresses growth areas effectively
   - ageAppropriateness: Suitable for their age and maturity level

Return as JSON object with "recommendations" array, ordered by match score (highest first):
{
  "recommendations": [
    {
      "templateId": "template_id_from_list",
      "matchScore": 95,
      "reasoning": "Detailed explanation of why this is perfect for the child",
      "personalizedBenefit": "One compelling sentence benefit using 'you' language",
      "factors": {
        "personaMatch": 90,
        "learningStyleMatch": 95,
        "strengthAlignment": 92,
        "growthPotential": 88,
        "ageAppropriateness": 100
      }
    }
  ]
}

Make recommendations that truly understand ${geniusProfile.name}'s unique needs and will engage them deeply.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content || '{"recommendations":[]}');

    await logUsage({
      serviceType: 'gpt4',
      promptTokens: completion.usage?.prompt_tokens || 0,
      completionTokens: completion.usage?.completion_tokens || 0,
      totalCost: ((completion.usage?.total_tokens || 0) * 0.00003),
      purpose: 'benefits_analysis',
    });

    return result.recommendations || [];
  } catch (err) {
    console.error('Recommendation generation failed:', err);
    return generateFallbackRecommendations(templates, personaData, topN);
  }
};

const generateFallbackRecommendations = (
  templates: Array<{
    id: string;
    title: string;
    description: string;
    focus_areas: string[];
  }>,
  personaData: {
    strengths?: string[];
    growth_areas?: string[];
    learning_style?: string;
  },
  topN: number
): RecommendationResult[] => {
  const scoredTemplates = templates.map(template => {
    let score = 60;

    const focusLower = template.focus_areas.map(f => f.toLowerCase());
    const strengthsLower = (personaData.strengths || []).map(s => s.toLowerCase());
    const growthLower = (personaData.growth_areas || []).map(g => g.toLowerCase());

    strengthsLower.forEach(strength => {
      if (focusLower.some(focus => focus.includes(strength) || strength.includes(focus))) {
        score += 10;
      }
    });

    growthLower.forEach(growth => {
      if (focusLower.some(focus => focus.includes(growth) || growth.includes(focus))) {
        score += 8;
      }
    });

    if (personaData.learning_style?.toLowerCase().includes('visual') &&
      (template.title.toLowerCase().includes('creative') ||
        template.title.toLowerCase().includes('art'))) {
      score += 5;
    }

    score = Math.min(score, 100);

    return {
      templateId: template.id,
      matchScore: score,
      reasoning: `This storybook aligns with your interests and development areas, focusing on ${template.focus_areas.slice(0, 2).join(' and ')}.`,
      personalizedBenefit: `Perfect for developing skills in ${template.focus_areas[0]} while building on your natural strengths.`,
      factors: {
        personaMatch: score,
        learningStyleMatch: score - 5,
        strengthAlignment: score - 3,
        growthPotential: score - 2,
        ageAppropriateness: 85,
      }
    };
  });

  scoredTemplates.sort((a, b) => b.matchScore - a.matchScore);
  return scoredTemplates.slice(0, topN);
};

export const generateStoryIllustration = async (
  pageContent: string,
  characterDescription: string,
  style: string = 'childrens book illustration, colorful, whimsical'
): Promise<string> => {
  const client = await initializeOpenAI();

  const prompt = `Create a beautiful children's book illustration for the following scene:

${pageContent}

Character: ${characterDescription}
Style: ${style}

The illustration should be:
- Age-appropriate and cheerful
- Colorful and engaging
- Safe and positive
- Clear and easy to understand`;

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    await logUsage({
      serviceType: 'dalle3',
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0.04,
      purpose: 'image_generation',
    });

    return response.data[0].url || '';
  } catch (err) {
    console.error('Image generation failed:', err);
    return '';
  }
};

export default {
  analyzeAssessment,
  generatePersonalizedBenefits,
  generatePersonalizedStory,
  generateStorybookBenefitsForStudent,
  generateTopStorybookRecommendations,
  generateStoryIllustration,
};
