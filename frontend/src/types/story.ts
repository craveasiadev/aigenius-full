export type ActivityType = 'activity' | 'quiz';

export interface StoryPage {
  page_index: number;
  page_type: ActivityType;
  intro_text: string;
  activity_prompt_photo?: string;
  activity_requires_photo?: boolean;
  activity_prompt_question?: string;
  question_id?: string;
  options?: string[];
  result_text_template: string;
}

export interface StorySession {
  session_id: string;
  chapter_code: string;
  chapter_title: string;
  chapter_theme: string;
  genius_name: string;
  age: number;
  gender: string;
  titles: string[];
  selected_title?: string;
  cover_image_url?: string;
  pages: StoryPage[];
  generated_images?: Record<number, string>;
  backcover_summary?: string;
  backcover_author_text?: string;
}

export interface PersonalizationAnswer {
  question_id: string;
  answer_code: string;
}

export interface StoryGenerationRequest {
  genius_profile_id: string;
  genius_name: string;
  age: number;
  gender: string;
  learning_style: string;
  behaviour_tendency: string;
  curiosity_type: string;
  chapter_code: string;
  chapter_title: string;
  chapter_theme: string;
  answers: PersonalizationAnswer[];
}

export interface StoryGenerationResponse {
  session_id: string;
  story_session: StorySession;
  tokens_used: number;
}

export interface BackcoverRequest {
  session_id: string;
  genius_profile_id: string;
  genius_name: string;
  age: number;
  gender: string;
  chapter_code: string;
  chapter_title: string;
  selected_title: string;
}

export interface BackcoverResponse {
  backcover_summary: string;
  backcover_author_text: string;
  tokens_used: number;
}
