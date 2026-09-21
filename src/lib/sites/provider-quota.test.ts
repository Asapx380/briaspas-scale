import { describe, expect, it, vi } from "vitest";
import { GeminiRequestError } from "@/lib/gemini/generate-site";
import { GroqRequestError } from "@/lib/groq/generate-site";
import { OpenRouterRequestError } from "@/lib/openrouter/generate-site";
import {
  DailyQuotaExhaustedError,
  classifyProviderQuotaKind,
  createProviderQuotaState,
  parseTryAgainInSeconds,
  recordProviderQuotaFailure,
  runWithProviderQuota,
  type QuotaTrackedProvider,
} from "@/lib/sites/provider-quota";
import {
  DEFAULT_RATE_LIMIT_WAIT_SECONDS,
  formatProviderFailureLog,
  isRetryableProviderFailure,
  runWithRateLimitRetries,
  waitSecondsForProviderRetry,
} from "@/lib/sites/provider-http-retry";

function dailyOpenRouter() {
  return new OpenRouterRequestError(
    429,
    "Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day",
    12,
  );
}

function groqTpm() {
  return new GroqRequestError(
    429,
    "Rate limit reached for model in organization org_abc123. Limit 8000 TPM, Used 5700, Requested 5300. Please try again in 7.32s. Visit https://console.groq.com/settings/billing",
    8,
  );
}

describe("provider-quota", () => {
  it("classifica cota diária, TPM e Gemini 429 sem detalhe", () => {
    expect(classifyProviderQuotaKind(dailyOpenRouter())).toBe("daily");
    expect(classifyProviderQuotaKind(groqTpm())).toBe("tpm");
    expect(classifyProviderQuotaKind(new GeminiRequestError(429))).toBe("daily");
    expect(parseTryAgainInSeconds("Please try again in 7.32s.")).toBe(8);
  });

  it("não volta a chamar provedor em cota diária", async () => {
    const quota = createProviderQuotaState();
    const attempt = vi.fn<(provider: QuotaTrackedProvider) => Promise<string>>()
      .mockRejectedValueOnce(new GeminiRequestError(429))
      .mockRejectedValueOnce(dailyOpenRouter());

    await expect(
      runWithProviderQuota(["gemini", "openrouter"], quota, attempt, { nowMs: 1_000 }),
    ).rejects.toBeInstanceOf(DailyQuotaExhaustedError);

    expect(attempt).toHaveBeenCalledTimes(2);

    await expect(
      runWithProviderQuota(["gemini", "openrouter"], quota, attempt, { nowMs: 2_000 }),
    ).rejects.toMatchObject({
      name: "DailyQuotaExhaustedError",
      message: "cota diária Gemini, OpenRouter; tente amanhã",
    });
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("espera TPM do Groq e não dispara Groq no mesmo ciclo", async () => {
    const quota = createProviderQuotaState();
    const nowMs = 10_000;
    const attempt = vi.fn<(provider: QuotaTrackedProvider) => Promise<string>>()
      .mockRejectedValueOnce(new GeminiRequestError(429))
      .mockRejectedValueOnce(groqTpm())
      .mockRejectedValueOnce(dailyOpenRouter());

    await expect(
      runWithProviderQuota(["gemini", "groq", "openrouter"], quota, attempt, { nowMs }),
    ).rejects.toBeInstanceOf(GroqRequestError);

    expect(attempt.mock.calls.map((call) => call[0])).toEqual(["gemini", "groq", "openrouter"]);

    const skipped = vi.fn<(provider: QuotaTrackedProvider) => Promise<string>>();
    await expect(
      runWithProviderQuota(["gemini", "groq", "openrouter"], quota, skipped, { nowMs: nowMs + 1_000 }),
    ).rejects.toBeInstanceOf(GroqRequestError);
    expect(skipped).not.toHaveBeenCalled();

    skipped.mockResolvedValueOnce("ok");
    await expect(
      runWithProviderQuota(["gemini", "groq", "openrouter"], quota, skipped, { nowMs: nowMs + 8_000 }),
    ).resolves.toBe("ok");
    expect(skipped).toHaveBeenCalledTimes(1);
    expect(skipped).toHaveBeenCalledWith("groq");
  });
});

describe("retry vs cota diária e TPM", () => {
  it("não retenta cota diária (falha cedo)", async () => {
    const sleep = vi.fn(async () => {});
    const task = vi.fn().mockRejectedValue(new DailyQuotaExhaustedError(["openrouter"]));
    await expect(
      runWithRateLimitRetries(task, {
        respectRateLimit: true,
        maxRetries: 8,
        defaultWaitSeconds: 60,
        sleep,
      }),
    ).rejects.toMatchObject({
      name: "DailyQuotaExhaustedError",
      message: "cota diária OpenRouter; tente amanhã",
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(isRetryableProviderFailure(dailyOpenRouter())).toBe(false);
  });

  it("no TPM espera try again in Xs, sem piso de 60s", () => {
    expect(waitSecondsForProviderRetry(groqTpm(), DEFAULT_RATE_LIMIT_WAIT_SECONDS)).toBe(8);
  });

  it("sanitiza org id e URL de billing no log", () => {
    const log = formatProviderFailureLog(groqTpm());
    expect(log).toContain("status=429");
    expect(log).toContain("TPM");
    expect(log).not.toContain("org_abc123");
    expect(log).toContain("org_[redacted]");
    expect(log).not.toContain("console.groq.com");
    expect(log).toContain("[url]");
  });
});

describe("recordProviderQuotaFailure", () => {
  it("marca OpenRouter como diário", () => {
    const quota = createProviderQuotaState();
    recordProviderQuotaFailure(quota, "openrouter", dailyOpenRouter(), 0);
    expect(quota.dailyExhausted.has("openrouter")).toBe(true);
  });
});
