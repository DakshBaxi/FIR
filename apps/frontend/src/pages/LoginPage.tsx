import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@fir/shared';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const registrationState = location.state as { registrationSuccess?: string; badgeNumber?: string } | null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      badgeNumber: registrationState?.badgeNumber ?? '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setError('');
    try {
      await login(data);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Login failed. Please check your credentials.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚔</div>
          <h1 className="text-2xl font-bold text-slate-900">FIR Management System</h1>
          <p className="text-slate-500 mt-1 text-sm">Indian Police Department</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-lg font-semibold mb-6">Officer Sign In</h2>

          {registrationState?.registrationSuccess && (
            <div className="mb-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              {registrationState.registrationSuccess}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Badge Number
              </label>
              <input
                {...register('badgeNumber')}
                placeholder="e.g. SI/1234"
                autoComplete="username"
                className={cn(
                  'w-full h-11 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.badgeNumber ? 'border-red-400' : 'border-slate-300'
                )}
              />
              {errors.badgeNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.badgeNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                className={cn(
                  'w-full h-11 px-3 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.password ? 'border-red-400' : 'border-slate-300'
                )}
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-md text-sm transition-colors"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              New station?{' '}
              <Link to="/register" className="text-blue-600 hover:underline font-medium">
                Register your department
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
