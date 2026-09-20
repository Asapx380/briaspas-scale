export const HOT_LEAD_MIN_VISITS_IN_24H = 2;
export const HOT_LEAD_NOTIFICATION_TIMEZONE = "America/Sao_Paulo";
export const HOT_LEAD_VISIT_WINDOW_MS = 24 * 60 * 60 * 1000;

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
}): boolean {
  if (params.alreadyNotifiedToday) return false;
  return params.visitsIn24h >= params.minVisits;
}

export function hotLeadNotificationCopy(companyName: string, visitsToday: number) {
  const safeName = companyName.trim() || "Lead";
  const count = Math.max(1, visitsToday);
  return {
    title: `Lead ${safeName} abriu seu site ${count} vezes hoje`,
    body: "Priorize o contato — interesse repetido no site demonstrativo nas últimas 24 horas.",
  };
}
