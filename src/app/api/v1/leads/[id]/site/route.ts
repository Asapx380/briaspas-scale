import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para publicar este site.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "O corpo da requisição não é um JSON válido.", 400);
  }

  const action = body && typeof body === "object" ? (body as Record<string, unknown>).action : null;
  if (action !== "publish" && action !== "unpublish") {
    return errorResponse("validation_error", "Escolha publicar ou despublicar o site.", 422);
  }

  const { data: current, error: currentError } = await supabase
    .from("leads").select("site_html, site_source, site_storage_path, site_status").eq("id", id).maybeSingle();
  if (currentError) return errorResponse("site_load_failed", "Não foi possível carregar o site.", 500);
  if (!current) return errorResponse("site_not_ready", "Lead não encontrado.", 404);
  const hasUploadedSite = current.site_source === "uploaded" && Boolean(current.site_storage_path);
  if (action === "publish" && !current.site_html && !hasUploadedSite) {
    return errorResponse("site_not_ready", "Envie um ZIP ou gere um site antes de publicar.", 409);
  }
  if (action === "unpublish" && current.site_status !== "published") {
    return errorResponse("site_not_ready", "Este site não está publicado.", 409);
  }

  const query = supabase.from("leads")
    .update({ site_status: action === "publish" ? "published" : "ready" })
    .eq("id", id);

  const { data, error } = await query
    .select("id, site_status, slug")
    .maybeSingle();

  if (error) return errorResponse("site_update_failed", "Não foi possível atualizar a publicação.", 500);
  if (!data) return errorResponse("site_update_failed", "Não foi possível atualizar a publicação.", 500);

  revalidateTag("published-sites", "max");

  return Response.json({ data });
}
