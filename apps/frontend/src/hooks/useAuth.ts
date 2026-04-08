import { useAuthStore } from '../store/authStore';
import { login as loginApi, logout as logoutApi } from '../api/auth.api';
import type { LoginInput } from '@fir/shared';

export function useAuth() {
  const { officer, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  async function login(data: LoginInput) {
    const result = await loginApi(data);
    setAuth(result.accessToken, result.officer);
    return result;
  }

  async function logout() {
    try {
      await logoutApi();
    } finally {
      clearAuth();
    }
  }

  return { officer, isAuthenticated, login, logout };
}
