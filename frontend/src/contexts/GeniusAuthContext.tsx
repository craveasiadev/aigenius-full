/**
 * Genius Auth Context
 *
 * Handles authentication for genius profiles (child accounts).
 * Uses Laravel API backend instead of Supabase.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { authApi, profileApi, GeniusProfile, QuestionnaireAnswers } from '../services/aipreneurApi';
import { getGeniusToken as getToken, clearGeniusToken as clearToken, clearAllTokens } from '../lib/api';
import { ForceLogoutModal } from '../components/ForceLogoutModal';

const SHIFT_MUST_OPEN_KEY = 'aipreneur_shift_must_open';
const SHIFT_OPEN_PREFIX = 'aipreneur_shift_open_';

interface GeniusAuthContextType {
  // State
  geniusProfile: GeniusProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Auth methods
  login: (geniusId: string, password: string) => Promise<boolean>;
  loginAsChild: (profileId: string) => Promise<boolean>;
  logout: () => Promise<void>;

  // Profile methods
  refreshProfile: () => Promise<void>;
  completeOnboarding: (data: {
    passion_category: string;
    aipreneur_shop_name: string;
    questionnaire_answers: QuestionnaireAnswers;
  }) => Promise<boolean>;
  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    age?: number;
    avatar_url?: string;
  }) => Promise<boolean>;

  // Session
  forceLogoutReason: string | null;
  dismissForceLogout: () => void;

  // Helper
  clearError: () => void;
}

const GeniusAuthContext = createContext<GeniusAuthContextType | undefined>(undefined);

export const GeniusAuthProvider = ({ children }: { children: ReactNode }) => {
  const [geniusProfile, setGeniusProfile] = useState<GeniusProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceLogoutReason, setForceLogoutReason] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAuthenticated = !!geniusProfile && !!getToken();

  const markShiftRequiredForLogin = useCallback((profileId?: string | null) => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(SHIFT_MUST_OPEN_KEY, '1');
    if (profileId) {
      sessionStorage.removeItem(`${SHIFT_OPEN_PREFIX}${profileId}`);
    }
  }, []);

  const clearShiftSessionFlags = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SHIFT_MUST_OPEN_KEY);
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(SHIFT_OPEN_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = getToken();
      console.log('[GeniusAuth] Checking session, token exists:', !!token);

      if (!token) {
        console.log('[GeniusAuth] No token found, setting isLoading=false');
        setIsLoading(false);
        return;
      }

      try {
        console.log('[GeniusAuth] Calling getCurrentProfile...');
        const response = await authApi.getCurrentProfile();
        console.log('[GeniusAuth] getCurrentProfile response:', response);
        if (response.success && response.profile) {
          setGeniusProfile(response.profile);
          console.log('[GeniusAuth] Profile set successfully');
        }
      } catch (err: any) {
        console.error('[GeniusAuth] Session check failed:', err);
        console.error('[GeniusAuth] Error status:', err?.status);
        // Only clear token if explicitly unauthorized (401)
        // This prevents logout on network errors (status 0) or server errors (500)
        if (err?.status === 401 || err?.response?.status === 401) {
          console.warn('[GeniusAuth] 401 error - clearing token');
          clearToken();
        }
      } finally {
        setIsLoading(false);
        console.log('[GeniusAuth] Session check complete, isLoading=false');
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (geniusId: string, password: string): Promise<boolean> => {
    console.log('[GeniusAuth] Login attempt for:', geniusId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(geniusId, password);
      console.log('[GeniusAuth] Login response:', response);

      if (response.success && response.profile) {
        setGeniusProfile(response.profile);
        markShiftRequiredForLogin(response.profile.id);
        console.log('[GeniusAuth] Login successful, profile set');
        console.log('[GeniusAuth] Token saved:', !!getToken());
        return true;
      }

      setError(response.message || 'Login failed');
      console.warn('[GeniusAuth] Login failed:', response.message);
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      console.error('[GeniusAuth] Login error:', err);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [markShiftRequiredForLogin]);

  // Parent login as child - used when parent switches to child's dashboard
  const loginAsChild = useCallback(async (profileId: string): Promise<boolean> => {
    console.log('[GeniusAuth] Parent login as child, profileId:', profileId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.parentLoginAsChild(profileId);
      console.log('[GeniusAuth] parentLoginAsChild response:', response);

      if (response.success && response.profile) {
        setGeniusProfile(response.profile);
        markShiftRequiredForLogin(response.profile.id);
        console.log('[GeniusAuth] Login as child successful, profile set');
        console.log('[GeniusAuth] Genius token saved:', !!getToken());
        return true;
      }

      setError(response.message || 'Failed to switch to child profile');
      console.warn('[GeniusAuth] Login as child failed:', response.message);
      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch to child profile';
      console.error('[GeniusAuth] Login as child error:', err);
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [markShiftRequiredForLogin]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      // Clear ALL tokens to prevent cross-contamination between auth systems
      clearAllTokens();
      clearShiftSessionFlags();
      setGeniusProfile(null);
      setIsLoading(false);
      console.log('[GeniusAuthContext] Logout complete - all tokens cleared');
    }
  }, [clearShiftSessionFlags]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!getToken()) return;

    try {
      const response = await authApi.getCurrentProfile();
      if (response.success && response.profile) {
        setGeniusProfile(response.profile);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }, []);

  const completeOnboarding = useCallback(async (data: {
    passion_category: string;
    aipreneur_shop_name: string;
    questionnaire_answers: QuestionnaireAnswers;
  }): Promise<boolean> => {
    setError(null);

    try {
      const response = await profileApi.completeOnboarding(data);

      if (response.success && response.profile) {
        setGeniusProfile(response.profile);
        return true;
      }

      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding';
      setError(message);
      return false;
    }
  }, []);

  const updateProfile = useCallback(async (data: {
    first_name?: string;
    last_name?: string;
    age?: number;
    avatar_url?: string;
  }): Promise<boolean> => {
    setError(null);

    try {
      const response = await profileApi.update(data);

      if (response.success && response.profile) {
        setGeniusProfile(response.profile);
        return true;
      }

      return false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleForceLogout = useCallback((reason: string) => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    clearAllTokens();
    setGeniusProfile(null);
    setForceLogoutReason(reason);
  }, []);

  const dismissForceLogout = useCallback(() => {
    setForceLogoutReason(null);
    window.location.href = '/login';
  }, []);

  // Listen for session-replaced events from the API layer (instant detection)
  useEffect(() => {
    const onSessionReplaced = () => {
      handleForceLogout(
        "You've been logged out because your account was signed in on another device."
      );
    };
    window.addEventListener('session-replaced', onSessionReplaced);
    return () => window.removeEventListener('session-replaced', onSessionReplaced);
  }, [handleForceLogout]);

  // Session heartbeat — polls every 30s to detect token revocation
  useEffect(() => {
    if (!isAuthenticated || !getToken()) return;

    const INTERVAL_ACTIVE = 30_000; // 30s when tab visible
    const INTERVAL_HIDDEN = 120_000; // 2min when tab hidden

    const checkSession = async () => {
      try {
        await authApi.sessionCheck();
      } catch (err: any) {
        if (err?.status === 401) {
          const reason = err?.data?.reason;
          handleForceLogout(
            reason === 'session_replaced'
              ? "You've been logged out because your account was signed in on another device."
              : 'Your session has expired. Please log in again.'
          );
        }
        // Ignore network/server errors — next poll will retry
      }
    };

    const startPolling = (interval: number) => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(checkSession, interval);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        startPolling(INTERVAL_HIDDEN);
      } else {
        checkSession(); // Immediate check when tab becomes visible
        startPolling(INTERVAL_ACTIVE);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    startPolling(INTERVAL_ACTIVE);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isAuthenticated, handleForceLogout]);

  return (
    <GeniusAuthContext.Provider
      value={{
        geniusProfile,
        isLoading,
        isAuthenticated,
        error,
        login,
        loginAsChild,
        logout,
        refreshProfile,
        completeOnboarding,
        updateProfile,
        forceLogoutReason,
        dismissForceLogout,
        clearError,
      }}
    >
      {children}
      <ForceLogoutModal
        isOpen={!!forceLogoutReason}
        message={forceLogoutReason || ''}
        onDismiss={dismissForceLogout}
      />
    </GeniusAuthContext.Provider>
  );
};

export const useGeniusAuth = () => {
  const context = useContext(GeniusAuthContext);
  if (!context) {
    // Return safe defaults instead of throwing - helps with HMR/ngrok issues
    console.warn('[GeniusAuthContext] Context not available, returning defaults');
    return {
      geniusProfile: null,
      isLoading: true,
      isAuthenticated: false,
      error: null,
      login: async () => false,
      loginAsChild: async () => false,
      logout: async () => {},
      refreshProfile: async () => {},
      completeOnboarding: async () => false,
      updateProfile: async () => false,
      forceLogoutReason: null,
      dismissForceLogout: () => {},
      clearError: () => {},
    } as GeniusAuthContextType;
  }
  return context;
};

export default GeniusAuthContext;
