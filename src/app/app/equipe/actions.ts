"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

const assignmentSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  assigneeId: z.string().uuid().nullable(),
});

export async function assignLead(formData: FormData) {
  const rawAssignee = String(formData.get("assigneeId") ?? "");
  const parsed = assignmentSchema.safeParse({
    leadId: formData.get("leadId"),
    assigneeId: rawAssignee || null,
  });
  if (!parsed.success) throw new Error("Distribuição inválida.");

  const { supabase, workspaceId, role } = await getCurrentWorkspace();
  if (!['owner', 'admin'].includes(role)) throw new Error("Somente administradores podem distribuir leads.");

  if (parsed.data.assigneeId) {
    const { data: member } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", parsed.data.assigneeId).maybeSingle();
    if (!member) throw new Error("O vendedor não pertence a este workspace.");
  }

  const { error } = await supabase.from("leads").update({ assigned_to: parsed.data.assigneeId }).eq("id", parsed.data.leadId).eq("workspace_id", workspaceId);
  if (error) throw new Error("Não foi possível distribuir o lead.");
  revalidatePath("/app/equipe");
  revalidatePath("/app/crm");
}
