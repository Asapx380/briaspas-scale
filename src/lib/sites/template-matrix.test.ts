import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { LeadSiteInput } from "./build-generation-prompt";
import type { SiteBrief } from "./design-plan";
import { listSiteTemplateManifests } from "./template-catalog";
import { renderSiteTemplate } from "./template-renderer";

const sourceRoot = "/home/asap/Documentos/Projetos/Freelance/15-PROJETOSPARAFREELLANCERS/landing-pages";
const phone = "(19) 98888-7766";
const whatsappNumber = "5519988887766";
const address = "Rua Teste Seguro, 150 - Centro, São Pedro - SP";
const mapsUrl = "https://maps.google.com/?cid=123456789";
const stockPhoto = {
  url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
  photographer: "Foto Teste",
  photographerUrl: "https://www.pexels.com/@foto-teste",
  pexelsUrl: "https://www.pexels.com/photo/1640777/",
};

function briefFor(category: string): SiteBrief {
  return {
    resumoDoNegocio: `Informações verificadas para um negócio da categoria ${category}.`,
    tomDeVoz: "direto e informativo",
    paletteName: "Identidade do nicho",
    colors: { background: "#f4f7fa", surface: "#ffffff", primary: "#176b87", accent: "#e58b32", text: "#1d2935", textMuted: "#526270" },
    typography: { display: "Outfit", body: "Inter", pairingRationale: "Títulos marcantes com leitura clara." },
    layoutConcept: "Estrutura responsiva com contato em destaque.",
    principles: ["Hierarquia visual acessível", "Contato direto em destaque", "Dados reais sem afirmações inventadas"],
    servicosSugeridos: [
      { nome: "Atendimento inicial", microbeneficio: "Possibilidade de entender necessidades e próximos passos." },
      { nome: "Orientação", microbeneficio: "Possibilidade de esclarecer dúvidas antes da contratação." },
      { nome: "Serviço especializado", microbeneficio: "Possibilidade de consultar opções adequadas ao objetivo." },
      { nome: "Acompanhamento", microbeneficio: "Possibilidade de confirmar suporte e disponibilidade." },
    ],
    diferenciais: ["Confirmar formas de atendimento disponíveis", "Perguntar sobre prazos e condições antes de contratar"],
    ctaPrincipal: "Solicite informações",
    fotoSugerida: null,
  };
}

describe("matriz dos 15 templates", () => {
  for (const manifest of listSiteTemplateManifests()) {
    it(`${manifest.id}: gera sem depoimento, link incorreto ou token restante`, async () => {
      const category = manifest.categories[0];
      const input: LeadSiteInput = {
        companyName: `Empresa Teste ${manifest.id}`,
        category,
        phone,
        address,
        instagram: null,
        websiteUrl: null,
        googleMapsUrl: mapsUrl,
        photoUrls: [],
        stockPhoto,
        rating: null,
        reviewCount: null,
      };
      const rendered = await renderSiteTemplate(input, briefFor(category));
      expect(rendered.templateId).toBe(manifest.id);
      expect(rendered.files).toHaveLength(3);
      const contents = Object.fromEntries(rendered.files.map((file) => [file.path, file.content.toString("utf8")]));
      const all = Object.values(contents).join("\n");
      expect(all).not.toMatch(/\{\{[a-z0-9_]+\}\}/i);
      expect(contents["index.html"]).not.toMatch(/<section\b[^>]*(?:depoiment|testimonial)/i);
      if (manifest.tokenizationFamily) expect(contents["index.html"]).not.toMatch(/<section\b[^>]*(?:resultado|destaque|casos?)/i);
      expect(() => new Function(contents["script.js"])).not.toThrow();
      expect(contents["index.html"]).toContain(`https://wa.me/${whatsappNumber}`);
      expect(all).toContain(mapsUrl);
      const whatsappNumbers = [...all.matchAll(/wa\.me\/(\d+)/g)].map((match) => match[1]);
      expect(new Set(whatsappNumbers)).toEqual(new Set([whatsappNumber]));
    });
  }

  it("mantém os 15 arquivos de origem sem tokens", async () => {
    for (const manifest of listSiteTemplateManifests()) {
      const slug = manifest.id.replace(/-01$/, "");
      const source = await readFile(path.join(sourceRoot, slug, "index.html"), "utf8");
      expect(source).not.toMatch(/\{\{[a-z0-9_]+\}\}/i);
    }
  });
});
