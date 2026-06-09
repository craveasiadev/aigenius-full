/**
 * Onboarding API Service
 *
 * Handles all API calls for the new onboarding flow:
 * Boss intro -> Shop image -> Questionnaire -> Boss selfie -> Shop generation
 */

import { geniusApi } from '../lib/api';

// =============================================
// TYPES
// =============================================

export type OnboardingStage =
  | 'not_started'
  | 'boss_intro_completed'
  | 'selfie_completed'
  | 'signboard_completed'
  | 'questionnaire_completed'
  | 'shop_generating'
  | 'completed';

export type ShopImageStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface OnboardingStatus {
  stage: OnboardingStage;
  selfie_url: string | null;
  signboard_url: string | null;
  shop_image_status: ShopImageStatus;
  shop_image_url: string | null;
}

export interface QuestionnaireAnswers {
  passion_category: string;
  shop_theme: string;
  color_palette: string[];
  unique_selling_point: string;
  shop_name: string;
}

export interface FinanceData {
  balances: {
    coins: number;
    tokens: number;
    tokens_used: number;
  };
  summary: {
    total_income: number;
    total_expenses: number;
    net_profit: number;
  };
  breakdown: {
    income: Record<string, number>;
    expenses: Record<string, number>;
  };
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  student_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  tokens: number | null;
  coin_balance_after: number;
  token_balance_after: number | null;
  created_at: string;
}

// =============================================
// API CALLS
// =============================================

export const onboardingApi = {
  /**
   * Get current onboarding status.
   */
  async getStatus(): Promise<{ success: boolean; } & OnboardingStatus> {
    return geniusApi.get('/aipreneur/onboarding/status');
  },

  /**
   * Complete boss intro stage.
   */
  async completeBossIntro(): Promise<{ success: boolean; stage: OnboardingStage }> {
    return geniusApi.post('/aipreneur/onboarding/boss-intro');
  },

  /**
   * Upload selfie image (base64 encoded).
   */
  async uploadSelfie(base64Image: string): Promise<{
    success: boolean;
    selfie_url: string;
    stage: OnboardingStage;
  }> {
    return geniusApi.post('/aipreneur/onboarding/selfie', {
      selfie: base64Image,
    });
  },

  /**
   * Upload shop image reference (stored in backend signboard field).
   */
  async uploadSignboard(base64Image: string): Promise<{
    success: boolean;
    signboard_url: string;
    stage: OnboardingStage;
  }> {
    return geniusApi.post('/aipreneur/onboarding/signboard', {
      signboard: base64Image,
    });
  },

  /**
   * Save questionnaire answers.
   */
  async saveQuestionnaire(answers: QuestionnaireAnswers): Promise<{
    success: boolean;
    stage: OnboardingStage;
    business: unknown;
  }> {
    return geniusApi.post('/aipreneur/onboarding/questionnaire', answers);
  },

  /**
   * Trigger shop image generation.
   */
  async generateShop(): Promise<{
    success: boolean;
    message: string;
    status: ShopImageStatus;
  }> {
    return geniusApi.post('/aipreneur/onboarding/generate-shop');
  },

  /**
   * Check shop image generation status.
   */
  async getShopStatus(): Promise<{
    success: boolean;
    status: ShopImageStatus;
    shop_image_url: string | null;
    shop_scene_image_url: string | null;
    error: string | null;
  }> {
    return geniusApi.get('/aipreneur/onboarding/shop-status');
  },

  /**
   * Regenerate shop images (retry failed generation).
   */
  async regenerateShop(): Promise<{
    success: boolean;
    message: string;
    status: ShopImageStatus;
  }> {
    return geniusApi.post('/aipreneur/onboarding/regenerate-shop');
  },

  /**
   * Complete onboarding and receive starting bonus.
   */
  async complete(): Promise<{
    success: boolean;
    message: string;
    profile: unknown;
    starting_bonus: {
      coins: number;
      tokens: number;
    };
  }> {
    return geniusApi.post('/aipreneur/onboarding/complete');
  },
};

// =============================================
// FINANCE API
// =============================================

export const financeApi = {
  /**
   * Get full finance data.
   */
  async getFinance(): Promise<{ success: boolean; } & FinanceData> {
    return geniusApi.get('/aipreneur/finance');
  },

  /**
   * Get transaction history with optional filters.
   */
  async getTransactions(params?: {
    type?: 'income' | 'expense';
    category?: string;
    per_page?: number;
    page?: number;
  }): Promise<{
    success: boolean;
    transactions: {
      data: Transaction[];
      current_page: number;
      last_page: number;
      total: number;
    };
  }> {
    const queryParams: Record<string, string | number> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.category) queryParams.category = params.category;
    if (params?.per_page) queryParams.per_page = params.per_page;
    if (params?.page) queryParams.page = params.page;

    return geniusApi.get('/aipreneur/finance/transactions', queryParams);
  },
};

export default onboardingApi;
