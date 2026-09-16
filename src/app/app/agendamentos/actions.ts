"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

const appointmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  status: z.enum(["scheduled", "pending", "completed", "cancelled"]),
  leadId: z.coerce.number().int().positive().nullable(),
});

function parseLocalDateTime(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function createAppointment(formData: FormData) {
  const rawLead = String(formData.get("leadId") ?? "");
  const startsAt = parseLocalDateTime(String(formData.get("startsAt") ?? ""));
  const endsAt = parseLocalDateTime(String(formData.get("endsAt") ?? ""));
  const rawNotes = String(formData.get("notes") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "scheduled");

  const parsed = appointmentSchema.safeParse({
    title: formData.get("title"),
    notes: rawNotes || null,
    startsAt,
    endsAt,
    status: rawStatus,
    leadId: rawLead ? Number(rawLead) : null,
  });
  if (!parsed.success) throw new Error("Dados do agendamento inválidos.");

  const { supabase, workspaceId, userId } = await getCurrentWorkspace();
  const { error } = await supabase.from("appointments").insert({
    workspace_id: workspaceId,
    created_by: userId,
    title: parsed.data.title,
    notes: parsed.data.notes,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    status: parsed.data.status,
    lead_id: parsed.data.leadId,
  });
  if (error) {
    throw new Error(
      "Não foi possível criar o agendamento. Aplique a migration de appointments no Supabase.",
    );
  }
  revalidatePath("/app/agendamentos");
}

export async function updateAppointmentStatus(appointmentId: number, status: "scheduled" | "pending" | "completed" | "cancelled") {
  const { supabase, workspaceId } = await getCurrentWorkspace();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("workspace_id", workspaceId);
  if (error) throw new Error("Não foi possível atualizar o agendamento.");
  revalidatePath("/app/agendamentos");
}
