"use server";

import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type RecoveryState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

export async function requestPasswordRecovery(
  _previousState: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Configure o Supabase antes de recuperar a senha." };
  }

  const email = formData.get("email");
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return { status: "error", message: "Informe um e-mail válido." };
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });

  if (error) {
    return { status: "error", message: "Não foi possível enviar o e-mail agora. Aguarde um pouco e tente novamente." };
  }

  return {
    status: "success",
    message: "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha.",
  };
}
