import { getFoursquareApiKey } from "@/lib/foursquare/env";
import { MAX_LEAD_SEARCH_LIMIT } from "@/lib/lead-sources/search-limits";
import type {
  DiscoveredLead,
  LeadSearchInput,
  LeadSearchResult,
} from "@/lib/lead-sources/types";

const SEARCH_URL = "https://places-api.foursquare.com/places/search";
const API_VERSION = "2025-06-17";
const FIELDS = [
  "fsq_place_id",
  "name",
  "categories",
  "location",
  "latitude",
  "longitude",
  "tel",
  "email",
  "website",
  "social_media",
  "placemaker_url",
].join(",");

type FoursquareCategory = { id?: string; name?: string };
type FoursquareLocation = {
  address?: string;
  locality?: string;
  region?: string;
  postcode?: string;
  country?: string;
};
type FoursquarePlace = {
  fsq_place_id?: string;
  name?: string;
  categories?: FoursquareCategory[];
  location?: FoursquareLocation;
  latitude?: number;
  longitude?: number;
  tel?: string;
  email?: string;
  website?: string;
  social_media?: {
    instagram?: string;
    facebook_id?: string;
    twitter?: string;
  };
  placemaker_url?: string;
};
type FoursquareSearchResponse = { results?: FoursquarePlace[] };

export class FoursquareRequestError extends Error {
  constructor(readonly upstreamStatus: number) {
    super("A consulta ao Foursquare falhou.");
    this.name = "FoursquareRequestError";
  }
}

function formatAddress(location: FoursquareLocation | undefined) {
  if (!location) return null;
  const parts = [
    location.address,
    location.locality,
    location.region,
    location.postcode,
  ].filter((part): part is string => Boolean(part?.trim()));
  return [...new Set(parts)].join(", ") || null;
}

function safeUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function normalizePlace(place: FoursquarePlace): DiscoveredLead | null {
  const sourceId = place.fsq_place_id?.trim();
  const companyName = place.name?.trim();
  if (!sourceId || !companyName) return null;

  return {
    source: "foursquare",
    sourceId,
    companyName,
    phone: place.tel?.trim() || null,
    internationalPhone: null,
    email: place.email?.trim() || null,
    address: formatAddress(place.location),
    category: place.categories?.[0]?.name?.trim() || null,
    rating: null,
    reviewCount: null,
    websiteUrl: safeUrl(place.website),
    googleMapsUrl: safeUrl(place.placemaker_url),
    instagram: place.social_media?.instagram?.trim() || null,
    facebookId: place.social_media?.facebook_id?.trim() || null,
    twitter: place.social_media?.twitter?.trim() || null,
    latitude: typeof place.latitude === "number" ? place.latitude : null,
    longitude: typeof place.longitude === "number" ? place.longitude : null,
    businessStatus: null,
    photos: [],
  };
}

export async function searchFoursquarePlaces(
  input: LeadSearchInput,
): Promise<LeadSearchResult> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("query", input.niche);
  url.searchParams.set("near", `${input.city}, Brasil`);
  url.searchParams.set(
    "limit",
    String(Math.min(input.limit ?? 25, MAX_LEAD_SEARCH_LIMIT)),
  );
  url.searchParams.set("fields", FIELDS);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getFoursquareApiKey()}`,
      "X-Places-Api-Version": API_VERSION,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new FoursquareRequestError(response.status);
  const payload = (await response.json()) as FoursquareSearchResponse;

  return {
    source: "foursquare",
    sourceLabel: "Foursquare",
    leads: (payload.results ?? [])
      .map(normalizePlace)
      .filter((lead): lead is DiscoveredLead => lead !== null),
    nextPageToken: null,
  };
}

