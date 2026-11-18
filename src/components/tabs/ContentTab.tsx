import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { ContentAuditSection, getScoreColorClasses } from '../../types/audit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';

interface ContentTabProps {
  data: ContentAuditSection;
}

export const ContentTab: React.FC<ContentTabProps> = ({ data }) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const filteredIdeas =
    priorityFilter === 'ALL' ? data.pageIdeas : data.pageIdeas.filter((i) => i.priority === priorityFilter);

  return (
    <div className="space-y-8">
      <ScoreBreakdownPanel
        title="Content Quality Score Breakdown"
        score={data.score}
        summary={data.summary}
        isEstimate={data.isEstimate}
        estimateReason={data.estimateReason}
        breakdown={data.scoreBreakdown}
      />

      {/* 5 Quality Dimensions */}
      <section>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Content Quality Assessment
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {data.qualityDimensions.map((dim) => {
            const colors = getScoreColorClasses(dim.score);
            return (
              <div
                key={dim.dimension}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dim.dimension}</h4>
                    <span className={`font-mono text-lg font-bold tabular-nums ${colors.text}`}>{dim.score}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{dim.assessment}</p>
                </div>
                <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs font-medium text-indigo-700 dark:border-slate-800 dark:text-indigo-300">
                  {dim.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Before / After Copy Rewrites */}
      <section>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Suggested Copy Improvements (Before &amp; After)
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.copyRewrites.map((rw, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{rw.element}</h4>
                <button
                  type="button"
                  onClick={() => handleCopy(rw.after, idx)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy After
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 space-y-2.5 text-sm">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Before</div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">{rw.before}</p>
                </div>
                <div className="rounded-lg bg-teal-50/70 p-3 dark:bg-teal-950/30">
                  <div className="text-xs font-semibold text-teal-700 dark:text-teal-400">After (Recommended)</div>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">{rw.after}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{rw.whyBetter}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Competitor Content Gaps */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Content Gaps vs. Competitors
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
          {data.competitorGaps.map((gap, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="mt-1 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {String(idx + 1).padStart(2, '0')}.
              </span>
              <span className="leading-relaxed">{gap}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 8-10 Blog & Landing Page Ideas */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Blog &amp; Landing Page Ideas ({filteredIdeas.length})
          </h3>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800/80" role="group" aria-label="Filter content ideas by priority">
            {(['ALL', 'High', 'Medium', 'Low'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  priorityFilter === p
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {p === 'ALL' ? 'All Priorities' : `${p} Priority`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredIdeas.map((idea, idx) => (
            <article
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {idea.priority} Priority · {idea.searchIntent} Intent · Target: <span className="font-mono text-indigo-600 dark:text-indigo-400">{idea.targetKeyword}</span>
              </div>
              <h4 className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-white">
                {idea.title}
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{idea.rationale}</p>
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Suggested H2 Outline</div>
                <ul className="mt-1.5 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {idea.suggestedOutlineH2s.map((h2, hIdx) => (
                    <li key={hIdx}>H2: {h2}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
