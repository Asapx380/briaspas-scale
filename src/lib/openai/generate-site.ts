import { getOpenAiConfig } from "@/lib/openai/env";
import { designPlanSchema } from "@/lib/sites/design-plan";
import {
  enforceLeadLinks,
  InvalidGeneratedSiteError,
  stripMarkdownFence,
  validateDesignPlan,
  validateHtml,
} from "@/lib/sites/generated-site-validation";
import { sanitizeGeneratedHtml, type GeneratedSiteAllowlist } from "@/lib/sites/sanitize-generated-html";

const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

type ChatMessage = { role: "system" | "user"; content: string };
type OpenAiChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

export class OpenAiRequestError extends Error {
  constructor(readonly upstreamStatus: number) {
    super("A geração do site pela OpenAI falhou.");
    this.name = "OpenAiRequestError";
  }
}

async function requestOpenAi(messages: ChatMessage[], maxCompletionTokens: number, jsonMode = false) {
  const { apiKey, model } = getOpenAiConfig();
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxCompletionTokens,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) throw new OpenAiRequestError(response.status);

  const payload = (await response.json()) as OpenAiChatResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new InvalidGeneratedSiteError();

  return {
    content,
    model,
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
  };
}

export async function generateDesignPlan(prompt: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestOpenAi(
        [
          {
            role: "system",
            content: "Você é diretor de arte para negócios locais. Responda somente com JSON válido e siga o formato solicitado.",
          },
          { role: "user", content: prompt },
        ],
        // O briefing possui listas aninhadas; 800 tokens pode cortar o JSON antes do fechamento.
        1_600,
        true,
      );
      const parsed = designPlanSchema.parse(JSON.parse(stripMarkdownFence(response.content)));
      return { plan: validateDesignPlan(parsed), response, attempts: attempt };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new InvalidGeneratedSiteError();
}

export async function generateLeadSite(
  prompt: string,
  designPrompt: string,
  guardrails: GeneratedSiteAllowlist,
) {
  const startedAt = Date.now();
  const design = await generateDesignPlan(designPrompt);
  const htmlPrompt = `${prompt}

<plano-visual-validado>
${JSON.stringify(design.plan, null, 2)}
</plano-visual-validado>

Siga exatamente o plano visual validado. Não troque suas cores, fontes, composição ou linguagem de formas.`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestOpenAi(
        [
          {
            role: "system",
            content:
              "Você cria sites comerciais em HTML e CSS. Os dados objetivos fornecidos são imutáveis: nunca altere um dígito, URL, nome, nota ou endereço. Siga rigorosamente as regras de segurança e responda somente com o HTML solicitado.",
          },
          {
            role: "user",
            content: attempt === 1
              ? htmlPrompt
              : `${htmlPrompt}\n\nA tentativa anterior falhou na validação automática. Revise todos os requisitos de segurança, SEO, acessibilidade, URLs exatas e estrutura antes de responder.`,
          },
        ],
        18_000,
      );
      const linked = enforceLeadLinks(response.content, guardrails);
      const sanitized = sanitizeGeneratedHtml(linked, guardrails);
      const html = validateHtml(sanitized);

      return {
        html,
        model: response.model,
        designPlan: design.plan,
        attempts: { design: design.attempts, html: attempt },
        durationMs: Date.now() - startedAt,
        usage: {
          promptTokens: design.response.usage.promptTokens + response.usage.promptTokens,
          completionTokens: design.response.usage.completionTokens + response.usage.completionTokens,
          totalTokens: design.response.usage.totalTokens + response.usage.totalTokens,
        },
      };
    } catch (error) {
      if (error instanceof OpenAiRequestError) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new InvalidGeneratedSiteError();
}
