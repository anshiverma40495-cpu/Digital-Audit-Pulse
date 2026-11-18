import React from 'react';
import { CheckCircle2, CircleDashed, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { AuditSectionId } from '../types/audit';

export type StepStatus = 'queued' | 'running' | 'done' | 'error';

export interface AuditProgressState {
  reading: StepStatus;
  seo: StepStatus;
  content: StepStatus;
  keywords: StepStatus;
  technical: StepStatus;
  aiSearch: StepStatus;
  errors: Partial<Record<'reading' | AuditSectionId, string>>;
}

interface AuditProgressLoaderProps {
  targetUrl: string;
  progress: AuditProgressState;
  onRetrySection: (section: AuditSectionId) => void;
  onCancel: () => void;
}

const STEPS: { key: keyof Omit<AuditProgressState, 'errors'>; label: string; detail: string }[] = [
  { key: 'reading', label: 'Reading page', detail: 'Fetching live page context, robots.txt, sitemap, and search grounding' },
  { key: 'seo', label: 'SEO analysis', detail: 'Checking titles, meta descriptions, headings, schema, OG tags, and E-E-A-T' },
  { key: 'content', label: 'Content review', detail: 'Evaluating depth, intent match, competitor gaps, and copy rewrites' },
  { key: 'keywords', label: 'Keyword research', detail: 'Mapping primary, secondary, and long-tail opportunities' },
  { key: 'technical', label: 'Technical checks', detail: 'Verifying indexability, HTTPS, viewport, and Core Web Vitals guidance' },
  { key: 'aiSearch', label: 'AI-search readiness', detail: 'Scoring readiness for AI Overviews, ChatGPT, Perplexity, Gemini & Copilot' },
];

export const AuditProgressLoader: React.FC<AuditProgressLoaderProps> = ({
  targetUrl,
  progress,
  onRetrySection,
  onCancel,
}) => {
  const completedCount = STEPS.filter((s) => progress[s.key] === 'done').length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Running Digital Marketing Audit
            </h1>
            <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">
              {targetUrl}
            </p>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
            {completedCount}/{STEPS.length}
          </span>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={STEPS.length}>
          <div
            className="h-full bg-indigo-600 transition-all duration-300 dark:bg-indigo-500"
            style={{ width: `${Math.round((completedCount / STEPS.length) * 100)}%` }}
          />
        </div>

        <ul className="mt-6 divide-y divide-slate-100 dark:divide-slate-800">
          {STEPS.map((step) => {
            const status = progress[step.key];
            const errMsg = progress.errors[step.key];

            return (
              <li key={step.key} className="flex items-start justify-between gap-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {status === 'done' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
                    {status === 'running' && <Loader2 className="h-5 w-5 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />}
                    {status === 'queued' && <CircleDashed className="h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
                    {status === 'error' && <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">{step.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {status === 'error' && errMsg ? errMsg : step.detail}
                    </div>
                  </div>
                </div>

                {status === 'error' && step.key !== 'reading' && (
                  <button
                    type="button"
                    onClick={() => onRetrySection(step.key as AuditSectionId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel &amp; Back
          </button>
        </div>
      </div>
    </main>
  );
};
