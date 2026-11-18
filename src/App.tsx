import { useCallback, useEffect, useState } from 'react';
import { AuditErrorInfo, ErrorBanner } from './components/ErrorBanner';
import { AuditHistoryView } from './components/AuditHistoryView';
import { AuditProgressLoader, AuditProgressState } from './components/AuditProgressLoader';
import { DashboardView } from './components/DashboardView';
import { AppView, Header } from './components/Header';
import { LandingView } from './components/LandingView';
import {
  AiSearchAuditSection,
  AuditInput,
  AuditSectionId,
  ContentAuditSection,
  FullAuditReport,
  KeywordsAuditSection,
  PageInspectionResult,
  SectionErrorState,
  SeoAuditSection,
  TechnicalAuditSection,
} from './types/audit';
import { deleteAuditFromHistory, getAuditHistory, saveAuditToHistory } from './utils/storage';

const SECTION_IDS: AuditSectionId[] = ['seo', 'content', 'keywords', 'technical', 'aiSearch'];

const INITIAL_PROGRESS: AuditProgressState = {
  reading: 'queued',
  seo: 'queued',
  content: 'queued',
  keywords: 'queued',
  technical: 'queued',
  aiSearch: 'queued',
  errors: {},
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const [view, setView] = useState<AppView>('landing');
  const [history, setHistory] = useState<FullAuditReport[]>(() => getAuditHistory());
  const [activeReport, setActiveReport] = useState<FullAuditReport | null>(null);
  const [lastInput, setLastInput] = useState<AuditInput | undefined>(undefined);
  const [pendingInspection, setPendingInspection] = useState<PageInspectionResult | null>(null);
  const [progress, setProgress] = useState<AuditProgressState>(INITIAL_PROGRESS);
  const [auditError, setAuditError] = useState<AuditErrorInfo | null>(null);
  const [retryingSection, setRetryingSection] = useState<AuditSectionId | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('dap_theme', 'dark');
      } catch {
        // Ignore
      }
    } else {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('dap_theme', 'light');
      } catch {
        // Ignore
      }
    }
  }, [darkMode]);

  const fetchSection = async (
    section: AuditSectionId,
    input: AuditInput,
    inspection: PageInspectionResult
  ) => {
    const res = await fetch(`/api/audit/section/${section}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, inspection }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Failed to analyze ${section}`);
    }
    return data;
  };

  const runParallelSections = useCallback(
    async (input: AuditInput, inspection: PageInspectionResult) => {
      setAuditError(null);
      setView('loading');
      setProgress({
        reading: 'done',
        seo: 'running',
        content: 'running',
        keywords: 'running',
        technical: 'running',
        aiSearch: 'running',
        errors: {},
      });

      const sectionErrors: SectionErrorState = {};
      const results: Partial<Record<AuditSectionId, unknown>> = {};

      await Promise.all(
        SECTION_IDS.map(async (sectionId) => {
          try {
            const sectionData = await fetchSection(sectionId, input, inspection);
            results[sectionId] = sectionData;
            setProgress((prev) => ({
              ...prev,
              [sectionId]: 'done',
            }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Section analysis failed.';
            sectionErrors[sectionId] = msg;
            setProgress((prev) => ({
              ...prev,
              [sectionId]: 'error',
              errors: { ...prev.errors, [sectionId]: msg },
            }));
          }
        })
      );

      const hasAnySuccess = SECTION_IDS.some((s) => Boolean(results[s]));
      if (!hasAnySuccess) {
        setAuditError({
          code: 'API_FAILURE',
          title: 'Audit Analysis Failed',
          message:
            sectionErrors.seo ||
            'All analysis sections failed to respond from the Gemini API. Please check your connection or API quota and retry.',
          url: inspection.normalizedUrl,
        });
        return;
      }

      const report: FullAuditReport = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        input,
        inspection,
        seo: (results.seo as SeoAuditSection) ?? null,
        content: (results.content as ContentAuditSection) ?? null,
        keywords: (results.keywords as KeywordsAuditSection) ?? null,
        technical: (results.technical as TechnicalAuditSection) ?? null,
        aiSearch: (results.aiSearch as AiSearchAuditSection) ?? null,
        sectionErrors: Object.keys(sectionErrors).length > 0 ? sectionErrors : undefined,
      };

      setActiveReport(report);
      setHistory(saveAuditToHistory(report));
      setView('dashboard');
    },
    []
  );

  const handleStartAudit = async (input: AuditInput) => {
    setLastInput(input);
    setAuditError(null);
    setPendingInspection(null);
    setView('loading');
    setProgress({
      ...INITIAL_PROGRESS,
      reading: 'running',
    });

    try {
      const res = await fetch('/api/audit/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();

      if (!res.ok) {
        const code =
          data.errorCode === 'INVALID_URL'
            ? 'INVALID_URL'
            : data.errorCode === 'UNREACHABLE_SITE'
            ? 'UNREACHABLE_SITE'
            : 'API_FAILURE';
        setAuditError({
          code,
          title:
            code === 'INVALID_URL'
              ? 'Invalid Website URL'
              : code === 'UNREACHABLE_SITE'
              ? 'Website Could Not Be Reached'
              : 'Audit Request Failed',
          message: data.message || 'Could not inspect the submitted website.',
          url: input.url,
        });
        return;
      }

      const inspection = data as PageInspectionResult;

      if (inspection.finalStatus === 'unreachable') {
        setAuditError({
          code: 'UNREACHABLE_SITE',
          title: 'Website Unreachable',
          message: inspection.statusReason,
          url: inspection.normalizedUrl,
        });
        return;
      }

      if (inspection.finalStatus === 'blocked') {
        setPendingInspection(inspection);
        setAuditError({
          code: 'BLOCKED_BY_ROBOTS',
          title: 'Page Blocked Automated Inspection',
          message: `${inspection.statusReason} You can retry, or run an Estimated Audit using publicly indexed search context (sections without live HTML access will be clearly marked as estimates).`,
          url: inspection.normalizedUrl,
        });
        return;
      }

      await runParallelSections(input, inspection);
    } catch (err) {
      setAuditError({
        code: 'API_FAILURE',
        title: 'Network or Server Error',
        message: err instanceof Error ? err.message : 'Unable to reach the audit server. Please retry.',
        url: input.url,
      });
    }
  };

  const handleRetrySection = async (section: AuditSectionId) => {
    if (!activeReport) return;
    setRetryingSection(section);
    try {
      const data = await fetchSection(section, activeReport.input, activeReport.inspection);
      const nextErrors = { ...(activeReport.sectionErrors || {}) };
      delete nextErrors[section];

      const updated: FullAuditReport = {
        ...activeReport,
        [section]: data,
        sectionErrors: Object.keys(nextErrors).length > 0 ? nextErrors : undefined,
      };
      setActiveReport(updated);
      setHistory(saveAuditToHistory(updated));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Retry failed.';
      setActiveReport((prev) =>
        prev
          ? {
              ...prev,
              sectionErrors: { ...(prev.sectionErrors || {}), [section]: msg },
            }
          : prev
      );
    } finally {
      setRetryingSection(null);
    }
  };

  const handleDeleteHistory = (id: string) => {
    const next = deleteAuditFromHistory(id);
    setHistory(next);
    if (activeReport?.id === id) {
      setActiveReport(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Header
        activeView={view}
        hasActiveReport={Boolean(activeReport)}
        historyCount={history.length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onNavigate={(nextView) => {
          setAuditError(null);
          setView(nextView);
        }}
      />

      <div className="flex-1">
        {auditError ? (
          <ErrorBanner
            error={auditError}
            onRetry={() => {
              if (lastInput) handleStartAudit(lastInput);
              else setAuditError(null);
            }}
            onProceedEstimated={
              auditError.code === 'BLOCKED_BY_ROBOTS' && lastInput && pendingInspection
                ? () => runParallelSections(lastInput, pendingInspection)
                : undefined
            }
            onBack={() => {
              setAuditError(null);
              setView('landing');
            }}
          />
        ) : view === 'loading' ? (
          <AuditProgressLoader
            targetUrl={lastInput?.url || ''}
            progress={progress}
            onRetrySection={handleRetrySection}
            onCancel={() => setView('landing')}
          />
        ) : view === 'dashboard' && activeReport ? (
          <DashboardView
            report={activeReport}
            retryingSection={retryingSection}
            onRetrySection={handleRetrySection}
            onRerunAudit={() => handleStartAudit(activeReport.input)}
            onNewAudit={() => setView('landing')}
          />
        ) : view === 'history' ? (
          <AuditHistoryView
            history={history}
            onOpenReport={(report) => {
              setActiveReport(report);
              setView('dashboard');
            }}
            onDeleteReport={handleDeleteHistory}
            onBack={() => setView('landing')}
          />
        ) : (
          <LandingView
            initialInput={lastInput}
            recentAudits={history}
            onStartAudit={handleStartAudit}
            onOpenReport={(report) => {
              setActiveReport(report);
              setView('dashboard');
            }}
            onOpenHistory={() => setView('history')}
          />
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white py-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Digital Audit Pulse</span>
          <p>
            Scores are AI-generated estimates based on the publicly readable page. Verify critical findings with Google Search Console, PageSpeed Insights and your analytics.
          </p>
        </div>
      </footer>
    </div>
  );
}
