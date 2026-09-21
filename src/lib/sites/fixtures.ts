import type { SiteGalleryLead } from "@/lib/sites/gallery";

/** Fixtures only for UI preview / e2e when Supabase is unavailable. */
export const SITE_GALLERY_DEMO_LEADS: SiteGalleryLead[] = [
  {
    id: 301,
    company_name: "Café do Centro",
    niche: "Café",
    slug: "cafe-do-centro",
    site_status: "ready",
    site_source: "uploaded",
    photos: ["https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg"],
    updated_at: "2026-09-20T15:30:00.000Z",
  },
  {
    id: 302,
    company_name: "Studio Norte Estética",
    niche: "Estética",
    slug: "studio-norte-estetica",
    site_status: "published",
    site_source: "generated",
    photos: [],
    updated_at: "2026-09-18T09:00:00.000Z",
  },
  {
    id: 303,
    company_name: "Auto Peças Lima",
    niche: "Automotivo",
    slug: "auto-pecas-lima",
    site_status: "generating",
    site_source: "generated",
    photos: [],
    updated_at: "2026-09-21T08:00:00.000Z",
  },
  {
    id: 304,
    company_name: "Odonto Viva Teresina",
    niche: "Odontologia",
    slug: "odonto-viva-teresina",
    site_status: "failed",
    site_source: "generated",
    photos: ["https://images.pexels.com/photos/377970/pexels-photo-377970.jpeg"],
    updated_at: "2026-09-10T11:00:00.000Z",
  },
];
