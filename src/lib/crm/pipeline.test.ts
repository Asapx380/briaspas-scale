import { describe, expect, it } from "vitest";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  commercialPotentialBand,
  commercialPotentialClassLabel,
  classifySiteOpportunity,
  isWeakDigitalPresenceUrl,
  leadScore,
  leadTier,
  matchesFilter,
  siteOpportunityBaseScore,
} from "./pipeline";
import type { CrmLead } from "./types";
import { CRM_DEMO_LEADS } from "./fixtures";

describe("crm pipeline", () => {
  it("mapeia todos os status para exatamente uma coluna", () => {
    const statuses = ["new", "contacted", "replied", "hot", "proposal", "won", "lost"] as const;
    for (const status of statuses) {
      const column = columnForStatus(status);
      expect(column.statuses).toContain(status);
    }
    const covered = new Set(PIPELINE_COLUMNS.flatMap((column) => column.statuses));
    expect(covered.size).toBe(7);
  });

  it("calcula score e tier para fixtures", () => {
    const berg = CRM_DEMO_LEADS[0];
    const score = leadScore(berg);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(leadTier(score)).toBe("quente");
    expect(matchesFilter(berg, "no_site")).toBe(true);
    expect(matchesFilter(berg, "with_phone")).toBe(true);
  });

  const minimalLead = (): Pick<
    CrmLead,
    | "rating"
    | "review_count"
    | "phone"
    | "website_url"
    | "site_status"
    | "status"
    | "email"
    | "google_maps_url"
    | "ai_diagnosis"
    | "address"
  > => ({
    rating: null,
    review_count: null,
    phone: null,
    website_url: null,
    site_status: "not_generated",
    status: "new",
    email: null,
    google_maps_url: null,
    ai_diagnosis: null,
    address: null,
  });

  const completeSiteDiagnosis: CrmLead["ai_diagnosis"] = {
    resumo: "Site com páginas relevantes e estrutura comercial.",
    dorPrincipal: "Manutenção",
    sinaisObservados: [
      "páginas relevantes",
      "serviços claros",
      "cta no hero",
      "whatsapp visível",
      "endereço no rodapé",
      "layout responsivo",
    ],
    oportunidades: ["estrutura comercial completa"],
  };

  it("sem site próprio = 100 e faixa alta (verde)", () => {
    const score = leadScore(minimalLead());
    expect(score).toBe(100);
    expect(commercialPotentialBand(score)).toBe("high");
    expect(classifySiteOpportunity(minimalLead())).toBe("no_own_site");
    expect(siteOpportunityBaseScore(minimalLead())).toBe(100);
  });

  it("Linktree = 90 e faixa alta (verde)", () => {
    const lead = { ...minimalLead(), website_url: "https://linktr.ee/empresa" };
    expect(isWeakDigitalPresenceUrl(lead.website_url)).toBe(true);
    expect(classifySiteOpportunity(lead)).toBe("weak_social");
    expect(leadScore(lead)).toBe(90);
    expect(commercialPotentialBand(leadScore(lead))).toBe("high");
  });

  it("Instagram e Facebook = 90 e faixa alta (verde)", () => {
    const instagram = leadScore({
      ...minimalLead(),
      website_url: "https://instagram.com/empresa",
    });
    const facebook = leadScore({
      ...minimalLead(),
      website_url: "https://www.facebook.com/empresa",
    });
    expect(instagram).toBe(90);
    expect(facebook).toBe(90);
    expect(commercialPotentialBand(instagram)).toBe("high");
  });

  it("site básico ou com falha = 75+ e faixa alta (verde)", () => {
    const failed = leadScore({ ...minimalLead(), site_status: "failed" });
    const basic = leadScore({
      ...minimalLead(),
      website_url: "https://empresa-basica.example",
      ai_diagnosis: {
        resumo: "Presença digital limitada",
        dorPrincipal: "Site básico sem estrutura",
        sinaisObservados: ["página única", "sem cta", "sem whatsapp"],
      },
    });
    expect(failed).toBeGreaterThanOrEqual(75);
    expect(basic).toBeGreaterThanOrEqual(75);
    expect(commercialPotentialBand(failed)).toBe("high");
    expect(commercialPotentialBand(basic)).toBe("high");
  });

  it("site completo com evidência = 10–35 e faixa baixa (vermelho)", () => {
    const score = leadScore({
      ...minimalLead(),
      website_url: "https://clinica-completa.com.br",
      ai_diagnosis: completeSiteDiagnosis,
    });
    expect(score).toBeGreaterThanOrEqual(10);
    expect(score).toBeLessThanOrEqual(35);
    expect(commercialPotentialBand(score)).toBe("low");
    expect(classifySiteOpportunity({
      ...minimalLead(),
      website_url: "https://clinica-completa.com.br",
      ai_diagnosis: completeSiteDiagnosis,
    })).toBe("complete_own");
  });

  it("domínio próprio sem análise = 70 e faixa alta (verde)", () => {
    const url = "https://minhaempresa.com.br";
    expect(isWeakDigitalPresenceUrl(url)).toBe(false);
    const lead = { ...minimalLead(), website_url: url };
    expect(classifySiteOpportunity(lead)).toBe("unanalyzed_own");
    expect(leadScore(lead)).toBe(70);
    expect(commercialPotentialBand(leadScore(lead))).toBe("high");
  });

  it("complementos não reduzem lead sem site para amarelo ou vermelho", () => {
    const score = leadScore({
      ...minimalLead(),
      phone: null,
      email: null,
      google_maps_url: null,
      rating: 2,
      review_count: 1,
      status: "lost",
    });
    expect(score).toBe(100);
    expect(commercialPotentialBand(score)).toBe("high");
  });

  it("mapeia faixas de potencial comercial nos limites", () => {
    expect(commercialPotentialBand(0)).toBe("low");
    expect(commercialPotentialBand(44)).toBe("low");
    expect(commercialPotentialBand(45)).toBe("medium");
    expect(commercialPotentialBand(69)).toBe("medium");
    expect(commercialPotentialBand(70)).toBe("high");
    expect(commercialPotentialBand(100)).toBe("high");
    expect(commercialPotentialClassLabel("low")).toBe("Baixo");
    expect(commercialPotentialClassLabel("medium")).toBe("Médio");
    expect(commercialPotentialClassLabel("high")).toBe("Alto");
  });
});
