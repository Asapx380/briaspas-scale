import { getGroqConfig } from "@/lib/groq/env";
import { designPlanSchema } from "@/lib/sites/design-plan";
import type { LeadSiteInput } from "@/lib/sites/build-generation-prompt";
import {
  GeneratedSiteContentError,
  InvalidGeneratedSiteError,
  stripMarkdownFence,
  validateDesignPlan,
} from "@/lib/sites/generated-site-validation";
import {
  buildHtmlGenerationUserPrompt,
  processGeneratedSiteHtml,
} from "@/lib/sites/process-generated-site-html";
import type { GeneratedSiteAllowlist } from "@/lib/sites/sanitize-generated-html";
import { z } from "zod";

const CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

type ChatMessage = { role: "system" | "user"; content: string };

export class GroqRequestError extends Error {
  constructor(readonly upstreamStatus: number, readonly upstreamMessage?: string) {
    super(upstreamMessage ? `A geração do site pela Groq falhou: ${upstreamMessage}` : "A geração do site pela Groq falhou.");
    this.name = "GroqRequestError";
  }
}

async function requestGroq(messages: ChatMessage[], jsonSchema?: Record<string, unknown>) {
  const { apiKey, model } = getGroqConfig();
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning_effort: "low",
      temperature: 0.35,
      max_completion_tokens: 12_000,
      messages,
      ...(jsonSchema
        ? {
            response_format: {
              type: "json_schema",
              json_schema: { name: "site_brief", strict: true, schema: jsonSchema },
            },
          }
        : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new GroqRequestError(response.status, payload?.error?.message);
  }

  const payload = (await response.json()) as GroqChatResponse;
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
  const unsupportedStrictKeywords = new Set([
    "$schema", "format", "pattern", "minLength", "maxLength", "minItems", "maxItems",
  ]);
  const jsonSchema = JSON.parse(JSON.stringify(
    z.toJSONSchema(designPlanSchema),
    (key, value) => unsupportedStrictKeywords.has(key) ? undefined : value,
  )) as Record<string, unknown>;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestGroq([
        {
          role: "system",
          content: "Você é diretor de arte para negócios locais. Responda somente com JSON válido e siga o formato solicitado.",
        },
        { role: "user", content: prompt },
      ], jsonSchema);
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
  lead: LeadSiteInput,
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
  let lastContentErrors: string[] | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestGroq([
        {
          role: "system",
          content:
            "Você cria sites comerciais em HTML e CSS. Os dados objetivos fornecidos são imutáveis: nunca altere um dígito, URL, nome, nota ou endereço. Siga rigorosamente as regras de segurança e responda somente com o HTML solicitado.",
        },
        {
          role: "user",
          content: buildHtmlGenerationUserPrompt(htmlPrompt, attempt, lastContentErrors),
        },
      ]);
      const html = processGeneratedSiteHtml(response.content, lead, guardrails);

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
      if (error instanceof GroqRequestError) throw error;
      if (error instanceof GeneratedSiteContentError) {
        lastContentErrors = error.errors;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new InvalidGeneratedSiteError();
}
