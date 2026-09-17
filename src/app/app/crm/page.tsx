import dynamic from "next/dynamic";
import type { CrmLead } from "@/lib/crm/types";
import { createClient } from "@/lib/supabase/server";

const CrmBoard = dynamic(
  () => import("@/components/crm/crm-board").then((mod) => mod.CrmBoard),
  {
    loading: () => (
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[var(--neu-bg-well)]" />
        <div className="mt-5 h-11 max-w-xl animate-pulse rounded-2xl bg-[var(--neu-bg-well)]" />
        <div className="mt-6 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[420px] w-[260px] shrink-0 animate-pulse rounded-[20px] bg-[var(--neu-bg-well)]/80 sm:w-[272px]"
            />
          ))}
        </div>
      </main>
    ),
  },
);

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
