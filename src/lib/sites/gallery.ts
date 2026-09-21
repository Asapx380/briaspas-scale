import type { CrmLead } from "@/lib/crm/types";

export const SITE_GALLERY_COLUMNS =
  "id, company_name, niche, slug, site_status, site_source, photos, updated_at, site_generated_at";

export const SITE_GALLERY_PAGE_SIZES = [6, 12, 24] as const;
export const SITE_GALLERY_DEFAULT_PAGE_SIZE = 12;
export const SITE_GALLERY_FETCH_LIMIT = 5000;

export type SiteGallerySortId = "recent" | "name_asc" | "status";

export type SiteGalleryLead = Pick<
  CrmLead,
  "id" | "company_name" | "niche" | "slug" | "site_status" | "site_source" | "updated_at"
> & {
  photos: unknown;
  site_generated_at: string | null;
};

const STATUS_LABELS: Record<CrmLead["site_status"], string> = {
  not_generated: "Sem site",
  generating: "Gerando",
  ready: "Rascunho",
  failed: "Falhou",
  published: "Publicado",
};

export function mapSiteStatusLabel(status: CrmLead["site_status"]): string {
  return STATUS_LABELS[status] ?? status;
}

export function mapSiteSourceLabel(source: CrmLead["site_source"]): string {
  if (source === "uploaded") return "Enviado";
  if (source === "generated") return "Gerado";
  return "Site";
}

export function parseSiteGallerySort(value: string | undefined): SiteGallerySortId {
  const allowed: SiteGallerySortId[] = ["recent", "name_asc", "status"];
  return allowed.includes(value as SiteGallerySortId) ? (value as SiteGallerySortId) : "recent";
}

/** Escapa curingas do ILIKE e remove caracteres que quebram filtros PostgREST. */
export function sanitizeGallerySearchQuery(raw: string): string {
  const trimmed = raw.trim().slice(0, 80);
  return trimmed
    .replace(/\\/g, "\\\\")
    .replace(/[%_]/g, (char) => `\\${char}`)
    .replace(/[(),]/g, "");
}

export function photoUrlsFromLeadPhotos(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => {
    if (typeof item !== "string") return false;
    try {
      const url = new URL(item);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

export function pickSiteCoverPhoto(value: unknown): string | null {
  const urls = photoUrlsFromLeadPhotos(value);
  return urls[0] ?? null;
}

export function companyInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

type RelativeUnit = Intl.RelativeTimeFormatUnit;

function pickRelativeUnit(diffSeconds: number): { value: number; unit: RelativeUnit } {
  const abs = Math.abs(diffSeconds);
  if (abs < 60) return { value: diffSeconds, unit: "second" };
  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) return { value: minutes, unit: "minute" };
  const hours = Math.round(diffSeconds / 3600);
  if (Math.abs(hours) < 24) return { value: hours, unit: "hour" };
  const days = Math.round(diffSeconds / 86400);
  if (Math.abs(days) < 365) return { value: days, unit: "day" };
  const years = Math.round(diffSeconds / (86400 * 365));
  return { value: years, unit: "year" };
}

export function formatSiteUpdatedLabel(
  updatedAt: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!updatedAt) return "Atualizado recentemente";
  const then = new Date(updatedAt);
  if (Number.isNaN(then.getTime())) return "Atualizado recentemente";

  const diffSeconds = Math.round((then.getTime() - now.getTime()) / 1000);
  if (diffSeconds >= 0) return "Atualizado agora";

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "always" });
  const { value, unit } = pickRelativeUnit(diffSeconds);
  const relative = rtf.format(value, unit);
  return relative.startsWith("há ") ? `Atualizado ${relative}` : `Atualizado há ${relative}`;
}

/** ZIP usa updated_at; geração usa site_generated_at. */
export function siteGalleryEffectiveUpdatedAt(
  lead: Pick<SiteGalleryLead, "site_source" | "site_generated_at" | "updated_at">,
): string | null {
  if (lead.site_source === "uploaded") return lead.updated_at;
  return lead.site_generated_at;
}

function effectiveUpdatedTimestamp(lead: SiteGalleryLead): number {
  const iso = siteGalleryEffectiveUpdatedAt(lead);
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortSiteGalleryLeads(
  items: SiteGalleryLead[],
  sort: SiteGallerySortId,
): SiteGalleryLead[] {
  const sorted = [...items];
  if (sort === "name_asc") {
    sorted.sort((a, b) => {
      const byName = a.company_name.localeCompare(b.company_name, "pt-BR");
      if (byName !== 0) return byName;
      return b.id - a.id;
    });
  } else if (sort === "status") {
    sorted.sort((a, b) => {
      const byStatus = a.site_status.localeCompare(b.site_status, "pt-BR");
      if (byStatus !== 0) return byStatus;
      const byEffective = effectiveUpdatedTimestamp(b) - effectiveUpdatedTimestamp(a);
      if (byEffective !== 0) return byEffective;
      return b.id - a.id;
    });
  } else {
    sorted.sort((a, b) => {
      const byEffective = effectiveUpdatedTimestamp(b) - effectiveUpdatedTimestamp(a);
      if (byEffective !== 0) return byEffective;
      return b.id - a.id;
    });
  }
  return sorted;
}

export function filterDemoSites(
  items: SiteGalleryLead[],
  q: string,
  sort: SiteGallerySortId,
): SiteGalleryLead[] {
  const needle = q.trim().toLowerCase();
  let list = items;
  if (needle) {
    list = items.filter((item) => item.company_name.toLowerCase().includes(needle));
  }
  const sorted = sortSiteGalleryLeads(list, sort);
  return sorted;
}
