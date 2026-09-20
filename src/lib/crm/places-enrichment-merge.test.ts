import { describe, expect, it } from "vitest";
import { buildPlacesEnrichmentPatch, buildPlacesLookupQuery } from "./places-enrichment";
import type { DiscoveredLead } from "@/lib/google-places/types";

const discovered: DiscoveredLead = {
  source: "google_places",
  sourceId: "places/ChIJtest",
  companyName: "Barbearia Demo",
  phone: "+55 11 99999-0000",
  internationalPhone: null,
  email: null,
  address: "Rua Demo, 100",
  category: "Barbearia",
  rating: 4.6,
  reviewCount: 42,
  websiteUrl: "https://example.com",
  googleMapsUrl: "https://maps.google.com/?cid=1",
  instagram: null,
  facebookId: null,
  twitter: null,
  latitude: null,
  longitude: null,
  businessStatus: "OPERATIONAL",
  photos: [],
};

describe("buildPlacesLookupQuery", () => {
  it("inclui cidade e Brasil", () => {
    expect(buildPlacesLookupQuery("Acme", "São Paulo")).toBe("Acme São Paulo, Brasil");
  });
});

describe("buildPlacesEnrichmentPatch", () => {
  it("preenche apenas campos vazios", () => {
    const patch = buildPlacesEnrichmentPatch(
      {
        phone: null,
        address: "Endereço já salvo",
        niche: null,
        website_url: null,
        google_maps_url: null,
        rating: null,
        review_count: null,
      },
      discovered,
    );

    expect(patch).toMatchObject({
      phone: discovered.phone,
      niche: discovered.category,
      website_url: discovered.websiteUrl,
      google_maps_url: discovered.googleMapsUrl,
      rating: 4.6,
      review_count: 42,
      google_place_id: discovered.sourceId,
    });
    expect(patch?.address).toBeUndefined();
  });

  it("retorna null quando nada a preencher", () => {
    const patch = buildPlacesEnrichmentPatch(
      {
        phone: discovered.phone,
        address: discovered.address,
        niche: "Barbearia",
        website_url: discovered.websiteUrl,
        google_maps_url: discovered.googleMapsUrl,
        rating: 4.6,
        review_count: 42,
      },
      discovered,
    );
    expect(patch).toBeNull();
  });
});
