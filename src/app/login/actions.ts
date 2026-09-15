"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  message: string | null;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { message: "Configure o Supabase antes de entrar." };
  }

  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { message: "Preencha o e-mail e a senha." };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || password.length < 6) {
    return { message: "Confira o e-mail e informe uma senha válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    return { message: "E-mail ou senha inválidos." };
  }

  redirect("/app");
}
