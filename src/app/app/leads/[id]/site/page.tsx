import { ArrowLeft, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type LeadSite = {
  company_name: string;
  site_html: string | null;
  site_status: string;
  slug: string;
};

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

export default async function LeadSitePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("company_name, site_html, site_status, slug")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();
  const lead = data as LeadSite;
  if (!lead.site_html) notFound();

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--card)] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand)]">Sites</p>
            <h1 className="truncate text-lg font-semibold text-[var(--text)] sm:text-xl">
              Prévia: {lead.company_name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/app/sites"
              className={`inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--neu-bg-pop)] px-3 py-1.5 text-sm font-medium text-[var(--text-2)] hover:bg-[var(--surface-hover)] ${FOCUS}`}
            >
              <ArrowLeft size={16} aria-hidden /> Meus sites
            </Link>
            {lead.site_status === "published" ? (
              <Link
                href={`/empresa/${lead.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand)] hover:text-[var(--brand-hover)] ${FOCUS}`}
              >
                Abrir publicado <ArrowSquareOut size={15} aria-hidden />
              </Link>
            ) : (
              <span className="text-xs font-medium text-[var(--text-3)]">Ainda não publicado</span>
            )}
          </div>
        </div>
      </header>
      <iframe
        title={`Prévia do site de ${lead.company_name}`}
        srcDoc={lead.site_html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </div>
  );
}
