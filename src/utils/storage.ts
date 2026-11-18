import { FullAuditReport } from '../types/audit';

const HISTORY_KEY = 'dap_audit_history_v1';
const CHECKLIST_PREFIX = 'dap_tech_checklist_v1_';
const MAX_HISTORY = 10;

export function getAuditHistory(): FullAuditReport[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditToHistory(report: FullAuditReport): FullAuditReport[] {
  const existing = getAuditHistory().filter((item) => item.id !== report.id);
  const updated = [report, ...existing].slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // Handle storage quota gracefully by trimming older entries
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(0, 5)));
    } catch {
      // Ignore if storage is completely unavailable
    }
  }
  return updated;
}

export function deleteAuditFromHistory(id: string): FullAuditReport[] {
  const updated = getAuditHistory().filter((item) => item.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    localStorage.removeItem(`${CHECKLIST_PREFIX}${id}`);
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function getChecklistProgress(auditId: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(`${CHECKLIST_PREFIX}${auditId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveChecklistProgress(auditId: string, state: Record<string, boolean>): void {
  try {
    localStorage.setItem(`${CHECKLIST_PREFIX}${auditId}`, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}
