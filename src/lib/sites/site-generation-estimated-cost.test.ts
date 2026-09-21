import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { estimatedSiteGenerationCostUsd } from "@/lib/sites/site-generation-estimated-cost";

describe("estimatedSiteGenerationCostUsd", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_INPUT_USD_PER_MILLION", "0.5");
    vi.stubEnv("GROQ_OUTPUT_USD_PER_MILLION", "1");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("retorna null para OpenRouter sem tarifa cadastrada", () => {
    expect(estimatedSiteGenerationCostUsd("openrouter", 1000, 500)).toBeNull();
  });

  it("calcula custo quando tarifas existem", () => {
    expect(estimatedSiteGenerationCostUsd("groq", 1_000_000, 1_000_000)).toBeCloseTo(1.5);
  });
});
