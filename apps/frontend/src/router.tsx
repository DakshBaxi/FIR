import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterStationPage } from './pages/RegisterStationPage';
import { DashboardPage } from './pages/DashboardPage';
import { FirListPage } from './pages/FirListPage';
import { NewFirPage } from './pages/NewFirPage';
import { FirDetailPage } from './pages/FirDetailPage';
import { StationPage } from './pages/StationPage';
import { OfficersPage } from './pages/OfficersPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterStationPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'firs', element: <FirListPage /> },
          { path: 'firs/new', element: <NewFirPage /> },
          { path: 'firs/:id', element: <FirDetailPage /> },
          { path: 'station', element: <StationPage /> },
          { path: 'officers', element: <OfficersPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
