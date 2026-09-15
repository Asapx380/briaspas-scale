"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle, EnvelopeSimple, Eye, EyeSlash, LockKey, User } from "@phosphor-icons/react";
import { signup, type SignupState } from "@/app/cadastro/actions";
import { AuthCardShell, AuthField, AuthSubmitButton } from "@/components/ui/auth-card-shell";

const initialState: SignupState = { status: "idle", message: null };

function VisibilityButton({
  label,
  onClick,
  visible,
}: Readonly<{ label: string; onClick: () => void; visible: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-[var(--text-4)] transition-colors hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
    >
      {visible ? <EyeSlash size={17} /> : <Eye size={17} />}
    </button>
  );
}

export function SignUpCard({ configured }: { configured: boolean }) {
  const [state, formAction] = useActionState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <AuthCardShell
      configured={configured}
      title="Crie sua conta"
      subtitle="Comece sua operação na Briaspas Scale."
    >
      <form action={formAction} className="mt-6 space-y-3.5">
        <AuthField
          id="fullName"
          name="fullName"
          label="Nome"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          disabled={!configured}
          placeholder="Seu nome"
          icon={<User size={17} />}
        />
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
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthField
            id="password"
            name="password"
            label="Senha"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!configured}
            placeholder="Mínimo 8 caracteres"
            icon={<LockKey size={17} />}
            trailingAction={
              <VisibilityButton
                visible={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
                label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              />
            }
          />
          <AuthField
            id="passwordConfirmation"
            name="passwordConfirmation"
            label="Confirmar senha"
            type={showConfirmation ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={!configured}
            placeholder="Repita a senha"
            icon={<LockKey size={17} />}
            trailingAction={
              <VisibilityButton
                visible={showConfirmation}
                onClick={() => setShowConfirmation((visible) => !visible)}
                label={showConfirmation ? "Ocultar confirmação" : "Mostrar confirmação"}
              />
            }
          />
        </div>

        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={state.status === "success" ? "flex items-start gap-2 pt-1 text-sm leading-6 text-emerald-700" : "pt-1 text-sm leading-6 text-rose-600"}
          >
            {state.status === "success" && <CheckCircle className="mt-1 shrink-0" size={17} weight="fill" />}
            {state.message}
          </p>
        )}

        <AuthSubmitButton configured={configured} label="Criar minha conta" pendingLabel="Criando conta..." />
      </form>

      <p className="mt-5 text-center text-xs text-[var(--text-3)]">
        Já possui uma conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-[var(--text)] underline decoration-black/20 underline-offset-4 transition-colors hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          Entrar
        </Link>
      </p>
    </AuthCardShell>
  );
}
