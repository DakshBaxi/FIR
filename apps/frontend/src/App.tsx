import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthSessionManager } from './components/auth/AuthSessionManager';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionManager />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
