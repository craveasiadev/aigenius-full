/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 * Uses Laravel API instead of Supabase auth.
 */

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { api, getToken, clearToken, clearAllTokens } from '../lib/api';
import type { User } from '../types/models';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const currentUser = useStore((state) => state.currentUser);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const loginUser = useStore((state) => state.login);
  const logoutUser = useStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      const token = getToken();
      console.log('[AuthContext] Checking session, token exists:', !!token);

      // If no token, clear user state
      if (!token) {
        setCurrentUser(null);
        setIsLoading(false);
        console.log('[AuthContext] No token found, setting isLoading=false');
        return;
      }

      // If user is already set in store, don't re-check
      // This prevents race conditions after login
      const existingUser = useStore.getState().currentUser;
      if (existingUser) {
        console.log('[AuthContext] User already set, skipping session check');
        setIsLoading(false);
        return;
      }

      try {
        // Validate token with API
        console.log('[AuthContext] Validating token with API...');
        const response = await api.get<{
          success: boolean;
          user?: {
            id: string;
            email: string;
            name: string;
            role: string;
            created_at: string;
          };
        }>('/auth/me');

        if (response.success && response.user) {
          const userForStore = {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role as 'student' | 'parent' | 'teacher' | 'master',
            passwordHash: '',
            createdAt: response.user.created_at,
          };
          setCurrentUser(userForStore);
          console.log('[AuthContext] Session validated, user set:', response.user.email);
        } else {
          // Invalid token
          console.warn('[AuthContext] Invalid session token, clearing');
          clearToken();
          setCurrentUser(null);
        }
      } catch (error: any) {
        console.error('[AuthContext] Session check failed:', error);
        // Only clear on definitive 401, not on network errors
        if (error?.status === 401) {
          console.warn('[AuthContext] 401 received, clearing session');
          clearToken();
          setCurrentUser(null);
        }
        // For other errors, leave the state as-is
      } finally {
        setIsLoading(false);
        console.log('[AuthContext] Session check complete, isLoading=false');
      }
    };

    checkSession();
  }, [setCurrentUser]);

  const login = (email: string, password: string) => {
    const user = loginUser(email, password);
    return !!user;
  };

  const logout = async () => {
    try {
      // Call logout API
      await api.post('/auth/logout');
    } catch {
      // Continue with local logout even if API fails
    }

    // Clear ALL tokens to prevent cross-contamination between auth systems
    clearAllTokens();
    logoutUser();
    console.log('[AuthContext] Logout complete - all tokens cleared');
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
