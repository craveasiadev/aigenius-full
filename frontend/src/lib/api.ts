/**
 * API Client Configuration
 *
 * Replaces Supabase with Laravel API backend.
 * Dev URL: http://artventure.test
 * Prod URL: https://app.aigenius.com.my
 *
 * Note: No /api prefix - routes are in web.php directly
 */



const PRODUCTION_API = 'https://app.aigenius.com.my';

/*
 * API base URL resolution — explicit `.env` overrides win.
 *
 * Resolution order (first match wins):
 *   1. `VITE_API_URL` in the active `.env` (non-empty).
 *      • `/api`     → use the Vite dev-server proxy (typical local).
 *      • full URL   → hit that backend directly. Lets you point a
 *                     local `npm run dev` at the production backend
 *                     by editing `.env` — no code changes.
 *   2. Auto-detect fallback (used when the env var is blank):
 *        Capacitor / packaged APK    → PRODUCTION_API
 *        localhost with a port       → /api (Vite proxy)
 *        ngrok / loca.lt tunnel      → /api
 *        anything else (prod web)    → PRODUCTION_API
 *
 * Safety guard: inside the Capacitor WebView a relative path like
 * `/api` cannot work (there is no proxy), so we ignore that
 * override and fall back to PRODUCTION_API. Otherwise a packaged
 * APK built with a dev .env would be DOA.
 */
function resolveApiUrl(): { url: string; reason: string } {
  const envApi = (import.meta.env.VITE_API_URL || '').toString().trim();

  let hasCapacitor = false;
  let isCapacitor = false;
  let isDevServer = false;
  let isTunnel = false;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const port = window.location.port;
    hasCapacitor = typeof (window as any).Capacitor !== 'undefined';
    isCapacitor = hasCapacitor || (host === 'localhost' && !port);
    isDevServer = host === 'localhost' && !!port;
    isTunnel = host.includes('ngrok') || host.includes('loca.lt');
  }

  // 1. Explicit .env override wins.
  if (envApi) {
    if (isCapacitor && envApi.startsWith('/')) {
      return {
        url: PRODUCTION_API,
        reason: `VITE_API_URL="${envApi}" is relative — Capacitor has no proxy, falling back to production`,
      };
    }
    return { url: envApi, reason: `VITE_API_URL override = ${envApi}` };
  }

  // 2. Auto-detect.
  if (typeof window === 'undefined') {
    return { url: PRODUCTION_API, reason: 'SSR / non-browser context' };
  }
  if (isCapacitor) return { url: PRODUCTION_API, reason: 'Capacitor native app' };
  if (isDevServer || isTunnel) return { url: '/api', reason: 'Dev server / tunnel — Vite proxy' };
  return { url: PRODUCTION_API, reason: 'Production web host' };
}

const resolved = resolveApiUrl();
const API_BASE_URL = resolved.url;

// Assets URL — same explicit-override-first rule. If unset and the
// API ended up at production, assume assets live there too.
let assetsBaseUrl = (import.meta.env.VITE_ASSETS_URL || '').toString().trim();
if (!assetsBaseUrl && API_BASE_URL === PRODUCTION_API) {
  assetsBaseUrl = PRODUCTION_API;
}

console.log('[API] Base URL:', API_BASE_URL, '·', resolved.reason);
console.log('[API] Assets URL:', assetsBaseUrl || '(using relative paths)');

// Token storage
const TOKEN_KEY = 'auth_token';
const GENIUS_TOKEN_KEY = 'genius_token';

// Legacy/Parent Token Helpers
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// Genius/Child Token Helpers
export const getGeniusToken = (): string | null => {
  return localStorage.getItem(GENIUS_TOKEN_KEY);
};

export const setGeniusToken = (token: string): void => {
  localStorage.setItem(GENIUS_TOKEN_KEY, token);
};

export const clearGeniusToken = (): void => {
  localStorage.removeItem(GENIUS_TOKEN_KEY);
};

/**
 * Clear ALL auth tokens - use this for complete logout
 * This ensures no cross-contamination between auth systems
 */
export const clearAllTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GENIUS_TOKEN_KEY);
  console.log('[API] All auth tokens cleared');
};

// API Error class
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  tokenGetter: () => string | null = getToken
): Promise<T> {
  const token = tokenGetter();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Read as text first so we can handle empty bodies and non-JSON error
  // pages (e.g. a 500 HTML page from the proxy, a 204 No Content) without
  // letting the raw "Unexpected end of JSON input" SyntaxError leak to the
  // UI. Anything non-parseable becomes an ApiError carrying the real HTTP
  // status, which call-sites already know how to surface.
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(
          `Server error (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`,
          response.status,
          text,
        );
      }
      return text as unknown as T;
    }
  }

  if (!response.ok) {
    // Broadcast session-replaced event so auth context can show force-logout modal
    if (response.status === 401 && data?.reason === 'session_replaced') {
      window.dispatchEvent(new CustomEvent('session-replaced', {
        detail: { reason: data.reason, message: data.message },
      }));
    }

    throw new ApiError(
      data.message || `Request failed (${response.status}).`,
      response.status,
      data
    );
  }

  return data;
}

// FormData API request (for file uploads)
async function apiFormDataRequest<T>(
  endpoint: string,
  formData: FormData,
  method: string = 'POST',
  tokenGetter: () => string | null = getToken
): Promise<T> {
  const token = tokenGetter();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: formData,
  });

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new ApiError(
          `Server error (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`,
          response.status,
          text,
        );
      }
      return text as unknown as T;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      data.message || `Request failed (${response.status}).`,
      response.status,
      data
    );
  }

  return data;
}

// HTTP method helpers (Parent/Default)
export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number>) => {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, val]) => [key, String(val)])
      ).toString();
      url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    return apiRequest<T>(url, { method: 'GET' });
  },

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  postFormData: <T>(endpoint: string, formData: FormData) =>
    apiFormDataRequest<T>(endpoint, formData, 'POST'),

  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  putFormData: <T>(endpoint: string, formData: FormData) =>
    apiFormDataRequest<T>(endpoint, formData, 'PUT'),

  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
};

// HTTP method helpers (Genius/Child)
export const geniusApi = {
  get: <T>(endpoint: string, params?: Record<string, string | number>) => {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, val]) => [key, String(val)])
      ).toString();
      url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    return apiRequest<T>(url, { method: 'GET' }, getGeniusToken);
  },

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }, getGeniusToken),

  put: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }, getGeniusToken),

  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }, getGeniusToken),
};

// HTTP method helpers (Public - no auth required)
export const publicApi = {
  get: <T>(endpoint: string, params?: Record<string, string | number>) => {
    let url = endpoint;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).map(([key, val]) => [key, String(val)])
      ).toString();
      url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    return apiRequest<T>(url, { method: 'GET' }, () => null);
  },

  post: <T>(endpoint: string, body?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }, () => null),
};

/**
 * Get full URL for assets served from Laravel backend
 * Use this for images like shop images that are stored on the Laravel server
 *
 * @param path - The asset path (e.g., "/aipreneur/shop-image/filename.png")
 * @returns Full URL with assets base or relative path for local dev
 */
export const getAssetUrl = (path: string): string => {
  // If VITE_ASSETS_URL is set, prepend it to the path
  if (assetsBaseUrl) {
    // Remove leading slash from path if assets URL already has trailing slash
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${assetsBaseUrl}${cleanPath}`;
  }
  // Otherwise return relative path (works with Vite proxy in local dev)
  return path;
};

/**
 * Resolve a backend-provided shop image URL into one the WebView can
 * actually load. The Laravel backend stores images under
 * `/storage/shops/<filename>` (a public symlink). When loaded from a
 * Capacitor WebView, the `/storage/...` path is fine over the network,
 * but the same image is also served by a dedicated controller at
 * `/aipreneur/shop-image/<filename>` which sends explicit CORS and
 * cache headers — the WebView's `<img>` loader respects those and
 * Chrome/Vite-proxied dev does not need them. Without this transform
 * the dashboard's `<img src>` and the iso-scene popout bubble break
 * silently inside the APK while working fine in `npm run dev`.
 *
 * Accepts null/undefined for ergonomic chaining from optional backend
 * fields.
 */
export const getShopImageUrl = (imageUrl?: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/storage/shops/')) {
    const filename = imageUrl.split('/storage/shops/').pop();
    if (filename) return getAssetUrl(`/aipreneur/shop-image/${filename}`);
  }
  // Already a full URL or a path the asset resolver can handle.
  return getAssetUrl(imageUrl);
};

/**
 * Update assets base URL at runtime (useful for dynamic configuration)
 */
export const setAssetsBaseUrl = (url: string): void => {
  assetsBaseUrl = url;
  console.log('[API] Assets URL updated to:', url || '(using relative paths)');
};

/**
 * Get current assets base URL
 */
export const getAssetsBaseUrl = (): string => assetsBaseUrl;

export default api;
