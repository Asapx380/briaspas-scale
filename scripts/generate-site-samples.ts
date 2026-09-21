import "../src/lib/sites/load-sample-generation-env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildLeadMapEmbedUrl,
  buildLeadSitePrompt,
  buildLeadWhatsAppUrl,
} from "../src/lib/sites/build-generation-prompt";
import { buildDesignPlanPrompt } from "../src/lib/sites/design-plan";
import { validateGeneratedSiteContent } from "../src/lib/sites/generated-site-validation";
import { SITE_GENERATION_SAMPLES } from "../src/lib/sites/site-generation-sample-leads";
import { generateLeadSite, getSelectedSiteGeneratorProvider } from "../src/lib/sites/site-generator";

const outputRoot = process.argv[2] || "/tmp/briaspas-samples";

function estimatedCost(
  provider: "groq" | "openai" | "gemini",
  promptTokens: number,
  completionTokens: number,
) {
  const prefix = provider.toUpperCase();
  const inputRate = Number(process.env[`${prefix}_INPUT_USD_PER_MILLION`]);
  const outputRate = Number(process.env[`${prefix}_OUTPUT_USD_PER_MILLION`]);
  if (!Number.isFinite(inputRate) || !Number.isFinite(outputRate)) return null;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}

function guardrailsFor(lead: (typeof SITE_GENERATION_SAMPLES)[number]["lead"]) {
  return {
    whatsappUrl: buildLeadWhatsAppUrl(lead.phone),
    mapEmbedUrl: buildLeadMapEmbedUrl(lead.address),
    photoUrls: lead.stockPhoto ? [...lead.photoUrls, lead.stockPhoto.url] : lead.photoUrls,
    externalUrls: [
      lead.instagram,
      lead.websiteUrl,
      lead.googleMapsUrl,
      lead.stockPhoto?.photographerUrl,
      lead.stockPhoto?.pexelsUrl,
    ].filter((url): url is string => Boolean(url)),
  };
}

async function main() {
  const provider = getSelectedSiteGeneratorProvider();
  if (!provider) {
    console.error(
      "Configure GROQ_API_KEY, OPENAI_API_KEY ou GEMINI_API_KEY em .env.local antes de gerar amostras.",
    );
    process.exit(1);
  }

  await mkdir(outputRoot, { recursive: true });
  const summary: Array<Record<string, unknown>> = [];

  for (const sample of SITE_GENERATION_SAMPLES) {
    const sampleDir = path.join(outputRoot, sample.slug);
    await mkdir(sampleDir, { recursive: true });
    await writeFile(
      path.join(sampleDir, "lead.json"),
      `${JSON.stringify({ label: "Dados demonstrativos", ...sample.lead }, null, 2)}\n`,
      "utf8",
    );

    const startedAt = Date.now();
    try {
      const generated = await generateLeadSite(
        buildLeadSitePrompt(sample.lead),
        buildDesignPlanPrompt(sample.lead.category, sample.lead.photoUrls.length > 0),
        sample.lead,
        guardrailsFor(sample.lead),
      );
      const validatorErrors = validateGeneratedSiteContent(generated.html, sample.lead);
      await writeFile(path.join(sampleDir, "index.html"), generated.html, "utf8");

      const report = {
        slug: sample.slug,
        niche: sample.nicheLabel,
        provider: generated.provider,
        model: generated.model,
        durationMs: generated.durationMs,
        attempts: generated.attempts,
        usage: generated.usage,
        estimatedCostUsd: estimatedCost(
          generated.provider,
          generated.usage.promptTokens,
          generated.usage.completionTokens,
        ),
        validatorErrors,
        validatorPassed: validatorErrors.length === 0,
        generatedAt: new Date().toISOString(),
      };
      await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      summary.push(report);
      console.log(
        `${sample.slug}: ${report.validatorPassed ? "validador ok" : "validador com erros"} em ${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      const report = {
        slug: sample.slug,
        niche: sample.nicheLabel,
        error: error instanceof Error ? error.message : "erro_desconhecido",
        durationMs: Date.now() - startedAt,
        generatedAt: new Date().toISOString(),
      };
      await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      summary.push(report);
      console.error(`${sample.slug}: falhou — ${report.error}`);
    }
  }

  await writeFile(path.join(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`Relatório consolidado: ${path.join(outputRoot, "summary.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
