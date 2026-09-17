"use client";

import { Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { updatePassword, type UpdatePasswordState } from "@/app/redefinir-senha/actions";
import { AuthCardShell, AuthField, AuthSubmitButton } from "@/components/ui/auth-card-shell";

const initialState: UpdatePasswordState = { message: null };

export function UpdatePasswordCard({ recoverySession }: { recoverySession: boolean }) {
  const [state, formAction] = useActionState(updatePassword, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthCardShell configured title="Crie uma nova senha" subtitle="Use pelo menos 8 caracteres.">
      {!recoverySession ? (
        <div className="mt-6 text-center">
          <p className="text-sm leading-6 text-rose-600">Este link expirou ou é inválido.</p>
          <Link href="/recuperar-senha" className="mt-4 inline-block text-sm font-semibold text-[var(--text)] underline underline-offset-4">
            Solicitar outro link
          </Link>
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-3.5">
          <AuthField id="new-password" name="password" label="Nova senha" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required icon={<LockKey size={17} />} trailingAction={<button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} title={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute top-1/2 right-2 -translate-y-1/2 grid size-11 place-items-center rounded-md text-[var(--text-4)] hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">{showPassword ? <EyeSlash size={17} aria-hidden /> : <Eye size={17} aria-hidden />}</button>} />
          <AuthField id="password-confirmation" name="passwordConfirmation" label="Confirmar nova senha" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required icon={<LockKey size={17} />} />
          {state.message && <p role="alert" className="pt-1 text-sm leading-6 text-rose-600">{state.message}</p>}
          <AuthSubmitButton configured label="Salvar nova senha" pendingLabel="Salvando..." />
        </form>
      )}
    </AuthCardShell>
  );
}
