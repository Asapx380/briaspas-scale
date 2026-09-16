import { z } from "zod";
import type { BusinessDiagnosis } from "@/lib/ai/business-analyzer";
import { generateAiText, isAiTextConfigured, parseJsonObject } from "@/lib/ai/text-provider";

export type OutreachInput = {
  companyName: string;
  niche: string | null;
  city: string | null;
  phone: string | null;
  contactFirstName?: string | null;
  demoSiteUrl?: string | null;
  diagnosis: BusinessDiagnosis;
  channel: "whatsapp" | "email" | "sms";
};

export const outreachCopySchema = z.object({
  assunto: z.string().min(5).max(120).nullable(),
  mensagem: z.string().min(40).max(1200),
  gancho: z.string().min(10).max(240),
  cta: z.string().min(5).max(200),
  objecoesAntecipadas: z.array(z.object({
    objecao: z.string().min(3).max(160),
    resposta: z.string().min(10).max(320),
  })).min(1).max(4),
});

export type OutreachCopy = z.infer<typeof outreachCopySchema>;

function heuristicOutreach(input: OutreachInput): OutreachCopy {
  const niche = input.niche?.trim() || "seu segmento";
  const city = input.city?.trim() || "sua região";
  const greeting = input.contactFirstName?.trim()
    ? `Olá, ${input.contactFirstName.trim()}!`
    : `Olá, equipe da ${input.companyName}!`;
  const demo = input.demoSiteUrl
    ? ` Preparei uma prévia visual em ${input.demoSiteUrl} só para vocês avaliarem com calma.`
    : "";
  const mensagem =
    `${greeting} Vi que a ${input.companyName} atua com ${niche} em ${city}. ` +
    `Notei um ponto que costuma travar novos clientes: ${input.diagnosis.dorPrincipal} ` +
    `Posso te mostrar uma forma simples de melhorar essa presença digital, sem compromisso e sem inventar preços.${demo} ` +
    `Faz sentido conversarmos 5 minutos esta semana?`;

  return {
    assunto: input.channel === "email" ? `Ideia rápida para ${input.companyName}` : null,
    mensagem,
    gancho: input.diagnosis.dorPrincipal,
    cta: "Combinar uma conversa rápida de 5 minutos",
    objecoesAntecipadas: [
      {
        objecao: "Já temos alguém cuidando disso",
        resposta: "Perfeito — a ideia é só comparar a prévia com o que vocês já têm e ver se agrega.",
      },
      {
        objecao: "Não tenho orçamento agora",
        resposta: "Sem problema. Não vou falar de preço agora; primeiro alinhamos se a direção visual faz sentido.",
      },
      {
        objecao: "Me manda material por texto",
        resposta: "Claro. Posso resumir a dor observada e a prévia do site para você analisar no seu tempo.",
      },
    ],
  };
}

export async function generateOutreach(input: OutreachInput): Promise<{
  copy: OutreachCopy;
  provider: string;
  model: string;
  fallback: boolean;
}> {
  if (!isAiTextConfigured()) {
    return { copy: heuristicOutreach(input), provider: "heuristic", model: "rules", fallback: true };
  }

  try {
    const generated = await generateAiText(
      [
        {
          role: "system",
          content:
            "Você escreve abordagens comerciais humanas em português do Brasil. Nunca invente preços, descontos, credenciais, cases falsos ou resultados garantidos. Não use emojis em excesso. Responda só JSON.",
        },
        {
          role: "user",
          content: `Gere copy de outreach para o canal ${input.channel}.
JSON: assunto (null se não for email), mensagem, gancho, cta, objecoesAntecipadas[{objecao,resposta}].

Lead: ${JSON.stringify({
  companyName: input.companyName,
  niche: input.niche,
  city: input.city,
  contactFirstName: input.contactFirstName ?? null,
  demoSiteUrl: input.demoSiteUrl ?? null,
})}
Diagnóstico: ${JSON.stringify(input.diagnosis)}`,
        },
      ],
      { json: true },
    );
    const parsed = outreachCopySchema.parse(parseJsonObject<OutreachCopy>(generated.content));
    return { copy: parsed, provider: generated.provider, model: generated.model, fallback: false };
  } catch (error) {
    console.warn(`outreach_generator_fallback error=${error instanceof Error ? error.name : "UnknownError"}`);
    return { copy: heuristicOutreach(input), provider: "heuristic", model: "rules", fallback: true };
  }
}
