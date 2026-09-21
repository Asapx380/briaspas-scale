import { isGroqConfigured } from "@/lib/groq/env";
import * as groq from "@/lib/groq/generate-site";
import { isGeminiConfigured } from "@/lib/gemini/env";
import * as gemini from "@/lib/gemini/generate-site";
import { isOpenAiConfigured } from "@/lib/openai/env";
import * as openai from "@/lib/openai/generate-site";
import { isOpenRouterConfigured } from "@/lib/openrouter/env";
import * as openrouter from "@/lib/openrouter/generate-site";
import { formatProviderFailureLog } from "@/lib/sites/provider-http-retry";

export type SiteGeneratorProvider = "groq" | "openai" | "gemini" | "openrouter";

const providers = { groq, openai, gemini, openrouter } as const;
const fallbackProviders: SiteGeneratorProvider[] = ["gemini", "groq", "openrouter", "openai"];

function isConfigured(provider: SiteGeneratorProvider) {
  if (provider === "openai") return isOpenAiConfigured();
  if (provider === "gemini") return isGeminiConfigured();
  if (provider === "openrouter") return isOpenRouterConfigured();
  return isGroqConfigured();
}

function providerOrder() {
  const configured = process.env.SITE_GENERATOR_PROVIDER?.trim();
  const explicitPrimary =
    configured === "openai" ||
    configured === "gemini" ||
    configured === "groq" ||
    configured === "openrouter"
      ? (configured as SiteGeneratorProvider)
      : null;

  const order = explicitPrimary
    ? [explicitPrimary, ...fallbackProviders.filter((provider) => provider !== explicitPrimary)]
    : fallbackProviders;

  return order.filter(isConfigured);
}

export function isSiteGeneratorConfigured() {
  return providerOrder().length > 0;
}

export function getSelectedSiteGeneratorProvider() {
  return providerOrder()[0] ?? null;
}

export function getSiteGeneratorErrorProvider(error: unknown): SiteGeneratorProvider | null {
  if (error instanceof groq.GroqRequestError) return "groq";
  if (error instanceof openai.OpenAiRequestError) return "openai";
  if (error instanceof gemini.GeminiRequestError) return "gemini";
  if (error instanceof openrouter.OpenRouterRequestError) return "openrouter";
  return null;
}

export function getSiteGeneratorErrorStatus(error: unknown) {
  if (
    error instanceof groq.GroqRequestError ||
    error instanceof openai.OpenAiRequestError ||
    error instanceof gemini.GeminiRequestError ||
    error instanceof openrouter.OpenRouterRequestError
  ) {
    return error.upstreamStatus;
  }
  return null;
}

export async function generateDesignPlan(prompt: string) {
  let lastError: unknown;
  for (const provider of providerOrder()) {
    try {
      return await providers[provider].generateDesignPlan(prompt);
    } catch (error) {
      lastError = error;
      console.warn(
        `site_generation_provider_failed provider=${provider} stage=design ${formatProviderFailureLog(error)}`,
      );
    }
  }
  throw lastError ?? new Error("site_generator_not_configured");
}

export async function generateSiteBrief(prompt: string) {
  let lastError: unknown;
  for (const provider of providerOrder()) {
    try {
      const generated = await providers[provider].generateDesignPlan(prompt);
      return { ...generated, provider };
    } catch (error) {
      lastError = error;
      console.warn(
        `site_generation_provider_failed provider=${provider} stage=brief ${formatProviderFailureLog(error)}`,
      );
    }
  }
  throw lastError ?? new Error("site_generator_not_configured");
}

export async function generateLeadSite(
  ...args: Parameters<typeof groq.generateLeadSite>
) {
  let lastError: unknown;
  for (const provider of providerOrder()) {
    try {
      const generated = await providers[provider].generateLeadSite(...args);
      return { ...generated, provider };
    } catch (error) {
      lastError = error;
      console.warn(
        `site_generation_provider_failed provider=${provider} stage=site ${formatProviderFailureLog(error)}`,
      );
    }
  }
  throw lastError ?? new Error("site_generator_not_configured");
}

export function __siteGeneratorProviderOrderForTests() {
  return providerOrder();
}
