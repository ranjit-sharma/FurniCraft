import axios from 'axios';
import { translations } from '../locales/translations';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  timeout: 30000, // phones on site networks can hang forever without this
  headers: {
    'Content-Type': 'application/json',
  },
});

const getLang = () => {
  try {
    return localStorage.getItem('furnicraft_lang') || 'en';
  } catch {
    return 'en';
  }
};

/** User-facing error message in the current language (falls back to English). */
export const errorText = (key) => (translations[getLang()] || translations.en).errors?.[key] || translations.en.errors[key];

/** Error thrown by every API call: `message` is safe to show to the user as-is. */
export class ApiError extends Error {
  constructor(message, { status = 0, details = null, kind = 'server' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status; // HTTP status, 0 when the server was never reached
    this.details = details; // field-level validation errors, if any
    this.kind = kind; // 'offline' | 'network' | 'timeout' | 'session' | 'client' | 'server'
  }
}

// Endpoints where a 401 means "wrong credentials / no session yet", not "your session expired".
const AUTH_PATHS = /\/auth\/(login|me|register|send-registration-otp|forgot-password|verify-reset-otp|reset-password)/;

export const SESSION_EXPIRED_EVENT = 'furnicraft:session-expired';

/** Turn an axios error into an ApiError with a message a site worker can understand. */
export const toApiError = (error) => {
  const res = error.response;

  if (!res) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError(errorText('timeout'), { kind: 'timeout' });
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return new ApiError(errorText('offline'), { kind: 'offline' });
    }
    return new ApiError(errorText('network'), { kind: 'network' });
  }

  const { status } = res;
  const serverMessage = res.data?.message || res.data?.error;
  const details = Array.isArray(res.data?.details) ? res.data.details : null;

  if (status === 401 && !AUTH_PATHS.test(error.config?.url || '')) {
    return new ApiError(errorText('sessionExpired'), { status, kind: 'session' });
  }
  if (status === 429) return new ApiError(errorText('tooMany'), { status, kind: 'client' });
  if (status === 503) return new ApiError(errorText('unavailable'), { status, kind: 'server' });
  if (status >= 500) return new ApiError(errorText('server'), { status, kind: 'server' });
  if (status === 404 && (!serverMessage || serverMessage.startsWith('Endpoint not found'))) {
    return new ApiError(errorText('notFound'), { status, kind: 'client' });
  }
  if (status === 403 && !serverMessage) return new ApiError(errorText('forbidden'), { status, kind: 'client' });

  // Other 4xx: the server wrote these for users (e.g. "Invalid email or password"); add field details if missing.
  let message = serverMessage || errorText('server');
  if (details) {
    const detailStr = details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join(', ');
    if (detailStr && !message.includes(detailStr)) message = `${message} — ${detailStr}`;
  }
  return new ApiError(message, { status, details, kind: 'client' });
};

api.interceptors.request.use((config) => {
  const lang = getLang();
  config.headers['Accept-Language'] = lang;
  config.headers['x-custom-lang'] = lang;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const apiError = toApiError(error);
    if (apiError.kind === 'session') {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: apiError.message }));
    }
    return Promise.reject(apiError);
  }
);

export default api;
