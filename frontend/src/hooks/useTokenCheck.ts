/**
 * Token Check Hook
 *
 * Provides utilities for checking and consuming AI tokens before operations.
 * Token costs are aligned with src/constants/coinCosts.ts.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAIpreneur } from './useAIpreneur';
import { geniusApi, ApiError } from '../lib/api';
import { paymentApi } from '../services/paymentApi';

export type TokenOperationType =
  | 'product_image'
  | 'product_regenerate'
  | 'interior_item'
  | 'marketing_asset'
  | 'marketing_content'
  | 'shop_exterior'
  | 'ai_chat';

export const TOKEN_COSTS: Record<TokenOperationType, number> = {
  product_image: 35,
  product_regenerate: 45,
  interior_item: 35,
  marketing_asset: 35,
  marketing_content: 5,
  shop_exterior: 70,
  ai_chat: 10,
};

export interface TokenCheckResult {
  hasEnoughTokens: boolean;
  currentBalance: number;
  required: number;
  deficit: number;
}

export interface UseTokenCheckReturn {
  checkTokens: (operation: TokenOperationType, quantity?: number) => TokenCheckResult;
  consumeTokens: (operation: TokenOperationType, quantity?: number, reason?: string) => Promise<{
    success: boolean;
    newBalance: number;
    tokensUsed: number;
    error?: string;
  }>;
  getTokenCost: (operation: TokenOperationType) => number;
  isProcessing: boolean;
}

export const useTokenCheck = (): UseTokenCheckReturn => {
  const { rewards, refreshAll } = useAIpreneur();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dynamicCosts, setDynamicCosts] = useState<Partial<Record<TokenOperationType, number>>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDynamicCosts = async () => {
      try {
        const remoteCosts = await paymentApi.getTokenCosts();
        if (cancelled || !remoteCosts) return;

        const normalized: Partial<Record<TokenOperationType, number>> = {};
        (Object.keys(TOKEN_COSTS) as TokenOperationType[]).forEach((operation) => {
          const value = Number((remoteCosts as Record<string, unknown>)[operation]);
          if (Number.isFinite(value) && value >= 0) {
            normalized[operation] = value;
          }
        });

        setDynamicCosts(normalized);
      } catch (error) {
        console.warn('[useTokenCheck] Failed to load dynamic token costs.', error);
      }
    };

    void loadDynamicCosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveCost = useCallback((operation: TokenOperationType): number => {
    const dynamicValue = dynamicCosts[operation];
    if (typeof dynamicValue === 'number' && Number.isFinite(dynamicValue) && dynamicValue >= 0) {
      return dynamicValue;
    }
    return TOKEN_COSTS[operation];
  }, [dynamicCosts]);

  const getTokenCost = useCallback((operation: TokenOperationType): number => {
    return resolveCost(operation);
  }, [resolveCost]);

  const checkTokens = useCallback((
    operation: TokenOperationType,
    quantity: number = 1
  ): TokenCheckResult => {
    const currentBalance = rewards?.ai_tokens || 0;
    const required = resolveCost(operation) * quantity;
    const deficit = required - currentBalance;

    return {
      hasEnoughTokens: currentBalance >= required,
      currentBalance,
      required,
      deficit: deficit > 0 ? deficit : 0,
    };
  }, [rewards?.ai_tokens, resolveCost]);

  const consumeTokens = useCallback(async (
    operation: TokenOperationType,
    quantity: number = 1,
    reason?: string
  ): Promise<{
    success: boolean;
    newBalance: number;
    tokensUsed: number;
    error?: string;
  }> => {
    const check = checkTokens(operation, quantity);

    if (!check.hasEnoughTokens) {
      return {
        success: false,
        newBalance: check.currentBalance,
        tokensUsed: 0,
        error: `Insufficient tokens. Need ${check.required}, have ${check.currentBalance}.`,
      };
    }

    setIsProcessing(true);

    try {
      const response = await geniusApi.post<{
        success: boolean;
        new_balance: number;
        tokens_used: number;
        message?: string;
      }>('/aipreneur/tokens/consume', {
        operation,
        quantity,
        reason: reason || `${operation} x${quantity}`,
      });

      if (response.success) {
        // Refresh rewards to get updated balance
        await refreshAll();

        return {
          success: true,
          newBalance: response.new_balance,
          tokensUsed: response.tokens_used,
        };
      } else {
        return {
          success: false,
          newBalance: check.currentBalance,
          tokensUsed: 0,
          error: response.message || 'Failed to consume tokens',
        };
      }
    } catch (error) {
      console.error('Token consumption error:', error);
      const message = error instanceof ApiError ? error.message : 'Network error. Please try again.';
      return {
        success: false,
        newBalance: check.currentBalance,
        tokensUsed: 0,
        error: message,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [checkTokens, refreshAll]);

  return {
    checkTokens,
    consumeTokens,
    getTokenCost,
    isProcessing,
  };
};

export default useTokenCheck;
