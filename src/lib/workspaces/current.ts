import { createClient } from "@/lib/supabase/server";

export async function getCurrentWorkspace() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (authError || typeof userId !== "string") throw new Error("Sessão inválida.");

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error || !membership) throw new Error("Workspace não encontrado.");

  return { supabase, userId, workspaceId: Number(membership.workspace_id), role: String(membership.role) };
}
