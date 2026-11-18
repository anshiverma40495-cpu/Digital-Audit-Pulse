export type AuditSectionId = 'seo' | 'content' | 'keywords' | 'technical' | 'aiSearch';

export type CheckStatus = 'Pass' | 'Warning' | 'Fail';
export type TechnicalStatus = 'Pass' | 'Fail' | 'Needs manual check';
export type ImpactLevel = 'High' | 'Medium' | 'Low';
export type EffortLevel = 'Low' | 'Medium' | 'High';
export type SeverityLevel = 'Critical' | 'Warning' | 'Info';

export interface AuditInput {
  url: string;
  targetCountry?: string;
  businessType?: string;
  competitors: string[];
}

export interface SearchSource {
  title: string;
  uri: string;
}

export interface UrlRetrievalEntry {
  url: string;
  status: string;
}

export interface PageInspectionResult {
  normalizedUrl: string;
  domain: string;
  finalStatus: 'success' | 'partial' | 'blocked' | 'unreachable';
  statusReason: string;
  isEstimateMode: boolean;
  pageSummary: string;
  rawSignals: string;
  competitorInsights: string;
  robotsTxtFound: boolean;
  robotsTxtNotes: string;
  sitemapFound: boolean;
  llmsTxtFound: boolean;
  urlMetadata: UrlRetrievalEntry[];
  searchSources: SearchSource[];
  inspectedAt: string;
}

export interface ScoreBreakdownItem {
  factor: string;
  score: number;
  maxScore: number;
  note: string;
}

export interface SeoCheckItem {
  id: string;
  category: string;
  title: string;
  status: CheckStatus;
  found: string;
  whyItMatters: string;
  howToFix: string;
  impact: ImpactLevel;
  effort: EffortLevel;
}

export interface SeoAuditSection {
  score: number;
  summary: string;
  isEstimate: boolean;
  estimateReason?: string;
  scoreBreakdown: ScoreBreakdownItem[];
  checks: SeoCheckItem[];
}

export interface QualityDimension {
  dimension: 'Depth' | 'Readability' | 'Search Intent Match' | 'Freshness' | 'Calls to Action';
  score: number;
  assessment: string;
  recommendation: string;
}

export interface ContentIdea {
  title: string;
  targetKeyword: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  suggestedOutlineH2s: string[];
  priority: 'High' | 'Medium' | 'Low';
  rationale: string;
}

export interface CopyRewrite {
  element: 'Headline (H1)' | 'Meta Description' | 'Title Tag' | 'Primary CTA';
  before: string;
  after: string;
  whyBetter: string;
}

export interface ContentAuditSection {
  score: number;
  summary: string;
  isEstimate: boolean;
  estimateReason?: string;
  scoreBreakdown: ScoreBreakdownItem[];
  qualityDimensions: QualityDimension[];
  competitorGaps: string[];
  pageIdeas: ContentIdea[];
  copyRewrites: CopyRewrite[];
}

export interface KeywordSuggestion {
  keyword: string;
  group: 'Primary' | 'Secondary' | 'Long-tail';
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  estimatedDifficulty: 'Low' | 'Medium' | 'High';
  relativeOpportunityScore: number;
  suggestedTargetPage: string;
  estimatedSearchDemand: string;
}

export interface KeywordsAuditSection {
  score: number;
  summary: string;
  isEstimate: boolean;
  estimateReason?: string;
  scoreBreakdown: ScoreBreakdownItem[];
  keywords: KeywordSuggestion[];
}

export interface TechnicalCheckItem {
  id: string;
  title: string;
  status: TechnicalStatus;
  severity: SeverityLevel;
  explanation: string;
  fix: string;
  verificationNote: string;
}

export interface TechnicalAuditSection {
  score: number;
  summary: string;
  isEstimate: boolean;
  estimateReason?: string;
  scoreBreakdown: ScoreBreakdownItem[];
  checks: TechnicalCheckItem[];
}

export interface AiPlatformReadiness {
  platform: 'Google AI Overviews' | 'ChatGPT' | 'Perplexity' | 'Gemini' | 'Copilot';
  readinessScore: number;
  status: 'Strong' | 'Moderate' | 'Needs Work';
  keyGap: string;
}

export interface AiReadinessSignal {
  area:
    | 'Quotable Answers & Q&A Structure'
    | 'Entity Clarity & Consistent NAP'
    | 'Schema Markup Coverage'
    | 'Source Credibility & Authorship'
    | 'llms.txt & AI Crawler Access'
    | 'Brand Mentions & Topical Authority';
  status: 'Strong' | 'Partial' | 'Missing' | 'Needs manual check';
  finding: string;
  action: string;
}

export interface SchemaRecommendation {
  schemaType: 'Organization' | 'FAQPage' | 'Article' | 'Service' | 'LocalBusiness' | 'Person';
  priority: 'High' | 'Medium' | 'Low';
  purpose: string;
  implementationNote: string;
}

export interface FaqPair {
  question: string;
  answer: string;
}

export interface AiSearchAuditSection {
  score: number;
  summary: string;
  isEstimate: boolean;
  estimateReason?: string;
  scoreBreakdown: ScoreBreakdownItem[];
  platforms: AiPlatformReadiness[];
  signals: AiReadinessSignal[];
  schemaRecommendations: SchemaRecommendation[];
  recommendations: {
    title: string;
    detail: string;
    impact: ImpactLevel;
    effort: EffortLevel;
  }[];
  sampleFaqs: FaqPair[];
}

export interface QuickWinItem {
  id: string;
  section: string;
  title: string;
  action: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  rankScore: number;
}

export interface RoadmapAction {
  phase: '30 Days (Quick Wins & Critical Fixes)' | '60 Days (Content & Authority Growth)' | '90 Days (Scale & AI-Search Moat)';
  items: {
    title: string;
    section: string;
    impact: ImpactLevel;
    effort: EffortLevel;
    outcome: string;
  }[];
}

export interface SectionErrorState {
  seo?: string;
  content?: string;
  keywords?: string;
  technical?: string;
  aiSearch?: string;
}

export interface FullAuditReport {
  id: string;
  createdAt: string;
  input: AuditInput;
  inspection: PageInspectionResult;
  seo: SeoAuditSection | null;
  content: ContentAuditSection | null;
  keywords: KeywordsAuditSection | null;
  technical: TechnicalAuditSection | null;
  aiSearch: AiSearchAuditSection | null;
  sectionErrors?: SectionErrorState;
}

export function normalizeAuditUrl(rawUrl: string): { valid: boolean; normalized?: string; domain?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a website URL.' };
  }
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported.' };
    }
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('.') || host.endsWith('.')) {
      return { valid: false, error: 'Please enter a valid domain name (for example, example.com).' };
    }
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host === '0.0.0.0' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return { valid: false, error: 'Local or private network addresses cannot be audited.' };
    }
    return {
      valid: true,
      normalized: parsed.toString(),
      domain: host.replace(/^www\./, ''),
    };
  } catch {
    return { valid: false, error: 'That URL format looks invalid. Example: https://example.com' };
  }
}

export function computeOverallScore(report: FullAuditReport): number {
  const scores: number[] = [];
  if (report.seo) scores.push(report.seo.score);
  if (report.content) scores.push(report.content.score);
  if (report.keywords) scores.push(report.keywords.score);
  if (report.technical) scores.push(report.technical.score);
  if (report.aiSearch) scores.push(report.aiSearch.score);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((acc, s) => acc + s, 0) / scores.length);
}

export function scoreToGrade(score: number): { grade: 'A' | 'B' | 'C' | 'D' | 'F'; label: string } {
  if (score >= 90) return { grade: 'A', label: 'Excellent' };
  if (score >= 80) return { grade: 'B', label: 'Healthy' };
  if (score >= 65) return { grade: 'C', label: 'Needs Improvement' };
  if (score >= 50) return { grade: 'D', label: 'Underperforming' };
  return { grade: 'F', label: 'Critical Issues' };
}

export function getScoreColorClasses(score: number): {
  text: string;
  bg: string;
  border: string;
  stroke: string;
  hex: string;
  bandLabel: string;
} {
  if (score >= 80) {
    return {
      text: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800/70',
      stroke: '#16A34A',
      hex: '#16A34A',
      bandLabel: 'Strong',
    };
  }
  if (score >= 50) {
    return {
      text: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/70',
      stroke: '#D97706',
      hex: '#D97706',
      bandLabel: 'Moderate',
    };
  }
  return {
    text: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-200 dark:border-red-800/70',
    stroke: '#DC2626',
    hex: '#DC2626',
    bandLabel: 'Critical',
  };
}

export function deriveTopQuickWins(report: FullAuditReport): QuickWinItem[] {
  const impactWeight = { High: 3, Medium: 2, Low: 1 };
  const effortWeight = { Low: 3, Medium: 2, High: 1 };
  const items: QuickWinItem[] = [];

  if (report.seo) {
    for (const check of report.seo.checks) {
      if (check.status === 'Fail' || check.status === 'Warning') {
        const statusBonus = check.status === 'Fail' ? 2 : 0;
        items.push({
          id: `seo-${check.id}`,
          section: 'SEO Audit',
          title: check.title,
          action: check.howToFix,
          impact: check.impact,
          effort: check.effort,
          rankScore: impactWeight[check.impact] * 3 + effortWeight[check.effort] * 2 + statusBonus,
        });
      }
    }
  }

  if (report.technical) {
    for (const check of report.technical.checks) {
      if (check.status === 'Fail') {
        const imp: ImpactLevel = check.severity === 'Critical' ? 'High' : 'Medium';
        items.push({
          id: `tech-${check.id}`,
          section: 'Technical SEO',
          title: check.title,
          action: check.fix,
          impact: imp,
          effort: 'Low',
          rankScore: impactWeight[imp] * 3 + 6 + (check.severity === 'Critical' ? 2 : 0),
        });
      }
    }
  }

  if (report.aiSearch) {
    report.aiSearch.recommendations.forEach((rec, idx) => {
      items.push({
        id: `ai-${idx}`,
        section: 'AI-Search',
        title: rec.title,
        action: rec.detail,
        impact: rec.impact,
        effort: rec.effort,
        rankScore: impactWeight[rec.impact] * 3 + effortWeight[rec.effort] * 2,
      });
    });
  }

  if (report.content) {
    report.content.copyRewrites.forEach((rw, idx) => {
      items.push({
        id: `copy-${idx}`,
        section: 'Content',
        title: `Update ${rw.element}`,
        action: `Change to: "${rw.after}" — ${rw.whyBetter}`,
        impact: 'High',
        effort: 'Low',
        rankScore: 15,
      });
    });
  }

  return items.sort((a, b) => b.rankScore - a.rankScore).slice(0, 5);
}

export function deriveRoadmap(report: FullAuditReport): RoadmapAction[] {
  const days30: RoadmapAction['items'] = [];
  const days60: RoadmapAction['items'] = [];
  const days90: RoadmapAction['items'] = [];

  if (report.seo) {
    for (const c of report.seo.checks) {
      if (c.status === 'Pass') continue;
      const entry = {
        title: c.title,
        section: 'SEO Audit',
        impact: c.impact,
        effort: c.effort,
        outcome: c.howToFix,
      };
      if (c.effort === 'Low' || (c.status === 'Fail' && c.impact === 'High')) {
        days30.push(entry);
      } else if (c.effort === 'Medium') {
        days60.push(entry);
      } else {
        days90.push(entry);
      }
    }
  }

  if (report.technical) {
    for (const t of report.technical.checks) {
      if (t.status === 'Pass') continue;
      const imp: ImpactLevel = t.severity === 'Critical' ? 'High' : t.severity === 'Warning' ? 'Medium' : 'Low';
      const entry = {
        title: t.title,
        section: 'Technical SEO',
        impact: imp,
        effort: t.severity === 'Critical' ? ('Medium' as EffortLevel) : ('Low' as EffortLevel),
        outcome: t.fix,
      };
      if (t.status === 'Fail' && t.severity === 'Critical') {
        days30.push(entry);
      } else if (t.status === 'Fail') {
        days60.push(entry);
      } else {
        days60.push(entry);
      }
    }
  }

  if (report.content) {
    report.content.copyRewrites.slice(0, 2).forEach((rw) => {
      days30.push({
        title: `Refresh ${rw.element}`,
        section: 'Content',
        impact: 'High',
        effort: 'Low',
        outcome: rw.whyBetter,
      });
    });
    report.content.pageIdeas.forEach((idea) => {
      const target = idea.priority === 'High' ? days60 : days90;
      target.push({
        title: `Publish: ${idea.title}`,
        section: 'Content',
        impact: idea.priority === 'High' ? 'High' : 'Medium',
        effort: 'Medium',
        outcome: `Target keyword "${idea.targetKeyword}" (${idea.searchIntent} intent).`,
      });
    });
  }

  if (report.aiSearch) {
    report.aiSearch.recommendations.forEach((rec) => {
      const entry = {
        title: rec.title,
        section: 'AI-Search',
        impact: rec.impact,
        effort: rec.effort,
        outcome: rec.detail,
      };
      if (rec.effort === 'Low' && rec.impact === 'High') {
        days30.push(entry);
      } else if (rec.effort === 'High') {
        days90.push(entry);
      } else {
        days60.push(entry);
      }
    });
  }

  return [
    {
      phase: '30 Days (Quick Wins & Critical Fixes)',
      items: days30.slice(0, 8),
    },
    {
      phase: '60 Days (Content & Authority Growth)',
      items: days60.slice(0, 8),
    },
    {
      phase: '90 Days (Scale & AI-Search Moat)',
      items: days90.slice(0, 8),
    },
  ];
}
