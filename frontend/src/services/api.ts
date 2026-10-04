import axios from 'axios';

/**
 * API base URL:
 * - Production build: `frontend/.env.production` → Render
 * - Local: Vite proxies `/api` → backend (see vite.config.ts)
 * - Vercel also proxies `/api/*` to Render (see root vercel.json) as a fallback
 */
function resolveApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw || raw === '/') return '/api';
  return raw.replace(/\/+$/, '');
}

export const AUTH_EXPIRED_EVENT = 'gov_valuation_auth_expired';

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gov_valuation_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.error;
    const url = String(error.config?.url || '');
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/register');

    // Only expire the session on real auth failures — not on every 401 during cold starts
    // or missing-header races after a prior clear. Keep form state intact until AuthContext redirects.
    if (
      status === 401 &&
      !isAuthCall &&
      (code === 'TOKEN_EXPIRED_OR_INVALID' || code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED')
    ) {
      const hadToken = Boolean(localStorage.getItem('gov_valuation_token'));
      if (hadToken) {
        localStorage.removeItem('gov_valuation_token');
        localStorage.removeItem('gov_valuation_user');
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, {
          detail: { message: error.response?.data?.message || 'Your session expired. Please sign in again.' },
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
