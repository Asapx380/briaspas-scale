import type { MetadataRoute } from "next";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://briaspas-scale.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/demonstracao", "/privacidade"],
      disallow: ["/app/", "/api/", "/preview/", "/auth/", "/login", "/cadastro", "/recuperar-senha", "/redefinir-senha"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
