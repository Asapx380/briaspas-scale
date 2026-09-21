import { describe, expect, it } from "vitest";
import {
  buildLeadMapEmbedUrl,
  buildLeadSitePrompt,
  buildLeadWhatsAppUrl,
} from "./build-generation-prompt";

describe("dados determinísticos do site", () => {
  it("normaliza o telefone brasileiro sem trocar dígitos", () => {
    expect(buildLeadWhatsAppUrl("(19) 3481-2861")).toBe(
      "https://wa.me/551934812861?text=Ol%C3%A1%2C%20vi%20o%20site%20e%20quero%20saber%20mais.",
    );
  });

  it("codifica o endereço no mapa sem chave de API", () => {
    expect(buildLeadMapEmbedUrl("São Pedro, SP")).toBe(
      "https://www.google.com/maps?q=S%C3%A3o%20Pedro%2C%20SP&output=embed",
    );
  });

  it("marca campos ausentes como nulos no prompt", () => {
    const prompt = buildLeadSitePrompt({
      companyName: "Empresa teste",
      category: "clínica",
      phone: null,
      address: null,
      instagram: null,
      websiteUrl: null,
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: null,
      rating: null,
      reviewCount: null,
    });

    expect(prompt).toContain('"fotos_reais": []');
    expect(prompt).toContain('"foto_de_banco": null');
    expect(prompt).toContain('"avaliacao": null');
    expect(prompt).toContain('"whatsapp_url": null');
  });

  it("inclui foto Pexels como banco, sem chamá-la de foto real", () => {
    const prompt = buildLeadSitePrompt({
      companyName: "Clínica teste",
      category: "clínica odontológica",
      phone: null,
      address: null,
      instagram: null,
      websiteUrl: null,
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: {
        url: "https://images.pexels.com/photos/1/pexels-photo.jpeg",
        photographer: "Pessoa Teste",
        photographerUrl: "https://www.pexels.com/@pessoa-teste",
        pexelsUrl: "https://www.pexels.com/photo/teste-1/",
      },
      rating: null,
      reviewCount: null,
    });

    expect(prompt).toContain('"fotos_reais": []');
    expect(prompt).toContain('"foto_de_banco"');
    expect(prompt).toContain("não é foto do estabelecimento");
    expect(prompt).toContain("crédito pequeno e visível");
  });

  it("exige marcadores data-site-section no prompt de HTML", () => {
    const prompt = buildLeadSitePrompt({
      companyName: "Empresa demonstrativa",
      category: "petshop",
      phone: "(11) 90000-0000",
      address: null,
      instagram: null,
      websiteUrl: null,
      googleMapsUrl: null,
      photoUrls: [],
      stockPhoto: null,
      rating: null,
      reviewCount: null,
    });

    expect(prompt).toContain("data-site-section");
    expect(prompt).toContain('data-site-section="hero"');
    expect(prompt).toContain('data-site-section="services"');
    expect(prompt).toContain('data-site-section="contact"');
    expect(prompt).toContain("Open Graph");
    expect(prompt).toContain("JSON-LD LocalBusiness");
  });
});
