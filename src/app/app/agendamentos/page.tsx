import { AppointmentsPanel, type AppointmentItem } from "@/components/agendamentos/appointments-panel";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

export default async function AgendamentosPage() {
  const { supabase, workspaceId } = await getCurrentWorkspace();

  const [{ data: appointments, error }, { data: leads }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, title, notes, starts_at, ends_at, status, lead_id")
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, company_name")
      .eq("workspace_id", workspaceId)
      .order("company_name"),
  ]);

  return (
    <AppointmentsPanel
      appointments={(appointments ?? []) as AppointmentItem[]}
      leads={(leads ?? []).map((lead) => ({ id: lead.id as number, company_name: String(lead.company_name) }))}
      loadError={
        error
          ? "Esta área está pronta no código. Aplique a migration de appointments no Supabase para ativá-la."
          : null
      }
    />
  );
}
