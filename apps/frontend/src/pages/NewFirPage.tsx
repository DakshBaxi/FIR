import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CreateFirSchema, type CreateFirInput } from '@fir/shared';
import { createFir } from '../api/fir.api';
import { cn } from '../lib/utils';

const complainantIdOptions = ['AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE', 'OTHER'] as const;
const firCreationStages = [
  {
    title: 'Create draft record',
    detail: 'The backend stores the complainant and incident details as a draft FIR in the database.',
    startAt: 0,
  },
  {
    title: 'Extract people and facts',
    detail: 'The AI reads the incident story to identify accused, victims, witnesses, place, time, and property involved.',
    startAt: 4,
  },
  {
    title: 'Match legal sections',
    detail: 'Relevant BNS and IPC sections are retrieved and checked against the extracted facts.',
    startAt: 18,
  },
  {
    title: 'Draft formal FIR content',
    detail: 'The AI prepares the structured FIR draft, complainant statement, gist, and officer notes.',
    startAt: 36,
  },
  {
    title: 'Save analysis results',
    detail: 'The analyzed sections, extracted entities, and generated draft are written back to the FIR record.',
    startAt: 54,
  },
] as const;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function toIsoDateTime(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  return new Date(value).toISOString();
}

function inputClass(hasError: boolean) {
  return cn(
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500',
    hasError ? 'border-red-400' : 'border-slate-300'
  );
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function NewFirPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFirInput>({
    resolver: zodResolver(CreateFirSchema),
  });

  const createMutation = useMutation({
    mutationFn: createFir,
    onSuccess: (fir) => {
      navigate(`/firs/${fir.id}`, {
        state: {
          success: `FIR draft created for ${fir.complainantName}. Review the AI-generated draft before finalization.`,
        },
      });
    },
    onError: (err: unknown) => {
      setSubmittedAt(null);
      setElapsedSeconds(0);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Unable to create FIR right now. Please review the details and try again.';
      setSubmitError(message);
    },
  });

  useEffect(() => {
    if (!createMutation.isPending || submittedAt === null) {
      return;
    }

    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - submittedAt) / 1000)));
    };

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [createMutation.isPending, submittedAt]);

  const currentStageIndex = useMemo(() => {
    for (let index = firCreationStages.length - 1; index >= 0; index -= 1) {
      if (elapsedSeconds >= firCreationStages[index].startAt) {
        return index;
      }
    }
    return 0;
  }, [elapsedSeconds]);

  const progressWidth = useMemo(() => {
    const ratio = Math.min(0.94, 0.18 + elapsedSeconds / 90);
    return `${Math.round(ratio * 100)}%`;
  }, [elapsedSeconds]);

  const onSubmit = (data: CreateFirInput) => {
    setSubmitError('');
    setSubmittedAt(Date.now());
    setElapsedSeconds(0);
    createMutation.mutate(data);
  };

  return (
    <div className="relative mx-auto max-w-5xl">
      {createMutation.isPending && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[28px] bg-slate-950/70 p-4 backdrop-blur-md sm:p-6">
          <div className="w-full max-w-3xl rounded-[30px] border border-white/10 bg-slate-950/95 px-6 py-7 text-white shadow-2xl sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="lg:w-[280px]">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/15">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200/30 border-t-blue-300" />
                </div>

                <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">Creating FIR</p>
                <h2 className="mt-2 text-2xl font-bold leading-tight">The FIR is being built step by step</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Your draft is not stuck. The local AI pipeline is processing the incident, which can take a while on slower systems.
                </p>

                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-300">Elapsed time</span>
                    <span className="font-semibold text-white">{formatElapsed(elapsedSeconds)}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 transition-[width] duration-700"
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    This bar shows estimated pipeline progress. AI-heavy steps can stay active for longer depending on local model speed.
                  </p>
                </div>
              </div>

              <div className="flex-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Current task</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{firCreationStages[currentStageIndex].title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {firCreationStages[currentStageIndex].detail}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {firCreationStages.map((stage, index) => {
                    const isComplete = index < currentStageIndex;
                    const isActive = index === currentStageIndex;

                    return (
                      <div
                        key={stage.title}
                        className={cn(
                          'rounded-2xl border px-4 py-3 transition',
                          isActive
                            ? 'border-blue-400/40 bg-blue-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.12)]'
                            : isComplete
                              ? 'border-emerald-400/25 bg-emerald-500/10'
                              : 'border-white/10 bg-white/[0.04]'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                              isActive
                                ? 'border-blue-300/60 bg-blue-400/20 text-blue-100'
                                : isComplete
                                  ? 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100'
                                  : 'border-white/15 bg-white/5 text-slate-400'
                            )}
                          >
                            {isComplete ? '✓' : index + 1}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-white">{stage.title}</p>
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  isActive ? 'text-blue-200' : isComplete ? 'text-emerald-200' : 'text-slate-400'
                                )}
                              >
                                {isActive ? 'In progress' : isComplete ? 'Completed' : 'Waiting'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm leading-5 text-slate-300">{stage.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
                  Keep this page open while the FIR is being analyzed. The slowest part is usually the local AI reading the story and drafting the formal FIR.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">New FIR</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Capture the incident and start AI analysis</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Once this draft is submitted, the backend will create the FIR record and send the incident story for legal section analysis.
          </p>
        </div>

        <Link
          to="/firs"
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View FIR records
        </Link>
      </div>

      <div className={cn(
        'rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition sm:p-8',
        createMutation.isPending && 'pointer-events-none select-none opacity-60'
      )}>
        {submitError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Complainant details</h2>
              <p className="mt-1 text-sm text-slate-500">Basic information for the person reporting the incident.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Complainant Name</label>
                <input
                  {...register('complainantName')}
                  placeholder="e.g. Ramesh Patil"
                  className={inputClass(!!errors.complainantName)}
                />
                {errors.complainantName && <p className="mt-1 text-xs text-red-500">{errors.complainantName.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</label>
                <input
                  {...register('complainantPhone', { setValueAs: normalizeOptionalString })}
                  placeholder="Optional"
                  className={inputClass(!!errors.complainantPhone)}
                />
                {errors.complainantPhone && <p className="mt-1 text-xs text-red-500">{errors.complainantPhone.message}</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  {...register('complainantAddress', { setValueAs: normalizeOptionalString })}
                  rows={2}
                  placeholder="Optional"
                  className={inputClass(!!errors.complainantAddress)}
                />
                {errors.complainantAddress && <p className="mt-1 text-xs text-red-500">{errors.complainantAddress.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ID Type</label>
                <select
                  {...register('complainantIdType', {
                    setValueAs: (value) => (value === '' ? undefined : value),
                  })}
                  className={inputClass(!!errors.complainantIdType)}
                >
                  <option value="">Select ID type</option>
                  {complainantIdOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
                {errors.complainantIdType && <p className="mt-1 text-xs text-red-500">{errors.complainantIdType.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">ID Number</label>
                <input
                  {...register('complainantIdNumber', { setValueAs: normalizeOptionalString })}
                  placeholder="Optional"
                  className={inputClass(!!errors.complainantIdNumber)}
                />
                {errors.complainantIdNumber && <p className="mt-1 text-xs text-red-500">{errors.complainantIdNumber.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-5 border-t border-slate-200 pt-8">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Incident details</h2>
              <p className="mt-1 text-sm text-slate-500">Describe the event clearly so the AI service can identify the likely offences and people involved.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Incident Date and Time</label>
                <input
                  {...register('incidentDatetime', { setValueAs: toIsoDateTime })}
                  type="datetime-local"
                  className={inputClass(!!errors.incidentDatetime)}
                />
                {errors.incidentDatetime && <p className="mt-1 text-xs text-red-500">{errors.incidentDatetime.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Incident Location</label>
                <input
                  {...register('incidentLocation', { setValueAs: normalizeOptionalString })}
                  placeholder="Village, road, landmark, area"
                  className={inputClass(!!errors.incidentLocation)}
                />
                {errors.incidentLocation && <p className="mt-1 text-xs text-red-500">{errors.incidentLocation.message}</p>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Incident Description</label>
              <textarea
                {...register('incidentDescription')}
                rows={10}
                placeholder="Describe the incident story in detail. Include what happened, who was involved, when it happened, and any harm or loss caused."
                className={inputClass(!!errors.incidentDescription)}
              />
              {errors.incidentDescription ? (
                <p className="mt-1 text-xs text-red-500">{errors.incidentDescription.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Minimum 50 characters. More context improves the AI-generated analysis.</p>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Draft status will be created first, then the AI service will enrich the FIR with sections and extracted entities.
            </p>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createMutation.isPending ? 'Creating FIR draft...' : 'Create FIR draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
