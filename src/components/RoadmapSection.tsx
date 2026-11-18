import React from 'react';
import { RoadmapAction } from '../types/audit';

interface RoadmapSectionProps {
  roadmap: RoadmapAction[];
}

export const RoadmapSection: React.FC<RoadmapSectionProps> = ({ roadmap }) => {
  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Prioritised 30–60–90 Day Action Plan
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Recommendations grouped by business impact and implementation effort.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {roadmap.map((phase) => (
          <div
            key={phase.phase}
            className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/60"
          >
            <h3 className="font-display text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {phase.phase}
            </h3>
            <ul className="mt-4 space-y-3">
              {phase.items.length === 0 ? (
                <li className="text-xs text-slate-500 dark:text-slate-400">
                  No additional items queued for this window.
                </li>
              ) : (
                phase.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {item.section} · {item.impact} Impact · {item.effort} Effort
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.outcome}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
