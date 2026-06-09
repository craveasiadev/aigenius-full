/**
 * useAIpreneur Hook
 *
 * Custom hook for accessing and managing AIpreneur business data.
 * Provides easy access to all AIpreneur API endpoints.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  businessApi,
  productsApi,
  staffApi,
  decorationsApi,
  interviewsApi,
  campaignsApi,
  marketingAssetsApi,
  influencerCampaignsApi,
  innovationsApi,
  rewardsApi,
  AIpreneurBusiness,
  AIpreneurProduct,
  AIpreneurStaff,
  AIpreneurDecoration,
  AIpreneurDecorationItem,
  AIpreneurInterview,
  AIpreneurCampaign,
  AIpreneurMarketingAsset,
  AIpreneurInfluencerCampaign,
  AIpreneurInnovation,
  AIpreneurInnovationProject,
  AIpreneurReward,
} from '../services/aipreneurApi';
import { useGeniusAuth } from '../contexts/GeniusAuthContext';

interface UseAIpreneurReturn {
  // Data
  business: AIpreneurBusiness | null;
  products: AIpreneurProduct[];
  staff: AIpreneurStaff[];
  decorations: AIpreneurDecoration[];
  decorationItems: AIpreneurDecorationItem[];
  interviews: AIpreneurInterview[];
  campaigns: AIpreneurCampaign[];
  marketingAssets: AIpreneurMarketingAsset[];
  influencerCampaigns: AIpreneurInfluencerCampaign[];
  innovations: AIpreneurInnovation[];
  availableInnovationProjects: string[];
  innovationCatalog: AIpreneurInnovationProject[];
  innovationRewardsLevel: number;
  activeInnovationCount: number;
  maxActiveTech: number;
  innovationUpgradeStepCost: number;
  rewards: AIpreneurReward | null;
  overallProgress: number;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Business actions
  loadBusiness: () => Promise<void>;
  updateBusiness: (data: Parameters<typeof businessApi.update>[0]) => Promise<boolean>;
  updateModuleProgress: (
    module: 'product' | 'decorate' | 'operation' | 'marketing' | 'innovation' | 'csr',
    progress: number
  ) => Promise<boolean>;

  // Product actions
  loadProducts: () => Promise<void>;
  createProduct: (data: {
    product_name: string;
    description?: string;
    price: number;
    positioning_strategy: string;
    image_url?: string;
    image_source?: 'uploaded' | 'generated';
  }) => Promise<AIpreneurProduct | null>;
  updateProduct: (productId: string, data: Parameters<typeof productsApi.update>[1]) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;

  // Staff actions
  loadStaff: () => Promise<void>;
  initializeStaff: () => Promise<void>;
  updateStaffMember: (staffId: string, data: Parameters<typeof staffApi.update>[1]) => Promise<boolean>;
  hireFromInterview: (interviewId: string) => Promise<AIpreneurStaff | null>;

  // Decoration actions
  loadDecorations: () => Promise<void>;
  saveDecorationTheme: (data: { mood_theme: string; decoration_focus?: string }) => Promise<boolean>;
  saveDecorationItems: (items: Partial<AIpreneurDecorationItem>[]) => Promise<boolean>;

  // Interview actions
  loadInterviews: () => Promise<void>;
  startInterview: (role: string) => Promise<AIpreneurInterview | null>;
  submitInterview: (
    interviewId: string,
    data: {
      questions_asked: Record<string, unknown>[];
      responses: Record<string, unknown>[];
      decision: 'hired' | 'passed';
    }
  ) => Promise<boolean>;

  // Campaign actions
  loadCampaigns: () => Promise<void>;
  createCampaign: (data: {
    campaign_name: string;
    marketing_goal: string;
    color_style?: string;
    channels: string[];
    budget_coins: number;
  }) => Promise<{ campaign: AIpreneurCampaign; results: Record<string, number> } | null>;

  // Marketing asset actions
  loadMarketingAssets: () => Promise<void>;
  createMarketingAsset: (data: {
    asset_type: string;
    asset_url: string;
    asset_config?: Record<string, unknown>;
    placement?: string;
  }) => Promise<AIpreneurMarketingAsset | null>;

  // Influencer campaign actions
  loadInfluencerCampaigns: () => Promise<void>;
  startInfluencerCampaign: (data: {
    influencer_name: string;
    influencer_tier: 'nano' | 'micro' | 'macro' | 'mega';
    influencer_avatar?: string;
    influencer_niche?: string;
    duration_hours?: number;
  }) => Promise<{ campaign: AIpreneurInfluencerCampaign; profit: number } | null>;
  dismissInfluencerCampaign: (campaignId: string) => Promise<boolean>;

  // Innovation actions
  loadInnovations: () => Promise<void>;
  unlockInnovation: (data: {
    tech_project: string;
    quiz_answers: Array<{ question: string; answer: string; correct: boolean }>;
    design_image_data?: string | null;
    cost?: number;
  }) => Promise<{ innovation: AIpreneurInnovation; score: number } | null>;
  setInnovationActive: (innovationId: string, active: boolean) => Promise<boolean>;
  upgradeInnovation: (innovationId: string) => Promise<AIpreneurInnovation | null>;

  // Reward actions
  loadRewards: () => Promise<void>;
  claimDailyReward: () => Promise<{ daily_ai_tokens: number; daily_coins: number; streak_bonus: number } | null>;

  // Utility
  refreshAll: () => Promise<void>;
}

export const useAIpreneur = (): UseAIpreneurReturn => {
  const { isAuthenticated, geniusProfile } = useGeniusAuth();
  const MIN_REFRESH_INTERVAL_MS = 5_000;

  // State
  const [business, setBusiness] = useState<AIpreneurBusiness | null>(null);
  const [products, setProducts] = useState<AIpreneurProduct[]>([]);
  const [staff, setStaff] = useState<AIpreneurStaff[]>([]);
  const [decorations, setDecorations] = useState<AIpreneurDecoration[]>([]);
  const [decorationItems, setDecorationItems] = useState<AIpreneurDecorationItem[]>([]);
  const [interviews, setInterviews] = useState<AIpreneurInterview[]>([]);
  const [campaigns, setCampaigns] = useState<AIpreneurCampaign[]>([]);
  const [marketingAssets, setMarketingAssets] = useState<AIpreneurMarketingAsset[]>([]);
  const [influencerCampaigns, setInfluencerCampaigns] = useState<AIpreneurInfluencerCampaign[]>([]);
  const [innovations, setInnovations] = useState<AIpreneurInnovation[]>([]);
  const [availableInnovationProjects, setAvailableInnovationProjects] = useState<string[]>([]);
  const [innovationCatalog, setInnovationCatalog] = useState<AIpreneurInnovationProject[]>([]);
  const [innovationRewardsLevel, setInnovationRewardsLevel] = useState(1);
  const [activeInnovationCount, setActiveInnovationCount] = useState(0);
  const [maxActiveTech, setMaxActiveTech] = useState(5);
  const [innovationUpgradeStepCost, setInnovationUpgradeStepCost] = useState(80);
  const [rewards, setRewards] = useState<AIpreneurReward | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadBusinessInFlightRef = useRef<Promise<void> | null>(null);
  const refreshAllInFlightRef = useRef<Promise<void> | null>(null);
  const lastRefreshAtRef = useRef(0);

  // Business
  const loadBusiness = useCallback(async () => {
    if (!isAuthenticated) return;
    if (loadBusinessInFlightRef.current) {
      return loadBusinessInFlightRef.current;
    }

    loadBusinessInFlightRef.current = (async () => {
      try {
        const response = await businessApi.get();
        if (response.success) {
          setBusiness(response.business);
          setOverallProgress(response.overall_progress);
        }
      } catch (err) {
        console.error('Failed to load business:', err);
      } finally {
        loadBusinessInFlightRef.current = null;
      }
    })();

    return loadBusinessInFlightRef.current;
  }, [isAuthenticated]);

  const updateBusiness = useCallback(async (data: Parameters<typeof businessApi.update>[0]): Promise<boolean> => {
    try {
      const response = await businessApi.update(data as Parameters<typeof businessApi.update>[0]);
      if (response.success) {
        setBusiness(response.business);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update business');
      return false;
    }
  }, []);

  const updateModuleProgress = useCallback(async (
    module: 'product' | 'decorate' | 'operation' | 'marketing' | 'innovation' | 'csr',
    progress: number
  ): Promise<boolean> => {
    try {
      const response = await businessApi.updateModuleProgress(module, progress);
      if (response.success) {
        setBusiness(response.business);
        setOverallProgress(response.overall_progress);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update progress');
      return false;
    }
  }, []);

  // Products
  const loadProducts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await productsApi.getAll();
      if (response.success) {
        setProducts(response.products);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [isAuthenticated]);

  const createProduct = useCallback(async (data: {
    product_name: string;
    description?: string;
    price: number;
    positioning_strategy: string;
    image_url?: string;
    image_source?: 'uploaded' | 'generated';
  }): Promise<AIpreneurProduct | null> => {
    try {
      const response = await productsApi.create(data);
      if (response.success) {
        setProducts(prev => [...prev, response.product]);
        return response.product;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      return null;
    }
  }, []);

  const updateProduct = useCallback(async (productId: string, data: Parameters<typeof productsApi.update>[1]): Promise<boolean> => {
    try {
      const response = await productsApi.update(productId, data as Parameters<typeof productsApi.update>[1]);
      if (response.success) {
        setProducts(prev => prev.map(p => p.id === productId ? response.product : p));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const response = await productsApi.delete(productId);
      if (response.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
      return false;
    }
  }, []);

  // Staff
  const loadStaff = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await staffApi.getAll();
      if (response.success) {
        setStaff(response.staff);
      }
    } catch (err) {
      console.error('Failed to load staff:', err);
    }
  }, [isAuthenticated]);

  const initializeStaff = useCallback(async () => {
    try {
      const response = await staffApi.initialize();
      if (response.success) {
        setStaff(response.staff);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize staff');
    }
  }, []);

  const updateStaffMember = useCallback(async (staffId: string, data: Parameters<typeof staffApi.update>[1]): Promise<boolean> => {
    try {
      const response = await staffApi.update(staffId, data as Parameters<typeof staffApi.update>[1]);
      if (response.success) {
        setStaff(prev => prev.map(s => s.id === staffId ? response.staff : s));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff');
      return false;
    }
  }, []);

  const hireFromInterview = useCallback(async (interviewId: string): Promise<AIpreneurStaff | null> => {
    try {
      const response = await staffApi.hire(interviewId);
      if (response.success) {
        setStaff(prev => {
          const filtered = prev.filter(s => s.staff_role !== response.staff.staff_role);
          return [...filtered, response.staff];
        });
        return response.staff;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hire staff');
      return null;
    }
  }, []);

  // Decorations
  const loadDecorations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await decorationsApi.get();
      if (response.success) {
        setDecorations(response.decorations);
        setDecorationItems(response.decoration_items);
      }
    } catch (err) {
      console.error('Failed to load decorations:', err);
    }
  }, [isAuthenticated]);

  const saveDecorationTheme = useCallback(async (data: { mood_theme: string; decoration_focus?: string }): Promise<boolean> => {
    try {
      const response = await decorationsApi.saveTheme(data);
      if (response.success) {
        setDecorations([response.decoration]);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decoration');
      return false;
    }
  }, []);

  const saveDecorationItems = useCallback(async (items: Partial<AIpreneurDecorationItem>[]): Promise<boolean> => {
    try {
      const response = await decorationsApi.saveItems(items as any);
      if (response.success) {
        setDecorationItems(response.items);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decoration items');
      return false;
    }
  }, []);

  // Interviews
  const loadInterviews = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await interviewsApi.getAll();
      if (response.success) {
        setInterviews(response.interviews);
      }
    } catch (err) {
      console.error('Failed to load interviews:', err);
    }
  }, [isAuthenticated]);

  const startInterview = useCallback(async (role: string): Promise<AIpreneurInterview | null> => {
    try {
      const response = await interviewsApi.start(role);
      if (response.success) {
        setInterviews(prev => [...prev, response.interview]);
        return response.interview;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      return null;
    }
  }, []);

  const submitInterview = useCallback(async (
    interviewId: string,
    data: {
      questions_asked: Record<string, unknown>[];
      responses: Record<string, unknown>[];
      decision: 'hired' | 'passed';
    }
  ): Promise<boolean> => {
    try {
      const response = await interviewsApi.submit(interviewId, data);
      if (response.success) {
        setInterviews(prev => prev.map(i => i.id === interviewId ? response.interview : i));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit interview');
      return false;
    }
  }, []);

  // Rewards
  const loadRewards = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await rewardsApi.get();
      if (response.success) {
        setRewards(response.rewards);
      }
    } catch (err) {
      console.error('Failed to load rewards:', err);
    }
  }, [isAuthenticated]);

  // Campaigns
  const loadCampaigns = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await campaignsApi.getAll();
      if (response.success) {
        setCampaigns(response.campaigns);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  }, [isAuthenticated]);

  const createCampaign = useCallback(async (data: {
    campaign_name: string;
    marketing_goal: string;
    color_style?: string;
    channels: string[];
    budget_coins: number;
  }): Promise<{ campaign: AIpreneurCampaign; results: Record<string, number> } | null> => {
    try {
      const response = await campaignsApi.create(data);
      if (response.success) {
        setCampaigns(prev => [...prev, response.campaign]);
        await loadRewards(); // Refresh rewards after spending coins
        return { campaign: response.campaign, results: response.results };
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
      return null;
    }
  }, []);

  // Marketing Assets
  const loadMarketingAssets = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await marketingAssetsApi.getAll();
      if (response.success) {
        setMarketingAssets(response.assets);
      }
    } catch (err) {
      console.error('Failed to load marketing assets:', err);
    }
  }, [isAuthenticated]);

  const createMarketingAsset = useCallback(async (data: {
    asset_type: string;
    asset_url: string;
    asset_config?: Record<string, unknown>;
    placement?: string;
  }): Promise<AIpreneurMarketingAsset | null> => {
    try {
      const response = await marketingAssetsApi.create(data);
      if (response.success) {
        setMarketingAssets(prev => [...prev, response.asset]);
        return response.asset;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create marketing asset');
      return null;
    }
  }, []);

  // Influencer Campaigns
  const loadInfluencerCampaigns = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await influencerCampaignsApi.getAll();
      if (response.success) {
        setInfluencerCampaigns(response.campaigns);
      }
    } catch (err) {
      console.error('Failed to load influencer campaigns:', err);
    }
  }, [isAuthenticated]);

  const startInfluencerCampaign = useCallback(async (data: {
    influencer_name: string;
    influencer_tier: 'nano' | 'micro' | 'macro' | 'mega';
    influencer_avatar?: string;
    influencer_niche?: string;
    duration_hours?: number;
  }): Promise<{ campaign: AIpreneurInfluencerCampaign; profit: number } | null> => {
    try {
      const response = await influencerCampaignsApi.start(data);
      if (response.success) {
        setInfluencerCampaigns(prev => [...prev, response.campaign]);
        await loadRewards();
        return { campaign: response.campaign, profit: response.profit };
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start influencer campaign');
      return null;
    }
  }, []);

  const dismissInfluencerCampaign = useCallback(async (campaignId: string): Promise<boolean> => {
    try {
      const response = await influencerCampaignsApi.dismiss(campaignId);
      if (response.success) {
        setInfluencerCampaigns(prev => prev.filter(c => c.id !== campaignId));
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dismiss campaign');
      return false;
    }
  }, []);

  // Innovations
  const loadInnovations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await innovationsApi.getAll();
      if (response.success) {
        setInnovations(response.innovations);
        setAvailableInnovationProjects(response.available_projects || []);
        setInnovationCatalog(response.projects_catalog || []);
        setInnovationRewardsLevel(Math.max(1, response.rewards_level || 1));
        setActiveInnovationCount(
          typeof response.active_count === 'number'
            ? response.active_count
            : response.innovations.filter((innovation) => innovation.is_active).length
        );
        setMaxActiveTech(Math.max(1, response.max_active_tech || 5));
        setInnovationUpgradeStepCost(Math.max(0, response.upgrade_step_cost ?? 80));
      }
    } catch (err) {
      console.error('Failed to load innovations:', err);
    }
  }, [isAuthenticated]);

  const unlockInnovation = useCallback(async (data: {
    tech_project: string;
    quiz_answers: Array<{ question: string; answer: string; correct: boolean }>;
    design_image_data?: string | null;
    cost?: number;
  }): Promise<{ innovation: AIpreneurInnovation; score: number } | null> => {
    try {
      const response = await innovationsApi.unlock(data);
      if (response.success) {
        setInnovations(prev => [...prev, response.innovation]);
        if (response.auto_activated) {
          setActiveInnovationCount((prev) => Math.min(prev + 1, maxActiveTech));
        }
        await loadInnovations();
        await loadRewards();
        return { innovation: response.innovation, score: response.score };
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock innovation');
      return null;
    }
  }, [loadInnovations, loadRewards, maxActiveTech]);

  const setInnovationActive = useCallback(async (innovationId: string, active: boolean): Promise<boolean> => {
    try {
      const response = await innovationsApi.setActive(innovationId, active);
      if (!response.success) return false;

      setInnovations((prev) =>
        prev.map((innovation) =>
          innovation.id === innovationId
            ? {
              ...innovation,
              ...response.innovation,
            }
            : innovation
        )
      );
      setActiveInnovationCount(response.active_count);
      setMaxActiveTech(response.max_active_tech || 5);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update innovation state');
      return false;
    }
  }, []);

  const upgradeInnovation = useCallback(async (innovationId: string): Promise<AIpreneurInnovation | null> => {
    try {
      const response = await innovationsApi.upgrade(innovationId);
      if (!response.success) return null;

      setInnovations((prev) =>
        prev.map((innovation) =>
          innovation.id === innovationId
            ? {
              ...innovation,
              ...response.innovation,
            }
            : innovation
        )
      );

      if (response.rewards) {
        setRewards(response.rewards);
      } else {
        await loadRewards();
      }

      return response.innovation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upgrade innovation');
      return null;
    }
  }, [loadRewards]);

  const claimDailyReward = useCallback(async (): Promise<{ daily_ai_tokens: number; daily_coins: number; streak_bonus: number } | null> => {
    try {
      const response = await rewardsApi.claimDaily();
      if (response.success) {
        const dailyAiTokens = response.daily_ai_tokens ?? response.daily_coins ?? 0;
        const dailyCoins = response.daily_coins ?? dailyAiTokens;
        setRewards(response.rewards);
        return {
          daily_ai_tokens: dailyAiTokens,
          daily_coins: dailyCoins,
          streak_bonus: response.streak_bonus ?? 0,
        };
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim daily reward');
      return null;
    }
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated) return;
    const now = Date.now();

    if (refreshAllInFlightRef.current) {
      return refreshAllInFlightRef.current;
    }
    if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) {
      return;
    }

    refreshAllInFlightRef.current = (async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([
          loadBusiness(),
          loadProducts(),
          loadStaff(),
          loadDecorations(),
          loadCampaigns(),
          loadMarketingAssets(),
          loadInfluencerCampaigns(),
          loadInnovations(),
          loadRewards(),
        ]);
      } catch (err) {
        setError('Failed to refresh data');
      } finally {
        lastRefreshAtRef.current = Date.now();
        refreshAllInFlightRef.current = null;
        setIsLoading(false);
      }
    })();

    return refreshAllInFlightRef.current;
  }, [
    isAuthenticated,
    MIN_REFRESH_INTERVAL_MS,
    loadBusiness,
    loadProducts,
    loadStaff,
    loadDecorations,
    loadCampaigns,
    loadMarketingAssets,
    loadInfluencerCampaigns,
    loadInnovations,
    loadRewards,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadBusinessInFlightRef.current = null;
      refreshAllInFlightRef.current = null;
      lastRefreshAtRef.current = 0;
      setBusiness(null);
      setProducts([]);
      setStaff([]);
      setDecorations([]);
      setDecorationItems([]);
      setInterviews([]);
      setCampaigns([]);
      setMarketingAssets([]);
      setInfluencerCampaigns([]);
      setInnovations([]);
      setAvailableInnovationProjects([]);
      setInnovationCatalog([]);
      setInnovationRewardsLevel(1);
      setActiveInnovationCount(0);
      setMaxActiveTech(5);
      setInnovationUpgradeStepCost(80);
      setRewards(null);
      setOverallProgress(0);
      setError(null);
    }
  }, [isAuthenticated]);

  // Load initial data when authenticated and when profile context changes
  useEffect(() => {
    if (isAuthenticated && geniusProfile?.id) {
      refreshAll();
    }
  }, [isAuthenticated, geniusProfile?.id, refreshAll]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      refreshAll();
    };
    window.addEventListener('aipreneur:refresh', handler);
    return () => window.removeEventListener('aipreneur:refresh', handler);
  }, [refreshAll]);

  return {
    // Data
    business,
    products,
    staff,
    decorations,
    decorationItems,
    interviews,
    campaigns,
    marketingAssets,
    influencerCampaigns,
    innovations,
    availableInnovationProjects,
    innovationCatalog,
    innovationRewardsLevel,
    activeInnovationCount,
    maxActiveTech,
    innovationUpgradeStepCost,
    rewards,
    overallProgress,

    // Loading states
    isLoading,
    error,

    // Business actions
    loadBusiness,
    updateBusiness,
    updateModuleProgress,

    // Product actions
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,

    // Staff actions
    loadStaff,
    initializeStaff,
    updateStaffMember,
    hireFromInterview,

    // Decoration actions
    loadDecorations,
    saveDecorationTheme,
    saveDecorationItems,

    // Interview actions
    loadInterviews,
    startInterview,
    submitInterview,

    // Campaign actions
    loadCampaigns,
    createCampaign,

    // Marketing asset actions
    loadMarketingAssets,
    createMarketingAsset,

    // Influencer campaign actions
    loadInfluencerCampaigns,
    startInfluencerCampaign,
    dismissInfluencerCampaign,

    // Innovation actions
    loadInnovations,
    unlockInnovation,
    setInnovationActive,
    upgradeInnovation,

    // Reward actions
    loadRewards,
    claimDailyReward,

    // Utility
    refreshAll,
  };
};

export default useAIpreneur;
