import { createClient } from "@/lib/supabase/server";
import { buildPlacesLookupQuery } from "@/lib/crm/places-enrichment";
import { isGooglePlacesConfigured } from "@/lib/google-places/env";
import { lookupPlacesByTextQuery } from "@/lib/google-places/lookup-place";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);
  }

  if (!isGooglePlacesConfigured()) {
    return errorResponse(
      "places_not_configured",
      "Google Places não está configurado neste ambiente.",
      503,
    );
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para enriquecer este lead.", 401);
  }
  const userId = claimsData.claims.sub;
  const rateLimit = checkRateLimit(`places-lookup:${userId}`, { limit: 12, windowMs: 10 * 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, company_name, city",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (leadError) {
    return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  }
  if (!lead) {
    return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  }

  const query = buildPlacesLookupQuery(String(lead.company_name), (lead.city as string | null) ?? null);

  let places;
  try {
    places = await lookupPlacesByTextQuery(query);
  } catch {
    return errorResponse(
      "places_request_failed",
      "Não foi possível consultar o Google Places agora. Tente novamente em instantes.",
      502,
    );
  }

  if (places.length === 0) {
    return errorResponse(
      "places_no_match",
      "Nenhum estabelecimento correspondente foi encontrado no Google Maps.",
      404,
    );
  }

  return Response.json({
    places: places.map((place) => ({
      name: place.companyName,
      category: place.category,
      address: place.address,
      phone: place.phone,
      websiteUrl: place.websiteUrl,
      googleMapsUrl: place.googleMapsUrl,
      rating: place.rating,
      reviewCount: place.reviewCount,
    })),
  });
}
