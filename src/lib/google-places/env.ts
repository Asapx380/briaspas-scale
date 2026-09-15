const googlePlacesApiKey =
  process.env.GOOGLE_MAPS_DEMO_API_KEY?.trim() ||
  process.env.GOOGLE_PLACES_API_KEY?.trim();

export function isGooglePlacesConfigured() {
  return Boolean(googlePlacesApiKey);
}

export function getGooglePlacesApiKey() {
  if (!googlePlacesApiKey) {
    throw new Error(
      "Google Places não configurado. Preencha GOOGLE_MAPS_DEMO_API_KEY ou GOOGLE_PLACES_API_KEY no arquivo .env.local.",
    );
  }

  return googlePlacesApiKey;
}
