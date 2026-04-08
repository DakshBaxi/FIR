import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-slate-200">404</h1>
        <p className="text-xl text-slate-600 mt-2">Page not found</p>
        <Link to="/dashboard" className="mt-6 inline-block text-blue-600 hover:underline">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
