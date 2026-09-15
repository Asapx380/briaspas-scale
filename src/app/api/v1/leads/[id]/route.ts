import { createClient } from "@/lib/supabase/server";

const LEAD_STATUSES = ["new", "contacted", "replied", "hot", "proposal", "won", "lost"] as const;
type LeadStatus = (typeof LEAD_STATUSES)[number];

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

function nullableText(value: unknown, maximumLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maximumLength ? text || null : undefined;
}

function parseInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const status = typeof body.status === "string" && LEAD_STATUSES.includes(body.status as LeadStatus)
    ? body.status as LeadStatus
    : null;
  const notes = nullableText(body.notes, 10_000);
  const estimatedValue = body.estimatedValue === null || body.estimatedValue === ""
    ? null
    : typeof body.estimatedValue === "number" && Number.isFinite(body.estimatedValue) && body.estimatedValue >= 0 && body.estimatedValue <= 9_999_999_999.99
      ? body.estimatedValue
      : undefined;
  const followUpText = nullableText(body.followUpAt, 40);
  const followUpAt = followUpText === null
    ? null
    : followUpText !== undefined && !Number.isNaN(Date.parse(followUpText))
      ? new Date(followUpText).toISOString()
      : undefined;

  if (!status || notes === undefined || estimatedValue === undefined || followUpAt === undefined) return null;
  return { status, notes, estimatedValue, followUpAt };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para editar este lead.", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "O corpo da requisição não é um JSON válido.", 400);
  }

  const input = parseInput(body);
  if (!input) return errorResponse("validation_error", "Revise o status, o valor e o prazo informados.", 422);

  const { data, error } = await supabase
    .from("leads")
    .update({
      status: input.status,
      notes: input.notes,
      estimated_value: input.estimatedValue,
      follow_up_at: input.followUpAt,
    })
    .eq("id", id)
    .select("id, status, notes, estimated_value, follow_up_at, updated_at")
    .maybeSingle();

  if (error) return errorResponse("lead_update_failed", "Não foi possível atualizar o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  return Response.json({ lead: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return errorResponse("invalid_lead_id", "O identificador do lead é inválido.", 400);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta para remover este lead.", 401);
  }
  const { data, error } = await supabase.from("leads").delete().eq("id", id).select("id").maybeSingle();
  if (error) return errorResponse("lead_delete_failed", "Não foi possível remover o lead.", 500);
  if (!data) return errorResponse("lead_not_found", "Lead não encontrado neste espaço de trabalho.", 404);
  return new Response(null, { status: 204 });
}
