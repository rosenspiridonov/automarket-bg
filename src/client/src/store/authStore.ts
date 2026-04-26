import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, UserInfo } from '../types/auth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  setAuth: (response: AuthResponse) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setAuth: (response: AuthResponse) =>
        set({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
          isAuthenticated: true,
        }),
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
