import { analyzeBusiness } from "@/lib/ai/business-analyzer";
import { generateOutreach } from "@/lib/ai/outreach-generator";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para gerar o diagnóstico.", 401);
  }
  const userId = claimsData.claims.sub;
  const rateLimit = checkRateLimit(`lead-diagnosis:${userId}`, { limit: 12, windowMs: 10 * 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  let channel: "whatsapp" | "email" | "sms" = "whatsapp";
  try {
    const body = await request.json().catch(() => ({})) as { channel?: string };
    if (body.channel === "email" || body.channel === "sms" || body.channel === "whatsapp") {
      channel = body.channel;
    }
  } catch {
    channel = "whatsapp";
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, company_name, niche, city, phone, website_url, google_maps_url, rating, review_count, address, notes, site_status, slug")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!lead) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);

  const analysis = await analyzeBusiness({
    companyName: lead.company_name,
    niche: lead.niche,
    city: lead.city,
    phone: lead.phone,
    websiteUrl: lead.website_url,
    googleMapsUrl: lead.google_maps_url,
    rating: lead.rating,
    reviewCount: lead.review_count,
    address: lead.address,
    notes: lead.notes,
    hasDemoSite: lead.site_status === "ready" || lead.site_status === "published",
  });

  const demoSiteUrl =
    lead.site_status === "published" ? `/empresa/${encodeURIComponent(lead.slug)}` : null;

  const outreach = await generateOutreach({
    companyName: lead.company_name,
    niche: lead.niche,
    city: lead.city,
    phone: lead.phone,
    demoSiteUrl,
    diagnosis: analysis.diagnosis,
    channel,
  });

  const diagnosisPayload = {
    ...analysis.diagnosis,
    generatedAt: new Date().toISOString(),
    provider: analysis.provider,
    fallback: analysis.fallback,
  };
  const outreachPayload = {
    ...outreach.copy,
    channel,
    generatedAt: new Date().toISOString(),
    provider: outreach.provider,
    fallback: outreach.fallback,
  };

  await supabase
    .from("leads")
    .update({
      ai_diagnosis: diagnosisPayload,
      ai_outreach: outreachPayload,
    })
    .eq("id", id);

  return Response.json({
    data: {
      diagnosis: diagnosisPayload,
      outreach: outreachPayload,
    },
  });
}
