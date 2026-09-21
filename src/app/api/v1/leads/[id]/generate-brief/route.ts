import { findStockPhotoForCategory } from "@/lib/images/stock-photo";
import { buildSiteBriefPrompt, type LeadSiteInput } from "@/lib/sites/build-generation-prompt";
import { getSelectedSiteGeneratorProvider, generateSiteBrief, isSiteGeneratorConfigured } from "@/lib/sites/site-generator";
import type { SiteBrief } from "@/lib/sites/design-plan";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

type LeadRecord = {
  id: number; workspace_id: number; company_name: string; niche: string | null; phone: string | null;
  address: string | null; instagram: string | null; website_url: string | null; google_maps_url: string | null;
  photos: unknown; rating: number | null; review_count: number | null;
};

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function photoUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => {
    if (typeof item !== "string") return false;
    try { return ["http:", "https:"].includes(new URL(item).protocol); } catch { return false; }
  });
}

function withTrustedStockPhoto(brief: SiteBrief, input: LeadSiteInput): SiteBrief {
  return {
    ...brief,
    fotoSugerida: input.stockPhoto
      ? { url: input.stockPhoto.url, credito: `Foto por ${input.stockPhoto.photographer} no Pexels` }
      : null,
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") return errorResponse("unauthorized", "Entre na sua conta para gerar o briefing.", 401);
  const userId = claimsData.claims.sub;
  const rateLimit = checkRateLimit(`site-brief:${userId}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!isSiteGeneratorConfigured()) return errorResponse("site_generator_not_configured", "Adicione GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY ao arquivo .env.local e reinicie o servidor.", 503);

  const { data, error } = await supabase.from("leads")
    .select("id, workspace_id, company_name, niche, phone, address, instagram, website_url, google_maps_url, photos, rating, review_count")
    .eq("id", id).maybeSingle();
  if (error) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);

  const lead = data as LeadRecord;
  const input: LeadSiteInput = {
    companyName: lead.company_name, category: lead.niche?.trim() || "negócio local", phone: lead.phone,
    address: lead.address, instagram: lead.instagram, websiteUrl: lead.website_url, googleMapsUrl: lead.google_maps_url,
    photoUrls: photoUrls(lead.photos), stockPhoto: null, rating: lead.rating, reviewCount: lead.review_count,
  };
  if (input.photoUrls.length === 0) input.stockPhoto = await findStockPhotoForCategory(input.category);

  const startedAt = Date.now();
  try {
    const generated = await generateSiteBrief(buildSiteBriefPrompt(input));
    const brief = withTrustedStockPhoto(generated.plan, input);
    const { data: updated, error: saveError } = await supabase.from("leads")
      .update({ site_brief: brief, brief_generated_at: new Date().toISOString() })
      .eq("id", id).select("id, site_brief, brief_generated_at").maybeSingle();
    if (saveError || !updated) throw new Error("brief_save_failed");

    await supabase.from("generation_runs").insert({
      workspace_id: lead.workspace_id, lead_id: lead.id, requested_by: userId,
      provider: generated.provider, model: generated.response.model, status: "succeeded",
      duration_ms: Date.now() - startedAt, design_attempts: generated.attempts, html_attempts: 0,
      prompt_tokens: generated.response.usage.promptTokens, completion_tokens: generated.response.usage.completionTokens,
      total_tokens: generated.response.usage.totalTokens,
    });
    return Response.json({ data: { brief, generatedAt: updated.brief_generated_at } });
  } catch (generationError) {
    await supabase.from("generation_runs").insert({
      workspace_id: lead.workspace_id, lead_id: lead.id, requested_by: userId,
      provider: getSelectedSiteGeneratorProvider() ?? "unknown", model: "unknown", status: "failed",
      duration_ms: Date.now() - startedAt, error_code: generationError instanceof Error ? generationError.name : "UnknownError",
    });
    return errorResponse("brief_generation_failed", "Não foi possível gerar o briefing. Tente novamente.", 502);
  }
}
