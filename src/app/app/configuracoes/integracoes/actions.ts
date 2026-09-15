"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentWorkspace } from "@/lib/workspaces/current";

const domainSchema = z.object({
  leadId: z.coerce.number().int().positive(),
  hostname: z.string().trim().toLowerCase().regex(/^(?!-)(?:[a-z0-9-]+\.)+[a-z]{2,63}$/),
});

export async function addCustomDomain(formData: FormData) {
  const parsed = domainSchema.safeParse({ leadId: formData.get("leadId"), hostname: formData.get("hostname") });
  if (!parsed.success) throw new Error("Informe um domínio válido, como site.empresa.com.br.");
  const { supabase, workspaceId, role } = await getCurrentWorkspace();
  if (!["owner", "admin"].includes(role)) throw new Error("Somente administradores podem gerenciar domínios.");
  const { data: lead } = await supabase.from("leads").select("id").eq("id", parsed.data.leadId).eq("workspace_id", workspaceId).maybeSingle();
  if (!lead) throw new Error("Lead não encontrado.");

  let status = "pending";
  let verificationError: string | null = null;
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (token && projectId) {
    const response = await fetch("https://api.vercel.com/v10/projects/" + encodeURIComponent(projectId) + "/domains", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ name: parsed.data.hostname }),
    });
    const result = await response.json() as { verified?: boolean; error?: { message?: string } };
    if (!response.ok) verificationError = result.error?.message ?? "A Vercel recusou o domínio.";
    else status = result.verified ? "active" : "verifying";
  } else {
    verificationError = "Configure VERCEL_TOKEN e VERCEL_PROJECT_ID para registrar o domínio automaticamente.";
  }

  const { error } = await supabase.from("custom_domains").upsert({
    workspace_id: workspaceId,
    lead_id: parsed.data.leadId,
    hostname: parsed.data.hostname,
    status,
    verification_error: verificationError,
  }, { onConflict: "lead_id" });
  if (error) throw new Error("Aplique a migration de produto antes de adicionar domínios.");
  revalidatePath("/app/configuracoes/integracoes");
}

export async function disconnectGoogleCalendar() {
  const { supabase, userId } = await getCurrentWorkspace();
  await supabase.from("google_connections").delete().eq("user_id", userId);
  revalidatePath("/app/configuracoes/integracoes");
}
