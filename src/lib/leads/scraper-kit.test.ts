import { describe, expect, it } from "vitest";
import { looksLikeScraperKitRow, normalizeScraperKitRow } from "./scraper-kit";

describe("scraper-kit normalizer", () => {
  it("maps lean kit rows to import leads", () => {
    const row = {
      title: "Barbearia Central",
      phone: "(86) 99999-1111",
      emails: "contato@barbearia.com",
      website: "barbearia.com.br",
      category: "Barbearia",
      address: "Rua A, 10, Centro, Teresina, PI",
      review_rating: "4.7",
      review_count: "88",
    };

    expect(looksLikeScraperKitRow(row)).toBe(true);
    const lead = normalizeScraperKitRow(row);
    expect(lead?.companyName).toBe("Barbearia Central");
    expect(lead?.niche).toBe("Barbearia");
    expect(lead?.city).toBe("Teresina");
    expect(lead?.email).toBe("contato@barbearia.com");
    expect(lead?.websiteUrl).toContain("https://");
    expect(lead?.rating).toBe(4.7);
    expect(lead?.reviewCount).toBe(88);
  });

  it("uses defaults when city/category missing", () => {
    const lead = normalizeScraperKitRow(
      { title: "Clínica Sol", phone: "86999990000", address: "Av. Brasil 100" },
      { city: "Teresina, PI", niche: "Clínica" },
    );
    expect(lead?.city).toBe("Teresina, PI");
    expect(lead?.niche).toBe("Clínica");
  });
});
