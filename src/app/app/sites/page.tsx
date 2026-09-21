import { SitesGallery } from "@/components/sites/sites-gallery";
import {
  buildPageMeta,
  parsePage,
  parsePageSize,
  rangeFromPage,
} from "@/lib/pagination/params";
import {
  sanitizeGallerySearchQuery,
  SITE_GALLERY_COLUMNS,
  SITE_GALLERY_DEFAULT_PAGE_SIZE,
  SITE_GALLERY_FETCH_LIMIT,
  SITE_GALLERY_PAGE_SIZES,
  parseSiteGallerySort,
  sortSiteGalleryLeads,
  type SiteGalleryLead,
} from "@/lib/sites/gallery";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type SitesPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    q?: string | string[];
    sort?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSitesFilterQuery(
  supabase: SupabaseClient,
  q: string,
  withCount: "exact" | undefined = "exact",
) {
  let query = supabase
    .from("leads")
    .select(SITE_GALLERY_COLUMNS, withCount ? { count: withCount } : undefined)
    .is("deleted_at", null)
    .or("site_status.neq.not_generated,site_source.eq.uploaded");

  if (q) {
    const escaped = sanitizeGallerySearchQuery(q);
    if (escaped) {
      query = query.ilike("company_name", `%${escaped}%`);
    }
  }

  return query;
}

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const pageSize = parsePageSize(
    params.pageSize,
    SITE_GALLERY_PAGE_SIZES,
    SITE_GALLERY_DEFAULT_PAGE_SIZE,
  );
  const rawQuery = (first(params.q) ?? "").trim();
  const sort = parseSiteGallerySort(first(params.sort));

  const supabase = await createClient();

  const { data, error, count } = await buildSitesFilterQuery(supabase, rawQuery).limit(
    SITE_GALLERY_FETCH_LIMIT,
  );

  const sorted = sortSiteGalleryLeads((data ?? []) as SiteGalleryLead[], sort);
  const total = count ?? sorted.length;
  let meta = buildPageMeta(total, requestedPage, pageSize);
  if (meta.page !== requestedPage && total > 0) {
    meta = buildPageMeta(total, meta.page, pageSize);
  }
  const { from, to } = rangeFromPage(meta.page, pageSize);
  const items = sorted.slice(from, to + 1);

  const { count: totalSitesCount, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .or("site_status.neq.not_generated,site_source.eq.uploaded");

  const hasAnySites = !countError && (totalSitesCount ?? 0) > 0;

  return (
    <SitesGallery
      items={items}
      pagination={meta}
      query={rawQuery}
      sort={sort}
      pathname="/app/sites"
      loadError={
        error
          ? "Não foi possível carregar os sites. Atualize a página para tentar novamente."
          : null
      }
      hasAnySites={hasAnySites}
    />
  );
}
