import { getGeminiConfig } from "@/lib/gemini/env";
import { parseDesignPlanPayload } from "@/lib/sites/design-plan";
import type { LeadSiteInput } from "@/lib/sites/build-generation-prompt";
import {
  InvalidGeneratedSiteError,
  stripMarkdownFence,
  validateDesignPlan,
} from "@/lib/sites/generated-site-validation";
import { readHtmlRejectionIssues } from "@/lib/sites/generated-site-validation-issue";
import type { GeneratedSiteValidationIssue } from "@/lib/sites/generated-site-validation";
import {
  buildHtmlGenerationUserPrompt,
  processGeneratedSiteHtml,
} from "@/lib/sites/process-generated-site-html";
import { parseRetryAfterHeader } from "@/lib/sites/provider-http-retry";
import type { GeneratedSiteAllowlist } from "@/lib/sites/sanitize-generated-html";

type GeminiGenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GeminiRequestError extends Error {
  constructor(readonly upstreamStatus: number, readonly retryAfterSeconds?: number) {
    super("A geração do site pela Gemini falhou.");
    this.name = "GeminiRequestError";
  }
}

function endpointFor(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

async function callGemini(
  prompt: string,
  maxOutputTokens: number,
  options: { systemInstruction?: string; jsonMode?: boolean; temperature?: number } = {},
) {
  const { apiKey, model } = getGeminiConfig();
  const response = await fetch(endpointFor(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      ...(options.systemInstruction
        ? { systemInstruction: { parts: [{ text: options.systemInstruction }] } }
        : {}),
      generationConfig: {
        maxOutputTokens,
        temperature: options.temperature ?? 0.8,
        // Gemini 3 usa raciocínio "high" por padrão. Briefings são JSON mecânico;
        // nível mínimo evita que o orçamento seja gasto em pensamento e corte a resposta.
        thinkingConfig: { thinkingLevel: "minimal" },
        ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  // Limites Free variam por projeto/modelo. `429 RESOURCE_EXHAUSTED` indica quota (RPM, TPM ou RPD), não bug no HTML.
  if (!response.ok) {
    const retryAfterSeconds =
      response.status === 429 ? parseRetryAfterHeader(response.headers.get("retry-after")) : undefined;
    throw new GeminiRequestError(response.status, retryAfterSeconds);
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const content = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  if (!content) throw new InvalidGeneratedSiteError();

  return {
    content,
    model,
    usage: {
      promptTokens: payload.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: payload.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: payload.usageMetadata?.totalTokenCount ?? 0,
    },
  };
}

export async function generateDesignPlan(prompt: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      // O briefing possui listas aninhadas; 800 tokens pode cortar o JSON antes do fechamento.
      const response = await callGemini(prompt, 3_000, {
        systemInstruction:
          "Você é diretor de arte para negócios locais. Responda somente com JSON válido e siga o formato solicitado.",
        jsonMode: true,
        temperature: 0.25,
      });
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
  const htmlPrompt = `${prompt}

<plano-visual-validado>
${JSON.stringify(design.plan, null, 2)}
</plano-visual-validado>

Siga exatamente o plano visual validado. Não troque suas cores, fontes, composição ou linguagem de formas.`;
  let lastError: unknown;
  let lastValidationIssues: GeneratedSiteValidationIssue[] | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await callGemini(
        buildHtmlGenerationUserPrompt(htmlPrompt, attempt, lastValidationIssues),
        18_000,
        {
          systemInstruction:
            "Você cria sites comerciais em HTML e CSS. Os dados objetivos fornecidos são imutáveis: nunca altere um dígito, URL, nome, nota ou endereço. Siga rigorosamente as regras de segurança e responda somente com o HTML solicitado.",
        },
      );
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
      if (error instanceof GeminiRequestError) throw error;
      const rejectionIssues = readHtmlRejectionIssues(error);
      if (rejectionIssues.length > 0) {
        lastValidationIssues = rejectionIssues;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new InvalidGeneratedSiteError();
}
