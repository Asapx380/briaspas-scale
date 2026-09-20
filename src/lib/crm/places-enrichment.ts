import type { DiscoveredLead } from "@/lib/google-places/types";

export type LeadPlacesEnrichmentInput = {
  phone: string | null;
  address: string | null;
  niche: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  rating: number | null;
  review_count: number | null;
};

export type LeadPlacesEnrichmentPatch = {
  phone?: string;
  address?: string;
  niche?: string;
  website_url?: string;
  google_maps_url?: string;
  rating?: number;
  review_count?: number;
  google_place_id?: string;
  source?: "google_places";
  source_ref?: string;
};

function isBlank(value: string | null | undefined) {
  return value == null || value.trim() === "";
}

export function buildPlacesEnrichmentPatch(
  lead: LeadPlacesEnrichmentInput,
  discovered: DiscoveredLead,
): LeadPlacesEnrichmentPatch | null {
  const patch: LeadPlacesEnrichmentPatch = {};

  if (isBlank(lead.phone) && discovered.phone) patch.phone = discovered.phone.trim();
  if (isBlank(lead.address) && discovered.address) patch.address = discovered.address.trim();
  if (isBlank(lead.niche) && discovered.category) patch.niche = discovered.category.trim();
  if (isBlank(lead.website_url) && discovered.websiteUrl) {
    patch.website_url = discovered.websiteUrl.trim();
  }
  if (isBlank(lead.google_maps_url) && discovered.googleMapsUrl) {
    patch.google_maps_url = discovered.googleMapsUrl.trim();
  }
  if (lead.rating == null && discovered.rating != null) patch.rating = discovered.rating;
  if (lead.review_count == null && discovered.reviewCount != null) {
    patch.review_count = discovered.reviewCount;
  }

  if (discovered.sourceId) {
    patch.google_place_id = discovered.sourceId;
    patch.source = "google_places";
    patch.source_ref = discovered.sourceId;
  }

  const { google_place_id: _ignored, source: _s, source_ref: _r, ...visible } = patch;
  if (Object.keys(visible).length === 0) return null;

  return patch;
}

export function buildPlacesLookupQuery(companyName: string, city: string | null) {
  const cityPart = city?.trim() ? ` ${city.trim()}` : "";
  return `${companyName.trim()}${cityPart}, Brasil`.trim();
}
