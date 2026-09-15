"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type SignupState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

export async function signup(
  _previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message: "Configure o Supabase antes de criar uma conta.",
    };
  }

  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const password = formData.get("password");
  const passwordConfirmation = formData.get("passwordConfirmation");

  if (
    typeof fullName !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof passwordConfirmation !== "string"
  ) {
    return { status: "error", message: "Preencha todos os campos." };
  }

  const normalizedName = fullName.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return {
      status: "error",
      message: "O nome deve ter entre 2 e 80 caracteres.",
    };
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return { status: "error", message: "Informe um e-mail válido." };
  }

  if (password.length < 8) {
    return {
      status: "error",
      message: "A senha precisa ter pelo menos 8 caracteres.",
    };
  }

  if (password !== passwordConfirmation) {
    return { status: "error", message: "As senhas não são iguais." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: { full_name: normalizedName },
    },
  });

  if (error) {
    const message =
      error.code === "user_already_exists"
        ? "Já existe uma conta com este e-mail. Faça login para continuar."
        : "Não foi possível criar a conta. Confira os dados e tente novamente.";

    return { status: "error", message };
  }

  if (!data.session) {
    return {
      status: "success",
      message:
        "Conta criada! Confira seu e-mail para confirmar o cadastro e depois faça login.",
    };
  }

  redirect("/app");
}
