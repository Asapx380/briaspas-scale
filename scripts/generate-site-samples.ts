import "../src/lib/sites/load-sample-generation-env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildLeadMapEmbedUrl,
  buildLeadSitePrompt,
  buildLeadWhatsAppUrl,
} from "../src/lib/sites/build-generation-prompt";
import { buildDesignPlanPrompt } from "../src/lib/sites/design-plan";
import {
  parseGenerateSiteSamplesCli,
  selectSiteGenerationSamples,
} from "../src/lib/sites/generate-site-samples-cli";
import { classifySampleGenerationFailure } from "../src/lib/sites/generated-site-validation-issue";
import { collectGeneratedSiteContentIssues } from "../src/lib/sites/generated-site-validation";
import { runWithRateLimitRetries } from "../src/lib/sites/provider-http-retry";
import { estimatedSiteGenerationCostUsd } from "../src/lib/sites/site-generation-estimated-cost";
import { generateLeadSite, isSiteGeneratorConfigured } from "../src/lib/sites/site-generator";

const cli = parseGenerateSiteSamplesCli(process.argv.slice(2));
const outputRoot = cli.outputRoot;

function guardrailsFor(lead: ReturnType<typeof selectSiteGenerationSamples>[number]["lead"]) {
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

function sampleFailed(entry: Record<string, unknown>) {
  if (entry.failureKind === "success") return false;
  return (
    entry.failureKind === "provider" ||
    entry.failureKind === "html_validation" ||
    entry.failureKind === "unknown" ||
    entry.validatorPassed === false
  );
}

async function writeSummary(summary: Array<Record<string, unknown>>) {
  await writeFile(path.join(outputRoot, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function generateSample(
  sample: ReturnType<typeof selectSiteGenerationSamples>[number],
) {
  return runWithRateLimitRetries(
    () =>
      generateLeadSite(
        buildLeadSitePrompt(sample.lead),
        buildDesignPlanPrompt(sample.lead.category, sample.lead.photoUrls.length > 0),
        sample.lead,
        guardrailsFor(sample.lead),
      ),
    {
      respectRateLimit: cli.respectRateLimit,
      maxRetries: cli.maxRateLimitRetries,
      defaultWaitSeconds: 60,
      sleep: async (milliseconds) => {
        const seconds = Math.ceil(milliseconds / 1000);
        console.error(`${sample.slug}: aguardando ${seconds}s (429)`);
        await sleep(milliseconds);
      },
    },
  );
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const summary: Array<Record<string, unknown>> = [];
  const samples = selectSiteGenerationSamples(cli.onlySlug);

  if (!isSiteGeneratorConfigured()) {
    for (const sample of samples) {
      summary.push({
        slug: sample.slug,
        niche: sample.nicheLabel,
        failureKind: "provider",
        error: "site_generator_not_configured",
        generatedAt: new Date().toISOString(),
      });
    }
    await writeSummary(summary);
    console.error("Nenhum provedor de geração configurado.");
    process.exit(1);
  }

  for (const sample of samples) {
    const sampleDir = path.join(outputRoot, sample.slug);
    await mkdir(sampleDir, { recursive: true });
    await writeFile(
      path.join(sampleDir, "lead.json"),
      `${JSON.stringify({ label: "Dados demonstrativos", ...sample.lead }, null, 2)}\n`,
      "utf8",
    );

    const startedAt = Date.now();
    try {
      const generated = await generateSample(sample);
      const validatorIssues = collectGeneratedSiteContentIssues(generated.html, sample.lead);
      await writeFile(path.join(sampleDir, "index.html"), generated.html, "utf8");

      const report = {
        slug: sample.slug,
        niche: sample.nicheLabel,
        failureKind: validatorIssues.length === 0 ? "success" : "html_validation",
        provider: generated.provider,
        model: generated.model,
        durationMs: generated.durationMs,
        attempts: generated.attempts,
        usage: generated.usage,
        estimatedCostUsd: estimatedSiteGenerationCostUsd(
          generated.provider,
          generated.usage.promptTokens,
          generated.usage.completionTokens,
        ),
        validatorStage: validatorIssues.length === 0 ? undefined : "content",
        validatorIssues,
        validatorPassed: validatorIssues.length === 0,
        cliOptions: {
          onlySlug: cli.onlySlug,
          respectRateLimit: cli.respectRateLimit,
        },
        generatedAt: new Date().toISOString(),
      };
      await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      summary.push(report);
      console.log(
        `${sample.slug}: ${report.validatorPassed ? "validador ok" : "validador com erros"} em ${Date.now() - startedAt}ms`,
      );
    } catch (error) {
      const classified = classifySampleGenerationFailure(error);
      const report = {
        slug: sample.slug,
        niche: sample.nicheLabel,
        durationMs: Date.now() - startedAt,
        generatedAt: new Date().toISOString(),
        cliOptions: {
          onlySlug: cli.onlySlug,
          respectRateLimit: cli.respectRateLimit,
        },
        ...classified,
      };
      await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
      summary.push(report);
      console.error(`${sample.slug}: falhou (${classified.failureKind})`);
    }
  }

  await writeSummary(summary);

  console.log(`Relatório consolidado: ${path.join(outputRoot, "summary.json")}`);

  if (summary.some(sampleFailed)) {
    process.exit(1);
  }
}

main().catch(async (error) => {
  const classified = classifySampleGenerationFailure(error);
  const fallback = [
    {
      fatal: true,
      generatedAt: new Date().toISOString(),
      ...classified,
    },
  ];
  try {
    await mkdir(outputRoot, { recursive: true });
    await writeSummary(fallback);
  } catch {
    // ignore write errors on fatal path
  }
  console.error(classified.error);
  process.exit(1);
});
