import { loadEnvConfig } from "@next/env";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildLeadMapEmbedUrl,
  buildLeadSitePrompt,
  buildLeadWhatsAppUrl,
  type LeadSiteInput,
} from "../src/lib/sites/build-generation-prompt";
import { buildDesignPlanPrompt } from "../src/lib/sites/design-plan";
import { estimatedSiteGenerationCostUsd } from "../src/lib/sites/site-generation-estimated-cost";
import { generateLeadSite, isSiteGeneratorConfigured } from "../src/lib/sites/site-generator";

loadEnvConfig(process.cwd());

const outputRoot = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1] ?? "/tmp/briaspas-samples"
  : "/tmp/briaspas-samples";

const demoLead: LeadSiteInput = {
  companyName: "Petshop Horizonte (Dados demonstrativos)",
  category: "petshop",
  phone: "11999990000",
  address: "Rua das Flores, 100, São Paulo, SP",
  instagram: "https://instagram.com/exemplo",
  websiteUrl: null,
  googleMapsUrl: "https://maps.google.com/?q=petshop",
  photoUrls: ["https://images.pexels.com/photos/placeholder/pexels-photo.jpeg"],
  stockPhoto: null,
  rating: 4.8,
  reviewCount: 120,
};

const slug = "petshop-dados-demonstrativos";

function guardrailsFor(input: LeadSiteInput) {
  return {
    whatsappUrl: buildLeadWhatsAppUrl(input.phone),
    mapEmbedUrl: buildLeadMapEmbedUrl(input.address),
    photoUrls: input.photoUrls,
    externalUrls: [input.instagram, input.websiteUrl, input.googleMapsUrl].filter(
      (url): url is string => Boolean(url),
    ),
  };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const sampleDir = path.join(outputRoot, slug);
  await mkdir(sampleDir, { recursive: true });

  if (!isSiteGeneratorConfigured()) {
    const report = {
      slug,
      failureKind: "provider",
      error: "site_generator_not_configured",
      generatedAt: new Date().toISOString(),
    };
    await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.error("Nenhum provedor de geração configurado.");
    process.exit(1);
  }

  const startedAt = Date.now();
  try {
    const generated = await generateLeadSite(
      buildLeadSitePrompt(demoLead),
      buildDesignPlanPrompt(demoLead.category, demoLead.photoUrls.length > 0),
      guardrailsFor(demoLead),
    );
    await writeFile(path.join(sampleDir, "index.html"), generated.html, "utf8");
    const report = {
      slug,
      label: "Dados demonstrativos",
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
      validatorPassed: true,
      failureKind: "success",
      generatedAt: new Date().toISOString(),
    };
    await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`${slug}: ok em ${Date.now() - startedAt}ms (${generated.provider}/${generated.model})`);
  } catch (error) {
    const report = {
      slug,
      failureKind: "provider",
      error: error instanceof Error ? error.name : "UnknownError",
      generatedAt: new Date().toISOString(),
    };
    await writeFile(path.join(sampleDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.error(`${slug}: falhou (${report.error})`);
    process.exit(1);
  }
}

void main();
