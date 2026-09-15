import { describe, expect, it } from "vitest";
import { listSiteTemplateManifests, selectSiteTemplateManifest } from "./template-catalog";

describe("catálogo de templates", () => {
  it("seleciona petshop para categorias veterinárias com ou sem acento", () => {
    expect(selectSiteTemplateManifest("Clínica Veterinária 24 horas")?.id).toBe("petshop-01");
    expect(selectSiteTemplateManifest("pet shop")?.id).toBe("petshop-01");
  });

  it("cataloga e seleciona os 15 nichos", () => {
    const manifests = listSiteTemplateManifests();
    expect(manifests).toHaveLength(15);
    for (const manifest of manifests) {
      expect(selectSiteTemplateManifest(manifest.categories[0])?.id).toBe(manifest.id);
    }
  });

  it("não força um modelo incompatível", () => {
    expect(selectSiteTemplateManifest("laboratório de oceanografia")).toBeNull();
  });
});
