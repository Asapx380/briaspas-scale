import type {
  CrmFilterId,
  CrmLead,
  CrmSortId,
  LeadStatus,
  LeadTier,
  PipelineColumnId,
} from "@/lib/crm/types";
import { normalizeBrazilWhatsAppDigits } from "./whatsapp-phone";

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

const WEAK_DIGITAL_PRESENCE_HOST_PATTERNS: readonly RegExp[] = [
  /(^|\.)linktr\.ee$/i,
  /(^|\.)linktree\.com$/i,
  /(^|\.)beacons\.ai$/i,
  /(^|\.)bio\.site$/i,
  /(^|\.)campsite\.bio$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fb\.com$/i,
  /(^|\.)wa\.me$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)threads\.net$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
];

const COMPLETE_COMMERCIAL_MARKERS = [
  "páginas relevantes",
  "paginas relevantes",
  "serviços claros",
  "servicos claros",
  "cta",
  "whatsapp",
  "contato",
  "endereço",
  "endereco",
  "responsiv",
  "estrutura comercial",
  "site completo",
] as const;

const WEAK_SITE_MARKERS = [
  "página única",
  "pagina unica",
  "site básico",
  "site basico",
  "site com falha",
  "sem cta",
  "sem whatsapp",
  "sem serviços",
  "sem servicos",
  "sem endereço",
  "sem endereco",
  "sem estrutura comercial",
] as const;

export type SiteOpportunityKind =
  | "no_own_site"
  | "weak_social"
  | "weak_website"
  | "unanalyzed_own"
  | "complete_own";

type SiteOpportunityLead = Pick<
  CrmLead,
  "website_url" | "site_status" | "ai_diagnosis" | "phone" | "email" | "address" | "google_maps_url"
>;

function diagnosisHaystack(diagnosis: CrmLead["ai_diagnosis"]): string {
  if (!diagnosis) return "";
  return [
    diagnosis.resumo,
    diagnosis.dorPrincipal,
    ...(diagnosis.doresSecundarias ?? []),
    ...(diagnosis.oportunidades ?? []),
    ...(diagnosis.sinaisObservados ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("pt-BR");
}

function countCommercialCompletenessMarkers(diagnosis: CrmLead["ai_diagnosis"]): number {
  const haystack = diagnosisHaystack(diagnosis);
  if (!haystack) return 0;
  return COMPLETE_COMMERCIAL_MARKERS.filter((marker) => haystack.includes(marker)).length;
}

export function hasCompleteCommercialSiteEvidence(lead: SiteOpportunityLead): boolean {
  if (lead.site_status === "ready" || lead.site_status === "published") return true;
  return countCommercialCompletenessMarkers(lead.ai_diagnosis) >= 4;
}

export function hasWeakWebsiteEvidence(lead: SiteOpportunityLead): boolean {
  if (lead.site_status === "failed") return true;
  const haystack = diagnosisHaystack(lead.ai_diagnosis);
  if (!haystack) return false;
  return WEAK_SITE_MARKERS.some((marker) => haystack.includes(marker));
}

function briaspasDeliveredSite(siteStatus: CrmLead["site_status"]): boolean {
  return siteStatus === "ready" || siteStatus === "published";
}

function completeSiteBaseScore(lead: SiteOpportunityLead): number {
  const markers = countCommercialCompletenessMarkers(lead.ai_diagnosis);
  if (lead.site_status === "published") return 14;
  if (lead.site_status === "ready") return 22;
  const raw = 38 - markers * 5;
  return Math.max(10, Math.min(35, raw));
}

/** Classificação da oportunidade de vender site (independente dos complementos). */
export function classifySiteOpportunity(lead: SiteOpportunityLead): SiteOpportunityKind {
  const url = lead.website_url?.trim() ?? "";
  const liveOnPlatform = briaspasDeliveredSite(lead.site_status);

  if (url && isWeakDigitalPresenceUrl(url)) return "weak_social";
  if (!url && !liveOnPlatform) return "no_own_site";
  if (hasCompleteCommercialSiteEvidence(lead)) return "complete_own";
  if (lead.site_status === "failed" || hasWeakWebsiteEvidence(lead)) return "weak_website";
  if (url) return "unanalyzed_own";
  return "no_own_site";
}

/** Pontuação base de oportunidade (antes dos complementos de contato/funil). */
export function siteOpportunityBaseScore(lead: SiteOpportunityLead): number {
  const kind = classifySiteOpportunity(lead);
  if (kind === "no_own_site") return 100;
  if (kind === "weak_social") return 90;
  if (kind === "weak_website") return 75;
  if (kind === "unanalyzed_own") return 70;
  return completeSiteBaseScore(lead);
}

/** @deprecated Use `siteOpportunityBaseScore`. Mantido para testes legados. */
export function siteOpportunityPoints(lead: SiteOpportunityLead): number {
  return siteOpportunityBaseScore(lead);
}

function leadComplementBonus(
  lead: Pick<
    CrmLead,
    "rating" | "review_count" | "phone" | "email" | "google_maps_url" | "status"
  >,
): number {
  let bonus = 0;
  if (lead.phone?.replace(/\D/g, "")) bonus += 2;
  if (lead.email?.trim()) bonus += 1;
  if (lead.google_maps_url?.trim()) bonus += 1;
  if (lead.rating != null) bonus += Math.round((lead.rating / 5) * 2);
  if (lead.review_count != null) bonus += Math.min(2, Math.round(lead.review_count / 50));
  if (lead.status === "hot" || lead.status === "proposal") bonus += 1;
  return bonus;
}

/** Presença digital fraca (Linktree, redes, wa.me) — não é site próprio. */
export function isWeakDigitalPresenceUrl(websiteUrl: string | null | undefined): boolean {
  if (!websiteUrl?.trim()) return false;
  try {
    const host = new URL(websiteUrl.trim()).hostname.replace(/^www\./i, "");
    return WEAK_DIGITAL_PRESENCE_HOST_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    const lower = websiteUrl.toLocaleLowerCase("pt-BR");
    return (
      lower.includes("linktr.ee") ||
      lower.includes("linktree") ||
      lower.includes("beacons") ||
      lower.includes("bio.site") ||
      lower.includes("campsite") ||
      lower.includes("instagram.com") ||
      lower.includes("facebook.com") ||
      lower.includes("wa.me")
    );
  }
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
  | "ai_diagnosis"
  | "address"
>): number {
  const kind = classifySiteOpportunity(lead);
  const bonus = leadComplementBonus(lead);

  if (kind === "complete_own") {
    const base = completeSiteBaseScore(lead);
    return Math.min(35, Math.max(10, base + bonus));
  }

  const floor =
    kind === "no_own_site"
      ? 100
      : kind === "weak_social"
        ? 90
        : kind === "weak_website"
          ? 75
          : 70;

  return Math.min(100, floor + bonus);
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
  return `Oportunidade de site ${score}%, ${commercialPotentialClassLabel(band)}`;
}

/** Fatores espelhando `leadScore` — atualizar junto se a fórmula mudar. */
export function commercialPotentialScoreFactors(): readonly string[] {
  return [
    "Oportunidade de site (não é probabilidade de fechamento)",
    "Sem site próprio: pontuação máxima",
    "Linktree, Beacons, Bio.site, Campsite, wa.me ou rede social como presença principal",
    "Site básico, com falha ou sem estrutura comercial: alta oportunidade",
    "Domínio próprio sem análise de qualidade: alto até haver evidência de site completo",
    "Site completo e funcional (páginas, serviços, CTA, contato, endereço, responsivo): baixa oportunidade",
    "Telefone, e-mail, Google Maps, avaliações e etapa do funil só refinam a ordem entre leads",
  ];
}

export const COMMERCIAL_POTENTIAL_DISCLAIMER =
  "Estimativa de oportunidade para vender um site, não probabilidade de fechamento.";

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
  return normalizeBrazilWhatsAppDigits(value) ?? "";
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
