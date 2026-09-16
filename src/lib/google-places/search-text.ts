import { getGooglePlacesApiKey } from "@/lib/google-places/env";
import type {
  DiscoveredLead,
  LeadSearchInput,
  LeadSearchResult,
} from "@/lib/google-places/types";

const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName.text",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.formattedAddress",
  "places.primaryTypeDisplayName.text",
  "places.location",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

export class GooglePlacesRequestError extends Error {
  constructor(
    readonly upstreamStatus: number,
    message = "A consulta ao Google Places falhou.",
  ) {
    super(message);
    this.name = "GooglePlacesRequestError";
  }
}

function normalizePlace(place: GooglePlace): DiscoveredLead | null {
  const companyName = place.displayName?.text?.trim();

  if (!place.id || !companyName) return null;

  return {
    source: "google_places",
    sourceId: place.id,
    companyName,
    phone: place.nationalPhoneNumber ?? null,
    internationalPhone: place.internationalPhoneNumber ?? null,
    email: null,
    address: place.formattedAddress ?? null,
    category: place.primaryTypeDisplayName?.text?.trim() || null,
    rating: null,
    reviewCount: null,
    websiteUrl: place.websiteUri ?? null,
    googleMapsUrl: place.googleMapsUri ?? null,
    instagram: null,
    facebookId: null,
    twitter: null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    businessStatus: place.businessStatus ?? null,
    photos: [],
  };
}

export async function searchPlaces(input: LeadSearchInput): Promise<LeadSearchResult> {
  const response = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGooglePlacesApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${input.niche} em ${input.city}, Brasil`,
      // Places Text Search (New) aceita pageSize no máximo 20.
      pageSize: Math.min(Math.max(input.limit ?? 10, 1), 20),
      pageToken: input.pageToken,
      languageCode: "pt-BR",
      regionCode: "BR",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new GooglePlacesRequestError(response.status);
  }

  const payload = (await response.json()) as GoogleTextSearchResponse;

  return {
    source: "google_places",
    sourceLabel: "Google Places",
    leads: (payload.places ?? [])
      .map(normalizePlace)
      .filter((lead): lead is DiscoveredLead => lead !== null),
    nextPageToken: payload.nextPageToken ?? null,
  };
}
