import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateOfficerSchema, OfficerRole, ROLE_HIERARCHY, hasMinRole, type CreateOfficerInput } from '@fir/shared';
import { createOfficer, deactivateOfficer, listOfficers } from '../api/officer.api';
import { useAuthStore } from '../store/authStore';
import { formatDateTime, cn } from '../lib/utils';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
    hasError ? 'border-red-400' : 'border-slate-300'
  );
}

export function OfficersPage() {
  const queryClient = useQueryClient();
  const officer = useAuthStore((state) => state.officer);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const canView = officer ? hasMinRole(officer.role, OfficerRole.SENIOR_OFFICER) : false;
  const canManage = officer
    ? officer.role === OfficerRole.STATION_ADMIN || officer.role === OfficerRole.SUPER_ADMIN
    : false;
  const availableRoles = officer
    ? Object.values(OfficerRole).filter((role) => ROLE_HIERARCHY[role] < ROLE_HIERARCHY[officer.role])
    : [OfficerRole.OFFICER];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOfficerInput>({
    resolver: zodResolver(CreateOfficerSchema),
    defaultValues: {
      role: OfficerRole.OFFICER,
    },
  });

  const officersQuery = useQuery({
    queryKey: ['officers'],
    queryFn: () => listOfficers({ limit: 50 }),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: createOfficer,
    onSuccess: () => {
      setSubmitError('');
      setSuccessMessage('Officer account created successfully.');
      reset({
        badgeNumber: '',
        fullName: '',
        rank: '',
        role: OfficerRole.OFFICER,
        phone: '',
        email: undefined,
        password: '',
      });
      queryClient.invalidateQueries({ queryKey: ['officers'] });
    },
    onError: (err: unknown) => {
      setSuccessMessage('');
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to create the officer right now.';
      setSubmitError(message);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateOfficer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['officers'] });
    },
  });

  const onSubmit = (data: CreateOfficerInput) => {
    setSubmitError('');
    setSuccessMessage('');
    createMutation.mutate(data);
  };

  if (!canView) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Officer management is available to senior officers and station administrators.
      </div>
    );
  }

  const errorMessage =
    (officersQuery.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ??
    'Unable to load officers right now.';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Officer Management</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Manage station access and active officer accounts</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          The backend officer service is already available. This page exposes the create and list flows directly in the frontend.
        </p>
      </div>

      {canManage && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Add new officer</h2>
            <p className="mt-1 text-sm text-slate-500">Create another account for your station team.</p>
          </div>

          {successMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          {submitError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
              <input {...register('fullName')} className={inputClass(!!errors.fullName)} />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Badge Number</label>
              <input {...register('badgeNumber')} className={inputClass(!!errors.badgeNumber)} />
              {errors.badgeNumber && <p className="mt-1 text-xs text-red-500">{errors.badgeNumber.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Rank</label>
              <input {...register('rank')} className={inputClass(!!errors.rank)} />
              {errors.rank && <p className="mt-1 text-xs text-red-500">{errors.rank.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Role</label>
              <select {...register('role')} className={inputClass(!!errors.role)}>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
              <input {...register('phone')} className={inputClass(!!errors.phone)} />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
              <input
                {...register('email', { setValueAs: normalizeOptionalString })}
                type="email"
                className={inputClass(!!errors.email)}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Temporary Password</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                className={inputClass(!!errors.password)}
              />
              {errors.password ? (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Must include uppercase, lowercase, and a number.</p>
              )}
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createMutation.isPending ? 'Creating officer...' : 'Create officer'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Station officers</h2>
            <p className="mt-1 text-sm text-slate-500">Active and recent accounts for this station.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
            Total: {officersQuery.data?.total ?? 0}
          </div>
        </div>

        {officersQuery.isPending ? (
          <div className="text-sm text-slate-500">Loading officers...</div>
        ) : officersQuery.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : officersQuery.data && officersQuery.data.items.length > 0 ? (
          <div className="space-y-4">
            {officersQuery.data.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{item.fullName}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                        {item.role.replaceAll('_', ' ')}
                      </span>
                      {!item.isActive && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.rank} | {item.badgeNumber}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.email ?? 'No email'} | {item.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Last login: {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : 'No login yet'}
                    </p>
                  </div>

                  {canManage && item.isActive && item.id !== officer?.id && (
                    <button
                      type="button"
                      onClick={() => deactivateMutation.mutate(item.id)}
                      disabled={deactivateMutation.isPending}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-sm text-slate-500">No officers found for this station yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
