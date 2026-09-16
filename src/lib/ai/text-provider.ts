import { isGroqConfigured, getGroqConfig } from "@/lib/groq/env";
import { isOpenAiConfigured, getOpenAiConfig } from "@/lib/openai/env";
import { isGeminiConfigured, getGeminiConfig } from "@/lib/gemini/env";
import { getSelectedSiteGeneratorProvider, type SiteGeneratorProvider } from "@/lib/sites/site-generator";
import { stripMarkdownFence } from "@/lib/sites/generated-site-validation";

type ChatMessage = { role: "system" | "user"; content: string };

export class AiTextRequestError extends Error {
  constructor(
    readonly provider: SiteGeneratorProvider,
    readonly upstreamStatus: number,
    message?: string,
  ) {
    super(message ?? `A geração de texto via ${provider} falhou.`);
    this.name = "AiTextRequestError";
  }
}

async function requestGroq(messages: ChatMessage[], jsonMode: boolean) {
  const { apiKey, model } = getGroqConfig();
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_completion_tokens: 2_500,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new AiTextRequestError("groq", response.status, payload?.error?.message);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiTextRequestError("groq", 502, "Resposta vazia da Groq.");
  return { content, model, provider: "groq" as const };
}

async function requestOpenAi(messages: ChatMessage[], jsonMode: boolean) {
  const { apiKey, model } = getOpenAiConfig();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_completion_tokens: 2_500,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new AiTextRequestError("openai", response.status);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new AiTextRequestError("openai", 502, "Resposta vazia da OpenAI.");
  return { content, model, provider: "openai" as const };
}

async function requestGemini(messages: ChatMessage[], jsonMode: boolean) {
  const { apiKey, model } = getGeminiConfig();
  const system = messages.find((message) => message.role === "system")?.content ?? "";
  const user = messages.filter((message) => message.role === "user").map((message) => message.content).join("\n\n");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2_500,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new AiTextRequestError("gemini", response.status);
  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!content) throw new AiTextRequestError("gemini", 502, "Resposta vazia do Gemini.");
  return { content, model, provider: "gemini" as const };
}

function providerOrder(): SiteGeneratorProvider[] {
  const preferred = getSelectedSiteGeneratorProvider();
  const all: SiteGeneratorProvider[] = ["groq", "openai", "gemini"];
  const configured = all.filter((provider) => {
    if (provider === "openai") return isOpenAiConfigured();
    if (provider === "gemini") return isGeminiConfigured();
    return isGroqConfigured();
  });
  if (!preferred) return configured;
  return [preferred, ...configured.filter((provider) => provider !== preferred)];
}

export function isAiTextConfigured() {
  return providerOrder().length > 0;
}

export async function generateAiText(messages: ChatMessage[], options: { json?: boolean } = {}) {
  const jsonMode = Boolean(options.json);
  let lastError: unknown;
  for (const provider of providerOrder()) {
    try {
      if (provider === "openai") return await requestOpenAi(messages, jsonMode);
      if (provider === "gemini") return await requestGemini(messages, jsonMode);
      return await requestGroq(messages, jsonMode);
    } catch (error) {
      lastError = error;
      console.warn(`ai_text_provider_failed provider=${provider} error=${error instanceof Error ? error.name : "UnknownError"}`);
    }
  }
  throw lastError ?? new Error("ai_text_not_configured");
}

export function parseJsonObject<T>(content: string): T {
  return JSON.parse(stripMarkdownFence(content)) as T;
}
