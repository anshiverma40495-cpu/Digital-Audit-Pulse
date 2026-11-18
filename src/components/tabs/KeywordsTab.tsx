import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Info, Search } from 'lucide-react';
import { KeywordSuggestion, KeywordsAuditSection } from '../../types/audit';
import { ScoreBreakdownPanel } from '../ScoreBreakdownPanel';

interface KeywordsTabProps {
  data: KeywordsAuditSection;
}

type SortKey = 'keyword' | 'group' | 'intent' | 'estimatedDifficulty' | 'relativeOpportunityScore';

const DIFFICULTY_ORDER = { Low: 1, Medium: 2, High: 3 };
const GROUP_ORDER = { Primary: 1, Secondary: 2, 'Long-tail': 3 };

export const KeywordsTab: React.FC<KeywordsTabProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState<'ALL' | KeywordSuggestion['group']>('ALL');
  const [intentFilter, setIntentFilter] = useState<'ALL' | KeywordSuggestion['intent']>('ALL');
  const [difficultyFilter, setDifficultyFilter] = useState<'ALL' | KeywordSuggestion['estimatedDifficulty']>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('relativeOpportunityScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'relativeOpportunityScore' ? 'desc' : 'asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return data.keywords
      .filter((k) => {
        if (groupFilter !== 'ALL' && k.group !== groupFilter) return false;
        if (intentFilter !== 'ALL' && k.intent !== intentFilter) return false;
        if (difficultyFilter !== 'ALL' && k.estimatedDifficulty !== difficultyFilter) return false;
        if (q && !k.keyword.toLowerCase().includes(q) && !k.suggestedTargetPage.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'relativeOpportunityScore') {
          cmp = a.relativeOpportunityScore - b.relativeOpportunityScore;
        } else if (sortKey === 'estimatedDifficulty') {
          cmp = DIFFICULTY_ORDER[a.estimatedDifficulty] - DIFFICULTY_ORDER[b.estimatedDifficulty];
        } else if (sortKey === 'group') {
          cmp = GROUP_ORDER[a.group] - GROUP_ORDER[b.group];
        } else {
          cmp = a[sortKey].localeCompare(b[sortKey]);
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [data.keywords, searchTerm, groupFilter, intentFilter, difficultyFilter, sortKey, sortDir]);

  const SortIndicator = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? <ArrowUp className="inline h-3.5 w-3.5 ml-1" /> : <ArrowDown className="inline h-3.5 w-3.5 ml-1" />;
  };

  return (
    <div className="space-y-6">
      <ScoreBreakdownPanel
        title="Keyword Strategy Score Breakdown"
        score={data.score}
        summary={data.summary}
        isEstimate={data.isEstimate}
        estimateReason={data.estimateReason}
        breakdown={data.scoreBreakdown}
      />

      {/* Explicit AI-Estimate Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 text-xs leading-relaxed text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        <div>
          <strong>AI Estimate Notice:</strong> All search demand labels, difficulty ratings (Low / Medium / High), and relative opportunity scores are AI estimates generated from search grounding context — not exact Google Ads or third-party keyword tool metrics. Validate volume in Google Keyword Planner or Search Console before committing budget.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            aria-label="Filter keywords or target pages"
            placeholder="Filter keywords or target URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by keyword group"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value as typeof groupFilter)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Groups ({data.keywords.length})</option>
            <option value="Primary">Primary</option>
            <option value="Secondary">Secondary</option>
            <option value="Long-tail">Long-tail</option>
          </select>

          <select
            aria-label="Filter by search intent"
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value as typeof intentFilter)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Intents</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
            <option value="Navigational">Navigational</option>
          </select>

          <select
            aria-label="Filter by estimated difficulty"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as typeof difficultyFilter)}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="ALL">All Difficulties (AI Est.)</option>
            <option value="Low">Low (AI Est.)</option>
            <option value="Medium">Medium (AI Est.)</option>
            <option value="High">High (AI Est.)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              <th className="px-4 py-3">
                <button type="button" onClick={() => handleSort('keyword')} className="hover:text-slate-900 dark:hover:text-white">
                  Keyword <SortIndicator col="keyword" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => handleSort('group')} className="hover:text-slate-900 dark:hover:text-white">
                  Group <SortIndicator col="group" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => handleSort('intent')} className="hover:text-slate-900 dark:hover:text-white">
                  Intent <SortIndicator col="intent" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button type="button" onClick={() => handleSort('estimatedDifficulty')} className="hover:text-slate-900 dark:hover:text-white">
                  Difficulty (AI Est.) <SortIndicator col="estimatedDifficulty" />
                </button>
              </th>
              <th className="px-4 py-3">Demand (AI Est.)</th>
              <th className="px-4 py-3 text-right">
                <button type="button" onClick={() => handleSort('relativeOpportunityScore')} className="hover:text-slate-900 dark:hover:text-white">
                  Opportunity <SortIndicator col="relativeOpportunityScore" />
                </button>
              </th>
              <th className="px-4 py-3">Suggested Target Page</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  No keywords match your active filters.
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((k, idx) => {
                const diffColor =
                  k.estimatedDifficulty === 'Low'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : k.estimatedDifficulty === 'Medium'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-red-700 dark:text-red-400';

                return (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{k.keyword}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{k.group}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{k.intent}</td>
                    <td className={`px-4 py-3 text-xs font-semibold ${diffColor}`}>{k.estimatedDifficulty}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{k.estimatedSearchDemand}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold tabular-nums text-teal-600 dark:text-teal-400">
                      {k.relativeOpportunityScore}/100
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">
                      {k.suggestedTargetPage}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
