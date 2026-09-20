import { createClient } from "@/lib/supabase/server";
import {
  buildPlacesEnrichmentPatch,
  buildPlacesLookupQuery,
} from "@/lib/crm/places-enrichment";
import { isGooglePlacesConfigured } from "@/lib/google-places/env";
import { lookupPlaceByTextQuery } from "@/lib/google-places/lookup-place";

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

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select(
      "id, company_name, city, phone, address, niche, website_url, google_maps_url, rating, review_count, google_place_id",
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

  let discovered;
  try {
    discovered = await lookupPlaceByTextQuery(query);
  } catch {
    return errorResponse(
      "places_request_failed",
      "Não foi possível consultar o Google Places agora. Tente novamente em instantes.",
      502,
    );
  }

  if (!discovered) {
    return errorResponse(
      "places_no_match",
      "Nenhum estabelecimento correspondente foi encontrado no Google Maps.",
      404,
    );
  }

  const patch = buildPlacesEnrichmentPatch(
    {
      phone: (lead.phone as string | null) ?? null,
      address: (lead.address as string | null) ?? null,
      niche: (lead.niche as string | null) ?? null,
      website_url: (lead.website_url as string | null) ?? null,
      google_maps_url: (lead.google_maps_url as string | null) ?? null,
      rating: (lead.rating as number | null) ?? null,
      review_count: (lead.review_count as number | null) ?? null,
    },
    discovered,
  );

  if (!patch) {
    return Response.json({
      lead,
      enriched: false,
      message: "Os dados do lead já estão completos; nada foi alterado.",
      matchedPlace: discovered.companyName,
    });
  }

  const updatePayload: Record<string, unknown> = { ...patch };
  if (lead.google_place_id && patch.google_place_id) {
    delete updatePayload.google_place_id;
    delete updatePayload.source;
    delete updatePayload.source_ref;
  }

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", id)
    .is("deleted_at", null)
    .select(
      "id, company_name, phone, email, address, niche, city, website_url, google_maps_url, rating, review_count, updated_at",
    )
    .maybeSingle();

  if (updateError) {
    return errorResponse("lead_update_failed", "Não foi possível salvar os dados enriquecidos.", 500);
  }
  if (!updated) {
    return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  }

  return Response.json({
    lead: updated,
    enriched: true,
    fields: Object.keys(patch),
    matchedPlace: discovered.companyName,
  });
}
