export function buildPlacesLookupQuery(companyName: string, city: string | null) {
  const cityPart = city?.trim() ? ` ${city.trim()}` : "";
  return `${companyName.trim()}${cityPart}, Brasil`.trim();
}
