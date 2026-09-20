import { getGooglePlacesApiKey } from "@/lib/google-places/env";
import type { DiscoveredLead } from "@/lib/google-places/types";

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
  "places.rating",
  "places.userRatingCount",
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
  rating?: number;
  userRatingCount?: number;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
};

function normalizePlace(place: GooglePlace): DiscoveredLead | null {
  const companyName = place.displayName?.text?.trim();
  if (!place.id || !companyName) return null;

  const rating =
    typeof place.rating === "number" && place.rating >= 0 && place.rating <= 5
      ? place.rating
      : null;
  const reviewCount =
    typeof place.userRatingCount === "number" &&
    Number.isInteger(place.userRatingCount) &&
    place.userRatingCount >= 0
      ? place.userRatingCount
      : null;

  return {
    source: "google_places",
    sourceId: place.id,
    companyName,
    phone: place.nationalPhoneNumber ?? null,
    internationalPhone: place.internationalPhoneNumber ?? null,
    email: null,
    address: place.formattedAddress ?? null,
    category: place.primaryTypeDisplayName?.text?.trim() || null,
    rating,
    reviewCount,
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

export async function lookupPlacesByTextQuery(textQuery: string): Promise<DiscoveredLead[]> {
  const query = textQuery.trim();
  if (!query) return [];

  const response = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": getGooglePlacesApiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      pageSize: 3,
      languageCode: "pt-BR",
      regionCode: "BR",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`places_lookup_failed:${response.status}`);
  }

  const payload = (await response.json()) as GoogleTextSearchResponse;
  const leads = (payload.places ?? [])
    .map(normalizePlace)
    .filter((lead): lead is DiscoveredLead => lead !== null);

  return leads;
}
