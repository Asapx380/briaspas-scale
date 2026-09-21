import { describe, expect, it } from "vitest";
import {
  parseGenerateSiteSamplesCli,
  selectSiteGenerationSamples,
} from "./generate-site-samples-cli";

describe("parseGenerateSiteSamplesCli", () => {
  it("interpreta --only com slug", () => {
    const options = parseGenerateSiteSamplesCli([
      "--only",
      "petshop-dados-demonstrativos",
    ]);
    expect(options.onlySlug).toBe("petshop-dados-demonstrativos");
    expect(options.respectRateLimit).toBe(false);
  });

  it("ativa espera em 429 com --respect-rate-limit", () => {
    const options = parseGenerateSiteSamplesCli([
      "--only",
      "odontologia-dados-demonstrativos",
      "--respect-rate-limit",
      "--max-rate-limit-retries",
      "2",
    ]);
    expect(options.onlySlug).toBe("odontologia-dados-demonstrativos");
    expect(options.respectRateLimit).toBe(true);
    expect(options.maxRateLimitRetries).toBe(2);
  });

  it("aceita --wait-on-429 como alias", () => {
    expect(parseGenerateSiteSamplesCli(["--wait-on-429"]).respectRateLimit).toBe(true);
  });
});

describe("selectSiteGenerationSamples", () => {
  it("filtra um slug conhecido", () => {
    const samples = selectSiteGenerationSamples("salao-dados-demonstrativos");
    expect(samples).toHaveLength(1);
    expect(samples[0]?.slug).toBe("salao-dados-demonstrativos");
  });

  it("rejeita slug desconhecido", () => {
    expect(() => selectSiteGenerationSamples("inexistente")).toThrow(/slug_desconhecido/);
  });
});
