import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  FullAuditReport,
  computeOverallScore,
  deriveRoadmap,
  deriveTopQuickWins,
  scoreToGrade,
} from '../types/audit';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerFileDownload(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadKeywordsCsv(report: FullAuditReport) {
  if (!report.keywords) return;
  const headers = [
    'Keyword',
    'Group',
    'Intent',
    'Estimated Difficulty (AI Estimate)',
    'Relative Opportunity Score (AI Estimate)',
    'Estimated Search Demand (AI Estimate)',
    'Suggested Target Page',
  ];
  const rows = report.keywords.keywords.map((k) => [
    k.keyword,
    k.group,
    k.intent,
    k.estimatedDifficulty,
    k.relativeOpportunityScore,
    k.estimatedSearchDemand,
    k.suggestedTargetPage,
  ]);
  const csv = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  triggerFileDownload(csv, `${report.inspection.domain}-keywords.csv`, 'text/csv;charset=utf-8;');
}

export function downloadIssuesCsv(report: FullAuditReport) {
  const headers = ['Section', 'Check / Recommendation', 'Status / Severity', 'Finding', 'Recommended Fix', 'Impact', 'Effort'];
  const rows: (string | number)[][] = [];

  if (report.seo) {
    report.seo.checks.forEach((c) => {
      rows.push(['SEO Audit', c.title, c.status, c.found, c.howToFix, c.impact, c.effort]);
    });
  }
  if (report.technical) {
    report.technical.checks.forEach((t) => {
      rows.push(['Technical SEO', t.title, `${t.status} (${t.severity})`, t.verificationNote, t.fix, t.severity, 'Varies']);
    });
  }
  if (report.aiSearch) {
    report.aiSearch.recommendations.forEach((r) => {
      rows.push(['AI-Search', r.title, 'Recommendation', '', r.detail, r.impact, r.effort]);
    });
  }

  const csv = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n');
  triggerFileDownload(csv, `${report.inspection.domain}-issues.csv`, 'text/csv;charset=utf-8;');
}

export function downloadFullJson(report: FullAuditReport) {
  const json = JSON.stringify(report, null, 2);
  triggerFileDownload(json, `${report.inspection.domain}-audit-report.json`, 'application/json;charset=utf-8;');
}

export async function copyShareSummary(report: FullAuditReport): Promise<boolean> {
  const overall = computeOverallScore(report);
  const { grade, label } = scoreToGrade(overall);
  const quickWins = deriveTopQuickWins(report);
  const formattedDate = new Date(report.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const lines = [
    `Digital Audit Pulse Report — ${report.inspection.normalizedUrl}`,
    `Audited: ${formattedDate}`,
    `Overall Health Score: ${overall}/100 (Grade ${grade} · ${label})`,
    report.inspection.isEstimateMode
      ? `Note: Direct page read was limited (${report.inspection.statusReason}); some sections include AI estimates.`
      : '',
    '',
    'Pillar Scores:',
    `- SEO Audit: ${report.seo?.score ?? 'N/A'}/100`,
    `- Content Strategy: ${report.content?.score ?? 'N/A'}/100`,
    `- Keyword Alignment: ${report.keywords?.score ?? 'N/A'}/100`,
    `- Technical SEO: ${report.technical?.score ?? 'N/A'}/100`,
    `- AI-Search Readiness: ${report.aiSearch?.score ?? 'N/A'}/100`,
    '',
    'Top 5 Quick Wins:',
    ...quickWins.map((qw, idx) => `${idx + 1}. [${qw.section}] ${qw.title} (${qw.impact} Impact / ${qw.effort} Effort) — ${qw.action}`),
    '',
    'Disclaimer: Scores are AI-generated estimates based on the publicly readable page. Verify critical findings with Google Search Console, PageSpeed Insights and your analytics.',
  ].filter((l) => l !== undefined);

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function scoreHexColor(score: number): string {
  if (score >= 80) return '#16A34A';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

export async function downloadPdfReport(report: FullAuditReport): Promise<void> {
  const overall = computeOverallScore(report);
  const { grade, label } = scoreToGrade(overall);
  const quickWins = deriveTopQuickWins(report);
  const roadmap = deriveRoadmap(report);
  const auditDate = new Date(report.createdAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Build dedicated off-screen page blocks with explicit hex styles (avoids Tailwind oklch parsing issues in html2canvas)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-12000px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Inter, Arial, sans-serif';

  const pageStyle =
    'width:794px;min-height:1122px;padding:48px;box-sizing:border-box;background:#ffffff;color:#0f172a;display:flex;flex-direction:column;justify-content:space-between;';

  const pillarRows = [
    { name: 'SEO Audit', score: report.seo?.score ?? 0, summary: report.seo?.summary ?? 'Pending' },
    { name: 'Content Strategy', score: report.content?.score ?? 0, summary: report.content?.summary ?? 'Pending' },
    { name: 'Keyword Alignment', score: report.keywords?.score ?? 0, summary: report.keywords?.summary ?? 'Pending' },
    { name: 'Technical SEO', score: report.technical?.score ?? 0, summary: report.technical?.summary ?? 'Pending' },
    { name: 'AI-Search Readiness', score: report.aiSearch?.score ?? 0, summary: report.aiSearch?.summary ?? 'Pending' },
  ];

  // Page 1: Cover & Executive Summary
  const page1Html = `
    <div class="pdf-page" style="${pageStyle}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4F46E5;padding-bottom:16px;margin-bottom:32px;">
          <div>
            <div style="font-size:20px;font-weight:700;color:#4F46E5;">Digital Audit Pulse</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px;">Website Marketing &amp; AI-Search Readiness Report</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#475569;">
            <div>Audit Date: ${escapeHtml(auditDate)}</div>
            <div>Target Country: ${escapeHtml(report.input.targetCountry || 'Global')}</div>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:28px;margin-bottom:28px;">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px;">AUDITED WEBSITE</div>
          <div style="font-size:22px;font-weight:700;color:#0f172a;word-break:break-all;margin-bottom:20px;">${escapeHtml(report.inspection.normalizedUrl)}</div>
          <div style="display:flex;align-items:center;gap:28px;">
            <div style="width:116px;height:116px;border-radius:58px;border:8px solid ${scoreHexColor(overall)};display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff;">
              <div style="font-size:32px;font-weight:800;color:${scoreHexColor(overall)};line-height:1;">${overall}</div>
              <div style="font-size:12px;color:#475569;margin-top:4px;">Grade ${grade}</div>
            </div>
            <div style="flex:1;">
              <div style="font-size:18px;font-weight:700;color:#0f172a;">Overall Health: ${label}</div>
              <p style="font-size:13px;line-height:1.55;color:#334155;margin:8px 0 0 0;">
                ${report.inspection.isEstimateMode ? 'Note: Direct page retrieval was restricted (' + escapeHtml(report.inspection.statusReason) + '). Unverified sections are marked as estimates. ' : ''}
                This executive report evaluates on-page SEO fundamentals, content depth, search keyword opportunity, technical crawlability, and AI-search readiness across leading answer engines.
              </p>
            </div>
          </div>
        </div>

        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">Pillar Score Overview</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:11px;color:#475569;">
              <th style="padding:10px 12px;border-bottom:1px solid #cbd5e1;">Pillar</th>
              <th style="padding:10px 12px;border-bottom:1px solid #cbd5e1;width:90px;">Score</th>
              <th style="padding:10px 12px;border-bottom:1px solid #cbd5e1;">Executive Summary</th>
            </tr>
          </thead>
          <tbody>
            ${pillarRows
              .map(
                (p) => `
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(p.name)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:${scoreHexColor(p.score)};">${p.score}/100</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#334155;line-height:1.45;">${escapeHtml(p.summary)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:10px;">Top 5 Quick Wins</div>
        ${quickWins
          .map(
            (qw, idx) => `
          <div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;background:#ffffff;">
            <div style="font-size:12px;font-weight:700;color:#0f172a;">${idx + 1}. ${escapeHtml(qw.title)} <span style="font-weight:500;color:#4F46E5;">(${escapeHtml(qw.section)} · ${qw.impact} Impact / ${qw.effort} Effort)</span></div>
            <div style="font-size:11px;color:#475569;margin-top:3px;line-height:1.4;">${escapeHtml(qw.action)}</div>
          </div>`
          )
          .join('')}
      </div>
      <div style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;">
        Page 1 · Digital Audit Pulse · ${escapeHtml(report.inspection.domain)}
      </div>
    </div>
  `;

  // Page 2: SEO Audit Findings
  const page2Html = `
    <div class="pdf-page" style="${pageStyle}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:20px;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">1. On-Page SEO Audit</div>
          <div style="font-size:14px;font-weight:700;color:${scoreHexColor(report.seo?.score ?? 0)};">Score: ${report.seo?.score ?? 0}/100</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:11px;color:#475569;">
              <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;width:150px;">Check</th>
              <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;width:65px;">Status</th>
              <th style="padding:8px 10px;border-bottom:1px solid #cbd5e1;">Observed &amp; Recommended Fix</th>
            </tr>
          </thead>
          <tbody>
            ${(report.seo?.checks ?? [])
              .map((c) => {
                const statusColor = c.status === 'Pass' ? '#16A34A' : c.status === 'Warning' ? '#D97706' : '#DC2626';
                return `
                  <tr>
                    <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:600;vertical-align:top;">${escapeHtml(c.title)}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-weight:700;color:${statusColor};vertical-align:top;">${escapeHtml(c.status)}</td>
                    <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:#334155;line-height:1.4;vertical-align:top;">
                      <div><strong>Found:</strong> ${escapeHtml(c.found)}</div>
                      <div style="margin-top:3px;"><strong>Fix:</strong> ${escapeHtml(c.howToFix)}</div>
                    </td>
                  </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;">
        Page 2 · SEO Audit · ${escapeHtml(report.inspection.domain)}
      </div>
    </div>
  `;

  // Page 3: Content & Keywords
  const page3Html = `
    <div class="pdf-page" style="${pageStyle}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">2. Content Strategy &amp; Keyword Opportunities</div>
          <div style="font-size:12px;color:#475569;">Content: <strong>${report.content?.score ?? 0}/100</strong> · Keywords: <strong>${report.keywords?.score ?? 0}/100</strong></div>
        </div>

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">Copy Rewrites (Before &amp; After)</div>
        ${(report.content?.copyRewrites ?? [])
          .slice(0, 3)
          .map(
            (rw) => `
          <div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin-bottom:8px;font-size:11px;">
            <div style="font-weight:700;color:#4F46E5;margin-bottom:4px;">${escapeHtml(rw.element)}</div>
            <div style="color:#64748b;"><strong>Before:</strong> ${escapeHtml(rw.before)}</div>
            <div style="color:#0f172a;margin-top:3px;"><strong>After:</strong> ${escapeHtml(rw.after)}</div>
          </div>`
          )
          .join('')}

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin:14px 0 8px 0;">High-Priority Page &amp; Article Ideas</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:10.5px;color:#475569;">
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Recommended Title</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;width:150px;">Target Keyword</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;width:75px;">Priority</th>
            </tr>
          </thead>
          <tbody>
            ${(report.content?.pageIdeas ?? [])
              .slice(0, 7)
              .map(
                (idea) => `
              <tr>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:#0f172a;">${escapeHtml(idea.title)}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;color:#334155;">${escapeHtml(idea.targetKeyword)}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;font-weight:600;color:#4F46E5;">${escapeHtml(idea.priority)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin:12px 0 6px 0;">Top Keyword Suggestions (AI Estimates)</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:10.5px;color:#475569;">
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Keyword</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Group</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Intent</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Est. Difficulty</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Opportunity</th>
            </tr>
          </thead>
          <tbody>
            ${(report.keywords?.keywords ?? [])
              .slice(0, 10)
              .map(
                (k) => `
              <tr>
                <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;font-weight:600;">${escapeHtml(k.keyword)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;">${escapeHtml(k.group)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;">${escapeHtml(k.intent)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;">${escapeHtml(k.estimatedDifficulty)}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;font-weight:700;color:#14B8A6;">${k.relativeOpportunityScore}/100</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;">
        Page 3 · Content &amp; Keywords · ${escapeHtml(report.inspection.domain)}
      </div>
    </div>
  `;

  // Page 4: Technical SEO & AI-Search Readiness
  const page4Html = `
    <div class="pdf-page" style="${pageStyle}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:16px;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">3. Technical SEO &amp; AI-Search Readiness</div>
          <div style="font-size:12px;color:#475569;">Technical: <strong>${report.technical?.score ?? 0}/100</strong> · AI-Search: <strong>${report.aiSearch?.score ?? 0}/100</strong></div>
        </div>

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">Technical SEO Verification Summary</div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#f1f5f9;text-align:left;font-size:10.5px;color:#475569;">
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;width:165px;">Check</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;width:110px;">Status</th>
              <th style="padding:6px 8px;border-bottom:1px solid #cbd5e1;">Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            ${(report.technical?.checks ?? [])
              .slice(0, 12)
              .map((t) => {
                const color = t.status === 'Pass' ? '#16A34A' : t.status === 'Fail' ? '#DC2626' : '#D97706';
                return `
                  <tr>
                    <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;font-weight:600;">${escapeHtml(t.title)}</td>
                    <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10.5px;font-weight:700;color:${color};">${escapeHtml(t.status)}</td>
                    <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px;color:#334155;">${escapeHtml(t.fix)}</td>
                  </tr>`;
              })
              .join('')}
          </tbody>
        </table>

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">AI-Search Engine Readiness</div>
        <div style="display:flex;gap:8px;margin-bottom:14px;">
          ${(report.aiSearch?.platforms ?? [])
            .map(
              (p) => `
            <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px;background:#f8fafc;text-align:center;">
              <div style="font-size:10px;font-weight:600;color:#334155;">${escapeHtml(p.platform)}</div>
              <div style="font-size:16px;font-weight:700;color:${scoreHexColor(p.readinessScore)};margin-top:4px;">${p.readinessScore}</div>
              <div style="font-size:9.5px;color:#64748b;">${escapeHtml(p.status)}</div>
            </div>`
            )
            .join('')}
        </div>

        <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:6px;">Top AI-Search Recommendations</div>
        <ul style="margin:0;padding-left:18px;font-size:10.5px;color:#334155;line-height:1.45;">
          ${(report.aiSearch?.recommendations ?? [])
            .slice(0, 6)
            .map((r) => `<li style="margin-bottom:4px;"><strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.detail)}</li>`)
            .join('')}
        </ul>
      </div>
      <div style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;">
        Page 4 · Technical SEO &amp; AI-Search · ${escapeHtml(report.inspection.domain)}
      </div>
    </div>
  `;

  // Page 5: Prioritised 30-60-90 Day Roadmap
  const page5Html = `
    <div class="pdf-page" style="${pageStyle}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:20px;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">4. Prioritised 30-60-90 Day Action Plan</div>
          <div style="font-size:12px;color:#4F46E5;font-weight:600;">Impact vs. Effort Roadmap</div>
        </div>

        ${roadmap
          .map(
            (phase) => `
          <div style="margin-bottom:20px;">
            <div style="font-size:14px;font-weight:700;color:#4F46E5;margin-bottom:8px;">${escapeHtml(phase.phase)}</div>
            ${
              phase.items.length === 0
                ? `<div style="font-size:11px;color:#64748b;">No items assigned to this phase.</div>`
                : phase.items
                    .slice(0, 6)
                    .map(
                      (item) => `
                  <div style="border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;margin-bottom:6px;background:#f8fafc;">
                    <div style="font-size:11.5px;font-weight:700;color:#0f172a;">${escapeHtml(item.title)} <span style="font-weight:500;color:#475569;">· ${escapeHtml(item.section)} · ${item.impact} Impact / ${item.effort} Effort</span></div>
                    <div style="font-size:10.5px;color:#334155;margin-top:3px;">${escapeHtml(item.outcome)}</div>
                  </div>`
                    )
                    .join('')
            }
          </div>`
          )
          .join('')}
      </div>
      <div style="font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:10px;line-height:1.4;">
        Scores are AI-generated estimates based on the publicly readable page. Verify critical findings with Google Search Console, PageSpeed Insights and your analytics.
      </div>
    </div>
  `;

  container.innerHTML = page1Html + page2Html + page3Html + page4Html + page5Html;
  document.body.appendChild(container);

  try {
    const pages = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save(`${report.inspection.domain}-digital-audit-pulse.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}
