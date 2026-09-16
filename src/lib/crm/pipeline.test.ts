import { describe, expect, it } from "vitest";
import {
  PIPELINE_COLUMNS,
  columnForStatus,
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
});
