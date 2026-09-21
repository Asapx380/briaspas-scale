import { describe, expect, it } from "vitest";
import {
  formatSiteUpdatedLabel,
  mapSiteStatusLabel,
  sanitizeGallerySearchQuery,
  siteGalleryEffectiveUpdatedAt,
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
  const now = new Date("2026-09-21T12:00:00.000Z");

  function isoSecondsAgo(seconds: number) {
    return new Date(now.getTime() - seconds * 1000).toISOString();
  }

  it("usa numeric always e prefixo Atualizado há", () => {
    expect(formatSiteUpdatedLabel(isoSecondsAgo(30), now)).toBe("Atualizado há 30 segundos");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(5 * 60), now)).toBe("Atualizado há 5 minutos");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(3600), now)).toBe("Atualizado há 1 hora");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(86400), now)).toBe("Atualizado há 1 dia");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(2 * 86400), now)).toBe("Atualizado há 2 dias");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(40 * 86400), now)).toBe("Atualizado há 40 dias");
    expect(formatSiteUpdatedLabel(isoSecondsAgo(365 * 86400), now)).toBe("Atualizado há 1 ano");
  });

  it("não usa rótulos vagos como ontem ou mês passado", () => {
    const label = formatSiteUpdatedLabel(isoSecondsAgo(86400), now);
    expect(label.toLowerCase()).not.toContain("ontem");
    expect(label.toLowerCase()).not.toContain("mês passado");
    expect(label.toLowerCase()).not.toContain("ano passado");
  });

  it("trata data no futuro como agora", () => {
    const future = new Date(now.getTime() + 60_000).toISOString();
    expect(formatSiteUpdatedLabel(future, now)).toBe("Atualizado agora");
  });

  it("trata ausência de data", () => {
    expect(formatSiteUpdatedLabel(null, now)).toBe("Atualizado recentemente");
  });
});

describe("siteGalleryEffectiveUpdatedAt", () => {
  it("usa updated_at para ZIP e site_generated_at para geração", () => {
    expect(
      siteGalleryEffectiveUpdatedAt({
        site_source: "uploaded",
        updated_at: "2026-09-01T10:00:00.000Z",
        site_generated_at: "2026-09-10T10:00:00.000Z",
      }),
    ).toBe("2026-09-01T10:00:00.000Z");
    expect(
      siteGalleryEffectiveUpdatedAt({
        site_source: "generated",
        updated_at: "2026-09-01T10:00:00.000Z",
        site_generated_at: "2026-09-10T10:00:00.000Z",
      }),
    ).toBe("2026-09-10T10:00:00.000Z");
  });
});
