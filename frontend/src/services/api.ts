import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('v3_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Only attempt refresh on 401 Unauthorized (expired token), not 403 Forbidden
    if (error.response?.status === 401 && original && !original._retry && original.url !== '/auth/login' && original.url !== '/auth/refresh') {
      original._retry = true;
      const refreshToken = localStorage.getItem('v3_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newToken = res.data.token;
          const newRefreshToken = res.data.refreshToken;
          localStorage.setItem('v3_access_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('v3_refresh_token', newRefreshToken);
          }
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('v3_access_token');
          localStorage.removeItem('v3_refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('v3_access_token');
        localStorage.removeItem('v3_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
