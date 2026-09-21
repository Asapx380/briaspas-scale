import { describe, expect, it, vi } from "vitest";
import { OpenRouterRequestError } from "@/lib/openrouter/generate-site";
import {
  DEFAULT_MAX_RATE_LIMIT_RETRIES,
  DEFAULT_RATE_LIMIT_WAIT_SECONDS,
  formatProviderFailureLog,
  isRetryableProviderFailure,
  parseRetryAfterHeader,
  readProviderRetryAfterSeconds,
  runWithRateLimitRetries,
  waitSecondsForProviderRetry,
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

  it("usa o piso de 60s quando Retry-After é curto", () => {
    const error = { upstreamStatus: 429, retryAfterSeconds: 8 };
    expect(waitSecondsForProviderRetry(error, DEFAULT_RATE_LIMIT_WAIT_SECONDS)).toBe(60);
  });

  it("respeita Retry-After acima do piso", () => {
    const error = { upstreamStatus: 429, retryAfterSeconds: 90 };
    expect(waitSecondsForProviderRetry(error, DEFAULT_RATE_LIMIT_WAIT_SECONDS)).toBe(90);
  });

  it("repete após 429 esperando max(Retry-After, 60s)", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ upstreamStatus: 429, retryAfterSeconds: 8 })
      .mockResolvedValueOnce("ok");

    const result = await runWithRateLimitRetries(task, {
      respectRateLimit: true,
      maxRetries: 2,
      defaultWaitSeconds: 60,
      sleep,
    });

    expect(result).toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(60_000);
  });

  it("repete falhas de capacidade e timeout, não só 429", async () => {
    const sleep = vi.fn(async () => {});
    const timeout = Object.assign(new Error("The operation was aborted due to timeout"), {
      name: "TimeoutError",
    });
    const task = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({ upstreamStatus: 503, name: "OpenRouterRequestError" })
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce("ok");

    const result = await runWithRateLimitRetries(task, {
      respectRateLimit: true,
      maxRetries: 8,
      defaultWaitSeconds: 60,
      sleep,
    });

    expect(result).toBe("ok");
    expect(task).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenNthCalledWith(1, 60_000);
    expect(sleep).toHaveBeenNthCalledWith(2, 60_000);
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

  it("não repete erro de autenticação", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi.fn().mockRejectedValue({
      name: "OpenRouterRequestError",
      upstreamStatus: 401,
    });
    await expect(
      runWithRateLimitRetries(task, {
        respectRateLimit: true,
        maxRetries: 8,
        defaultWaitSeconds: 60,
        sleep,
      }),
    ).rejects.toMatchObject({ upstreamStatus: 401 });
    expect(sleep).not.toHaveBeenCalled();
    expect(isRetryableProviderFailure({ name: "OpenRouterRequestError", upstreamStatus: 401 })).toBe(
      false,
    );
  });

  it("tenta 1 vez mais o máximo de retries padrão (8)", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi.fn().mockRejectedValue({ upstreamStatus: 429, retryAfterSeconds: 21 });
    await expect(
      runWithRateLimitRetries(task, {
        respectRateLimit: true,
        maxRetries: DEFAULT_MAX_RATE_LIMIT_RETRIES,
        defaultWaitSeconds: 60,
        sleep,
      }),
    ).rejects.toMatchObject({ upstreamStatus: 429 });
    expect(task).toHaveBeenCalledTimes(DEFAULT_MAX_RATE_LIMIT_RETRIES + 1);
    expect(sleep).toHaveBeenCalledTimes(DEFAULT_MAX_RATE_LIMIT_RETRIES);
    expect(sleep).toHaveBeenCalledWith(60_000);
  });

  it("formata log de provedor com status e sem chave", () => {
    const error = new OpenRouterRequestError(
      429,
      "Rate limit exceeded. Bearer sk-or-v1-secretkey12",
      8,
    );
    const log = formatProviderFailureLog(error);
    expect(log).toContain("OpenRouterRequestError");
    expect(log).toContain("status=429");
    expect(log).toContain("Rate limit exceeded");
    expect(log).not.toMatch(/sk-or-v1-secretkey12/);
    expect(log).toContain("[redacted]");
  });
});
