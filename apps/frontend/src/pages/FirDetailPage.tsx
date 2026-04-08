import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import DOMPurify from 'dompurify';
import { AlertTriangle, Download, FileCheck2, FileText, Save, ShieldCheck } from 'lucide-react';
import { FirStatus } from '@fir/shared';
import { finalizeFir, getFir, type FirAnalysisPayload, type FirAnalysisPerson, type FirRecord, updateFir } from '../api/fir.api';
import { useAuthStore } from '../store/authStore';
import { cn, formatDateTime } from '../lib/utils';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function paragraphize(value: string) {
  return value
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function bulletList(items: string[]) {
  if (items.length === 0) return '<p>Not available.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function formatPeopleForHtml(people: FirAnalysisPerson[] | undefined, emptyText: string) {
  if (!people || people.length === 0) return [emptyText];

  return people.map((person, index) => {
    const details = [
      person.name,
      person.age ? `Age ${person.age}` : null,
      person.address ?? null,
      person.phone ?? null,
      person.physical_description ?? null,
    ].filter(Boolean);

    return `${index + 1}. ${details.join(' | ')}`;
  });
}

function buildGeneratedFirHtml(fir: FirRecord | undefined) {
  if (!fir) {
    return '<p>FIR draft content is unavailable.</p>';
  }

  const analysis = fir.aiAnalysisRaw as FirAnalysisPayload | undefined;
  const bnsSections = analysis?.sections?.primary_bns_sections?.map(
    (section) => `BNS ${section.section} - ${section.title}`
  ) ?? fir.primaryBnsSections.map((section) => `BNS ${section}`);
  const ipcSections = analysis?.sections?.primary_ipc_sections?.map(
    (section) => `IPC ${section.section} - ${section.title}`
  ) ?? fir.primaryIpcSections.map((section) => `IPC ${section}`);
  const accused = formatPeopleForHtml(analysis?.entities?.accused_persons, 'No accused details recorded.');
  const victims = formatPeopleForHtml(analysis?.entities?.victims, 'No victim details recorded.');
  const witnesses = formatPeopleForHtml(analysis?.entities?.witnesses, 'No witness details recorded.');

  return [
    '<h1>FIRST INFORMATION REPORT</h1>',
    '<p><strong>Draft FIR - Generated for officer review</strong></p>',
    `<p><strong>FIR Number:</strong> ${escapeHtml(fir.firNumber ?? '[Pending finalization]')}</p>`,
    `<p><strong>Police Station:</strong> ${escapeHtml(fir.station.stationName)} (${escapeHtml(fir.station.stationCode)}), ${escapeHtml(fir.station.district)}, ${escapeHtml(fir.station.state)}</p>`,
    `<p><strong>Date of Report:</strong> ${escapeHtml(formatDateTime(fir.createdAt))}</p>`,
    '<h2>1. Applicable Sections</h2>',
    bulletList([...bnsSections, ...ipcSections]),
    '<h2>2. Complainant Details</h2>',
    paragraphize([
      `Name: ${fir.complainantName}`,
      fir.complainantAddress ? `Address: ${fir.complainantAddress}` : null,
      fir.complainantPhone ? `Phone: ${fir.complainantPhone}` : null,
      fir.complainantIdType && fir.complainantIdNumber ? `Identity: ${fir.complainantIdType} - ${fir.complainantIdNumber}` : null,
    ].filter(Boolean).join('\n')),
    '<h2>3. Occurrence of Offence</h2>',
    paragraphize([
      `Incident Date and Time: ${fir.incidentDatetime ? formatDateTime(fir.incidentDatetime) : 'Not specified'}`,
      `Location: ${fir.incidentLocation ?? 'Not specified'}`,
      `Nature of Offence: ${fir.offenceNature ?? 'Under review'}`,
      analysis?.entities?.property_involved ? `Property Involved: ${analysis.entities.property_involved}` : null,
    ].filter(Boolean).join('\n')),
    '<h2>4. Complainant Statement</h2>',
    paragraphize(analysis?.fir_draft?.complainant_statement_formal ?? fir.incidentDescription),
    '<h2>5. Gist of FIR</h2>',
    paragraphize(analysis?.fir_draft?.gist_of_fir ?? fir.incidentDescription),
    '<h2>6. Full Incident Narrative</h2>',
    paragraphize(fir.incidentDescription),
    '<h2>7. Accused Details</h2>',
    bulletList(accused),
    '<h2>8. Victim Details</h2>',
    bulletList(victims),
    '<h2>9. Witness Details</h2>',
    bulletList(witnesses),
    '<h2>10. Action Taken</h2>',
    paragraphize(analysis?.fir_draft?.action_taken ?? 'Action taken details are under review.'),
    '<h2>11. Investigating Officer Notes</h2>',
    paragraphize(analysis?.fir_draft?.investigating_officer_notes ?? 'Initial investigation notes are under review.'),
    '<h2>12. Reporting Officer</h2>',
    paragraphize(`Prepared by ${fir.filedBy.fullName}, ${fir.filedBy.rank} (${fir.filedBy.badgeNumber}) for review and finalization.`),
  ].join('');
}

function ensureEditorContent(fir: FirRecord | undefined) {
  if (fir?.firContentHtml && fir.firContentHtml.trim()) {
    return fir.firContentHtml;
  }

  return buildGeneratedFirHtml(fir);
}

function escapeForDocument(value: string) {
  return escapeHtml(value).replaceAll('\n', '<br />');
}

function formatApplicableSections(fir: FirRecord, analysis: FirAnalysisPayload | undefined) {
  const bnsSections = analysis?.sections?.primary_bns_sections?.map(
    (section) => `BNS ${section.section} - ${section.title}`
  ) ?? fir.primaryBnsSections.map((section) => `BNS ${section}`);
  const ipcSections = analysis?.sections?.primary_ipc_sections?.map(
    (section) => `IPC ${section.section} - ${section.title}`
  ) ?? fir.primaryIpcSections.map((section) => `IPC ${section}`);
  const combined = [...bnsSections, ...ipcSections];

  return combined.length > 0 ? combined.join(', ') : 'Under legal review';
}

function buildFirPrintDocument(fir: FirRecord, editorHtml: string) {
  const analysis = fir.aiAnalysisRaw as FirAnalysisPayload | undefined;
  const safeBody = DOMPurify.sanitize(editorHtml, { USE_PROFILES: { html: true } });
  const sectionText = escapeForDocument(formatApplicableSections(fir, analysis));
  const incidentTime = fir.incidentDatetime ? formatDateTime(fir.incidentDatetime) : 'Not specified';
  const firNumber = fir.firNumber ?? 'Pending finalization';
  const statusLabel = fir.status.replaceAll('_', ' ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(firNumber)} - FIR</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #475569;
        --line: #cbd5e1;
        --soft: #e2e8f0;
        --panel: #f8fafc;
        --accent: #1d4ed8;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #eef2ff;
        color: var(--ink);
        font-family: 'Times New Roman', Times, serif;
      }

      body {
        padding: 24px;
      }

      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        padding: 18mm 16mm;
        box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
      }

      .document-header {
        border-bottom: 2px solid var(--ink);
        padding-bottom: 12px;
        text-align: center;
      }

      .document-header h1 {
        margin: 0;
        font-size: 24px;
        letter-spacing: 0.06em;
      }

      .document-header p {
        margin: 4px 0 0;
        font-size: 13px;
        color: var(--muted);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 14px;
        margin-top: 18px;
        padding: 14px;
        border: 1px solid var(--line);
        background: var(--panel);
      }

      .meta-item {
        min-height: 44px;
      }

      .meta-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .meta-value {
        display: block;
        margin-top: 4px;
        font-size: 14px;
        line-height: 1.45;
      }

      .section-strip {
        margin-top: 14px;
        padding: 10px 14px;
        border: 1px solid var(--soft);
        background: #f8fafc;
        font-size: 13px;
        line-height: 1.5;
      }

      .content {
        margin-top: 22px;
        font-size: 14px;
        line-height: 1.7;
      }

      .content h1,
      .content h2,
      .content h3 {
        page-break-after: avoid;
        margin: 18px 0 8px;
        color: var(--ink);
      }

      .content h1 {
        font-size: 20px;
        text-align: center;
      }

      .content h2 {
        font-size: 16px;
        border-bottom: 1px solid var(--soft);
        padding-bottom: 4px;
      }

      .content h3 {
        font-size: 14px;
      }

      .content p,
      .content li,
      .content blockquote {
        margin: 0 0 10px;
      }

      .content ul,
      .content ol {
        margin: 0 0 12px 22px;
        padding: 0;
      }

      .content blockquote {
        border-left: 3px solid var(--line);
        padding-left: 12px;
        color: #334155;
      }

      .footer {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-top: 34px;
        padding-top: 14px;
        border-top: 1px solid var(--line);
        font-size: 13px;
      }

      .signature {
        width: 48%;
      }

      .signature-line {
        margin-top: 34px;
        border-top: 1px solid var(--ink);
        padding-top: 8px;
      }

      @page {
        size: A4;
        margin: 12mm;
      }

      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }

        .page {
          width: auto;
          min-height: auto;
          margin: 0;
          padding: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="document-header">
        <h1>FIRST INFORMATION REPORT</h1>
        <p>${escapeForDocument(fir.station.stationName)} (${escapeForDocument(fir.station.stationCode)}), ${escapeForDocument(fir.station.district)}, ${escapeForDocument(fir.station.state)}</p>
      </header>

      <section class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">FIR Number</span>
          <span class="meta-value">${escapeForDocument(firNumber)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-value">${escapeForDocument(statusLabel)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Complainant</span>
          <span class="meta-value">${escapeForDocument(fir.complainantName)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Filed By</span>
          <span class="meta-value">${escapeForDocument(`${fir.filedBy.fullName} (${fir.filedBy.rank}, ${fir.filedBy.badgeNumber})`)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Date of Report</span>
          <span class="meta-value">${escapeForDocument(formatDateTime(fir.createdAt))}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Incident Date and Time</span>
          <span class="meta-value">${escapeForDocument(incidentTime)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Incident Location</span>
          <span class="meta-value">${escapeForDocument(fir.incidentLocation ?? 'Not specified')}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Nature of Offence</span>
          <span class="meta-value">${escapeForDocument(fir.offenceNature ?? 'Under review')}</span>
        </div>
      </section>

      <section class="section-strip">
        <strong>Applicable Sections:</strong> ${sectionText}
      </section>

      <section class="content">
        ${safeBody}
      </section>

      <footer class="footer">
        <div class="signature">
          <strong>Complainant</strong>
          <div class="signature-line">${escapeForDocument(fir.complainantName)}</div>
        </div>
        <div class="signature">
          <strong>Reporting Officer</strong>
          <div class="signature-line">${escapeForDocument(`${fir.filedBy.fullName} (${fir.filedBy.badgeNumber})`)}</div>
        </div>
      </footer>
    </main>
  </body>
</html>`;
}

function printFirDocument(documentHtml: string, onError: (message: string) => void) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';

  const cleanup = () => {
    window.setTimeout(() => {
      frame.remove();
    }, 500);
  };

  frame.onload = () => {
    const frameWindow = frame.contentWindow;

    if (!frameWindow) {
      cleanup();
      onError('Unable to prepare the FIR document for download. Please try again.');
      return;
    }

    frameWindow.focus();
    frameWindow.print();
    cleanup();
  };

  document.body.appendChild(frame);

  const frameDocument = frame.contentDocument;

  if (!frameDocument) {
    cleanup();
    onError('Unable to prepare the FIR document for download. Please try again.');
    return;
  }

  frameDocument.open();
  frameDocument.write(documentHtml);
  frameDocument.close();
}

function sectionBadgeClass(status: FirStatus) {
  switch (status) {
    case FirStatus.DRAFT:
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case FirStatus.UNDER_REVIEW:
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case FirStatus.FINALIZED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case FirStatus.FILED:
      return 'bg-slate-100 text-slate-700 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function peopleLabel(people: FirAnalysisPerson[] | undefined, emptyText: string) {
  if (!people || people.length === 0) return [emptyText];

  return people.map((person, index) => {
    const details = [
      person.name,
      person.age ? `Age ${person.age}` : null,
      person.address ?? null,
      person.phone ?? null,
      person.physical_description ?? null,
    ].filter(Boolean);

    return `${index + 1}. ${details.join(' | ')}`;
  });
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {children}
    </button>
  );
}

export function FirDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const officer = useAuthStore((state) => state.officer);
  const [flashMessage, setFlashMessage] = useState<string | null>(
    (location.state as { success?: string } | null)?.success ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const firQuery = useQuery({
    queryKey: ['fir', id],
    queryFn: () => getFir(id!),
    enabled: Boolean(id),
  });

  const fir = firQuery.data;
  const analysis = fir?.aiAnalysisRaw as FirAnalysisPayload | undefined;
  const canEdit = Boolean(fir && officer && fir.filedByOfficerId === officer.id && fir.status === FirStatus.DRAFT);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Review and refine the generated FIR draft here...',
      }),
    ],
    content: ensureEditorContent(fir),
    editable: canEdit,
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !fir) return;
    editor.commands.setContent(ensureEditorContent(fir));
    editor.setEditable(canEdit);
  }, [canEdit, editor, fir]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fir || !editor) throw new Error('Draft editor is not ready');
      return updateFir(fir.id, {
        offenceNature: fir.offenceNature ?? undefined,
        firContentJson: editor.getJSON() as Record<string, unknown>,
        firContentHtml: editor.getHTML(),
      });
    },
    onSuccess: async (updatedFir) => {
      setErrorMessage(null);
      setFlashMessage('Draft saved successfully.');
      await queryClient.invalidateQueries({ queryKey: ['fir', updatedFir.id] });
      await queryClient.invalidateQueries({ queryKey: ['firs'] });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as { message?: string })?.message ??
        'Unable to save the FIR draft.';
      setErrorMessage(message);
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!fir || !editor) throw new Error('Draft editor is not ready');
      return finalizeFir(fir.id, {
        firContentJson: editor.getJSON() as Record<string, unknown>,
        firContentHtml: editor.getHTML(),
      });
    },
    onSuccess: async (updatedFir) => {
      await queryClient.invalidateQueries({ queryKey: ['fir', updatedFir.id] });
      await queryClient.invalidateQueries({ queryKey: ['firs'] });
      navigate('/firs', {
        state: {
          success: `FIR ${updatedFir.firNumber ?? updatedFir.id} finalized successfully.`,
        },
      });
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        (err as { message?: string })?.message ??
        'Unable to finalize the FIR.';
      setErrorMessage(message);
    },
  });

  const analysisSections = useMemo(() => ({
    bns: analysis?.sections?.primary_bns_sections ?? [],
    ipc: analysis?.sections?.primary_ipc_sections ?? [],
  }), [analysis]);

  const handleDownloadFir = () => {
    if (!fir) return;

    const currentHtml = editor?.getHTML() ?? ensureEditorContent(fir);
    setErrorMessage(null);
    printFirDocument(buildFirPrintDocument(fir, currentHtml), setErrorMessage);
  };

  if (firQuery.isPending) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading FIR draft...
      </div>
    );
  }

  if (firQuery.error || !fir) {
    const message =
      (firQuery.error as { response?: { data?: { error?: string } } } | null)?.response?.data?.error ??
      'Unable to load this FIR draft.';
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">FIR Draft</p>
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', sectionBadgeClass(fir.status))}>
              {fir.status.replaceAll('_', ' ')}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {fir.firNumber ?? `Draft for ${fir.complainantName}`}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Generated for {fir.station.stationName} by {fir.filedBy.fullName} ({fir.filedBy.rank}, {fir.filedBy.badgeNumber}).
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/firs"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to FIR records
          </Link>
          <button
            type="button"
            onClick={handleDownloadFir}
            disabled={firQuery.isPending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            Download FIR
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={!editor || saveMutation.isPending || finalizeMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saveMutation.isPending ? 'Saving...' : 'Save draft'}
              </button>
              <button
                type="button"
                onClick={() => finalizeMutation.mutate()}
                disabled={!editor || saveMutation.isPending || finalizeMutation.isPending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileCheck2 className="h-4 w-4" />
                {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize FIR'}
              </button>
            </>
          )}
        </div>
      </div>

      {flashMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {flashMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!canEdit && fir.status === FirStatus.DRAFT && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This draft is currently editable only by the officer who created it. You can still review the AI analysis and generated FIR content here.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <section className="space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Generated FIR Draft</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review and refine the FIR before finalization.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {canEdit ? 'Editable' : 'Read only'}
              </div>
            </div>

            {canEdit && editor && (
              <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
                  Bold
                </ToolbarButton>
                <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
                  Italic
                </ToolbarButton>
                <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
                  Bullet List
                </ToolbarButton>
                <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  Numbered List
                </ToolbarButton>
                <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                  Quote
                </ToolbarButton>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {editor ? (
                <EditorContent editor={editor} className="fir-document min-h-[520px]" />
              ) : (
                <div className="text-sm text-slate-500">Loading editor...</div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Incident Snapshot</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Complainant:</span> {fir.complainantName}</p>
                <p><span className="font-medium text-slate-900">Reported At:</span> {formatDateTime(fir.createdAt)}</p>
                <p><span className="font-medium text-slate-900">Incident Time:</span> {fir.incidentDatetime ? formatDateTime(fir.incidentDatetime) : 'Not specified'}</p>
                <p><span className="font-medium text-slate-900">Location:</span> {fir.incidentLocation ?? 'Not specified'}</p>
                <p><span className="font-medium text-slate-900">Nature of Offence:</span> {fir.offenceNature ?? 'Under review'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">AI Legal Assessment</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p><span className="font-medium text-slate-900">Severity:</span> {analysis?.sections?.severity ?? 'Not specified'}</p>
                <p><span className="font-medium text-slate-900">Cognizable:</span> {analysis?.sections?.cognizable ? 'Yes' : 'No / not determined'}</p>
                <div className="flex flex-wrap gap-2">
                  {analysisSections.bns.map((section) => (
                    <span key={`bns-${section.section}`} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      BNS {section.section}
                    </span>
                  ))}
                  {analysisSections.ipc.map((section) => (
                    <span key={`ipc-${section.section}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      IPC {section.section}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">AI Analysis</h3>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {analysis?.entities?.incident_summary ?? fir.incidentDescription}
            </p>
            {analysis?.entities?.property_involved && (
              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <p className="font-medium text-slate-900">Property Involved</p>
                <p className="mt-1">{analysis.entities.property_involved}</p>
              </div>
            )}
            {analysis?.entities?.offence_keywords && analysis.entities.offence_keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {analysis.entities.offence_keywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Extracted People</h3>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">Accused</p>
                <div className="mt-2 space-y-2">
                  {peopleLabel(analysis?.entities?.accused_persons, 'No accused details extracted yet.').map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium text-slate-900">Victims</p>
                <div className="mt-2 space-y-2">
                  {peopleLabel(analysis?.entities?.victims, 'No victim details extracted yet.').map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-medium text-slate-900">Witnesses</p>
                <div className="mt-2 space-y-2">
                  {peopleLabel(analysis?.entities?.witnesses, 'No witness details extracted yet.').map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Generated Notes</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-900">Complainant Statement</p>
                <p className="mt-1">{analysis?.fir_draft?.complainant_statement_formal ?? 'Not available'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Action Taken</p>
                <p className="mt-1">{analysis?.fir_draft?.action_taken ?? 'Not available'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-900">Investigating Officer Notes</p>
                <p className="mt-1">{analysis?.fir_draft?.investigating_officer_notes ?? 'Not available'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
