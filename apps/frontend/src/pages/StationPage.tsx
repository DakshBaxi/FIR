import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UpdateStationSchema, type UpdateStationInput } from '@fir/shared';
import { getMyStation, updateMyStation } from '../api/station.api';
import { cn } from '../lib/utils';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
    hasError ? 'border-red-400' : 'border-slate-300'
  );
}

export function StationPage() {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const stationQuery = useQuery({
    queryKey: ['station'],
    queryFn: getMyStation,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateStationInput>({
    resolver: zodResolver(UpdateStationSchema),
  });

  useEffect(() => {
    if (!stationQuery.data) return;

    reset({
      stationName: stationQuery.data.stationName,
      district: stationQuery.data.district,
      state: stationQuery.data.state,
      address: stationQuery.data.address,
      phone: stationQuery.data.phone ?? undefined,
      email: stationQuery.data.email ?? undefined,
      jurisdiction: stationQuery.data.jurisdiction ?? undefined,
      latitude:
        stationQuery.data.latitude !== null && stationQuery.data.latitude !== undefined
          ? Number(stationQuery.data.latitude)
          : undefined,
      longitude:
        stationQuery.data.longitude !== null && stationQuery.data.longitude !== undefined
          ? Number(stationQuery.data.longitude)
          : undefined,
    });
  }, [stationQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: updateMyStation,
    onSuccess: () => {
      setSubmitError('');
      setSuccessMessage('Station details updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['station'] });
    },
    onError: (err: unknown) => {
      setSuccessMessage('');
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to update station details right now.';
      setSubmitError(message);
    },
  });

  const onSubmit = (data: UpdateStationInput) => {
    setSubmitError('');
    setSuccessMessage('');
    updateMutation.mutate(data);
  };

  const errorMessage =
    (stationQuery.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ??
    'Unable to load station details.';

  if (stationQuery.isPending) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading station details...
      </div>
    );
  }

  if (stationQuery.error || !stationQuery.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  const station = stationQuery.data;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Station Details</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{station.stationName}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Station code: {station.stationCode} | Officers: {station._count?.officers ?? 0} | FIRs: {station._count?.firs ?? 0}
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Name</label>
              <input {...register('stationName')} className={inputClass(!!errors.stationName)} />
              {errors.stationName && <p className="mt-1 text-xs text-red-500">{errors.stationName.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Station Code</label>
              <input value={station.stationCode} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
              <input {...register('district')} className={inputClass(!!errors.district)} />
              {errors.district && <p className="mt-1 text-xs text-red-500">{errors.district.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
              <input {...register('state')} className={inputClass(!!errors.state)} />
              {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
            <textarea {...register('address')} rows={3} className={inputClass(!!errors.address)} />
            {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
              <input
                {...register('phone', { setValueAs: normalizeOptionalString })}
                className={inputClass(!!errors.phone)}
              />
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
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Jurisdiction</label>
            <textarea
              {...register('jurisdiction', { setValueAs: normalizeOptionalString })}
              rows={3}
              className={inputClass(!!errors.jurisdiction)}
            />
            {errors.jurisdiction && <p className="mt-1 text-xs text-red-500">{errors.jurisdiction.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Latitude</label>
              <input
                {...register('latitude', { setValueAs: normalizeOptionalNumber })}
                type="number"
                step="any"
                className={inputClass(!!errors.latitude)}
              />
              {errors.latitude && <p className="mt-1 text-xs text-red-500">{errors.latitude.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Longitude</label>
              <input
                {...register('longitude', { setValueAs: normalizeOptionalNumber })}
                type="number"
                step="any"
                className={inputClass(!!errors.longitude)}
              />
              {errors.longitude && <p className="mt-1 text-xs text-red-500">{errors.longitude.message}</p>}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-6">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving changes...' : 'Save station details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
