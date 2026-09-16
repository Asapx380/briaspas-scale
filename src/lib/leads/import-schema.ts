import { z } from "zod";
import {
  looksLikeScraperKitRow,
  normalizeScraperKitRow,
  type NormalizedImportLead,
} from "@/lib/leads/scraper-kit";

export const MAX_IMPORT_ROWS = 200;

export const importSourceSchema = z.enum([
  "maps2sheets",
  "foursquare",
  "google_places",
  "scraper_kit",
]);

export type ImportSource = z.infer<typeof importSourceSchema>;

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const text = value.trim();
      if (!text) return null;
      if (text.length > max) throw new Error(`texto_excede_${max}`);
      return text;
    });

const requiredText = (max: number) =>
  z.string().trim().min(1).max(max);

const optionalUrl = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const text = value.trim();
    if (!text) return null;
    try {
      const url = new URL(text);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        ctx.addIssue({ code: "custom", message: "url_invalida" });
        return z.NEVER;
      }
      return text.length <= 500 ? text : text.slice(0, 500);
    } catch {
      ctx.addIssue({ code: "custom", message: "url_invalida" });
      return z.NEVER;
    }
  });

const optionalRating = z
  .union([z.number(), z.null(), z.undefined()])
  .refine((value) => value === null || value === undefined || (value >= 0 && value <= 5), "rating_invalido")
  .transform((value) => (value === undefined ? null : value));

const optionalReviewCount = z
  .union([z.number(), z.null(), z.undefined()])
  .refine(
    (value) =>
      value === null ||
      value === undefined ||
      (Number.isInteger(value) && value >= 0 && value <= 2_000_000_000),
    "review_count_invalido",
  )
  .transform((value) => (value === undefined ? null : value));

const optionalCoord = (min: number, max: number) =>
  z
    .union([z.number(), z.null(), z.undefined()])
    .refine(
      (value) => value === null || value === undefined || (Number.isFinite(value) && value >= min && value <= max),
      "coord_invalida",
    )
    .transform((value) => (value === undefined ? null : value));

const photoUrlsSchema = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .transform((value, ctx) => {
    if (value === null || value === undefined) return [] as string[];
    if (value.length > 20) {
      ctx.addIssue({ code: "custom", message: "photos_excedem" });
      return z.NEVER;
    }
    const urls: string[] = [];
    for (const item of value) {
      try {
        const url = new URL(item);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          ctx.addIssue({ code: "custom", message: "photo_url_invalida" });
          return z.NEVER;
        }
        urls.push(item);
      } catch {
        ctx.addIssue({ code: "custom", message: "photo_url_invalida" });
        return z.NEVER;
      }
    }
    return urls;
  });

/** Formato canônico já usado por Maps2Sheets / Foursquare / Google Places. */
export const canonicalImportLeadSchema = z.object({
  sourceRef: optionalText(500),
  companyName: requiredText(200),
  phone: optionalText(80),
  address: optionalText(500),
  niche: requiredText(80),
  city: requiredText(100),
  websiteUrl: optionalUrl,
  googleMapsUrl: optionalUrl,
  googlePlaceId: optionalText(500),
  rating: optionalRating,
  reviewCount: optionalReviewCount,
  email: optionalText(320),
  instagram: optionalText(200),
  facebookId: optionalText(200),
  twitter: optionalText(200),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
  photoUrls: photoUrlsSchema,
});

export const importRequestSchema = z.object({
  source: importSourceSchema.optional().default("maps2sheets"),
  defaultCity: z.string().trim().max(100).optional(),
  defaultNiche: z.string().trim().max(80).optional(),
  leads: z.array(z.unknown()).min(1).max(MAX_IMPORT_ROWS),
});

export type CanonicalImportLead = z.infer<typeof canonicalImportLeadSchema>;

export function parseImportLead(
  value: unknown,
  source: ImportSource,
  defaults: { city?: string; niche?: string } = {},
): { lead: NormalizedImportLead; error?: undefined } | { lead?: undefined; error: string } {
  if (source === "scraper_kit" || looksLikeScraperKitRow(value)) {
    const normalized = normalizeScraperKitRow(value, defaults);
    if (!normalized) {
      return { error: "Linha do scraper-kit inválida ou sem nome/nicho/cidade." };
    }
    const checked = canonicalImportLeadSchema.safeParse(normalized);
    if (!checked.success) return { error: "Linha do scraper-kit não passou na validação." };
    return { lead: checked.data };
  }

  const checked = canonicalImportLeadSchema.safeParse(value);
  if (!checked.success) return { error: "Empresa com dados inválidos." };
  return { lead: checked.data };
}
