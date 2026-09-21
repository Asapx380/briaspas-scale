import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type GeneratedSiteLeadFacts,
  mentionsInventedBusinessHours,
  validateGeneratedSiteContent,
} from "./generated-site-validation";

const fixturesDir = join(__dirname, "fixtures", "generated-site-validation");

const sampleLead: GeneratedSiteLeadFacts = {
  companyName: "Petshop Amigo",
  category: "petshop",
  phone: "(11) 91234-5678",
  address: null,
  instagram: null,
  websiteUrl: null,
  googleMapsUrl: null,
  photoUrls: [],
  stockPhoto: null,
  rating: null,
  reviewCount: null,
};

const leadWithAddress: GeneratedSiteLeadFacts = {
  ...sampleLead,
  address: "Rua das Flores, 120, São Paulo, SP",
};

const leadWithSocialProof: GeneratedSiteLeadFacts = {
  ...sampleLead,
  rating: 4.8,
  reviewCount: 127,
};

const leadWithGallery: GeneratedSiteLeadFacts = {
  ...sampleLead,
  photoUrls: ["https://images.example.com/pet.jpg"],
};

function readFixture(name: string) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

function expectSingleError(html: string, lead: GeneratedSiteLeadFacts, fragment: string) {
  const errors = validateGeneratedSiteContent(html, lead);
  expect(errors.some((error) => error.includes(fragment))).toBe(true);
}

describe("validateGeneratedSiteContent", () => {
  it("aceita HTML válido de fixture", () => {
    const html = readFixture("valid-minimal.html");
    expect(validateGeneratedSiteContent(html, sampleLead)).toEqual([]);
  });

  it("exige header semântico", () => {
    const html = readFixture("valid-minimal.html").replace("<header>", "<div data-header>");
    expectSingleError(html, sampleLead, "<header>");
  });

  it("exige seção hero", () => {
    const html = readFixture("valid-minimal.html").replace(
      '<section data-site-section="hero">',
      '<section data-site-section="intro">',
    );
    expectSingleError(html, sampleLead, '"hero"');
  });

  it("exige seção services", () => {
    const html = readFixture("valid-minimal.html").replace(
      '<section data-site-section="services">',
      "",
    );
    expectSingleError(html, sampleLead, '"services"');
  });

  it("exige seção contact", () => {
    const html = readFixture("valid-minimal.html").replace(
      '<section data-site-section="contact">',
      "",
    );
    expectSingleError(html, sampleLead, '"contact"');
  });

  it("exige footer semântico", () => {
    const html = readFixture("valid-minimal.html").replace("<footer>", "<div>");
    expectSingleError(html, sampleLead, "<footer>");
  });

  it("exige um único h1", () => {
    const html = readFixture("valid-minimal.html").replace(
      "<h1>",
      "<h1>Primeiro</h1><h1>",
    );
    expectSingleError(html, sampleLead, "um <h1>");
  });

  it("rejeita lorem ipsum", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Atendimento de petshop",
      "Lorem ipsum banho",
    );
    expectSingleError(html, sampleLead, "lorem");
  });

  it("rejeita chaves de template", () => {
    const html = readFixture("valid-minimal.html").replace("Petshop Amigo", "{{ nome }}");
    expectSingleError(html, sampleLead, "{{");
  });

  it("rejeita marcador TODO", () => {
    const html = readFixture("valid-minimal.html").replace("Contato", "Contato TODO");
    expectSingleError(html, sampleLead, "TODO");
  });

  it("rejeita prova social sem avaliação no lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="social-proof"><p>Mais de cem avaliações</p></section></main>',
    );
    expectSingleError(html, sampleLead, "social-proof");
  });

  it("aceita prova social quando o lead tem nota e quantidade", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="social-proof"><p>Nota 4,8 com 127 avaliações</p></section></main>',
    );
    expect(validateGeneratedSiteContent(html, leadWithSocialProof)).toEqual([]);
  });

  it("rejeita galeria sem fotos reais no lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="gallery"><img src="https://images.example.com/pet.jpg" alt="Pet"></section></main>',
    );
    expectSingleError(html, sampleLead, "gallery");
  });

  it("aceita galeria com foto real do lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="gallery"><img src="https://images.example.com/pet.jpg" alt="Pet"></section></main>',
    );
    expect(validateGeneratedSiteContent(html, leadWithGallery)).toEqual([]);
  });

  it("rejeita localização sem endereço no lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="location"><p>Rua das Flores</p></section></main>',
    );
    expectSingleError(html, sampleLead, "location");
  });

  it("rejeita mapa com URL diferente do endereço", () => {
    const map = "https://www.google.com/maps?q=Outro%20Lugar&output=embed";
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      `<section data-site-section="location"><iframe src="${map}" title="Mapa"></iframe></section></main>`,
    );
    expectSingleError(html, leadWithAddress, "mapa");
  });

  it("aceita mapa coerente com o endereço", () => {
    const map = "https://www.google.com/maps?q=Rua%20das%20Flores%2C%20120%2C%20S%C3%A3o%20Paulo%2C%20SP&output=embed";
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      `<section data-site-section="location"><iframe src="${map}" title="Mapa"></iframe></section></main>`,
    );
    expect(validateGeneratedSiteContent(html, leadWithAddress)).toEqual([]);
  });

  it("rejeita wa.me sem telefone no lead", () => {
    const html = readFixture("valid-minimal.html");
    const leadWithoutPhone = { ...sampleLead, phone: null };
    expectSingleError(html, leadWithoutPhone, "wa.me");
  });

  it("rejeita wa.me incorreto", () => {
    const html = readFixture("valid-minimal.html").replaceAll("5511912345678", "5511999999999");
    expectSingleError(html, sampleLead, "wa.me");
  });

  it("rejeita números que não vêm do lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Atendimento de petshop",
      "Mais de 500 clientes satisfeitos",
    );
    expectSingleError(html, sampleLead, "números");
  });

  it("rejeita horário de funcionamento inventado", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Fale conosco pelo WhatsApp.",
      "Atendemos de segunda a sexta das 09:00 às 18:00.",
    );
    expectSingleError(html, sampleLead, "horário");
  });

  it("aceita CTA de agendamento com a palavra horário", () => {
    expect(mentionsInventedBusinessHours("Agende seu horário pelo WhatsApp.")).toBe(false);
    expect(mentionsInventedBusinessHours("Escolha um horário para falar conosco.")).toBe(false);
    const html = readFixture("valid-minimal.html").replace(
      "Fale conosco pelo WhatsApp.",
      "Agende seu horário pelo WhatsApp.",
    );
    expect(validateGeneratedSiteContent(html, sampleLead)).toEqual([]);
  });

  it("continua bloqueando faixas de horário explícitas", () => {
    expect(mentionsInventedBusinessHours("Funcionamos das 8h às 18h.")).toBe(true);
    expect(mentionsInventedBusinessHours("Aberto de 08:00 às 18:00.")).toBe(true);
  });

  it("rejeita depoimentos em blockquote", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      "<blockquote>Ótimo atendimento!</blockquote></main>",
    );
    expectSingleError(html, sampleLead, "depoimento");
  });

  it("rejeita seção testimonials", () => {
    const html = readFixture("valid-minimal.html").replace(
      "</main>",
      '<section data-site-section="testimonials"><p>Cliente feliz</p></section></main>',
    );
    expectSingleError(html, sampleLead, "testimonials");
  });

  it("rejeita catálogo de serviços que o lead não possui", () => {
    const html = readFixture("valid-minimal.html").replace(
      "<p>Atendimento de petshop. Fale pelo WhatsApp para confirmar disponibilidade.</p>",
      "<ul><li>Clareamento Dental</li><li>Implantes</li><li>Ortodontia Invisível</li><li>Limpeza</li><li>Facetas</li></ul>",
    );
    expectSingleError(html, sampleLead, "serviços específicos");
  });

  it("rejeita formas de pagamento inventadas", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Fale conosco pelo WhatsApp.",
      "Aceitamos Pix, boleto e cartão de crédito.",
    );
    expectSingleError(html, sampleLead, "pagamento");
  });

  it("rejeita promessas de resultado e tecnologia", () => {
    const html = readFixture("valid-minimal.html").replace(
      "<h1>Cuidado com carinho para seu pet</h1>",
      "<h1>Garantimos sorriso perfeito com tecnologia de ponta</h1>",
    );
    expectSingleError(html, sampleLead, "promessas de resultado");
  });

  it("rejeita diferenciais factuais sem fonte no lead", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Atendimento de petshop",
      "Nossa equipe especializada oferece atendimento humanizado",
    );
    expectSingleError(html, sampleLead, "diferenciais factuais");
  });

  it("rejeita FAQ com pagamentos, preços ou tratamentos", () => {
    const html = readFixture("valid-minimal.html").replace(
      "Como confirmo a disponibilidade?",
      "Vocês aceitam Pix e fazem clareamento?",
    );
    expectSingleError(html, sampleLead, "FAQ");
  });

  it("rejeita hero com texto sem contraste AA no gradiente", () => {
    const html = readFixture("valid-minimal.html").replace(
      "[data-site-section=\"hero\"] {\n        background: #0f3d3e;\n        color: #f4fbfb;\n      }",
      "[data-site-section=\"hero\"] {\n        background: linear-gradient(#ffffff, #f2f2f2);\n        color: #f7f7f7;\n      }",
    );
    expectSingleError(html, sampleLead, "contraste AA");
  });
});
