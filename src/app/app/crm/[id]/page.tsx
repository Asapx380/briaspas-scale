import dynamic from "next/dynamic";
import type { CrmLead } from "@/lib/crm/types";
import { resolveLeadNeighbors } from "@/lib/pagination/lead-neighbors";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const LeadDetailView = dynamic(
  () => import("@/components/crm/lead-detail-view").then((mod) => mod.LeadDetailView),
  {
    loading: () => (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-[var(--neu-bg-well)]" />
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[var(--neu-bg-well)]" />
      </main>
    ),
  },
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, ai_diagnosis, ai_outreach, deleted_at, created_at, updated_at",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) notFound();

  const lead = data as CrmLead;
  const neighbors = await resolveLeadNeighbors(supabase, {
    id: lead.id,
    created_at: lead.created_at,
  });

  return <LeadDetailView lead={lead} neighbors={neighbors} />;
}
