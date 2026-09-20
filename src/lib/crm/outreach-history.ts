const STORAGE_KEY = "briaspas-crm-outreach-history";
const MAX_ENTRIES = 30;

export type OutreachHistoryEntry = {
  leadId: number;
  companyName: string;
  usedAt: string;
  action: "copy" | "whatsapp";
  messagePreview: string;
};

function readAll(): OutreachHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutreachHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: OutreachHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota or private mode — ignore
  }
}

export function listOutreachHistoryForLead(leadId: number): OutreachHistoryEntry[] {
  return readAll().filter((entry) => entry.leadId === leadId);
}

export function appendOutreachHistory(entry: Omit<OutreachHistoryEntry, "usedAt">) {
  const next: OutreachHistoryEntry = { ...entry, usedAt: new Date().toISOString() };
  const rest = readAll().filter(
    (item) => !(item.leadId === entry.leadId && item.usedAt === next.usedAt),
  );
  writeAll([next, ...rest]);
}
