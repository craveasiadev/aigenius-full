/**
 * Token Usage Context
 *
 * Tracks AI token usage for the current user.
 * Uses Laravel API instead of Supabase.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface TokenUsageContextValue {
  total_tokens: number;
  refresh: () => Promise<void>;
  updateFromDelta: (delta: number) => void;
}

const TokenUsageContext = createContext<TokenUsageContextValue | undefined>(undefined);

export const TokenUsageProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [totalTokens, setTotalTokens] = useState(0);

  const refresh = async () => {
    if (!currentUser?.id) return;

    try {
      const response = await api.get<{
        success: boolean;
        total_tokens?: number;
      }>('/aipreneur/ai/token-usage');

      if (response.success) {
        setTotalTokens(response.total_tokens || 0);
      }
    } catch (error) {
      console.error('Error fetching token count:', error);
      // Fall back to local storage
      const localTokens = localStorage.getItem('total_tokens');
      if (localTokens) {
        setTotalTokens(parseInt(localTokens, 10) || 0);
      }
    }
  };

  const updateFromDelta = (delta: number) => {
    setTotalTokens(prev => {
      const newTotal = prev + delta;
      // Also store locally
      localStorage.setItem('total_tokens', String(newTotal));
      return newTotal;
    });
  };

  useEffect(() => {
    if (currentUser?.id) {
      refresh();
    }
  }, [currentUser?.id]);

  return (
    <TokenUsageContext.Provider value={{ total_tokens: totalTokens, refresh, updateFromDelta }}>
      {children}
    </TokenUsageContext.Provider>
  );
};

export const useTokenUsage = () => {
  const context = useContext(TokenUsageContext);
  if (!context) {
    // Return safe defaults instead of throwing - helps with HMR/ngrok issues
    console.warn('[TokenUsageContext] Context not available, returning defaults');
    return {
      total_tokens: 0,
      refresh: async () => {},
      updateFromDelta: () => {},
    };
  }
  return context;
};
