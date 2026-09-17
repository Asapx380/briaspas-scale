import {
  craftWhatsAppReply,
  getWhatsAppEnv,
  sendWhatsAppText,
  verifyWhatsAppSignature,
  type WhatsAppAgentContext,
} from "@/lib/ai/whatsapp-agent";
import type { BusinessDiagnosis } from "@/lib/ai/business-analyzer";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

export const runtime = "nodejs";

type MetaChangeValue = {
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    from?: string;
    id?: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
  }>;
};

type IngestedWorkItem = {
  body: string;
  contactName: string | null;
  waContactId: string;
  conversationId: number;
  leadId: number | null;
  agentEnabled: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Verificação do webhook Meta (hub.challenge). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const { verifyToken } = getWhatsAppEnv();

  if (!verifyToken) {
    return Response.json(
      {
        error: {
          code: "whatsapp_not_configured",
          message: "Defina WHATSAPP_VERIFY_TOKEN no .env para ativar a verificação do webhook.",
        },
      },
      { status: 503 },
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return Response.json({ error: { code: "forbidden", message: "Verificação inválida." } }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const verified = verifyWhatsAppSignature(rawBody, signature);
  if (!verified.ok) {
    return Response.json({ error: { code: "invalid_signature", message: "Assinatura inválida." } }, { status: 401 });
  }

  const rateLimit = checkRateLimit("whatsapp-webhook:global", { limit: 120, windowMs: 60_000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);

  let payload: { entry?: Array<{ changes?: Array<{ value?: MetaChangeValue }> }> };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return Response.json({ error: { code: "invalid_json", message: "Payload inválido." } }, { status: 400 });
  }

  const supabase = createPublicClient();
  const workspaceId = Number(process.env.WHATSAPP_WORKSPACE_ID?.trim() || "0");
  if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
    console.warn("whatsapp_webhook_skipped reason=missing_WHATSAPP_WORKSPACE_ID");
    return new Response(null, { status: 200 });
  }

  const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];
  const workItems: IngestedWorkItem[] = [];

  for (const change of changes) {
    const value = change.value;
    if (!value?.messages?.length) continue;

    for (const message of value.messages) {
      if (message.type !== "text" || !message.text?.body || !message.from) continue;

      const contactName = value.contacts?.[0]?.profile?.name ?? null;
      const waContactId = message.from;

      const { data: ingested, error: ingestError } = await supabase.rpc("ingest_whatsapp_inbound", {
        target_workspace_id: workspaceId,
        target_wa_contact_id: waContactId,
        target_contact_name: contactName,
        target_body: message.text.body,
        target_wa_message_id: message.id ?? null,
      });

      if (ingestError || !ingested || (ingested as { ok?: boolean }).ok !== true) {
        console.warn(`whatsapp_ingest_failed error=${ingestError?.message ?? "unknown"}`);
        continue;
      }

      const conversation = ingested as {
        conversationId: number;
        leadId: number | null;
        agentEnabled: boolean;
      };

      workItems.push({
        body: message.text.body,
        contactName,
        waContactId,
        conversationId: conversation.conversationId,
        leadId: conversation.leadId,
        agentEnabled: conversation.agentEnabled,
      });
    }
  }

  const agentItems = workItems.filter((item) => item.agentEnabled);
  const leadIds = [
    ...new Set(
      agentItems
        .map((item) => item.leadId)
        .filter((id): id is number => typeof id === "number" && Number.isInteger(id)),
    ),
  ];

  const leadById = await loadLeadsById(supabase, leadIds);

  for (const item of agentItems) {
    const context = buildAgentContext(item, item.leadId != null ? leadById.get(item.leadId) ?? null : null);
    const reply = await craftWhatsAppReply(item.body, context);
    await sleep(Math.min(reply.pauseMs, 6_000));

    const sent = await sendWhatsAppText(item.waContactId, reply.text);
    await supabase.rpc("append_whatsapp_outbound", {
      target_conversation_id: item.conversationId,
      target_body: reply.text,
      target_wa_message_id: sent.messageId ?? null,
      target_status: sent.ok ? (sent.stubbed ? "queued" : "sent") : "failed",
      target_metadata: {
        pauseMs: reply.pauseMs,
        handoffToHuman: reply.handoffToHuman,
        objectionHandled: reply.objectionHandled,
        stubbed: "stubbed" in sent ? sent.stubbed : false,
      },
    });

    if (reply.handoffToHuman) {
      await supabase
        .from("whatsapp_conversations")
        .update({ agent_enabled: false, status: "paused" })
        .eq("id", item.conversationId);
    }
  }

  return new Response(null, { status: 200 });
}

type LeadAgentRow = {
  id: number;
  company_name: string | null;
  niche: string | null;
  city: string | null;
  ai_diagnosis: unknown;
  ai_outreach: unknown;
};

async function loadLeadsById(
  supabase: ReturnType<typeof createPublicClient>,
  leadIds: number[],
): Promise<Map<number, LeadAgentRow>> {
  const map = new Map<number, LeadAgentRow>();
  if (leadIds.length === 0) return map;

  const { data: leads } = await supabase
    .from("leads")
    .select("id, company_name, niche, city, ai_diagnosis, ai_outreach")
    .in("id", leadIds);

  for (const lead of (leads ?? []) as LeadAgentRow[]) {
    map.set(lead.id, lead);
  }
  return map;
}

function buildAgentContext(
  item: Pick<IngestedWorkItem, "contactName" | "waContactId">,
  lead: LeadAgentRow | null,
): WhatsAppAgentContext {
  if (!lead) {
    return {
      contactName: item.contactName,
      contactPhone: item.waContactId,
      companyName: null,
      niche: null,
      city: null,
      diagnosis: null,
      outreachMessage: null,
      recentMessages: [],
    };
  }

  const diagnosis = (lead.ai_diagnosis as BusinessDiagnosis | null) ?? null;
  const outreach = lead.ai_outreach as { mensagem?: string } | null;

  return {
    contactName: item.contactName,
    contactPhone: item.waContactId,
    companyName: lead.company_name ?? null,
    niche: lead.niche ?? null,
    city: lead.city ?? null,
    diagnosis,
    outreachMessage: outreach?.mensagem ?? null,
    recentMessages: [],
  };
}
