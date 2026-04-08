import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateStationSchema, type CreateStationInput } from '@fir/shared';
import { registerStation } from '../api/station.api';
import { cn } from '../lib/utils';

const RegisterStationFormSchema = CreateStationSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm the password'),
}).refine((data) => data.adminPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterStationFormInput = z.infer<typeof RegisterStationFormSchema>;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeStationCode(value: unknown) {
  if (typeof value !== 'string') return value;
  return value.trim().toUpperCase();
}

function normalizeOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function fieldClassName(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
    hasError ? 'border-red-400' : 'border-slate-300'
  );
}

export function RegisterStationPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterStationFormInput>({
    resolver: zodResolver(RegisterStationFormSchema),
  });

  const onSubmit = async (data: RegisterStationFormInput) => {
    setSubmitError('');

    const { confirmPassword: _confirmPassword, ...stationInput } = data;

    try {
      await registerStation(stationInput as CreateStationInput);
      navigate('/login', {
        state: {
          registrationSuccess: 'Station registered successfully. Sign in with the station admin badge number.',
          badgeNumber: stationInput.adminBadgeNumber,
        },
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Station registration failed. Please review the details and try again.';
      setSubmitError(message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1fr_1.15fr]">
        <section className="flex flex-col justify-between bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.4),_transparent_45%),linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(2,6,23,1))] px-6 py-10 sm:px-10 lg:px-12">
          <div>
            <p className="inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">
              Station Onboarding
            </p>
            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Register your police station once and start filing FIRs faster.
              </h1>
              <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">
                Create the station profile, assign the first station admin, and prepare your department for secure FIR drafting.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Verified Station Setup</p>
              <p className="mt-2 text-sm text-slate-300">Store core station identity, region, and operational contact details.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Admin Access</p>
              <p className="mt-2 text-sm text-slate-300">Create the first station admin who can manage officers after sign-in.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Ready for FIR Workflows</p>
              <p className="mt-2 text-sm text-slate-300">Move straight into the dashboard once registration is complete.</p>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Register Station</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Department details and first admin</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fill in your station information exactly as it should appear in FIR records and administrative access.
                </p>
              </div>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                Back to sign in
              </Link>
            </div>

            {submitError && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Station information</h3>
                  <p className="mt-1 text-sm text-slate-500">Core identity and official location for this station.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Name</label>
                    <input
                      {...register('stationName')}
                      placeholder="e.g. Shivaji Nagar Police Station"
                      className={fieldClassName(!!errors.stationName)}
                    />
                    {errors.stationName && <p className="mt-1 text-xs text-red-500">{errors.stationName.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Code</label>
                    <input
                      {...register('stationCode', { setValueAs: normalizeStationCode })}
                      placeholder="e.g. PS/PUNE/001"
                      className={fieldClassName(!!errors.stationCode)}
                    />
                    {errors.stationCode && <p className="mt-1 text-xs text-red-500">{errors.stationCode.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
                    <input
                      {...register('district')}
                      placeholder="e.g. Pune"
                      className={fieldClassName(!!errors.district)}
                    />
                    {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
                    <input
                      {...register('state')}
                      placeholder="e.g. Maharashtra"
                      className={fieldClassName(!!errors.state)}
                    />
                    {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                  <textarea
                    {...register('address')}
                    rows={3}
                    placeholder="Full station address"
                    className={fieldClassName(!!errors.address)}
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
                </div>
              </div>

              <div className="space-y-5 border-t border-slate-200 pt-8">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Contact and jurisdiction</h3>
                  <p className="mt-1 text-sm text-slate-500">Optional communication and geographic coverage details.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Phone</label>
                    <input
                      {...register('phone', { setValueAs: normalizeOptionalString })}
                      placeholder="Optional"
                      className={fieldClassName(!!errors.phone)}
                    />
                    {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Email</label>
                    <input
                      {...register('email', { setValueAs: normalizeOptionalString })}
                      type="email"
                      placeholder="Optional"
                      className={fieldClassName(!!errors.email)}
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Latitude</label>
                    <input
                      {...register('latitude', { setValueAs: normalizeOptionalNumber })}
                      type="number"
                      step="any"
                      placeholder="Optional"
                      className={fieldClassName(!!errors.latitude)}
                    />
                    {errors.latitude && <p className="mt-1 text-xs text-red-500">{errors.latitude.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Longitude</label>
                    <input
                      {...register('longitude', { setValueAs: normalizeOptionalNumber })}
                      type="number"
                      step="any"
                      placeholder="Optional"
                      className={fieldClassName(!!errors.longitude)}
                    />
                    {errors.longitude && <p className="mt-1 text-xs text-red-500">{errors.longitude.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jurisdiction</label>
                  <textarea
                    {...register('jurisdiction', { setValueAs: normalizeOptionalString })}
                    rows={3}
                    placeholder="Optional details about covered regions or operational limits"
                    className={fieldClassName(!!errors.jurisdiction)}
                  />
                  {errors.jurisdiction && <p className="mt-1 text-xs text-red-500">{errors.jurisdiction.message}</p>}
                </div>
              </div>

              <div className="space-y-5 border-t border-slate-200 pt-8">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">First admin officer</h3>
                  <p className="mt-1 text-sm text-slate-500">This officer will be created as the initial station administrator.</p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Officer Full Name</label>
                    <input
                      {...register('adminOfficerName')}
                      placeholder="e.g. Inspector Priya Sharma"
                      className={fieldClassName(!!errors.adminOfficerName)}
                    />
                    {errors.adminOfficerName && <p className="mt-1 text-xs text-red-500">{errors.adminOfficerName.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Badge Number</label>
                    <input
                      {...register('adminBadgeNumber')}
                      placeholder="e.g. PI/2041"
                      className={fieldClassName(!!errors.adminBadgeNumber)}
                    />
                    {errors.adminBadgeNumber && <p className="mt-1 text-xs text-red-500">{errors.adminBadgeNumber.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Rank</label>
                    <input
                      {...register('adminRank')}
                      placeholder="e.g. Police Inspector"
                      className={fieldClassName(!!errors.adminRank)}
                    />
                    {errors.adminRank && <p className="mt-1 text-xs text-red-500">{errors.adminRank.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                    <input
                      {...register('adminPhone')}
                      placeholder="Required"
                      className={fieldClassName(!!errors.adminPhone)}
                    />
                    {errors.adminPhone && <p className="mt-1 text-xs text-red-500">{errors.adminPhone.message}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                    <input
                      {...register('adminEmail', { setValueAs: normalizeOptionalString })}
                      type="email"
                      placeholder="Optional"
                      className={fieldClassName(!!errors.adminEmail)}
                    />
                    {errors.adminEmail && <p className="mt-1 text-xs text-red-500">{errors.adminEmail.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                    <input
                      {...register('adminPassword')}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters"
                      className={fieldClassName(!!errors.adminPassword)}
                    />
                    {errors.adminPassword && <p className="mt-1 text-xs text-red-500">{errors.adminPassword.message}</p>}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
                    <input
                      {...register('confirmPassword')}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat the password"
                      className={fieldClassName(!!errors.confirmPassword)}
                    />
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-500">
                  After registration, use the admin badge number and password to sign in.
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Registering station...' : 'Register station'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
