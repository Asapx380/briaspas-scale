import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LeadSiteInput } from "../src/lib/sites/build-generation-prompt";
import type { SiteBrief } from "../src/lib/sites/design-plan";
import { listSiteTemplateManifests } from "../src/lib/sites/template-catalog";
import { renderSiteTemplate } from "../src/lib/sites/template-renderer";

const outputRoot = process.argv[2] || "/tmp/briaspas-template-previews";

function briefFor(category: string): SiteBrief {
  return {
    resumoDoNegocio: `Negócio local da categoria ${category}. Confirme serviços e disponibilidade diretamente pelo WhatsApp.`,
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

const cards: string[] = [];
for (const manifest of listSiteTemplateManifests()) {
  const category = manifest.categories[0];
  const input: LeadSiteInput = {
    companyName: `Empresa Teste ${manifest.name}`,
    category,
    phone: "(19) 98888-7766",
    address: "Rua Teste Seguro, 150 - Centro, São Pedro - SP",
    instagram: null,
    websiteUrl: null,
    googleMapsUrl: "https://maps.google.com/?cid=123456789",
    photoUrls: [],
    stockPhoto: {
      url: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
      photographer: "Fauxels",
      photographerUrl: "https://www.pexels.com/@fauxels",
      pexelsUrl: "https://www.pexels.com/photo/3184465/",
    },
    rating: null,
    reviewCount: null,
  };
  const rendered = await renderSiteTemplate(input, briefFor(category));
  const directory = path.join(outputRoot, manifest.id);
  await mkdir(directory, { recursive: true });
  await Promise.all(rendered.files.map((file) => writeFile(path.join(directory, file.path), file.content)));
  cards.push(`<article><h2>${manifest.name}</h2><p>${category} · ${manifest.tokenizationFamily ?? "manual"}</p><a href="${manifest.id}/index.html">Abrir site</a><iframe loading="lazy" src="${manifest.id}/index.html" title="${manifest.name}"></iframe></article>`);
}

await writeFile(path.join(outputRoot, "index.html"), `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Matriz de templates</title><style>body{font:16px system-ui;margin:24px;background:#eef2f6;color:#18212b}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px}article{background:white;padding:18px;border-radius:16px;box-shadow:0 8px 30px #1d293522}h2{margin:0}p{color:#526270}iframe{display:block;width:100%;height:520px;border:1px solid #ccd4dd;border-radius:10px;margin-top:14px}</style></head><body><h1>15 templates tokenizados</h1><main>${cards.join("")}</main></body></html>`);

console.log(`15 prévias geradas em ${outputRoot}`);
