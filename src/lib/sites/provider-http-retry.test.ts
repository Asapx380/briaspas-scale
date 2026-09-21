import { describe, expect, it, vi } from "vitest";
import { OpenRouterRequestError } from "@/lib/openrouter/generate-site";
import {
  parseRetryAfterHeader,
  readProviderRetryAfterSeconds,
  runWithRateLimitRetries,
} from "@/lib/sites/provider-http-retry";

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

  it("repete após 429 quando --respect-rate-limit está ativo", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ upstreamStatus: 429, retryAfterSeconds: 2 })
      .mockResolvedValueOnce("ok");

    const result = await runWithRateLimitRetries(task, {
      respectRateLimit: true,
      maxRetries: 2,
      defaultWaitSeconds: 60,
      sleep,
    });

    expect(result).toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
  });

  it("não espera em 429 sem respectRateLimit", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi.fn().mockRejectedValue({ upstreamStatus: 429, retryAfterSeconds: 2 });
    await expect(
      runWithRateLimitRetries(task, {
        respectRateLimit: false,
        maxRetries: 2,
        defaultWaitSeconds: 60,
        sleep,
      }),
    ).rejects.toEqual({ upstreamStatus: 429, retryAfterSeconds: 2 });
    expect(sleep).not.toHaveBeenCalled();
  });
});
