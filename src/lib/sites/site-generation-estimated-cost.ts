import type { SiteGeneratorProvider } from "@/lib/sites/site-generator";

export function estimatedSiteGenerationCostUsd(
  provider: SiteGeneratorProvider,
  promptTokens: number,
  completionTokens: number,
) {
  if (provider === "openrouter") return null;

  const prefix = provider.toUpperCase();
  const inputRate = Number(process.env[`${prefix}_INPUT_USD_PER_MILLION`]);
  const outputRate = Number(process.env[`${prefix}_OUTPUT_USD_PER_MILLION`]);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate) || inputRate < 0 || outputRate < 0) {
    return null;
  }
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}
