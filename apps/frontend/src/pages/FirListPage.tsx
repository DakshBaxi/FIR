import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FirStatus } from '@fir/shared';
import { listFirs } from '../api/fir.api';
import { formatDate, cn } from '../lib/utils';

const statusOptions: Array<{ label: string; value: 'ALL' | FirStatus }> = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Draft', value: FirStatus.DRAFT },
  { label: 'Under review', value: FirStatus.UNDER_REVIEW },
  { label: 'Finalized', value: FirStatus.FINALIZED },
  { label: 'Filed', value: FirStatus.FILED },
];

const statusTone: Record<FirStatus, string> = {
  [FirStatus.DRAFT]: 'bg-amber-50 text-amber-700 border-amber-200',
  [FirStatus.UNDER_REVIEW]: 'bg-sky-50 text-sky-700 border-sky-200',
  [FirStatus.FINALIZED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [FirStatus.FILED]: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function FirListPage() {
  const location = useLocation();
  const [status, setStatus] = useState<'ALL' | FirStatus>('ALL');
  const successMessage = (location.state as { success?: string } | null)?.success;

  const { data, isPending, error } = useQuery({
    queryKey: ['firs', status],
    queryFn: () =>
      listFirs({
        limit: 20,
        status: status === 'ALL' ? undefined : status,
      }),
  });

  const errorMessage =
    (error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ??
    'Unable to load FIR records right now.';

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">FIR Records</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Track drafts, analysis results, and finalized cases</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            This list is already backed by the FIR API. You can use it to verify that station officers are creating records successfully.
          </p>
        </div>

        <Link
          to="/firs/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Create new FIR
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-medium transition',
              status === option.value
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading FIR records...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : data && data.items.length > 0 ? (
        <div className="space-y-4">
          {data.items.map((fir) => (
            <article key={fir.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/firs/${fir.id}`} className="text-lg font-semibold text-slate-900 hover:text-blue-700">
                      {fir.complainantName}
                    </Link>
                    <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', statusTone[fir.status])}>
                      {fir.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    FIR Number: {fir.firNumber ?? 'Pending finalization'} | Filed by {fir.filedBy.fullName} ({fir.filedBy.badgeNumber})
                  </p>
                  <p className="text-sm text-slate-600">
                    {fir.offenceNature ?? 'AI offence summary pending'}
                  </p>
                </div>

                <div className="text-sm text-slate-500 sm:text-right">
                  <p>Created: {formatDate(fir.createdAt)}</p>
                  <p>Location: {fir.incidentLocation ?? 'Not specified'}</p>
                  <Link to={`/firs/${fir.id}`} className="mt-2 inline-block font-medium text-blue-600 hover:text-blue-700">
                    Open draft
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {fir.primaryBnsSections.length > 0 ? (
                  fir.primaryBnsSections.map((section) => (
                    <span key={section} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      BNS {section}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                    Sections will appear after analysis
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No FIR records yet</h2>
          <p className="mt-2 text-sm text-slate-500">Create the first FIR draft to start using the station workflow.</p>
          <Link
            to="/firs/new"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Create the first FIR
          </Link>
        </div>
      )}
    </div>
  );
}
