import { AppointmentsPanel, type AppointmentItem } from "@/components/agendamentos/appointments-panel";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

/** Calendar needs a sliding window, not the full history. */
const PAST_DAYS = 90;
const FUTURE_DAYS = 120;
const LEAD_OPTIONS_LIMIT = 200;

export default async function AgendamentosPage() {
  const { supabase, workspaceId } = await getCurrentWorkspace();

  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - PAST_DAYS);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + FUTURE_DAYS);
  rangeEnd.setHours(23, 59, 59, 999);

  const [{ data: appointments, error }, { data: leads }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, title, notes, starts_at, ends_at, status, lead_id")
      .eq("workspace_id", workspaceId)
      .gte("starts_at", rangeStart.toISOString())
      .lte("starts_at", rangeEnd.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("leads")
      .select("id, company_name")
      .eq("workspace_id", workspaceId)
      .order("company_name")
      .limit(LEAD_OPTIONS_LIMIT),
  ]);

  return (
    <AppointmentsPanel
      appointments={(appointments ?? []) as AppointmentItem[]}
      leads={(leads ?? []).map((lead) => ({
        id: lead.id as number,
        company_name: String(lead.company_name),
      }))}
      loadError={
        error
          ? "Esta área está pronta no código. Aplique a migration de appointments no Supabase para ativá-la."
          : null
      }
      rangeNote={`Janela: ${PAST_DAYS} dias atrás até ${FUTURE_DAYS} dias à frente.`}
    />
  );
}
