const foursquarePlacesApiKey = process.env.FOURSQUARE_PLACES_API_KEY?.trim();

export function isFoursquareConfigured() {
  return Boolean(foursquarePlacesApiKey);
}

export function getFoursquareApiKey() {
  if (!foursquarePlacesApiKey) {
    throw new Error(
      "Foursquare não configurado. Preencha FOURSQUARE_PLACES_API_KEY no arquivo .env.local.",
    );
  }

  return foursquarePlacesApiKey;
}

