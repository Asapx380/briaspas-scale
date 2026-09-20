import { describe, expect, it } from "vitest";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  commercialPotentialBand,
  commercialPotentialClassLabel,
  digitalOpportunityPoints,
  isThinDigitalPresence,
  leadScore,
  leadTier,
  matchesFilter,
} from "./pipeline";
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

  it("prioriza negócios sem site próprio como oportunidade alta", () => {
    const score = leadScore({
      ...CRM_DEMO_LEADS[0],
      website_url: null,
      site_status: "not_generated",
      phone: null,
      email: null,
      google_maps_url: null,
      rating: null,
      review_count: null,
      status: "new",
    });
    expect(digitalOpportunityPoints({ website_url: null, site_status: "not_generated" })).toBe(65);
    expect(score).toBeGreaterThanOrEqual(70);
    expect(commercialPotentialBand(score)).toBe("high");
  });

  it("prioriza páginas de links e redes sociais acima de um site próprio", () => {
    expect(isThinDigitalPresence("https://linktr.ee/clinica-exemplo")).toBe(true);
    expect(isThinDigitalPresence("https://www.instagram.com/clinica.exemplo")).toBe(true);
    expect(isThinDigitalPresence("https://www.clinicaexemplo.com.br")).toBe(false);
    expect(digitalOpportunityPoints({ website_url: "https://linktr.ee/clinica-exemplo", site_status: "not_generated" })).toBe(50);
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
