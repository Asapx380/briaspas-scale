"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordState = { message: string | null };

export async function updatePassword(
  _previousState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirmation");
  if (typeof password !== "string" || typeof confirmation !== "string") {
    return { message: "Preencha os dois campos." };
  }
  if (password.length < 8) return { message: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (password !== confirmation) return { message: "As senhas não são iguais." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (typeof claimsData?.claims?.sub !== "string") {
    return { message: "Este link expirou ou é inválido. Solicite um novo link." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: "Não foi possível atualizar a senha. Solicite um novo link." };
  await supabase.auth.signOut();
  redirect("/login?senha=alterada");
}
