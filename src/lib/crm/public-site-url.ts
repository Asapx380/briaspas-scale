const DEFAULT_ORIGIN = "https://briaspas-scale.vercel.app";

export function getPublicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function buildPublishedLeadSiteUrl(siteOrigin: string, slug: string): string {
  const origin = siteOrigin.replace(/\/$/, "");
  return `${origin}/empresa/${encodeURIComponent(slug)}`;
}
