import api from './api';
import type { AuthResponse, UserDto } from '../types';

export const authService = {
  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', { username, password });
    localStorage.setItem('v3_access_token', res.data.token);
    localStorage.setItem('v3_refresh_token', res.data.refreshToken);
    return res.data;
  },

  async getMe(): Promise<UserDto> {
    const res = await api.get<UserDto>('/auth/me');
    return res.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  },

  logout() {
    localStorage.removeItem('v3_access_token');
    localStorage.removeItem('v3_refresh_token');
    api.post('/auth/logout').catch(() => {});
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('v3_access_token');
  },
};
