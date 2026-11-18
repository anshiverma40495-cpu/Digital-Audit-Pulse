import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MODEL_NAME = 'gemini-2.5-flash';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function validateAndNormalizeUrl(raw: string): { valid: boolean; normalized?: string; origin?: string; domain?: string; error?: string } {
  const trimmed = (raw || '').trim();
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
      return { valid: false, error: 'Invalid domain format. Please enter a valid URL such as https://example.com.' };
    }
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host === '0.0.0.0' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return { valid: false, error: 'Local or private network URLs cannot be audited.' };
    }
    return {
      valid: true,
      normalized: parsed.toString(),
      origin: parsed.origin,
      domain: host.replace(/^www\./, ''),
    };
  } catch {
    return { valid: false, error: 'Invalid URL format. Please check the web address and try again.' };
  }
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = msg.includes('429') || msg.includes('503') || msg.includes('500') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 700 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function mapGeminiError(err: unknown): { status: number; errorCode: string; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY_MISSING')) {
    return {
      status: 500,
      errorCode: 'API_KEY_MISSING',
      message: 'Server API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (raw.includes('PERMISSION_DENIED') || raw.includes('403') || raw.includes('API_KEY_INVALID') || raw.includes('API key not valid')) {
    return {
      status: 403,
      errorCode: 'API_FAILURE',
      message: 'Gemini API authentication failed. Please check the API key in Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      errorCode: 'RATE_LIMITED',
      message: 'Gemini API rate limit reached. Please wait a moment and click Retry.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      errorCode: 'MODEL_NOT_FOUND',
      message: 'The configured Gemini model could not be reached. Please try again.',
    };
  }
  return {
    status: 500,
    errorCode: 'API_FAILURE',
    message: `Audit analysis failed: ${raw.slice(0, 220)}`,
  };
}

function clampScore(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

// Schemas for the 5 parallel structured Gemini calls
const scoreBreakdownSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      factor: { type: Type.STRING },
      score: { type: Type.INTEGER },
      maxScore: { type: Type.INTEGER },
      note: { type: Type.STRING },
    },
    required: ['factor', 'score', 'maxScore', 'note'],
  },
};

const seoSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    isEstimate: { type: Type.BOOLEAN },
    estimateReason: { type: Type.STRING },
    scoreBreakdown: scoreBreakdownSchema,
    checks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          category: { type: Type.STRING },
          title: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['Pass', 'Warning', 'Fail'] },
          found: { type: Type.STRING },
          whyItMatters: { type: Type.STRING },
          howToFix: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          effort: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
        },
        required: ['id', 'category', 'title', 'status', 'found', 'whyItMatters', 'howToFix', 'impact', 'effort'],
      },
    },
  },
  required: ['score', 'summary', 'isEstimate', 'scoreBreakdown', 'checks'],
};

const contentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    isEstimate: { type: Type.BOOLEAN },
    estimateReason: { type: Type.STRING },
    scoreBreakdown: scoreBreakdownSchema,
    qualityDimensions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: {
            type: Type.STRING,
            enum: ['Depth', 'Readability', 'Search Intent Match', 'Freshness', 'Calls to Action'],
          },
          score: { type: Type.INTEGER },
          assessment: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
        required: ['dimension', 'score', 'assessment', 'recommendation'],
      },
    },
    competitorGaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    pageIdeas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          targetKeyword: { type: Type.STRING },
          searchIntent: { type: Type.STRING, enum: ['Informational', 'Commercial', 'Transactional', 'Navigational'] },
          suggestedOutlineH2s: { type: Type.ARRAY, items: { type: Type.STRING } },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          rationale: { type: Type.STRING },
        },
        required: ['title', 'targetKeyword', 'searchIntent', 'suggestedOutlineH2s', 'priority', 'rationale'],
      },
    },
    copyRewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          element: { type: Type.STRING, enum: ['Headline (H1)', 'Meta Description', 'Title Tag', 'Primary CTA'] },
          before: { type: Type.STRING },
          after: { type: Type.STRING },
          whyBetter: { type: Type.STRING },
        },
        required: ['element', 'before', 'after', 'whyBetter'],
      },
    },
  },
  required: ['score', 'summary', 'isEstimate', 'scoreBreakdown', 'qualityDimensions', 'competitorGaps', 'pageIdeas', 'copyRewrites'],
};

const keywordsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    isEstimate: { type: Type.BOOLEAN },
    estimateReason: { type: Type.STRING },
    scoreBreakdown: scoreBreakdownSchema,
    keywords: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING },
          group: { type: Type.STRING, enum: ['Primary', 'Secondary', 'Long-tail'] },
          intent: { type: Type.STRING, enum: ['Informational', 'Commercial', 'Transactional', 'Navigational'] },
          estimatedDifficulty: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
          relativeOpportunityScore: { type: Type.INTEGER },
          suggestedTargetPage: { type: Type.STRING },
          estimatedSearchDemand: { type: Type.STRING },
        },
        required: ['keyword', 'group', 'intent', 'estimatedDifficulty', 'relativeOpportunityScore', 'suggestedTargetPage', 'estimatedSearchDemand'],
      },
    },
  },
  required: ['score', 'summary', 'isEstimate', 'scoreBreakdown', 'keywords'],
};

const technicalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    isEstimate: { type: Type.BOOLEAN },
    estimateReason: { type: Type.STRING },
    scoreBreakdown: scoreBreakdownSchema,
    checks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['Pass', 'Fail', 'Needs manual check'] },
          severity: { type: Type.STRING, enum: ['Critical', 'Warning', 'Info'] },
          explanation: { type: Type.STRING },
          fix: { type: Type.STRING },
          verificationNote: { type: Type.STRING },
        },
        required: ['id', 'title', 'status', 'severity', 'explanation', 'fix', 'verificationNote'],
      },
    },
  },
  required: ['score', 'summary', 'isEstimate', 'scoreBreakdown', 'checks'],
};

const aiSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER },
    summary: { type: Type.STRING },
    isEstimate: { type: Type.BOOLEAN },
    estimateReason: { type: Type.STRING },
    scoreBreakdown: scoreBreakdownSchema,
    platforms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          platform: {
            type: Type.STRING,
            enum: ['Google AI Overviews', 'ChatGPT', 'Perplexity', 'Gemini', 'Copilot'],
          },
          readinessScore: { type: Type.INTEGER },
          status: { type: Type.STRING, enum: ['Strong', 'Moderate', 'Needs Work'] },
          keyGap: { type: Type.STRING },
        },
        required: ['platform', 'readinessScore', 'status', 'keyGap'],
      },
    },
    signals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          area: {
            type: Type.STRING,
            enum: [
              'Quotable Answers & Q&A Structure',
              'Entity Clarity & Consistent NAP',
              'Schema Markup Coverage',
              'Source Credibility & Authorship',
              'llms.txt & AI Crawler Access',
              'Brand Mentions & Topical Authority',
            ],
          },
          status: { type: Type.STRING, enum: ['Strong', 'Partial', 'Missing', 'Needs manual check'] },
          finding: { type: Type.STRING },
          action: { type: Type.STRING },
        },
        required: ['area', 'status', 'finding', 'action'],
      },
    },
    schemaRecommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          schemaType: {
            type: Type.STRING,
            enum: ['Organization', 'FAQPage', 'Article', 'Service', 'LocalBusiness', 'Person'],
          },
          priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          purpose: { type: Type.STRING },
          implementationNote: { type: Type.STRING },
        },
        required: ['schemaType', 'priority', 'purpose', 'implementationNote'],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
          effort: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
        },
        required: ['title', 'detail', 'impact', 'effort'],
      },
    },
    sampleFaqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ['question', 'answer'],
      },
    },
  },
  required: [
    'score',
    'summary',
    'isEstimate',
    'scoreBreakdown',
    'platforms',
    'signals',
    'schemaRecommendations',
    'recommendations',
    'sampleFaqs',
  ],
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Step 1: Read the submitted page via Gemini URL Context + Google Search grounding
  app.post('/api/audit/inspect', async (req: Request, res: Response) => {
    try {
      const { url, targetCountry, businessType, competitors } = req.body || {};
      const check = validateAndNormalizeUrl(url);
      if (!check.valid || !check.normalized || !check.origin || !check.domain) {
        res.status(400).json({ errorCode: 'INVALID_URL', message: check.error || 'Invalid URL' });
        return;
      }

      const normalizedCompetitors: string[] = Array.isArray(competitors)
        ? competitors
            .map((c: string) => validateAndNormalizeUrl(c))
            .filter((r) => r.valid && r.normalized)
            .map((r) => r.normalized as string)
            .slice(0, 3)
        : [];

      const ai = getAiClient();
      const robotsUrl = `${check.origin}/robots.txt`;
      const sitemapUrl = `${check.origin}/sitemap.xml`;
      const llmsUrl = `${check.origin}/llms.txt`;

      const urlsToRead = [check.normalized, robotsUrl, sitemapUrl, llmsUrl, ...normalizedCompetitors];

      const urlContextPrompt = `Inspect the following URLs using your URL Context tool and provide a comprehensive, strictly factual technical & content dossier. DO NOT invent any tags or copy that you did not observe. If a URL cannot be read or is blocked, state clearly why.

Target page to audit: ${check.normalized}
Technical companion endpoints to check:
- ${robotsUrl}
- ${sitemapUrl}
- ${llmsUrl}
${normalizedCompetitors.length > 0 ? `Competitor URLs to inspect:\n${normalizedCompetitors.map((c) => `- ${c}`).join('\n')}` : ''}

Report in structured sections:
1. PAGE_RETRIEVAL_STATUS: Did ${check.normalized} load cleanly? Mention HTTP/access blocks, Cloudflare/bot walls, or empty JS shell if observed.
2. EXACT_SEO_SIGNALS: Exact <title> text and character count, exact <meta name="description"> text and character count, canonical tag URL, meta robots directives, viewport tag, Open Graph tags (og:title, og:description, og:image), Twitter card tags, JSON-LD/schema types detected, all H1/H2/H3 headings, image count and alt attribute observations, internal vs external links observed.
3. PAGE_COPY_AND_OFFERINGS: Brand name, products/services offered, target audience, primary headline (H1), subheadline, primary CTAs, pricing/trust/author/about/contact/NAP signals (E-E-A-T), word count estimate, content freshness cues.
4. ROBOTS_SITEMAP_LLMS: Whether ${robotsUrl} exists and whether GPTBot, Google-Extended, PerplexityBot, OAI-SearchBot, or User-agent: * rules are present; whether ${sitemapUrl} exists; whether ${llmsUrl} exists.
5. COMPETITOR_OBSERVATIONS: Key positioning, content depth, and topics observed on the competitor URLs (if provided).`;

      const searchPrompt = `Perform Google Search research for the website ${check.domain} (${check.normalized}).
Context:
- Target country / market: ${targetCountry || 'Global / Not specified'}
- Primary business type / niche: ${businessType || 'Infer from the brand and domain'}
${normalizedCompetitors.length > 0 ? `- Known competitors: ${normalizedCompetitors.join(', ')}` : '- Identify 3-5 likely direct search competitors in this niche and target market.'}

Gather factual findings on:
1. Indexed presence and brand authority of ${check.domain} (brand mentions, reviews, third-party citations, knowledge panel/entity signals).
2. Direct competitors ranking in Google Search for this business type and target country.
3. High-intent keyword themes, commercial & informational topics, and common buyer questions in this niche.
4. Whether the site appears unreachable/non-existent in Google Search at all.`;

      const [urlResponse, searchResponse] = await Promise.all([
        callWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: urlContextPrompt,
            config: {
              tools: [{ urlContext: {} }],
            },
          })
        ),
        callWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }],
            },
          })
        ),
      ]);

      const urlMetaRaw = (urlResponse.candidates?.[0] as unknown as {
        urlContextMetadata?: { urlMetadata?: Array<{ retrievedUrl?: string; urlRetrievalStatus?: string }> };
      })?.urlContextMetadata?.urlMetadata;

      const urlMetadata = Array.isArray(urlMetaRaw)
        ? urlMetaRaw.map((m) => ({
            url: m.retrievedUrl || '',
            status: m.urlRetrievalStatus || 'UNKNOWN',
          }))
        : [];

      const groundingChunks = (searchResponse.candidates?.[0] as unknown as {
        groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
      })?.groundingMetadata?.groundingChunks;

      const searchSources = Array.isArray(groundingChunks)
        ? groundingChunks
            .filter((c) => c.web?.uri)
            .map((c) => ({
              title: c.web?.title || c.web?.uri || 'Search source',
              uri: c.web?.uri || '',
            }))
            .slice(0, 12)
        : [];

      const rawSignals = urlResponse.text || '';
      const competitorInsights = searchResponse.text || '';

      const targetMeta = urlMetadata.find(
        (m) => m.url === check.normalized || m.url.replace(/\/$/, '') === check.normalized!.replace(/\/$/, '')
      );
      const targetStatusStr = targetMeta?.status || '';
      const targetSucceeded =
        targetStatusStr === 'URL_RETRIEVAL_STATUS_SUCCESS' ||
        (urlMetadata.length === 0 && rawSignals.length > 250 && !/could not (access|read|retrieve|fetch)|unable to (access|read|retrieve|fetch)/i.test(rawSignals.slice(0, 400)));

      const robotsMeta = urlMetadata.find((m) => m.url.includes('/robots.txt'));
      const sitemapMeta = urlMetadata.find((m) => m.url.includes('/sitemap.xml'));
      const llmsMeta = urlMetadata.find((m) => m.url.includes('/llms.txt'));

      const robotsBlocked =
        /blocked by robots|robots\.txt disallow|403 forbidden|cloudflare|access denied|bot protection/i.test(rawSignals) ||
        targetStatusStr.includes('ROBOTS') ||
        targetStatusStr.includes('PAYWALL');

      const unreachableSignals =
        !targetSucceeded &&
        searchSources.length === 0 &&
        /does not exist|nxdomain|dns|unreachable|could not resolve|no indexed results/i.test(`${rawSignals}\n${competitorInsights}`);

      let finalStatus: 'success' | 'partial' | 'blocked' | 'unreachable' = 'success';
      let statusReason = 'Live page and companion endpoints inspected cleanly.';

      if (unreachableSignals) {
        finalStatus = 'unreachable';
        statusReason = `Could not reach ${check.domain}. The domain may be offline, misspelled, or not publicly accessible.`;
      } else if (!targetSucceeded && robotsBlocked) {
        finalStatus = 'blocked';
        statusReason = `${check.domain} blocked automated page inspection (robots.txt or bot protection).`;
      } else if (!targetSucceeded) {
        finalStatus = 'partial';
        statusReason = `Direct page retrieval returned ${targetStatusStr || 'an incomplete response'}. Analysis relies partially on Google Search context and estimates.`;
      }

      const robotsTxtFound = robotsMeta?.status === 'URL_RETRIEVAL_STATUS_SUCCESS';
      const sitemapFound = sitemapMeta?.status === 'URL_RETRIEVAL_STATUS_SUCCESS';
      const llmsTxtFound = llmsMeta?.status === 'URL_RETRIEVAL_STATUS_SUCCESS';

      res.json({
        normalizedUrl: check.normalized,
        domain: check.domain,
        finalStatus,
        statusReason,
        isEstimateMode: finalStatus !== 'success',
        pageSummary: rawSignals.slice(0, 900),
        rawSignals,
        competitorInsights,
        robotsTxtFound,
        robotsTxtNotes: robotsTxtFound
          ? 'robots.txt retrieved during inspection.'
          : `robots.txt status: ${robotsMeta?.status || 'Not directly retrieved'}.`,
        sitemapFound,
        llmsTxtFound,
        urlMetadata: urlMetadata.length > 0 ? urlMetadata : urlsToRead.map((u) => ({ url: u, status: targetSucceeded && u === check.normalized ? 'READ' : 'UNVERIFIED' })),
        searchSources,
        inspectedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ errorCode: mapped.errorCode, message: mapped.message });
    }
  });

  // Step 2: 5 Parallel Structured Analysis Endpoints (one per tab, enabling per-section retry)
  app.post('/api/audit/section/:section', async (req: Request, res: Response) => {
    try {
      const section = req.params.section as string;
      const { input, inspection } = req.body || {};
      if (!inspection || !inspection.normalizedUrl) {
        res.status(400).json({ errorCode: 'BAD_REQUEST', message: 'Missing page inspection context.' });
        return;
      }

      const ai = getAiClient();
      const contextHeader = `AUDITED WEBSITE: ${inspection.normalizedUrl} (Domain: ${inspection.domain})
TARGET COUNTRY: ${input?.targetCountry || 'Global / Not specified'}
BUSINESS TYPE / NICHE: ${input?.businessType || 'Infer from audited site'}
COMPETITORS SUPPLIED: ${Array.isArray(input?.competitors) && input.competitors.length > 0 ? input.competitors.join(', ') : 'None supplied (use Search Grounding competitors below)'}
PAGE READ STATUS: ${inspection.finalStatus} (${inspection.statusReason})
IS ESTIMATE MODE: ${inspection.isEstimateMode ? 'YES — live page could not be fully read directly; clearly set isEstimate: true and explain in estimateReason what could not be directly read. Never fabricate exact HTML strings you did not observe.' : 'NO — live page was read via URL Context.'}
ROBOTS.TXT FOUND: ${inspection.robotsTxtFound}
SITEMAP.XML FOUND: ${inspection.sitemapFound}
LLMS.TXT FOUND: ${inspection.llmsTxtFound}

--- OBSERVED PAGE SIGNALS (FROM URL CONTEXT) ---
${inspection.rawSignals}

--- SEARCH & COMPETITOR RESEARCH (FROM GOOGLE SEARCH GROUNDING) ---
${inspection.competitorInsights}`;

      let schema: Schema;
      let prompt: string;

      if (section === 'seo') {
        schema = seoSchema;
        prompt = `${contextHeader}

TASK: Generate the SEO Audit section (Tab 1) for ${inspection.domain}.
Requirements:
- Score must be an integer 0-100.
- Include scoreBreakdown with 5-6 weighted factors totaling up to 100 maxScore across checks so users see exactly why they got the score.
- Analyze ALL 11 areas in checks (each check must be specific to ${inspection.domain}, citing exact tags/copy found or explicitly stating if not found / not readable):
  1. Title Tag (length & keyword use)
  2. Meta Description
  3. H1-H6 Heading Structure
  4. URL Structure
  5. Canonical Tag
  6. Image Alt Text
  7. Internal & External Links
  8. Open Graph & Twitter Cards
  9. Schema Markup Found
  10. E-E-A-T Signals (author, about, contact, trust signals)
  11. Mobile Friendliness (viewport & responsive signals)
- For each check provide: status (Pass/Warning/Fail), found (what was actually observed), whyItMatters, howToFix (concrete action specific to ${inspection.domain}), impact (High/Medium/Low), effort (Low/Medium/High).
- Never invent tags or text that weren't in the observed signals.`;
      } else if (section === 'content') {
        schema = contentSchema;
        prompt = `${contextHeader}

TASK: Generate the Content Recommendations section (Tab 2) for ${inspection.domain}.
Requirements:
- Score must be an integer 0-100, with scoreBreakdown explaining each factor.
- Evaluate all 5 qualityDimensions: 'Depth', 'Readability', 'Search Intent Match', 'Freshness', 'Calls to Action' (each scored 0-100 with specific assessment & recommendation).
- List 4-6 concrete competitorGaps comparing ${inspection.domain} against the researched competitors in ${input?.targetCountry || 'its target market'}.
- Provide 8-10 specific blog or landing pageIdeas tailored to ${inspection.domain}'s actual business, each with title, targetKeyword, searchIntent, 3-5 suggestedOutlineH2s, priority (High/Medium/Low), and rationale.
- Provide at least 3-4 copyRewrites including before and after examples specifically for 'Headline (H1)', 'Meta Description', 'Title Tag', and 'Primary CTA'. Quote the actual existing copy in 'before' (or state 'Not detected on page' if missing).`;
      } else if (section === 'keywords') {
        schema = keywordsSchema;
        prompt = `${contextHeader}

TASK: Generate the Keyword Suggestions section (Tab 3) for ${inspection.domain}.
Requirements:
- Score must be an integer 0-100 measuring current keyword targeting & alignment, with scoreBreakdown.
- Generate 24-28 high-value keyword suggestions tailored specifically to ${inspection.domain}, its niche (${input?.businessType || 'inferred'}), and target country (${input?.targetCountry || 'Global'}).
- Group them across 'Primary' (5-7 keywords), 'Secondary' (8-10 keywords), and 'Long-tail' (10-12 keywords).
- Each keyword needs: keyword, group, intent ('Informational' | 'Commercial' | 'Transactional' | 'Navigational'), estimatedDifficulty ('Low' | 'Medium' | 'High'), relativeOpportunityScore (integer 0-100), suggestedTargetPage (specific URL path on ${inspection.domain}), and estimatedSearchDemand (e.g. "AI estimate: Medium-High demand", NEVER claim exact Google Ads volume numbers).`;
      } else if (section === 'technical') {
        schema = technicalSchema;
        prompt = `${contextHeader}

TASK: Generate the Technical SEO Checklist section (Tab 4) for ${inspection.domain}.
CRITICAL VERIFICATION RULE:
Only mark an item 'Pass' or 'Fail' if it could ACTUALLY be verified from the URL Context inspection above (for example, HTTPS in the URL, robots.txt retrieved/not retrieved, sitemap.xml retrieved/not retrieved, meta viewport/canonical/schema observed in HTML).
For any item that requires server headers, browser rendering, Lighthouse/CWV telemetry, multi-page crawling, or HTTP redirect testing that could NOT be verified from URL Context (such as Core Web Vitals LCP/INP/CLS, HTTP security headers, redirect chains, broken internal links across the site, 404 status code behavior, pagination), you MUST mark status strictly as 'Needs manual check' and explain how to verify it!
Requirements:
- Score must be an integer 0-100 based on verified technical signals, with scoreBreakdown.
- Cover ALL 15 required technical areas in checks:
  1. HTTPS and SSL
  2. robots.txt Configuration
  3. XML Sitemap
  4. Indexability & Noindex Tags
  5. Canonicalisation
  6. Redirects & Broken Links
  7. Page Speed & Core Web Vitals (LCP, INP, CLS)
  8. Mobile Viewport & Responsiveness
  9. Structured Data Validity
  10. Hreflang & International Targeting
  11. Pagination Handling
  12. 404 Error Handling
  13. HTTP Security Headers
  14. Image Optimisation (WebP/AVIF, sizing, lazy loading)
  15. JavaScript Rendering & Crawlability
- Each item must have: id, title, status ('Pass' | 'Fail' | 'Needs manual check'), severity ('Critical' | 'Warning' | 'Info'), explanation, fix, and verificationNote.`;
      } else if (section === 'aiSearch') {
        schema = aiSearchSchema;
        prompt = `${contextHeader}

TASK: Generate the AI-Search Optimization section (Tab 5) for ${inspection.domain}.
Requirements:
- Score must be an integer 0-100, with scoreBreakdown.
- Assess readiness across all 5 platforms in platforms: 'Google AI Overviews', 'ChatGPT', 'Perplexity', 'Gemini', 'Copilot' (each with readinessScore 0-100, status 'Strong' | 'Moderate' | 'Needs Work', and specific keyGap).
- Assess all 6 areas in signals:
  1. 'Quotable Answers & Q&A Structure'
  2. 'Entity Clarity & Consistent NAP'
  3. 'Schema Markup Coverage'
  4. 'Source Credibility & Authorship'
  5. 'llms.txt & AI Crawler Access' (reference whether llms.txt was found and whether GPTBot, Google-Extended, PerplexityBot were observed in robots.txt)
  6. 'Brand Mentions & Topical Authority'
- Provide schemaRecommendations covering relevant types from: 'Organization', 'FAQPage', 'Article', 'Service', 'LocalBusiness', 'Person'.
- Provide exactly 10 concrete recommendations specific to ${inspection.domain}, each with title, detail, impact, and effort.
- Provide exactly 5 sampleFaqs (question and concise, quotable, authoritative answer tailored to ${inspection.domain} that they could publish right away).`;
      } else {
        res.status(400).json({ errorCode: 'INVALID_SECTION', message: `Unknown audit section: ${section}` });
        return;
      }

      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a senior technical SEO, content strategist, and AI-search optimization auditor. Return strictly valid JSON matching the schema. Every score must be an integer between 0 and 100. Every finding and recommendation must reference specific details of the audited website—no generic advice. Never fabricate unverifiable HTML or technical measurements.',
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        })
      );

      const rawText = (response.text || '{}').trim();
      const parsed = JSON.parse(rawText);

      // Normalize integer scores safely
      parsed.score = clampScore(parsed.score);
      if (Array.isArray(parsed.scoreBreakdown)) {
        parsed.scoreBreakdown = parsed.scoreBreakdown.map((b: { factor: string; score: number; maxScore: number; note: string }) => ({
          ...b,
          score: Math.max(0, Math.round(Number(b.score) || 0)),
          maxScore: Math.max(1, Math.round(Number(b.maxScore) || 20)),
        }));
      }
      if (section === 'content' && Array.isArray(parsed.qualityDimensions)) {
        parsed.qualityDimensions = parsed.qualityDimensions.map((q: { score: number }) => ({
          ...q,
          score: clampScore(q.score),
        }));
      }
      if (section === 'keywords' && Array.isArray(parsed.keywords)) {
        parsed.keywords = parsed.keywords.map((k: { relativeOpportunityScore: number }) => ({
          ...k,
          relativeOpportunityScore: clampScore(k.relativeOpportunityScore),
        }));
      }
      if (section === 'aiSearch' && Array.isArray(parsed.platforms)) {
        parsed.platforms = parsed.platforms.map((p: { readinessScore: number }) => ({
          ...p,
          readinessScore: clampScore(p.readinessScore),
        }));
      }

      res.json(parsed);
    } catch (err) {
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ errorCode: mapped.errorCode, message: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Digital Audit Pulse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
