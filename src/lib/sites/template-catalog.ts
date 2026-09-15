import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import academiaManifest from "./templates/academia-01/template.json";
import advocaciaManifest from "./templates/advocacia-01/template.json";
import clinicaEsteticaManifest from "./templates/clinica-estetica-01/template.json";
import clinicaMedicaManifest from "./templates/clinica-medica-01/template.json";
import coachConsultorManifest from "./templates/coach-consultor-01/template.json";
import consultorioOdontologicoManifest from "./templates/consultorio-odontologico-01/template.json";
import contabilidadeManifest from "./templates/contabilidade-01/template.json";
import escolaIdiomasManifest from "./templates/escola-idiomas-01/template.json";
import imobiliariaManifest from "./templates/imobiliaria-01/template.json";
import infoprodutorManifest from "./templates/infoprodutor-01/template.json";
import lojaRoupaManifest from "./templates/loja-roupa-01/template.json";
import oficinaMecanicaManifest from "./templates/oficina-mecanica-01/template.json";
import petshopManifest from "./templates/petshop-01/template.json";
import restauranteManifest from "./templates/restaurante-01/template.json";
import salaoBelezaManifest from "./templates/salao-beleza-01/template.json";

const manifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  version: z.number().int().positive(),
  name: z.string().min(1),
  categories: z.array(z.string().min(1)).min(1),
  style: z.array(z.string().min(1)),
  requiredTokens: z.array(z.string().min(1)),
  optionalSections: z.record(z.string(), z.object({ requires: z.string().min(1) })),
  imageSlots: z.array(z.object({ token: z.string().min(1), fallback: z.literal("pexels") })),
  tokenizationFamily: z.enum(["centralized", "inline-links"]).optional(),
});

export type SiteTemplateManifest = z.infer<typeof manifestSchema>;
export type SiteTemplate = {
  manifest: SiteTemplateManifest;
  html: string;
  css: string;
  javascript: string;
};

const manifests = [
  academiaManifest, advocaciaManifest, clinicaEsteticaManifest, clinicaMedicaManifest,
  coachConsultorManifest, consultorioOdontologicoManifest, contabilidadeManifest,
  escolaIdiomasManifest, imobiliariaManifest, infoprodutorManifest, lojaRoupaManifest,
  oficinaMecanicaManifest, petshopManifest, restauranteManifest, salaoBelezaManifest,
].map((manifest) => manifestSchema.parse(manifest));

export function listSiteTemplateManifests() {
  return [...manifests];
}

export function normalizeTemplateCategory(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function categoryScore(category: string, candidate: string) {
  const normalized = normalizeTemplateCategory(category);
  const target = normalizeTemplateCategory(candidate);
  if (normalized === target) return 100;
  if (normalized.includes(target) || target.includes(normalized)) return Math.min(normalized.length, target.length);
  const words = new Set(normalized.split(/\W+/).filter((word) => word.length > 2));
  return target.split(/\W+/).filter((word) => words.has(word)).length;
}

export function selectSiteTemplateManifest(category: string) {
  const ranked = manifests
    .map((manifest, index) => ({
      manifest,
      index,
      score: Math.max(...manifest.categories.map((candidate) => categoryScore(category, candidate))),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked[0]?.manifest ?? null;
}

export async function loadSiteTemplate(manifest: SiteTemplateManifest): Promise<SiteTemplate> {
  const directory = path.join(process.cwd(), "src", "lib", "sites", "templates", manifest.id);
  const [html, css, javascript] = await Promise.all([
    readFile(path.join(directory, "index.html"), "utf8"),
    readFile(path.join(directory, "style.css"), "utf8"),
    readFile(path.join(directory, "script.js"), "utf8"),
  ]);
  return { manifest, html, css, javascript };
}
