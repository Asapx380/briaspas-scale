import {
  DailyQuotaExhaustedError,
  classifyProviderQuotaKind,
  parseTryAgainInSeconds,
} from "./provider-quota";

export const DEFAULT_RATE_LIMIT_WAIT_SECONDS = 60;
export const DEFAULT_MAX_RATE_LIMIT_RETRIES = 8;

const RETRYABLE_HTTP_STATUS = new Set([408, 429, 500, 502, 503, 504, 529]);
const NON_RETRYABLE_HTTP_STATUS = new Set([400, 401, 403, 404, 422]);
const RETRYABLE_ERROR_NAMES = new Set(["TimeoutError", "AbortError"]);
const RETRYABLE_MESSAGE =
  /rate[\s_-]?limit|resource[\s_-]?exhausted|overloaded|capacity|unavailable|timed?\s*out|timeout|etimedout|econnreset|und_err_connect_timeout/i;

export function parseRetryAfterHeader(value: string | null | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  const asSeconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return asSeconds;
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    return Math.max(0, Math.ceil((asDate - Date.now()) / 1_000));
  }
  return undefined;
}

function readErrorName(error: unknown) {
  return error instanceof Error ? error.name : "erro_desconhecido";
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function readProviderHttpStatus(error: unknown) {
  const status = (error as { upstreamStatus?: number }).upstreamStatus;
  return typeof status === "number" ? status : undefined;
}

export function readProviderRetryAfterSeconds(error: unknown) {
  const candidate = error as { upstreamStatus?: number; retryAfterSeconds?: number };
  if (candidate.upstreamStatus !== 429) return undefined;
  if (typeof candidate.retryAfterSeconds === "number" && candidate.retryAfterSeconds >= 0) {
    return candidate.retryAfterSeconds;
  }
  return undefined;
}

export function waitSecondsForProviderRetry(error: unknown, defaultWaitSeconds: number) {
  const kind = classifyProviderQuotaKind(error);
  const tryAgain = parseTryAgainInSeconds(readErrorMessage(error));
  const hinted =
    typeof (error as { retryAfterSeconds?: number }).retryAfterSeconds === "number" &&
    (error as { retryAfterSeconds: number }).retryAfterSeconds >= 0
      ? (error as { retryAfterSeconds: number }).retryAfterSeconds
      : readProviderRetryAfterSeconds(error);

  if (kind === "tpm") {
    return Math.max(1, tryAgain ?? hinted ?? defaultWaitSeconds);
  }

  return Math.max(hinted ?? 0, tryAgain ?? 0, defaultWaitSeconds);
}

export function isRetryableProviderFailure(error: unknown) {
  if (error instanceof DailyQuotaExhaustedError) return false;
  const name = readErrorName(error);
  if (name === "GeneratedSiteContentError" || name === "InvalidGeneratedSiteError") return false;
  if (classifyProviderQuotaKind(error) === "daily") return false;

  const status = readProviderHttpStatus(error);
  if (typeof status === "number" && NON_RETRYABLE_HTTP_STATUS.has(status)) return false;
  if (typeof status === "number" && RETRYABLE_HTTP_STATUS.has(status)) return true;
  if (RETRYABLE_ERROR_NAMES.has(name)) return true;

  const message = readErrorMessage(error);
  return RETRYABLE_MESSAGE.test(name) || RETRYABLE_MESSAGE.test(message);
}

export function redactProviderSecrets(value: string) {
  return value
    .replace(/(Bearer)\s+\S+/gi, "$1 [redacted]")
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{10,}|gsk_[A-Za-z0-9_-]{10,}|or-[A-Za-z0-9_-]{10,}|AIza[A-Za-z0-9_-]{10,})\b/g,
      "[redacted]",
    )
    .replace(/\borg_[A-Za-z0-9]+\b/g, "org_[redacted]")
    .replace(
      /https?:\/\/[^\s]*?(?:console\.groq\.com|openrouter\.ai|ai\.google\.dev|makersuite)[^\s]*/gi,
      "[url]",
    );
}

export function formatProviderFailureLog(error: unknown) {
  const name = readErrorName(error);
  const status = readProviderHttpStatus(error);
  const message = redactProviderSecrets(readErrorMessage(error));
  const parts = [name];
  if (typeof status === "number") parts.push(`status=${status}`);
  if (message && message !== name) parts.push(message);
  return parts.join(" ");
}

export async function runWithRateLimitRetries<T>(
  task: () => Promise<T>,
  options: {
    respectRateLimit: boolean;
    maxRetries: number;
    defaultWaitSeconds: number;
    sleep: (milliseconds: number) => Promise<void>;
    onRetry?: (info: { waitSeconds: number; attempt: number; error: unknown }) => void;
  },
) {
  let retries = 0;
  while (true) {
    try {
      return await task();
    } catch (error) {
      if (
        !options.respectRateLimit ||
        !isRetryableProviderFailure(error) ||
        retries >= options.maxRetries
      ) {
        throw error;
      }
      const waitSeconds = waitSecondsForProviderRetry(error, options.defaultWaitSeconds);
      options.onRetry?.({ waitSeconds, attempt: retries + 1, error });
      await options.sleep(waitSeconds * 1_000);
      retries += 1;
    }
  }
}
