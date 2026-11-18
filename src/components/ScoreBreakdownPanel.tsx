import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ScoreBreakdownItem, getScoreColorClasses } from '../types/audit';

interface ScoreBreakdownPanelProps {
  title: string;
  score: number;
  summary: string;
  isEstimate?: boolean;
  estimateReason?: string;
  breakdown: ScoreBreakdownItem[];
}

export const ScoreBreakdownPanel: React.FC<ScoreBreakdownPanelProps> = ({
  title,
  score,
  summary,
  isEstimate,
  estimateReason,
  breakdown,
}) => {
  const colors = getScoreColorClasses(score);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            {isEstimate && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Contains AI Estimates
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
          {isEstimate && estimateReason && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{estimateReason}</p>
          )}
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <div className={`font-mono text-3xl font-extrabold tabular-nums ${colors.text}`}>{score}/100</div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{colors.bandLabel}</div>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Score Breakdown</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {breakdown.map((item, idx) => {
              const pct = item.maxScore > 0 ? Math.min(100, Math.round((item.score / item.maxScore) * 100)) : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.factor}</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                      {item.score}/{item.maxScore}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs leading-snug text-slate-500 dark:text-slate-400">{item.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
