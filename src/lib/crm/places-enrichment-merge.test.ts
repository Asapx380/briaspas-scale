import { describe, expect, it } from "vitest";
import { buildPlacesLookupQuery } from "./places-enrichment";

describe("buildPlacesLookupQuery", () => {
  it("inclui cidade e Brasil", () => {
    expect(buildPlacesLookupQuery("Acme", "São Paulo")).toBe("Acme São Paulo, Brasil");
  });
});
