import { LeadDetailView } from "@/components/crm/lead-detail-view";
import type { CrmLead } from "@/lib/crm/types";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

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
      "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();

  const { data: aiRow } = await supabase
    .from("leads")
    .select("ai_diagnosis, ai_outreach")
    .eq("id", id)
    .maybeSingle();

  const { data: siblings } = await supabase
    .from("leads")
    .select("id")
    .order("created_at", { ascending: false });

  const lead = {
    ...(data as CrmLead),
    ai_diagnosis: (aiRow?.ai_diagnosis as CrmLead["ai_diagnosis"]) ?? null,
    ai_outreach: (aiRow?.ai_outreach as CrmLead["ai_outreach"]) ?? null,
  };

  return (
    <LeadDetailView
      lead={lead}
      siblingIds={(siblings ?? []).map((row) => row.id as number)}
    />
  );
}
