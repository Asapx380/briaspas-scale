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
  SITE_GALLERY_PAGE_SIZES,
  parseSiteGallerySort,
  type SiteGalleryLead,
  type SiteGallerySortId,
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

function buildSitesQuery(
  supabase: SupabaseClient,
  q: string,
  sort: SiteGallerySortId,
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

  if (sort === "name_asc") {
    query = query.order("company_name", { ascending: true });
  } else if (sort === "status") {
    query = query
      .order("site_status", { ascending: true })
      .order("updated_at", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("updated_at", { ascending: false, nullsFirst: false });
  }

  return query.order("id", { ascending: false });
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

  let { from, to } = rangeFromPage(requestedPage, pageSize);
  let { data, error, count } = await buildSitesQuery(supabase, rawQuery, sort).range(from, to);

  let meta = buildPageMeta(count ?? 0, requestedPage, pageSize);
  if (meta.page !== requestedPage && (count ?? 0) > 0) {
    ({ from, to } = rangeFromPage(meta.page, pageSize));
    ({ data, error, count } = await buildSitesQuery(supabase, rawQuery, sort).range(from, to));
    meta = buildPageMeta(count ?? 0, meta.page, pageSize);
  }

  const { count: totalSitesCount, error: countError } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .or("site_status.neq.not_generated,site_source.eq.uploaded");

  const items = (data ?? []) as SiteGalleryLead[];
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
