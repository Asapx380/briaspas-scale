import { createClient } from "@/lib/supabase/server";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para restaurar este lead.", 401);
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id, deleted_at")
    .maybeSingle();

  if (error) return errorResponse("lead_restore_failed", "Não foi possível restaurar o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não está na lixeira deste espaço de trabalho.", 404);
  return Response.json({ lead: data });
}
