import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import api from '../utils/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    password: string;
    name?: string;
    referralCode?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (usernameOrEmail, password) => {
        set({ isLoading: true });
        try {
          // 后端 /auth/login 的 body 字段仍用 email 字段名，但实际接受 username/email/phone
          const data: any = await api.post('/auth/login', { email: usernameOrEmail, password });
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
