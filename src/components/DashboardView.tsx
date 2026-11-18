import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AuditSectionId,
  FullAuditReport,
  computeOverallScore,
  deriveRoadmap,
  deriveTopQuickWins,
  getScoreColorClasses,
} from '../types/audit';
import {
  copyShareSummary,
  downloadFullJson,
  downloadIssuesCsv,
  downloadKeywordsCsv,
  downloadPdfReport,
} from '../utils/exportReports';
import { InfoTooltip } from './InfoTooltip';
import { RoadmapSection } from './RoadmapSection';
import { ScoreGauge } from './ScoreGauge';
import { AiSearchTab } from './tabs/AiSearchTab';
import { ContentTab } from './tabs/ContentTab';
import { KeywordsTab } from './tabs/KeywordsTab';
import { SeoAuditTab } from './tabs/SeoAuditTab';
import { TechnicalTab } from './tabs/TechnicalTab';

interface DashboardViewProps {
  report: FullAuditReport;
  retryingSection: AuditSectionId | null;
  onRetrySection: (section: AuditSectionId) => void;
  onRerunAudit: () => void;
  onNewAudit: () => void;
}

const TABS: { id: AuditSectionId; label: string; shortLabel: string; tooltip: string }[] = [
  {
    id: 'seo',
    label: 'SEO Audit',
    shortLabel: 'SEO',
    tooltip:
      'Weighted score based on title tag, meta description, heading hierarchy, canonicals, alt text, links, OG/Twitter cards, schema markup, E-E-A-T, and mobile viewport.',
  },
  {
    id: 'content',
    label: 'Content Recommendations',
    shortLabel: 'Content',
    tooltip:
      'Composite of content depth, readability, search intent alignment, freshness cues, CTA clarity, and competitive topic coverage.',
  },
  {
    id: 'keywords',
    label: 'Keyword Suggestions',
    shortLabel: 'Keywords',
    tooltip:
      'Measures how well existing page copy and headings target high-intent primary, secondary, and long-tail search opportunities.',
  },
  {
    id: 'technical',
    label: 'Technical SEO Checklist',
    shortLabel: 'Technical',
    tooltip:
      'Scored strictly from verifiable technical signals (HTTPS, robots.txt, sitemap.xml, indexability, viewport, canonical, schema) without guessing unobservable server metrics.',
  },
  {
    id: 'aiSearch',
    label: 'AI-Search Optimization',
    shortLabel: 'AI-Search',
    tooltip:
      'Readiness for Google AI Overviews, ChatGPT, Perplexity, Gemini, and Copilot based on quotable Q&A structure, entity clarity, schema, citations, llms.txt, and AI crawler access.',
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  report,
  retryingSection,
  onRetrySection,
  onRerunAudit,
  onNewAudit,
}) => {
  const [activeTab, setActiveTab] = useState<AuditSectionId>('seo');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const overallScore = useMemo(() => computeOverallScore(report), [report]);
  const quickWins = useMemo(() => deriveTopQuickWins(report), [report]);
  const roadmap = useMemo(() => deriveRoadmap(report), [report]);

  const pillarCards = [
    { id: 'seo' as const, title: 'SEO Score', score: report.seo?.score, isEstimate: report.seo?.isEstimate },
    { id: 'content' as const, title: 'Content Score', score: report.content?.score, isEstimate: report.content?.isEstimate },
    { id: 'keywords' as const, title: 'Keyword Score', score: report.keywords?.score, isEstimate: report.keywords?.isEstimate },
    { id: 'technical' as const, title: 'Technical SEO Score', score: report.technical?.score, isEstimate: report.technical?.isEstimate },
    { id: 'aiSearch' as const, title: 'AI-Search Readiness', score: report.aiSearch?.score, isEstimate: report.aiSearch?.isEstimate },
  ];

  const radarData = useMemo(
    () => [
      { metric: 'SEO', score: report.seo?.score ?? 0 },
      { metric: 'Content', score: report.content?.score ?? 0 },
      { metric: 'Keywords', score: report.keywords?.score ?? 0 },
      { metric: 'Technical', score: report.technical?.score ?? 0 },
      { metric: 'AI-Search', score: report.aiSearch?.score ?? 0 },
    ],
    [report]
  );

  const severityData = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let passed = 0;

    if (report.seo) {
      for (const c of report.seo.checks) {
        if (c.status === 'Fail') critical++;
        else if (c.status === 'Warning') warning++;
        else passed++;
      }
    }
    if (report.technical) {
      for (const t of report.technical.checks) {
        if (t.status === 'Fail') critical++;
        else if (t.status === 'Needs manual check') warning++;
        else passed++;
      }
    }
    if (report.aiSearch) {
      for (const s of report.aiSearch.signals) {
        if (s.status === 'Missing') critical++;
        else if (s.status === 'Partial' || s.status === 'Needs manual check') warning++;
        else passed++;
      }
    }

    return [
      { name: 'Critical', count: critical, color: '#DC2626' },
      { name: 'Warning / Check', count: warning, color: '#D97706' },
      { name: 'Passed', count: passed, color: '#16A34A' },
    ];
  }, [report]);

  const estimateSections = pillarCards.filter((p) => p.isEstimate).map((p) => p.title);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      await downloadPdfReport(report);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopySummary = async () => {
    const ok = await copyShareSummary(report);
    if (ok) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab(TABS[(idx + 1) % TABS.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length].id);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Executive Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Audited {new Date(report.createdAt).toLocaleString()}</span>
              {report.input.targetCountry && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Market: {report.input.targetCountry}</span>
                </>
              )}
              {report.input.businessType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Niche: {report.input.businessType}</span>
                </>
              )}
            </div>

            <h1 className="mt-2 break-all font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              <a
                href={report.inspection.normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {report.inspection.normalizedUrl}
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
            </h1>

            {/* Export & Actions Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap shrink-0 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {pdfLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {pdfLoading ? 'Generating PDF...' : 'Download PDF Report'}
              </button>

              <button
                type="button"
                onClick={() => downloadKeywordsCsv(report)}
                disabled={!report.keywords}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                Keywords CSV
              </button>

              <button
                type="button"
                onClick={() => downloadIssuesCsv(report)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                Issues CSV
              </button>

              <button
                type="button"
                onClick={() => downloadFullJson(report)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                JSON
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Copied Summary
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copy Share Summary
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onRerunAudit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                Re-run
              </button>

              <button
                type="button"
                onClick={onNewAudit}
                className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 whitespace-nowrap shrink-0 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                Audit Another Site
              </button>
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 dark:border-slate-800">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Overall Health Score</span>
              <InfoTooltip
                label="How Overall Health Score is calculated"
                explanation="Computed as the unweighted integer average of your 5 audit pillars (SEO, Content, Keyword Alignment, Technical SEO, and AI-Search Readiness), mapped to Grade A (90+), B (80-89), C (65-79), D (50-64), or F (0-49)."
              />
            </div>
            <ScoreGauge score={overallScore} />
          </div>
        </div>

        {/* Limited Read / Estimate Notice */}
        {(report.inspection.isEstimateMode || estimateSections.length > 0) && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <strong>Partial Read / Estimate Mode:</strong> {report.inspection.statusReason}{' '}
              {estimateSections.length > 0 && (
                <span>Sections relying on estimates: {estimateSections.join(', ')}.</span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 5 Score Cards */}
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Pillar scores">
        {pillarCards.map((card, idx) => {
          const tabMeta = TABS[idx];
          const err = report.sectionErrors?.[card.id];
          const isRetrying = retryingSection === card.id;
          const hasScore = typeof card.score === 'number';
          const colors = getScoreColorClasses(card.score ?? 0);
          const isActive = activeTab === card.id;

          return (
            <div
              key={card.id}
              className={`rounded-xl border bg-white p-5 transition-colors dark:bg-slate-900 ${
                isActive
                  ? 'border-indigo-600 ring-1 ring-indigo-600 dark:border-indigo-400 dark:ring-indigo-400'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(card.id)}
                  className="text-left text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
                >
                  {card.title}
                </button>
                <InfoTooltip label={`How ${card.title} is calculated`} explanation={tabMeta.tooltip} />
              </div>

              {err ? (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400">Section failed</div>
                  <button
                    type="button"
                    onClick={() => onRetrySection(card.id)}
                    disabled={isRetrying}
                    className="mt-2 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              ) : hasScore ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(card.id)}
                  className="mt-3 flex w-full items-baseline justify-between text-left"
                >
                  <span className={`font-mono text-3xl font-extrabold tabular-nums ${colors.text}`}>
                    {card.score}
                  </span>
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {colors.bandLabel}
                    {card.isEstimate ? ' · Est.' : ''}
                  </span>
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Analyzing...
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Visual Analytics Row: Radar + Issues Severity + Top 5 Quick Wins */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Radar Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Five-Pillar Radar Profile
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Balance across search, content, technical, and AI readiness
          </p>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#94a3b8" strokeOpacity={0.35} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#4F46E5"
                  fill="#14B8A6"
                  fillOpacity={0.32}
                  strokeWidth={2}
                />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart of Issues by Severity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Checks by Severity &amp; Status
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Aggregated across SEO, Technical, and AI-Search signals
          </p>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Checks" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Quick Wins */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Top 5 Quick Wins
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ranked by highest impact vs. lowest effort
          </p>
          <ol className="mt-4 space-y-3">
            {quickWins.length === 0 ? (
              <li className="text-xs text-slate-500 dark:text-slate-400">
                Quick wins will appear once analysis completes.
              </li>
            ) : (
              quickWins.map((qw, idx) => (
                <li key={qw.id} className="border-b border-slate-100 pb-2.5 last:border-b-0 last:pb-0 dark:border-slate-800">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {idx + 1}. {qw.title}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-teal-600 shrink-0 dark:text-teal-400">
                      {qw.impact}/{qw.effort}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{qw.action}</p>
                </li>
              ))
            )}
          </ol>
        </div>
      </section>

      {/* Section Tabs */}
      <section className="mt-8">
        <div
          role="tablist"
          aria-label="Audit report sections"
          className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900"
        >
          {TABS.map((tab, idx) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                  selected
                    ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          className="mt-6"
        >
          {report.sectionErrors?.[activeTab] ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900/60 dark:bg-slate-900">
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Could Not Load {TABS.find((t) => t.id === activeTab)?.label}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {report.sectionErrors[activeTab]}
              </p>
              <button
                type="button"
                onClick={() => onRetrySection(activeTab)}
                disabled={retryingSection === activeTab}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${retryingSection === activeTab ? 'animate-spin' : ''}`} />
                {retryingSection === activeTab ? 'Retrying Section...' : 'Retry Section'}
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'seo' && report.seo && <SeoAuditTab data={report.seo} />}
              {activeTab === 'content' && report.content && <ContentTab data={report.content} />}
              {activeTab === 'keywords' && report.keywords && <KeywordsTab data={report.keywords} />}
              {activeTab === 'technical' && report.technical && (
                <TechnicalTab auditId={report.id} data={report.technical} />
              )}
              {activeTab === 'aiSearch' && report.aiSearch && <AiSearchTab data={report.aiSearch} />}
            </>
          )}
        </div>
      </section>

      {/* Search Grounding Sources */}
      {report.inspection.searchSources.length > 0 && (
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Google Search Grounding Sources Used
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {report.inspection.searchSources.map((src, idx) => (
              <li key={idx}>
                <a
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Prioritised 30-60-90 Day Roadmap */}
      <RoadmapSection roadmap={roadmap} />
    </main>
  );
};
