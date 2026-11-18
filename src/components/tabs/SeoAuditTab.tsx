import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { CheckStatus, SeoAuditSection } from '../../types/audit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';

interface SeoAuditTabProps {
  data: SeoAuditSection;
}

export const SeoAuditTab: React.FC<SeoAuditTabProps> = ({ data }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | CheckStatus>('ALL');

  const counts = {
    ALL: data.checks.length,
    Fail: data.checks.filter((c) => c.status === 'Fail').length,
    Warning: data.checks.filter((c) => c.status === 'Warning').length,
    Pass: data.checks.filter((c) => c.status === 'Pass').length,
  };

  const filtered = statusFilter === 'ALL' ? data.checks : data.checks.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-6">
      <ScoreBreakdownPanel
        title="On-Page SEO Score Breakdown"
        score={data.score}
        summary={data.summary}
        isEstimate={data.isEstimate}
        estimateReason={data.estimateReason}
        breakdown={data.scoreBreakdown}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          On-Page SEO Checks ({filtered.length})
        </h3>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80" role="group" aria-label="Filter SEO checks by status">
          {(['ALL', 'Fail', 'Warning', 'Pass'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {status === 'ALL' ? 'All' : status} ({counts[status]})
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {filtered.map((check) => {
          const StatusIcon =
            check.status === 'Pass'
              ? CheckCircle2
              : check.status === 'Warning'
              ? AlertTriangle
              : XCircle;
          const statusColor =
            check.status === 'Pass'
              ? 'text-emerald-700 dark:text-emerald-400'
              : check.status === 'Warning'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-red-700 dark:text-red-400';

          return (
            <article key={check.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {check.category} · {check.impact} Impact · {check.effort} Effort
                  </div>
                  <h4 className="mt-1 font-display text-base font-bold text-slate-900 dark:text-white">
                    {check.title}
                  </h4>
                </div>
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold shrink-0 ${statusColor}`}>
                  <StatusIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{check.status}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">What Was Found</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{check.found}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Why It Matters</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{check.whyItMatters}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">How To Fix</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">{check.howToFix}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
