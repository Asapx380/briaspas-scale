export type QuotaTrackedProvider = "groq" | "openai" | "gemini" | "openrouter";

export type ProviderQuotaKind = "daily" | "tpm" | "rpm" | "other";

export type ProviderQuotaState = {
  dailyExhausted: Set<QuotaTrackedProvider>;
  unavailableUntilMs: Map<QuotaTrackedProvider, number>;
  lastTpmError?: unknown;
};

const PROVIDER_LABEL: Record<QuotaTrackedProvider, string> = {
  groq: "Groq",
  openai: "OpenAI",
  gemini: "Gemini",
  openrouter: "OpenRouter",
};

const DAILY_QUOTA_PATTERN =
  /free-models-per-day|models-per-day|per[-_ ]?day|\brpd\b|daily\s+(?:quota|limit|cap)|requests per day|generate_requests_per_day/i;
const TPM_PATTERN = /\btpm\b|tokens per minute|requested\s+\d[\d,]*.{0,80}limit\s+\d/i;
const TRY_AGAIN_IN_PATTERN = /try again in\s+(\d+(?:\.\d+)?)\s*s/i;

export class DailyQuotaExhaustedError extends Error {
  readonly providers: QuotaTrackedProvider[];

  constructor(providers: QuotaTrackedProvider[]) {
    const labels = [...new Set(providers)].map((provider) => PROVIDER_LABEL[provider]);
    super(`cota diária ${labels.join(", ")}; tente amanhã`);
    this.name = "DailyQuotaExhaustedError";
    this.providers = [...new Set(providers)];
  }
}

export function createProviderQuotaState(): ProviderQuotaState {
  return {
    dailyExhausted: new Set(),
    unavailableUntilMs: new Map(),
  };
}

function readMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

function readName(error: unknown) {
  return error instanceof Error ? error.name : typeof (error as { name?: string }).name === "string"
    ? (error as { name: string }).name
    : "";
}

function readStatus(error: unknown) {
  const status = (error as { upstreamStatus?: number }).upstreamStatus;
  return typeof status === "number" ? status : undefined;
}

export function parseTryAgainInSeconds(message: string) {
  const match = message.match(TRY_AGAIN_IN_PATTERN);
  if (!match) return undefined;
  const seconds = Number.parseFloat(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.max(1, Math.ceil(seconds));
}

export function classifyProviderQuotaKind(error: unknown): ProviderQuotaKind {
  if (error instanceof DailyQuotaExhaustedError) return "daily";
  const message = readMessage(error);
  const name = readName(error);
  const status = readStatus(error);

  if (DAILY_QUOTA_PATTERN.test(message)) return "daily";
  if (TPM_PATTERN.test(message)) return "tpm";
  if (name === "GeminiRequestError" && status === 429 && parseTryAgainInSeconds(message) == null) {
    return "daily";
  }
  if (status === 429) return "rpm";
  return "other";
}

export function recordProviderQuotaFailure(
  quota: ProviderQuotaState,
  provider: QuotaTrackedProvider,
  error: unknown,
  nowMs = Date.now(),
) {
  const kind = classifyProviderQuotaKind(error);
  if (kind === "daily") {
    quota.dailyExhausted.add(provider);
    quota.unavailableUntilMs.delete(provider);
    return;
  }
  if (kind === "tpm") {
    const waitSeconds =
      parseTryAgainInSeconds(readMessage(error)) ??
      (typeof (error as { retryAfterSeconds?: number }).retryAfterSeconds === "number"
        ? Math.max(1, Math.ceil((error as { retryAfterSeconds: number }).retryAfterSeconds))
        : 1);
    quota.unavailableUntilMs.set(provider, nowMs + waitSeconds * 1_000);
    quota.lastTpmError = error;
  }
}

export function isProviderAvailableNow(
  quota: ProviderQuotaState,
  provider: QuotaTrackedProvider,
  nowMs = Date.now(),
) {
  if (quota.dailyExhausted.has(provider)) return false;
  const until = quota.unavailableUntilMs.get(provider);
  return !(until && until > nowMs);
}

export function earliestTpmWaitSeconds(
  quota: ProviderQuotaState,
  providers: QuotaTrackedProvider[],
  nowMs = Date.now(),
) {
  const waits = providers
    .filter((provider) => !quota.dailyExhausted.has(provider))
    .map((provider) => quota.unavailableUntilMs.get(provider))
    .filter((until): until is number => typeof until === "number" && until > nowMs)
    .map((until) => Math.max(1, Math.ceil((until - nowMs) / 1_000)));
  if (waits.length === 0) return undefined;
  return Math.min(...waits);
}

export async function runWithProviderQuota<T>(
  providers: QuotaTrackedProvider[],
  quota: ProviderQuotaState,
  attempt: (provider: QuotaTrackedProvider) => Promise<T>,
  options?: {
    nowMs?: number;
    log?: (provider: QuotaTrackedProvider, error: unknown) => void;
  },
) {
  if (providers.length === 0) {
    throw new Error("site_generator_not_configured");
  }

  const nowMs = options?.nowMs ?? Date.now();
  let lastError: unknown;
  let lastTpmError: unknown;

  for (const provider of providers) {
    if (!isProviderAvailableNow(quota, provider, nowMs)) continue;
    try {
      return await attempt(provider);
    } catch (error) {
      lastError = error;
      if (classifyProviderQuotaKind(error) === "tpm") lastTpmError = error;
      recordProviderQuotaFailure(quota, provider, error, nowMs);
      options?.log?.(provider, error);
    }
  }

  const tpmWait = earliestTpmWaitSeconds(quota, providers, nowMs);
  if (tpmWait != null) {
    throw lastTpmError ?? quota.lastTpmError ?? lastError ?? new Error("provider_tpm_wait");
  }

  const daily = providers.filter((provider) => quota.dailyExhausted.has(provider));
  const remaining = providers.filter((provider) => !quota.dailyExhausted.has(provider));
  if (remaining.length === 0 && daily.length > 0) {
    throw new DailyQuotaExhaustedError(daily);
  }

  throw lastError ?? new Error("site_generator_not_configured");
}
