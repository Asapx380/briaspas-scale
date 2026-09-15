export type LeadSource = "foursquare" | "google_places";

export type LeadSearchInput = {
  niche: string;
  city: string;
  limit?: number;
  pageToken?: string;
};

export type LeadPhoto = {
  name: string;
  widthPx: number | null;
  heightPx: number | null;
  authorName: string | null;
  authorUri: string | null;
};

export type DiscoveredLead = {
  source: LeadSource;
  sourceId: string;
  companyName: string;
  phone: string | null;
  internationalPhone: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  rating: number | null;
  reviewCount: number | null;
  websiteUrl: string | null;
  googleMapsUrl: string | null;
  instagram: string | null;
  facebookId: string | null;
  twitter: string | null;
  latitude: number | null;
  longitude: number | null;
  businessStatus: string | null;
  photos: LeadPhoto[];
};

export type LeadSearchResult = {
  source: LeadSource;
  sourceLabel: string;
  leads: DiscoveredLead[];
  nextPageToken: string | null;
};

