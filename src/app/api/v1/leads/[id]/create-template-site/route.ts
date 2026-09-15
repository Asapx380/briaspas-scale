import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { findStockPhotoForCategory } from "@/lib/images/stock-photo";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { buildSiteBriefPrompt, type LeadSiteInput } from "@/lib/sites/build-generation-prompt";
import { designPlanSchema, type SiteBrief } from "@/lib/sites/design-plan";
import { createSitePreviewToken, hashSitePreviewToken, SITE_PREVIEW_TTL_MS } from "@/lib/sites/site-preview-token";
import { getSelectedSiteGeneratorProvider, generateSiteBrief, isSiteGeneratorConfigured } from "@/lib/sites/site-generator";
import { createStoredSiteZip } from "@/lib/sites/site-zip-writer";
import { renderSiteTemplate, SiteTemplateError } from "@/lib/sites/template-renderer";
import { readUploadedSiteZip } from "@/lib/sites/uploaded-site-zip";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LeadRecord = {
  id: number; workspace_id: number; company_name: string; niche: string | null; phone: string | null;
  address: string | null; instagram: string | null; website_url: string | null; google_maps_url: string | null;
  photos: unknown; rating: number | null; review_count: number | null; slug: string;
  site_status: string; site_brief: unknown;
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string") return errorResponse("unauthorized", "Entre na sua conta para criar o site.", 401);
  const rateLimit = checkRateLimit(`template-site:${userId}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  const { data, error } = await supabase.from("leads")
    .select("id, workspace_id, company_name, niche, phone, address, instagram, website_url, google_maps_url, photos, rating, review_count, slug, site_status, site_brief")
    .eq("id", id).maybeSingle();
  if (error) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  const lead = data as LeadRecord;
  if (lead.site_status === "published") return errorResponse("site_is_published", "Despublique o site atual antes de gerar uma nova versão.", 409);

  const input: LeadSiteInput = {
    companyName: lead.company_name, category: lead.niche?.trim() || "negócio local", phone: lead.phone,
    address: lead.address, instagram: lead.instagram, websiteUrl: lead.website_url, googleMapsUrl: lead.google_maps_url,
    photoUrls: photoUrls(lead.photos), stockPhoto: null, rating: lead.rating, reviewCount: lead.review_count,
  };
  if (input.photoUrls.length === 0) input.stockPhoto = await findStockPhotoForCategory(input.category);

  const existingBrief = designPlanSchema.safeParse(lead.site_brief);
  let brief = existingBrief.success ? existingBrief.data : null;
  let generation: Awaited<ReturnType<typeof generateSiteBrief>> | null = null;
  const startedAt = Date.now();

  try {
    if (!brief) {
      if (!isSiteGeneratorConfigured()) return errorResponse("site_generator_not_configured", "Configure Groq, OpenAI ou Gemini antes de criar o site.", 503);
      generation = await generateSiteBrief(buildSiteBriefPrompt(input));
      brief = withTrustedStockPhoto(generation.plan, input);
    } else {
      brief = withTrustedStockPhoto(brief, input);
    }

    const rendered = await renderSiteTemplate(input, brief);
    const zip = createStoredSiteZip(rendered.files);
    const validatedFiles = await readUploadedSiteZip(zip);
    const storagePath = `leads/${lead.id}/site/${randomUUID()}`;
    for (const file of validatedFiles) {
      const { error: uploadError } = await supabase.storage.from("lead-sites").upload(`${storagePath}/${file.path}`, file.content, {
        contentType: file.contentType, upsert: false,
      });
      if (uploadError) throw new Error("template_site_upload_failed");
    }

    const token = createSitePreviewToken();
    const expiresAt = new Date(Date.now() + SITE_PREVIEW_TTL_MS).toISOString();
    const generatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase.from("leads").update({
      site_brief: brief, brief_generated_at: generatedAt, site_source: "uploaded", site_storage_path: storagePath,
      site_status: "ready", site_preview_token_hash: hashSitePreviewToken(token), site_preview_expires_at: expiresAt,
    }).eq("id", id).select("id, slug, site_status, site_source, site_brief").maybeSingle();
    if (updateError || !updated) throw new Error("template_site_save_failed");

    if (generation) {
      await supabase.from("generation_runs").insert({
        workspace_id: lead.workspace_id, lead_id: lead.id, requested_by: userId,
        provider: generation.provider, model: generation.response.model, status: "succeeded",
        duration_ms: Date.now() - startedAt, design_attempts: generation.attempts, html_attempts: 0,
        prompt_tokens: generation.response.usage.promptTokens, completion_tokens: generation.response.usage.completionTokens,
        total_tokens: generation.response.usage.totalTokens,
      });
    }

    revalidateTag("published-sites", "max");
    const previewUrl = new URL(`/empresa/${encodeURIComponent(lead.slug)}`, request.url);
    previewUrl.searchParams.set("preview", token);
    return Response.json({ data: { ...updated, templateId: rendered.templateId, previewUrl: `${previewUrl.pathname}${previewUrl.search}`, previewExpiresAt: expiresAt } });
  } catch (creationError) {
    if (generation) {
      await supabase.from("generation_runs").insert({
        workspace_id: lead.workspace_id, lead_id: lead.id, requested_by: userId,
        provider: generation.provider ?? getSelectedSiteGeneratorProvider() ?? "unknown", model: generation.response.model,
        status: "failed", duration_ms: Date.now() - startedAt,
        error_code: creationError instanceof Error ? creationError.name : "UnknownError",
      });
    }
    if (creationError instanceof SiteTemplateError) return errorResponse("template_validation_failed", creationError.message, 422);
    console.error(`template_site_creation_failed lead=${id} error=${creationError instanceof Error ? creationError.message : "unknown"}`);
    return errorResponse("template_site_creation_failed", "Não foi possível criar o site pelo modelo. Tente novamente.", 500);
  }
}
