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

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
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

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on unauthorized
      localStorage.removeItem('gov_valuation_token');
      localStorage.removeItem('gov_valuation_user');
    }
    return Promise.reject(error);
  }
);

export default api;
