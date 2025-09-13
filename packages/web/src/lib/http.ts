import axios from 'axios';
import { getToken, clearToken, isTokenValid } from './token';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach Authorization on each request
http.interceptors.request.use((config) => {
  const token = getToken();
  if (isTokenValid(token)) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      // Avoid circular import with router; use location so we always land on login
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace(`/login?next=${next}`);
      return;
    }
    return Promise.reject(err);
  }
);
