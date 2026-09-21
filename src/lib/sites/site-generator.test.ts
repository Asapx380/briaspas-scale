import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __siteGeneratorProviderOrderForTests,
  getSelectedSiteGeneratorProvider,
  isSiteGeneratorConfigured,
} from "./site-generator";

describe("site-generator providers", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ordena fallback padrão Gemini, Groq, OpenRouter e OpenAI", () => {
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    vi.stubEnv("OPENAI_API_KEY", "openai-key");
    expect(__siteGeneratorProviderOrderForTests()).toEqual([
      "gemini",
      "groq",
      "openrouter",
      "openai",
    ]);
  });

  it("usa SITE_GENERATOR_PROVIDER=openrouter como principal", () => {
    vi.stubEnv("SITE_GENERATOR_PROVIDER", "openrouter");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    expect(getSelectedSiteGeneratorProvider()).toBe("openrouter");
    expect(__siteGeneratorProviderOrderForTests()).toEqual(["openrouter", "gemini"]);
  });

  it("ignora provedores sem chave", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    expect(__siteGeneratorProviderOrderForTests()).toEqual(["groq"]);
  });

  it("fica desconfigurado sem nenhuma chave", () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("OPENROUTER_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isSiteGeneratorConfigured()).toBe(false);
  });
});
