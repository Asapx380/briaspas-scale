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
    .maybeSingle();

  if (error || !data) notFound();
  const lead = data as LeadSite;
  if (!lead.site_html) notFound();

  return (
    <main className="flex h-[calc(100dvh-5rem)] flex-col bg-[#07040d]">
      <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-black/5 px-5 sm:px-8">
        <Link href="/app/crm" className="inline-flex items-center gap-2 text-sm text-[var(--text-3)] hover:text-[var(--text)]">
          <ArrowLeft size={17} /> Voltar ao CRM
        </Link>
        <p className="truncate text-sm text-[var(--text-3)]">
          Prévia: <span className="font-medium text-[var(--text)]">{lead.company_name}</span>
        </p>
        {lead.site_status === "published" ? (
          <Link href={`/empresa/${lead.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm text-[var(--brand)] hover:text-[var(--brand-hover)]">
            Abrir publicado <ArrowSquareOut size={15} />
          </Link>
        ) : <span className="text-xs text-amber-300">Ainda não publicado</span>}
      </div>
      <iframe
        title={`Prévia do site de ${lead.company_name}`}
        srcDoc={lead.site_html}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="min-h-0 flex-1 border-0 bg-white"
      />
    </main>
  );
}
