export const HOT_LEAD_MIN_VISITS_IN_24H = 2;
export const HOT_LEAD_NOTIFICATION_TIMEZONE = "America/Sao_Paulo";
export const HOT_LEAD_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Espelha `viewed_on` gravado na RPC (dia civil em America/Sao_Paulo). */
export function viewedOnInTimezone(nowMs: number, timeZone = HOT_LEAD_NOTIFICATION_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));
}

export function countVisitsInWindow(
  visitTimestamps: readonly number[],
  nowMs: number,
  windowMs: number,
): number {
  const cutoff = nowMs - windowMs;
  return visitTimestamps.filter((timestamp) => timestamp >= cutoff && timestamp <= nowMs).length;
}

export function shouldNotifyHotLeadVisit(params: {
  visitsIn24h: number;
  minVisits: number;
  alreadyNotifiedToday: boolean;
  isPreview: boolean;
}): boolean {
  if (params.isPreview) return false;
  if (params.alreadyNotifiedToday) return false;
  return params.visitsIn24h >= params.minVisits;
}

export function hotLeadNotificationCopy(companyName: string, visitsIn24h: number) {
  const safeName = companyName.trim() || "Lead";
  const count = Math.max(1, visitsIn24h);
  return {
    title: `Lead ${safeName} abriu seu site ${count} vezes nas últimas 24 horas`,
    body: "Priorize o contato — interesse repetido no site demonstrativo nas últimas 24 horas.",
  };
}
