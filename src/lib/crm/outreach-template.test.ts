import { describe, expect, it } from "vitest";
import { buildOutreachMessage, isOutreachSiteReady, resolveNicheTemplateId } from "./outreach-template";
import { buildWhatsAppDeepLink, normalizeBrazilWhatsAppDigits } from "./whatsapp-phone";

const baseLead = {
  company_name: "Barbearia Norte",
  niche: "Barbearia",
  city: "Campinas",
  slug: "barbearia-norte-abc12345",
  phone: "(19) 98888-7766",
  site_status: "published" as const,
};

describe("normalizeBrazilWhatsAppDigits", () => {
  it("retorna null para vazio ou inválido", () => {
    expect(normalizeBrazilWhatsAppDigits(null)).toBeNull();
    expect(normalizeBrazilWhatsAppDigits("")).toBeNull();
    expect(normalizeBrazilWhatsAppDigits("123456789")).toBeNull();
    expect(normalizeBrazilWhatsAppDigits("abc")).toBeNull();
  });

  it("normaliza 10 e 11 dígitos com DDI 55", () => {
    expect(normalizeBrazilWhatsAppDigits("(19) 3481-2861")).toBe("551934812861");
    expect(normalizeBrazilWhatsAppDigits("(19) 98888-7766")).toBe("5519988887766");
  });

  it("mantém número já com 55", () => {
    expect(normalizeBrazilWhatsAppDigits("5519988887766")).toBe("5519988887766");
  });
});

describe("buildWhatsAppDeepLink", () => {
  it("codifica texto na query", () => {
    const link = buildWhatsAppDeepLink("5519988887766", "Olá, teste");
    expect(link).toBe("https://wa.me/5519988887766?text=Ol%C3%A1%2C%20teste");
  });
});

describe("buildOutreachMessage", () => {
  it("inclui URL absoluta do demo quando publicado", () => {
    const result = buildOutreachMessage(baseLead, { siteOrigin: "https://exemplo.app" });
    expect(result.siteReady).toBe(true);
    expect(result.publicSiteUrl).toBe("https://exemplo.app/empresa/barbearia-norte-abc12345");
    expect(result.text).toContain("https://exemplo.app/empresa/barbearia-norte-abc12345");
    expect(result.whatsappDigits).toBe("5519988887766");
  });

  it("não inclui link quando site não está publicado", () => {
    const result = buildOutreachMessage(
      { ...baseLead, site_status: "ready" },
      { siteOrigin: "https://exemplo.app/" },
    );
    expect(result.siteReady).toBe(false);
    expect(result.publicSiteUrl).toBeNull();
    expect(result.text).not.toContain("/empresa/");
    expect(result.text).not.toContain("https://");
  });

  it("usa nome do contato na saudação quando informado", () => {
    const result = buildOutreachMessage({ ...baseLead, contactName: "Marina Silva" });
    expect(result.text.startsWith("Olá, Marina!")).toBe(true);
  });

  it("escolhe template por nicho", () => {
    expect(resolveNicheTemplateId("Clínica odontológica")).toBe("saude");
    expect(resolveNicheTemplateId("Pet shop")).toBe("pet");
    expect(resolveNicheTemplateId("Desconhecido")).toBe("default");
  });
});

describe("isOutreachSiteReady", () => {
  it("só libera com published", () => {
    expect(isOutreachSiteReady("published")).toBe(true);
    expect(isOutreachSiteReady("ready")).toBe(false);
    expect(isOutreachSiteReady("not_generated")).toBe(false);
  });
});
