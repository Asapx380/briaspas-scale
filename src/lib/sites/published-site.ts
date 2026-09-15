import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type PublishedSite = {
  lead_id?: number;
  company_name: string;
  address: string | null;
  site_html: string | null;
  site_schema: Record<string, unknown> | null;
  site_source: "uploaded" | "generated" | null;
  site_storage_path: string | null;
  visit_count: number;
};

export const getPublishedSite = unstable_cache(
  async (slug: string): Promise<PublishedSite | null> => {
    const supabase = createPublicClient();
    const v3 = await supabase
      .rpc("get_published_lead_site_v3", { target_slug: slug })
      .maybeSingle();
    if (!v3.error && v3.data) return v3.data as PublishedSite;

    const v2 = await supabase
      .rpc("get_published_lead_site_v2", { target_slug: slug })
      .maybeSingle();

    if (!v2.error && v2.data) return v2.data as PublishedSite;

    const legacy = await supabase
      .rpc("get_published_lead_site", { target_slug: slug })
      .maybeSingle();
    return legacy.error || !legacy.data ? null : { ...legacy.data, site_source: null, site_storage_path: null } as PublishedSite;
  },
  ["published-site"],
  { revalidate: 300, tags: ["published-sites"] },
);
