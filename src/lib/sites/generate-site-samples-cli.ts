import { DEFAULT_MAX_RATE_LIMIT_RETRIES } from "./provider-http-retry";
import { SITE_GENERATION_SAMPLES } from "./site-generation-sample-leads";

export { DEFAULT_MAX_RATE_LIMIT_RETRIES, DEFAULT_RATE_LIMIT_WAIT_SECONDS } from "./provider-http-retry";

export type GenerateSiteSamplesCliOptions = {
  outputRoot: string;
  onlySlug: string | null;
  respectRateLimit: boolean;
  maxRateLimitRetries: number;
};

const FLAG_REQUIRES_VALUE = new Set(["--only", "--out", "--max-rate-limit-retries"]);

export function parseGenerateSiteSamplesCli(argv: string[]): GenerateSiteSamplesCliOptions {
  let outputRoot = "/tmp/briaspas-samples";
  let onlySlug: string | null = null;
  let respectRateLimit = false;
  let maxRateLimitRetries = DEFAULT_MAX_RATE_LIMIT_RETRIES;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--only") {
      onlySlug = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === "--out") {
      outputRoot = argv[index + 1] ?? outputRoot;
      index += 1;
      continue;
    }
    if (arg === "--respect-rate-limit" || arg === "--wait-on-429") {
      respectRateLimit = true;
      continue;
    }
    if (arg === "--max-rate-limit-retries") {
      const parsed = Number.parseInt(argv[index + 1] ?? String(DEFAULT_MAX_RATE_LIMIT_RETRIES), 10);
      maxRateLimitRetries =
        Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_RATE_LIMIT_RETRIES;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      continue;
    }
    if (!FLAG_REQUIRES_VALUE.has(arg)) {
      outputRoot = arg;
    }
  }

  return {
    outputRoot,
    onlySlug,
    respectRateLimit,
    maxRateLimitRetries,
  };
}

export function selectSiteGenerationSamples(onlySlug: string | null) {
  if (!onlySlug) return SITE_GENERATION_SAMPLES;
  const sample = SITE_GENERATION_SAMPLES.find((entry) => entry.slug === onlySlug);
  if (!sample) {
    throw new Error(`slug_desconhecido:${onlySlug}`);
  }
  return [sample];
}
