import { getOpenRouterConfig } from "@/lib/openrouter/env";
import type { LeadSiteInput } from "@/lib/sites/build-generation-prompt";
import { designPlanSchema, parseDesignPlanPayload } from "@/lib/sites/design-plan";
import {
  InvalidGeneratedSiteError,
  stripMarkdownFence,
  validateDesignPlan,
  type GeneratedSiteValidationIssue,
} from "@/lib/sites/generated-site-validation";
import { readHtmlRejectionIssues } from "@/lib/sites/generated-site-validation-issue";
import {
  buildHtmlGenerationUserPrompt,
  buildHtmlPromptWithValidatedDesignPlan,
  processGeneratedSiteHtml,
} from "@/lib/sites/process-generated-site-html";
import { parseRetryAfterHeader } from "@/lib/sites/provider-http-retry";
import type { GeneratedSiteAllowlist } from "@/lib/sites/sanitize-generated-html";
import { z } from "zod";

const CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterChatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

type ChatMessage = { role: "system" | "user"; content: string };

export class OpenRouterRequestError extends Error {
  constructor(
    readonly upstreamStatus: number,
    readonly upstreamMessage?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(
      upstreamMessage
        ? `A geração do site pela OpenRouter falhou: ${upstreamMessage}`
        : "A geração do site pela OpenRouter falhou.",
    );
    this.name = "OpenRouterRequestError";
  }
}

async function requestOpenRouter(messages: ChatMessage[], jsonSchema?: Record<string, unknown>) {
  const { apiKey, model } = getOpenRouterConfig();
  const response = await fetch(CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 12_000,
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
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const retryAfterSeconds =
      response.status === 429 ? parseRetryAfterHeader(response.headers.get("retry-after")) : undefined;
    throw new OpenRouterRequestError(response.status, payload?.error?.message, retryAfterSeconds);
  }

  const payload = (await response.json()) as OpenRouterChatResponse;
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
    "$schema",
    "format",
    "pattern",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
  ]);
  const jsonSchema = JSON.parse(
    JSON.stringify(z.toJSONSchema(designPlanSchema), (key, value) =>
      unsupportedStrictKeywords.has(key) ? undefined : value,
    ),
  ) as Record<string, unknown>;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestOpenRouter(
        [
          {
            role: "system",
            content:
              "Você é diretor de arte para negócios locais. Responda somente com JSON válido e siga o formato solicitado.",
          },
          { role: "user", content: prompt },
        ],
        jsonSchema,
      );
      const parsed = parseDesignPlanPayload(JSON.parse(stripMarkdownFence(response.content)));
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
  const htmlPrompt = buildHtmlPromptWithValidatedDesignPlan(prompt, design.plan);
  let lastError: unknown;
  let lastValidationIssues: GeneratedSiteValidationIssue[] | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await requestOpenRouter([
        {
          role: "system",
          content:
            "Você cria sites comerciais em HTML e CSS. Os dados objetivos fornecidos são imutáveis: nunca altere um dígito, URL, nome, nota ou endereço. Siga rigorosamente as regras de segurança e responda somente com o HTML solicitado.",
        },
        {
          role: "user",
          content: buildHtmlGenerationUserPrompt(htmlPrompt, attempt, lastValidationIssues),
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
      if (error instanceof OpenRouterRequestError) throw error;
      const rejectionIssues = readHtmlRejectionIssues(error);
      if (rejectionIssues.length > 0) {
        lastValidationIssues = rejectionIssues;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new InvalidGeneratedSiteError();
}
