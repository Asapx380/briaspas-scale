import { describe, expect, it } from "vitest";
import {
  collectInventedContentIssues,
  faqHasUnverifiedClaims,
  findInventedServiceCatalog,
  mentionsInventedDifferentials,
  mentionsInventedPayments,
  mentionsResultOrQualityPromise,
} from "./generated-site-content-claims";
import type { LeadSiteInput } from "./build-generation-prompt";

const lead: LeadSiteInput = {
  companyName: "Clínica Sorriso Norte — Dados demonstrativos",
  category: "consultório odontológico",
  phone: "(19) 99876-5432",
  address: "Av. Brasil, 900, Piracicaba, SP",
  instagram: null,
  websiteUrl: "https://example.com/clinica-sorriso-demo",
  googleMapsUrl: null,
  photoUrls: [],
  stockPhoto: null,
  rating: null,
  reviewCount: null,
};

describe("generated-site-content-claims", () => {
  it("detecta catálogo odontológico inventado", () => {
    const html = `<section data-site-section="services"><ul>
      <li>Clareamento Dental</li><li>Implantes</li><li>Ortodontia Invisível</li>
    </ul></section>`;
    expect(findInventedServiceCatalog(html, lead).length).toBeGreaterThanOrEqual(2);
  });

  it("detecta pagamentos, promessas e diferenciais", () => {
    expect(mentionsInventedPayments("Aceitamos Pix e cartão de crédito.")).toBe(true);
    expect(mentionsResultOrQualityPromise("Tecnologia de ponta para um sorriso perfeito.")).toBe(true);
    expect(mentionsInventedDifferentials("Nossa equipe especializada e atendimento humanizado.")).toBe(true);
  });

  it("detecta FAQ com tratamento ou pagamento", () => {
    const html = `<section data-site-section="faq"><h3>Vocês fazem clareamento?</h3><p>Sim.</p></section>`;
    expect(faqHasUnverifiedClaims(html)).toBe(true);
  });

  it("aceita FAQ operacional", () => {
    const html = `<section data-site-section="faq"><h3>Como confirmo a disponibilidade?</h3>
      <p>Fale pelo WhatsApp para confirmar disponibilidade.</p></section>`;
    expect(faqHasUnverifiedClaims(html)).toBe(false);
  });

  it("agrupa os códigos esperados", () => {
    const html = `<main>
      <section data-site-section="services"><ul><li>Clareamento Dental</li><li>Facetas</li></ul></section>
      <p>Aceitamos Pix. Garantimos resultados visíveis. Nossa equipe especializada atende com excelência.</p>
      <section data-site-section="faq"><h3>Qual o preço?</h3></section>
    </main>`;
    const codes = collectInventedContentIssues(html, lead).map((issue) => issue.code);
    expect(codes).toEqual(expect.arrayContaining([
      "content.invented_service_catalog",
      "content.invented_payments",
      "content.result_promise",
      "content.invented_differentials",
      "content.faq_unverified",
    ]));
  });
});
