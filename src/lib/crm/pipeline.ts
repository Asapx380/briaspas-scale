import type {
  CrmFilterId,
  CrmLead,
  CrmSortId,
  LeadStatus,
  LeadTier,
  PipelineColumnId,
} from "@/lib/crm/types";

export type PipelineColumn = {
  id: PipelineColumnId;
  title: string;
  color: string;
  statuses: LeadStatus[];
  dropStatus: LeadStatus;
};

/** Mapeamento exclusivo LeadSite → schema `leads.status`. */
export const PIPELINE_COLUMNS: PipelineColumn[] = [
  { id: "base", title: "Base", color: "var(--funnel-total)", statuses: ["new"], dropStatus: "new" },
  {
    id: "abordado",
    title: "Abordado",
    color: "var(--funnel-approached)",
    statuses: ["contacted", "replied"],
    dropStatus: "contacted",
  },
  {
    id: "agendado",
    title: "Agendado",
    color: "var(--funnel-scheduled)",
    statuses: ["hot"],
    dropStatus: "hot",
  },
  {
    id: "followup",
    title: "Follow Up",
    color: "var(--funnel-followup)",
    statuses: ["proposal"],
    dropStatus: "proposal",
  },
  {
    id: "convertido",
    title: "Convertido",
    color: "var(--funnel-converted)",
    statuses: ["won"],
    dropStatus: "won",
  },
  { id: "perdido", title: "Perdido", color: "var(--funnel-lost)", statuses: ["lost"], dropStatus: "lost" },
];

export const FILTER_CHIPS: { id: CrmFilterId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "no_site", label: "Sem site" },
  { id: "tier_quente", label: "Potencial alto" },
  { id: "tier_morno", label: "Potencial médio" },
  { id: "score_50", label: "Potencial 50+" },
  { id: "with_phone", label: "Com telefone" },
];

export const SORT_OPTIONS: { id: CrmSortId; label: string }[] = [
  { id: "recent", label: "Mais recentes" },
  { id: "score_desc", label: "Maior potencial" },
  { id: "name_asc", label: "Nome A–Z" },
  { id: "rating_desc", label: "Melhor avaliação" },
];

export function columnForStatus(status: LeadStatus): PipelineColumn {
  return PIPELINE_COLUMNS.find((column) => column.statuses.includes(status)) ?? PIPELINE_COLUMNS[0];
}

export function leadScore(lead: Pick<
  CrmLead,
  | "rating"
  | "review_count"
  | "phone"
  | "website_url"
  | "site_status"
  | "status"
  | "email"
  | "google_maps_url"
>): number {
  let score = 18;
  if (lead.rating != null) score += Math.round((lead.rating / 5) * 36);
  if (lead.review_count != null) score += Math.min(18, Math.round(lead.review_count / 12));
  if (lead.phone) score += 12;
  if (!lead.website_url && (!lead.site_status || lead.site_status === "not_generated")) score += 10;
  if (lead.email) score += 4;
  if (lead.google_maps_url) score += 3;
  if (lead.status === "hot" || lead.status === "proposal") score += 5;
  return Math.min(100, Math.max(0, score));
}

export type CommercialPotentialBand = "low" | "medium" | "high";

export function commercialPotentialBand(score: number): CommercialPotentialBand {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function commercialPotentialClassLabel(band: CommercialPotentialBand): string {
  if (band === "high") return "Alto";
  if (band === "medium") return "Médio";
  return "Baixo";
}

export function commercialPotentialAriaLabel(score: number): string {
  const band = commercialPotentialBand(score);
  return `Potencial comercial ${score}%, ${commercialPotentialClassLabel(band)}`;
}

/** Fatores espelhando `leadScore` — atualizar junto se a fórmula mudar. */
export function commercialPotentialScoreFactors(): readonly string[] {
  return [
    "Pontuação base inicial",
    "Avaliação no Google (até 5 estrelas)",
    "Quantidade de avaliações",
    "Telefone cadastrado",
    "Sem site cadastrado (oportunidade)",
    "E-mail cadastrado",
    "Link do Google Maps",
    "Etapa agendada ou em follow up no funil",
  ];
}

export const COMMERCIAL_POTENTIAL_DISCLAIMER =
  "Indicador estimado, não representa garantia de venda.";

export function leadTier(score: number): LeadTier {
  if (score >= 70) return "quente";
  if (score >= 45) return "morno";
  return "frio";
}

export function tierLabel(tier: LeadTier) {
  if (tier === "quente") return "Quente";
  if (tier === "morno") return "Morno";
  return "Frio";
}

export function matchesFilter(lead: CrmLead, filter: CrmFilterId) {
  const score = leadScore(lead);
  const tier = leadTier(score);
  switch (filter) {
    case "all":
      return true;
    case "no_site":
      return !lead.site_status || lead.site_status === "not_generated";
    case "tier_quente":
      return tier === "quente";
    case "tier_morno":
      return tier === "morno";
    case "score_50":
      return score >= 50;
    case "with_phone":
      return Boolean(lead.phone?.replace(/\D/g, ""));
    default:
      return true;
  }
}

export function matchesSearch(lead: CrmLead, query: string) {
  const q = query.trim().toLocaleLowerCase("pt-BR");
  if (!q) return true;
  const haystack = [
    lead.company_name,
    lead.niche,
    lead.city,
    lead.phone,
    lead.address,
    lead.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return haystack.includes(q);
}

export function sortLeads(leads: CrmLead[], sort: CrmSortId) {
  const copy = [...leads];
  copy.sort((a, b) => {
    if (sort === "name_asc") {
      return a.company_name.localeCompare(b.company_name, "pt-BR");
    }
    if (sort === "score_desc") {
      return leadScore(b) - leadScore(a) || b.id - a.id;
    }
    if (sort === "rating_desc") {
      return (b.rating ?? -1) - (a.rating ?? -1) || b.id - a.id;
    }
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return bTime - aTime || b.id - a.id;
  });
  return copy;
}

export function toBrazilianWhatsAppNumber(value: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

export function formatMoney(value: number | null) {
  return value === null
    ? null
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
