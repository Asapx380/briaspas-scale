import { createHmac, timingSafeEqual } from "node:crypto";
import { generateAiText, isAiTextConfigured } from "@/lib/ai/text-provider";
import type { BusinessDiagnosis } from "@/lib/ai/business-analyzer";

export type WhatsAppAgentContext = {
  contactName: string | null;
  contactPhone: string | null;
  companyName: string | null;
  niche: string | null;
  city: string | null;
  diagnosis: BusinessDiagnosis | null;
  outreachMessage: string | null;
  recentMessages: Array<{ direction: "inbound" | "outbound"; body: string }>;
};

export type WhatsAppAgentReply = {
  text: string;
  pauseMs: number;
  handoffToHuman: boolean;
  objectionHandled: string | null;
};

const OBJECTION_PATTERNS: Array<{ key: string; test: RegExp; reply: string }> = [
  {
    key: "preco",
    test: /pre[cç]o|valor|or[cç]amento|quanto custa|barato|caro/i,
    reply: "Entendo a preocupação com investimento. Não trabalho com preço fechado por mensagem — primeiro alinhamos se a direção faz sentido para o seu negócio. Prefere que um consultor humano retome com números sob medida?",
  },
  {
    key: "sem_tempo",
    test: /sem tempo|depois|agora n[aã]o|ocupad/i,
    reply: "Sem problema. Posso te mandar um resumo curto para você olhar com calma. Qual horário costuma ficar melhor para uma conversa de 5 minutos?",
  },
  {
    key: "ja_tem",
    test: /j[aá] tenho|j[aá] tem|ag[eê]ncia|algu[eé]m cuida|marketing/i,
    reply: "Ótimo que já tenham alguém. A ideia é só comparar a prévia com o que existe hoje — se não agregar, paramos por aí. Quer que eu destaque só o diferencial visual?",
  },
  {
    key: "nao_interesse",
    test: /n[aã]o tenho interesse|n[aã]o preciso|para de|remover|stop/i,
    reply: "Tudo bem, obrigado pelo retorno. Não vou insistir. Se no futuro quiser revisitar a presença digital, é só chamar.",
  },
];

function detectObjection(text: string) {
  for (const item of OBJECTION_PATTERNS) {
    if (item.test.test(text)) return item;
  }
  return null;
}

function humanPauseMs(text: string) {
  const base = 1_200;
  const perChar = Math.min(4_500, Math.round(text.length * 18));
  return base + perChar;
}

function heuristicReply(inbound: string, context: WhatsAppAgentContext): WhatsAppAgentReply {
  const objection = detectObjection(inbound);
  if (objection) {
    const text = objection.reply;
    return {
      text,
      pauseMs: humanPauseMs(text),
      handoffToHuman: objection.key === "preco" || objection.key === "nao_interesse",
      objectionHandled: objection.key,
    };
  }

  const name = context.contactName?.split(" ")[0] || context.companyName || "por aí";
  const dor = context.diagnosis?.dorPrincipal;
  const text = dor
    ? `Oi, ${name}! Vi sua mensagem. Sobre ${context.companyName ?? "o negócio"}, o ponto que mais chama atenção é: ${dor} Posso te explicar em uma mensagem curta como uma vitrine digital ajuda nisso — sem falar de preço agora.`
    : `Oi, ${name}! Obrigado pela mensagem. Posso te ajudar a entender se uma presença digital mais clara faz sentido para ${context.companyName ?? "vocês"}. Quer que eu resuma em 3 linhas?`;

  return { text, pauseMs: humanPauseMs(text), handoffToHuman: false, objectionHandled: null };
}

export async function craftWhatsAppReply(
  inboundText: string,
  context: WhatsAppAgentContext,
): Promise<WhatsAppAgentReply> {
  const trimmed = inboundText.trim().slice(0, 2_000);
  if (!trimmed) {
    return { text: "Não consegui ler a mensagem. Pode repetir em uma frase?", pauseMs: 900, handoffToHuman: false, objectionHandled: null };
  }

  if (!isAiTextConfigured()) return heuristicReply(trimmed, context);

  try {
    const generated = await generateAiText([
      {
        role: "system",
        content:
          "Você é um assistente de WhatsApp comercial em português do Brasil. Tom humano, frases curtas, sem emojis em excesso. Nunca invente preços, credenciais ou resultados. Se pedirem preço fechado ou pedirem para parar, ofereça handoff humano. Responda somente com o texto da mensagem.",
      },
      {
        role: "user",
        content: `Contexto: ${JSON.stringify(context)}\n\nMensagem do lead: ${trimmed}\n\nEscreva a próxima resposta do agente.`,
      },
    ]);
    const text = generated.content.trim().slice(0, 1_200);
    const objection = detectObjection(trimmed);
    return {
      text,
      pauseMs: humanPauseMs(text),
      handoffToHuman: Boolean(objection && (objection.key === "preco" || objection.key === "nao_interesse")),
      objectionHandled: objection?.key ?? null,
    };
  } catch {
    return heuristicReply(trimmed, context);
  }
}

export function getWhatsAppEnv() {
  return {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "",
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
  };
}

export function isWhatsAppSendConfigured() {
  const env = getWhatsAppEnv();
  return Boolean(env.accessToken && env.phoneNumberId);
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null) {
  const { appSecret } = getWhatsAppEnv();
  if (!appSecret) return { ok: true as const, stubbed: true as const };
  if (!signatureHeader?.startsWith("sha256=")) return { ok: false as const, stubbed: false as const };
  const digest = createHmac("sha256", appSecret).update(rawBody).digest();
  const provided = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  if (provided.length !== digest.length) return { ok: false as const, stubbed: false as const };
  return { ok: timingSafeEqual(provided, digest), stubbed: false as const };
}

export async function sendWhatsAppText(to: string, body: string) {
  const env = getWhatsAppEnv();
  if (!isWhatsAppSendConfigured()) {
    return { ok: true as const, stubbed: true as const, messageId: `stub_${Date.now()}` };
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(env.phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: body.slice(0, 4096) },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    return { ok: false as const, stubbed: false as const, error: payload.slice(0, 300) };
  }

  const payload = await response.json() as { messages?: Array<{ id?: string }> };
  return { ok: true as const, stubbed: false as const, messageId: payload.messages?.[0]?.id ?? null };
}
