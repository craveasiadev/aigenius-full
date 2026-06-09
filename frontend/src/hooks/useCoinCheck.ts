/**
 * AI Token Check Hook (legacy name kept for compatibility)
 *
 * Provides utilities for checking and spending AI tokens before operations.
 * Coin costs are defined in constants/coinCosts.ts
 */

import { useState, useCallback, useEffect } from 'react';
import { useAIpreneur } from './useAIpreneur';
import { COIN_COSTS, type CoinOperationType } from '../constants/coinCosts';
import { tokensApi } from '../services/aipreneurApi';
import { paymentApi } from '../services/paymentApi';
import { ApiError } from '../lib/api';

export interface CoinCheckResult {
  hasEnoughCoins: boolean;
  currentBalance: number;
  required: number;
  deficit: number;
}

export interface UseCoinCheckReturn {
  checkCoins: (operation: CoinOperationType, quantity?: number) => CoinCheckResult;
  spendCoins: (operation: CoinOperationType, quantity?: number, reason?: string) => Promise<{
    success: boolean;
    newBalance: number;
    coinsSpent: number;
    error?: string;
  }>;
  getCoinCost: (operation: CoinOperationType) => number;
  isProcessing: boolean;
}

export const useCoinCheck = (): UseCoinCheckReturn => {
  const { rewards, refreshAll } = useAIpreneur();
  const [isProcessing, setIsProcessing] = useState(false);
  const [dynamicCosts, setDynamicCosts] = useState<Partial<Record<CoinOperationType, number>>>({});

  useEffect(() => {
    let cancelled = false;

    const loadDynamicCosts = async () => {
      try {
        const remoteCosts = await paymentApi.getTokenCosts();
        if (cancelled || !remoteCosts) return;

        const normalized: Partial<Record<CoinOperationType, number>> = {};
        (Object.keys(COIN_COSTS) as CoinOperationType[]).forEach((operation) => {
          const value = Number((remoteCosts as Record<string, unknown>)[operation]);
          if (Number.isFinite(value) && value >= 0) {
            normalized[operation] = value;
          }
        });

        setDynamicCosts(normalized);
      } catch (error) {
        console.warn('[useCoinCheck] Failed to load dynamic coin costs.', error);
      }
    };

    void loadDynamicCosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolveCost = useCallback((operation: CoinOperationType): number => {
    const dynamicValue = dynamicCosts[operation];
    if (typeof dynamicValue === 'number' && Number.isFinite(dynamicValue) && dynamicValue >= 0) {
      return dynamicValue;
    }
    return COIN_COSTS[operation];
  }, [dynamicCosts]);

  const getCoinCost = useCallback((operation: CoinOperationType): number => {
    return resolveCost(operation);
  }, [resolveCost]);

  const checkCoins = useCallback((
    operation: CoinOperationType,
    quantity: number = 1
  ): CoinCheckResult => {
    const currentBalance = rewards?.ai_tokens || 0;
    const required = resolveCost(operation) * quantity;
    const deficit = required - currentBalance;

    return {
      hasEnoughCoins: currentBalance >= required,
      currentBalance,
      required,
      deficit: deficit > 0 ? deficit : 0,
    };
  }, [rewards?.ai_tokens, resolveCost]);

  const spendCoins = useCallback(async (
    operation: CoinOperationType,
    quantity: number = 1,
    reason?: string
  ): Promise<{
    success: boolean;
    newBalance: number;
    coinsSpent: number;
    error?: string;
  }> => {
    const check = checkCoins(operation, quantity);

    if (!check.hasEnoughCoins) {
      return {
        success: false,
        newBalance: check.currentBalance,
        coinsSpent: 0,
        error: `Insufficient AI tokens. Need ${check.required}, have ${check.currentBalance}.`,
      };
    }

    setIsProcessing(true);

    try {
      const response = await tokensApi.consume({
        operation,
        quantity,
        reason: reason || `${operation} x${quantity}`,
      });

      if (response.success) {
        await refreshAll();

        return {
          success: true,
          newBalance: response.new_balance,
          coinsSpent: response.tokens_used,
        };
      }

      return {
        success: false,
        newBalance: check.currentBalance,
        coinsSpent: 0,
        error: response.message || 'Failed to spend AI tokens',
      };
    } catch (error) {
      console.error('Coin spend error:', error);
      const message = error instanceof ApiError ? error.message : 'Network error. Please try again.';
      return {
        success: false,
        newBalance: check.currentBalance,
        coinsSpent: 0,
        error: message,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [checkCoins, refreshAll]);

  return {
    checkCoins,
    spendCoins,
    getCoinCost,
    isProcessing,
  };
};

export default useCoinCheck;
