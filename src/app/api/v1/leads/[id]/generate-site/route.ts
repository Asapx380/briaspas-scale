import {
  getSelectedSiteGeneratorProvider,
  getSiteGeneratorErrorProvider,
  getSiteGeneratorErrorStatus,
  generateLeadSite,
  isSiteGeneratorConfigured,
} from "@/lib/sites/site-generator";
import {
  buildLeadMapEmbedUrl,
  buildLeadWhatsAppUrl,
  buildLeadSitePrompt,
  type LeadSiteInput,
} from "@/lib/sites/build-generation-prompt";
import { buildDesignPlanPrompt } from "@/lib/sites/design-plan";
import { InvalidGeneratedSiteError } from "@/lib/sites/generated-site-validation";
import { findStockPhotoForCategory } from "@/lib/images/stock-photo";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

type LeadRecord = {
  id: number;
  workspace_id: number;
  company_name: string;
  niche: string | null;
  phone: string | null;
  address: string | null;
  instagram: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  photos: unknown;
  rating: number | null;
  review_count: number | null;
  site_status: string;
};

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function photoUrls(value: unknown) {
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
import { estimatedSiteGenerationCostUsd } from "@/lib/sites/site-generation-estimated-cost";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para gerar este site.", 401);
  }
  const userId = claimsData.claims.sub;
  const rateLimit = checkRateLimit(`site-generation:${userId}`, { limit: 5, windowMs: 10 * 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  if (!isSiteGeneratorConfigured()) {
    return errorResponse(
      "site_generator_not_configured",
      "Adicione GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY ao arquivo .env.local e reinicie o servidor.",
      503,
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, workspace_id, company_name, niche, phone, address, instagram, website_url, google_maps_url, photos, rating, review_count, site_status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);

  const lead = data as LeadRecord;
  if (lead.site_status === "generating") {
    return errorResponse("site_already_generating", "Este site já está sendo gerado.", 409);
  }

  const input: LeadSiteInput = {
    companyName: lead.company_name,
    category: lead.niche?.trim() || "negócio local",
    phone: lead.phone,
    address: lead.address,
    instagram: lead.instagram,
    websiteUrl: lead.website_url,
    googleMapsUrl: lead.google_maps_url,
    photoUrls: photoUrls(lead.photos),
    stockPhoto: null,
    rating: lead.rating,
    reviewCount: lead.review_count,
  };

  if (input.photoUrls.length === 0) {
    input.stockPhoto = await findStockPhotoForCategory(input.category);
  }

  const { error: lockError } = await supabase
    .from("leads")
    .update({ site_status: "generating" })
    .eq("id", id);

  if (lockError) {
    return errorResponse("site_generation_not_started", "Não foi possível iniciar a geração.", 500);
  }

  const generationStartedAt = Date.now();
  try {
    const generated = await generateLeadSite(
      buildLeadSitePrompt(input),
      buildDesignPlanPrompt(input.category, input.photoUrls.length > 0),
      {
        whatsappUrl: buildLeadWhatsAppUrl(input.phone),
        mapEmbedUrl: buildLeadMapEmbedUrl(input.address),
        photoUrls: input.stockPhoto ? [...input.photoUrls, input.stockPhoto.url] : input.photoUrls,
        externalUrls: [
          input.instagram,
          input.websiteUrl,
          input.googleMapsUrl,
          input.stockPhoto?.photographerUrl,
          input.stockPhoto?.pexelsUrl,
        ].filter(
          (url): url is string => Boolean(url),
        ),
      },
    );
    const generatedAt = new Date().toISOString();
    const { data: updated, error: saveError } = await supabase
      .from("leads")
      .update({
        site_html: generated.html,
        site_schema: {
          version: 2,
          provider: generated.provider,
          model: generated.model,
          lead: input,
          designPlan: generated.designPlan,
          attempts: generated.attempts,
          durationMs: generated.durationMs,
          usage: generated.usage,
        },
        site_status: "ready",
        site_generated_at: generatedAt,
      })
      .eq("id", id)
      .select("id, site_status, site_generated_at")
      .maybeSingle();

    if (saveError || !updated) {
      throw new Error("site_save_failed");
    }

    await supabase.from("generation_runs").insert({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      requested_by: userId,
      provider: generated.provider,
      model: generated.model,
      status: "succeeded",
      duration_ms: generated.durationMs,
      design_attempts: generated.attempts.design,
      html_attempts: generated.attempts.html,
      prompt_tokens: generated.usage.promptTokens,
      completion_tokens: generated.usage.completionTokens,
      total_tokens: generated.usage.totalTokens,
      estimated_cost_usd: estimatedSiteGenerationCostUsd(
        generated.provider,
        generated.usage.promptTokens,
        generated.usage.completionTokens,
      ),
    });

    console.info("site_generation", {
      leadId: lead.id,
      status: "succeeded",
      durationMs: generated.durationMs,
      attempts: generated.attempts,
      totalTokens: generated.usage.totalTokens,
    });

    return Response.json({ data: updated });
  } catch (generationError) {
    await supabase.from("leads").update({ site_status: "failed" }).eq("id", id);
    const errorCode = generationError instanceof Error ? generationError.name : "UnknownError";
    await supabase.from("generation_runs").insert({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      requested_by: userId,
      provider: getSiteGeneratorErrorProvider(generationError) ?? getSelectedSiteGeneratorProvider() ?? "unknown",
      model:
        getSiteGeneratorErrorProvider(generationError) === "openai"
          ? process.env.OPENAI_SITE_MODEL ?? "unknown"
          : getSiteGeneratorErrorProvider(generationError) === "gemini"
            ? process.env.GEMINI_SITE_MODEL ?? "unknown"
            : getSiteGeneratorErrorProvider(generationError) === "openrouter"
              ? process.env.OPENROUTER_SITE_MODEL ?? "openrouter/free"
              : process.env.GROQ_SITE_MODEL ?? "unknown",
      status: "failed",
      duration_ms: Date.now() - generationStartedAt,
      error_code: errorCode,
    });
    console.error("site_generation", {
      leadId: lead.id,
      status: "failed",
      durationMs: Date.now() - generationStartedAt,
      errorCode,
    });

    const provider = getSiteGeneratorErrorProvider(generationError);
    const upstreamStatus = getSiteGeneratorErrorStatus(generationError);
    if (provider && upstreamStatus) {
      const providerLabel =
        provider === "openai"
          ? "OpenAI"
          : provider === "gemini"
            ? "Gemini"
            : provider === "openrouter"
              ? "OpenRouter"
              : "Groq";
      if (upstreamStatus === 401) {
        return errorResponse(`${provider}_unauthorized`, `A chave da ${providerLabel} não foi aceita.`, 502);
      }
      if (upstreamStatus === 429) {
        const message =
          provider === "gemini"
            ? "A cota gratuita da Gemini foi atingida (RPM, TPM ou RPD). Aguarde o limite renovar e consulte o AI Studio."
            : provider === "openrouter"
              ? "A capacidade do modelo gratuito da OpenRouter foi atingida. Aguarde o limite renovar e tente novamente."
              : `O limite temporário da ${providerLabel} foi atingido. Tente novamente em instantes.`;
        return errorResponse(`${provider}_rate_limit`, message, 429);
      }
      return errorResponse(`${provider}_request_failed`, `A ${providerLabel} não conseguiu gerar o site agora.`, 502);
    }

    if (generationError instanceof InvalidGeneratedSiteError) {
      return errorResponse("invalid_generated_site", "A IA devolveu um HTML inválido. Tente gerar novamente.", 502);
    }

    if (generationError instanceof DOMException && generationError.name === "TimeoutError") {
      return errorResponse("site_generator_timeout", "A geração demorou demais. Tente novamente.", 504);
    }

    return errorResponse("site_generation_failed", "Não foi possível gerar ou salvar o site.", 500);
  }
}
