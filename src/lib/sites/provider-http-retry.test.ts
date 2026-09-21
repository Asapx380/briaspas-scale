import { describe, expect, it } from "vitest";
import { parseRetryAfterHeader, readProviderRetryAfterSeconds } from "@/lib/sites/provider-http-retry";
import { OpenRouterRequestError } from "@/lib/openrouter/generate-site";

describe("provider-http-retry", () => {
  it("interpreta Retry-After em segundos", () => {
    expect(parseRetryAfterHeader("30")).toBe(30);
  });

  it("lê retryAfterSeconds em erro 429 do provedor", () => {
    const error = new OpenRouterRequestError(429, "rate limited", 12);
    expect(readProviderRetryAfterSeconds(error)).toBe(12);
  });

  it("ignora Retry-After quando status não é 429", () => {
    const error = new OpenRouterRequestError(502, "bad gateway", 12);
    expect(readProviderRetryAfterSeconds(error)).toBeUndefined();
  });
});
