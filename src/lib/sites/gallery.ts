import type { CrmLead } from "@/lib/crm/types";

export const SITE_GALLERY_COLUMNS =
  "id, company_name, niche, slug, site_status, site_source, photos, updated_at";

export const SITE_GALLERY_PAGE_SIZES = [6, 12, 24] as const;
export const SITE_GALLERY_DEFAULT_PAGE_SIZE = 12;

export type SiteGallerySortId = "recent" | "name_asc" | "status";

export type SiteGalleryLead = Pick<
  CrmLead,
  "id" | "company_name" | "niche" | "slug" | "site_status" | "site_source" | "updated_at"
> & {
  photos: unknown;
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
  if (Math.abs(days) < 30) return { value: days, unit: "day" };
  const months = Math.round(diffSeconds / (86400 * 30));
  if (Math.abs(months) < 12) return { value: months, unit: "month" };
  return { value: Math.round(diffSeconds / (86400 * 365)), unit: "year" };
}

export function formatSiteUpdatedLabel(
  updatedAt: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!updatedAt) return "Atualizado recentemente";
  const then = new Date(updatedAt);
  if (Number.isNaN(then.getTime())) return "Atualizado recentemente";

  const diffSeconds = Math.round((then.getTime() - now.getTime()) / 1000);
  if (diffSeconds === 0) return "Atualizado agora";

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const { value, unit } = pickRelativeUnit(diffSeconds);
  const relative = rtf.format(value, unit);
  if (relative.startsWith("há ") || relative === "agora") {
    return `Atualizado ${relative}`;
  }
  return `Atualizado há ${relative}`;
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
  const sorted = [...list];
  if (sort === "name_asc") {
    sorted.sort((a, b) => a.company_name.localeCompare(b.company_name, "pt-BR"));
  } else if (sort === "status") {
    sorted.sort((a, b) => a.site_status.localeCompare(b.site_status, "pt-BR"));
  } else {
    sorted.sort((a, b) => {
      const aTime = a.updated_at ? Date.parse(a.updated_at) : 0;
      const bTime = b.updated_at ? Date.parse(b.updated_at) : 0;
      return bTime - aTime;
    });
  }
  return sorted;
}
