/**
 * AIpreneur API Service
 *
 * Complete API service for the AIpreneur platform.
 * Replaces Supabase with Laravel backend.
 */

import { geniusApi as api, setGeniusToken as setToken, clearAllTokens, getGeniusToken as getToken, api as parentApi, publicApi } from '../lib/api';

// =============================================
// TYPES
// =============================================

export interface GeniusProfile {
  id: string;
  parent_id: string;
  genius_id: string;
  first_name: string;
  last_name: string | null;
  age: number | null;
  email?: string | null;
  avatar_url: string | null;
  passion_category: string | null;
  aipreneur_shop_name: string | null;
  aipreneur_onboarding_completed: boolean;
  persona_quiz_completed: boolean;
  selfie_url: string | null;
  signboard_url: string | null;
  onboarding_stage: string | null;
  created_at: string;
  updated_at: string;
  business?: AIpreneurBusiness;
  rewards?: AIpreneurReward;
  products?: AIpreneurProduct[];
  staff?: AIpreneurStaff[];
}

export interface AIpreneurBusiness {
  id: string;
  student_id: string;
  shop_theme: string | null;
  shop_url_slug: string | null;
  shop_image_url: string | null;           // Shop only (transparent PNG, no person)
  shop_scene_image_url: string | null;     // Shop with person and background scene
  shop_image_status: 'pending' | 'generating' | 'completed' | 'failed' | null;
  shop_vibe: string | null;
  shop_colors: string[] | null;
  shop_usp: string | null;
  exterior_config: Record<string, unknown>;
  interior_config: Record<string, unknown>;
  questionnaire_answers: Record<string, unknown>;
  module_product_progress: number;
  module_decorate_progress: number;
  module_operation_progress: number;
  module_marketing_progress: number;
  module_innovation_progress: number;
  module_csr_progress: number;
  total_sales: number;
  total_costs: number;
  total_profit: number;
  shop_launched: boolean;
  launched_at: string | null;
  charity_percentage: number;
  selected_cause: string | null;
  total_donated: number;
  staff_overall_mood: number;
  popularity_level: number;
  store_visitors: number;
  store_likes: number;
  current_quest: string | null;
  streak_days: number;
  last_csr_action_date?: string | null;
  last_finance_game_date?: string | null;
  // Shop opening quest system
  opening_checklist: { products_created: boolean; staff_hired: boolean } | null;
  ribbon_cutting_completed: boolean;
  ribbon_cutting_at: string | null;
  traffic_multiplier: number;
  traffic_boost_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIpreneurProduct {
  id: string;
  student_id: string;
  product_name: string;
  description: string | null;
  price: number;
  positioning_strategy: string;
  image_url: string | null;
  image_source: string | null;
  image_status: 'pending' | 'generating' | 'completed' | 'failed' | null;
  image_error: string | null;
  image_prompt: string | null;
  units_sold: number;
  revenue_generated: number;
  created_at: string;
}

export interface AIpreneurStaff {
  id: string;
  student_id: string;
  staff_role: string;
  staff_name: string;
  mood: number;
  energy: number;
  salary: number;
  skills: string[];
  hobbies: string[];
  personality: string | null;
  interview_id: string | null;
  last_event: string | null;
  last_event_date: string | null;
  // Behavior traits from interviews
  behavior_traits: string[] | null;
  speed_modifier: number;
  efficiency_modifier: number;
  created_at: string;
  updated_at: string;
}

export interface AIpreneurDecoration {
  id: string;
  student_id: string;
  mood_theme: string;
  decoration_focus: string | null;
  happiness_boost: number;
  price_willingness_multiplier: number;
  uniqueness_score: number;
  cost: number;
  applied_at: string;
}

export interface AIpreneurDecorationItem {
  id: string;
  student_id: string;
  item_type: string;
  item_name: string;
  item_config: Record<string, unknown>;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}

export interface AIpreneurInterview {
  id: string;
  student_id: string;
  npc_name: string;
  npc_role: string;
  npc_personality: Record<string, unknown>;
  npc_avatar: string | null;
  questions_asked: Record<string, unknown>[] | null;
  responses: Record<string, unknown>[] | null;
  decision: string | null;
  created_at: string;
}

export interface AIpreneurCampaign {
  id: string;
  student_id: string;
  campaign_name: string;
  marketing_goal: string;
  color_style: string | null;
  channels: string[];
  budget_coins: number;
  reach: number;
  likes: number;
  new_visitors: number;
  profit_generated: number;
  roi: number;
  launched_at: string;
}

export interface AIpreneurMarketingAsset {
  id: string;
  student_id: string;
  asset_type: string;
  asset_url: string;
  asset_config: Record<string, unknown>;
  placement: string | null;
  active: boolean;
  created_at: string;
}

export interface AIpreneurClassSlot {
  id: string;
  class_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  location: string | null;
  status: string;
}

export interface AIpreneurClass {
  id: string;
  title: string;
  category: string;
  description: string | null;
  level: string;
  price: number;
  duration_minutes: number;
  cover_image_url: string | null;
  is_active: boolean;
  slots?: AIpreneurClassSlot[];
}

export interface AIpreneurClassBooking {
  id: string;
  slot_id: string;
  student_id: string;
  parent_id?: string | null;
  order_id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  amount: number;
  payment_method?: string | null;
  payment_status: string;
  status: string;
  paid_at?: string | null;
  checked_in_at?: string | null;
  created_at: string;
  slot?: AIpreneurClassSlot & { course?: AIpreneurClass };
  student?: {
    id: string;
    genius_name?: string;
    first_name?: string;
    last_name?: string;
    genius_id?: string;
  };
}

export interface AdminDashboardOverviewResponse {
  success: boolean;
  stats: {
    total_parents: number;
    total_genius: number;
    total_completed_chapters: number;
    total_bookings: number;
    total_admins: number;
    monthly_sales: number;
  };
  top_chapters: Array<{ chapter_code: string; count: number }>;
  recent_activity: Array<{ genius_name: string; chapter_code: string; completed_at: string }>;
}

export interface AdminMembersResponse {
  success: boolean;
  summary: {
    total_parents: number;
    total_genius: number;
    total_children: number;
  };
  parents: Array<{
    id: string;
    parent_name: string;
    parent_email: string;
    total_children: number;
    created_at: string;
  }>;
  genius: Array<{
    id: string;
    genius_name: string;
    genius_uid: string | null;
    age: number | null;
    parent_id: string;
    parent_name?: string;
    parent_email?: string;
    persona_status: string;
    completed_chapters: number;
    last_activity: string | null;
    coins: number;
    xp: number;
    total_sales: number;
    total_profit: number;
  }>;
}

export interface AIpreneurInfluencerCampaign {
  id: string;
  student_id: string;
  influencer_name: string;
  influencer_tier: string;
  influencer_avatar: string | null;
  influencer_niche?: string | null;
  cost: number;
  reach: number;
  engagement: number;
  conversions: number;
  started_at: string;
  ended_at: string;
}

export interface AIpreneurInnovation {
  id: string;
  student_id: string;
  tech_project: string;
  design_image_url?: string | null;
  quiz_answers: Record<string, unknown>;
  efficiency_boost: number;
  cost_increase: number;
  happiness_boost: number;
  is_active: boolean;
  upgrade_level: number;
  scaled_effects?: {
    sales_boost: number;
    popularity_boost: number;
    mood_boost: number;
  };
  lab_level: number;
  unlocked_at: string;
}

export interface AIpreneurInnovationProject {
  id: string;
  name: string;
  unlock_level: number;
  unlock_cost?: number;
  max_upgrade_level: number;
  is_unlocked_for_level: boolean;
  base_sales_boost: number;
  base_popularity_boost: number;
  base_mood_boost: number;
}

export interface AIpreneurReward {
  id: string;
  student_id: string;
  coins: number;
  ai_tokens: number;
  total_coins_earned?: number;
  stars: number;
  xp: number;
  level: number;
  badges: string[];
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  last_daily_claim_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type AIpreneurRewardStoreCategory = 'theme_park' | 'food' | 'beauty' | 'health' | 'travel' | 'more';

export interface AIpreneurRewardStoreItem {
  id: string;
  name: string;
  category: AIpreneurRewardStoreCategory;
  desc: string;
  details: string;
  imageUrl: string;
  price: number;
  stock: number;
  partner?: string | null;
  popular?: boolean;
}

export interface AIpreneurPersonaProfile {
  id: string;
  // Backend uses user_id (genius profile id). Keep legacy field for compatibility.
  user_id?: string;
  genius_profile_id?: string;
  strengths: string[];
  growth_areas: string[];
  learning_style: string;
  fun_facts: string[];
  trait_scores: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface QuestionnaireAnswers {
  businessType: string;
  vibe: string;
  colors: string[];
  superpower: string;
  shopName: string;
}

// Response types
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

interface LoginResponse extends ApiResponse<GeniusProfile> {
  token: string;
  profile: GeniusProfile;
}

interface ProfileResponse extends ApiResponse<GeniusProfile> {
  profile: GeniusProfile;
}

interface BusinessResponse extends ApiResponse<AIpreneurBusiness> {
  business: AIpreneurBusiness;
  overall_progress: number;
}

interface CredentialsResponse extends ApiResponse<GeniusProfile> {
  profile: GeniusProfile;
  credentials: {
    genius_id: string;
    password: string;
  };
}

interface PersonaProfileResponse extends ApiResponse<AIpreneurPersonaProfile> {
  profile: GeniusProfile;
  persona: AIpreneurPersonaProfile;
}

// =============================================
// AUTHENTICATION
// =============================================

export const authApi = {
  /**
   * Login with genius ID and password.
   */
  async login(geniusId: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/aipreneur/auth/login', {
      genius_id: geniusId,
      password,
    });

    if (response.success && response.token) {
      setToken(response.token);
    }

    return response;
  },

  /**
   * Logout current genius.
   * Clears ALL tokens to prevent cross-contamination between auth systems.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/aipreneur/auth/logout');
    } finally {
      clearAllTokens();
      console.log('[authApi] Logout complete - all tokens cleared');
    }
  },

  /**
   * Parent login as child - get a genius token for the child profile.
   * Requires parent to be authenticated with sanctum token.
   * Uses parentApi (parent's auth_token) instead of geniusApi (genius_token).
   */
  async parentLoginAsChild(profileId: string): Promise<LoginResponse> {
    // Use parentApi which uses the parent's auth_token (not genius_token)
    const response = await parentApi.post<LoginResponse>('/aipreneur/auth/parent-login-as-child', {
      profile_id: profileId
    });

    if (response.success && response.token) {
      // Set the genius token so the child dashboard can use it
      setToken(response.token);
    }

    return response;
  },

  /**
   * Get current logged-in profile.
   */
  async getCurrentProfile(): Promise<ProfileResponse> {
    return api.get<ProfileResponse>('/aipreneur/auth/me');
  },

  /**
   * Lightweight session check (heartbeat).
   * Returns 200 if session valid, 401 if revoked by another login.
   */
  async sessionCheck(): Promise<{ success: boolean; valid: boolean }> {
    return api.get<{ success: boolean; valid: boolean }>('/aipreneur/auth/session-check');
  },

  /**
   * Check if user is authenticated.
   */
  isAuthenticated(): boolean {
    return !!getToken();
  },
};

// =============================================
// PROFILES
// =============================================

export const profileApi = {
  /**
   * Create a new genius profile (by parent).
   */
  async create(data: {
    parent_id: string;
    first_name: string;
    last_name?: string;
    age?: number;
    avatar_url?: string;
  }): Promise<CredentialsResponse> {
    return api.post<CredentialsResponse>('/aipreneur/profiles', data);
  },

  /**
   * Update profile information.
   */
  async update(data: {
    first_name?: string;
    last_name?: string;
    age?: number;
    avatar_url?: string;
  }): Promise<ProfileResponse> {
    return api.put<ProfileResponse>('/aipreneur/profile', data);
  },

  /**
   * Complete onboarding with questionnaire answers.
   */
  async completeOnboarding(data: {
    passion_category: string;
    aipreneur_shop_name: string;
    questionnaire_answers: QuestionnaireAnswers;
  }): Promise<ProfileResponse & { business: AIpreneurBusiness }> {
    return api.post('/aipreneur/profile/onboarding', data);
  },
};

// =============================================
// PERSONA
// =============================================

export const personaApi = {
  /**
   * Submit persona quiz (child self).
   */
  async submitQuiz(answers: Array<Record<string, unknown>>): Promise<PersonaProfileResponse> {
    return api.post('/aipreneur/persona-quiz', { answers });
  },

  /**
   * Get persona profile for logged-in child.
   */
  async getProfile(): Promise<PersonaProfileResponse> {
    return api.get('/aipreneur/persona/profile');
  },

  /**
   * Get persona profile for parent view.
   */
  async getProfileForParent(profileId: string): Promise<PersonaProfileResponse> {
    return parentApi.get(`/aipreneur/profiles/${profileId}/persona`);
  },
};

// =============================================
// BUSINESS
// =============================================

export const businessApi = {
  /**
   * Get business data.
   */
  async get(): Promise<BusinessResponse> {
    return api.get<BusinessResponse>('/aipreneur/business');
  },

  /**
   * Update business data.
   */
  async update(data: {
    shop_theme?: string;
    shop_url_slug?: string;
    shop_image_url?: string;
    exterior_config?: Record<string, unknown>;
    interior_config?: Record<string, unknown>;
    charity_percentage?: number;
    selected_cause?: string;
    shop_launched?: boolean;
  }): Promise<{ success: boolean; business: AIpreneurBusiness }> {
    return api.put('/aipreneur/business', data);
  },

  /**
   * Update module progress.
   */
  async updateModuleProgress(
    module: 'product' | 'decorate' | 'operation' | 'marketing' | 'innovation' | 'csr',
    progress: number
  ): Promise<BusinessResponse> {
    return api.post('/aipreneur/business/progress', { module, progress });
  },
};

// =============================================
// PRODUCTS
// =============================================

export const productsApi = {
  /**
   * Get all products.
   */
  async getAll(): Promise<{ success: boolean; products: AIpreneurProduct[] }> {
    return api.get('/aipreneur/products');
  },

  /**
   * Create a product.
   */
  async create(data: {
    product_name: string;
    description?: string;
    price: number;
    positioning_strategy: string;
    image_url?: string;
    image_data?: string;
    image_source?: 'uploaded' | 'generated' | 'ai_generated';
    generate_image?: boolean;
  }): Promise<{ success: boolean; product: AIpreneurProduct; image_generating?: boolean }> {
    return api.post('/aipreneur/products', data);
  },

  /**
   * Update a product.
   */
  async update(
    productId: string,
    data: {
      product_name?: string;
      description?: string;
      price?: number;
      positioning_strategy?: string;
      image_url?: string;
    }
  ): Promise<{ success: boolean; product: AIpreneurProduct }> {
    return api.put(`/aipreneur/products/${productId}`, data);
  },

  /**
   * Delete a product.
   */
  async delete(productId: string): Promise<{ success: boolean }> {
    return api.delete(`/aipreneur/products/${productId}`);
  },

  /**
   * Regenerate product image with AI.
   */
  async regenerateImage(productId: string): Promise<{ success: boolean; product: AIpreneurProduct }> {
    return api.post(`/aipreneur/products/${productId}/regenerate-image`);
  },

  /**
   * Remix product image using AI (image-to-image).
   */
  async remixImage(
    productId: string,
    data: { image_data?: string; prompt_hint?: string }
  ): Promise<{ success: boolean; product?: AIpreneurProduct; image_status?: string; message?: string }> {
    return api.post(`/aipreneur/products/${productId}/remix`, data);
  },
};

// =============================================
// INTERIOR ASSETS (AI Custom Designs)
// =============================================

export const interiorAssetsApi = {
  /**
   * Generate an AI-enhanced interior asset from a drawing or upload.
   */
  async generate(data: {
    category: 'floor' | 'wall' | 'plant';
    image_data: string;
    prompt_hint?: string;
    source?: 'draw' | 'upload';
  }): Promise<{ success: boolean; image_url?: string; message?: string }> {
    return api.post('/aipreneur/interior-assets', data);
  },
};

// =============================================
// STAFF
// =============================================

export const staffApi = {
  /**
   * Get all staff.
   */
  async getAll(): Promise<{ success: boolean; staff: AIpreneurStaff[] }> {
    return api.get('/aipreneur/staff');
  },

  /**
   * Create a new staff member directly (for Operation module interview flow).
   */
  async create(data: {
    staff_role: string;
    staff_name: string;
    mood?: number;
    energy?: number;
    salary?: number;
    skills?: string[];
    hobbies?: string[];
    personality?: string;
    speed_modifier?: number;
    efficiency_modifier?: number;
  }): Promise<{ success: boolean; staff: AIpreneurStaff }> {
    return api.post('/aipreneur/staff', data);
  },

  /**
   * Initialize default staff.
   */
  async initialize(): Promise<{ success: boolean; staff: AIpreneurStaff[] }> {
    return api.post('/aipreneur/staff/initialize');
  },

  /**
   * Update a staff member.
   */
  async update(
    staffId: string,
    data: {
      staff_name?: string;
      mood?: number;
      energy?: number;
      salary?: number;
      skills?: string[];
      hobbies?: string[];
      personality?: string;
    }
  ): Promise<{ success: boolean; staff: AIpreneurStaff }> {
    return api.put(`/aipreneur/staff/${staffId}`, data);
  },

  /**
   * Hire staff from interview.
   */
  async hire(
    interviewId: string
  ): Promise<{ success: boolean; staff: AIpreneurStaff }> {
    return api.post('/aipreneur/staff/hire', { interview_id: interviewId });
  },

  /**
   * Fire (delete) a staff member.
   */
  async delete(staffId: string): Promise<{ success: boolean }> {
    return api.delete(`/aipreneur/staff/${staffId}`);
  },
};

// =============================================
// DECORATIONS
// =============================================

export const decorationsApi = {
  /**
   * Get decorations.
   */
  async get(): Promise<{
    success: boolean;
    decorations: AIpreneurDecoration[];
    decoration_items: AIpreneurDecorationItem[];
  }> {
    return api.get('/aipreneur/decorations');
  },

  /**
   * Save decoration theme.
   */
  async saveTheme(data: {
    mood_theme: string;
    decoration_focus?: string;
  }): Promise<{ success: boolean; decoration: AIpreneurDecoration }> {
    return api.post('/aipreneur/decorations', data);
  },

  /**
   * Save decoration items.
   */
  async saveItems(
    items: Array<{
      item_type: string;
      item_name: string;
      item_config?: Record<string, unknown>;
      position_x?: number;
      position_y?: number;
    }>
  ): Promise<{ success: boolean; items: AIpreneurDecorationItem[] }> {
    return api.post('/aipreneur/decorations/items', { items });
  },
};

// =============================================
// INTERVIEWS
// =============================================

export const interviewsApi = {
  /**
   * Get interview history.
   */
  async getAll(): Promise<{ success: boolean; interviews: AIpreneurInterview[] }> {
    return api.get('/aipreneur/interviews');
  },

  /**
   * Start a new interview.
   */
  async start(
    role: string
  ): Promise<{
    success: boolean;
    interview: AIpreneurInterview;
    npc: { name: string; avatar: string; personality: Record<string, unknown> };
  }> {
    return api.post('/aipreneur/interviews', { role });
  },

  /**
   * Submit interview answers.
   */
  async submit(
    interviewId: string,
    data: {
      questions_asked: Record<string, unknown>[];
      responses: Record<string, unknown>[];
      decision: 'hired' | 'passed';
    }
  ): Promise<{ success: boolean; interview: AIpreneurInterview }> {
    return api.post(`/aipreneur/interviews/${interviewId}/submit`, data);
  },
};

// =============================================
// CAMPAIGNS
// =============================================

export const campaignsApi = {
  /**
   * Get all campaigns.
   */
  async getAll(): Promise<{ success: boolean; campaigns: AIpreneurCampaign[] }> {
    return api.get('/aipreneur/campaigns');
  },

  /**
   * Create a campaign.
   */
  async create(data: {
    campaign_name: string;
    marketing_goal: string;
    color_style?: string;
    channels: string[];
    budget_coins: number;
  }): Promise<{
    success: boolean;
    campaign: AIpreneurCampaign;
    results: {
      reach: number;
      likes: number;
      new_visitors: number;
      profit: number;
      roi: number;
    };
  }> {
    return api.post('/aipreneur/campaigns', data);
  },
};

// =============================================
// MARKETING ASSETS
// =============================================

export const marketingAssetsApi = {
  /**
   * Get marketing assets.
   */
  async getAll(): Promise<{
    success: boolean;
    assets: AIpreneurMarketingAsset[];
  }> {
    return api.get('/aipreneur/marketing-assets');
  },

  /**
   * Create marketing asset.
   */
  async create(data: {
    asset_type: string;
    asset_url: string;
    asset_config?: Record<string, unknown>;
    placement?: string;
  }): Promise<{ success: boolean; asset: AIpreneurMarketingAsset }> {
    return api.post('/aipreneur/marketing-assets', data);
  },

  /**
   * Generate a marketing asset via AI (banner, billboard, social post, flyer).
   */
  async generate(data: {
    asset_type: string;
    image_data: string;
    prompt_hint?: string;
    placement?: string;
  }): Promise<{ success: boolean; asset: AIpreneurMarketingAsset }> {
    return api.post('/aipreneur/marketing-assets/generate', data);
  },
};

// =============================================
// INFLUENCER CAMPAIGNS
// =============================================

export const influencerCampaignsApi = {
  /**
   * Get influencer campaigns.
   */
  async getAll(): Promise<{
    success: boolean;
    campaigns: AIpreneurInfluencerCampaign[];
  }> {
    return api.get('/aipreneur/influencer-campaigns');
  },

  /**
   * Start influencer campaign.
   */
  async start(data: {
    influencer_name: string;
    influencer_tier: 'nano' | 'micro' | 'macro' | 'mega';
    influencer_avatar?: string;
    influencer_niche?: string;
    duration_hours?: number;
  }): Promise<{
    success: boolean;
    campaign: AIpreneurInfluencerCampaign;
    profit: number;
  }> {
    return api.post('/aipreneur/influencer-campaigns', data);
  },

  /**
   * Dismiss/cancel an influencer campaign.
   */
  async dismiss(campaignId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    return api.delete(`/aipreneur/influencer-campaigns/${campaignId}`);
  },
};

// =============================================
// INNOVATIONS
// =============================================

export const innovationsApi = {
  /**
   * Get innovations.
   */
  async getAll(): Promise<{
    success: boolean;
    innovations: AIpreneurInnovation[];
    available_projects: string[];
    projects_catalog?: AIpreneurInnovationProject[];
    rewards_level?: number;
    active_count?: number;
    max_active_tech?: number;
    upgrade_step_cost?: number;
  }> {
    return api.get('/aipreneur/innovations');
  },

  /**
   * Unlock innovation.
   */
  async unlock(data: {
    tech_project: string;
    quiz_answers: Array<{ question: string; answer: string; correct: boolean }>;
    design_image_data?: string | null;
    cost?: number;
  }): Promise<{
    success: boolean;
    innovation: AIpreneurInnovation;
    score: number;
    auto_activated?: boolean;
    rewards?: AIpreneurReward;
  }> {
    return api.post('/aipreneur/innovations', data);
  },

  /**
   * Activate/deactivate innovation for simulator (max 5 active).
   */
  async setActive(innovationId: string, active: boolean): Promise<{
    success: boolean;
    innovation: AIpreneurInnovation;
    active_count: number;
    max_active_tech: number;
    message?: string;
  }> {
    const endpoint = active ? 'activate' : 'deactivate';
    return api.post(`/aipreneur/innovations/${innovationId}/${endpoint}`);
  },

  /**
   * Upgrade innovation to next level (max 6).
   */
  async upgrade(innovationId: string): Promise<{
    success: boolean;
    innovation: AIpreneurInnovation;
    upgrade_cost: number;
    rewards?: AIpreneurReward;
    message?: string;
  }> {
    return api.post(`/aipreneur/innovations/${innovationId}/upgrade`);
  },
};

// =============================================
// TOKENS
// =============================================

export type TokenOperationType =
  | 'product_image'
  | 'product_regenerate'
  | 'interior_item'
  | 'marketing_asset'
  | 'marketing_content'
  | 'shop_exterior'
  | 'ai_chat';

export const tokensApi = {
  /**
   * Check if user has enough tokens for an operation.
   */
  async check(operation: TokenOperationType, quantity?: number): Promise<{
    success: boolean;
    has_enough: boolean;
    current_balance: number;
    required: number;
    deficit: number;
  }> {
    return api.post('/aipreneur/tokens/check', { operation, quantity: quantity || 1 });
  },

  /**
   * Consume tokens for an operation.
   * Returns error if insufficient balance.
   */
  async consume(data: {
    operation: TokenOperationType;
    quantity?: number;
    reason?: string;
  }): Promise<{
    success: boolean;
    new_balance: number;
    tokens_used: number;
    message?: string;
  }> {
    return api.post('/aipreneur/tokens/consume', data);
  },

  /**
   * Add tokens to user's balance (after purchase verification).
   */
  async addTokens(amount: number, reason?: string): Promise<{
    success: boolean;
    new_balance: number;
    tokens_added: number;
  }> {
    return api.post('/aipreneur/tokens/add', { amount, reason });
  },

  /**
   * Get token usage history.
   */
  async getHistory(limit?: number): Promise<{
    success: boolean;
    history: Array<{
      id: string;
      operation: string;
      tokens_used: number;
      reason: string;
      created_at: string;
    }>;
  }> {
    return api.get(`/aipreneur/tokens/history${limit ? `?limit=${limit}` : ''}`);
  },
};

// =============================================
// OFFLINE EARNINGS (IDLE GAME)
// =============================================

export interface OfflineEarningsResponse {
  success: boolean;
  has_earnings: boolean;
  earnings: {
    offline_duration_hours: number;
    offline_duration_days: number;
    visitors: number;
    sales: number;
    revenue: number;
    profit: number;
    coins_earned: number;
    last_active_at: string;
    is_inactive: boolean;  // True if > 3 days
    inactivity_penalty: boolean;
  };
  notifications: Array<{
    type: 'earnings' | 'warning' | 'milestone';
    title: string;
    message: string;
  }>;
}

export const offlineApi = {
  /**
   * Get offline earnings since last login.
   * Called on app startup/login.
   * NOTE: Backend routes not yet implemented - returns default response
   */
  async getOfflineEarnings(): Promise<OfflineEarningsResponse> {
    // Backend route not yet implemented, return default response directly to avoid 404
    return {
      success: false,
      has_earnings: false,
      earnings: {
        offline_duration_hours: 0,
        offline_duration_days: 0,
        visitors: 0,
        sales: 0,
        revenue: 0,
        profit: 0,
        coins_earned: 0,
        last_active_at: new Date().toISOString(),
        is_inactive: false,
        inactivity_penalty: false
      },
      notifications: []
    };
  },

  /**
   * Claim offline earnings and update last_active timestamp.
   * NOTE: Backend routes not yet implemented - returns default response
   */
  async claimOfflineEarnings(): Promise<{
    success: boolean;
    claimed: {
      profit: number;
      coins: number;
      visitors: number;
    };
    new_balance: {
      total_profit: number;
      coins: number;
      store_visitors: number;
    };
  }> {
    try {
      return await api.post('/aipreneur/offline/claim');
    } catch {
      // Backend route not yet implemented
      return {
        success: false,
        claimed: { profit: 0, coins: 0, visitors: 0 },
        new_balance: { total_profit: 0, coins: 0, store_visitors: 0 },
      };
    }
  },

  /**
   * Update last active timestamp (heartbeat).
   * Call periodically while user is active.
   * NOTE: Backend route not yet implemented - returns default response without API call
   */
  async heartbeat(): Promise<{
    success: boolean;
    last_active_at: string;
  }> {
    // Backend route not yet implemented - return default without making API call
    return { success: false, last_active_at: new Date().toISOString() };
  },

  /**
   * Get earnings projection for when user is away.
   * NOTE: Backend route not yet implemented - returns default response without API call
   */
  async getProjection(_hours: number): Promise<{
    success: boolean;
    projection: {
      estimated_visitors: number;
      estimated_sales: number;
      estimated_profit: number;
      estimated_coins: number;
    };
  }> {
    // Backend route not yet implemented - return default without making API call
    return {
      success: false,
      projection: {
        estimated_visitors: 0,
        estimated_sales: 0,
        estimated_profit: 0,
        estimated_coins: 0,
      },
    };
  },
};

// ============================================================================
// NOTIFICATIONS API
// ============================================================================
export const notificationsApi = {
  /**
   * Register FCM device token for push notifications.
   */
  async registerToken(token: string, platform: 'web' | 'android' | 'ios' = 'web'): Promise<{ success: boolean }> {
    try {
      return await api.post('/aipreneur/notifications/register-token', { fcm_token: token, platform });
    } catch {
      // Backend not yet implemented — silently fail
      return { success: false };
    }
  },

  /**
   * Unregister FCM device token.
   */
  async unregisterToken(token: string): Promise<{ success: boolean }> {
    try {
      return await api.post('/aipreneur/notifications/unregister-token', { fcm_token: token });
    } catch {
      return { success: false };
    }
  },
};

// =============================================
// PROFIT TO COINS CONVERSION
// =============================================

export const conversionApi = {
  /**
   * Get conversion rate (profit coins to AI tokens).
   */
  async getRate(): Promise<{
    success: boolean;
    rate: number;  // e.g., 25 = 25 profit coins = 1 AI token
    min_conversion: number;  // Minimum profit required
    available_profit: number;  // User's convertible profit
    potential_ai_tokens?: number;
    potential_coins: number;  // Backward-compatible alias
  }> {
    return api.get('/aipreneur/conversion/rate');
  },

  /**
   * Convert profit to AI tokens.
   */
  async convertProfitToCoins(profitAmount: number): Promise<{
    success: boolean;
    converted: {
      profit_used: number;
      ai_tokens_received?: number;
      coins_received: number; // Backward-compatible alias
    };
    new_balance: {
      total_profit: number;
      available_profit: number;
      coins: number;
      ai_tokens?: number;
    };
  }> {
    return api.post('/aipreneur/conversion/profit-to-coins', { profit_amount: profitAmount });
  },
};

// =============================================
// FINANCE MINI-GAME
// =============================================

export const financeGameApi = {
  /**
   * Get daily play status for finance mini-game.
   */
  async getStatus(): Promise<{
    success: boolean;
    can_play_today: boolean;
    last_played_date?: string | null;
    daily_limit: number;
  }> {
    return api.get('/aipreneur/finance/game-status');
  },

  /**
   * Claim finance mini-game result (once per day).
   */
  async claim(data: {
    completed: boolean;
    score?: number;
  }): Promise<{
    success: boolean;
    completed: boolean;
    xp_earned: number;
    ai_tokens_earned: number;
    rewards?: AIpreneurReward;
    business?: AIpreneurBusiness;
    daily_limit: number;
    message?: string;
  }> {
    return api.post('/aipreneur/finance/claim-game', data);
  },
};

// =============================================
// REWARDS
// =============================================

export const rewardsApi = {
  /**
   * Get rewards.
   */
  async get(): Promise<{ success: boolean; rewards: AIpreneurReward }> {
    return api.get('/aipreneur/rewards');
  },

  /**
   * Get redeemable reward-store items.
   */
  async getStoreItems(): Promise<{
    success: boolean;
    items: AIpreneurRewardStoreItem[];
  }> {
    return api.get('/aipreneur/rewards/store-items');
  },

  /**
   * Claim daily reward.
   */
  async claimDaily(): Promise<{
    success: boolean;
    already_claimed?: boolean;
    message?: string;
    rewards: AIpreneurReward;
    daily_ai_tokens?: number;
    daily_coins: number;
    streak_bonus: number;
  }> {
    return api.post('/aipreneur/rewards/daily');
  },

  /**
   * Add coins (for starting money, bonuses, etc.).
   */
  async addCoins(amount: number, reason?: string): Promise<{
    success: boolean;
    rewards: AIpreneurReward;
    coins_added: number;
  }> {
    return api.post('/aipreneur/rewards/add-coins', { amount, reason });
  },

  /**
   * Add XP points.
   */
  async addXp(amount: number, reason?: string): Promise<{
    success: boolean;
    rewards: AIpreneurReward;
    xp_added: number;
    leveled_up?: boolean;
  }> {
    return api.post('/aipreneur/rewards/add-xp', { amount, reason });
  },

  /**
   * Spend coins (for AI actions, customizations, etc.).
   */
  async spendCoins(amount: number, reason?: string): Promise<{
    success: boolean;
    rewards: AIpreneurReward;
    coins_spent: number;
    message?: string;
  }> {
    return api.post('/aipreneur/rewards/spend-coins', { amount, reason });
  },

  /**
   * Spend AI tokens (used for image generation/customizations).
   */
  async spendAiTokens(amount: number, reason?: string): Promise<{
    success: boolean;
    rewards: AIpreneurReward;
    ai_tokens_spent: number;
    message?: string;
  }> {
    return api.post('/aipreneur/rewards/spend-ai-tokens', { amount, reason });
  },

  /**
   * Redeem a reward-store item (deducts AI tokens + stock atomically).
   */
  async redeemStoreItem(itemId: string): Promise<{
    success: boolean;
    message?: string;
    rewards: AIpreneurReward;
    item?: {
      id: string;
      name: string;
      stock: number;
    };
    redemption?: {
      id: string;
      code: string;
      status: string;
    };
    ai_tokens_spent?: number;
  }> {
    return api.post('/aipreneur/rewards/store-items/redeem', { item_id: itemId });
  },

  /**
   * Claim an achievement reward.
   */
  async claimAchievement(achievementId: string, xpReward: number, coinsReward: number): Promise<{
    success: boolean;
    rewards: AIpreneurReward;
    xp_added: number;
    coins_added: number;
    badge_earned?: string;
  }> {
    return api.post('/aipreneur/rewards/claim-achievement', {
      achievement_id: achievementId,
      xp_reward: xpReward,
      coins_reward: coinsReward,
    });
  },

  /**
   * Get claimed achievements.
   */
  async getClaimedAchievements(): Promise<{
    success: boolean;
    claimed_achievements: string[];
  }> {
    return api.get('/aipreneur/rewards/achievements');
  },
};

// =============================================
// CSR
// =============================================

export const csrApi = {
  /**
   * Get CSR status (total donated, selected cause).
   */
  async getStatus(): Promise<{
    success: boolean;
    business: AIpreneurBusiness;
    can_donate_today?: boolean;
    last_csr_action_date?: string | null;
    daily_limit?: number;
    message?: string;
  }> {
    return api.get('/aipreneur/csr/status');
  },

  /**
   * Record a CSR donation.
   */
  async donate(data: {
    cause: string;
    action_type: string;
    donation_amount: number;
  }): Promise<{
    success: boolean;
    business: AIpreneurBusiness;
    rewards?: AIpreneurReward;
    daily_limit?: number;
    message?: string;
  }> {
    return api.post('/aipreneur/csr/donate', data);
  },
};

// =============================================
// SHOP OPENING QUEST & SIMULATOR
// =============================================

export interface ShopOpeningStatus {
  checklist: { products_created: boolean; staff_hired: boolean };
  can_open: boolean;
  shop_launched: boolean;
  ribbon_cutting_completed: boolean;
  products_count: number;
  staff_count: number;
  required_products: number;
  required_staff: number;
}

export interface TrafficMultiplierResponse {
  traffic_multiplier: number;
  popularity_level?: number;
  staff_overall_mood?: number;
  breakdown: {
    base_traffic: number;
    marketing_boost: string;
    innovation_boost: string;
    decoration_boost: string;
    staffing_factor?: number;
    mood_factor?: number;
    overload_penalty?: number;
  };
  active_campaigns: number;
  active_influencers: number;
  billboard_assets: number;
  innovations_count: number;
  overall_progress: number;
  boost_active: boolean;
  boost_expires_at: string | null;
}

export interface DailyStatsResponse {
  today: {
    date: string;
    visitors: number;
    customers: number;
    sales_count: number;
    units_sold: number;
    revenue: number;
    profit: number;
    coins_earned: number;
    traffic_multiplier: number;
    popularity_level?: number;
    staff_overall_mood?: number;
    daily_visitor_budget?: number;
  };
  week: {
    visitors: number;
    customers: number;
    revenue: number;
    profit: number;
  };
  history: Array<{
    date: string;
    visitors: number;
    customers: number;
    revenue: number;
    profit: number;
  }>;
  all_time: {
    total_sales: number;
    total_profit: number;
    store_visitors: number;
    popularity_level?: number;
    staff_overall_mood?: number;
  };
  economy?: {
    daily_visitor_budget?: number;
    visitor_purchase_chance_percent?: number;
    passive_visitor_interval_seconds?: number;
    profit_per_visitor?: {
      min: number;
      max: number;
    };
  };
}

export interface SimulatorSaleResponse {
  sale: {
    product_name: string;
    quantity: number;
    amount: number;
    profit: number;
    profit_margin?: string;
    coins_earned: number;
  };
  product: AIpreneurProduct;
  business: {
    total_sales: number;
    total_profit: number;
    store_visitors: number;
    staff_overall_mood?: number;
    popularity_level?: number;
  };
  daily_stats: {
    visitors: number;
    customers: number;
    total_revenue: number;
    total_profit: number;
  };
}

export const simulatorApi = {
  /**
   * Get shop opening status for quest system.
   */
  async getShopOpeningStatus(): Promise<{ success: boolean } & ShopOpeningStatus> {
    return api.get('/aipreneur/shop-opening-status');
  },

  /**
   * Complete ribbon cutting ceremony and launch shop.
   */
  async completeRibbonCutting(): Promise<{
    success: boolean;
    message: string;
    business: AIpreneurBusiness;
    rewards?: { ai_tokens?: number; coins?: number; xp: number };
  }> {
    return api.post('/aipreneur/ribbon-cutting');
  },

  /**
   * Record a sale from the simulator.
   */
  async recordSale(data: {
    product_id: string;
    quantity: number;
  }): Promise<{ success: boolean } & SimulatorSaleResponse> {
    return api.post('/aipreneur/simulator/sale', data);
  },

  /**
   * Record a visitor (someone who enters the shop).
   */
  async recordVisitor(count?: number): Promise<{
    success: boolean;
    recorded_count?: number;
    daily_visitors: number;
    daily_visitor_budget?: number;
    remaining_daily_visitors?: number;
    total_visitors: number;
    traffic_multiplier?: number;
    popularity_level?: number;
  }> {
    return api.post('/aipreneur/simulator/visitor', count && count > 1 ? { count } : undefined);
  },

  /**
   * Get daily stats (today's visitors, sales, profits, etc.).
   */
  async getDailyStats(): Promise<{ success: boolean } & DailyStatsResponse> {
    return api.get('/aipreneur/simulator/daily-stats');
  },

  /**
   * Get traffic multiplier based on shop progress and active marketing.
   */
  async getTrafficMultiplier(): Promise<{ success: boolean } & TrafficMultiplierResponse> {
    return api.get('/aipreneur/traffic-multiplier');
  },
};

// =============================================
// PUBLIC SHOP (NO AUTH REQUIRED)
// =============================================

export interface PublicShopData {
  student_id: string;
  shop_name: string;
  shop_theme: string | null;
  shop_tagline: string | null;
  shop_image_url: string | null;
  passion_category: string | null;
  total_profit: number;
  store_visitors: number;
  store_likes: number;
  store_rating: number;
  store_reviews_count: number;
  selected_cause: string | null;
  charity_percentage: number;
}

export interface PublicShopSearchResult {
  shop_name: string;
  shop_url_slug: string;
  shop_theme: string | null;
  shop_image_url?: string | null;
  passion_category?: string | null;
  owner_name?: string | null;
  store_likes?: number;
  store_visitors?: number;
}

export interface PublicProduct {
  id: string;
  product_name: string;
  description: string | null;
  price: number;
  positioning_strategy: string;
  units_sold: number;
  revenue_generated: number;
  image_url: string | null;
}

export const publicShopApi = {
  /**
   * Get public shop data by slug.
   * No authentication required.
   */
  async getShop(slug: string): Promise<{
    success: boolean;
    shop: PublicShopData;
    products: PublicProduct[];
  }> {
    return publicApi.get(`/aipreneur/public-shop/${slug}`);
  },

  /**
   * Like a public shop.
   * No authentication required.
   */
  async likeShop(slug: string): Promise<{
    success: boolean;
    store_likes: number;
  }> {
    return publicApi.post(`/aipreneur/public-shop/${slug}/like`);
  },

  /**
   * Search public shops by name or slug.
   */
  async searchShops(query?: string): Promise<{ success: boolean; shops: PublicShopSearchResult[] }> {
    return publicApi.get('/aipreneur/public-shops', query ? { q: query } : undefined);
  },
};

// =============================================
// CLASSES & WORKSHOPS
// =============================================

export const classesApi = {
  /**
   * Get class catalog + my bookings.
   */
  async getAll(): Promise<{
    success: boolean;
    classes: AIpreneurClass[];
    bookings: AIpreneurClassBooking[];
  }> {
    return api.get('/aipreneur/classes');
  },

  /**
   * Book a class slot (returns payment data).
   */
  async book(data: {
    slot_id: string;
    payment_method: string;
    customer_name: string;
    customer_email: string;
    frontend_url: string;
    customer_phone?: string;
  }): Promise<{
    success: boolean;
    booking: AIpreneurClassBooking;
    payment_url?: string;
    payment_data?: Record<string, string>;
    order_id?: string;
    message?: string;
  }> {
    return api.post('/aipreneur/classes/book', data);
  },
};

// Parent bookings & class catalog
export const parentClassesApi = {
  async getBookings(): Promise<{
    success: boolean;
    bookings: AIpreneurClassBooking[];
  }> {
    return parentApi.get('/aipreneur/classes/parent');
  },

  async getCatalog(): Promise<{
    success: boolean;
    classes: AIpreneurClass[];
    children: Array<{
      id: string;
      first_name: string;
      last_name: string | null;
      age: number | null;
      avatar_url: string | null;
      genius_id: string;
    }>;
    bookings: AIpreneurClassBooking[];
  }> {
    return parentApi.get('/aipreneur/classes/catalog');
  },

  async bookForChild(data: {
    slot_id: string;
    student_id: string;
    payment_method: string;
    customer_name: string;
    customer_email: string;
    frontend_url: string;
    customer_phone?: string;
  }): Promise<{
    success: boolean;
    booking: AIpreneurClassBooking;
    payment_url?: string;
    payment_data?: Record<string, string>;
    order_id?: string;
    message?: string;
  }> {
    return parentApi.post('/aipreneur/classes/book-for-child', data);
  },
};

export const adminPortalApi = {
  async getDashboardOverview(): Promise<AdminDashboardOverviewResponse> {
    return parentApi.get('/aipreneur/admin/dashboard');
  },

  async getMembers(): Promise<AdminMembersResponse> {
    return parentApi.get('/aipreneur/admin/members');
  },
};

// =============================================
// ADMIN ACADEMY OVERVIEW (MASTER)
// =============================================

export const adminAcademyApi = {
  async getOverview(): Promise<{
    success: boolean;
    stats: {
      total_classes: number;
      total_slots: number;
      total_bookings: number;
      total_students: number;
      total_parents: number;
      total_coins: number;
      avg_xp: number;
    };
    classes: AIpreneurClass[];
    bookings: AIpreneurClassBooking[];
    students: GeniusProfile[];
    parents: Array<{
      id: string;
      name: string;
      email: string;
      genius_profiles_count: number;
      created_at: string;
    }>;
  }> {
    return parentApi.get('/aipreneur/admin/academy');
  },

  async createClass(data: {
    title: string;
    category: string;
    description?: string;
    level: string;
    price: number;
    duration_minutes: number;
  }): Promise<{ success: boolean; class: AIpreneurClass }> {
    return parentApi.post('/aipreneur/admin/classes', data);
  },

  async updateClass(classId: string, data: Partial<AIpreneurClass>): Promise<{ success: boolean; class: AIpreneurClass }> {
    return parentApi.put(`/aipreneur/admin/classes/${classId}`, data);
  },

  async createSlot(classId: string, data: {
    start_time: string;
    end_time: string;
    capacity: number;
    location?: string;
  }): Promise<{ success: boolean; slot: AIpreneurClassSlot }> {
    return parentApi.post(`/aipreneur/admin/classes/${classId}/slots`, data);
  },

  async updateSlot(slotId: string, data: Partial<AIpreneurClassSlot>): Promise<{ success: boolean; slot: AIpreneurClassSlot }> {
    return parentApi.put(`/aipreneur/admin/slots/${slotId}`, data);
  },

  async deleteClass(classId: string): Promise<{ success: boolean; message?: string }> {
    return parentApi.delete(`/aipreneur/admin/classes/${classId}`);
  },

  async deleteSlot(slotId: string): Promise<{ success: boolean; message?: string }> {
    return parentApi.delete(`/aipreneur/admin/slots/${slotId}`);
  },

  async lookupBooking(orderId: string): Promise<{
    success: boolean;
    message?: string;
    booking?: AIpreneurClassBooking;
  }> {
    return parentApi.post('/aipreneur/admin/bookings/lookup', { order_id: orderId });
  },

  async checkInBooking(orderId: string): Promise<{
    success: boolean;
    message?: string;
    booking?: AIpreneurClassBooking;
  }> {
    return parentApi.post('/aipreneur/admin/bookings/check-in', { order_id: orderId });
  },
};

// =============================================
// LEADERBOARD
// =============================================

export interface LeaderboardEntry {
  id: string;
  genius_name: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  coins: number;
  total_sales: number;
  total_profit: number;
  badges_count: number;
  shop_name: string | null;
  passion_category: string | null;
}

export const leaderboardApi = {
  /**
   * Get leaderboard data (all geniuses ranked).
   * Sort by 'xp' (level+xp) or 'profit' (coins/profit).
   */
  async getLeaderboard(sortBy: 'xp' | 'profit' = 'xp'): Promise<{
    success: boolean;
    leaderboard: LeaderboardEntry[];
    current_user_rank: number;
  }> {
    try {
      return await api.get(`/aipreneur/leaderboard?sort=${sortBy}`);
    } catch {
      // Backend route not yet implemented - return empty
      return {
        success: false,
        leaderboard: [],
        current_user_rank: 0,
      };
    }
  },
};

// =============================================
// COMBINED EXPORT
// =============================================

export const aipreneurApi = {
  auth: authApi,
  profile: profileApi,
  persona: personaApi,
  business: businessApi,
  products: productsApi,
  interiorAssets: interiorAssetsApi,
  staff: staffApi,
  decorations: decorationsApi,
  interviews: interviewsApi,
  campaigns: campaignsApi,
  marketingAssets: marketingAssetsApi,
  influencerCampaigns: influencerCampaignsApi,
  innovations: innovationsApi,
  rewards: rewardsApi,
  csr: csrApi,
  simulator: simulatorApi,
  publicShop: publicShopApi,
  classes: classesApi,
  adminAcademy: adminAcademyApi,
  adminPortal: adminPortalApi,
  parentClasses: parentClassesApi,
  tokens: tokensApi,
  offline: offlineApi,
  conversion: conversionApi,
  financeGame: financeGameApi,
  leaderboard: leaderboardApi,
};

export default aipreneurApi;
