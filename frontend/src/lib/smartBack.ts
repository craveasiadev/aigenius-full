import { useCallback } from 'react';
import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom';

const FALLBACK = '/s/aipreneur';

type LocationStateMaybe = { from?: string } | null | undefined;

function isSafePath(p: unknown): p is string {
  return typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');
}

/**
 * Smart back navigation.
 * Priority:
 *   1) location.state.from (if a caller passed it)
 *   2) browser history (navigate(-1))
 *   3) fallback path
 */
export function useSmartBack(fallback: string = FALLBACK) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (override?: string) => {
      if (override && isSafePath(override)) {
        navigate(override);
        return;
      }
      const state = location.state as LocationStateMaybe;
      const from = state?.from;
      if (isSafePath(from)) {
        navigate(from);
        return;
      }
      if (typeof window !== 'undefined' && window.history.length > 1) {
        navigate(-1);
        return;
      }
      navigate(fallback);
    },
    [navigate, location.state, fallback]
  );
}

/**
 * Build a NavigateOptions object that records the current pathname as `from`,
 * so the destination page's back button can return here.
 *
 *   navigate('/s/aipreneur/product', withFrom(location))
 */
export function withFrom(
  location: { pathname: string; search?: string },
  extra?: Record<string, unknown>,
  options?: Omit<NavigateOptions, 'state'>
): NavigateOptions {
  const path = location.pathname + (location.search || '');
  return {
    ...(options || {}),
    state: { from: path, ...(extra || {}) },
  };
}
