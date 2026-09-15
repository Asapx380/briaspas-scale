import { isGroqConfigured } from "@/lib/groq/env";
import * as groq from "@/lib/groq/generate-site";
import { isGeminiConfigured } from "@/lib/gemini/env";
import * as gemini from "@/lib/gemini/generate-site";
import { isOpenAiConfigured } from "@/lib/openai/env";
import * as openai from "@/lib/openai/generate-site";

export type SiteGeneratorProvider = "groq" | "openai" | "gemini";

const providers = { groq, openai, gemini } as const;
const fallbackProviders: SiteGeneratorProvider[] = ["gemini", "groq", "openai"];

function preferredProvider(): SiteGeneratorProvider {
  const configured = process.env.SITE_GENERATOR_PROVIDER;
  return configured === "openai" || configured === "gemini" ? configured : "groq";
}

function isConfigured(provider: SiteGeneratorProvider) {
  if (provider === "openai") return isOpenAiConfigured();
  if (provider === "gemini") return isGeminiConfigured();
  return isGroqConfigured();
}

function providerOrder() {
  const primary = preferredProvider();
  return [primary, ...fallbackProviders.filter((provider) => provider !== primary)].filter(isConfigured);
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
  return null;
}

export function getSiteGeneratorErrorStatus(error: unknown) {
  if (
    error instanceof groq.GroqRequestError ||
    error instanceof openai.OpenAiRequestError ||
    error instanceof gemini.GeminiRequestError
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
      console.warn(`site_generation_provider_failed provider=${provider} stage=design error=${error instanceof Error ? error.name : "UnknownError"}`);
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
      console.warn(`site_generation_provider_failed provider=${provider} stage=brief error=${error instanceof Error ? error.name : "UnknownError"}`);
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
      console.warn(`site_generation_provider_failed provider=${provider} stage=site error=${error instanceof Error ? error.name : "UnknownError"}`);
    }
  }
  throw lastError ?? new Error("site_generator_not_configured");
}
