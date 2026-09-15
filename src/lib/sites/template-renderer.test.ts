import { describe, expect, it } from "vitest";
import type { LeadSiteInput } from "./build-generation-prompt";
import type { SiteBrief } from "./design-plan";
import { renderSiteTemplate, SiteTemplateError } from "./template-renderer";

const brief: SiteBrief = {
  resumoDoNegocio: "Clínica veterinária localizada em Cidade Exemplo. Consulte o estabelecimento para confirmar os atendimentos disponíveis.",
  tomDeVoz: "próximo e informativo",
  paletteName: "Cuidado sereno",
  colors: { background: "#f4f8fb", surface: "#ffffff", primary: "#176b87", accent: "#f59e4c", text: "#1d2935", textMuted: "#526270" },
  typography: { display: "Outfit", body: "Inter", pairingRationale: "Leitura clara com títulos acolhedores." },
  layoutConcept: "Página clara com contato direto e informações objetivas.",
  principles: ["Hierarquia visual acessível", "Contato disponível em pontos estratégicos", "Informações sem alegações não verificadas"],
  servicosSugeridos: [
    { nome: "Consulta veterinária", microbeneficio: "Possibilidade de avaliar necessidades gerais do pet." },
    { nome: "Vacinação", microbeneficio: "Possibilidade de conversar sobre prevenção e calendário vacinal." },
    { nome: "Exames", microbeneficio: "Possibilidade de buscar informações sobre avaliações complementares." },
    { nome: "Orientação", microbeneficio: "Possibilidade de esclarecer dúvidas sobre cuidados cotidianos." },
  ],
  diferenciais: ["Disponibilidade dos serviços veterinários", "Horários e formas de agendamento"],
  ctaPrincipal: "Conversar pelo WhatsApp",
  fotoSugerida: null,
};

function input(overrides: Partial<LeadSiteInput> = {}): LeadSiteInput {
  return {
    companyName: "Empresa Veterinária Exemplo Ltda",
    category: "Clínica Veterinária",
    phone: "(11) 99999-0000",
    address: "Rua Exemplo, 100 - Cidade Exemplo - SP",
    instagram: null,
    websiteUrl: null,
    googleMapsUrl: null,
    photoUrls: [],
    stockPhoto: {
      url: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg",
      photographer: "Pessoa Fotógrafa",
      photographerUrl: "https://www.pexels.com/@pessoa",
      pexelsUrl: "https://www.pexels.com/photo/1",
    },
    rating: 4.8,
    reviewCount: 32,
    ...overrides,
  };
}

describe("renderização do template petshop", () => {
  it("aplica fatos e briefing sem conservar dados fictícios ou tokens", async () => {
    const result = await renderSiteTemplate(input(), brief);
    const html = result.files.find((file) => file.path === "index.html")?.content.toString() ?? "";
    const script = result.files.find((file) => file.path === "script.js")?.content.toString() ?? "";

    expect(result.templateId).toBe("petshop-01");
    expect(html).toContain("Empresa Veterinária Exemplo Ltda");
    expect(html).toContain("5511999990000");
    expect(html).toContain("32 avaliações");
    expect(html).toContain("Pessoa Fotógrafa");
    expect(html).toContain("A empresa Empresa Veterinária Exemplo Ltda está cadastrada como Clínica Veterinária");
    expect(html).not.toContain("atendimento emergencial e preventivo");
    expect(`${html}${script}`).not.toMatch(/\{\{[a-z0-9_]+\}\}/i);
    expect(html).not.toMatch(/Patinhas|Maria Silva|5000 pets|10 anos|gptmaker/i);
  });

  it("remove prova social e galeria quando faltam fatos reais", async () => {
    const result = await renderSiteTemplate(input({ rating: null, reviewCount: null, photoUrls: [] }), brief);
    const html = result.files[0].content.toString();
    expect(html).not.toContain("rating-summary");
    expect(html).not.toContain('<div class="galeria">');
  });

  it("aborta quando telefone ou endereço obrigatório está ausente", async () => {
    await expect(renderSiteTemplate(input({ phone: null }), brief)).rejects.toThrow(SiteTemplateError);
  });
});
