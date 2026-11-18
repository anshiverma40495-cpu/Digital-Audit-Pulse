import React, { useState } from 'react';
import { ArrowRight, Globe, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { AuditInput, FullAuditReport, computeOverallScore, getScoreColorClasses, normalizeAuditUrl, scoreToGrade } from '../types/audit';

interface LandingViewProps {
  initialInput?: AuditInput;
  recentAudits: FullAuditReport[];
  onStartAudit: (input: AuditInput) => void;
  onOpenReport: (report: FullAuditReport) => void;
  onOpenHistory: () => void;
}

const COUNTRY_PRESETS = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'India',
  'Singapore',
  'Global',
];

export const LandingView: React.FC<LandingViewProps> = ({
  initialInput,
  recentAudits,
  onStartAudit,
  onOpenReport,
  onOpenHistory,
}) => {
  const [url, setUrl] = useState(initialInput?.url || '');
  const [targetCountry, setTargetCountry] = useState(initialInput?.targetCountry || '');
  const [businessType, setBusinessType] = useState(initialInput?.businessType || '');
  const [competitors, setCompetitors] = useState<string[]>(initialInput?.competitors || []);
  const [showOptions, setShowOptions] = useState(
    Boolean(initialInput?.targetCountry || initialInput?.businessType || (initialInput?.competitors?.length ?? 0) > 0)
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAddCompetitor = () => {
    if (competitors.length < 3) {
      setCompetitors([...competitors, '']);
    }
  };

  const handleCompetitorChange = (idx: number, val: string) => {
    const next = [...competitors];
    next[idx] = val;
    setCompetitors(next);
  };

  const handleRemoveCompetitor = (idx: number) => {
    setCompetitors(competitors.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = normalizeAuditUrl(url);
    if (!check.valid || !check.normalized) {
      setValidationError(check.error || 'Please enter a valid website URL.');
      return;
    }

    const cleanedCompetitors: string[] = [];
    for (const comp of competitors) {
      const trimmed = comp.trim();
      if (!trimmed) continue;
      const compCheck = normalizeAuditUrl(trimmed);
      if (!compCheck.valid || !compCheck.normalized) {
        setValidationError(`Competitor URL "${trimmed}" is invalid. ${compCheck.error || ''}`);
        return;
      }
      cleanedCompetitors.push(compCheck.normalized);
    }

    setValidationError(null);
    setUrl(check.normalized);
    onStartAudit({
      url: check.normalized,
      targetCountry: targetCountry.trim() || undefined,
      businessType: businessType.trim() || undefined,
      competitors: cleanedCompetitors,
    });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
          SEO · Content · Keywords · Technical · AI-Search Readiness
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white" style={{ textWrap: 'balance' }}>
          Digital Audit Pulse
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300" style={{ textWrap: 'balance' }}>
          Know your website&apos;s pulse in 60 seconds.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-3xl">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
        >
          <label htmlFor="audit-url-input" className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            Website URL
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Globe
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                id="audit-url-input"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="example.com or https://example.com"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                aria-invalid={Boolean(validationError)}
                aria-describedby={validationError ? 'url-error-msg' : 'url-helper-msg'}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              Run Audit
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {validationError ? (
            <p id="url-error-msg" role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              {validationError}
            </p>
          ) : (
            <p id="url-helper-msg" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              https:// is added automatically if omitted. Public pages only.
            </p>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowOptions((v) => !v)}
              aria-expanded={showOptions}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition-colors hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              {showOptions ? 'Hide optional market & competitor context' : 'Add target country, niche, or competitors (optional)'}
            </button>

            {showOptions && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="target-country" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Target country or region
                    </label>
                    <input
                      id="target-country"
                      list="country-presets"
                      type="text"
                      placeholder="e.g. United States, UK, Global"
                      value={targetCountry}
                      onChange={(e) => setTargetCountry(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <datalist id="country-presets">
                      {COUNTRY_PRESETS.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label htmlFor="business-type" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Primary business type or niche
                    </label>
                    <input
                      id="business-type"
                      type="text"
                      placeholder="e.g. B2B payroll SaaS, dental clinic, artisan coffee"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Competitor URLs (up to 3)
                    </span>
                    {competitors.length < 3 && (
                      <button
                        type="button"
                        onClick={handleAddCompetitor}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Add competitor
                      </button>
                    )}
                  </div>
                  {competitors.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {competitors.map((comp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="url"
                            aria-label={`Competitor URL ${idx + 1}`}
                            placeholder={`https://competitor${idx + 1}.com`}
                            value={comp}
                            onChange={(e) => handleCompetitorChange(idx, e.target.value)}
                            className="h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveCompetitor(idx)}
                            aria-label={`Remove competitor ${idx + 1}`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* What gets audited */}
      <section className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: 'On-Page SEO',
            desc: 'Title tags, meta, headings, canonicals, schema, OG tags, and E-E-A-T signals.',
          },
          {
            title: 'Content Strategy',
            desc: 'Quality scoring, competitor content gaps, copy rewrites, and 8–10 article ideas.',
          },
          {
            title: 'Keyword Map',
            desc: '20–30 primary, secondary, and long-tail keywords with intent and opportunity score.',
          },
          {
            title: 'Technical Health',
            desc: 'Interactive 15-point checklist separating verified findings from manual checks.',
          },
          {
            title: 'AI-Search Ready',
            desc: 'Readiness for AI Overviews, ChatGPT, Perplexity, Gemini, Copilot, and llms.txt.',
          },
        ].map((pillar) => (
          <div
            key={pillar.title}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">{pillar.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{pillar.desc}</p>
          </div>
        ))}
      </section>

      {/* Recent Audit History */}
      {recentAudits.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">Recent Audits</h2>
            <button
              type="button"
              onClick={onOpenHistory}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              View all &amp; compare ({recentAudits.length})
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentAudits.slice(0, 3).map((item) => {
              const overall = computeOverallScore(item);
              const { grade } = scoreToGrade(overall);
              const colors = getScoreColorClasses(overall);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenReport(item)}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-sm font-semibold text-slate-900 dark:text-white">
                      {item.inspection.domain}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()} · Grade {grade}
                    </div>
                  </div>
                  <div className={`font-mono text-xl font-bold tabular-nums shrink-0 ${colors.text}`}>
                    {overall}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};
