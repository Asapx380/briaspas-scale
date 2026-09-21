import { describe, expect, it } from "vitest";
import { SITE_GENERATION_SAMPLES } from "./site-generation-sample-leads";

describe("SITE_GENERATION_SAMPLES", () => {
  it("define cinco nichos fictícios com rótulo demonstrativo", () => {
    expect(SITE_GENERATION_SAMPLES).toHaveLength(5);
    const labels = SITE_GENERATION_SAMPLES.map((sample) => sample.nicheLabel);
    expect(labels).toEqual([
      "petshop",
      "odontologia",
      "salão de beleza",
      "oficina mecânica",
      "advocacia",
    ]);
    for (const sample of SITE_GENERATION_SAMPLES) {
      expect(sample.lead.companyName).toContain("Dados demonstrativos");
    }
  });
});
