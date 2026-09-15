type RateLimitRule = {
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const runtimeState = globalThis as typeof globalThis & {
  __briaspasRateLimits?: Map<string, Bucket>;
};

const buckets = runtimeState.__briaspasRateLimits ?? new Map<string, Bucket>();
runtimeState.__briaspasRateLimits = buckets;

export function checkRateLimit(key: string, rule: RateLimitRule) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
    };
  }

  current.count += 1;
  return { allowed: true, remaining: rule.limit - current.count, retryAfterSeconds: 0 };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { error: { code: "rate_limited", message: "Muitas solicitações em pouco tempo. Aguarde e tente novamente." } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
