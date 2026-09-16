/**
 * Normaliza a saída do kit externo `Mahanaicoach/google-maps-scraper-kit`
 * (wrapper de `gosom/google-maps-scraper`). Kit não está no monorepo — schema
 * documentado a partir do LEAD set padrão e dos campos `--full` / `--socials`.
 *
 * Lean CSV/JSON (padrão do scrape.py):
 *   title, phone, emails, website, category, address, review_rating, review_count
 *
 * Com --socials: + instagram, facebook, linkedin
 * Com --full: + link, place_id, latitude, longitude, thumbnail, images, cid, …
 */

export type ScraperKitRow = Record<string, unknown>;

export type NormalizedImportLead = {
  sourceRef: string | null;
  companyName: string;
  phone: string | null;
  address: string | null;
  niche: string;
  city: string;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  rating: number | null;
  reviewCount: number | null;
  email: string | null;
  instagram: string | null;
  facebookId: string | null;
  twitter: string | null;
  latitude: number | null;
  longitude: number | null;
  photoUrls: string[];
};

function asTrimmedString(value: unknown, max = 500): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const text = String(value).trim();
    return text && text.length <= max ? text : null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.toLowerCase() === "null" || text === "-") return null;
  return text.length <= max ? text : text.slice(0, max);
}

function asNumber(value: unknown, min: number, max: number, integer = false): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(raw) || raw < min || raw > max) return null;
  return integer ? Math.trunc(raw) : raw;
}

function asUrl(value: unknown): string | null {
  const text = asTrimmedString(value, 500);
  if (!text) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const url = new URL(withProtocol);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function firstEmail(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstEmail(item);
      if (found) return found;
    }
    return null;
  }
  const text = asTrimmedString(value, 2000);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed) || typeof parsed === "string") return firstEmail(parsed);
  } catch {
    // plain text list
  }
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].slice(0, 320) : null;
}

function photoList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(asUrl).filter((url): url is string => Boolean(url)).slice(0, 20);
  }
  const text = asTrimmedString(value, 4000);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return photoList(parsed);
  } catch {
    // pipe/comma separated
  }
  return text
    .split(/[|,;]/)
    .map((part) => asUrl(part.trim()))
    .filter((url): url is string => Boolean(url))
    .slice(0, 20);
}

function pick(row: ScraperKitRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
    const lower = key.toLowerCase();
    for (const [actual, value] of Object.entries(row)) {
      if (actual.toLowerCase() === lower && value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return undefined;
}

function guessCityFromAddress(address: string | null, fallback: string | null): string | null {
  if (fallback) return fallback;
  if (!address) return null;
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2] ?? parts[parts.length - 1];
    const cleaned = candidate.replace(/\b\d{5}-?\d{0,3}\b/g, "").replace(/\b[A-Z]{2}\b/g, "").trim();
    return cleaned.slice(0, 100) || parts[parts.length - 1]?.slice(0, 100) || null;
  }
  return null;
}

/** Detecta se o objeto parece saída do scraper-kit (campos title/review_rating etc.). */
export function looksLikeScraperKitRow(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const row = value as ScraperKitRow;
  const hasTitle = pick(row, ["title", "name", "companyName", "company_name"]) != null;
  const hasKitField =
    pick(row, ["review_rating", "emails", "place_id", "cid", "complete_address", "link"]) != null ||
    (pick(row, ["category"]) != null && pick(row, ["website", "phone"]) != null && pick(row, ["companyName"]) == null);
  return Boolean(hasTitle && hasKitField);
}

export function normalizeScraperKitRow(
  value: unknown,
  defaults: { city?: string | null; niche?: string | null } = {},
): NormalizedImportLead | null {
  if (!value || typeof value !== "object") return null;
  const row = value as ScraperKitRow;

  const companyName = asTrimmedString(
    pick(row, ["title", "name", "companyName", "company_name", "business_name"]),
    200,
  );
  if (!companyName) return null;

  const address = asTrimmedString(
    pick(row, ["address", "complete_address", "formatted_address"]),
    500,
  );
  const city =
    asTrimmedString(pick(row, ["city", "locality", "municipality"]), 100) ??
    guessCityFromAddress(address, defaults.city ?? null);
  const niche =
    asTrimmedString(pick(row, ["category", "niche", "type", "main_category"]), 80) ??
    (defaults.niche ? defaults.niche.slice(0, 80) : null);

  if (!city || !niche) return null;

  const thumbnail = asUrl(pick(row, ["thumbnail", "image_url", "featured_image"]));
  const images = photoList(pick(row, ["images", "photo_urls", "photos", "photoUrls"]));
  const photoUrls = [...(thumbnail ? [thumbnail] : []), ...images]
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, 20);

  const facebook =
    asTrimmedString(pick(row, ["facebook", "facebook_id", "facebookId"]), 200);
  const placeId = asTrimmedString(pick(row, ["place_id", "placeId", "google_place_id", "googlePlaceId"]), 500);
  const cid = asTrimmedString(pick(row, ["cid", "data_id"]), 200);
  const mapsUrl =
    asUrl(pick(row, ["link", "google_maps_url", "googleMapsUrl", "url", "maps_url"])) ??
    (placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : null);

  return {
    sourceRef: placeId ? `place:${placeId}` : cid ? `cid:${cid}` : null,
    companyName,
    phone: asTrimmedString(pick(row, ["phone", "phone_number", "international_phone"]), 80),
    address,
    niche,
    city,
    websiteUrl: asUrl(pick(row, ["website", "website_url", "websiteUrl", "site"])),
    googleMapsUrl: mapsUrl,
    googlePlaceId: placeId,
    rating: asNumber(pick(row, ["review_rating", "rating", "stars"]), 0, 5),
    reviewCount: asNumber(pick(row, ["review_count", "reviews", "user_rating_count"]), 0, 2_000_000_000, true),
    email: firstEmail(pick(row, ["emails", "email", "business_email"])),
    instagram: asTrimmedString(pick(row, ["instagram", "instagram_url"]), 200),
    facebookId: facebook,
    twitter: asTrimmedString(pick(row, ["twitter", "x", "linkedin"]), 200),
    latitude: asNumber(pick(row, ["latitude", "lat"]), -90, 90),
    longitude: asNumber(pick(row, ["longitude", "lon", "lng", "long"]), -180, 180),
    photoUrls,
  };
}
