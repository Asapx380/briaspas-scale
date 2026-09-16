import { z } from "zod";
import { generateAiText, isAiTextConfigured, parseJsonObject } from "@/lib/ai/text-provider";

export type BusinessProfileInput = {
  companyName: string;
  niche: string | null;
  city: string | null;
  phone: string | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  notes: string | null;
  hasDemoSite: boolean;
};

export const businessDiagnosisSchema = z.object({
  resumo: z.string().min(20).max(800),
  dorPrincipal: z.string().min(10).max(400),
  doresSecundarias: z.array(z.string().min(5).max(240)).min(1).max(4),
  oportunidades: z.array(z.string().min(5).max(240)).min(1).max(4),
  tomSugerido: z.string().min(5).max(160),
  prioridade: z.enum(["baixa", "media", "alta"]),
  sinaisObservados: z.array(z.string().min(3).max(200)).min(1).max(6),
});

export type BusinessDiagnosis = z.infer<typeof businessDiagnosisSchema>;

function heuristicDiagnosis(input: BusinessProfileInput): BusinessDiagnosis {
  const niche = input.niche?.trim() || "negócio local";
  const city = input.city?.trim() || "sua cidade";
  const hasSite = Boolean(input.websiteUrl);
  const lowReviews = (input.reviewCount ?? 0) < 20;
  const lowRating = input.rating !== null && input.rating < 4.2;

  const dores: string[] = [];
  if (!hasSite) dores.push("Pouca presença digital própria para converter buscas locais.");
  if (lowReviews) dores.push("Volume baixo de avaliações públicas, o que reduz confiança.");
  if (lowRating) dores.push("Nota pública abaixo do ideal para destacar-se na região.");
  if (!dores.length) dores.push("Concorrência local disputa a atenção de novos clientes online.");

  return {
    resumo: `${input.companyName} atua como ${niche} em ${city}. O diagnóstico aponta gaps de presença e conversão digital que podem ser trabalhados sem prometer preços ou resultados garantidos.`,
    dorPrincipal: dores[0],
    doresSecundarias: dores.slice(1, 3).length ? dores.slice(1, 3) : ["Falta de acompanhamento sistemático de leads quentes."],
    oportunidades: [
      input.hasDemoSite
        ? "Usar o site demonstrativo como prova visual no primeiro contato."
        : "Montar uma vitrine digital simples para mostrar serviços e WhatsApp.",
      "Resgatar avaliações recentes e destacar diferenciais locais.",
    ],
    tomSugerido: "Consultivo, direto e respeitoso — sem pressão comercial.",
    prioridade: !hasSite || lowRating ? "alta" : lowReviews ? "media" : "baixa",
    sinaisObservados: [
      hasSite ? "Possui website informado" : "Sem website informado",
      input.rating !== null ? `Avaliação ${input.rating.toFixed(1)}` : "Sem nota pública",
      input.reviewCount !== null ? `${input.reviewCount} avaliações` : "Sem contagem de avaliações",
      input.phone ? "Telefone disponível" : "Telefone ausente",
    ],
  };
}

export async function analyzeBusiness(input: BusinessProfileInput): Promise<{
  diagnosis: BusinessDiagnosis;
  provider: string;
  model: string;
  fallback: boolean;
}> {
  if (!isAiTextConfigured()) {
    return { diagnosis: heuristicDiagnosis(input), provider: "heuristic", model: "rules", fallback: true };
  }

  try {
    const generated = await generateAiText(
      [
        {
          role: "system",
          content:
            "Você diagnostica negócios locais para abordagem comercial ética. Responda só JSON. Nunca invente preços, credenciais, resultados garantidos ou dados que não estejam no perfil. Use português do Brasil.",
        },
        {
          role: "user",
          content: `Analise este lead e devolva JSON com: resumo, dorPrincipal, doresSecundarias[], oportunidades[], tomSugerido, prioridade (baixa|media|alta), sinaisObservados[].

Perfil:
${JSON.stringify(input, null, 2)}`,
        },
      ],
      { json: true },
    );
    const parsed = businessDiagnosisSchema.parse(parseJsonObject<BusinessDiagnosis>(generated.content));
    return { diagnosis: parsed, provider: generated.provider, model: generated.model, fallback: false };
  } catch (error) {
    console.warn(`business_analyzer_fallback error=${error instanceof Error ? error.name : "UnknownError"}`);
    return { diagnosis: heuristicDiagnosis(input), provider: "heuristic", model: "rules", fallback: true };
  }
}
