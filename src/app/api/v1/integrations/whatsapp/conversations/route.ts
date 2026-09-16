import { createClient } from "@/lib/supabase/server";
import { craftWhatsAppReply, sendWhatsAppText } from "@/lib/ai/whatsapp-agent";
import type { BusinessDiagnosis } from "@/lib/ai/business-analyzer";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }

  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  const conversationId = url.searchParams.get("conversationId");

  if (conversationId && /^\d+$/.test(conversationId)) {
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("id, lead_id, wa_contact_id, contact_name, contact_phone, status, agent_enabled, last_message_at")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conversation) return errorResponse("not_found", "Conversa não encontrada.", 404);

    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("id, direction, body, status, created_at, metadata")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);

    return Response.json({ data: { conversation, messages: messages ?? [] } });
  }

  let query = supabase
    .from("whatsapp_conversations")
    .select("id, lead_id, wa_contact_id, contact_name, contact_phone, status, agent_enabled, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (leadId && /^\d+$/.test(leadId)) query = query.eq("lead_id", Number(leadId));

  const { data, error } = await query;
  if (error) return errorResponse("load_failed", "Não foi possível carregar as conversas.", 500);
  return Response.json({ data: { conversations: data ?? [] } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claimsData?.claims?.sub !== "string") {
    return errorResponse("unauthorized", "Entre na sua conta.", 401);
  }
  const userId = claimsData.claims.sub;
  const rateLimit = checkRateLimit(`whatsapp-send:${userId}`, { limit: 30, windowMs: 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  let body: {
    leadId?: number;
    conversationId?: number;
    text?: string;
    agentEnabled?: boolean;
    simulateInbound?: boolean;
  };
  try {
    body = await request.json() as typeof body;
  } catch {
    return errorResponse("invalid_json", "JSON inválido.", 400);
  }

  if (typeof body.conversationId === "number" && typeof body.agentEnabled === "boolean") {
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .update({
        agent_enabled: body.agentEnabled,
        status: body.agentEnabled ? "open" : "paused",
      })
      .eq("id", body.conversationId)
      .select("id, agent_enabled, status")
      .maybeSingle();
    if (error || !data) return errorResponse("update_failed", "Não foi possível atualizar o agente.", 500);
    return Response.json({ data });
  }

  const text = body.text?.trim();
  if (!text || text.length > 4000) {
    return errorResponse("validation_error", "Informe uma mensagem válida.", 422);
  }

  let conversationId = body.conversationId;
  let waContactId: string | null = null;

  if (!conversationId && typeof body.leadId === "number") {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, workspace_id, company_name, phone")
      .eq("id", body.leadId)
      .maybeSingle();
    if (!lead?.phone) return errorResponse("missing_phone", "Este lead não tem telefone para WhatsApp.", 422);

    const digits = lead.phone.replace(/\D/g, "");
    waContactId = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;

    const { data: conversation, error } = await supabase
      .from("whatsapp_conversations")
      .upsert(
        {
          workspace_id: lead.workspace_id,
          lead_id: lead.id,
          wa_contact_id: waContactId,
          contact_name: lead.company_name,
          contact_phone: waContactId,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,wa_contact_id" },
      )
      .select("id, wa_contact_id, agent_enabled")
      .maybeSingle();

    if (error || !conversation) return errorResponse("conversation_failed", "Não foi possível abrir a conversa.", 500);
    conversationId = conversation.id;
    waContactId = conversation.wa_contact_id;
  }

  if (!conversationId) return errorResponse("validation_error", "Informe conversationId ou leadId.", 422);

  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, wa_contact_id, lead_id, agent_enabled")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return errorResponse("not_found", "Conversa não encontrada.", 404);
  waContactId = conversation.wa_contact_id;
  if (!waContactId) return errorResponse("missing_phone", "Contato WhatsApp inválido.", 422);

  if (body.simulateInbound) {
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      direction: "inbound",
      body: text,
      status: "received",
    });

    let diagnosis: BusinessDiagnosis | null = null;
    let companyName: string | null = null;
    let niche: string | null = null;
    let city: string | null = null;
    if (conversation.lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("company_name, niche, city, ai_diagnosis")
        .eq("id", conversation.lead_id)
        .maybeSingle();
      companyName = lead?.company_name ?? null;
      niche = lead?.niche ?? null;
      city = lead?.city ?? null;
      diagnosis = (lead?.ai_diagnosis as BusinessDiagnosis | null) ?? null;
    }

    const reply = await craftWhatsAppReply(text, {
      contactName: null,
      contactPhone: waContactId,
      companyName,
      niche,
      city,
      diagnosis,
      outreachMessage: null,
      recentMessages: [],
    });

    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      direction: "outbound",
      body: reply.text,
      status: "queued",
      metadata: { pauseMs: reply.pauseMs, simulated: true, objectionHandled: reply.objectionHandled },
    });

    return Response.json({
      data: {
        conversationId: conversation.id,
        reply,
      },
    });
  }

  const sent = await sendWhatsAppText(waContactId, text);
  await supabase.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    direction: "outbound",
    body: text,
    wa_message_id: sent.messageId ?? null,
    status: sent.ok ? (sent.stubbed ? "queued" : "sent") : "failed",
    metadata: { stubbed: "stubbed" in sent ? sent.stubbed : false, manual: true },
  });

  if (!sent.ok) return errorResponse("send_failed", "Não foi possível enviar via Meta API (verifique as chaves).", 502);

  return Response.json({
    data: {
      conversationId: conversation.id,
      stubbed: "stubbed" in sent ? sent.stubbed : false,
      messageId: sent.messageId,
    },
  });
}
