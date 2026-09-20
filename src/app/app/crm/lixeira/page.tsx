import { CrmTrashView, type ArchivedLead } from "@/components/crm/crm-trash-view";
import { createClient } from "@/lib/supabase/server";

export default async function CrmTrashPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, niche, city, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return <CrmTrashView initialLeads={(data ?? []) as ArchivedLead[]} />;
}
