import { AppShell } from "@/components/app/app-shell";
import { SitesGallery } from "@/components/sites/sites-gallery";
import {
  buildPageMeta,
  parsePage,
  parsePageSize,
  rangeFromPage,
} from "@/lib/pagination/params";
import {
  filterDemoSites,
  parseSiteGallerySort,
  SITE_GALLERY_DEFAULT_PAGE_SIZE,
  SITE_GALLERY_PAGE_SIZES,
} from "@/lib/sites/gallery";
import { SITE_GALLERY_DEMO_LEADS } from "@/lib/sites/fixtures";

export const dynamic = "force-dynamic";

type SitesPreviewProps = {
  searchParams: Promise<{
    page?: string | string[];
    pageSize?: string | string[];
    q?: string | string[];
    sort?: string | string[];
    empty?: string | string[];
  }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Preview sem auth — use SITES_UI_PREVIEW=1 para screenshots e e2e. */
export default async function SitesPreviewPage({ searchParams }: SitesPreviewProps) {
  if (process.env.SITES_UI_PREVIEW !== "1") {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-[var(--text-3)]">
        Preview desativado. Defina SITES_UI_PREVIEW=1.
      </main>
    );
  }

  const params = await searchParams;
  const page = parsePage(params.page);
  const pageSize = parsePageSize(
    params.pageSize,
    SITE_GALLERY_PAGE_SIZES,
    SITE_GALLERY_DEFAULT_PAGE_SIZE,
  );
  const q = (first(params.q) ?? "").trim();
  const sort = parseSiteGallerySort(first(params.sort));
  const forceEmpty = first(params.empty) === "1";

  const source = forceEmpty ? [] : SITE_GALLERY_DEMO_LEADS;
  const filtered = filterDemoSites(source, q, sort);
  const meta = buildPageMeta(filtered.length, page, pageSize);
  const { from, to } = rangeFromPage(meta.page, pageSize);
  const slice = filtered.slice(from, to + 1);

  return (
    <AppShell email="preview@briaspas.scale" notificationCount={0}>
      <SitesGallery
        items={slice}
        pagination={meta}
        query={q}
        sort={sort}
        pathname="/preview/sites"
        loadError={null}
        hasAnySites={!forceEmpty && SITE_GALLERY_DEMO_LEADS.length > 0}
        demoMode
      />
    </AppShell>
  );
}
