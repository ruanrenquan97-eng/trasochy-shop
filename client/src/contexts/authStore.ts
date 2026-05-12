import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email?: string; password: string; name: string; phone?: string; captchaCode?: string; captchaToken?: string; referralCode?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data: any = await api.post('/auth/login', { email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const data: any = await api.post('/auth/register', formData);
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      refreshUser: async () => {
        if (!get().token) return;
        try {
          const user: any = await api.get('/auth/me');
          set({ user });
        } catch {
          get().logout();
        }
      },
    }),
    { name: 'auth-storage', partialize: (state) => ({ token: state.token, user: state.user }) }
  )
);
