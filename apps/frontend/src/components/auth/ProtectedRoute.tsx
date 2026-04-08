import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute() {
  const isAuthInitializing = useAuthStore((s) => s.isAuthInitializing);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Restoring your session...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
