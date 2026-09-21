import { SITE_GENERATION_SAMPLES } from "./site-generation-sample-leads";

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
  let maxRateLimitRetries = 3;

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
      const parsed = Number.parseInt(argv[index + 1] ?? "3", 10);
      maxRateLimitRetries = Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
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
