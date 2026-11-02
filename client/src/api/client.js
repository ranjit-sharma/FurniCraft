import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  try {
    const lang = localStorage.getItem('furnicraft_lang') || 'en';
    config.headers['Accept-Language'] = lang;
    config.headers['x-custom-lang'] = lang;
  } catch {
    // ignore localStorage error
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    // If validation error details are present, extract the exact field error
    if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
      const detailStr = error.response.data.details
        .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        .join(', ');
      if (detailStr && !message.includes(detailStr)) {
        message = `${message} — ${detailStr}`;
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
