import { useEffect } from 'react';
import { refreshSession } from '../../api/auth.api';
import { useAuthStore } from '../../store/authStore';

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export function AuthSessionManager() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuthInitializing = useAuthStore((state) => state.setAuthInitializing);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const session = await refreshSession();
        if (!isMounted) return;
        setAuth(session.accessToken, session.officer);
      } catch {
        if (!isMounted) return;
        clearAuth();
      } finally {
        if (isMounted) {
          setAuthInitializing(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, [clearAuth, setAuth, setAuthInitializing]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const intervalId = window.setInterval(async () => {
      try {
        const session = await refreshSession();
        setAuth(session.accessToken, session.officer);
      } catch {
        clearAuth();
        window.location.href = '/login';
      }
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [clearAuth, isAuthenticated, setAuth]);

  return null;
}
