import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createLeadSlug } from "@/lib/leads/slug";
import { createLeadIdentityKey } from "@/lib/leads/identity";
import {
  importRequestSchema,
  MAX_IMPORT_ROWS,
  parseImportLead,
  type ImportSource,
  type CanonicalImportLead,
} from "@/lib/leads/import-schema";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type ErrorCode =
  | "invalid_json"
  | "validation_error"
  | "unauthorized"
  | "workspace_not_found"
  | "import_failed";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function sourceReference(lead: CanonicalImportLead) {
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

  const parsedBody = importRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return errorResponse(
      "validation_error",
      `Envie entre 1 e ${MAX_IMPORT_ROWS} empresas por importação (fonte: maps2sheets, foursquare, google_places ou scraper_kit).`,
      422,
    );
  }

  const { source, leads: rawLeads, defaultCity, defaultNiche } = parsedBody.data;
  const typedSource: ImportSource = source;

  if (typedSource === "scraper_kit" && (!defaultCity || !defaultNiche)) {
    const needsDefaults = rawLeads.some((row) => {
      if (!row || typeof row !== "object") return true;
      const record = row as Record<string, unknown>;
      const hasCity = Boolean(record.city || record.locality);
      const hasNiche = Boolean(record.niche || record.category);
      return !hasCity || !hasNiche;
    });
    if (needsDefaults && (!defaultCity || !defaultNiche)) {
      // continua — normalizeScraperKitRow tenta inferir cidade do endereço / category
    }
  }

  const leads: CanonicalImportLead[] = [];
  for (let index = 0; index < rawLeads.length; index += 1) {
    const result = parseImportLead(rawLeads[index], typedSource, {
      city: defaultCity,
      niche: defaultNiche,
    });
    if (!result.lead) {
      return errorResponse(
        "validation_error",
        `A empresa da linha ${index + 2} contém dados inválidos${result.error ? `: ${result.error}` : "."}`,
        422,
      );
    }
    leads.push(result.lead);
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

  const uniqueLeads = new Map<string, CanonicalImportLead>();
  for (const lead of leads) {
    uniqueLeads.set(createLeadIdentityKey({
      companyName: lead.companyName,
      phone: lead.phone,
      city: lead.city,
    }), lead);
  }

  const companyNames = [...new Set([...uniqueLeads.values()].map((lead) => lead.companyName))];
  const existingIdentityKeys = new Set<string>();
  const NAME_CHUNK = 100;
  for (let offset = 0; offset < companyNames.length; offset += NAME_CHUNK) {
    const chunk = companyNames.slice(offset, offset + NAME_CHUNK);
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("company_name, phone, city")
      .eq("workspace_id", membership.workspace_id)
      .in("company_name", chunk);
    for (const lead of existingLeads ?? []) {
      existingIdentityKeys.add(
        createLeadIdentityKey({
          companyName: lead.company_name,
          phone: lead.phone,
          city: lead.city,
        }),
      );
    }
  }

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
      source: typedSource,
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
