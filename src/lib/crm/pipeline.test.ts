import { describe, expect, it } from "vitest";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  commercialPotentialBand,
  commercialPotentialClassLabel,
  isWeakDigitalPresenceUrl,
  leadScore,
  leadTier,
  matchesFilter,
  siteOpportunityPoints,
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
  > => ({
    rating: null,
    review_count: null,
    phone: null,
    website_url: null,
    site_status: "not_generated",
    status: "new",
    email: null,
    google_maps_url: null,
  });

  it("lead sem site e sem outros dados é potencial alto", () => {
    const score = leadScore(minimalLead());
    expect(score).toBeGreaterThanOrEqual(70);
    expect(leadTier(score)).toBe("quente");
    expect(commercialPotentialBand(score)).toBe("high");
    expect(siteOpportunityPoints(minimalLead())).toBe(65);
  });

  it("Linktree e Instagram são presença digital fraca (médio)", () => {
    expect(isWeakDigitalPresenceUrl("https://linktr.ee/empresa")).toBe(true);
    expect(isWeakDigitalPresenceUrl("https://www.instagram.com/empresa")).toBe(true);
    const linktreeScore = leadScore({ ...minimalLead(), website_url: "https://linktr.ee/empresa" });
    const instaScore = leadScore({
      ...minimalLead(),
      website_url: "https://instagram.com/empresa",
    });
    expect(siteOpportunityPoints({ website_url: "https://linktr.ee/x", site_status: "not_generated" })).toBe(
      50,
    );
    expect(linktreeScore).toBeGreaterThanOrEqual(45);
    expect(linktreeScore).toBeLessThan(70);
    expect(instaScore).toBeGreaterThanOrEqual(45);
    expect(instaScore).toBeLessThan(70);
  });

  it("site próprio não é classificado como Linktree", () => {
    const url = "https://minhaempresa.com.br";
    expect(isWeakDigitalPresenceUrl(url)).toBe(false);
    expect(siteOpportunityPoints({ website_url: url, site_status: "not_generated" })).toBe(0);
    const score = leadScore({ ...minimalLead(), website_url: url });
    expect(score).toBeLessThan(70);
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
