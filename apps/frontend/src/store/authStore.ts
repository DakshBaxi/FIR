import { create } from 'zustand';
import type { OfficerRole } from '@fir/shared';

export interface OfficerInfo {
  id: string;
  badgeNumber: string;
  fullName: string;
  rank: string;
  role: OfficerRole;
  stationId: string;
  stationName: string;
  stationCode: string;
}

interface AuthState {
  accessToken: string | null;
  officer: OfficerInfo | null;
  isAuthenticated: boolean;
  isAuthInitializing: boolean;
  setAuth: (token: string, officer: OfficerInfo) => void;
  setAccessToken: (token: string) => void;
  setAuthInitializing: (value: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  officer: null,
  isAuthenticated: false,
  isAuthInitializing: true,
  setAuth: (accessToken, officer) =>
    set({ accessToken, officer, isAuthenticated: true, isAuthInitializing: false }),
  setAccessToken: (accessToken) =>
    set({ accessToken }),
  setAuthInitializing: (isAuthInitializing) =>
    set({ isAuthInitializing }),
  clearAuth: () =>
    set({ accessToken: null, officer: null, isAuthenticated: false, isAuthInitializing: false }),
}));
