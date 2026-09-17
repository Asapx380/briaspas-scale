"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { EnvelopeSimple, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { login, type LoginState } from "@/app/login/actions";
import { AuthCardShell, AuthField, AuthSubmitButton } from "@/components/ui/auth-card-shell";

const initialState: LoginState = { message: null };

export function SignInCard({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <AuthCardShell
      configured={configured}
      title="Acesse sua operação"
      subtitle="Entre para acompanhar seus leads, sites e projetos."
    >
      <form action={formAction} className="mt-6 space-y-3.5">
        <AuthField
          id="email"
          name="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          disabled={!configured}
          placeholder="voce@exemplo.com"
          icon={<EnvelopeSimple size={17} />}
        />
        <AuthField
          id="password"
          name="password"
          label="Senha"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          minLength={6}
          required
          disabled={!configured}
          placeholder="Digite sua senha"
          icon={<LockKey size={17} />}
          trailingAction={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute top-1/2 right-2 -translate-y-1/2 grid size-11 place-items-center rounded-md text-[var(--text-4)] transition-colors hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              {showPassword ? <EyeSlash size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
            </button>
          }
        />

        {state.message && (
          <p role="alert" className="pt-1 text-sm leading-6 text-rose-600">
            {state.message}
          </p>
        )}

        <AuthSubmitButton configured={configured} label="Entrar" pendingLabel="Entrando..." />
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/recuperar-senha"
          className="text-xs font-semibold text-[var(--brand)] underline decoration-[var(--brand)]/30 underline-offset-4 transition-colors hover:text-[var(--brand-hover)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          Esqueci minha senha
        </Link>
      </div>

      <p className="mt-5 text-center text-xs text-[var(--text-3)]">
        Ainda não possui uma conta?{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-[var(--text)] underline decoration-black/20 underline-offset-4 transition-colors hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          Criar conta
        </Link>
      </p>
    </AuthCardShell>
  );
}
