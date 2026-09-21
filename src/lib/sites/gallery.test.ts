import { describe, expect, it } from "vitest";
import {
  formatSiteUpdatedLabel,
  mapSiteStatusLabel,
  sanitizeGallerySearchQuery,
} from "./gallery";

describe("mapSiteStatusLabel", () => {
  it("mapeia status conhecidos para rótulos em português", () => {
    expect(mapSiteStatusLabel("ready")).toBe("Rascunho");
    expect(mapSiteStatusLabel("published")).toBe("Publicado");
    expect(mapSiteStatusLabel("generating")).toBe("Gerando");
    expect(mapSiteStatusLabel("failed")).toBe("Falhou");
  });
});

describe("sanitizeGallerySearchQuery", () => {
  it("limita tamanho e neutraliza curingas e pontuação do filtro", () => {
    const long = "a".repeat(120);
    expect(sanitizeGallerySearchQuery(long)).toHaveLength(80);
    expect(sanitizeGallerySearchQuery("  Café%_test, (x)  ")).toBe("Café\\%\\_test x");
  });
});

describe("formatSiteUpdatedLabel", () => {
  it("usa Atualizado e RelativeTimeFormat em pt-BR", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");
    const twoDaysAgo = "2026-09-19T12:00:00.000Z";
    const label = formatSiteUpdatedLabel(twoDaysAgo, now);
    expect(label).toMatch(/^Atualizado /);
    expect(label.toLowerCase()).not.toContain("editado");
  });

  it("trata ausência de data", () => {
    expect(formatSiteUpdatedLabel(null)).toBe("Atualizado recentemente");
  });
});
