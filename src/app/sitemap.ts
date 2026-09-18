import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://briaspas-scale.vercel.app").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/demonstracao`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/privacidade`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
