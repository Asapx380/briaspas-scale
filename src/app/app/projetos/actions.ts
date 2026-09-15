"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/workspaces/current";
import { decryptRefreshToken, getGoogleOAuthConfig } from "@/lib/google/oauth";

const projectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  leadId: z.coerce.number().int().positive().nullable(),
  value: z.coerce.number().min(0).nullable(),
  dueOn: z.string().date().nullable(),
});
const taskSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

export async function createProject(formData: FormData) {
  const rawLead = String(formData.get("leadId") ?? "");
  const rawValue = String(formData.get("value") ?? "");
  const rawDue = String(formData.get("dueOn") ?? "");
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    leadId: rawLead ? Number(rawLead) : null,
    value: rawValue ? Number(rawValue.replace(",", ".")) : null,
    dueOn: rawDue || null,
  });
  if (!parsed.success) throw new Error("Dados do projeto inválidos.");
  const { supabase, workspaceId, userId } = await getCurrentWorkspace();
  const { error } = await supabase.from("projects").insert({
    workspace_id: workspaceId,
    created_by: userId,
    name: parsed.data.name,
    lead_id: parsed.data.leadId,
    value: parsed.data.value,
    due_on: parsed.data.dueOn,
  });
  if (error) throw new Error("Não foi possível criar. Aplique a migration de produto no Supabase.");
  revalidatePath("/app/projetos");
}

export async function createTask(formData: FormData) {
  const rawDue = String(formData.get("dueAt") ?? "");
  const parsed = taskSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    priority: formData.get("priority"),
    dueAt: rawDue ? new Date(rawDue).toISOString() : null,
  });
  if (!parsed.success) throw new Error("Dados da tarefa inválidos.");
  const { supabase, workspaceId } = await getCurrentWorkspace();
  const { data: project } = await supabase.from("projects").select("id").eq("id", parsed.data.projectId).eq("workspace_id", workspaceId).maybeSingle();
  if (!project) throw new Error("Projeto não encontrado.");
  const { error } = await supabase.from("project_tasks").insert({
    project_id: parsed.data.projectId,
    title: parsed.data.title,
    priority: parsed.data.priority,
    due_at: parsed.data.dueAt,
  });
  if (error) throw new Error("Não foi possível criar a tarefa.");
  revalidatePath("/app/projetos");
}

export async function toggleTask(taskId: number, nextStatus: "todo" | "done") {
  const { supabase, workspaceId } = await getCurrentWorkspace();
  const { data: task } = await supabase.from("project_tasks").select("id, projects!inner(workspace_id)").eq("id", taskId).eq("projects.workspace_id", workspaceId).maybeSingle();
  if (!task) throw new Error("Tarefa não encontrada.");
  const { error } = await supabase.from("project_tasks").update({ status: nextStatus }).eq("id", taskId);
  if (error) throw new Error("Não foi possível atualizar a tarefa.");
  revalidatePath("/app/projetos");
}

export async function syncTaskToCalendar(taskId: number) {
  const { supabase, workspaceId, userId } = await getCurrentWorkspace();
  const { data: task } = await supabase.from("project_tasks").select("id, title, due_at, projects!inner(name, workspace_id)").eq("id", taskId).eq("projects.workspace_id", workspaceId).maybeSingle();
  if (!task?.due_at) throw new Error("Defina um prazo para sincronizar a tarefa.");
  const { data: connection } = await supabase.from("google_connections").select("encrypted_refresh_token, status").eq("user_id", userId).eq("status", "connected").maybeSingle();
  if (!connection?.encrypted_refresh_token) throw new Error("Conecte o Google Agenda nas integrações.");
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: decryptRefreshToken(String(connection.encrypted_refresh_token)), grant_type: "refresh_token" }),
  });
  const token = await tokenResponse.json() as { access_token?: string };
  if (!tokenResponse.ok || !token.access_token) throw new Error("Não foi possível renovar a conexão com o Google.");
  const start = new Date(task.due_at);
  const eventResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: "Bearer " + token.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: task.title, description: "Tarefa criada pela Briaspas Scale", start: { dateTime: start.toISOString() }, end: { dateTime: new Date(start.getTime() + 30 * 60_000).toISOString() } }),
  });
  const event = await eventResponse.json() as { id?: string; error?: { message?: string } };
  await supabase.from("project_tasks").update({
    google_calendar_id: "primary",
    google_event_id: event.id ?? null,
    calendar_sync_status: eventResponse.ok ? "synced" : "failed",
    calendar_last_error: eventResponse.ok ? null : event.error?.message ?? "Falha no Google Agenda",
  }).eq("id", taskId);
  if (!eventResponse.ok) throw new Error("O Google Agenda recusou o evento.");
  revalidatePath("/app/projetos");
}
