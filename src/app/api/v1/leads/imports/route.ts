import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createLeadSlug } from "@/lib/leads/slug";
import { createLeadIdentityKey } from "@/lib/leads/identity";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const MAX_IMPORT_ROWS = 100;

type ImportLead = {
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

type ImportSource = "maps2sheets" | "foursquare" | "google_places";

type ErrorCode =
  | "invalid_json"
  | "validation_error"
  | "unauthorized"
  | "workspace_not_found"
  | "import_failed";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function textValue(value: unknown, max: number, required = false) {
  if (value === null || value === undefined || value === "") {
    return required ? undefined : null;
  }
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text || text.length > max) return required ? undefined : text ? undefined : null;
  return text;
}

function numericValue(value: unknown, min: number, max: number, integer = false) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < min || value > max || (integer && !Number.isInteger(value))) return undefined;
  return value;
}

function urlValue(value: unknown) {
  const text = textValue(value, 500);
  if (text === null || text === undefined) return text;

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? text : undefined;
  } catch {
    return undefined;
  }
}

function urlArrayValue(value: unknown) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) return undefined;

  const urls = value.map(urlValue);
  return urls.some((url) => url === undefined)
    ? undefined
    : urls.filter((url): url is string => typeof url === "string");
}

function parseLead(value: unknown): ImportLead | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const sourceRef = textValue(row.sourceRef, 500);
  const companyName = textValue(row.companyName, 200, true);
  const phone = textValue(row.phone, 80);
  const address = textValue(row.address, 500);
  const niche = textValue(row.niche, 80, true);
  const city = textValue(row.city, 100, true);
  const websiteUrl = urlValue(row.websiteUrl);
  const googleMapsUrl = urlValue(row.googleMapsUrl);
  const googlePlaceId = textValue(row.googlePlaceId, 500);
  const rating = numericValue(row.rating, 0, 5);
  const reviewCount = numericValue(row.reviewCount, 0, 2_000_000_000, true);
  const email = textValue(row.email, 320);
  const instagram = textValue(row.instagram, 200);
  const facebookId = textValue(row.facebookId, 200);
  const twitter = textValue(row.twitter, 200);
  const latitude = numericValue(row.latitude, -90, 90);
  const longitude = numericValue(row.longitude, -180, 180);
  const photoUrls = urlArrayValue(row.photoUrls);

  if (
    !companyName || !niche || !city || sourceRef === undefined || phone === undefined || address === undefined ||
    websiteUrl === undefined || googleMapsUrl === undefined || googlePlaceId === undefined ||
    rating === undefined || reviewCount === undefined || email === undefined ||
    instagram === undefined || facebookId === undefined || twitter === undefined ||
    latitude === undefined || longitude === undefined || photoUrls === undefined
  ) return null;

  return {
    sourceRef,
    companyName,
    phone,
    address,
    niche,
    city,
    websiteUrl,
    googleMapsUrl,
    googlePlaceId,
    rating,
    reviewCount,
    email,
    instagram,
    facebookId,
    twitter,
    latitude,
    longitude,
    photoUrls,
  };
}

function sourceReference(lead: ImportLead) {
  if (lead.sourceRef) return lead.sourceRef;
  if (lead.googlePlaceId) return `place:${lead.googlePlaceId}`;
  const identity = [lead.companyName, lead.phone, lead.address, lead.city]
    .map((value) => value?.trim().toLocaleLowerCase("pt-BR") ?? "")
    .join("|");
  return `row:${createHash("sha256").update(identity).digest("hex")}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para importar empresas.", 401);
  }

  const rateLimit = checkRateLimit(`lead-import:${userId}`, { limit: 10, windowMs: 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "O arquivo não gerou dados válidos.", 400);
  }

  const rawLeads = body && typeof body === "object"
    ? (body as Record<string, unknown>).leads
    : null;
  const requestedSource = body && typeof body === "object"
    ? (body as Record<string, unknown>).source
    : undefined;
  const source: ImportSource | null = requestedSource === undefined || requestedSource === "maps2sheets"
    ? "maps2sheets"
    : requestedSource === "foursquare" || requestedSource === "google_places"
      ? requestedSource
      : null;

  if (!source || !Array.isArray(rawLeads) || rawLeads.length === 0 || rawLeads.length > MAX_IMPORT_ROWS) {
    return errorResponse(
      "validation_error",
      `Envie entre 1 e ${MAX_IMPORT_ROWS} empresas por importação.`,
      422,
    );
  }

  const leads = rawLeads.map(parseLead);
  const invalidIndex = leads.findIndex((lead) => lead === null);
  if (invalidIndex !== -1) {
    return errorResponse(
      "validation_error",
      `A empresa da linha ${invalidIndex + 2} contém dados inválidos.`,
      422,
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return errorResponse("workspace_not_found", "Seu espaço de trabalho não foi encontrado.", 403);
  }

  const uniqueLeads = new Map<string, ImportLead>();
  for (const lead of leads as ImportLead[]) {
    uniqueLeads.set(createLeadIdentityKey({
      companyName: lead.companyName,
      phone: lead.phone,
      city: lead.city,
    }), lead);
  }

  const { data: existingLeads } = await supabase
    .from("leads")
    .select("company_name, phone, city")
    .eq("workspace_id", membership.workspace_id);
  const existingIdentityKeys = new Set((existingLeads ?? []).map((lead) =>
    createLeadIdentityKey({
      companyName: lead.company_name,
      phone: lead.phone,
      city: lead.city,
    }),
  ));

  const records = [...uniqueLeads.values()]
    .filter((lead) => !existingIdentityKeys.has(createLeadIdentityKey({
      companyName: lead.companyName,
      phone: lead.phone,
      city: lead.city,
    })))
    .map((lead) => ({
    workspace_id: membership.workspace_id,
    google_place_id: lead.googlePlaceId,
    company_name: lead.companyName,
    phone: lead.phone,
    address: lead.address,
    niche: lead.niche,
    city: lead.city,
    website_url: lead.websiteUrl,
    google_maps_url: lead.googleMapsUrl,
    rating: lead.rating,
    review_count: lead.reviewCount,
    email: lead.email,
    instagram: lead.instagram,
    facebook_id: lead.facebookId,
    twitter: lead.twitter,
    latitude: lead.latitude,
    longitude: lead.longitude,
    photos: lead.photoUrls,
    source,
    source_ref: sourceReference(lead),
    slug: createLeadSlug(lead.companyName),
    created_by: userId,
  }));

  if (records.length === 0) {
    return Response.json({
      data: { imported: 0, duplicates: rawLeads.length, received: rawLeads.length },
    }, { status: 200 });
  }

  const { data: imported, error: importError } = await supabase
    .from("leads")
    .upsert(records, {
      onConflict: "workspace_id,source,source_ref",
      ignoreDuplicates: true,
    })
    .select("id");

  if (importError) {
    return errorResponse("import_failed", "Não foi possível salvar o arquivo no CRM.", 500);
  }

  const importedCount = imported?.length ?? 0;
  return Response.json({
    data: {
      imported: importedCount,
      duplicates: rawLeads.length - importedCount,
      received: rawLeads.length,
    },
  }, { status: 201 });
}
