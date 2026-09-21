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

export function readProviderRetryAfterSeconds(error: unknown) {
  const candidate = error as { upstreamStatus?: number; retryAfterSeconds?: number };
  if (candidate.upstreamStatus !== 429) return undefined;
  if (typeof candidate.retryAfterSeconds === "number" && candidate.retryAfterSeconds >= 0) {
    return candidate.retryAfterSeconds;
  }
  return undefined;
}

export async function runWithRateLimitRetries<T>(
  task: () => Promise<T>,
  options: {
    respectRateLimit: boolean;
    maxRetries: number;
    defaultWaitSeconds: number;
    sleep: (milliseconds: number) => Promise<void>;
  },
) {
  let retries = 0;
  while (true) {
    try {
      return await task();
    } catch (error) {
      const is429 = (error as { upstreamStatus?: number }).upstreamStatus === 429;
      if (!options.respectRateLimit || !is429 || retries >= options.maxRetries) {
        throw error;
      }
      const waitSeconds = readProviderRetryAfterSeconds(error) ?? options.defaultWaitSeconds;
      await options.sleep(waitSeconds * 1_000);
      retries += 1;
    }
  }
}
