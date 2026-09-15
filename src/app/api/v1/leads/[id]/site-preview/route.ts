import { createClient } from "@/lib/supabase/server";
import { createSitePreviewToken, hashSitePreviewToken, SITE_PREVIEW_TTL_MS } from "@/lib/sites/site-preview-token";

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
    return errorResponse("unauthorized", "Entre na sua conta para pré-visualizar este site.", 401);
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, slug, site_source, site_storage_path")
    .eq("id", id)
    .maybeSingle();
  if (leadError) return errorResponse("lead_load_failed", "Não foi possível carregar o lead.", 500);
  if (!lead) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  if (lead.site_source !== "uploaded" || !lead.site_storage_path) {
    return errorResponse("site_not_ready", "Envie um ZIP antes de abrir a pré-visualização.", 409);
  }

  const token = createSitePreviewToken();
  const expiresAt = new Date(Date.now() + SITE_PREVIEW_TTL_MS).toISOString();
  const { error: updateError } = await supabase
    .from("leads")
    .update({ site_preview_token_hash: hashSitePreviewToken(token), site_preview_expires_at: expiresAt })
    .eq("id", id);
  if (updateError) return errorResponse("preview_create_failed", "Não foi possível criar a pré-visualização.", 500);

  const previewUrl = new URL(`/empresa/${encodeURIComponent(lead.slug)}`, request.url);
  previewUrl.searchParams.set("preview", token);
  return Response.json({ data: { url: `${previewUrl.pathname}${previewUrl.search}`, expiresAt } });
}
