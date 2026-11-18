import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { AiSearchAuditSection, getScoreColorClasses } from '../../types/audit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';

interface AiSearchTabProps {
  data: AiSearchAuditSection;
}

export const AiSearchTab: React.FC<AiSearchTabProps> = ({ data }) => {
  const [copiedFaq, setCopiedFaq] = useState<number | null>(null);

  const handleCopyFaq = async (q: string, a: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(`Q: ${q}\nA: ${a}`);
      setCopiedFaq(idx);
      setTimeout(() => setCopiedFaq(null), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <div className="space-y-8">
      <ScoreBreakdownPanel
        title="AI-Search Readiness Score Breakdown"
        score={data.score}
        summary={data.summary}
        isEstimate={data.isEstimate}
        estimateReason={data.estimateReason}
        breakdown={data.scoreBreakdown}
      />

      {/* 5 Platform Readiness Cards */}
      <section>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Answer Engine &amp; AI Assistant Readiness
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {data.platforms.map((p) => {
            const colors = getScoreColorClasses(p.readinessScore);
            return (
              <div
                key={p.platform}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.status}</div>
                  <div className="mt-1 flex items-baseline justify-between gap-2">
                    <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{p.platform}</h4>
                    <span className={`font-mono text-xl font-extrabold tabular-nums ${colors.text}`}>
                      {p.readinessScore}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{p.keyGap}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6 Core AI-Search Signal Areas */}
      <section>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Entity, Crawler &amp; Credibility Signals
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.signals.map((sig) => {
            const statusColor =
              sig.status === 'Strong'
                ? 'text-emerald-700 dark:text-emerald-400'
                : sig.status === 'Partial' || sig.status === 'Needs manual check'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-red-700 dark:text-red-400';

            return (
              <div
                key={sig.area}
                className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{sig.area}</h4>
                  <span className={`text-xs font-bold shrink-0 ${statusColor}`}>{sig.status}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{sig.finding}</p>
                <p className="mt-2.5 border-t border-slate-100 pt-2.5 text-xs font-medium text-indigo-700 dark:border-slate-800 dark:text-indigo-300">
                  Action: {sig.action}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Schema Types to Add */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Recommended Schema.org Structured Data
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.schemaRecommendations.map((sc, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {sc.schemaType}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {sc.priority} Priority
                </span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-slate-800 dark:text-slate-200">{sc.purpose}</p>
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{sc.implementationNote}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 10 Concrete Recommendations */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          10 Concrete AI-Search Optimization Recommendations
        </h3>
        <ol className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {data.recommendations.map((rec, idx) => (
            <li key={idx} className="py-3.5 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  <span className="mr-2 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  {rec.title}
                </div>
                <span className="text-xs font-medium text-slate-500 shrink-0 dark:text-slate-400">
                  {rec.impact} Impact · {rec.effort} Effort
                </span>
              </div>
              <p className="mt-1 pl-6 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{rec.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 5 Sample FAQ Q&A Pairs */}
      <section>
        <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
          5 Ready-to-Publish FAQ Pairs (Structured for AI Citations)
        </h3>
        <div className="mt-3 space-y-3">
          {data.sampleFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">{faq.question}</h4>
                <button
                  type="button"
                  onClick={() => handleCopyFaq(faq.question, faq.answer, idx)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 shrink-0 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {copiedFaq === idx ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      Copy FAQ
                    </>
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
