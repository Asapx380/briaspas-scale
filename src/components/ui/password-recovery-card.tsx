"use client";

import { EnvelopeSimple } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordRecovery,
  type RecoveryState,
} from "@/app/recuperar-senha/actions";
import { AuthCardShell, AuthField, AuthSubmitButton } from "@/components/ui/auth-card-shell";

const initialState: RecoveryState = { status: "idle", message: null };

export function PasswordRecoveryCard({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(requestPasswordRecovery, initialState);

  return (
    <AuthCardShell
      configured={configured}
      title="Recupere sua senha"
      subtitle="Enviaremos um link seguro para o seu e-mail."
    >
      <form action={formAction} className="mt-6 space-y-3.5">
        <AuthField
          id="recovery-email"
          name="email"
          label="E-mail da conta"
          type="email"
          autoComplete="email"
          required
          disabled={!configured}
          placeholder="voce@exemplo.com"
          icon={<EnvelopeSimple size={17} />}
        />
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`pt-1 text-sm leading-6 ${state.status === "error" ? "text-rose-600" : "text-emerald-700"}`}
          >
            {state.message}
          </p>
        )}
        <AuthSubmitButton configured={configured} label="Enviar link" pendingLabel="Enviando..." />
      </form>
      <p className="mt-5 text-center text-xs text-[var(--text-3)]">
        Lembrou sua senha?{" "}
        <Link href="/login" className="font-semibold text-[var(--text)] underline decoration-black/20 underline-offset-4 hover:text-[var(--brand)]">
          Voltar ao login
        </Link>
      </p>
    </AuthCardShell>
  );
}
