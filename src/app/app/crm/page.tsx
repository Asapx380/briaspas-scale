import { CrmBoard, type CrmLead } from "@/components/crm/crm-board";
import { createClient } from "@/lib/supabase/server";

export default async function CrmPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, company_name, phone, email, address, niche, city, status, notes, estimated_value, follow_up_at, website_url, google_maps_url, rating, review_count, source, slug, visit_count, site_status, site_source, site_brief, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  return (
    <CrmBoard
      initialLeads={(data ?? []) as CrmLead[]}
      loadError={error ? "Não foi possível carregar os leads. Atualize a página para tentar novamente." : null}
    />
  );
}
