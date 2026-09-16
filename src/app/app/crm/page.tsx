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

  const withAi = await supabase
    .from("leads")
    .select("id, ai_diagnosis, ai_outreach")
    .limit(500);

  const aiById = new Map(
    (withAi.data ?? []).map((row) => [row.id as number, row] as const),
  );

  const { data: conversations } = await supabase
    .from("whatsapp_conversations")
    .select("id, lead_id, contact_name, contact_phone, agent_enabled, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(20);

  const initialLeads = ((data ?? []) as CrmLead[]).map((lead) => {
    const ai = aiById.get(lead.id);
    return {
      ...lead,
      ai_diagnosis: (ai?.ai_diagnosis as CrmLead["ai_diagnosis"]) ?? null,
      ai_outreach: (ai?.ai_outreach as CrmLead["ai_outreach"]) ?? null,
    };
  });

  return (
    <CrmBoard
      initialLeads={initialLeads}
      loadError={error ? "Não foi possível carregar os leads. Atualize a página para tentar novamente." : null}
      whatsappConversations={conversations ?? []}
    />
  );
}
