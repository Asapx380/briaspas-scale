export type DashboardPeriod = "7d" | "30d" | "month";

export type DashboardLead = {
  status: string;
  follow_up_at: string | null;
  site_status: string | null;
  created_at: string;
  won_at: string | null;
  estimated_value: number | null;
  company_name: string | null;
  updated_at: string | null;
};

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export type KpiMetric = {
  key: string;
  label: string;
  value: string;
  hint: string;
};

export type TrendPoint = {
  key: string;
  label: string;
  created: number;
  won: number;
};

export type Recommendation = {
  id: string;
  text: string;
  href?: string;
  cta?: string;
};

export type OnboardingStep = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

const STAGE_META: Omit<FunnelStage, "count">[] = [
  { key: "new", label: "Base", color: "var(--funnel-total)" },
  { key: "contacted", label: "Abordados", color: "var(--funnel-approached)" },
  { key: "scheduled", label: "Agendados", color: "var(--funnel-scheduled)" },
  { key: "followup", label: "Follow Up", color: "var(--funnel-followup)" },
  { key: "lost", label: "Perdidos", color: "var(--funnel-lost)" },
  { key: "won", label: "Convertidos", color: "var(--funnel-converted)" },
];

export function parsePeriod(value: string | string[] | undefined): DashboardPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "7d" || raw === "30d" || raw === "month") return raw;
  return "30d";
}

export function periodLabel(period: DashboardPeriod) {
  if (period === "7d") return "Últimos 7 dias";
  if (period === "month") return "Este mês";
  return "Últimos 30 dias";
}

export function periodStart(period: DashboardPeriod, now = new Date()) {
  const start = new Date(now);
  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return start;
}

function inRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(isoDay: string) {
  const parts = isoDay.split("-");
  return parts[2] ?? isoDay;
}

export function buildFunnelStages(leads: DashboardLead[], nowMs: number): FunnelStage[] {
  const counts: Record<string, number> = {
    new: 0,
    contacted: 0,
    scheduled: 0,
    followup: 0,
    lost: 0,
    won: 0,
  };

  for (const lead of leads) {
    if (lead.status === "new") counts.new += 1;
    else if (lead.status === "contacted" || lead.status === "replied") counts.contacted += 1;
    else if (lead.status === "hot" || lead.status === "proposal") counts.scheduled += 1;
    else if (lead.status === "lost") counts.lost += 1;
    else if (lead.status === "won") counts.won += 1;

    if (
      lead.follow_up_at &&
      !["won", "lost"].includes(lead.status) &&
      new Date(lead.follow_up_at).getTime() >= nowMs
    ) {
      counts.followup += 1;
    }
  }

  return STAGE_META.map((stage) => ({ ...stage, count: counts[stage.key] ?? 0 }));
}

export function buildKpis(leads: DashboardLead[], period: DashboardPeriod, now = new Date()): KpiMetric[] {
  const start = periodStart(period, now);
  const end = now;
  const nowMs = now.getTime();

  const createdInPeriod = leads.filter((lead) => inRange(lead.created_at, start, end));
  const wonInPeriod = leads.filter(
    (lead) =>
      inRange(lead.won_at, start, end) ||
      (lead.status === "won" && !lead.won_at && inRange(lead.created_at, start, end)),
  );
  const approached = leads.filter((lead) =>
    ["contacted", "replied", "hot", "proposal", "won"].includes(lead.status),
  );
  const openLeads = leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const overdue = openLeads.filter(
    (lead) => lead.follow_up_at && new Date(lead.follow_up_at).getTime() < nowMs,
  );
  const closed = leads.filter((lead) => lead.status === "won" || lead.status === "lost");
  const approachRate = leads.length ? Math.round((approached.length / leads.length) * 100) : 0;
  const conversionRate = createdInPeriod.length
    ? Math.round((wonInPeriod.length / createdInPeriod.length) * 100)
    : 0;
  const winRate = closed.length
    ? Math.round((leads.filter((lead) => lead.status === "won").length / closed.length) * 100)
    : 0;

  return [
    {
      key: "new",
      label: "Leads no período",
      value: String(createdInPeriod.length),
      hint: periodLabel(period),
    },
    {
      key: "approach",
      label: "Taxa de abordagem",
      value: `${approachRate}%`,
      hint: `${approached.length} de ${leads.length} leads`,
    },
    {
      key: "conversion",
      label: "Conversão no período",
      value: `${conversionRate}%`,
      hint: `${wonInPeriod.length} ganho${wonInPeriod.length === 1 ? "" : "s"}`,
    },
    {
      key: "followup",
      label: "Follow-ups atrasados",
      value: String(overdue.length),
      hint: winRate ? `Win rate geral ${winRate}%` : "Sem fechamentos ainda",
    },
  ];
}

export function buildTrend(
  leads: DashboardLead[],
  period: DashboardPeriod,
  now = new Date(),
): TrendPoint[] {
  const start = periodStart(period, now);
  const days: TrendPoint[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  while (cursor.getTime() <= end.getTime()) {
    const key = dayKey(cursor);
    days.push({ key, label: formatDayLabel(key), created: 0, won: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const byDay = new Map(days.map((day) => [day.key, day]));

  for (const lead of leads) {
    if (lead.created_at) {
      const key = dayKey(new Date(lead.created_at));
      const point = byDay.get(key);
      if (point) point.created += 1;
    }
    if (lead.won_at) {
      const key = dayKey(new Date(lead.won_at));
      const point = byDay.get(key);
      if (point) point.won += 1;
    } else if (lead.status === "won" && lead.created_at) {
      const key = dayKey(new Date(lead.created_at));
      const point = byDay.get(key);
      if (point) point.won += 1;
    }
  }

  if (days.length <= 14) return days;

  const bucketSize = Math.ceil(days.length / 10);
  const buckets: TrendPoint[] = [];
  for (let index = 0; index < days.length; index += bucketSize) {
    const slice = days.slice(index, index + bucketSize);
    buckets.push({
      key: slice[0].key,
      label: slice[0].label,
      created: slice.reduce((sum, day) => sum + day.created, 0),
      won: slice.reduce((sum, day) => sum + day.won, 0),
    });
  }
  return buckets;
}

export function buildRecommendations(leads: DashboardLead[], nowMs: number): Recommendation[] {
  const items: Recommendation[] = [];
  const open = leads.filter((lead) => !["won", "lost"].includes(lead.status));
  const overdue = open.filter(
    (lead) => lead.follow_up_at && new Date(lead.follow_up_at).getTime() < nowMs,
  );
  const staleMs = 7 * 24 * 60 * 60 * 1000;
  const stale = open.filter((lead) => {
    const stamp = lead.updated_at ?? lead.created_at;
    return stamp && nowMs - new Date(stamp).getTime() > staleMs;
  });
  const fresh = leads.filter((lead) => lead.status === "new");
  const withoutSite = leads.filter(
    (lead) => !lead.site_status || lead.site_status === "not_generated",
  );
  const hot = leads.filter((lead) => lead.status === "hot" || lead.status === "proposal");

  if (leads.length === 0) {
    return [
      {
        id: "empty",
        text: "Comece importando empresas para montar seu funil.",
        href: "/app/leads",
        cta: "Adicionar leads",
      },
    ];
  }

  if (overdue.length > 0) {
    items.push({
      id: "overdue",
      text: `${overdue.length} follow-up${overdue.length === 1 ? "" : "s"} atrasado${overdue.length === 1 ? "" : "s"} — retome o contato hoje.`,
      href: "/app/crm",
      cta: "Abrir CRM",
    });
  }
  if (fresh.length > 0) {
    items.push({
      id: "fresh",
      text: `${fresh.length} lead${fresh.length === 1 ? "" : "s"} na base ainda sem abordagem.`,
      href: "/app/crm",
      cta: "Abordar agora",
    });
  }
  if (stale.length > 0) {
    items.push({
      id: "stale",
      text: `${stale.length} lead${stale.length === 1 ? "" : "s"} sem movimentação há mais de 7 dias.`,
      href: "/app/crm",
      cta: "Revisar parados",
    });
  }
  if (withoutSite.length > 0) {
    items.push({
      id: "site",
      text: `${withoutSite.length} empresa${withoutSite.length === 1 ? "" : "s"} ainda sem site gerado.`,
      href: "/app/crm",
      cta: "Gerar site",
    });
  }
  if (hot.length > 0) {
    items.push({
      id: "hot",
      text: `${hot.length} oportunidade${hot.length === 1 ? "" : "s"} quente${hot.length === 1 ? "" : "s"} — avance proposta ou fechamento.`,
      href: "/app/crm",
      cta: "Ver quentes",
    });
  }
  if (items.length === 0) {
    items.push({ id: "healthy", text: "Operação saudável. Sem ações urgentes no momento." });
  }

  return items.slice(0, 4);
}

export function buildOnboarding(leads: DashboardLead[]): OnboardingStep[] {
  const hasLeads = leads.length > 0;
  const hasSite = leads.some(
    (lead) => lead.site_status === "ready" || lead.site_status === "published",
  );
  const hasCrmMotion = leads.some((lead) => lead.status !== "new");

  return [
    { id: "import", label: "Importar ou buscar leads", done: hasLeads, href: "/app/leads" },
    { id: "site", label: "Gerar um site para um lead", done: hasSite, href: "/app/crm" },
    { id: "crm", label: "Mover um lead no CRM", done: hasCrmMotion, href: "/app/crm" },
  ];
}
