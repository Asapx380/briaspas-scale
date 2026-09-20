import { describe, expect, it } from "vitest";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
  commercialPotentialBand,
  commercialPotentialClassLabel,
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
