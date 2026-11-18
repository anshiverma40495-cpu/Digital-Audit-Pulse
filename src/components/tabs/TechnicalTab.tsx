import React, { useEffect, useState } from 'react';
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { TechnicalAuditSection } from '../../types/audit';
import { getChecklistProgress, saveChecklistProgress } from '../../utils/storage';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';

interface TechnicalTabProps {
  auditId: string;
  data: TechnicalAuditSection;
}

export const TechnicalTab: React.FC<TechnicalTabProps> = ({ auditId, data }) => {
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pass' | 'Fail' | 'Needs manual check'>('ALL');

  useEffect(() => {
    setCheckedMap(getChecklistProgress(auditId));
  }, [auditId]);

  const handleToggle = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    saveChecklistProgress(auditId, next);
  };

  const completedCount = data.checks.filter((c) => checkedMap[c.id]).length;
  const pct = data.checks.length > 0 ? Math.round((completedCount / data.checks.length) * 100) : 0;

  const filtered = statusFilter === 'ALL' ? data.checks : data.checks.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-6">
      <ScoreBreakdownPanel
        title="Technical SEO Score Breakdown"
        score={data.score}
        summary={data.summary}
        isEstimate={data.isEstimate}
        estimateReason={data.estimateReason}
        breakdown={data.scoreBreakdown}
      />

      {/* Interactive Checklist Progress */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Interactive Technical Checklist
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Tick off items as you verify or resolve them. Progress saves automatically to this browser.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="w-36">
            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Resolved</span>
              <span className="font-mono tabular-nums">{completedCount}/{data.checks.length} ({pct}%)</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {data.checks.length} technical checks
        </span>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80" role="group" aria-label="Filter technical checks">
          {(['ALL', 'Fail', 'Needs manual check', 'Pass'] as const).map((status) => (
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
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {filtered.map((item) => {
          const isDone = Boolean(checkedMap[item.id]);
          const StatusIcon =
            item.status === 'Pass' ? CheckCircle2 : item.status === 'Fail' ? XCircle : HelpCircle;
          const statusColor =
            item.status === 'Pass'
              ? 'text-emerald-700 dark:text-emerald-400'
              : item.status === 'Fail'
              ? 'text-red-700 dark:text-red-400'
              : 'text-amber-700 dark:text-amber-400';

          const severityColor =
            item.severity === 'Critical'
              ? 'text-red-700 dark:text-red-400'
              : item.severity === 'Warning'
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400';

          return (
            <div
              key={item.id}
              className={`p-5 transition-colors ${isDone ? 'bg-slate-50/70 dark:bg-slate-950/50' : ''}`}
            >
              <div className="flex items-start gap-3.5">
                <input
                  id={`tech-check-${item.id}`}
                  type="checkbox"
                  checked={isDone}
                  onChange={() => handleToggle(item.id)}
                  className="mt-1 h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 dark:border-slate-600 dark:bg-slate-800"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                    <label
                      htmlFor={`tech-check-${item.id}`}
                      className={`cursor-pointer font-display text-sm font-bold ${
                        isDone
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </label>
                    <div className="flex items-center gap-3 text-xs font-semibold shrink-0">
                      <span className={severityColor}>{item.severity}</span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                      <span className={`inline-flex items-center gap-1 ${statusColor}`}>
                        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {item.explanation}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 text-xs lg:grid-cols-2">
                    <div>
                      <span className="font-semibold text-slate-500 dark:text-slate-400">Verification Note: </span>
                      <span className="text-slate-700 dark:text-slate-300">{item.verificationNote}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Recommended Fix: </span>
                      <span className="text-slate-800 dark:text-slate-200">{item.fix}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
