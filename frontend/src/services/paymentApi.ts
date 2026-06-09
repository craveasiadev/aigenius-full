/**
 * Payment API Service
 *
 * Handles payment gateway integration for purchasing AI tokens.
 */

import { geniusApi as api, publicApi } from '../lib/api';

// =============================================
// TYPES
// =============================================

export interface PaymentPackage {
  id: string;
  type: 'ai_tokens' | 'coins';
  name: string;
  amount: number; // Number of tokens or coins
  price: number; // Price in RM
  originalPrice?: number; // Original price before discount
  bonus?: number; // Bonus tokens/coins
  popular?: boolean;
  bestValue?: boolean;
}

export interface PaymentInitiation {
  customer_id: string;
  product_id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  product_name: string;
  package_type: 'ai_tokens' | 'coins';
  package_amount: number;
  genius_profile_id: string;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    payment_url: string;
    payment_data: Record<string, string>;
    transaction_id?: string;
    order_id: string;
  };
  message?: string;
  error?: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  package_type: 'ai_tokens' | 'coins';
  package_amount: number;
  created_at: string;
}

export interface PricingCatalogPackage {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  package_type: 'ai_tokens';
  tokens_amount: number;
  bonus_tokens: number;
  total_tokens: number;
  price_rm: number;
  original_price_rm?: number | null;
  badge?: 'none' | 'popular' | 'best_value' | string;
  popular?: boolean;
  best_value?: boolean;
  sort_order?: number;
}

export interface PricingCatalog {
  success: boolean;
  packages: PricingCatalogPackage[];
  token_costs: Record<string, number>;
  influencer_tier_costs?: Record<string, number>;
  innovation_unlock_costs?: Record<string, number>;
  system_costs?: Record<string, number | boolean>;
  feature_access?: Record<string, boolean>;
  economy?: {
    passive_visitor_interval_seconds?: number;
    visitor_purchase_chance_percent?: number;
    daily_visitors?: Record<string, unknown>;
  };
}

// =============================================
// PACKAGE DEFINITIONS
// =============================================

export const AI_TOKEN_PACKAGES: PaymentPackage[] = [
  {
    id: 'tokens_starter',
    type: 'ai_tokens',
    name: 'Starter Pack',
    amount: 180,
    price: 5.90,
    bonus: 0,
  },
  {
    id: 'tokens_standard',
    type: 'ai_tokens',
    name: 'Adventurer Pack',
    amount: 520,
    originalPrice: 19.90,
    price: 14.90,
    bonus: 80,
    popular: true,
  },
  {
    id: 'tokens_premium',
    type: 'ai_tokens',
    name: 'Warrior Pack',
    amount: 1300,
    originalPrice: 43.90,
    price: 29.90,
    bonus: 250,
  },
  {
    id: 'tokens_ultimate',
    type: 'ai_tokens',
    name: 'Champion Pack',
    amount: 3000,
    originalPrice: 86.90,
    price: 54.90,
    bonus: 900,
    bestValue: true,
  },
];

// Legacy alias for older imports.
export const COIN_PACKAGES = AI_TOKEN_PACKAGES;

const CATALOG_CACHE_TTL_MS = 60_000;
let cachedPricingCatalog: PricingCatalog | null = null;
let cachedAt = 0;

// Payment method options (must match backend payment gateway handling)
export const PAYMENT_METHODS = [
  { id: 'fpx', name: 'Online Banking (FPX)', icon: '🏦' },
  { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
  { id: 'tng', name: 'Touch n Go eWallet', icon: '📱' },
  { id: 'grabpay', name: 'GrabPay', icon: '🟢' },
  { id: 'boost', name: 'Boost', icon: '🔴' },
];

// =============================================
// API FUNCTIONS
// =============================================

class PaymentAPI {
  private mapCatalogPackageToPayment(pkg: PricingCatalogPackage): PaymentPackage {
    return {
      id: pkg.code || pkg.id,
      type: 'ai_tokens',
      name: pkg.name,
      amount: Number(pkg.tokens_amount || 0),
      price: Number(pkg.price_rm || 0),
      originalPrice: pkg.original_price_rm !== null && pkg.original_price_rm !== undefined
        ? Number(pkg.original_price_rm)
        : undefined,
      bonus: Number(pkg.bonus_tokens || 0),
      popular: Boolean(pkg.popular || pkg.badge === 'popular'),
      bestValue: Boolean(pkg.best_value || pkg.badge === 'best_value'),
    };
  }

  async getPricingCatalog(forceRefresh = false): Promise<PricingCatalog | null> {
    const now = Date.now();
    if (!forceRefresh && cachedPricingCatalog && now - cachedAt < CATALOG_CACHE_TTL_MS) {
      return cachedPricingCatalog;
    }

    try {
      const response = await publicApi.get<PricingCatalog>('/aigenius/pricing/catalog');
      if (response?.success) {
        cachedPricingCatalog = response;
        cachedAt = now;
        return response;
      }
      return cachedPricingCatalog;
    } catch (error) {
      console.warn('[PaymentAPI] Failed to load pricing catalog, using fallback.', error);
      return cachedPricingCatalog;
    }
  }

  async getTokenPackages(forceRefresh = false): Promise<PaymentPackage[]> {
    const catalog = await this.getPricingCatalog(forceRefresh);
    if (catalog?.packages?.length) {
      return [...catalog.packages]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((pkg) => this.mapCatalogPackageToPayment(pkg));
    }
    return AI_TOKEN_PACKAGES;
  }

  async getTokenCosts(forceRefresh = false): Promise<Record<string, number>> {
    const catalog = await this.getPricingCatalog(forceRefresh);
    if (catalog?.token_costs && Object.keys(catalog.token_costs).length > 0) {
      return catalog.token_costs;
    }
    return {};
  }

  /**
   * Generate a unique order ID
   */
  generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WP-${timestamp}-${random}`;
  }

  /**
   * Initiate a payment transaction
   * Calls the AI Genius specific payment endpoint (separate from other projects)
   */
  async initiatePayment(data: PaymentInitiation): Promise<PaymentResponse> {
    try {
      // Get current frontend URL for payment callback redirect
      const frontendUrl = window.location.origin;

      // Transform data to match AIGeniusPaymentController expectations
      const paymentData = {
        student_id: data.genius_profile_id,
        order_id: data.order_id,
        amount: data.amount,
        payment_method: data.payment_method,
        product_id: data.product_id,
        package_type: data.package_type,
        package_name: data.product_name,
        package_amount: data.package_amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || '0123456789',
        frontend_url: frontendUrl,
      };

      console.log('[PaymentAPI] Initiating AI Genius payment:', paymentData);

      // Use AI Genius specific endpoint (doesn't conflict with other projects)
      const response = await api.post<PaymentResponse>('/aigenius/payments/initiate', paymentData);

      console.log('[PaymentAPI] Payment response:', response);

      return response;
    } catch (error: any) {
      console.error('[PaymentAPI] Initiate payment error:', error);
      return {
        success: false,
        error: error.data?.message || error.message || 'Payment initiation failed',
      };
    }
  }

  /**
   * Get user's balance (AI Tokens and Coins)
   */
  async getBalance(studentId: string): Promise<{ success: boolean; data?: { ai_tokens: number; coins: number }; error?: string }> {
    try {
      const response = await api.get<{ success: boolean; data?: { ai_tokens: number; coins: number }; error?: string }>(`/aigenius/payments/balance?student_id=${studentId}`);
      return response;
    } catch (error: any) {
      console.error('[PaymentAPI] Get balance error:', error);
      return {
        success: false,
        error: error.data?.message || error.message || 'Failed to get balance',
      };
    }
  }

  /**
   * Get user's purchase history
   */
  async getPurchaseHistory(studentId: string): Promise<{ success: boolean; data?: PaymentTransaction[]; error?: string }> {
    try {
      const response = await api.get<{ success: boolean; data?: PaymentTransaction[]; error?: string }>(`/aigenius/payments/history?student_id=${studentId}`);
      return response;
    } catch (error: any) {
      console.error('[PaymentAPI] Get purchase history error:', error);
      return {
        success: false,
        error: error.data?.message || error.message,
      };
    }
  }

  /**
   * Submit payment to gateway.
   * - Fiuu: POST form fields.
   * - ToyyibPay (sandbox): direct redirect when no form fields are provided.
   */
  submitPaymentForm(paymentUrl: string, paymentData: Record<string, string>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('[PaymentAPI] Creating payment form');
        console.log('[PaymentAPI] Payment URL:', paymentUrl);

        if (!paymentUrl || typeof paymentUrl !== 'string') {
          throw new Error('Invalid payment URL');
        }

        if (!paymentData || typeof paymentData !== 'object') {
          throw new Error('Invalid payment data');
        }

        // ToyyibPay flow uses direct bill URL and does not require form fields.
        if (Object.keys(paymentData).length === 0) {
          window.location.href = paymentUrl;
          resolve();
          return;
        }

        // Create and submit form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = paymentUrl;
        form.style.display = 'none';
        form.setAttribute('id', 'fiuu-payment-form');

        Object.entries(paymentData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        });

        document.body.appendChild(form);
        console.log('[PaymentAPI] Payment form created');

        setTimeout(() => {
          console.log('[PaymentAPI] Submitting payment form');
          form.submit();
          resolve();
        }, 100);

      } catch (error) {
        console.error('[PaymentAPI] Error creating/submitting payment form:', error);
        reject(error instanceof Error ? error : new Error('Failed to submit payment form'));
      }
    });
  }
}

export const paymentApi = new PaymentAPI();
