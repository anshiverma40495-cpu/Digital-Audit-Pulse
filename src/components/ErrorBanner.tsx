import React from 'react';
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert, WifiOff } from 'lucide-react';

export interface AuditErrorInfo {
  code: 'INVALID_URL' | 'UNREACHABLE_SITE' | 'BLOCKED_BY_ROBOTS' | 'API_FAILURE';
  title: string;
  message: string;
  url?: string;
}

interface ErrorBannerProps {
  error: AuditErrorInfo;
  onRetry: () => void;
  onProceedEstimated?: () => void;
  onBack: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onRetry,
  onProceedEstimated,
  onBack,
}) => {
  const Icon =
    error.code === 'UNREACHABLE_SITE'
      ? WifiOff
      : error.code === 'BLOCKED_BY_ROBOTS'
      ? ShieldAlert
      : AlertTriangle;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/60 dark:bg-slate-900"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">{error.title}</h1>
            {error.url && (
              <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{error.url}</p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{error.message}</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry Audit
              </button>

              {error.code === 'BLOCKED_BY_ROBOTS' && onProceedEstimated && (
                <button
                  type="button"
                  onClick={onProceedEstimated}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
                >
                  Run Estimated Audit
                </button>
              )}

              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Change URL
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
