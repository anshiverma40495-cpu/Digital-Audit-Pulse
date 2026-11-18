import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, GitCompare, Trash2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FullAuditReport, computeOverallScore, getScoreColorClasses, scoreToGrade } from '../types/audit';

interface AuditHistoryViewProps {
  history: FullAuditReport[];
  onOpenReport: (report: FullAuditReport) => void;
  onDeleteReport: (id: string) => void;
  onBack: () => void;
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({
  history,
  onOpenReport,
  onDeleteReport,
  onBack,
}) => {
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([
    history[0]?.id ?? null,
    history[1]?.id ?? null,
  ]);

  const firstReport = history.find((h) => h.id === compareIds[0]) ?? null;
  const secondReport = history.find((h) => h.id === compareIds[1]) ?? null;

  const comparisonData = useMemo(() => {
    if (!firstReport || !secondReport) return [];
    const labelA = `${firstReport.inspection.domain} (${new Date(firstReport.createdAt).toLocaleDateString()})`;
    const labelB = `${secondReport.inspection.domain} (${new Date(secondReport.createdAt).toLocaleDateString()})`;

    return [
      {
        pillar: 'Overall',
        [labelA]: computeOverallScore(firstReport),
        [labelB]: computeOverallScore(secondReport),
      },
      {
        pillar: 'SEO',
        [labelA]: firstReport.seo?.score ?? 0,
        [labelB]: secondReport.seo?.score ?? 0,
      },
      {
        pillar: 'Content',
        [labelA]: firstReport.content?.score ?? 0,
        [labelB]: secondReport.content?.score ?? 0,
      },
      {
        pillar: 'Keywords',
        [labelA]: firstReport.keywords?.score ?? 0,
        [labelB]: secondReport.keywords?.score ?? 0,
      },
      {
        pillar: 'Technical',
        [labelA]: firstReport.technical?.score ?? 0,
        [labelB]: secondReport.technical?.score ?? 0,
      },
      {
        pillar: 'AI-Search',
        [labelA]: firstReport.aiSearch?.score ?? 0,
        [labelB]: secondReport.aiSearch?.score ?? 0,
      },
    ];
  }, [firstReport, secondReport]);

  const seriesKeys = comparisonData.length > 0 ? Object.keys(comparisonData[0]).filter((k) => k !== 'pillar') : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Audit History &amp; Score Comparison
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Last 10 audits saved locally in your browser. Reopen reports or compare scores over time.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          New Audit
        </button>
      </div>

      {history.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">No Saved Audits Yet</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Run your first website audit to start tracking SEO, content, and AI-search scores over time.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500"
          >
            Run First Audit
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {/* Score Comparison Panel */}
          {history.length >= 2 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Compare Audits Over Time
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    aria-label="Select first audit to compare"
                    value={compareIds[0] ?? ''}
                    onChange={(e) => setCompareIds([e.target.value, compareIds[1]])}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.inspection.domain} · {new Date(h.createdAt).toLocaleString()} ({computeOverallScore(h)})
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">vs.</span>
                  <select
                    aria-label="Select second audit to compare"
                    value={compareIds[1] ?? ''}
                    onChange={(e) => setCompareIds([compareIds[0], e.target.value])}
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.inspection.domain} · {new Date(h.createdAt).toLocaleString()} ({computeOverallScore(h)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {firstReport && secondReport && seriesKeys.length >= 1 && (
                <div className="mt-6 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                      <XAxis dataKey="pillar" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '0.75rem',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey={seriesKeys[0]} fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      {seriesKeys[1] && <Bar dataKey={seriesKeys[1]} fill="#14B8A6" radius={[4, 4, 0, 0]} />}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}

          {/* Saved Audits List */}
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {history.map((item) => {
              const overall = computeOverallScore(item);
              const { grade } = scoreToGrade(overall);
              const colors = getScoreColorClasses(overall);

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="truncate font-mono text-sm font-bold text-slate-900 dark:text-white">
                        {item.inspection.normalizedUrl}
                      </span>
                      <span className={`font-mono text-xs font-bold ${colors.text}`}>
                        {overall}/100 (Grade {grade})
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">SEO {item.seo?.score ?? '-'}</span>
                      <span className="font-mono tabular-nums">Content {item.content?.score ?? '-'}</span>
                      <span className="font-mono tabular-nums">Keywords {item.keywords?.score ?? '-'}</span>
                      <span className="font-mono tabular-nums">Technical {item.technical?.score ?? '-'}</span>
                      <span className="font-mono tabular-nums">AI-Search {item.aiSearch?.score ?? '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenReport(item)}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      Open Report
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReport(item.id)}
                      aria-label={`Delete audit for ${item.inspection.domain}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
};
